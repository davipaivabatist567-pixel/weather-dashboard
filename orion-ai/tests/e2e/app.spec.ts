import { expect, test, type Page } from "@playwright/test";

const errors: string[] = [];
test.beforeEach(async ({ page }) => {
  errors.length = 0;
  page.on("pageerror", (e) => errors.push(e.message));
  page.on("console", (m) => {
    // 4xx esperados (ex.: memória sensível recusada) já aparecem na interface; fontes externas podem faltar offline.
    if (m.type() === "error" && !/fonts\.(googleapis|gstatic)|status of 4\d\d/.test(m.text())) errors.push(m.text());
  });
});
test.afterEach(() => {
  expect(errors, errors.join("\n")).toEqual([]);
});

const nav = (page: Page, label: string) => page.getByRole("navigation").getByRole("button", { name: label }).click();

test("início mostra núcleo, saudação e IA conectada", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByRole("img", { name: /Núcleo do Orion/ })).toBeVisible();
  await expect(page.locator(".greeting")).not.toBeEmpty();
  await expect(page.locator(".topbar")).toContainText("IA: claude-opus-5-5");
  await expect(page.locator(".diag")).toContainText("Câmera");
  await page.screenshot({ path: "test-results/01-inicio.png" });
});

test("todas as páginas abrem sem recarregar", async ({ page }) => {
  await page.goto("/");
  const marker = await page.evaluate(() => ((window as unknown as { __m: number }).__m = Math.random()));
  for (const [label, hash] of [
    ["Assistente", "assistente"], ["Visão Computacional", "visao"], ["Laboratório", "laboratorio"], ["Meus Projetos", "projetos"],
    ["Pesquisa", "pesquisa"], ["Memória", "memoria"], ["Configurações", "configuracoes"], ["Início", "inicio"],
  ]) {
    await nav(page, label);
    await expect(page).toHaveURL(new RegExp(`#/${hash}$`));
    await expect(page.locator(".topbar .title")).toHaveText(label.toUpperCase());
  }
  expect(await page.evaluate(() => (window as unknown as { __m: number }).__m)).toBe(marker);
  await page.goBack();
  await expect(page).toHaveURL(/#\/configuracoes$/);
});

test("conversa por texto com streaming, Markdown e limpeza do histórico", async ({ page }) => {
  await page.goto("/#/assistente");
  await page.getByLabel("Mensagem").fill("Olá, Orion");
  await page.getByRole("button", { name: "Enviar" }).click();
  const reply = page.locator(".msg.assistant").last();
  await expect(reply).toContainText("resposta simulada");
  await expect(reply.locator("li")).toHaveCount(2);
  await expect(reply.locator("pre code")).toContainText("console.log");
  await expect(reply.locator(".msg-meta")).toContainText(/\d{2}:\d{2}/);
  await page.screenshot({ path: "test-results/02-conversa.png" });
  page.once("dialog", (d) => void d.accept());
  await page.getByRole("button", { name: "Limpar histórico" }).click();
  await expect(page.locator(".msg")).toHaveCount(0);
});

test("comando local muda o modo de visualização", async ({ page }) => {
  await page.goto("/#/assistente");
  await page.getByLabel("Mensagem").fill("Orion, ative o modo scanner");
  await page.keyboard.press("Enter");
  await expect(page).toHaveURL(/#\/visao$/);
  await expect(page.getByRole("button", { name: "Scanner" })).toHaveAttribute("aria-pressed", "true");
});

test("a IA usa uma ferramenta real e o projeto aparece em MEUS PROJETOS", async ({ page }) => {
  await page.goto("/#/assistente");
  await page.getByRole("button", { name: "Produtividade" }).click();
  await page.getByLabel("Mensagem").fill("Crie um projeto de robô explorador");
  await page.keyboard.press("Enter");
  const reply = page.locator(".msg.assistant").last();
  await expect(reply.locator(".tool-line")).toContainText("Criar projeto");
  await expect(reply.locator(".tool-line")).toContainText("Projeto criado");
  await expect(reply).toContainText("criado com 2 etapas");
  await nav(page, "Meus Projetos");
  await page.locator(".project-card", { hasText: "Robô explorador" }).click();
  await expect(page.locator(".step")).toHaveCount(2);
});

test("projetos, tarefas e lembretes são persistidos", async ({ page }) => {
  await page.goto("/#/projetos");
  await page.getByPlaceholder("Nome do novo projeto").fill("Site da pousada");
  await page.getByRole("button", { name: "Criar" }).click();
  await page.getByPlaceholder("Nova etapa").fill("Criar layout");
  await page.getByRole("button", { name: "Adicionar" }).first().click();
  await expect(page.locator(".step")).toHaveCount(1);
  await page.getByPlaceholder("Nova tarefa").fill("Comprar domínio");
  await page.locator(".panel", { hasText: "Tarefas" }).getByRole("button", { name: "Adicionar" }).click();
  await expect(page.locator(".task", { hasText: "Comprar domínio" })).toBeVisible();
  await page.getByPlaceholder("Lembrar de…").fill("Revisar orçamento");
  const later = new Date(Date.now() + 3600_000);
  const local = new Date(later.getTime() - later.getTimezoneOffset() * 60000).toISOString().slice(0, 16);
  await page.getByLabel("Data e hora").fill(local);
  await page.getByRole("button", { name: "Agendar" }).click();
  await expect(page.locator(".task", { hasText: "Revisar orçamento" })).toBeVisible();
  await page.reload();
  await expect(page.locator(".project-card", { hasText: "Site da pousada" })).toBeVisible();
  await expect(page.locator(".task", { hasText: "Comprar domínio" })).toBeVisible();
});

test("memória salva, recusa dados sensíveis e pode ser desativada", async ({ page }) => {
  await page.goto("/#/memoria");
  await page.getByPlaceholder("Algo para o Orion lembrar").fill("Prefiro explicações com exemplos");
  await page.getByRole("button", { name: "Salvar", exact: true }).click();
  await expect(page.locator(".task", { hasText: "Prefiro explicações" })).toBeVisible();
  await page.getByPlaceholder("Algo para o Orion lembrar").fill("senha: 12345");
  await page.getByRole("button", { name: "Salvar", exact: true }).click();
  await expect(page.locator(".toast.erro")).toContainText("não armazena senhas");
  await page.locator("label.toggle", { hasText: "Memória persistente ativada" }).click();
  await expect(page.getByPlaceholder("Algo para o Orion lembrar")).toBeDisabled();
  await page.locator("label.toggle", { hasText: "Memória persistente ativada" }).click();
  await expect(page.getByPlaceholder("Algo para o Orion lembrar")).toBeEnabled();
});

test("diagnóstico mostra Indisponível sem câmera e pode ser ocultado", async ({ page }) => {
  await page.goto("/");
  const diag = page.locator(".diag");
  await expect(diag.locator("tr", { hasText: "Taxa de quadros" })).toContainText("Indisponível");
  await expect(diag.locator("tr", { hasText: "Tempo de inferência" })).toContainText("Indisponível");
  await page.getByRole("button", { name: "Ocultar diagnóstico" }).first().click();
  await expect(diag).toHaveCount(0);
  await page.getByRole("button", { name: "Mostrar diagnóstico" }).click();
  await expect(page.locator(".diag")).toBeVisible();
});

test("pesquisa e calculadora locais funcionam", async ({ page }) => {
  await page.goto("/#/pesquisa");
  await page.getByLabel("Expressão").fill("(2^10 + sqrt(144)) / 4");
  await expect(page.getByText("= 259")).toBeVisible();
  await page.locator('input[type="file"][accept=".csv,.tsv,.txt"]').setInputFiles({ name: "dados.csv", mimeType: "text/csv", buffer: Buffer.from("produto,preco\nA,10\nB,20\nC,30\n") });
  await expect(page.getByText("3 linhas")).toBeVisible();
  await expect(page.locator("td", { hasText: "numérica" })).toBeVisible();
});

test("layout de celular sem rolagem horizontal", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  for (const hash of ["inicio", "assistente", "visao", "laboratorio", "projetos", "pesquisa", "memoria", "configuracoes"]) {
    await page.goto(`/#/${hash}`);
    await page.waitForTimeout(150);
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
    expect(overflow, `rolagem horizontal em ${hash}`).toBeLessThanOrEqual(1);
  }
  await page.goto("/#/inicio");
  await page.screenshot({ path: "test-results/03-celular.png", fullPage: true });
});
