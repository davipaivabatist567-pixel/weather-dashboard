// Armazenamento persistente de memória, projetos, tarefas, lembretes e configurações.
// Independente de plataforma: a gravação fica a cargo de um adaptador de persistência
// (arquivo JSON no servidor Node, localStorage na versão HTML).
import type { KnowledgeDoc, KnowledgeMeta, MemoryCategory, MemoryItem, Project, Reminder, Task } from "../../shared/types";
import { KnowledgeIndex, normalizeText, type SearchHit } from "../knowledge/search";
import { uid as randomUUID } from "../../shared/uid";

export interface Persistence {
  /** Descrição de onde os dados ficam (exibida no diagnóstico). */
  label: string;
  load(): unknown | null;
  save(json: string): void;
}

export interface DbShape {
  version: 1;
  settings: { memoryEnabled: boolean; learningEnabled: boolean };
  memory: MemoryItem[];
  knowledge: KnowledgeDoc[];
  projects: Project[];
  tasks: Task[];
  reminders: Reminder[];
}

const empty = (): DbShape => ({
  version: 1,
  settings: { memoryEnabled: true, learningEnabled: true },
  memory: [],
  knowledge: [],
  projects: [],
  tasks: [],
  reminders: [],
});

/** Credenciais inequívocas: removidas de qualquer conteúdo aprendido. */
const HARD_SECRETS = [
  /\bsk-[a-z0-9_-]{16,}/gi,
  /-----BEGIN [A-Z ]*PRIVATE KEY-----[\s\S]*?(-----END [A-Z ]*PRIVATE KEY-----|$)/g,
  /\b\d{4}[ -]?\d{4}[ -]?\d{4}[ -]?\d{4}\b/g, // número de cartão
];
/** Padrões que parecem credenciais — nunca devem ir para a memória. */
const SECRET_PATTERNS = [...HARD_SECRETS.map((r) => new RegExp(r.source, "i")), /\b(senha|password|passwd|api[_ -]?key|token|segredo|secret)\b\s*[:=]/i];

export function looksSensitive(text: string): boolean {
  return SECRET_PATTERNS.some((re) => re.test(text));
}

/** Remove credenciais evidentes de documentos (que podem citar a palavra "senha" legitimamente). */
export function redactSecrets(text: string): { text: string; redacted: number } {
  let redacted = 0;
  let out = text;
  for (const re of HARD_SECRETS) out = out.replace(re, () => (redacted++, "[dado sensível removido]"));
  return { text: out, redacted };
}

const MAX_DOC_CHARS = 400_000;
const MAX_TOTAL_KNOWLEDGE = 8_000_000;
const same = (a: string, b: string) => normalizeText(a).replace(/\W+/g, " ").trim() === normalizeText(b).replace(/\W+/g, " ").trim();

export class Store {
  private db: DbShape;

  constructor(readonly persistence: Persistence) {
    this.db = this.load();
  }

  get path() {
    return this.persistence.label;
  }

  private lastSaved: string | null = null;
  private index: KnowledgeIndex | null = null;

  private load(): DbShape {
    const parsed = this.persistence.load() as Partial<DbShape> | null;
    if (!parsed || typeof parsed !== "object") return empty();
    const db = { ...empty(), ...parsed, settings: { ...empty().settings, ...parsed.settings } } as DbShape;
    this.lastSaved = JSON.stringify(db);
    return db;
  }

  /** Grava; se falhar (ex.: armazenamento cheio), desfaz a alteração em memória. */
  private save() {
    const json = JSON.stringify(this.db);
    try {
      this.persistence.save(json);
      this.lastSaved = json;
    } catch (err) {
      this.db = this.lastSaved ? (JSON.parse(this.lastSaved) as DbShape) : empty();
      this.index = null;
      throw err instanceof StoreError ? err : new StoreError(`Falha ao salvar: ${err instanceof Error ? err.message : String(err)}`, 507);
    }
  }

  /** Verifica se o armazenamento está gravável. */
  healthCheck(): boolean {
    try {
      this.save();
      return true;
    } catch {
      return false;
    }
  }

  // ---------- Configurações ----------
  get memoryEnabled() {
    return this.db.settings.memoryEnabled;
  }
  setMemoryEnabled(enabled: boolean) {
    this.db.settings.memoryEnabled = enabled;
    this.save();
  }
  /** Aprendizado automático (conversas e arquivos). Só tem efeito com a memória ativada. */
  get learningEnabled() {
    return this.db.settings.learningEnabled && this.db.settings.memoryEnabled;
  }
  get learningSetting() {
    return this.db.settings.learningEnabled;
  }
  setLearningEnabled(enabled: boolean) {
    this.db.settings.learningEnabled = enabled;
    this.save();
  }

  // ---------- Base de conhecimento ----------
  listKnowledge(): KnowledgeMeta[] {
    return this.db.knowledge.map(({ content, ...meta }) => ({ ...meta, preview: content.slice(0, 220) }));
  }
  getKnowledge(id: string): KnowledgeDoc | undefined {
    return this.db.knowledge.find((k) => k.id === id);
  }
  knowledgeStats() {
    return { docs: this.db.knowledge.length, chars: this.db.knowledge.reduce((s, k) => s + k.chars, 0) };
  }
  addKnowledge(title: string, content: string, source: KnowledgeDoc["source"] = "texto"): KnowledgeMeta & { redacted: number } {
    if (!this.db.settings.memoryEnabled) throw new StoreError("A memória está desativada; ative-a para o Orion aprender.");
    const clean = redactSecrets(content.replace(/\u0000/g, "").trim());
    if (!clean.text) throw new StoreError("Conteúdo vazio: nada para aprender.");
    if (clean.text.length > MAX_DOC_CHARS) throw new StoreError(`Conteúdo muito grande (máx. ${MAX_DOC_CHARS.toLocaleString("pt-BR")} caracteres por documento).`);
    if (this.knowledgeStats().chars + clean.text.length > MAX_TOTAL_KNOWLEDGE) throw new StoreError("A base de conhecimento está cheia. Apague documentos antigos.");
    const name = (title.trim() || clean.text.slice(0, 60)).slice(0, 160);
    const existing = this.db.knowledge.find((k) => k.title === name && k.content === clean.text);
    if (existing) return { ...this.listKnowledge().find((m) => m.id === existing.id)!, redacted: clean.redacted };
    const doc: KnowledgeDoc = { id: randomUUID(), title: name, source, content: clean.text, chars: clean.text.length, createdAt: new Date().toISOString() };
    this.db.knowledge.push(doc);
    this.index = null;
    this.save();
    return { ...this.listKnowledge().find((m) => m.id === doc.id)!, redacted: clean.redacted };
  }
  deleteKnowledge(id: string) {
    const before = this.db.knowledge.length;
    this.db.knowledge = this.db.knowledge.filter((k) => k.id !== id);
    if (this.db.knowledge.length === before) throw new StoreError("Documento não encontrado.", 404);
    this.index = null;
    this.save();
  }
  clearKnowledge() {
    this.db.knowledge = [];
    this.index = null;
    this.save();
  }
  /** Trechos mais relevantes para a consulta (vazio se a memória estiver desativada). */
  searchKnowledge(query: string, limit = 5): SearchHit[] {
    if (!this.db.settings.memoryEnabled || !this.db.knowledge.length) return [];
    this.index ??= new KnowledgeIndex(this.db.knowledge);
    return this.index.search(query, limit);
  }

  // ---------- Memória ----------
  listMemory(): MemoryItem[] {
    return [...this.db.memory];
  }
  addMemory(content: string, category: MemoryCategory = "geral", origin: MemoryItem["origin"] = "usuario"): MemoryItem {
    if (!this.db.settings.memoryEnabled) throw new StoreError("A memória persistente está desativada.");
    const text = content.trim();
    if (!text) throw new StoreError("Memória vazia.");
    if (text.length > 2000) throw new StoreError("Memória muito longa (máx. 2000 caracteres).");
    if (looksSensitive(text)) throw new StoreError("Por segurança, o Orion não armazena senhas, chaves ou dados de cartão.");
    const duplicate = this.db.memory.find((m) => same(m.content, text));
    if (duplicate) return duplicate;
    const now = new Date().toISOString();
    const item: MemoryItem = { id: randomUUID(), content: text, category, origin, createdAt: now, updatedAt: now };
    this.db.memory.push(item);
    this.save();
    return item;
  }
  updateMemory(id: string, patch: Partial<Pick<MemoryItem, "content" | "category">>): MemoryItem {
    const item = this.db.memory.find((m) => m.id === id);
    if (!item) throw new StoreError("Memória não encontrada.", 404);
    if (patch.content !== undefined) {
      const text = patch.content.trim();
      if (!text) throw new StoreError("Memória vazia.");
      if (looksSensitive(text)) throw new StoreError("Por segurança, o Orion não armazena senhas, chaves ou dados de cartão.");
      item.content = text;
    }
    if (patch.category) item.category = patch.category;
    item.updatedAt = new Date().toISOString();
    this.save();
    return item;
  }
  deleteMemory(id: string) {
    const before = this.db.memory.length;
    this.db.memory = this.db.memory.filter((m) => m.id !== id);
    if (this.db.memory.length === before) throw new StoreError("Memória não encontrada.", 404);
    this.save();
  }
  clearMemory() {
    this.db.memory = [];
    this.save();
  }

  // ---------- Projetos ----------
  listProjects(): Project[] {
    return [...this.db.projects];
  }
  getProject(id: string): Project | undefined {
    return this.db.projects.find((p) => p.id === id);
  }
  createProject(input: Partial<Project> & { name: string }): Project {
    const name = input.name.trim();
    if (!name) throw new StoreError("O projeto precisa de um nome.");
    const now = new Date().toISOString();
    const project: Project = {
      id: randomUUID(),
      name,
      description: input.description ?? "",
      objective: input.objective ?? "",
      status: input.status ?? "planejado",
      deadline: input.deadline ?? null,
      steps: (input.steps ?? []).map((s) => ({ id: randomUUID(), title: s.title, done: !!s.done })),
      notes: input.notes ?? "",
      files: input.files ?? [],
      createdAt: now,
      updatedAt: now,
    };
    this.db.projects.push(project);
    this.save();
    return project;
  }
  updateProject(id: string, patch: Partial<Project>): Project {
    const project = this.getProject(id);
    if (!project) throw new StoreError("Projeto não encontrado.", 404);
    const { id: _id, createdAt: _c, ...rest } = patch;
    Object.assign(project, rest);
    if (patch.steps) project.steps = patch.steps.map((s) => ({ id: s.id || randomUUID(), title: s.title, done: !!s.done }));
    project.updatedAt = new Date().toISOString();
    this.save();
    return project;
  }
  addProjectSteps(id: string, titles: string[]): Project {
    const project = this.getProject(id);
    if (!project) throw new StoreError("Projeto não encontrado.", 404);
    for (const title of titles) {
      const t = title.trim();
      if (t) project.steps.push({ id: randomUUID(), title: t, done: false });
    }
    project.updatedAt = new Date().toISOString();
    this.save();
    return project;
  }
  deleteProject(id: string) {
    const before = this.db.projects.length;
    this.db.projects = this.db.projects.filter((p) => p.id !== id);
    if (this.db.projects.length === before) throw new StoreError("Projeto não encontrado.", 404);
    this.db.tasks = this.db.tasks.map((t) => (t.projectId === id ? { ...t, projectId: null } : t));
    this.save();
  }

  // ---------- Tarefas ----------
  listTasks(): Task[] {
    return [...this.db.tasks];
  }
  createTask(input: { title: string; projectId?: string | null; due?: string | null }): Task {
    const title = input.title.trim();
    if (!title) throw new StoreError("A tarefa precisa de um título.");
    if (input.projectId && !this.getProject(input.projectId)) throw new StoreError("Projeto da tarefa não encontrado.", 404);
    const task: Task = {
      id: randomUUID(),
      title,
      projectId: input.projectId ?? null,
      due: input.due ?? null,
      done: false,
      createdAt: new Date().toISOString(),
    };
    this.db.tasks.push(task);
    this.save();
    return task;
  }
  updateTask(id: string, patch: Partial<Pick<Task, "title" | "done" | "due" | "projectId">>): Task {
    const task = this.db.tasks.find((t) => t.id === id);
    if (!task) throw new StoreError("Tarefa não encontrada.", 404);
    Object.assign(task, patch);
    this.save();
    return task;
  }
  deleteTask(id: string) {
    const before = this.db.tasks.length;
    this.db.tasks = this.db.tasks.filter((t) => t.id !== id);
    if (this.db.tasks.length === before) throw new StoreError("Tarefa não encontrada.", 404);
    this.save();
  }

  // ---------- Lembretes ----------
  listReminders(): Reminder[] {
    return [...this.db.reminders];
  }
  createReminder(text: string, at: string): Reminder {
    const t = text.trim();
    if (!t) throw new StoreError("O lembrete precisa de um texto.");
    const when = new Date(at);
    if (Number.isNaN(when.getTime())) throw new StoreError("Data/hora do lembrete inválida.");
    if (when.getTime() < Date.now() - 60_000) throw new StoreError("A data do lembrete já passou.");
    const reminder: Reminder = { id: randomUUID(), text: t, at: when.toISOString(), fired: false, createdAt: new Date().toISOString() };
    this.db.reminders.push(reminder);
    this.save();
    return reminder;
  }
  markReminderFired(id: string) {
    const r = this.db.reminders.find((x) => x.id === id);
    if (!r) throw new StoreError("Lembrete não encontrado.", 404);
    r.fired = true;
    this.save();
    return r;
  }
  deleteReminder(id: string) {
    const before = this.db.reminders.length;
    this.db.reminders = this.db.reminders.filter((r) => r.id !== id);
    if (this.db.reminders.length === before) throw new StoreError("Lembrete não encontrado.", 404);
    this.save();
  }

  /** Apaga todos os dados pessoais (memória, conhecimento, projetos, tarefas, lembretes). */
  wipeAll() {
    const settings = { ...this.db.settings };
    this.db = empty();
    this.db.settings = settings;
    this.index = null;
    this.save();
  }
}

export class StoreError extends Error {
  constructor(message: string, readonly status = 400) {
    super(message);
  }
}
