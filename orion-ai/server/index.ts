// Ponto de entrada do servidor do Orion.
import "dotenv/config";
import express from "express";
import { existsSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { AnthropicProvider } from "./ai/anthropicProvider";
import type { AIProvider } from "./ai/provider";
import { createApp } from "./app";
import { createFileStore } from "./storage/filePersistence";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const port = Number(process.env.ORION_PORT ?? 8787);
const host = process.env.ORION_HOST ?? "127.0.0.1";
const EFFORTS = ["low", "medium", "high", "xhigh", "max"] as const;

function createProvider(): AIProvider | null {
  const key = process.env.ANTHROPIC_API_KEY?.trim();
  if (!key) return null;
  const model = process.env.ORION_MODEL?.trim() || "claude-opus-5-5";
  const effortEnv = process.env.ORION_EFFORT?.trim() as (typeof EFFORTS)[number] | undefined;
  const effort = effortEnv && EFFORTS.includes(effortEnv) ? effortEnv : "medium";
  const webSearch = (process.env.ORION_WEB_SEARCH ?? "true") !== "false";
  return new AnthropicProvider(key, model, effort, webSearch);
}

const store = createFileStore(process.env.ORION_DB_PATH ?? join(root, "data", "orion-db.json"));
const provider = createProvider();
const app = createApp({ store, provider, version: "0.1.0" });

// Em produção, o mesmo servidor entrega o frontend compilado.
const dist = join(root, "dist");
if (process.env.NODE_ENV === "production" && existsSync(dist)) {
  app.use(express.static(dist, { index: "index.html" }));
  app.get(/^(?!\/api).*/, (_req, res) => res.sendFile(join(dist, "index.html")));
}

app.listen(port, host, () => {
  console.log(`[orion] servidor em http://${host}:${port}`);
  console.log(
    provider
      ? `[orion] IA conectada: ${provider.name} (${provider.model})`
      : "[orion] ANTHROPIC_API_KEY ausente — modo local limitado (sem modelo de IA).",
  );
});
