import { ensureCameraOn } from "./helpers";
import { expect, test } from "@playwright/test";

test("polegar: gesto confirmado uma única vez enquanto mantido", async ({ page }) => {
  await page.goto("/#/visao");
  await ensureCameraOn(page);
  const log = page.locator(".gesture-log li", { hasText: "Polegar para cima" });
  await expect(log.first()).toBeVisible({ timeout: 30_000 });
  // A imagem fica parada mostrando o gesto: não pode haver repetições.
  await page.waitForTimeout(4000);
  await expect(log).toHaveCount(1);
  await page.screenshot({ path: "test-results/06-gesto-polegar.png" });
  await page.getByRole("button", { name: /Desligar câmera/ }).click();
});
