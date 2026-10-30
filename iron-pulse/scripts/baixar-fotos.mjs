/**
 * Baixa as fotos do Unsplash listadas em src/data/photos.ts, gera versões WebP otimizadas
 * (640, 1280 e 1920 px) em public/photos/ e passa o site a usar as cópias locais.
 *
 * Uso: npm run fotos
 */
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import sharp from "sharp";

const root = path.resolve(import.meta.dirname, "..");
const base = process.env.FOTOS_BASE ?? "https://unsplash.com"; // trocável para testes
const widths = [640, 1280, 1920];

const source = await readFile(path.join(root, "src/data/photos.ts"), "utf8");
const photos = [...source.matchAll(/^\s+(\w+): \{ id: "([^"]+)"/gm)].map(([, key, id]) => ({ key, id }));
if (!photos.length) throw new Error("Nenhuma foto encontrada em src/data/photos.ts");

const outDir = path.join(root, "public/photos");
await mkdir(outDir, { recursive: true });

const manifestPath = path.join(root, "src/data/local-photos.json");
const manifest = JSON.parse(await readFile(manifestPath, "utf8").catch(() => "{}"));
let failures = 0;

for (const { key, id } of photos) {
  try {
    const res = await fetch(`${base}/photos/${id}/download?w=2400`, { redirect: "follow" });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const original = Buffer.from(await res.arrayBuffer());
    for (const w of widths) {
      await sharp(original)
        .rotate()
        .resize({ width: w, withoutEnlargement: true })
        .webp({ quality: w > 1000 ? 72 : 76 })
        .toFile(path.join(outDir, `${key}-${w}.webp`));
    }
    manifest[key] = true;
    console.log(`✓ ${key} (${id})`);
  } catch (err) {
    failures++;
    console.error(`✗ ${key} (${id}): ${err.message}`);
  }
}

await writeFile(manifestPath, JSON.stringify(manifest, null, 2) + "\n");
console.log(failures ? `\n${failures} foto(s) não baixaram; elas continuam vindo do Unsplash.` : "\nTodas as fotos estão em public/photos.");
process.exitCode = failures ? 1 : 0;
