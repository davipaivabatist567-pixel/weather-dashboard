// Baixa os modelos do MediaPipe para public/models (opcional).
// Sem eles, o app carrega os mesmos modelos diretamente de storage.googleapis.com.
import { mkdirSync, writeFileSync, existsSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const dest = join(root, "public", "models");
const models = {
  "pose_landmarker_lite.task":
    "https://storage.googleapis.com/mediapipe-models/pose_landmarker/pose_landmarker_lite/float16/1/pose_landmarker_lite.task",
  "hand_landmarker.task":
    "https://storage.googleapis.com/mediapipe-models/hand_landmarker/hand_landmarker/float16/1/hand_landmarker.task",
};

mkdirSync(dest, { recursive: true });
for (const [name, url] of Object.entries(models)) {
  const file = join(dest, name);
  if (existsSync(file)) {
    console.log(`[orion] ${name} já existe`);
    continue;
  }
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Falha ao baixar ${name}: HTTP ${res.status}`);
  writeFileSync(file, Buffer.from(await res.arrayBuffer()));
  console.log(`[orion] ${name} salvo em public/models`);
}
