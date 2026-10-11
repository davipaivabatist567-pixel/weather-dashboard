import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

const apiPort = Number(process.env.ORION_PORT ?? 8787);

export default defineConfig({
  plugins: [react()],
  // O MediaPipe Tasks Vision sozinho tem ~500 kB; o aviso padrão não é útil aqui.
  build: { chunkSizeWarningLimit: 900 },
  server: {
    port: 5173,
    proxy: { "/api": { target: `http://127.0.0.1:${apiPort}`, changeOrigin: false } },
  },
});
