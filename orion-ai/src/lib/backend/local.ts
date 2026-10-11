// Backend local da versão HTML: roda a mesma inteligência central, ferramentas e
// armazenamento do servidor, mas dentro do navegador. Os dados ficam no localStorage
// deste navegador e a IA é chamada diretamente com a chave do próprio usuário.
import type { ChatEvent, ChatRequest, MemoryItem, Project, ServerStatus, Task } from "../../../shared/types";
import { AnthropicProvider } from "../../../server/ai/anthropicProvider";
import { runChat } from "../../../server/ai/core";
import { planProject } from "../../../server/ai/planner";
import type { AIProvider } from "../../../server/ai/provider";
import { ProviderError } from "../../../server/ai/provider";
import { Store, StoreError, type Persistence } from "../../../server/storage/store";
import { PendingActions } from "../../../server/tools/registry";
import { ApiError } from "./errors";
import type { AiConfigApi, Backend } from "./http";

const DB_KEY = "orion.db";
const AI_KEY = "orion.ai";
const EFFORTS = ["low", "medium", "high", "xhigh", "max"] as const;
type AiConfig = ReturnType<AiConfigApi["get"]>;
const DEFAULT_AI: AiConfig = { apiKey: "", model: "claude-opus-5-5", effort: "medium", webSearch: true };

const localPersistence: Persistence = {
  label: "localStorage deste navegador",
  load() {
    try {
      const raw = localStorage.getItem(DB_KEY);
      return raw ? JSON.parse(raw) : null;
    } catch {
      return null;
    }
  },
  save(json) {
    try {
      localStorage.setItem(DB_KEY, json);
    } catch {
      throw new StoreError("Não foi possível salvar: o armazenamento do navegador está cheio ou bloqueado.", 507);
    }
  },
};

let store: Store | null = null;
const getStore = () => (store ??= new Store(localPersistence));
const pending = new PendingActions();

function readAi(): AiConfig {
  try {
    const cfg = { ...DEFAULT_AI, ...JSON.parse(localStorage.getItem(AI_KEY) ?? "{}") } as AiConfig;
    if (!EFFORTS.includes(cfg.effort)) cfg.effort = "medium";
    return cfg;
  } catch {
    return { ...DEFAULT_AI };
  }
}

let cachedProvider: { key: string; provider: AIProvider } | null = null;
function getProvider(): AIProvider | null {
  const cfg = readAi();
  if (!cfg.apiKey.trim()) return null;
  const sig = JSON.stringify(cfg);
  if (cachedProvider?.key !== sig) {
    cachedProvider = { key: sig, provider: new AnthropicProvider(cfg.apiKey.trim(), cfg.model || DEFAULT_AI.model, cfg.effort, cfg.webSearch, { browser: true }) };
  }
  return cachedProvider.provider;
}

/** Executa uma operação local convertendo erros no mesmo formato do backend HTTP. */
async function run<T>(fn: () => T | Promise<T>): Promise<T> {
  try {
    return await fn();
  } catch (err) {
    if (err instanceof StoreError || err instanceof ProviderError) throw new ApiError(err.message, err.status);
    throw new ApiError(err instanceof Error ? err.message : String(err), 500);
  }
}

const aiConfig: AiConfigApi = {
  get: readAi,
  set(cfg) {
    localStorage.setItem(AI_KEY, JSON.stringify({ ...cfg, apiKey: cfg.apiKey.trim() }));
  },
  forgetKey() {
    localStorage.setItem(AI_KEY, JSON.stringify({ ...readAi(), apiKey: "" }));
  },
};

export const backend: Backend = {
  kind: "navegador",
  aiConfig,
  status: () =>
    run((): ServerStatus => {
      const p = getProvider();
      return {
        ai: { configured: !!p, provider: p?.name ?? "nenhum", model: p?.model ?? null, webSearch: !!p?.supportsWebSearch },
        storage: { ok: getStore().healthCheck(), path: localPersistence.label },
        memoryEnabled: getStore().memoryEnabled,
        version: "0.1.0-html",
      };
    }),

  memory: {
    list: () => run(() => ({ enabled: getStore().memoryEnabled, items: getStore().listMemory() })),
    add: (content: string, category?: MemoryItem["category"]) => run(() => getStore().addMemory(content, category)),
    update: (id: string, patch: Partial<Pick<MemoryItem, "content" | "category">>) => run(() => getStore().updateMemory(id, patch)),
    remove: (id: string) => run(() => getStore().deleteMemory(id)),
    clear: () => run(() => getStore().clearMemory()),
    setEnabled: (enabled: boolean) =>
      run(() => {
        getStore().setMemoryEnabled(enabled);
        return { enabled: getStore().memoryEnabled };
      }),
  },
  projects: {
    list: () => run(() => getStore().listProjects()),
    create: (p: Partial<Project> & { name: string }) => run(() => getStore().createProject(p)),
    update: (id: string, p: Partial<Project>) => run(() => getStore().updateProject(id, p)),
    remove: (id: string) => run(() => getStore().deleteProject(id)),
    plan: (id: string) =>
      run(async () => {
        const project = getStore().getProject(id);
        if (!project) throw new StoreError("Projeto não encontrado.", 404);
        const provider = getProvider();
        if (!provider) throw new StoreError("Modelo de IA não configurado; o planejamento automático está indisponível.", 503);
        return planProject(provider, project);
      }),
  },
  tasks: {
    list: () => run(() => getStore().listTasks()),
    create: (t: { title: string; projectId?: string | null; due?: string | null }) => run(() => getStore().createTask(t)),
    update: (id: string, t: Partial<Task>) => run(() => getStore().updateTask(id, t)),
    remove: (id: string) => run(() => getStore().deleteTask(id)),
  },
  reminders: {
    list: () => run(() => getStore().listReminders()),
    create: (text: string, at: string) => run(() => getStore().createReminder(text, at)),
    fired: (id: string) => run(() => getStore().markReminderFired(id)),
    remove: (id: string) => run(() => getStore().deleteReminder(id)),
  },
  actions: {
    confirm: (id: string) => run(() => ({ ok: true, message: pending.confirm(id) })),
    cancel: (id: string) => run(() => ({ ok: pending.cancel(id) })),
  },
  wipeAll: () => run(() => getStore().wipeAll()),

  async streamChat(req: ChatRequest, onEvent: (e: ChatEvent) => void, signal: AbortSignal) {
    const provider = getProvider();
    if (!provider) throw new ApiError("Modelo de IA não configurado. Informe sua chave da API em Configurações → Conexão com a IA.", 503);
    try {
      await runChat(req, { provider, store: getStore(), pending }, onEvent, signal);
    } catch (err) {
      if (signal.aborted) throw err;
      onEvent({ type: "error", message: err instanceof Error ? err.message : String(err) });
    }
  },
};
