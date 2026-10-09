// Teste de fumaça no navegador real (Playwright + Chromium).
// Uso: node tests/browser-smoke.js [pasta-de-capturas]
const path = require('path');
let playwright;
try { playwright = require('playwright'); } catch (e) { playwright = require('/opt/node22/lib/node_modules/playwright'); }

(async () => {
  const outDir = process.argv[2] || path.join(__dirname, 'screenshots');
  require('fs').mkdirSync(outDir, { recursive: true });
  const browser = await playwright.chromium.launch();
  const errors = [];
  const results = {};
  async function run(name, viewport, opts = {}) {
    const ctx = await browser.newContext({ viewport, hasTouch: !!opts.touch, isMobile: !!opts.touch, deviceScaleFactor: opts.dpr || 1 });
    const page = await ctx.newPage();
    page.on('pageerror', (e) => errors.push(name + ': ' + e.message));
    page.on('console', (m) => { if (m.type() === 'error') errors.push(name + ' console: ' + m.text()); });
    await page.route(/fonts\.(googleapis|gstatic)\.com/, (r) => r.fulfill({ status: 200, contentType: 'text/css', body: '' }));
    await page.goto('file://' + path.join(__dirname, '..', 'index.html'));
    await page.waitForFunction(() => window.PF && PF.UI && PF.UI.current === 'title', null, { timeout: 15000 });
    await page.screenshot({ path: path.join(outDir, name + '-1-titulo.png') });
    return { ctx, page };
  }

  // ---------- Desktop: CPU x CPU acelerado + teclado ----------
  {
    const { ctx, page } = await run('desktop', { width: 1280, height: 720 });
    await page.keyboard.press('Enter');
    await page.waitForTimeout(200);
    await page.screenshot({ path: path.join(outDir, 'desktop-2-modos.png') });
    await page.click('[data-mode="cpu"]');
    await page.click('[data-char="pingui"]');
    await page.click('[data-char="rei"]');
    await page.screenshot({ path: path.join(outDir, 'desktop-3-selecao.png') });
    await page.click('#btn-fight');
    await page.waitForTimeout(2200);
    // segura D e soca (teclado real)
    await page.keyboard.down('KeyD'); await page.waitForTimeout(600); await page.keyboard.up('KeyD');
    for (let i = 0; i < 6; i++) { await page.keyboard.press('KeyJ'); await page.waitForTimeout(120); }
    await page.keyboard.press('KeyU');
    await page.waitForTimeout(300);
    await page.screenshot({ path: path.join(outDir, 'desktop-4-luta.png') });
    results.desktop = await page.evaluate(() => {
      const g = PF.game, m = g.match;
      return { state: m.state, p1hp: m.fighters[0].hp, p2hp: m.fighters[1].hp, steps: g.steps, frames: g.frames,
        p1state: m.fighters[0].state, failed: PF.Assets.failed };
    });
    // pausa não atualiza o combate
    await page.keyboard.press('Escape');
    const s1 = await page.evaluate(() => PF.game.match.time);
    await page.waitForTimeout(500);
    const s2 = await page.evaluate(() => PF.game.match.time);
    results.pauseFrozen = s1 === s2;
    await page.screenshot({ path: path.join(outDir, 'desktop-5-pausa.png') });
    // reinicia várias vezes: o laço não pode duplicar
    for (let i = 0; i < 4; i++) {
      await page.evaluate(() => { PF.game.match.setPaused(false); PF.game.restart(); });
      await page.waitForTimeout(100);
    }
    const f1 = await page.evaluate(() => PF.game.frames);
    await page.waitForTimeout(1000);
    const f2 = await page.evaluate(() => PF.game.frames);
    results.framesPerSecondAfterRestarts = f2 - f1;
    // CPU contra CPU em velocidade acelerada até o fim da partida
    results.cpuMatch = await page.evaluate(() => {
      const g = PF.game;
      g.match.controllers[0] = new PF.CPUController('dificil');
      let n = 0;
      while (g.match.state !== 'over' && n < 60 * 600) { g.match.step(PF.STEP_MS); g.effects.update(PF.STEP_MS); g.stage.update(PF.STEP_MS); n++; if (n % 5 === 0) g.renderer.draw(g, n * 16); }
      return { state: g.match.state, result: g.match.result, steps: n };
    });
    await page.waitForTimeout(1200);
    await page.screenshot({ path: path.join(outDir, 'desktop-6-resultado.png') });
    // modo debug com caixas
    await page.evaluate(() => { PF.game.begin('training', { p1: 'golem', p2: 'bruxa', stage: 'aurora', dummy: 'stand' }); PF.game.renderer.debug = true; });
    await page.waitForTimeout(500);
    await page.keyboard.press('KeyJ'); await page.waitForTimeout(90);
    await page.screenshot({ path: path.join(outDir, 'desktop-7-treino-caixas.png') });
    await ctx.close();
  }

  // ---------- Celular (toque) ----------
  {
    const { ctx, page } = await run('celular', { width: 844, height: 390 }, { touch: true, dpr: 2 });
    await page.tap('[data-action="start"]');
    await page.tap('[data-mode="cpu"]');
    await page.tap('[data-char="capitao"]');
    await page.tap('[data-char="golem"]');
    await page.tap('#btn-fight');
    await page.waitForTimeout(2200);
    results.touchVisible = await page.evaluate(() => !document.getElementById('touch').classList.contains('hidden'));
    // multitouch: dpad para a direita + soco ao mesmo tempo
    const cdp = await ctx.newCDPSession(page);
    const dpad = await page.locator('.dpad').boundingBox();
    const punch = await page.locator('.tbtn.punch').boundingBox();
    const p0 = { x: dpad.x + dpad.width * 0.9, y: dpad.y + dpad.height / 2, id: 1 };
    const p1 = { x: punch.x + punch.width / 2, y: punch.y + punch.height / 2, id: 2 };
    await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [p0] });
    await page.waitForTimeout(120);
    await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [p0, p1] });
    await page.waitForTimeout(60);
    results.multitouch = await page.evaluate(() => Object.assign({}, PF.Touch.state));
    await page.screenshot({ path: path.join(outDir, 'celular-2-luta.png') });
    await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
    await page.waitForTimeout(60);
    results.touchReleased = await page.evaluate(() => Object.values(PF.Touch.state).every((v) => !v));
    await ctx.close();
  }

  // ---------- Retrato (resolução diferente) ----------
  {
    const { ctx, page } = await run('retrato', { width: 390, height: 844 }, { touch: true, dpr: 2 });
    await page.evaluate(() => PF.game.begin('versus', { p1: 'bruxa', p2: 'pingui', stage: 'navio' }));
    await page.waitForTimeout(1800);
    await page.screenshot({ path: path.join(outDir, 'retrato-2-luta.png') });
    results.canvasPortrait = await page.evaluate(() => { const c = document.getElementById('game'); return [c.width, c.height, c.style.width, c.style.height]; });
    await ctx.close();
  }

  await browser.close();
  console.log(JSON.stringify(results, null, 1));
  console.log('ERROS:', errors.length ? errors : 'nenhum');
  process.exit(errors.length ? 1 : 0);
})().catch((e) => { console.error(e); process.exit(2); });
