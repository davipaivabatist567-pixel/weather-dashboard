// Versão HTML (arquivo único aberto via file://, sem servidor do Orion).
// A API da Anthropic é redirecionada para o servidor simulado e a CDN do MediaPipe
// para os arquivos locais do pacote (a rede de teste não acessa a CDN).
import { ensureCameraOn } from "./helpers";
import { expect, test, type Page, type Route } from "@playwright/test";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { pathToFileURL } from "node:url";

const FILE_URL = pathToFileURL(join(import.meta.dirname, "..", "..", "orion.html")).href;
const WASM_DIR = join(import.meta.dirname, "..", "..", "node_modules", "@mediapipe", "tasks-vision", "wasm");
const CORS = { "access-control-allow-origin": "*", "access-control-allow-headers": "*", "access-control-allow-methods": "*" };

let apiCalls: { headers: Record<string, string>; body: Record<string, unknown> }[] = [];

async function setup(page: Page) {
  apiCalls = [];
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await page.route("https://api.anthropic.com/**", async (route: Route) => {
    const req = route.request();
    if (req.method() === "OPTIONS") return route.fulfill({ status: 204, headers: CORS });
    apiCalls.push({ headers: req.headers(), body: req.postDataJSON() });
    const res = await fetch("http://127.0.0.1:8790/v1/messages", { method: "POST", body: req.postData() ?? "{}" });
    await route.fulfill({ status: res.status, headers: { ...CORS, "content-type": res.headers.get("content-type") ?? "application/json" }, body: await res.text() });
  });
  await page.route("https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@1.1.0/wasm/**", (route) => {
    const name = new URL(route.request().url()).pathname.split("/").pop()!;
    const type = name.endsWith(".wasm") ? "application/wasm" : "text/javascript";
    return route.fulfill({ status: 200, headers: { ...CORS, "content-type": type }, body: readFileSync(join(WASM_DIR, name)) });
  });
  return errors;
}

test("abre direto do arquivo, conecta com a chave do usuário e conversa", async ({ page }) => {
  const errors = await setup(page);
  await page.goto(FILE_URL + "#/assistente");
  await expect(page.locator(".notice")).toContainText("Configurações → Conexão com a IA");
  await expect(page.locator(".topbar")).toContainText("IA não configurada");

  // Modo local limitado funciona sem chave
  await page.getByLabel("Mensagem").fill("quanto é 6 vezes 7?");
  await page.keyboard.press("Enter");
  await expect(page.locator(".msg.assistant").last()).toContainText("42");
  expect(apiCalls).toHaveLength(0);

  await page.getByRole("navigation").getByRole("button", { name: "Configurações" }).click();
  await expect(page.locator(".panel", { hasText: "Conexão com a IA" })).toContainText("somente neste navegador");
  await page.getByPlaceholder("sk-ant-…").fill("sk-ant-teste-html");
  await page.getByRole("button", { name: "Salvar conexão" }).click();
  await expect(page.locator(".topbar")).toContainText("IA: claude-opus-5-5");

  await page.getByRole("navigation").getByRole("button", { name: "Assistente" }).click();
  await page.getByLabel("Mensagem").fill("Olá, Orion");
  await page.keyboard.press("Enter");
  await expect(page.locator(".msg.assistant").last()).toContainText("resposta simulada");
  const chatCalls = apiCalls.filter((c) => c.body.stream === true);
  expect(chatCalls).toHaveLength(1);
  // depois da resposta, uma chamada curta de aprendizado (não-streaming)
  await expect.poll(() => apiCalls.filter((c) => !c.body.stream).length).toBe(1);
  expect(apiCalls[0].headers["x-api-key"]).toBe("sk-ant-teste-html");
  expect(apiCalls[0].headers["anthropic-dangerous-direct-browser-access"]).toBe("true");
  expect(apiCalls[0].body.model).toBe("claude-opus-5-5");
  await page.screenshot({ path: "test-results/07-html-conversa.png" });
  expect(errors).toEqual([]);
});

test("ferramentas e dados persistem no navegador", async ({ page }) => {
  const errors = await setup(page);
  await page.goto(FILE_URL);
  await page.evaluate(() => localStorage.setItem("orion.ai", JSON.stringify({ apiKey: "sk-ant-x", model: "claude-opus-5-5", effort: "medium", webSearch: true })));
  await page.reload(); // o app lê a chave salva ao iniciar
  await page.getByRole("navigation").getByRole("button", { name: "Assistente" }).click();
  await page.getByRole("button", { name: "Produtividade" }).click();
  await page.getByLabel("Mensagem").fill("Crie um projeto de robô explorador");
  await page.keyboard.press("Enter");
  await expect(page.locator(".msg.assistant").last()).toContainText("criado com 2 etapas");
  await expect(page.locator(".tool-line")).toContainText("Projeto criado");

  await page.reload();
  await page.getByRole("navigation").getByRole("button", { name: "Meus Projetos" }).click();
  await page.locator(".project-card", { hasText: "Robô explorador" }).click();
  await expect(page.locator(".step")).toHaveCount(2);

  await page.getByRole("navigation").getByRole("button", { name: "Memória" }).click();
  await page.getByPlaceholder("Algo para o Orion lembrar").fill("Meu jogo favorito é xadrez");
  await page.getByRole("button", { name: "Salvar", exact: true }).click();
  await expect(page.locator(".task", { hasText: "xadrez" })).toBeVisible();
  const db = await page.evaluate(() => JSON.parse(localStorage.getItem("orion.db") ?? "{}"));
  expect(db.memory[0].content).toBe("Meu jogo favorito é xadrez");
  expect(db.projects[0].name).toBe("Robô explorador");
  expect(errors).toEqual([]);
});

test("câmera e rastreamento funcionam abrindo o arquivo", async ({ page }) => {
  const errors = await setup(page);
  await page.goto(FILE_URL + "#/visao");
  await ensureCameraOn(page);
  const diag = page.locator(".diag");
  await expect(diag.locator("tr", { hasText: "Mãos detectadas" })).toContainText("2", { timeout: 30_000 });
  await expect(diag.locator("tr", { hasText: "Corpo detectado" })).toContainText("Sim");
  await page.getByRole("button", { name: /Desligar câmera/ }).click();
  await expect(page.locator(".topbar")).toContainText("Câmera desligada");
  expect(errors).toEqual([]);
});

test("sem chave, aprende e responde com o que foi ensinado", async ({ page }) => {
  const errors = await setup(page);
  await page.goto(FILE_URL + "#/assistente");
  await page.getByLabel("Mensagem").fill("aprenda: O Orion foi criado pelo Davi em 2026 para ajudar nos estudos.");
  await page.keyboard.press("Enter");
  await expect(page.locator(".msg.assistant").last()).toContainText("Guardado na base de conhecimento");
  await page.getByLabel("Mensagem").fill("o que você sabe sobre quem criou o Orion?");
  await page.keyboard.press("Enter");
  await expect(page.locator(".msg.assistant").last()).toContainText("criado pelo Davi em 2026");
  expect(apiCalls).toHaveLength(0);
  expect(errors).toEqual([]);
});

test.describe("dentro do app Android (WebView)", () => {
  test.use({ userAgent: "Mozilla/5.0 (Linux; Android 14) AppleWebKit/537.36 Chrome/120 Mobile Safari/537.36 OrionApp/1.0" });

  test("a câmera liga sozinha, porque o app é quem pede a permissão ao sistema", async ({ page }) => {
    const errors = await setup(page);
    // Simula um navegador que ainda não guardou a permissão: só o sufixo OrionApp pode ligar sozinho.
    await page.addInitScript(() => {
      const fake = { state: "prompt", addEventListener() {}, removeEventListener() {} };
      navigator.permissions.query = () => Promise.resolve(fake as unknown as PermissionStatus);
    });
    await page.goto(FILE_URL + "#/visao");
    await expect(page.locator(".vision-status")).toHaveText("Detectando movimentos", { timeout: 90_000 });
    expect(errors).toEqual([]);
  });
});
