import { ensureCameraOn } from "./helpers";
import { expect, test } from "@playwright/test";

test("pessoa: câmera real, corpo e duas mãos detectados, desligamento imediato", async ({ page }) => {
  await page.goto("/#/visao");
  await ensureCameraOn(page);
  await expect(page.locator(".topbar")).toContainText("Câmera ativa");
  const diag = page.locator(".diag");
  await expect(diag.locator("tr", { hasText: "Corpo detectado" })).toContainText("Sim", { timeout: 30_000 });
  await expect(diag.locator("tr", { hasText: "Mãos detectadas" })).toContainText("2", { timeout: 30_000 });
  await expect(diag.locator("tr", { hasText: "Taxa de quadros" })).toContainText(/\d+ fps/);
  await expect(diag.locator("tr", { hasText: "Tempo de inferência" })).toContainText(/\d+ ms/);
  await page.getByRole("button", { name: "Scanner" }).click();
  await page.waitForTimeout(800);
  await page.screenshot({ path: "test-results/04-visao-scanner.png" });
  await page.getByRole("button", { name: "Laboratório" }).first().click();
  await page.waitForTimeout(500);
  await page.screenshot({ path: "test-results/05-visao-lab.png" });

  await page.getByRole("button", { name: /Pausar processamento/ }).click();
  await expect(page.locator(".vision-status")).toHaveText("Processamento pausado");
  await page.getByRole("button", { name: /Retomar/ }).click();
  await expect(page.locator(".vision-status")).toHaveText("Detectando movimentos");

  await page.getByRole("button", { name: /Desligar câmera/ }).click();
  await expect(page.locator(".topbar")).toContainText("Câmera desligada");
  await expect(diag.locator("tr", { hasText: "Taxa de quadros" })).toContainText("Indisponível");
});

test("pessoa: com a permissão já salva, a câmera liga sozinha ao abrir", async ({ page, context }) => {
  await context.grantPermissions(["camera"]);
  await page.goto("/#/visao");
  // nenhum clique: a câmera liga e o rastreamento começa
  await expect(page.locator(".vision-status")).toHaveText("Detectando movimentos", { timeout: 90_000 });
  await expect(page.locator(".topbar")).toContainText("Câmera ativa");
  await expect(page.getByText("Permissão salva no navegador")).toBeVisible();

  // com a opção desligada, ela não liga sozinha
  await page.getByRole("button", { name: /Desligar câmera/ }).click();
  await page.evaluate(() => {
    const raw = JSON.parse(localStorage.getItem("orion-state") ?? "{}");
    raw.state.settings.camera.autoStart = false;
    localStorage.setItem("orion-state", JSON.stringify(raw));
  });
  await page.reload();
  await page.waitForTimeout(3000);
  await expect(page.locator(".topbar")).toContainText("Câmera desligada");
});
