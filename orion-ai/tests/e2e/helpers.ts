import { expect, type Page } from "@playwright/test";

/** Liga a câmera: clica no botão se ela ainda não ligou sozinha (ligação automática). */
export async function ensureCameraOn(page: Page) {
  const button = page.getByRole("button", { name: "ATIVAR VISÃO COMPUTACIONAL" });
  const status = page.locator(".vision-status");
  await expect(button.or(status)).toBeVisible({ timeout: 30_000 });
  if (await button.isVisible()) await button.click();
  await expect(status).toHaveText("Detectando movimentos", { timeout: 90_000 });
}

/** Desativa a ligação automática da câmera (para testes que não usam a câmera). */
export async function disableCameraAutoStart(page: Page) {
  await page.addInitScript(() => {
    const raw = JSON.parse(localStorage.getItem("orion-state") ?? '{"state":{},"version":1}');
    raw.state.settings = raw.state.settings ?? {};
    raw.state.settings.camera = { ...(raw.state.settings.camera ?? {}), autoStart: false };
    localStorage.setItem("orion-state", JSON.stringify(raw));
  });
}
