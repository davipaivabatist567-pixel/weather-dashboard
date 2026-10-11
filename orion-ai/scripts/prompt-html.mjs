// Gera PROMPT-CONTINUACAO.html a partir de PROMPT-CONTINUACAO.md: página única, legível no celular,
// com botão para copiar o prompt inteiro (o texto original em Markdown).
import { readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { micromark } from "micromark";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const md = readFileSync(join(root, "PROMPT-CONTINUACAO.md"), "utf8");
const body = micromark(md); // HTML bruto desativado por padrão: o texto é tratado como texto
const raw = JSON.stringify(md).replace(/</g, "\\u003c");

const html = `<!doctype html>
<html lang="pt-BR">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Prompt do Orion AI</title>
<style>
:root { --bg:#02060d; --panel:#071425; --line:#12324a; --text:#d9f4ff; --muted:#8fb3c4; --cyan:#00e5ff; --soft:#7af3ff; }
* { box-sizing:border-box; }
body { margin:0; background:var(--bg); color:var(--text); font:16px/1.6 system-ui,-apple-system,"Segoe UI",Roboto,sans-serif; }
header { position:sticky; top:0; z-index:2; display:flex; gap:12px; align-items:center; justify-content:space-between; padding:12px 16px; background:rgba(2,6,13,.92); border-bottom:1px solid var(--line); backdrop-filter:blur(6px); }
header b { color:var(--cyan); letter-spacing:.08em; }
button { font:inherit; font-weight:600; color:#001018; background:var(--cyan); border:0; border-radius:10px; padding:10px 16px; cursor:pointer; white-space:nowrap; }
button:active { transform:scale(.97); }
main { max-width:820px; margin:0 auto; padding:8px 16px 48px; }
h1 { color:var(--cyan); font-size:1.5rem; margin:20px 0 8px; }
h2 { color:var(--soft); font-size:1.15rem; margin:28px 0 8px; padding-top:12px; border-top:1px solid var(--line); }
p, li { overflow-wrap:anywhere; }
ul, ol { padding-left:22px; }
li { margin:4px 0; }
strong { color:#fff; }
code { font-family:ui-monospace,Menlo,Consolas,monospace; font-size:.9em; background:var(--panel); border:1px solid var(--line); border-radius:6px; padding:1px 5px; }
pre { background:var(--panel); border:1px solid var(--line); border-radius:10px; padding:12px; overflow-x:auto; }
pre code { border:0; padding:0; background:none; }
.ok { color:var(--soft); font-size:.9rem; min-height:1.2em; }
</style>
</head>
<body>
<header><b>ORION AI · PROMPT</b><button id="copy">Copiar prompt</button></header>
<main>
<p class="ok" id="status" role="status"></p>
${body}
</main>
<script>
const PROMPT = ${raw};
const status = document.getElementById("status");
document.getElementById("copy").addEventListener("click", async () => {
  try {
    await navigator.clipboard.writeText(PROMPT);
  } catch {
    // Arquivo aberto sem permissão de área de transferência: copia por um campo temporário.
    const t = document.createElement("textarea");
    t.value = PROMPT;
    document.body.appendChild(t);
    t.select();
    document.execCommand("copy");
    t.remove();
  }
  status.textContent = "✓ Prompt copiado. Cole no começo da outra conversa.";
});
</script>
</body>
</html>
`;
writeFileSync(join(root, "PROMPT-CONTINUACAO.html"), html);
console.log("[orion] PROMPT-CONTINUACAO.html pronto");
