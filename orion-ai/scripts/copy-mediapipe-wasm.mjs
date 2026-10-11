// Copia os arquivos WASM do MediaPipe para public/ para que a visão computacional
// funcione sem depender de uma CDN externa.
import { cpSync, existsSync, mkdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const src = join(root, "node_modules", "@mediapipe", "tasks-vision", "wasm");
const dest = join(root, "public", "mediapipe", "wasm");

if (!existsSync(src)) {
  console.warn("[orion] @mediapipe/tasks-vision não instalado; WASM não copiado.");
  process.exit(0);
}
mkdirSync(dest, { recursive: true });
cpSync(src, dest, { recursive: true });
console.log("[orion] WASM do MediaPipe copiado para public/mediapipe/wasm");
