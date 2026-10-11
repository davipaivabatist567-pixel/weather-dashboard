import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

export default defineConfig({
  resolve: { alias: { "@backend": fileURLToPath(new URL("./src/lib/backend/http.ts", import.meta.url)) } },
  test: { environment: "node", include: ["tests/unit/**/*.test.ts"] },
});
