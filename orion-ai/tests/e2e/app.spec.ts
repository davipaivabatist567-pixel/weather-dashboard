import { expect, test, type Page } from "@playwright/test";
import { disableCameraAutoStart } from "./helpers";

const errors: string[] = [];
test.beforeEach(async ({ page }) => {
  await disableCameraAutoStart(page);
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
  await expect(page.getByRole("img", { name: /Holograma do Orion/ })).toBeVisible();
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
    ["Pesquisa", "pesquisa"], ["Memória e Aprendizado", "memoria"], ["Configurações", "configuracoes"], ["Início", "inicio"],
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
  await page.locator("label.toggle", { hasText: /^Memória persistente/ }).click();
  await expect(page.getByPlaceholder("Algo para o Orion lembrar")).toBeDisabled();
  await page.locator("label.toggle", { hasText: /^Memória persistente/ }).click();
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

test("aprende com o que o usuário ensina e envia", async ({ page }) => {
  await page.goto("/#/memoria");
  await page.getByPlaceholder("ex.: Matéria de história").fill("Regras do meu jogo");
  await page.getByPlaceholder("Cole aqui anotações").fill("No jogo Aventura do Pinguim, o chefe final é a Morsa Gigante.");
  await page.getByRole("button", { name: "📚 Ensinar" }).click();
  await expect(page.locator(".task", { hasText: "Regras do meu jogo" })).toBeVisible();

  // A resposta usa o conhecimento ensinado (recuperado e enviado à IA)
  await page.getByRole("navigation").getByRole("button", { name: "Assistente" }).click();
  await page.getByLabel("Mensagem").fill("Quem é o chefe final do meu jogo do pinguim?");
  await page.keyboard.press("Enter");
  await expect(page.locator(".msg.assistant").last()).toContainText("Morsa Gigante");

  // Aprendizado automático a partir da conversa
  await page.getByLabel("Mensagem").fill("Meu cachorro se chama Thor");
  await page.keyboard.press("Enter");
  await expect(page.locator(".msg.system", { hasText: "🧠 Aprendi" })).toContainText("cachorro chamado Thor");

  // Arquivo anexado no chat vai para a base de conhecimento
  await page.locator('input[type="file"]').first().setInputFiles({ name: "notas-da-aula.txt", mimeType: "text/plain", buffer: Buffer.from("A capital da Austrália é Camberra.") });
  await page.getByLabel("Mensagem").fill("Guarde estas notas");
  await page.keyboard.press("Enter");
  await expect(page.locator(".msg.system", { hasText: "📚 Guardei" })).toContainText("notas-da-aula.txt");
  await page.screenshot({ path: "test-results/08-aprendizado-chat.png" });

  await page.getByRole("navigation").getByRole("button", { name: "Memória e Aprendizado" }).click();
  await expect(page.locator(".task", { hasText: "cachorro chamado Thor" })).toContainText("🧠");
  await expect(page.locator(".task", { hasText: "notas-da-aula.txt" })).toBeVisible();
  await page.getByPlaceholder("O que o Orion sabe sobre…").fill("capital da Austrália");
  await page.getByRole("button", { name: "Buscar", exact: true }).click();
  await expect(page.getByText("Camberra").first()).toBeVisible();
  await page.screenshot({ path: "test-results/09-aprendizado-pagina.png", fullPage: true });
});

test("Orion Ring: um botão vira clique, duplo e longo, e a tecla pode ser reaprendida", async ({ page }) => {
  await page.addInitScript(() => {
    const raw = JSON.parse(localStorage.getItem("orion-state") ?? '{"state":{},"version":1}');
    raw.state.settings = { ...(raw.state.settings ?? {}), ring: { enabled: true, key: "F9" } };
    localStorage.setItem("orion-state", JSON.stringify(raw));
  });
  await page.goto("/#/assistente");
  await page.getByLabel("Mensagem").fill("Olá, Orion");
  await page.keyboard.press("Enter");
  await expect(page.locator(".msg.assistant").last()).toContainText("resposta simulada");
  await page.locator("body").click({ position: { x: 5, y: 5 } });

  await page.keyboard.press("F9");
  await page.keyboard.press("F9");
  await expect(page.locator(".toast").filter({ hasText: "Duplo clique" })).toBeVisible();

  await page.keyboard.down("F9");
  await page.waitForTimeout(800);
  await page.keyboard.up("F9");
  await expect(page.locator(".toast").filter({ hasText: "Pressão longa — Tudo interrompido" })).toBeVisible();

  await nav(page, "Configurações");
  const log = page.locator(".ring-log");
  await expect(log).toContainText("Duplo clique");
  await expect(log).toContainText("Pressão longa");

  // Aprender outra tecla
  await page.getByRole("button", { name: "Aprender tecla" }).click();
  await page.keyboard.press("F8");
  await expect(page.getByText("Tecla atual:")).toContainText("F8");
});

test("diagnóstico da câmera lista cada passo com o resultado real", async ({ page }) => {
  await page.goto("/#/visao");
  await page.getByRole("button", { name: "Diagnosticar câmera" }).click();
  const report = page.getByLabel("Resultado do diagnóstico da câmera");
  await expect(report).toContainText("Contexto seguro");
  await expect(report).toContainText("Abrir a câmera");
  await expect(report.locator("li.ok", { hasText: "Abrir a câmera" })).toBeVisible();
  await expect(report.locator("li.ok", { hasText: "Modelo de mãos" })).toBeVisible();
  await expect(report.locator("li.falha")).toHaveCount(0);
});

test("holograma estilo VISION: anima, abre em tela cheia e fecha com Esc", async ({ page }) => {
  await page.goto("/");
  const canvas = page.locator(".holo-home .holo-canvas");
  await expect(canvas).toBeVisible();
  await expect.poll(async () => Number(await canvas.getAttribute("data-quadros")), { timeout: 15_000 }).toBeGreaterThan(20);
  // o centro do holograma tem pixels acesos (núcleo/cristal), não é um quadro preto
  const aceso = await canvas.evaluate((c: HTMLCanvasElement) => {
    const g = c.getContext("2d")!.getImageData(c.width / 2 - 20, c.height / 2 - 20, 40, 40).data;
    let max = 0;
    for (let i = 0; i < g.length; i += 4) max = Math.max(max, g[i + 1] + g[i + 2]);
    return max;
  });
  expect(aceso).toBeGreaterThan(200);
  // arrastar gira (a imagem muda)
  const antes = await canvas.screenshot();
  const box = (await canvas.boundingBox())!;
  await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
  await page.mouse.down();
  await page.mouse.move(box.x + box.width / 2 + 120, box.y + box.height / 2 + 30, { steps: 8 });
  await page.mouse.up();
  expect(Buffer.compare(antes, await canvas.screenshot())).not.toBe(0);
  await page.screenshot({ path: "test-results/09-holograma.png" });
  await page.getByRole("button", { name: "⛶ Tela cheia" }).click();
  await expect(page.getByRole("dialog", { name: /Holograma do Orion em tela cheia/ })).toBeVisible();
  await page.screenshot({ path: "test-results/10-holograma-tela-cheia.png" });
  await page.keyboard.press("Escape");
  await expect(page.getByRole("dialog", { name: /Holograma do Orion em tela cheia/ })).toHaveCount(0);
});

test("comandos estilo VISION: sites, volume da voz, bateria, apresentação e holograma", async ({ page }) => {
  await page.addInitScript(() => {
    (window as unknown as { __abertos: string[] }).__abertos = [];
    window.open = ((u: string) => {
      (window as unknown as { __abertos: string[] }).__abertos.push(String(u));
      return {} as Window;
    }) as typeof window.open;
  });
  await page.goto("/#/assistente");
  const enviar = async (t: string) => {
    await page.getByLabel("Mensagem").fill(t);
    await page.keyboard.press("Enter");
  };
  await enviar("abrir YouTube");
  await expect(page.locator(".msg").last()).toContainText("Abrindo YouTube");
  await enviar("tocar Believer");
  await expect(page.locator(".msg").last()).toContainText("believer");
  await enviar("pesquisar receita de bolo no google");
  await expect(page.locator(".msg").last()).toContainText("receita de bolo");
  expect(await page.evaluate(() => (window as unknown as { __abertos: string[] }).__abertos)).toEqual([
    "https://www.youtube.com",
    "https://www.youtube.com/results?search_query=believer",
    "https://www.google.com/search?q=receita%20de%20bolo",
  ]);
  await enviar("volume 40");
  await expect(page.locator(".msg").last()).toContainText("Volume da voz do Orion em 40%");
  await enviar("bateria");
  await expect(page.locator(".msg").last()).toContainText(/Bateria em \d+%|não informa/);
  await enviar("quem é você?");
  await expect(page.locator(".msg").last()).toContainText("Eu sou o Orion");
  await enviar("tira um print da tela");
  await expect(page.locator(".msg").last()).toContainText("Não consigo tirar print");
  await enviar("abrir holograma");
  await expect(page.getByRole("dialog", { name: /Holograma do Orion em tela cheia/ })).toBeVisible();
  await page.getByRole("button", { name: "Fechar holograma" }).click();
  await expect(page.getByRole("dialog", { name: /Holograma/ })).toHaveCount(0);
});

test("tirar foto por comando: liga a câmera, conta 3 s e mostra a foto só no aparelho", async ({ page }) => {
  await page.goto("/#/assistente");
  await page.getByLabel("Mensagem").fill("tira uma foto");
  await page.keyboard.press("Enter");
  const foto = page.getByRole("dialog", { name: "Foto tirada" });
  await expect(foto).toBeVisible({ timeout: 90_000 });
  await expect(foto.locator("img")).toHaveAttribute("src", /^data:image\/jpeg;base64,/);
  await page.getByRole("button", { name: "Fechar e apagar" }).click();
  await expect(foto).toHaveCount(0);
});

test("ativação por palmas: liga a escuta só do volume e mostra o aviso", async ({ page }) => {
  await page.goto("/#/configuracoes");
  await page.getByText("Ativar com duas palmas").click();
  await expect(page.locator(".topbar")).toContainText("Ouvindo palmas", { timeout: 15_000 });
  await expect(page.getByLabel("Nível do microfone")).toBeVisible();
  await page.locator(".topbar").getByRole("button", { name: /Ouvindo palmas/ }).click();
  await expect(page.locator(".topbar")).not.toContainText("Ouvindo palmas");
});
