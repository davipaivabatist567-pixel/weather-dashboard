import { fileURLToPath } from "node:url";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";
import { viteSingleFile } from "vite-plugin-singlefile";

const apiPort = Number(process.env.ORION_PORT ?? 8787);
const here = (p: string) => fileURLToPath(new URL(p, import.meta.url));

// `vite build --mode html` gera a versão HTML: um único arquivo, sem servidor.
export default defineConfig(({ mode }) => {
  const html = mode === "html";
  return {
    plugins: html ? [react(), viteSingleFile()] : [react()],
    define: { "import.meta.env.VITE_STANDALONE": JSON.stringify(html ? "1" : "0") },
    resolve: { alias: { "@backend": here(html ? "./src/lib/backend/local.ts" : "./src/lib/backend/http.ts") } },
    // No modo HTML não há pasta public (WASM e modelos vêm da CDN do MediaPipe).
    publicDir: html ? false : "public",
    build: html
      ? { outDir: "dist-html", emptyOutDir: true, chunkSizeWarningLimit: 5000 }
      : // O MediaPipe Tasks Vision sozinho tem ~500 kB; o aviso padrão não é útil aqui.
        { chunkSizeWarningLimit: 900 },
    server: {
      port: 5173,
      proxy: { "/api": { target: `http://127.0.0.1:${apiPort}`, changeOrigin: false } },
    },
  };
});
