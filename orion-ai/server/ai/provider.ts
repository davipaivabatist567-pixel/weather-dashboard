// Contrato entre a inteligência central do Orion e um provedor de modelo de linguagem.
// Para trocar de provedor, basta implementar esta interface e registrá-la em index.ts.
import type { ChatAttachment, ChatTurn } from "../../shared/types";

export interface ProviderTool {
  name: string;
  description: string;
  inputSchema: Record<string, unknown>;
}

export interface ToolCallResult {
  content: string;
  isError: boolean;
}

export interface ProviderChatRequest {
  system: string;
  messages: ChatTurn[];
  tools: ProviderTool[];
  /** Habilita pesquisa na internet, se o provedor oferecer. */
  webSearch: boolean;
  signal: AbortSignal;
}

export interface ProviderHandlers {
  onText: (delta: string) => void;
  onToolCall: (call: { id: string; name: string; input: unknown }) => Promise<ToolCallResult>;
  onSearchResults: (sources: { title: string; url: string }[], query?: string) => void;
}

export interface ProviderChatResult {
  stopReason: string | null;
  model: string;
  usage?: { input: number; output: number };
}

export interface AIProvider {
  readonly name: string;
  readonly model: string;
  readonly supportsWebSearch: boolean;
  /** Executa uma conversa com ciclo de ferramentas até a resposta final. */
  chat(req: ProviderChatRequest, handlers: ProviderHandlers): Promise<ProviderChatResult>;
  /** Gera uma saída JSON que obedece ao schema informado (opcionalmente lendo anexos). */
  structured<T>(prompt: string, schema: Record<string, unknown>, opts?: { signal?: AbortSignal; attachments?: ChatAttachment[] }): Promise<T>;
}

export class ProviderError extends Error {
  constructor(message: string, readonly status = 502) {
    super(message);
  }
}
