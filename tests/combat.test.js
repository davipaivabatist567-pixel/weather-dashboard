// Testes automáticos das regras de combate (node --test tests/)
const test = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const path = require('path');
const PF = require('./load.js');

const STEP = PF.STEP_MS;

// controle programável: devolve a entrada definida em "cur"
class Scripted {
  constructor() { this.cur = {}; }
  read() { return Object.assign(PF.emptyInput(), this.cur); }
}

function fightMatch(p1 = 'pingui', p2 = 'pingui', opts = {}) {
  const c1 = new Scripted(), c2 = new Scripted();
  const m = new PF.Match(Object.assign({ p1, p2, c1, c2 }, opts));
  m.unlock();
  m.message = null;
  m.setState('fight');
  return { m, c1, c2, a: m.fighters[0], b: m.fighters[1] };
}
function run(m, ms) { for (let t = 0; t < ms; t += STEP) m.step(STEP); }
function tap(m, c, input, holdMs = 50) { c.cur = input; run(m, holdMs); c.cur = {}; }
function place(a, b, gap) {
  a.x = PF.STAGE_W / 2 - (gap + (a.def.bodyW + b.def.bodyW) / 2) / 2;
  b.x = a.x + gap + (a.def.bodyW + b.def.bodyW) / 2;
  a.facing = 1; b.facing = -1;
}

test('todos os personagens têm atlas, retrato e animações válidas', () => {
  for (const id of PF.CHARACTER_ORDER) {
    const def = PF.CHARACTERS[id];
    assert.ok(def, id);
    const atlas = PF.ATLAS.characters[id];
    assert.ok(atlas, 'atlas de ' + id);
    assert.ok(fs.existsSync(path.join(__dirname, '..', atlas.image)), 'imagem ' + atlas.image);
    assert.ok(fs.existsSync(path.join(__dirname, '..', atlas.portrait)), 'retrato ' + atlas.portrait);
    const names = ['idle', 'walk', 'walkBack', 'run', 'crouch', 'jumpUp', 'jumpDown', 'punch', 'kick', 'special',
      'block', 'blockLow', 'hit', 'launched', 'down', 'getup', 'dizzy', 'victory', 'defeatPose', 'quake'];
    for (const n of names) {
      const r = PF.Anim.resolve(id, n);
      assert.ok(r.frames.length > 0, `${id}:${n} sem quadros`);
      for (const f of r.frames) assert.ok(f >= 0 && f < atlas.frames, `${id}:${n} quadro inválido ${f}`);
    }
    for (const mv of Object.values(def.moves)) {
      assert.ok(mv.startup > 0 && mv.active > 0 && mv.recovery > 0, `${id}:${mv.id} sem tempos`);
    }
  }
  for (const [id, e] of Object.entries(PF.ATLAS.effects)) {
    assert.ok(fs.existsSync(path.join(__dirname, '..', e.image)), 'efeito ' + id);
  }
});

test('buffer de comandos reconhece ↓↘→, →→ e botões simultâneos', () => {
  const buf = new PF.InputBuffer();
  const push = (inp, n = 3) => { for (let i = 0; i < n; i++) buf.push(Object.assign(PF.emptyInput(), inp), 1, STEP); };
  push({ down: true }); push({ down: true, right: true }); push({ right: true }); push({ right: true, punch: true }, 1);
  assert.ok(buf.motion('qcf'));
  assert.ok(!buf.motion('qcb'));
  assert.ok(buf.pressed('punch'));
  const b2 = new PF.InputBuffer();
  const p2 = (inp, n = 3) => { for (let i = 0; i < n; i++) b2.push(Object.assign(PF.emptyInput(), inp), 1, STEP); };
  p2({ right: true }); p2({}); p2({ right: true });
  assert.ok(b2.motion('ff'));
  p2({ punch: true, kick: true }, 1);
  assert.ok(b2.together('punch', 'kick'));
  // direção relativa: virado para a esquerda, "esquerda" é frente
  const b3 = new PF.InputBuffer();
  b3.push(Object.assign(PF.emptyInput(), { left: true }), -1, STEP);
  assert.strictEqual(b3.dir, 6);
});

test('golpe só acerta dentro do alcance', () => {
  const { m, c1, a, b } = fightMatch();
  place(a, b, 300);
  tap(m, c1, { punch: true });
  run(m, 500);
  assert.strictEqual(b.hp, b.maxHp, 'acertou de longe');
  place(a, b, 10);
  tap(m, c1, { punch: true });
  run(m, 400);
  assert.ok(b.hp < b.maxHp, 'não acertou de perto');
});

test('dano é aplicado uma única vez por golpe', () => {
  const { m, c1, a, b } = fightMatch();
  place(a, b, 5);
  let hits = 0;
  m.on('hit', () => hits++);
  tap(m, c1, { punch: true }, 17);
  run(m, 600);
  assert.strictEqual(hits, 1);
  const expected = Math.round(a.def.moves.lp.damage / b.def.defense);
  assert.strictEqual(b.maxHp - b.hp, expected);
});

test('vida nunca fica abaixo de zero nem acima do máximo', () => {
  const { m, a, b } = fightMatch();
  const big = Object.assign({}, a.def.moves.hp, { damage: 99999 });
  PF.Combat.resolveHit(a, b, big, { world: m });
  assert.strictEqual(b.hp, 0);
  b.hp = b.maxHp;
  b.addEnergy(500);
  assert.strictEqual(b.energy, 100);
  b.addEnergy(-500);
  assert.strictEqual(b.energy, 0);
});

test('defesa bloqueia golpe médio, golpe baixo exige defesa agachada', () => {
  const { m, c1, c2, a, b } = fightMatch();
  place(a, b, 5);
  c2.cur = { block: true };
  run(m, 50);
  tap(m, c1, { punch: true }, 17);
  run(m, 400);
  assert.strictEqual(b.hp, b.maxHp, 'normal bloqueado não causa dano');
  // rasteira acerta quem defende em pé
  run(m, 300);
  place(a, b, 5);
  tap(m, c1, { down: true, kick: true }, 34);
  run(m, 500);
  assert.ok(b.hp < b.maxHp, 'rasteira deveria acertar defesa alta');
});

test('projétil colide, causa dano e desaparece; projéteis se anulam', () => {
  const { m, c1, a, b } = fightMatch();
  place(a, b, 400);
  tap(m, c1, { special: true });
  run(m, 300);
  assert.strictEqual(m.projectiles.length, 1);
  run(m, 1500);
  assert.strictEqual(m.projectiles.length, 0);
  assert.ok(b.hp < b.maxHp);

  const t = fightMatch('pingui', 'bruxa');
  place(t.a, t.b, 600);
  t.c1.cur = { special: true }; t.c2.cur = { special: true };
  run(t.m, 50); t.c1.cur = {}; t.c2.cur = {};
  let clash = 0;
  t.m.on('clash', () => clash++);
  run(t.m, 1500);
  assert.ok(clash >= 1, 'projéteis deveriam se anular');
  assert.strictEqual(t.a.hp, t.a.maxHp);
  assert.strictEqual(t.b.hp, t.b.maxHp);
});

test('projétil que sai da arena é removido', () => {
  const { m, a } = fightMatch();
  const spec = Object.assign({}, a.def.specials.A.projectile);
  m.projectiles.push(new PF.Combat.Projectile(a, spec, { x: PF.STAGE_W + 150, vx: 900 }));
  run(m, 300);
  assert.strictEqual(m.projectiles.length, 0);
});

test('apenas um projétil próprio por vez e custo de energia', () => {
  const { m, c1, a, b } = fightMatch();
  place(a, b, 700);
  a.energy = 100;
  tap(m, c1, { special: true });
  run(m, 700);
  const e1 = a.energy;
  tap(m, c1, { special: true });
  run(m, 200);
  assert.strictEqual(m.projectiles.filter((p) => p.owner === a).length, 1);
  assert.ok(e1 < 100);
  run(m, 2000);
  a.energy = 0;
  tap(m, c1, { special: true });
  run(m, 400);
  assert.strictEqual(m.projectiles.length, 0, 'sem energia não deveria soltar especial');
});

test('supergolpe exige barra cheia', () => {
  const { m, c1, a, b } = fightMatch();
  place(a, b, 200);
  a.energy = 60;
  tap(m, c1, { super: true });
  assert.notStrictEqual(a.move && a.move.id, 'spS');
  run(m, 500);
  a.energy = 100;
  tap(m, c1, { super: true }, 17);
  assert.strictEqual(a.move && a.move.id, 'spS');
  assert.ok(a.energy < 5);
});

test('agarrão funciona perto e falha longe', () => {
  const { m, c1, a, b } = fightMatch();
  place(a, b, 5);
  tap(m, c1, { punch: true, kick: true }, 17);
  run(m, 300);
  assert.ok(b.hp < b.maxHp, 'agarrão deveria acertar');
  const t = fightMatch();
  place(t.a, t.b, 250);
  tap(t.m, t.c1, { punch: true, kick: true }, 17);
  run(t.m, 500);
  assert.strictEqual(t.b.hp, t.b.maxHp);
});

test('nocaute encerra o round e trava os lutadores', () => {
  const { m, c1, c2, a, b } = fightMatch();
  place(a, b, 5);
  b.hp = 1;
  tap(m, c1, { punch: true }, 17);
  run(m, 300);
  assert.ok(m.state === 'ko' || m.state === 'roundEnd');
  assert.ok(a.locked && b.locked);
  // nenhum golpe novo após o fim do round
  c1.cur = { punch: true }; c2.cur = { kick: true };
  const hpA = a.hp;
  let attacks = 0;
  m.on('fighter:attack', () => attacks++);
  run(m, 1500);
  assert.strictEqual(attacks, 0);
  assert.strictEqual(a.hp, hpA);
  run(m, 3000);
  assert.strictEqual(a.roundsWon, 1);
});

test('CPU não ataca depois do fim do round', () => {
  const m = new PF.Match({ p1: 'golem', p2: 'bruxa', c1: new PF.CPUController('dificil', 3), c2: new PF.CPUController('dificil', 4) });
  let after = 0, ended = false;
  m.on('ko', () => { ended = true; });
  m.on('timeover', () => { ended = true; });
  m.on('roundStart', () => { ended = false; });
  m.on('fighter:attack', () => { if (ended) after++; });
  for (let i = 0; i < 60 * 400 && m.state !== 'over'; i++) m.step(STEP);
  assert.strictEqual(m.state, 'over');
  assert.strictEqual(after, 0);
});

test('reinício de round restaura posição, vida, energia e projéteis', () => {
  const { m, a, b } = fightMatch();
  a.hp = 10; a.energy = 90; a.x = 100; a.state = 'hitstun';
  m.projectiles.push(new PF.Combat.Projectile(a, a.def.specials.A.projectile));
  m.scheduled.push({ t: 100, owner: a, fn: () => {} });
  m.startRound();
  assert.strictEqual(a.hp, a.maxHp);
  assert.strictEqual(a.energy, 25);
  assert.strictEqual(a.x, PF.STAGE_W / 2 - 170);
  assert.strictEqual(m.projectiles.length, 0);
  assert.strictEqual(m.scheduled.length, 0);
  assert.strictEqual(a.state, 'intro');
  assert.strictEqual(m.timer, m.opts.roundTime);
});

test('pausa não atualiza o combate', () => {
  const { m, c1, a } = fightMatch();
  c1.cur = { right: true };
  run(m, 100);
  m.setPaused(true);
  const x = a.x, t = m.time, timer = m.timer;
  run(m, 1000);
  assert.strictEqual(a.x, x);
  assert.strictEqual(m.time, t);
  assert.strictEqual(m.timer, timer);
  m.setPaused(false);
  run(m, 100);
  assert.ok(a.x > x);
});

test('combos longos perdem dano e terminam em queda (anti-infinito)', () => {
  const { m, a, b } = fightMatch();
  const lp = Object.assign({}, a.def.moves.lp);
  const dmg = [];
  for (let i = 0; i < 16; i++) {
    const before = b.hp;
    if (b.state === 'launched' || b.state === 'knockdown') break;
    PF.Combat.resolveHit(a, b, lp, { world: m });
    dmg.push(before - b.hp);
  }
  assert.ok(dmg[dmg.length - 1] < dmg[0], 'dano deveria escalar para baixo');
  assert.ok(['launched', 'knockdown'].includes(b.state) || b.comboHits <= 15);
  // caído: invulnerável
  b.setState('knockdown');
  assert.strictEqual(PF.Combat.resolveHit(a, b, lp, { world: m }), 'miss');
});

test('lutadores não se atravessam e não saem da arena', () => {
  const { m, c1, c2, a, b } = fightMatch();
  c1.cur = { right: true }; c2.cur = { left: true };
  run(m, 3000);
  assert.ok(a.x < b.x, 'atravessaram');
  const t = fightMatch();
  t.c1.cur = { left: true };
  run(t.m, 8000);
  assert.ok(t.a.x >= PF.STAGE_MARGIN);
  assert.ok(Math.abs(t.a.x - t.b.x) <= PF.VIEW_W - 130 + 1, 'saíram da tela');
});

test('tempo esgotado: vence quem tem mais vida', () => {
  const { m, a, b } = fightMatch('pingui', 'pingui', { roundTime: 2 });
  b.hp = 500;
  run(m, 2600);
  run(m, 4000);
  assert.strictEqual(a.roundsWon, 1);
});

test('treino não termina em nocaute', () => {
  const { m, a, b } = fightMatch('pingui', 'golem', { training: true });
  const big = Object.assign({}, a.def.moves.hp, { damage: 99999 });
  PF.Combat.resolveHit(a, b, big, { world: m });
  assert.strictEqual(b.hp, 1);
  run(m, 4000);
  assert.strictEqual(b.hp, b.maxHp, 'vida deveria recarregar');
  assert.strictEqual(m.state, 'fight');
});

test('animações avançam e não ficam presas', () => {
  const { m, c1, a } = fightMatch('rei', 'golem');
  const seen = new Set();
  for (let i = 0; i < 60; i++) { run(m, STEP); seen.add(PF.Anim.pose(a, m.time).frame); }
  assert.ok(seen.size > 1, 'idle preso em um quadro');
  c1.cur = { right: true };
  const walk = new Set();
  for (let i = 0; i < 40; i++) { run(m, STEP); walk.add(PF.Anim.pose(a, m.time).frame); }
  assert.ok(walk.size > 1, 'andar preso em um quadro');
  c1.cur = {};
  run(m, 100);
  tap(m, c1, { punch: true }, 17);
  const atk = new Set();
  while (a.state === 'attack') { atk.add(PF.Anim.pose(a, m.time).frame); run(m, STEP); }
  assert.ok(atk.size > 1, 'ataque preso em um quadro');
  assert.notStrictEqual(a.state, 'attack');
});

test('partidas completas CPU x CPU sem erros em todos os confrontos', () => {
  for (const p1 of PF.CHARACTER_ORDER) for (const p2 of PF.CHARACTER_ORDER) {
    const m = new PF.Match({ p1, p2, c1: new PF.CPUController('normal', 7), c2: new PF.CPUController('dificil', 8) });
    let n = 0;
    while (m.state !== 'over' && n < 60 * 600) { m.step(STEP); n++; }
    assert.strictEqual(m.state, 'over', `${p1} x ${p2} não terminou`);
    for (const f of m.fighters) {
      assert.ok(Number.isFinite(f.x) && Number.isFinite(f.y));
      assert.ok(f.hp >= 0 && f.hp <= f.maxHp);
    }
  }
});
