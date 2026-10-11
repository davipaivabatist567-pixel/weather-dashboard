import { mkdtempSync } from "node:fs";
import type { AddressInfo } from "node:net";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import type { ChatEvent, ChatRequest, Permissions } from "../../shared/types";
import { buildSystemPrompt, runChat, toolsFor } from "../../server/ai/core";
import type { AIProvider, ProviderChatRequest, ProviderHandlers } from "../../server/ai/provider";
import { createApp } from "../../server/app";
import { createFileStore } from "../../server/storage/filePersistence";
import { looksSensitive } from "../../server/storage/store";
import { executeTool, findTool, PendingActions, toJsonSchema, TOOLS } from "../../server/tools/registry";

const tmpStore = () => createFileStore(join(mkdtempSync(join(tmpdir(), "orion-")), "db.json"));
const ALL: Permissions = { readMemory: true, writeMemory: true, manageProjects: true, webSearch: true };
const NONE: Permissions = { readMemory: false, writeMemory: false, manageProjects: false, webSearch: false };

/** Provedor falso: executa um roteiro de chamadas de ferramenta e devolve texto. */
class FakeProvider implements AIProvider {
  name = "Fake";
  model = "fake-1";
  supportsWebSearch = true;
  lastRequest: ProviderChatRequest | null = null;
  constructor(private script: { tool?: { name: string; input: unknown }; text: string }) {}
  async chat(req: ProviderChatRequest, h: ProviderHandlers) {
    this.lastRequest = req;
    if (this.script.tool) {
      const r = await h.onToolCall({ id: "t1", ...this.script.tool });
      h.onText(`[ferramenta:${r.isError ? "erro" : "ok"}] `);
    }
    h.onText(this.script.text);
    return { stopReason: "end_turn", model: this.model };
  }
  async structured<T>() {
    return { etapas: ["a", "b"], proximo_passo: "a", riscos: [] } as T;
  }
}

const req = (over: Partial<ChatRequest> = {}): ChatRequest => ({
  mode: "assistente",
  messages: [{ role: "user", content: "oi" }],
  permissions: ALL,
  ...over,
});

describe("armazenamento", () => {
  it("persiste dados entre instâncias", () => {
    const s = tmpStore();
    s.addMemory("Gosto de TypeScript", "preferencia");
    s.createProject({ name: "Jogo" });
    const again = createFileStore(s.path);
    expect(again.listMemory()[0].content).toBe("Gosto de TypeScript");
    expect(again.listProjects()[0].name).toBe("Jogo");
  });
  it("recusa dados sensíveis na memória", () => {
    const s = tmpStore();
    expect(() => s.addMemory("minha senha: abc123")).toThrow(/senhas/);
    expect(() => s.addMemory("sk-ant-api03-abcdefghijklmnopqrstuvwxyz")).toThrow();
    expect(looksSensitive("cartão 4111 1111 1111 1111")).toBe(true);
    expect(looksSensitive("Meu projeto é um jogo de naves")).toBe(false);
  });
  it("não salva memória quando desativada", () => {
    const s = tmpStore();
    s.setMemoryEnabled(false);
    expect(() => s.addMemory("algo")).toThrow(/desativada/);
  });
  it("valida lembretes", () => {
    const s = tmpStore();
    expect(() => s.createReminder("x", "data inválida")).toThrow();
    expect(() => s.createReminder("x", "2000-01-01T00:00:00Z")).toThrow(/passou/);
    expect(s.createReminder("x", new Date(Date.now() + 60_000).toISOString()).fired).toBe(false);
  });
  it("apaga tudo, preservando a configuração de memória", () => {
    const s = tmpStore();
    s.addMemory("a");
    s.createTask({ title: "t" });
    s.setMemoryEnabled(false);
    s.wipeAll();
    expect(s.listMemory()).toHaveLength(0);
    expect(s.listTasks()).toHaveLength(0);
    expect(s.memoryEnabled).toBe(false);
  });
});

describe("ferramentas", () => {
  it("todas têm schema JSON de objeto", () => {
    for (const t of TOOLS) expect(toJsonSchema(t).type).toBe("object");
  });
  it("valida parâmetros", async () => {
    const ctx = { store: tmpStore(), permissions: ALL, pending: new PendingActions() };
    const r = await executeTool(findTool("calcular")!, { expressao: 42 }, ctx);
    expect(r.ok).toBe(false);
    expect(r.summary).toMatch(/inválidos/);
    const ok = await executeTool(findTool("calcular")!, { expressao: "6*7" }, ctx);
    expect(ok.ok).toBe(true);
    expect(ok.content).toContain('"resultado":"42"');
  });
  it("bloqueia ferramentas sem permissão", async () => {
    const ctx = { store: tmpStore(), permissions: NONE, pending: new PendingActions() };
    const r = await executeTool(findTool("projeto_criar")!, { nome: "X" }, ctx);
    expect(r.ok).toBe(false);
    expect(ctx.store.listProjects()).toHaveLength(0);
  });
  it("exclusão só acontece após confirmação", async () => {
    const store = tmpStore();
    const pending = new PendingActions();
    const p = store.createProject({ name: "Importante" });
    const r = await executeTool(findTool("projeto_excluir")!, { projeto_id: p.id }, { store, permissions: ALL, pending });
    expect(r.pendingAction).toBeDefined();
    expect(store.listProjects()).toHaveLength(1);
    expect(pending.confirm(r.pendingAction!.id)).toContain("excluído");
    expect(store.listProjects()).toHaveLength(0);
    expect(() => pending.confirm(r.pendingAction!.id)).toThrow();
  });
  it("seleciona ferramentas por modo e permissão", () => {
    const names = (r: Pick<ChatRequest, "mode" | "permissions">, mem = true) => toolsFor(r, mem).map((t) => t.name);
    expect(names({ mode: "produtividade", permissions: ALL })).toContain("projeto_criar");
    expect(names({ mode: "laboratorio", permissions: ALL })).not.toContain("projeto_criar");
    expect(names({ mode: "assistente", permissions: NONE })).toEqual(["calcular", "data_hora_atual"]);
    expect(names({ mode: "assistente", permissions: ALL }, false)).not.toContain("memoria_salvar");
  });
});

describe("inteligência central", () => {
  it("inclui a memória somente quando autorizada", () => {
    const store = tmpStore();
    store.addMemory("Meu nome é Davi");
    expect(buildSystemPrompt(req(), store, false)).toContain("Meu nome é Davi");
    expect(buildSystemPrompt(req({ permissions: { ...ALL, readMemory: false } }), store, false)).not.toContain("Meu nome é Davi");
    store.setMemoryEnabled(false);
    expect(buildSystemPrompt(req(), store, false)).not.toContain("Meu nome é Davi");
  });
  it("executa ferramentas e emite eventos", async () => {
    const store = tmpStore();
    const provider = new FakeProvider({ tool: { name: "projeto_criar", input: { nome: "Robô", etapas: ["Peças", "Montagem"] } }, text: "Pronto." });
    const events: ChatEvent[] = [];
    await runChat(req({ mode: "produtividade" }), { provider, store, pending: new PendingActions() }, (e) => events.push(e), new AbortController().signal);
    expect(store.listProjects()[0].steps).toHaveLength(2);
    expect(events.map((e) => e.type)).toEqual(["tool_start", "tool_result", "text", "text", "done"]);
    expect(provider.lastRequest!.webSearch).toBe(false); // modo produtividade não pesquisa
  });
  it("recusa ferramentas fora da lista liberada", async () => {
    const store = tmpStore();
    const provider = new FakeProvider({ tool: { name: "projeto_criar", input: { nome: "X" } }, text: "ok" });
    const events: ChatEvent[] = [];
    await runChat(req({ permissions: NONE }), { provider, store, pending: new PendingActions() }, (e) => events.push(e), new AbortController().signal);
    expect(store.listProjects()).toHaveLength(0);
    expect(events.find((e) => e.type === "tool_result")).toMatchObject({ ok: false });
  });
  it("habilita pesquisa somente quando permitido", async () => {
    const provider = new FakeProvider({ text: "ok" });
    const deps = { provider, store: tmpStore(), pending: new PendingActions() };
    await runChat(req({ mode: "pesquisa" }), deps, () => {}, new AbortController().signal);
    expect(provider.lastRequest!.webSearch).toBe(true);
    await runChat(req({ mode: "pesquisa", permissions: { ...ALL, webSearch: false } }), deps, () => {}, new AbortController().signal);
    expect(provider.lastRequest!.webSearch).toBe(false);
  });
});

describe("API HTTP", () => {
  let base = "";
  let close: () => void;
  beforeAll(async () => {
    const app = createApp({ store: tmpStore(), provider: null, version: "test" });
    const server = app.listen(0);
    await new Promise((r) => server.once("listening", r));
    base = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
    close = () => server.close();
  });
  afterAll(() => close());

  const call = (path: string, method = "GET", body?: unknown) =>
    fetch(base + path, { method, headers: { "Content-Type": "application/json" }, body: body ? JSON.stringify(body) : undefined });

  it("informa claramente que a IA não está configurada", async () => {
    const status = await (await call("/api/status")).json();
    expect(status.ai.configured).toBe(false);
    const r = await call("/api/chat", "POST", req());
    expect(r.status).toBe(503);
    expect((await r.json()).error).toMatch(/ANTHROPIC_API_KEY/);
  });
  it("valida o corpo do chat", async () => {
    expect((await call("/api/chat", "POST", { mode: "x" })).status).toBe(400);
  });
  it("não expõe chaves no status", async () => {
    const text = await (await call("/api/status")).text();
    expect(text).not.toMatch(/sk-|api_key|apiKey/i);
  });
  it("CRUD de projetos, tarefas e memória", async () => {
    const p = await (await call("/api/projects", "POST", { name: "Site" })).json();
    expect((await call(`/api/projects/${p.id}`, "PATCH", { status: "em_andamento" })).status).toBe(200);
    const t = await (await call("/api/tasks", "POST", { title: "Logo", projectId: p.id })).json();
    expect((await call(`/api/tasks/${t.id}`, "PATCH", { done: true })).status).toBe(200);
    const m = await call("/api/memory", "POST", { content: "Prefiro respostas curtas", category: "preferencia" });
    expect(m.status).toBe(201);
    expect((await call("/api/memory", "POST", { content: "password=123" })).status).toBe(400);
    expect((await call(`/api/projects/${p.id}`, "DELETE")).status).toBe(204);
    expect((await call(`/api/projects/${p.id}`, "DELETE")).status).toBe(404);
    expect((await call(`/api/projects/${p.id}/plan`, "POST")).status).toBe(404);
  });
  it("planejamento indica a falta de IA", async () => {
    const p = await (await call("/api/projects", "POST", { name: "App" })).json();
    const r = await call(`/api/projects/${p.id}/plan`, "POST");
    expect(r.status).toBe(503);
  });
  it("rotas desconhecidas retornam 404 em JSON", async () => {
    const r = await call("/api/nada");
    expect(r.status).toBe(404);
    expect((await r.json()).error).toBeTruthy();
  });
});
