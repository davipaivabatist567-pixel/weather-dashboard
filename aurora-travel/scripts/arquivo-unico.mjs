/**
 * Junta o site exportado (out/) em UM arquivo HTML: CSS, JavaScript, fontes e fotos locais
 * ficam dentro dele. Serve para mandar por WhatsApp ou abrir direto no celular.
 * Fotos que ainda vêm do Unsplash continuam precisando de internet.
 *
 * Uso: npm run build && npm run arquivo-unico   →   aurora-travel.html
 */
import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";

const root = path.resolve(import.meta.dirname, "..");
const out = path.join(root, "out");
const types = {
  ".css": "text/css",
  ".woff2": "font/woff2",
  ".webp": "image/webp",
  ".svg": "image/svg+xml",
  ".png": "image/png",
  ".jpg": "image/jpeg",
};

const clean = (url) => url.split(/[?#]/)[0];
const file = (url) => path.join(out, decodeURIComponent(clean(url)));
const toDataUri = (buf, url) =>
  `data:${types[path.extname(clean(url))] ?? "application/octet-stream"};base64,${Buffer.from(buf).toString("base64")}`;
const dataUri = async (url) => toDataUri(await readFile(file(url)), url);

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
const inlinedChunks = [...html.matchAll(/<script src="([^"]+)"/g)].map((m) => clean(m[1]));

// 1) scripts: entram inteiros, na mesma ordem.
//    O Turbopack reconhece cada pedaço de código pelo `src` do <script>; embutido, ele não tem `src`,
//    então cada pedaço passa a se apresentar pelo próprio caminho (ex.: "static/chunks/abc.js").
html = await replaceAsync(html, /<script src="([^"]+)"([^>]*)><\/script>/g, async (_, src, attrs) => {
  const chunkName = clean(src).replace(/^\/_next\//, "");
  const code = (await readFile(file(src), "utf8"))
    .replaceAll('"object"==typeof document?document.currentScript:void 0', JSON.stringify(chunkName))
    // o Next descobre o prefixo dos arquivos pelo `src` do script atual; sem `src`, o prefixo é vazio
    .replaceAll("new URL(e.src)", 'new URL(e.src||"http://arquivo-unico/_next/")')
    .replace(/<\/script/gi, "<\\/script");
  const keep = attrs.replace(/\s(async|defer|src)(="[^"]*")?/g, "");
  return `<script${keep}>${code}</script>`;
});
html = html.replace(/<link rel="preload"[^>]*>/g, "");

// 2) todo arquivo de /_next/ e o ícone que ainda forem citados (no HTML e nos dados internos do React)
//    viram data: URIs. O React recria <link>/<script> a partir desses dados; assim nada vai para a rede.
const urls = new Set([...html.matchAll(/\/(?:_next\/static\/[^"'\\\s)]+|icon\.svg[^"'\\\s)]*)/g)].map((m) => m[0]));
const replacements = new Map();
for (const url of urls) {
  const ext = path.extname(clean(url));
  if (ext === ".js") {
    continue; // o código já está embutido; ver a proteção abaixo
  } else if (ext === ".css") {
    let css = await readFile(file(url), "utf8");
    const cssDir = path.posix.dirname(clean(url)); // fontes citadas como ../media/fonte.woff2
    css = await replaceAsync(css, /url\(([^)"']+\.woff2)\)/g, async (__, u) => `url(${await dataUri(path.posix.resolve(cssDir, u))})`);
    replacements.set(url, toDataUri(css, url));
  } else {
    replacements.set(url, await dataUri(url));
  }
}
for (const [url, value] of [...replacements].sort((a, b) => b[0].length - a[0].length)) {
  html = html.split(url).join(value);
}

// 3) o React e o Turbopack ainda pedem os scripts pelo caminho original. Como o código já está
//    embutido, esses pedidos recebem um script vazio em vez de ir para a rede.
const guard = `<script>(function(){var done=new Set(${JSON.stringify(inlinedChunks)});function fix(n){if(n&&n.tagName==="SCRIPT"){var s=n.getAttribute("src");if(s&&done.has(s.split(/[?#]/)[0]))n.setAttribute("src","data:text/javascript,")}return n}var a=Node.prototype.appendChild,b=Node.prototype.insertBefore;Node.prototype.appendChild=function(n){return a.call(this,fix(n))};Node.prototype.insertBefore=function(n,r){return b.call(this,fix(n),r)}})()</script>`;
html = html.replace(/<head>/, `<head>${guard}`);

// 4) fotos baixadas para public/photos: entra uma versão (1280 px) de cada uma.
//    As que já vêm no HTML recebem a foto direto; as que o React cria depois (ex.: na janela do destino)
//    passam pelo mapa __AURORA_PHOTOS__, aplicado sempre que um atributo citar /photos/.
const usedPhotos = new Set([...html.matchAll(/\/photos\/([a-z0-9-]+?)-\d+\.webp/g)].map((m) => m[1]));
const localPhotos = JSON.parse(await readFile(path.join(root, "src/data/local-photos.json"), "utf8"));
const photoData = {};
for (const key of Object.keys(localPhotos)) photoData[key] = await dataUri(`/photos/${key}-1280.webp`);
if (Object.keys(photoData).length) {
  html = html.replace(/\s(?:srcSet|srcset|imageSrcSet)="[^"]*\/photos\/[^"]*"/g, "");
  html = html.replace(/\/photos\/([a-z0-9-]+?)-\d+\.webp/g, (m, key) => photoData[key] ?? m);
  const photoGuard = `<script>window.__AURORA_PHOTOS__=${JSON.stringify(photoData)};(function(){var set=Element.prototype.setAttribute;Element.prototype.setAttribute=function(n,v){if(typeof v==="string"&&v.indexOf("/photos/")>-1)v=v.replace(/\\/photos\\/([a-z0-9-]+?)-\\d+\\.webp/g,function(m,k){return window.__AURORA_PHOTOS__[k]||m});return set.call(this,n,v)}})()</script>`;
  html = html.replace(/<head>/, `<head>${photoGuard}`);
}
console.log(`fotos embutidas: ${Object.keys(photoData).length} (citadas na página: ${usedPhotos.size})`);

const leftovers = [...html.matchAll(/["(](\/(?:_next|photos)\/[^"')\\]+)/g)]
  .map((m) => m[1])
  .filter((u) => !inlinedChunks.includes(clean(u)));
if (leftovers.length) console.warn("Atenção, ainda há arquivos externos:", leftovers.slice(0, 5));

const dest = path.join(root, "aurora-travel.html");
await writeFile(dest, html);
console.log(`aurora-travel.html  ${(Buffer.byteLength(html) / 1024).toFixed(0)} KB`);
