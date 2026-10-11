// Armazenamento persistente de memória, projetos, tarefas, lembretes e configurações.
// Independente de plataforma: a gravação fica a cargo de um adaptador de persistência
// (arquivo JSON no servidor Node, localStorage na versão HTML).
import type { MemoryItem, Project, Reminder, Task } from "../../shared/types";
import { uid as randomUUID } from "../../shared/uid";

export interface Persistence {
  /** Descrição de onde os dados ficam (exibida no diagnóstico). */
  label: string;
  load(): unknown | null;
  save(json: string): void;
}

export interface DbShape {
  version: 1;
  settings: { memoryEnabled: boolean };
  memory: MemoryItem[];
  projects: Project[];
  tasks: Task[];
  reminders: Reminder[];
}

const empty = (): DbShape => ({
  version: 1,
  settings: { memoryEnabled: true },
  memory: [],
  projects: [],
  tasks: [],
  reminders: [],
});

/** Padrões que parecem credenciais — nunca devem ir para a memória. */
const SECRET_PATTERNS = [
  /sk-[a-z0-9_-]{16,}/i,
  /\b(senha|password|passwd|api[_ -]?key|token|segredo|secret)\b\s*[:=]/i,
  /-----BEGIN [A-Z ]*PRIVATE KEY-----/,
  /\b\d{4}[ -]?\d{4}[ -]?\d{4}[ -]?\d{4}\b/, // número de cartão
];

export function looksSensitive(text: string): boolean {
  return SECRET_PATTERNS.some((re) => re.test(text));
}

export class Store {
  private db: DbShape;

  constructor(readonly persistence: Persistence) {
    this.db = this.load();
  }

  get path() {
    return this.persistence.label;
  }

  private load(): DbShape {
    const parsed = this.persistence.load() as Partial<DbShape> | null;
    if (!parsed || typeof parsed !== "object") return empty();
    return { ...empty(), ...parsed, settings: { ...empty().settings, ...parsed.settings } } as DbShape;
  }

  private save() {
    this.persistence.save(JSON.stringify(this.db, null, 2));
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

  // ---------- Memória ----------
  listMemory(): MemoryItem[] {
    return [...this.db.memory];
  }
  addMemory(content: string, category: MemoryItem["category"] = "geral"): MemoryItem {
    if (!this.db.settings.memoryEnabled) throw new StoreError("A memória persistente está desativada.");
    const text = content.trim();
    if (!text) throw new StoreError("Memória vazia.");
    if (text.length > 2000) throw new StoreError("Memória muito longa (máx. 2000 caracteres).");
    if (looksSensitive(text)) throw new StoreError("Por segurança, o Orion não armazena senhas, chaves ou dados de cartão.");
    const now = new Date().toISOString();
    const item: MemoryItem = { id: randomUUID(), content: text, category, createdAt: now, updatedAt: now };
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

  /** Apaga todos os dados pessoais (memória, projetos, tarefas, lembretes). */
  wipeAll() {
    const memoryEnabled = this.db.settings.memoryEnabled;
    this.db = empty();
    this.db.settings.memoryEnabled = memoryEnabled;
    this.save();
  }
}

export class StoreError extends Error {
  constructor(message: string, readonly status = 400) {
    super(message);
  }
}
