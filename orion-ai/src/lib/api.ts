// Cliente HTTP do backend do Orion.
import type { ChatEvent, ChatRequest, MemoryItem, Project, Reminder, ServerStatus, Task } from "../../shared/types";

export class ApiError extends Error {
  constructor(message: string, readonly status: number) {
    super(message);
  }
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  let res: Response;
  try {
    res = await fetch(path, { ...init, headers: { "Content-Type": "application/json", ...init?.headers } });
  } catch {
    throw new ApiError("Servidor do Orion inacessível. Verifique se o backend está em execução (npm run dev).", 0);
  }
  if (res.status === 204) return undefined as T;
  const body = await res.json().catch(() => null);
  if (!res.ok) throw new ApiError(body?.error ?? `Erro HTTP ${res.status}`, res.status);
  return body as T;
}

const json = (method: string, data?: unknown): RequestInit => ({ method, body: data === undefined ? undefined : JSON.stringify(data) });

export const api = {
  status: () => request<ServerStatus>("/api/status"),

  memory: {
    list: () => request<{ enabled: boolean; items: MemoryItem[] }>("/api/memory"),
    add: (content: string, category?: MemoryItem["category"]) => request<MemoryItem>("/api/memory", json("POST", { content, category })),
    update: (id: string, patch: Partial<Pick<MemoryItem, "content" | "category">>) => request<MemoryItem>(`/api/memory/${id}`, json("PATCH", patch)),
    remove: (id: string) => request<void>(`/api/memory/${id}`, json("DELETE")),
    clear: () => request<void>("/api/memory", json("DELETE")),
    setEnabled: (enabled: boolean) => request<{ enabled: boolean }>("/api/memory/enabled", json("PUT", { enabled })),
  },
  projects: {
    list: () => request<Project[]>("/api/projects"),
    create: (p: Partial<Project> & { name: string }) => request<Project>("/api/projects", json("POST", p)),
    update: (id: string, p: Partial<Project>) => request<Project>(`/api/projects/${id}`, json("PATCH", p)),
    remove: (id: string) => request<void>(`/api/projects/${id}`, json("DELETE")),
    plan: (id: string) => request<{ etapas: string[]; proximo_passo: string; riscos: string[] }>(`/api/projects/${id}/plan`, json("POST")),
  },
  tasks: {
    list: () => request<Task[]>("/api/tasks"),
    create: (t: { title: string; projectId?: string | null; due?: string | null }) => request<Task>("/api/tasks", json("POST", t)),
    update: (id: string, t: Partial<Task>) => request<Task>(`/api/tasks/${id}`, json("PATCH", t)),
    remove: (id: string) => request<void>(`/api/tasks/${id}`, json("DELETE")),
  },
  reminders: {
    list: () => request<Reminder[]>("/api/reminders"),
    create: (text: string, at: string) => request<Reminder>("/api/reminders", json("POST", { text, at })),
    fired: (id: string) => request<Reminder>(`/api/reminders/${id}/fired`, json("POST")),
    remove: (id: string) => request<void>(`/api/reminders/${id}`, json("DELETE")),
  },
  actions: {
    confirm: (id: string) => request<{ ok: boolean; message: string }>(`/api/actions/${id}/confirm`, json("POST")),
    cancel: (id: string) => request<{ ok: boolean }>(`/api/actions/${id}/cancel`, json("POST")),
  },
  wipeAll: () => request<void>("/api/data", json("DELETE")),
};

/** Envia uma conversa e recebe a resposta em streaming (Server-Sent Events). */
export async function streamChat(req: ChatRequest, onEvent: (e: ChatEvent) => void, signal: AbortSignal) {
  let res: Response;
  try {
    res = await fetch("/api/chat", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(req), signal });
  } catch (err) {
    if (signal.aborted) throw err;
    throw new ApiError("Servidor do Orion inacessível. Verifique se o backend está em execução.", 0);
  }
  if (!res.ok || !res.body) {
    const body = await res.json().catch(() => null);
    throw new ApiError(body?.error ?? `Erro HTTP ${res.status}`, res.status);
  }
  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });
    let idx;
    while ((idx = buffer.indexOf("\n\n")) >= 0) {
      const chunk = buffer.slice(0, idx);
      buffer = buffer.slice(idx + 2);
      for (const line of chunk.split("\n")) {
        if (line.startsWith("data: ")) onEvent(JSON.parse(line.slice(6)) as ChatEvent);
      }
    }
  }
}
