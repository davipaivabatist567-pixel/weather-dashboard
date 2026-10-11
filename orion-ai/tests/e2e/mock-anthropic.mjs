// Servidor que imita a API de streaming da Anthropic para os testes de ponta a ponta.
// Pedidos sobre "projeto" geram uma chamada à ferramenta projeto_criar; os demais, texto.
import { createServer } from "node:http";

const port = Number(process.env.MOCK_PORT ?? 8790);
const ev = (e) => `event: ${e.type}\ndata: ${JSON.stringify(e)}\n\n`;
const start = (id) => ({ type: "message_start", message: { id, type: "message", role: "assistant", model: "claude-opus-5-5", content: [], stop_reason: null, stop_sequence: null, usage: { input_tokens: 5, output_tokens: 0 } } });
const text = (i, t) => [
  { type: "content_block_start", index: i, content_block: { type: "text", text: "" } },
  ...t.match(/.{1,12}/gs).map((chunk) => ({ type: "content_block_delta", index: i, delta: { type: "text_delta", text: chunk } })),
  { type: "content_block_stop", index: i },
];
const end = (reason) => [{ type: "message_delta", delta: { stop_reason: reason, stop_sequence: null }, usage: { output_tokens: 10 } }, { type: "message_stop" }];

createServer((req, res) => {
  let raw = "";
  req.on("data", (c) => (raw += c));
  req.on("end", () => {
    const body = JSON.parse(raw || "{}");
    const last = body.messages?.at(-1);
    const lastText = typeof last?.content === "string" ? last.content : (last?.content ?? []).map((b) => b.text ?? "").join(" ");
    const isToolResult = Array.isArray(last?.content) && last.content.some((b) => b.type === "tool_result");
    let events;
    if (!isToolResult && /projeto/i.test(lastText) && body.tools?.some((t) => t.name === "projeto_criar")) {
      events = [
        start("msg_tool"),
        ...text(0, "Vou registrar o projeto."),
        { type: "content_block_start", index: 1, content_block: { type: "tool_use", id: "toolu_e2e", name: "projeto_criar", input: {} } },
        { type: "content_block_delta", index: 1, delta: { type: "input_json_delta", partial_json: '{"nome":"Robô explorador","etapas":["Definir sensores","Montar chassi"]}' } },
        { type: "content_block_stop", index: 1 },
        ...end("tool_use"),
      ];
    } else if (isToolResult) {
      events = [start("msg_after"), ...text(0, "Projeto **Robô explorador** criado com 2 etapas."), ...end("end_turn")];
    } else {
      events = [start("msg_text"), ...text(0, "Olá! Sou o **Orion** (resposta simulada).\n\n- item 1\n- item 2\n\n```js\nconsole.log('orion')\n```"), ...end("end_turn")];
    }
    res.writeHead(200, { "content-type": "text/event-stream" });
    for (const e of events) res.write(ev(e));
    res.end();
  });
}).listen(port, "127.0.0.1", () => console.log(`mock anthropic em ${port}`));
