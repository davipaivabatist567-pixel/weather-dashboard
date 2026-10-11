// Tipos compartilhados entre o frontend e o backend do Orion.

export type OrionMode =
  | "assistente"
  | "engenheiro"
  | "estudos"
  | "criativo"
  | "produtividade"
  | "laboratorio"
  | "pesquisa";

export const MODES: { id: OrionMode; label: string; description: string }[] = [
  { id: "assistente", label: "Assistente", description: "Perguntas gerais e tarefas cotidianas" },
  { id: "engenheiro", label: "Engenheiro", description: "Programação, tecnologia e desenvolvimento" },
  { id: "estudos", label: "Estudos", description: "Aprendizagem, exercícios e explicações" },
  { id: "criativo", label: "Criativo", description: "Ideias, jogos, histórias e projetos" },
  { id: "produtividade", label: "Produtividade", description: "Tarefas, planejamento e organização" },
  { id: "laboratorio", label: "Laboratório", description: "Câmera, gestos, rastreamento e diagnóstico" },
  { id: "pesquisa", label: "Pesquisa", description: "Pesquisa na internet e análise de fontes" },
];

/** Níveis de risco das operações (seção 17 do projeto). */
export type RiskLevel = "baixo" | "autorizacao" | "confirmacao";

/** Anexo enviado pelo usuário junto com uma mensagem. */
export interface ChatAttachment {
  name: string;
  kind: "image" | "pdf" | "text";
  mediaType: string;
  /** base64 para image/pdf, texto puro para text */
  data: string;
}

export interface ChatTurn {
  role: "user" | "assistant";
  content: string;
  attachments?: ChatAttachment[];
}

export interface Permissions {
  /** Orion pode ler a memória persistente e incluí-la no contexto. */
  readMemory: boolean;
  /** Orion pode salvar memórias por conta própria (quando o usuário pedir). */
  writeMemory: boolean;
  /** Orion pode ler/criar projetos e tarefas. */
  manageProjects: boolean;
  /** Orion pode pesquisar na internet. */
  webSearch: boolean;
}

export interface ChatRequest {
  mode: OrionMode;
  messages: ChatTurn[];
  permissions: Permissions;
  /** Contexto opcional do cliente (ex.: estado da visão computacional). */
  clientContext?: string;
}

/** Eventos enviados pelo backend via Server-Sent Events durante uma resposta. */
export type ChatEvent =
  | { type: "text"; text: string }
  | { type: "tool_start"; id: string; name: string; label: string; risk: RiskLevel }
  | { type: "tool_result"; id: string; name: string; ok: boolean; summary: string }
  | { type: "search_results"; query?: string; sources: { title: string; url: string }[] }
  | { type: "pending_action"; action: PendingAction }
  | { type: "error"; message: string }
  | { type: "done"; stopReason: string | null; model: string; usage?: { input: number; output: number } };

/** Ação que exige confirmação final do usuário antes de ser executada. */
export interface PendingAction {
  id: string;
  tool: string;
  description: string;
  createdAt: string;
}

export type MemoryCategory = "projeto" | "preferencia" | "meta" | "configuracao" | "geral" | "aprendizado";

export interface MemoryItem {
  id: string;
  content: string;
  category: MemoryCategory;
  /** "automatico" quando o Orion aprendeu sozinho a partir de uma conversa. */
  origin?: "usuario" | "automatico";
  createdAt: string;
  updatedAt: string;
}

/** Documento da base de conhecimento (textos e arquivos que o usuário ensinou). */
export interface KnowledgeDoc {
  id: string;
  title: string;
  source: "arquivo" | "texto" | "conversa";
  content: string;
  chars: number;
  createdAt: string;
}
export type KnowledgeMeta = Omit<KnowledgeDoc, "content"> & { preview: string };

/** Resultado do aprendizado automático após uma conversa ou arquivo. */
export interface LearnResult {
  learned: MemoryItem[];
  knowledge: KnowledgeMeta[];
  skipped: string[];
}

export type ProjectStatus = "planejado" | "em_andamento" | "pausado" | "concluido";

export interface ProjectStep {
  id: string;
  title: string;
  done: boolean;
}

export interface Project {
  id: string;
  name: string;
  description: string;
  objective: string;
  status: ProjectStatus;
  deadline: string | null;
  steps: ProjectStep[];
  notes: string;
  files: string[];
  createdAt: string;
  updatedAt: string;
}

export interface Task {
  id: string;
  title: string;
  projectId: string | null;
  due: string | null;
  done: boolean;
  createdAt: string;
}

export interface Reminder {
  id: string;
  text: string;
  /** ISO datetime */
  at: string;
  fired: boolean;
  createdAt: string;
}

export interface ServerStatus {
  ai: {
    configured: boolean;
    provider: string;
    model: string | null;
    webSearch: boolean;
  };
  storage: { ok: boolean; path: string };
  memoryEnabled: boolean;
  learningEnabled: boolean;
  knowledge: { docs: number; chars: number };
  version: string;
}
