// Testa o adaptador do Claude contra um servidor local que imita a API de streaming
// da Anthropic (nenhuma chamada real é feita).
import { createServer, type IncomingMessage, type Server } from "node:http";
import type { AddressInfo } from "node:net";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { AnthropicProvider } from "../../server/ai/anthropicProvider";

type Captured = { headers: IncomingMessage["headers"]; body: Record<string, unknown> };
const captured: Captured[] = [];
let responses: string[][] = [];
let server: Server;
let baseURL = "";

const sse = (events: Record<string, unknown>[]) => events.map((e) => `event: ${e.type}\ndata: ${JSON.stringify(e)}\n\n`);
const start = (id: string) => ({ type: "message_start", message: { id, type: "message", role: "assistant", model: "claude-opus-5-5", content: [], stop_reason: null, stop_sequence: null, usage: { input_tokens: 10, output_tokens: 0 } } });

beforeAll(async () => {
  server = createServer((req, res) => {
    let raw = "";
    req.on("data", (c) => (raw += c));
    req.on("end", () => {
      captured.push({ headers: req.headers, body: JSON.parse(raw) });
      res.writeHead(200, { "content-type": "text/event-stream" });
      for (const chunk of responses.shift() ?? []) res.write(chunk);
      res.end();
    });
  });
  await new Promise<void>((r) => server.listen(0, "127.0.0.1", r));
  baseURL = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
});
afterAll(() => server.close());

describe("AnthropicProvider (API simulada)", () => {
  it("faz o ciclo de ferramenta e envia os parâmetros corretos", async () => {
    responses = [
      sse([
        start("msg_1"),
        { type: "content_block_start", index: 0, content_block: { type: "text", text: "" } },
        { type: "content_block_delta", index: 0, delta: { type: "text_delta", text: "Calculando." } },
        { type: "content_block_stop", index: 0 },
        { type: "content_block_start", index: 1, content_block: { type: "tool_use", id: "toolu_1", name: "calcular", input: {} } },
        { type: "content_block_delta", index: 1, delta: { type: "input_json_delta", partial_json: '{"expressao":' } },
        { type: "content_block_delta", index: 1, delta: { type: "input_json_delta", partial_json: '"6*7"}' } },
        { type: "content_block_stop", index: 1 },
        { type: "message_delta", delta: { stop_reason: "tool_use", stop_sequence: null }, usage: { output_tokens: 20 } },
        { type: "message_stop" },
      ]),
      sse([
        start("msg_2"),
        { type: "content_block_start", index: 0, content_block: { type: "text", text: "" } },
        { type: "content_block_delta", index: 0, delta: { type: "text_delta", text: "O resultado é 42." } },
        { type: "content_block_stop", index: 0 },
        { type: "message_delta", delta: { stop_reason: "end_turn", stop_sequence: null }, usage: { output_tokens: 8 } },
        { type: "message_stop" },
      ]),
    ];
    const provider = new AnthropicProvider("sk-test", "claude-opus-5-5", "medium", true, baseURL);

    let text = "";
    const calls: { name: string; input: unknown }[] = [];
    const result = await provider.chat(
      {
        system: "sistema",
        messages: [{ role: "user", content: "quanto é 6*7?", attachments: [{ name: "a.txt", kind: "text", mediaType: "text/plain", data: "conteúdo" }] }],
        tools: [{ name: "calcular", description: "calc", inputSchema: { type: "object", properties: { expressao: { type: "string" } }, required: ["expressao"] } }],
        webSearch: true,
        signal: new AbortController().signal,
      },
      {
        onText: (t) => (text += t),
        onSearchResults: () => {},
        onToolCall: async (c) => {
          calls.push(c);
          return { content: '{"resultado":"42"}', isError: false };
        },
      },
    );

    expect(calls).toEqual([{ id: "toolu_1", name: "calcular", input: { expressao: "6*7" } }]);
    expect(text).toBe("Calculando.\n\nO resultado é 42.");
    expect(result.stopReason).toBe("end_turn");
    expect(result.usage).toEqual({ input: 20, output: 28 });

    const first = captured[0];
    expect(first.headers["x-api-key"]).toBe("sk-test");
    expect(String(first.headers["anthropic-beta"])).toContain("server-side-fallback-2026-07-01");
    expect(first.body.model).toBe("claude-opus-5-5");
    expect(first.body.fallbacks).toBe("default");
    expect(first.body.stream).toBe(true);
    expect(first.body.thinking).toEqual({ type: "adaptive" });
    expect(first.body.output_config).toEqual({ effort: "medium" });
    const tools = first.body.tools as { name: string; type?: string }[];
    expect(tools.map((t) => t.name)).toEqual(["calcular", "web_search"]);
    expect(tools[1].type).toBe("web_search_20260209");
    const userContent = (first.body.messages as { content: { type: string; text?: string }[] }[])[0].content;
    expect(userContent[0].text).toContain('<arquivo nome="a.txt">');

    // Segunda chamada inclui o resultado da ferramenta
    const msgs = captured[1].body.messages as { role: string; content: { type: string; tool_use_id?: string }[] }[];
    expect(msgs).toHaveLength(3);
    expect(msgs[2].content[0]).toMatchObject({ type: "tool_result", tool_use_id: "toolu_1" });
  });

  it("traduz erros de autenticação em mensagens compreensíveis", async () => {
    const errServer = createServer((_req, res) => {
      res.writeHead(401, { "content-type": "application/json" });
      res.end(JSON.stringify({ type: "error", error: { type: "authentication_error", message: "invalid x-api-key" } }));
    });
    await new Promise<void>((r) => errServer.listen(0, "127.0.0.1", r));
    const provider = new AnthropicProvider("sk-bad", "claude-opus-5-5", "medium", false, `http://127.0.0.1:${(errServer.address() as AddressInfo).port}`);
    await expect(
      provider.chat(
        { system: "", messages: [{ role: "user", content: "oi" }], tools: [], webSearch: false, signal: new AbortController().signal },
        { onText: () => {}, onSearchResults: () => {}, onToolCall: async () => ({ content: "", isError: false }) },
      ),
    ).rejects.toThrow(/chave da API/);
    errServer.close();
  });
});
