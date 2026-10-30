/**
 * Gera a versão HTML PURA do site: um arquivo só, sem React nem Next.js no navegador.
 * Usa o HTML e o CSS que o `next build` já gerou (mesmo visual) e troca o JavaScript do React
 * pelas interações de scripts/html-puro/app.js. Fontes, ícone e fotos locais vão embutidos.
 *
 * Uso: npm run build && npm run html   →   aurora-travel.html
 */
import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { site } from "../src/config/site.ts";
import { destinations } from "../src/data/destinations.ts";
import { experiences } from "../src/data/experiences.ts";

const root = path.resolve(import.meta.dirname, "..");
const out = path.join(root, "out");
const types = { ".woff2": "font/woff2", ".webp": "image/webp", ".svg": "image/svg+xml" };
const clean = (url) => url.split(/[?#]/)[0];
const dataUri = async (url) =>
  `data:${types[path.extname(clean(url))]};base64,${(await readFile(path.join(out, clean(url)))).toString("base64")}`;

async function replaceAsync(str, re, fn) {
  const parts = [];
  let last = 0;
  for (const m of str.matchAll(re)) {
    parts.push(str.slice(last, m.index), await fn(...m));
    last = m.index + m[0].length;
  }
  return parts.join("") + str.slice(last);
}

let html = await readFile(path.join(out, "index.html"), "utf8");

// 1) tira o React/Next: scripts externos, dados internos e pré-carregamentos
// (fica só o script curto do <head> que liga as animações de entrada)
const keepScript = "<script>document.documentElement.classList.add('js')</script>";
html = html.replace(/<script\b[^>]*>[\s\S]*?<\/script>/g, (tag) => (tag === keepScript ? tag : ""));
html = html.replace(/<link rel="preload"[^>]*>/g, "");
html = html.replace(/<div hidden=""><!--\$--><!--\/\$--><\/div>/g, "").replace(/<!--\/?\$-->/g, "");

// 2) CSS embutido, com as fontes dentro
html = await replaceAsync(html, /<link rel="stylesheet" href="([^"]+)"[^>]*>/g, async (_, href) => {
  let css = await readFile(path.join(out, clean(href)), "utf8");
  const dir = path.posix.dirname(clean(href));
  css = await replaceAsync(css, /url\(([^)"']+\.woff2)\)/g, async (__, u) => `url(${await dataUri(path.posix.resolve(dir, u))})`);
  return `<style>${css}</style>`;
});
html = await replaceAsync(html, /href="(\/icon\.svg[^"]*)"/g, async (_, u) => `href="${await dataUri(u)}"`);

// 3) fotos baixadas com `npm run fotos` (public/photos): entra a versão de 1280 px
html = await replaceAsync(html, /\s(?:srcSet|imageSrcSet)="[^"]*\/photos\/[^"]*"/g, async () => "");
html = await replaceAsync(html, /\/photos\/([a-z0-9-]+?)-\d+\.webp/g, async (_, key) => dataUri(`/photos/${key}-1280.webp`));

// 4) ícones usados pelas janelas (Lucide, licença ISC)
async function icon(name) {
  const src = await readFile(path.join(root, `node_modules/lucide-react/dist/esm/icons/${name}.mjs`), "utf8");
  const nodes = Function(`return ${src.match(/node: (\[[\s\S]*?\n {2}\])/)[1]}`)();
  const body = nodes
    .map(([tag, attrs]) => `<${tag} ${Object.entries(attrs).filter(([k]) => k !== "key").map(([k, v]) => `${k}="${v}"`).join(" ")}/>`)
    .join("");
  return `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round">${body}</svg>`;
}
const iconNames = ["x", "menu", "arrow-right", "arrow-up-right", "map-pin", "calendar-days", "heart", "clock-3", "circle-alert"];
const icons = Object.fromEntries(await Promise.all(iconNames.map(async (n) => [n, await icon(n)])));

// 5) interações em JavaScript puro
const data = {
  site: { name: site.name, whatsapp: site.whatsapp.number, isDemo: site.isDemo },
  destinos: destinations,
  experiencias: experiences.map((e) => ({ tripType: e.tripType })),
};
const app = await readFile(path.join(import.meta.dirname, "html-puro/app.js"), "utf8");
const script = `<script>const DADOS=${JSON.stringify(data)};const ICONES=${JSON.stringify(icons)};\n${app}</script>`;
html = html.replace("</body>", () => `${script}</body>`); // função: o código tem "$$", que o replace trataria como padrão

const leftovers = [...html.matchAll(/["(](\/(?:_next|photos)\/[^"')]+)/g)].map((m) => m[1]);
if (leftovers.length) throw new Error(`Ainda há arquivos externos: ${leftovers.slice(0, 3).join(", ")}`);

const dest = path.join(root, "aurora-travel.html");
await writeFile(dest, html);
console.log(`aurora-travel.html  ${(Buffer.byteLength(html) / 1024).toFixed(0)} KB`);
