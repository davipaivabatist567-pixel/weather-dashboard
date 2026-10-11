// Aprendizado do Orion: transforma o que o usuário envia em memória e conhecimento.
// Não altera o modelo de IA; guarda fatos e documentos e os consulta a cada pergunta.
import type { ChatAttachment, ChatTurn, KnowledgeMeta, LearnResult, MemoryCategory, MemoryItem } from "../../shared/types";
import type { Store } from "../storage/store";
import type { AIProvider } from "./provider";

const CATEGORIES: MemoryCategory[] = ["projeto", "preferencia", "meta", "configuracao", "geral", "aprendizado"];

const FACTS_SCHEMA = {
  type: "object",
  properties: {
    aprendizados: {
      type: "array",
      items: {
        type: "object",
        properties: { conteudo: { type: "string" }, categoria: { type: "string", enum: CATEGORIES } },
        required: ["conteudo", "categoria"],
        additionalProperties: false,
      },
    },
  },
  required: ["aprendizados"],
  additionalProperties: false,
};

const DOC_SCHEMA = {
  type: "object",
  properties: { titulo: { type: "string" }, conteudo: { type: "string" } },
  required: ["titulo", "conteudo"],
  additionalProperties: false,
};

const MAX_CONVERSATION_CHARS = 60_000;

/** Lê as conversas e guarda o que o usuário ensinou ou revelou de forma duradoura. */
export interface LearnOptions {
  /** Pedido explícito do usuário: dispensa o aprendizado automático, mas exige a memória ativada. */
  explicit?: boolean;
  signal?: AbortSignal;
}

const allowed = (store: Store, explicit?: boolean) => (explicit ? store.memoryEnabled : store.learningEnabled);

export async function learnFromConversation(provider: AIProvider, store: Store, turns: ChatTurn[], opts: LearnOptions = {}): Promise<LearnResult> {
  const result: LearnResult = { learned: [], knowledge: [], skipped: [] };
  if (!allowed(store, opts.explicit)) return result;
  let transcript = turns
    .filter((t) => t.content.trim())
    .map((t) => `${t.role === "user" ? "USUÁRIO" : "ORION"}: ${t.content.trim()}`)
    .join("\n\n");
  if (!transcript) return result;
  if (transcript.length > MAX_CONVERSATION_CHARS) transcript = transcript.slice(-MAX_CONVERSATION_CHARS);
  const known = store.listMemory().map((m) => `- ${m.content}`).join("\n") || "(nada ainda)";

  const prompt = `Você é o módulo de aprendizado do assistente Orion. Leia a conversa e extraia o que vale lembrar no futuro sobre o USUÁRIO e o que ele ENSINOU.

Guarde (frases curtas, autocontidas, em português, na 3ª pessoa: "O usuário..."):
- fatos sobre a pessoa, preferências, metas, rotina, projetos e decisões;
- informações que o usuário ensinou, corrigiu ou pediu para lembrar (categoria "aprendizado");
- correções que o usuário fez ao Orion.

NÃO guarde: conhecimento geral que o Orion explicou, perguntas sem resposta, coisas passageiras ("está com fome agora"), nem senhas, chaves, documentos de identidade, dados bancários ou de saúde de terceiros.
Não repita o que já é conhecido. Se não houver nada novo, devolva a lista vazia. No máximo 8 itens.

<ja_conhecido>
${known}
</ja_conhecido>

<conversa>
${transcript}
</conversa>`;

  const out = await provider.structured<{ aprendizados: { conteudo: string; categoria: MemoryCategory }[] }>(prompt, FACTS_SCHEMA, { signal: opts.signal });
  const before = new Set(store.listMemory().map((m) => m.id));
  for (const a of out.aprendizados.slice(0, 8)) {
    try {
      const item: MemoryItem = store.addMemory(a.conteudo, CATEGORIES.includes(a.categoria) ? a.categoria : "aprendizado", "automatico");
      if (!before.has(item.id)) {
        result.learned.push(item);
        before.add(item.id);
      }
    } catch (err) {
      result.skipped.push(`${a.conteudo.slice(0, 60)} (${(err as Error).message})`);
    }
  }
  return result;
}

/**
 * Guarda arquivos na base de conhecimento. Texto e código entram direto;
 * imagens e PDFs são lidos pela IA (quando conectada), que transcreve o conteúdo.
 */
export async function learnFromAttachments(provider: AIProvider | null, store: Store, attachments: ChatAttachment[], opts: LearnOptions = {}): Promise<LearnResult> {
  const result: LearnResult = { learned: [], knowledge: [], skipped: [] };
  if (!allowed(store, opts.explicit)) return result;
  for (const a of attachments) {
    try {
      let meta: KnowledgeMeta;
      if (a.kind === "text") {
        meta = store.addKnowledge(a.name, a.data, "arquivo");
      } else if (!provider) {
        result.skipped.push(`${a.name} (ler imagens e PDFs exige a IA conectada)`);
        continue;
      } else {
        const doc = await provider.structured<{ titulo: string; conteudo: string }>(
          `Transcreva para a base de conhecimento do usuário o conteúdo do arquivo "${a.name}". ` +
            (a.kind === "pdf"
              ? "Reproduza o texto do documento de forma fiel e completa, preservando títulos e listas (pode resumir apenas trechos repetitivos)."
              : "Descreva a imagem com precisão e transcreva todo texto visível nela.") +
            " Em português. O título deve identificar o assunto.",
          DOC_SCHEMA,
          { signal: opts.signal, attachments: [a] },
        );
        meta = store.addKnowledge(`${doc.titulo} (${a.name})`, doc.conteudo, "arquivo");
      }
      result.knowledge.push(meta);
    } catch (err) {
      result.skipped.push(`${a.name} (${(err as Error).message})`);
    }
  }
  return result;
}
