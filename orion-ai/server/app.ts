// API HTTP do Orion (Express). Separada de index.ts para poder ser testada.
import express, { type NextFunction, type Request, type Response } from "express";
import { z } from "zod";
import type { ChatEvent, ServerStatus } from "../shared/types";
import { runChat } from "./ai/core";
import { learnFromAttachments, learnFromConversation } from "./ai/learner";
import { planProject } from "./ai/planner";
import { ProviderError, type AIProvider } from "./ai/provider";
import { StoreError, type Store } from "./storage/store";
import { PendingActions } from "./tools/registry";

const permissionsSchema = z.object({
  readMemory: z.boolean(),
  writeMemory: z.boolean(),
  manageProjects: z.boolean(),
  webSearch: z.boolean(),
});

const attachmentSchema = z.object({
  name: z.string().max(200),
  kind: z.enum(["image", "pdf", "text"]),
  mediaType: z.string().max(100),
  data: z.string(),
});

const chatSchema = z.object({
  mode: z.enum(["assistente", "engenheiro", "estudos", "criativo", "produtividade", "laboratorio", "pesquisa"]),
  messages: z
    .array(
      z.object({
        role: z.enum(["user", "assistant"]),
        content: z.string().max(100_000),
        attachments: z.array(attachmentSchema).max(5).optional(),
      }),
    )
    .min(1)
    .max(200),
  permissions: permissionsSchema,
  clientContext: z.string().max(8000).optional(),
});

const IMAGE_TYPES = new Set(["image/png", "image/jpeg", "image/gif", "image/webp"]);

export interface AppDeps {
  store: Store;
  provider: AIProvider | null;
  version: string;
}

export function createApp({ store, provider, version }: AppDeps) {
  const app = express();
  const pending = new PendingActions();

  app.disable("x-powered-by");
  app.use(express.json({ limit: "25mb" }));
  // Segurança básica: sem CORS (somente mesma origem) e cabeçalhos defensivos.
  app.use((_req, res, next) => {
    res.setHeader("X-Content-Type-Options", "nosniff");
    res.setHeader("Referrer-Policy", "no-referrer");
    res.setHeader("Permissions-Policy", "camera=(self), microphone=(self)");
    next();
  });

  const wrap =
    (fn: (req: Request, res: Response) => unknown) =>
    (req: Request, res: Response, next: NextFunction) =>
      Promise.resolve(fn(req, res)).catch(next);

  // ---------- Estado ----------
  app.get("/api/status", (_req, res) => {
    const status: ServerStatus = {
      ai: {
        configured: !!provider,
        provider: provider?.name ?? "nenhum",
        model: provider?.model ?? null,
        webSearch: !!provider?.supportsWebSearch,
      },
      storage: { ok: store.healthCheck(), path: "arquivo JSON no servidor" },
      memoryEnabled: store.memoryEnabled,
      learningEnabled: store.learningSetting,
      knowledge: store.knowledgeStats(),
      version,
    };
    res.json(status);
  });

  // ---------- Conversa (SSE) ----------
  app.post(
    "/api/chat",
    wrap(async (req, res) => {
      const parsed = chatSchema.safeParse(req.body);
      if (!parsed.success) return res.status(400).json({ error: "Pedido inválido: " + parsed.error.issues[0]?.message });
      for (const m of parsed.data.messages)
        for (const a of m.attachments ?? [])
          if (a.kind === "image" && !IMAGE_TYPES.has(a.mediaType))
            return res.status(400).json({ error: `Tipo de imagem não suportado: ${a.mediaType}` });
      if (!provider) {
        return res.status(503).json({
          error: "Modelo de IA não configurado. Defina ANTHROPIC_API_KEY no arquivo .env do servidor e reinicie o Orion.",
        });
      }

      res.writeHead(200, {
        "Content-Type": "text/event-stream; charset=utf-8",
        "Cache-Control": "no-cache, no-transform",
        Connection: "keep-alive",
      });
      const controller = new AbortController();
      res.on("close", () => controller.abort());
      const emit = (e: ChatEvent) => {
        if (!res.writableEnded) res.write(`data: ${JSON.stringify(e)}\n\n`);
      };
      try {
        await runChat(parsed.data, { provider, store, pending }, emit, controller.signal);
      } catch (err) {
        if (!controller.signal.aborted) emit({ type: "error", message: err instanceof Error ? err.message : String(err) });
      } finally {
        res.end();
      }
    }),
  );

  // ---------- Ações que exigem confirmação final ----------
  app.get("/api/actions", (_req, res) => res.json(pending.list()));
  app.post("/api/actions/:id/confirm", (req, res) => res.json({ ok: true, message: pending.confirm(req.params.id) }));
  app.post("/api/actions/:id/cancel", (req, res) => res.json({ ok: pending.cancel(req.params.id) }));

  // ---------- Planejamento estruturado de projetos ----------
  app.post(
    "/api/projects/:id/plan",
    wrap(async (req, res) => {
      const project = store.getProject(String(req.params.id));
      if (!project) return res.status(404).json({ error: "Projeto não encontrado." });
      if (!provider) return res.status(503).json({ error: "Modelo de IA não configurado; o planejamento automático está indisponível." });
      res.json(await planProject(provider, project));
    }),
  );

  // ---------- Memória ----------
  const memorySchema = z.object({
    content: z.string().min(1).max(2000),
    category: z.enum(["projeto", "preferencia", "meta", "configuracao", "geral", "aprendizado"]).optional(),
  });
  app.get("/api/memory", (_req, res) => res.json({ enabled: store.memoryEnabled, items: store.listMemory() }));
  app.post("/api/memory", (req, res) => {
    const body = memorySchema.parse(req.body);
    res.status(201).json(store.addMemory(body.content, body.category));
  });
  app.patch("/api/memory/:id", (req, res) => res.json(store.updateMemory(req.params.id, memorySchema.partial().parse(req.body))));
  app.delete("/api/memory/:id", (req, res) => {
    store.deleteMemory(req.params.id);
    res.status(204).end();
  });
  app.delete("/api/memory", (_req, res) => {
    store.clearMemory();
    res.status(204).end();
  });
  app.put("/api/memory/enabled", (req, res) => {
    store.setMemoryEnabled(z.object({ enabled: z.boolean() }).parse(req.body).enabled);
    res.json({ enabled: store.memoryEnabled });
  });

  // ---------- Conhecimento e aprendizado ----------
  app.get("/api/knowledge", (_req, res) => res.json(store.listKnowledge()));
  app.get("/api/knowledge/search", (req, res) => res.json(store.searchKnowledge(String(req.query.q ?? ""), 8)));
  app.get("/api/knowledge/:id", (req, res) => {
    const doc = store.getKnowledge(req.params.id);
    if (!doc) return res.status(404).json({ error: "Documento não encontrado." });
    res.json(doc);
  });
  app.post("/api/knowledge", (req, res) => {
    const body = z.object({ title: z.string().max(160), content: z.string().min(1).max(400_000) }).parse(req.body);
    res.status(201).json(store.addKnowledge(body.title, body.content, "texto"));
  });
  app.delete("/api/knowledge/:id", (req, res) => {
    store.deleteKnowledge(req.params.id);
    res.status(204).end();
  });
  app.delete("/api/knowledge", (_req, res) => {
    store.clearKnowledge();
    res.status(204).end();
  });
  app.put("/api/learning/enabled", (req, res) => {
    store.setLearningEnabled(z.object({ enabled: z.boolean() }).parse(req.body).enabled);
    res.json({ enabled: store.learningSetting });
  });
  app.post(
    "/api/learn/conversation",
    wrap(async (req, res) => {
      const body = z
        .object({ messages: z.array(z.object({ role: z.enum(["user", "assistant"]), content: z.string().max(100_000) })).min(1).max(400), explicit: z.boolean().optional() })
        .parse(req.body);
      if (!provider) return res.status(503).json({ error: "Aprender com conversas exige um modelo de IA conectado." });
      res.json(await learnFromConversation(provider, store, body.messages, { explicit: body.explicit }));
    }),
  );
  app.post(
    "/api/learn/files",
    wrap(async (req, res) => {
      const body = z.object({ attachments: z.array(attachmentSchema).min(1).max(5), explicit: z.boolean().optional() }).parse(req.body);
      res.json(await learnFromAttachments(provider, store, body.attachments, { explicit: body.explicit }));
    }),
  );

  // ---------- Projetos ----------
  const stepSchema = z.object({ id: z.string().optional().default(""), title: z.string().min(1).max(200), done: z.boolean() });
  const projectSchema = z.object({
    name: z.string().min(1).max(120),
    description: z.string().max(5000).optional(),
    objective: z.string().max(2000).optional(),
    status: z.enum(["planejado", "em_andamento", "pausado", "concluido"]).optional(),
    deadline: z.string().nullable().optional(),
    steps: z.array(stepSchema).max(100).optional(),
    notes: z.string().max(20_000).optional(),
    files: z.array(z.string().max(500)).max(50).optional(),
  });
  app.get("/api/projects", (_req, res) => res.json(store.listProjects()));
  app.post("/api/projects", (req, res) => res.status(201).json(store.createProject(projectSchema.parse(req.body))));
  app.patch("/api/projects/:id", (req, res) => res.json(store.updateProject(req.params.id, projectSchema.partial().parse(req.body))));
  app.delete("/api/projects/:id", (req, res) => {
    store.deleteProject(req.params.id);
    res.status(204).end();
  });

  // ---------- Tarefas ----------
  const taskSchema = z.object({
    title: z.string().min(1).max(200),
    projectId: z.string().nullable().optional(),
    due: z.string().nullable().optional(),
    done: z.boolean().optional(),
  });
  app.get("/api/tasks", (_req, res) => res.json(store.listTasks()));
  app.post("/api/tasks", (req, res) => res.status(201).json(store.createTask(taskSchema.parse(req.body))));
  app.patch("/api/tasks/:id", (req, res) => res.json(store.updateTask(req.params.id, taskSchema.partial().parse(req.body))));
  app.delete("/api/tasks/:id", (req, res) => {
    store.deleteTask(req.params.id);
    res.status(204).end();
  });

  // ---------- Lembretes ----------
  app.get("/api/reminders", (_req, res) => res.json(store.listReminders()));
  app.post("/api/reminders", (req, res) => {
    const body = z.object({ text: z.string().min(1).max(300), at: z.string() }).parse(req.body);
    res.status(201).json(store.createReminder(body.text, body.at));
  });
  app.post("/api/reminders/:id/fired", (req, res) => res.json(store.markReminderFired(req.params.id)));
  app.delete("/api/reminders/:id", (req, res) => {
    store.deleteReminder(req.params.id);
    res.status(204).end();
  });

  // ---------- Privacidade ----------
  app.delete("/api/data", (_req, res) => {
    store.wipeAll();
    res.status(204).end();
  });

  app.use("/api", (_req, res) => res.status(404).json({ error: "Rota não encontrada." }));

  // Tratamento de erros compreensível para o usuário.
  app.use((err: unknown, _req: Request, res: Response, _next: NextFunction) => {
    if (err instanceof z.ZodError) return res.status(400).json({ error: "Dados inválidos: " + err.issues[0]?.message });
    if (err instanceof StoreError || err instanceof ProviderError) return res.status(err.status).json({ error: err.message });
    if (err && typeof err === "object" && "type" in err && err.type === "entity.too.large")
      return res.status(413).json({ error: "Arquivo grande demais (limite de ~18 MB após codificação)." });
    console.error("[orion] erro inesperado:", err);
    res.status(500).json({ error: "Erro interno do servidor do Orion." });
  });

  return app;
}
