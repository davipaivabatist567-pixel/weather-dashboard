// Camada de ferramentas do Orion: cada ferramenta tem parâmetros validados,
// nível de risco, permissão exigida e resultado verificável.
import { z } from "zod";
import { evaluateExpression, formatNumber } from "../../shared/math";
import { uid as randomUUID } from "../../shared/uid";
import type { PendingAction, Permissions, RiskLevel } from "../../shared/types";
import { Store, StoreError } from "../storage/store";

export interface ToolContext {
  store: Store;
  permissions: Permissions;
  pending: PendingActions;
}

export interface ToolOutcome {
  ok: boolean;
  /** Resumo curto mostrado na interface. */
  summary: string;
  /** Conteúdo devolvido ao modelo. */
  content: string;
  pendingAction?: PendingAction;
}

export interface ToolDef<S extends z.ZodType = z.ZodType> {
  name: string;
  label: string;
  description: string;
  risk: RiskLevel;
  permission?: keyof Permissions;
  schema: S;
  run: (input: z.infer<S>, ctx: ToolContext) => ToolOutcome | Promise<ToolOutcome>;
}

const define = <S extends z.ZodType>(def: ToolDef<S>): ToolDef => def as unknown as ToolDef;

const ok = (summary: string, data: unknown): ToolOutcome => ({
  ok: true,
  summary,
  content: typeof data === "string" ? data : JSON.stringify(data),
});

/**
 * Ações que exigem confirmação final ficam guardadas aqui até o usuário
 * confirmar (ou cancelar) pela interface. Nunca são executadas pelo modelo.
 */
export class PendingActions {
  private items = new Map<string, { action: PendingAction; execute: () => string; expires: number }>();
  private readonly ttlMs = 10 * 60_000;

  add(tool: string, description: string, execute: () => string): PendingAction {
    this.gc();
    const action: PendingAction = { id: randomUUID(), tool, description, createdAt: new Date().toISOString() };
    this.items.set(action.id, { action, execute, expires: Date.now() + this.ttlMs });
    return action;
  }
  confirm(id: string): string {
    this.gc();
    const item = this.items.get(id);
    if (!item) throw new StoreError("Ação não encontrada ou expirada.", 404);
    this.items.delete(id);
    return item.execute();
  }
  cancel(id: string): boolean {
    return this.items.delete(id);
  }
  list(): PendingAction[] {
    this.gc();
    return [...this.items.values()].map((i) => i.action);
  }
  private gc() {
    const now = Date.now();
    for (const [id, item] of this.items) if (item.expires < now) this.items.delete(id);
  }
}

export const TOOLS: ToolDef[] = [
  define({
    name: "calcular",
    label: "Calculadora",
    description:
      "Avalia uma expressão matemática com precisão. Use sempre que precisar de um resultado numérico exato. " +
      "Suporta + - * / ^ %, parênteses, pi, e, sqrt, sin, cos, tan, log (base 10), ln, abs, round, floor, ceil.",
    risk: "baixo",
    schema: z.object({ expressao: z.string().describe("Expressão, ex.: (3+4)^2 / sqrt(2)") }),
    run: ({ expressao }) => {
      const r = formatNumber(evaluateExpression(expressao));
      return ok(`${expressao} = ${r}`, { expressao, resultado: r });
    },
  }),
  define({
    name: "data_hora_atual",
    label: "Data e hora",
    description: "Retorna a data e a hora atuais do servidor do Orion (fuso America/Sao_Paulo e UTC).",
    risk: "baixo",
    schema: z.object({}),
    run: () => {
      const now = new Date();
      const local = now.toLocaleString("pt-BR", { timeZone: "America/Sao_Paulo", dateStyle: "full", timeStyle: "medium" });
      return ok(local, { brasilia: local, utc: now.toISOString() });
    },
  }),
  define({
    name: "memoria_listar",
    label: "Consultar memória",
    description: "Lista as memórias persistentes que o usuário autorizou o Orion a guardar.",
    risk: "autorizacao",
    permission: "readMemory",
    schema: z.object({}),
    run: (_i, { store }) => {
      if (!store.memoryEnabled) return { ok: false, summary: "Memória desativada", content: "A memória persistente está desativada pelo usuário." };
      const items = store.listMemory();
      return ok(`${items.length} memória(s)`, items.map(({ id, content, category }) => ({ id, content, category })));
    },
  }),
  define({
    name: "memoria_salvar",
    label: "Salvar memória",
    description:
      "Salva uma informação na memória persistente. Use SOMENTE quando o usuário pedir explicitamente para lembrar algo " +
      "(projetos, preferências, metas, configurações). Nunca salve senhas, chaves, documentos ou dados sensíveis.",
    risk: "autorizacao",
    permission: "writeMemory",
    schema: z.object({
      conteudo: z.string().min(1).max(2000),
      categoria: z.enum(["projeto", "preferencia", "meta", "configuracao", "geral"]).default("geral"),
    }),
    run: ({ conteudo, categoria }, { store }) => {
      const item = store.addMemory(conteudo, categoria);
      return ok(`Memória salva: “${item.content.slice(0, 60)}”`, { salvo: true, id: item.id });
    },
  }),
  define({
    name: "memoria_apagar",
    label: "Apagar memória",
    description: "Solicita a exclusão de uma memória. A exclusão só acontece depois que o usuário confirmar na interface.",
    risk: "confirmacao",
    permission: "writeMemory",
    schema: z.object({ id: z.string() }),
    run: ({ id }, { store, pending }) => {
      const item = store.listMemory().find((m) => m.id === id);
      if (!item) return { ok: false, summary: "Memória não encontrada", content: "Memória não encontrada." };
      const action = pending.add("memoria_apagar", `Apagar a memória “${item.content.slice(0, 80)}”`, () => {
        store.deleteMemory(id);
        return "Memória apagada.";
      });
      return {
        ok: true,
        summary: "Aguardando confirmação do usuário",
        content: "Pedido de exclusão criado. A memória NÃO foi apagada ainda: o usuário precisa confirmar na interface.",
        pendingAction: action,
      };
    },
  }),
  define({
    name: "projetos_listar",
    label: "Listar projetos",
    description: "Lista os projetos, etapas e tarefas do usuário salvos no Orion.",
    risk: "autorizacao",
    permission: "manageProjects",
    schema: z.object({}),
    run: (_i, { store }) => {
      const projects = store.listProjects().map((p) => ({
        id: p.id, nome: p.name, objetivo: p.objective, status: p.status, prazo: p.deadline,
        etapas: p.steps.map((s) => `${s.done ? "[x]" : "[ ]"} ${s.title}`),
      }));
      const tasks = store.listTasks().map((t) => ({ id: t.id, titulo: t.title, projeto: t.projectId, prazo: t.due, feita: t.done }));
      return ok(`${projects.length} projeto(s), ${tasks.length} tarefa(s)`, { projetos: projects, tarefas: tasks });
    },
  }),
  define({
    name: "projeto_criar",
    label: "Criar projeto",
    description: "Cria um novo projeto em MEUS PROJETOS. Use quando o usuário pedir para criar/registrar um projeto.",
    risk: "autorizacao",
    permission: "manageProjects",
    schema: z.object({
      nome: z.string().min(1).max(120),
      descricao: z.string().max(2000).optional(),
      objetivo: z.string().max(1000).optional(),
      prazo: z.string().optional().describe("Data no formato AAAA-MM-DD"),
      etapas: z.array(z.string().max(200)).max(30).optional(),
    }),
    run: (i, { store }) => {
      const p = store.createProject({
        name: i.nome, description: i.descricao, objective: i.objetivo, deadline: i.prazo ?? null,
        steps: (i.etapas ?? []).map((title) => ({ id: "", title, done: false })),
      });
      return ok(`Projeto criado: ${p.name}`, { criado: true, id: p.id, etapas: p.steps.length });
    },
  }),
  define({
    name: "projeto_adicionar_etapas",
    label: "Adicionar etapas",
    description: "Adiciona etapas a um projeto existente (use projetos_listar para obter o id).",
    risk: "autorizacao",
    permission: "manageProjects",
    schema: z.object({ projeto_id: z.string(), etapas: z.array(z.string().min(1).max(200)).min(1).max(30) }),
    run: ({ projeto_id, etapas }, { store }) => {
      const p = store.addProjectSteps(projeto_id, etapas);
      return ok(`${etapas.length} etapa(s) adicionada(s) em ${p.name}`, { adicionadas: etapas.length, total: p.steps.length });
    },
  }),
  define({
    name: "tarefa_criar",
    label: "Criar tarefa",
    description: "Cria uma tarefa na lista de tarefas, opcionalmente ligada a um projeto.",
    risk: "autorizacao",
    permission: "manageProjects",
    schema: z.object({
      titulo: z.string().min(1).max(200),
      projeto_id: z.string().optional(),
      prazo: z.string().optional().describe("Data no formato AAAA-MM-DD"),
    }),
    run: ({ titulo, projeto_id, prazo }, { store }) => {
      const t = store.createTask({ title: titulo, projectId: projeto_id ?? null, due: prazo ?? null });
      return ok(`Tarefa criada: ${t.title}`, { criada: true, id: t.id });
    },
  }),
  define({
    name: "lembrete_criar",
    label: "Criar lembrete",
    description:
      "Agenda um lembrete. Limitação real: a notificação é exibida pelo navegador somente enquanto o Orion estiver aberto. " +
      "Informe essa limitação ao usuário. Use data/hora ISO 8601 com fuso (ex.: 2026-05-01T14:30:00-03:00).",
    risk: "autorizacao",
    permission: "manageProjects",
    schema: z.object({ texto: z.string().min(1).max(300), quando: z.string() }),
    run: ({ texto, quando }, { store }) => {
      const r = store.createReminder(texto, quando);
      return ok(`Lembrete agendado para ${new Date(r.at).toLocaleString("pt-BR", { timeZone: "America/Sao_Paulo" })}`, {
        agendado: true, id: r.id, quando: r.at,
        observacao: "Disparado como notificação do navegador enquanto o Orion estiver aberto.",
      });
    },
  }),
  define({
    name: "projeto_excluir",
    label: "Excluir projeto",
    description: "Solicita a exclusão de um projeto. Só é executada após confirmação final do usuário na interface.",
    risk: "confirmacao",
    permission: "manageProjects",
    schema: z.object({ projeto_id: z.string() }),
    run: ({ projeto_id }, { store, pending }) => {
      const p = store.getProject(projeto_id);
      if (!p) return { ok: false, summary: "Projeto não encontrado", content: "Projeto não encontrado." };
      const action = pending.add("projeto_excluir", `Excluir o projeto “${p.name}”`, () => {
        store.deleteProject(projeto_id);
        return `Projeto “${p.name}” excluído.`;
      });
      return {
        ok: true,
        summary: "Aguardando confirmação do usuário",
        content: "Pedido de exclusão criado. O projeto NÃO foi excluído ainda: o usuário precisa confirmar na interface.",
        pendingAction: action,
      };
    },
  }),
];

/** Ferramentas liberadas para um pedido, de acordo com as permissões do usuário. */
export function availableTools(permissions: Permissions, memoryEnabled: boolean): ToolDef[] {
  return TOOLS.filter((t) => {
    if (t.permission && !permissions[t.permission]) return false;
    if (t.name.startsWith("memoria_") && !memoryEnabled) return false;
    return true;
  });
}

export function findTool(name: string): ToolDef | undefined {
  return TOOLS.find((t) => t.name === name);
}

/** Executa uma ferramenta com validação de entrada e tratamento de erros. */
export async function executeTool(tool: ToolDef, rawInput: unknown, ctx: ToolContext): Promise<ToolOutcome> {
  if (tool.permission && !ctx.permissions[tool.permission]) {
    return { ok: false, summary: "Sem autorização", content: `Ferramenta ${tool.name} não autorizada pelo usuário.` };
  }
  const parsed = tool.schema.safeParse(rawInput);
  if (!parsed.success) {
    return { ok: false, summary: "Parâmetros inválidos", content: `Parâmetros inválidos: ${parsed.error.message}` };
  }
  try {
    return await tool.run(parsed.data, ctx);
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return { ok: false, summary: message, content: `Erro: ${message}` };
  }
}

export function toJsonSchema(tool: ToolDef): Record<string, unknown> {
  const schema = z.toJSONSchema(tool.schema, { io: "input" }) as Record<string, unknown>;
  delete schema.$schema;
  return schema;
}
