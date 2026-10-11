import { defineConfig } from "@playwright/test";
import { join } from "node:path";

const fixtures = join(import.meta.dirname, "tests/e2e/fixtures");
const chromiumArgs = (video: string) => [
  "--use-fake-ui-for-media-stream", // concede a permissão automaticamente nos testes
  "--use-fake-device-for-media-stream",
  `--use-file-for-fake-video-capture=${join(fixtures, video)}`,
  "--enable-unsafe-swiftshader",
];
const executablePath = process.env.PW_CHROMIUM_PATH ?? (process.env.PLAYWRIGHT_BROWSERS_PATH ? "/opt/pw-browsers/chromium" : undefined);

export default defineConfig({
  testDir: "tests/e2e",
  timeout: 120_000,
  workers: 1,
  reporter: "list",
  use: { baseURL: "http://127.0.0.1:8791", viewport: { width: 1440, height: 900 }, screenshot: "only-on-failure" },
  projects: [
    { name: "geral", testMatch: /app\.spec/, use: { launchOptions: { executablePath, args: chromiumArgs("pessoa_maos.y4m") } } },
    { name: "camera-pessoa", testMatch: /vision-pessoa\.spec/, use: { launchOptions: { executablePath, args: chromiumArgs("pessoa_maos.y4m") } } },
    { name: "camera-polegar", testMatch: /vision-polegar\.spec/, use: { launchOptions: { executablePath, args: chromiumArgs("polegar.y4m") } } },
  ],
  webServer: [
    { command: "node tests/e2e/mock-anthropic.mjs", port: 8790, reuseExistingServer: false },
    {
      command: "rm -f test-results/e2e-db.json && npx vite build && npx tsx server/index.ts",
      port: 8791,
      reuseExistingServer: false,
      timeout: 120_000,
      env: {
        NODE_ENV: "production",
        ORION_PORT: "8791",
        ANTHROPIC_API_KEY: "sk-teste-e2e",
        ANTHROPIC_BASE_URL: "http://127.0.0.1:8790",
        ORION_DB_PATH: join(import.meta.dirname, "test-results", "e2e-db.json"),
      },
    },
  ],
});
