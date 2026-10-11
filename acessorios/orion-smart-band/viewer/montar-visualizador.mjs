// Monta ../ORION_Visualizador_3D.html: um único arquivo com o three.js, o visualizador e as malhas
// do CAD (pecas.json, gerado por cad/gerar.py). Funciona offline, aberto direto no navegador.
// Uso: npm install && npm run build
import { build } from "esbuild";
import { readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const aqui = dirname(fileURLToPath(import.meta.url));
const js = await build({ entryPoints: [join(aqui, "visualizador.js")], bundle: true, minify: true, format: "iife", write: false });
const dados = readFileSync(join(aqui, "pecas.json"), "utf8");
const codigo = js.outputFiles[0].text.replace(/<\/script/gi, "<\\/script");

const html = `<!doctype html>
<html lang="pt-BR">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>ORION Smart Band 3D</title>
<style>
:root { --bg:#02060d; --painel:rgba(7,20,37,.88); --linha:#12324a; --texto:#d9f4ff; --muted:#8fb3c4; --ciano:#00e5ff; }
* { box-sizing:border-box; }
html, body { margin:0; height:100%; background:var(--bg); color:var(--texto); font:14px/1.45 system-ui,-apple-system,"Segoe UI",Roboto,sans-serif; }
#cena { position:fixed; inset:0; }
#cena canvas { display:block; touch-action:none; }
#ui { position:fixed; left:12px; right:12px; bottom:12px; max-width:420px; background:var(--painel); border:1px solid var(--linha); border-radius:14px; padding:12px 14px; backdrop-filter:blur(6px); }
#ui h1 { margin:0 0 2px; font-size:15px; letter-spacing:.08em; color:var(--ciano); }
#medidas { color:var(--muted); font-size:12px; margin-bottom:8px; }
.linha { display:flex; flex-wrap:wrap; gap:6px; margin:8px 0; align-items:center; }
button { font:inherit; color:var(--texto); background:#0b2235; border:1px solid var(--linha); border-radius:8px; padding:6px 10px; cursor:pointer; }
button:active { transform:scale(.97); }
input[type=range] { flex:1; accent-color:var(--ciano); }
details summary { cursor:pointer; color:var(--muted); }
#lista label { display:flex; gap:6px; align-items:center; font-size:13px; padding:2px 0; }
.cor { width:12px; height:12px; border-radius:3px; border:1px solid #39505c; display:inline-block; }
.aviso { color:var(--muted); font-size:12px; margin-top:6px; }
#rotulos { position:fixed; inset:0; pointer-events:none; }
.rotulo { position:absolute; transform:translate(-50%,-140%); white-space:nowrap; font-size:12px; color:var(--texto); background:rgba(2,6,13,.8); border:1px solid #1d5a6b; border-radius:6px; padding:2px 6px; }
@media (min-width:800px) { #ui { left:auto; right:16px; top:16px; bottom:auto; } }
</style>
</head>
<body>
<div id="cena"></div>
<div id="rotulos"></div>
<div id="ui">
  <h1>ORION SMART BAND · v0.1</h1>
  <div id="medidas"></div>
  <div class="linha">
    <button data-vista="iso">3D</button><button data-vista="frente">Tela</button><button data-vista="tras">Traseira</button>
    <button data-vista="lado">Botão</button><button data-vista="usb">USB-C</button>
  </div>
  <div class="linha"><span>Explodir</span><input id="explodir" type="range" min="0" max="1" step="0.01" value="0"></div>
  <label class="linha" style="flex-wrap:nowrap"><input id="refs" type="checkbox"><span>Mostrar componentes eletrônicos (laranja, medidas aproximadas)</span></label>
  <details><summary>Peças</summary><div id="lista"></div></details>
  <div class="aviso">Protótipo digital: verificado no computador, ainda não impresso nem testado.</div>
</div>
<script>window.ORION_PECAS = ${dados};</script>
<script>${codigo}</script>
</body>
</html>
`;
writeFileSync(join(aqui, "..", "ORION_Visualizador_3D.html"), html);
console.log(`[orion] ORION_Visualizador_3D.html (${(html.length / 1024).toFixed(0)} KB)`);
