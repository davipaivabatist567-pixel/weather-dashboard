// Provedor Anthropic (Claude) para a inteligência central do Orion.
// A chave da API fica somente no backend (variável de ambiente ANTHROPIC_API_KEY).
import Anthropic from "@anthropic-ai/sdk";
import type { ChatTurn } from "../../shared/types";
import {
  ProviderError,
  type AIProvider,
  type ProviderChatRequest,
  type ProviderChatResult,
  type ProviderHandlers,
} from "./provider";

type Effort = "low" | "medium" | "high" | "xhigh" | "max";
const MAX_TOOL_ROUNDS = 10;

export class AnthropicProvider implements AIProvider {
  readonly name = "Anthropic Claude";
  readonly supportsWebSearch: boolean;
  private client: Anthropic;

  constructor(
    apiKey: string,
    readonly model: string,
    private effort: Effort,
    webSearch: boolean,
    opts: {
      /** Outro endpoint compatível (usado nos testes). */
      baseURL?: string;
      /** Versão HTML: a chamada parte do navegador com a chave do próprio usuário. */
      browser?: boolean;
    } = {},
  ) {
    this.client = new Anthropic({
      apiKey,
      ...(opts.baseURL ? { baseURL: opts.baseURL } : {}),
      ...(opts.browser ? { dangerouslyAllowBrowser: true } : {}),
    });
    this.supportsWebSearch = webSearch;
  }

  async chat(req: ProviderChatRequest, h: ProviderHandlers): Promise<ProviderChatResult> {
    const messages: Anthropic.Beta.BetaMessageParam[] = req.messages.map(toMessageParam);
    const tools: Anthropic.Beta.BetaToolUnion[] = req.tools.map((t) => ({
      name: t.name,
      description: t.description,
      input_schema: t.inputSchema as Anthropic.Beta.BetaTool.InputSchema,
      eager_input_streaming: true,
    }));
    if (req.webSearch && this.supportsWebSearch) {
      tools.push({ type: "web_search_20260209", name: "web_search", max_uses: 5 });
    }

    let usageIn = 0;
    let usageOut = 0;
    let lastStop: string | null = null;
    let emittedText = false;
    let jsonRetries = 0;

    for (let round = 0; round < MAX_TOOL_ROUNDS; round++) {
      const stream = this.client.beta.messages.stream(
        {
          model: this.model,
          max_tokens: 32000,
          system: [{ type: "text", text: req.system, cache_control: { type: "ephemeral" } }],
          messages,
          tools,
          thinking: { type: "adaptive" },
          output_config: { effort: this.effort },
          betas: ["server-side-fallback-2026-07-01"],
          fallbacks: "default",
        },
        { signal: req.signal },
      );

      let roundHasText = false;
      stream.on("text", (delta) => {
        if (!roundHasText && emittedText) h.onText("\n\n");
        roundHasText = true;
        emittedText = true;
        h.onText(delta);
      });

      let message: Anthropic.Beta.BetaMessage;
      try {
        message = await stream.finalMessage();
        jsonRetries = 0;
      } catch (err) {
        // Entrada de ferramenta com JSON ilegível: repete a rodada (no máximo 2 vezes).
        if (!(err instanceof Anthropic.APIError) && !req.signal.aborted && err instanceof SyntaxError && jsonRetries++ < 2) {
          round--;
          continue;
        }
        throw mapError(err);
      }

      usageIn += message.usage.input_tokens;
      usageOut += message.usage.output_tokens;
      lastStop = message.stop_reason;

      // Fontes reais da pesquisa na internet, para exibir na interface.
      for (const block of message.content) {
        if (block.type === "web_search_tool_result" && Array.isArray(block.content)) {
          h.onSearchResults(block.content.map((r) => ({ title: r.title, url: r.url })));
        }
      }

      if (message.stop_reason === "refusal") {
        h.onText((emittedText ? "\n\n" : "") + "_Não posso ajudar com esse pedido._");
        break;
      }
      if (message.stop_reason === "pause_turn") {
        messages.push({ role: "assistant", content: message.content });
        continue;
      }
      const toolUses = message.content.filter((b): b is Anthropic.Beta.BetaToolUseBlock => b.type === "tool_use");
      if (toolUses.length === 0) break;
      if (message.stop_reason === "max_tokens") {
        throw new ProviderError("A resposta foi interrompida pelo limite de tamanho antes de concluir a ferramenta.");
      }

      messages.push({ role: "assistant", content: message.content });
      const results = await Promise.all(
        toolUses.map(async (tu): Promise<Anthropic.Beta.BetaToolResultBlockParam> => {
          const r = await h.onToolCall({ id: tu.id, name: tu.name, input: tu.input });
          return { type: "tool_result", tool_use_id: tu.id, content: r.content, is_error: r.isError };
        }),
      );
      messages.push({ role: "user", content: results });
      if (round === MAX_TOOL_ROUNDS - 1) {
        h.onText("\n\n_Limite de etapas com ferramentas atingido nesta resposta._");
      }
    }

    return { stopReason: lastStop, model: this.model, usage: { input: usageIn, output: usageOut } };
  }

  async structured<T>(prompt: string, schema: Record<string, unknown>, signal?: AbortSignal): Promise<T> {
    try {
      const response = await this.client.messages.create(
        {
          model: this.model,
          max_tokens: 16000,
          output_config: { effort: "low", format: { type: "json_schema", schema } },
          messages: [{ role: "user", content: prompt }],
        },
        { signal },
      );
      if (response.stop_reason === "refusal") throw new ProviderError("O modelo recusou o pedido.", 422);
      const text = response.content.flatMap((b) => (b.type === "text" ? [b.text] : [])).join("");
      return JSON.parse(text) as T;
    } catch (err) {
      throw mapError(err);
    }
  }
}

function toMessageParam(turn: ChatTurn): Anthropic.Beta.BetaMessageParam {
  if (turn.role === "assistant" || !turn.attachments?.length) {
    return { role: turn.role, content: turn.content || "(vazio)" };
  }
  const blocks: Anthropic.Beta.BetaContentBlockParam[] = [];
  for (const a of turn.attachments) {
    if (a.kind === "image") {
      blocks.push({
        type: "image",
        source: { type: "base64", media_type: a.mediaType as "image/png", data: a.data },
      });
    } else if (a.kind === "pdf") {
      blocks.push({
        type: "document",
        source: { type: "base64", media_type: "application/pdf", data: a.data },
        title: a.name,
      });
    } else {
      blocks.push({
        type: "text",
        text: `<arquivo nome="${a.name.replace(/"/g, "'")}">\n${a.data}\n</arquivo>`,
      });
    }
  }
  blocks.push({ type: "text", text: turn.content || "Analise o(s) arquivo(s) anexado(s)." });
  return { role: "user", content: blocks };
}

function mapError(err: unknown): Error {
  if (err instanceof ProviderError) return err;
  if (err instanceof Anthropic.APIUserAbortError) return new ProviderError("Resposta interrompida.", 499);
  if (err instanceof Anthropic.AuthenticationError)
    return new ProviderError("A chave da API da Anthropic é inválida. Verifique ANTHROPIC_API_KEY no arquivo .env.", 401);
  if (err instanceof Anthropic.PermissionDeniedError)
    return new ProviderError("A chave da API não tem permissão para este modelo ou recurso.", 403);
  if (err instanceof Anthropic.NotFoundError)
    return new ProviderError("Modelo não encontrado. Verifique ORION_MODEL no arquivo .env.", 404);
  if (err instanceof Anthropic.RateLimitError)
    return new ProviderError("Limite de uso da API atingido. Aguarde alguns instantes e tente novamente.", 429);
  if (err instanceof Anthropic.BadRequestError) return new ProviderError(`Pedido rejeitado pela API: ${err.message}`, 400);
  if (err instanceof Anthropic.APIConnectionError)
    return new ProviderError("Não foi possível conectar à API da Anthropic. Verifique a internet do servidor.", 503);
  if (err instanceof Anthropic.APIError) return new ProviderError(`Erro da API da Anthropic (${err.status}): ${err.message}`, 502);
  return new ProviderError(err instanceof Error ? err.message : String(err), 500);
}
