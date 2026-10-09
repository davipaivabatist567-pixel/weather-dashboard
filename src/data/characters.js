// Definição dos personagens: atributos, animações e golpes.
// Para adicionar um personagem novo basta acrescentar uma entrada em
// PF.CHARACTERS (e, opcionalmente, um atlas em assets/sprites). O sistema de
// combate não precisa ser alterado.
(function () {
  const PF = globalThis.PF;

  // ---------------------------------------------------------------------
  // Golpes normais gerados a partir dos atributos do personagem.
  // Tempos em milissegundos. Hitbox: x = distância à frente do centro,
  // y = altura da base da caixa acima do chão.
  // ---------------------------------------------------------------------
  function normals(c) {
    const H = c.bodyH, R = c.reach, P = c.power, X = c.bodyW * 0.35;
    const hb = (y, h, w, x = X) => ({ x, y: H * y, w, h: H * h });
    const list = {
      lp: { name: 'Soco fraco', anim: 'punch', startup: 67, active: 50, recovery: 117,
        damage: 32 * P, hitstun: 260, blockstun: 170, push: 70, height: 'mid',
        hitbox: hb(0.55, 0.2, R * 0.75), chain: { punch: 'mp', kick: 'lk' }, cancel: true, stun: 6, sfx: 'light' },
      mp: { name: 'Soco médio', anim: 'punch', startup: 100, active: 50, recovery: 183,
        damage: 55 * P, hitstun: 310, blockstun: 200, push: 90, height: 'mid', lunge: 18,
        hitbox: hb(0.5, 0.24, R * 0.9), chain: { kick: 'hk' }, cancel: true, stun: 10, sfx: 'medium' },
      hp: { name: 'Soco forte', anim: 'punch', startup: 150, active: 67, recovery: 283,
        damage: 85 * P, hitstun: 380, blockstun: 230, push: 120, height: 'mid', lunge: 26,
        hitbox: hb(0.45, 0.3, R * 1.05), superCancel: true, stun: 16, sfx: 'heavy' },
      lk: { name: 'Chute fraco', anim: 'kick', startup: 83, active: 50, recovery: 150,
        damage: 40 * P, hitstun: 270, blockstun: 170, push: 80, height: 'mid',
        hitbox: hb(0.3, 0.22, R * 0.95), chain: { kick: 'mk' }, cancel: true, stun: 7, sfx: 'light' },
      mk: { name: 'Chute médio', anim: 'kick', startup: 117, active: 67, recovery: 217,
        damage: 62 * P, hitstun: 320, blockstun: 210, push: 100, height: 'mid', lunge: 14,
        hitbox: hb(0.35, 0.25, R * 1.1), cancel: true, stun: 11, sfx: 'medium' },
      hk: { name: 'Chute forte (combo)', anim: 'kick', startup: 133, active: 67, recovery: 333,
        damage: 90 * P, hitstun: 420, blockstun: 240, push: 140, height: 'mid', lunge: 20,
        knockdown: true, launch: { vx: 330, vy: 620 },
        hitbox: hb(0.35, 0.35, R * 1.1), superCancel: true, stun: 18, sfx: 'heavy' },
      cp: { name: 'Soco agachado', anim: 'punch', startup: 83, active: 50, recovery: 133, crouch: true,
        damage: 35 * P, hitstun: 260, blockstun: 170, push: 70, height: 'mid',
        hitbox: hb(0.25, 0.18, R * 0.85), chain: { kick: 'sweep' }, cancel: true, stun: 6, sfx: 'light' },
      sweep: { name: 'Rasteira', anim: 'kick', startup: 133, active: 67, recovery: 333, crouch: true,
        damage: 70 * P, hitstun: 400, blockstun: 230, push: 110, height: 'low',
        knockdown: true, launch: { vx: 120, vy: 260 },
        hitbox: hb(0, 0.16, R * 1.25), stun: 12, sfx: 'heavy' },
      jp: { name: 'Soco aéreo', anim: 'punch', startup: 83, active: 167, recovery: 83, air: true,
        damage: 55 * P, hitstun: 330, blockstun: 200, push: 70, height: 'high',
        hitbox: hb(0.2, 0.3, R * 0.8, X * 0.6), stun: 10, sfx: 'medium' },
      jk: { name: 'Chute aéreo', anim: 'kick', startup: 100, active: 200, recovery: 83, air: true,
        damage: 66 * P, hitstun: 350, blockstun: 210, push: 80, height: 'high',
        hitbox: hb(0.0, 0.3, R * 0.95, X * 0.6), stun: 12, sfx: 'medium' },
      throw: { name: 'Agarrão', anim: 'punch', startup: 83, active: 33, recovery: 400, throw: true,
        damage: 110 * P, range: 40, hitstun: 0, blockstun: 0, push: 0, height: 'throw',
        knockdown: true, launch: { vx: 360, vy: 520 }, hitbox: hb(0.2, 0.6, 30), stun: 15, sfx: 'heavy' },
    };
    // personagens pesados atacam mais devagar; leves, mais rápido
    const fm = c.frameMult || 1;
    for (const m of Object.values(list)) {
      if (m.throw) continue;
      m.startup = Math.round(m.startup * fm);
      m.recovery = Math.round(m.recovery * fm);
    }
    return list;
  }

  // utilitário para projéteis
  const proj = (o) => Object.assign({ w: 50, h: 40, speed: 520, life: 2200, hits: 1, hitInterval: 120,
    hitstun: 360, blockstun: 230, push: 90, height: 'mid', y: 0.55, kind: 'ball', scale: 1.4 }, o);

  // ---------------------------------------------------------------------
  // Personagens
  // ---------------------------------------------------------------------
  const CHARACTERS = {
    pingui: {
      id: 'pingui', name: 'Pingui', title: 'Herói do Gelo', color: '#4fc3ff',
      desc: 'Equilibrado, rápido e com golpes de gelo.',
      hp: 1000, walk: 200, back: 160, dash: 520, jumpV: 900, gravity: 2600, airSpeed: 230,
      bodyW: 70, bodyH: 120, reach: 72, power: 1.04, defense: 1.0, weight: 1.0, stunMax: 85, frameMult: 0.9,
      scale: 2.15,
      sprites: {
        idle: { from: 'idle' }, walk: { from: 'walk', seq: [0], extra: 'walkBob' },
        run: { from: 'run' }, jumpUp: { from: 'jump' }, jumpDown: { from: 'jump' },
        punch: { from: 'attack' }, kick: { from: 'run' }, special: { from: 'attack' },
        hit: { from: 'hit' }, defeat: { from: 'defeat' }, victory: { from: 'jump' },
      },
      specials: {
        A: { name: 'Bola de Gelo', anim: 'special', startup: 200, active: 50, recovery: 333, cost: 10,
          projectile: proj({ sprite: 'iceball', speed: 560, damage: 62, w: 52, h: 34, scale: 1.3, chip: 8, freeze: true }) },
        B: { name: 'Investida Congelante', anim: 'run', startup: 117, active: 333, recovery: 300, cost: 15,
          rush: 560, damage: 80, hitstun: 420, blockstun: 260, push: 130, height: 'mid', chip: 10,
          knockdown: true, launch: { vx: 330, vy: 520 }, hitbox: { x: 10, y: 20, w: 70, h: 80 },
          trail: '#7fdcff', stun: 18, sfx: 'heavy' },
        C: { name: 'Tempestade Polar', anim: 'jumpUp', startup: 67, active: 400, recovery: 400, cost: 20,
          invuln: [0, 250], hop: 620, multi: 3, hitInterval: 120, damage: 34, hitstun: 300, blockstun: 160,
          push: 60, height: 'mid', chip: 5, knockdown: true, launch: { vx: 200, vy: 640 },
          hitbox: { x: -50, y: 0, w: 120, h: 170 }, aura: 'storm', stun: 8, sfx: 'medium' },
        S: { name: 'Nevasca Suprema', anim: 'special', startup: 300, active: 100, recovery: 500, cost: 100,
          invuln: [0, 300], superFlash: true,
          projectile: proj({ sprite: 'rajada', speed: 760, damage: 46, hits: 5, hitInterval: 90, w: 150, h: 70,
            scale: 1.6, chip: 6, knockdownLast: true }) },
      },
    },

    rei: {
      id: 'rei', name: 'Rei Gélido', title: 'Chefe – Senhor do Gelo', color: '#8fd8ff', boss: true,
      desc: 'Pesado e poderoso. Rajadas congelantes e barreiras de gelo.',
      hp: 1000, walk: 145, back: 115, dash: 420, jumpV: 820, gravity: 2600, airSpeed: 190,
      bodyW: 92, bodyH: 150, reach: 76, power: 1.0, defense: 1.0, weight: 1.2, stunMax: 95, frameMult: 1.12,
      scale: 2.15,
      sprites: {
        idle: { from: 'idle', seq: [0, 1, 2, 1] }, walk: { from: 'walk' }, run: { from: 'run' },
        jumpUp: { from: 'jump', seq: [0, 1] }, jumpDown: { from: 'fall', seq: [0] },
        punch: { from: 'attack' }, kick: { from: 'jump', seq: [2, 3] }, special: { from: 'special' },
        victory: { from: 'victory' }, defeat: { from: 'defeat' },
      },
      specials: {
        A: { name: 'Rajada de Gelo', anim: 'special', startup: 233, active: 50, recovery: 367, cost: 10,
          projectile: proj({ sprite: 'rajada', speed: 560, damage: 62, w: 100, h: 42, scale: 1.25, chip: 9, freeze: true }) },
        B: { name: 'Escudo Glacial', anim: 'special', startup: 150, active: 700, recovery: 300, cost: 15,
          wall: { sprite: 'crystals', x: 70, w: 70, h: 150, absorbs: true }, damage: 45, hitstun: 330,
          blockstun: 200, push: 160, height: 'mid', chip: 5, hitbox: { x: 40, y: 0, w: 80, h: 150 },
          stun: 10, sfx: 'medium' },
        C: { name: 'Tornado Congelante', anim: 'special', startup: 267, active: 50, recovery: 433, cost: 20,
          projectile: proj({ sprite: 'storm', speed: 260, damage: 24, hits: 4, hitInterval: 160, w: 70, h: 130,
            y: 0, scale: 2.0, life: 2600, kind: 'tornado', chip: 4, knockdownLast: true }) },
        S: { name: 'Era do Gelo', anim: 'special', startup: 333, active: 100, recovery: 600, cost: 100,
          invuln: [0, 333], superFlash: true,
          projectile: proj({ sprite: 'tempestade', speed: 0, damage: 42, hits: 6, hitInterval: 110, w: 260, h: 170,
            y: 0, scale: 1.6, life: 900, kind: 'area', targetOpponent: true, chip: 5, knockdownLast: true }) },
      },
    },

    capitao: {
      id: 'capitao', name: 'Capitão Barracuda', title: 'Pirata dos Mares Gelados', color: '#ff7a45',
      desc: 'Canhões, âncoras e muita força no curto alcance.',
      hp: 1000, walk: 170, back: 140, dash: 480, jumpV: 860, gravity: 2600, airSpeed: 210,
      bodyW: 80, bodyH: 135, reach: 78, power: 1.08, defense: 1.0, weight: 1.05, stunMax: 88, frameMult: 1.0,
      scale: 2.05,
      sprites: {
        idle: { from: 'idle', seq: [0, 1, 2, 3] }, walk: { from: 'walk' }, run: { from: 'run' },
        jumpUp: { from: 'jump', seq: [0] }, jumpDown: { from: 'jump', seq: [1] },
        punch: { from: 'special', seq: [0, 1] }, kick: { from: 'run', seq: [1, 2] },
        special: { from: 'attack' }, victory: { from: 'victory' }, defeat: { from: 'defeat' },
      },
      specials: {
        A: { name: 'Tiro de Canhão', anim: 'special', startup: 283, active: 50, recovery: 383, cost: 10,
          muzzle: 'cannonfire',
          projectile: proj({ sprite: 'cannonball', speed: 600, damage: 76, w: 36, h: 36, scale: 1, chip: 10,
            explode: 'explosion' }) },
        B: { name: 'Ataque de Âncora', anim: 'punch', startup: 167, active: 50, recovery: 383, cost: 15,
          projectile: proj({ sprite: 'anchor', speed: 430, damage: 85, w: 50, h: 56, scale: 1.25, life: 1100,
            gravity: 900, vy: 380, spin: 10, kind: 'arc', chip: 10, knockdownLast: true }) },
        C: { name: 'Chuva de Balas de Canhão', anim: 'special', startup: 300, active: 50, recovery: 450, cost: 20,
          rain: { count: 3, delay: 260, spread: 70, damage: 40 } },
        S: { name: 'Bombardeio Total', anim: 'special', startup: 333, active: 100, recovery: 600, cost: 100,
          invuln: [0, 333], superFlash: true, rain: { count: 7, delay: 140, spread: 90, damage: 34 } },
      },
    },

    golem: {
      id: 'golem', name: 'Golem de Neve', title: 'Guardião do Gelo', color: '#cfe8ff',
      desc: 'Lento e resistente. Socos esmagadores e terremotos.',
      hp: 1120, walk: 125, back: 100, dash: 380, jumpV: 780, gravity: 2700, airSpeed: 170,
      bodyW: 100, bodyH: 160, reach: 80, power: 1.1, defense: 1.04, weight: 1.4, stunMax: 105, frameMult: 1.2,
      scale: 2.25,
      sprites: {
        idle: { from: 'idle', seq: [0, 1, 2, 1] }, walk: { from: 'walk' }, run: { from: 'walk' },
        jumpUp: { from: 'jump', seq: [0, 1] }, jumpDown: { from: 'fall', seq: [0] },
        punch: { from: 'attack' }, kick: { from: 'jump', seq: [2] }, special: { from: 'special', seq: [1] },
        quake: { from: 'special', seq: [0] }, victory: { from: 'victory' }, defeat: { from: 'defeat' },
      },
      specials: {
        A: { name: 'Soco Sísmico', anim: 'punch', startup: 250, active: 83, recovery: 400, cost: 10,
          armor: 1, rush: 300, damage: 115, hitstun: 450, blockstun: 280, push: 170, height: 'mid', chip: 14,
          knockdown: true, launch: { vx: 420, vy: 480 }, hitbox: { x: 30, y: 60, w: 110, h: 60 },
          impactFx: 'punchfx', stun: 25, sfx: 'heavy', shake: 8 },
        B: { name: 'Terremoto', anim: 'quake', startup: 300, active: 50, recovery: 450, cost: 15,
          projectile: proj({ sprite: 'quake', speed: 380, damage: 72, w: 90, h: 70, y: 0, scale: 1.2, life: 1300,
            kind: 'ground', height: 'low', chip: 9, knockdownLast: true }) },
        C: { name: 'Avalanche', anim: 'special', startup: 267, active: 50, recovery: 433, cost: 20,
          projectile: proj({ sprite: 'crystals', speed: 470, damage: 36, hits: 3, hitInterval: 110, w: 120, h: 60,
            scale: 1.1, chip: 5, knockdownLast: true }) },
        S: { name: 'Fúria do Glaciar', anim: 'special', startup: 333, active: 100, recovery: 600, cost: 100,
          invuln: [0, 333], superFlash: true,
          projectile: proj({ sprite: 'beam', speed: 700, damage: 52, hits: 5, hitInterval: 90, w: 170, h: 70,
            scale: 1.6, chip: 6, knockdownLast: true }) },
      },
    },

    bruxa: {
      id: 'bruxa', name: 'Bruxa Aurora', title: 'Manipula os Ventos', color: '#c77dff',
      desc: 'Ágil e imprevisível. Magia, vórtices e teleporte.',
      hp: 960, walk: 215, back: 180, dash: 560, jumpV: 930, gravity: 2500, airSpeed: 250,
      bodyW: 66, bodyH: 125, reach: 74, power: 1.02, defense: 0.98, weight: 0.9, stunMax: 80, frameMult: 0.85,
      scale: 2.15,
      sprites: {
        // quadros 1 e 2 do "parado" e o 2 da corrida têm escala/pose diferentes na prancha
        idle: { from: 'idle', seq: [0] }, walk: { from: 'walk' }, run: { from: 'run', seq: [0, 1, 3] },
        jumpUp: { from: 'run', seq: [1] }, jumpDown: { from: 'run', seq: [3] },
        punch: { from: 'attack' }, kick: { from: 'run', seq: [0, 1] }, special: { from: 'special' },
        victory: { from: 'victory' }, defeat: { from: 'defeat' },
      },
      specials: {
        A: { name: 'Raio Mágico', anim: 'special', startup: 200, active: 50, recovery: 333, cost: 10,
          projectile: proj({ sprite: 'magicbeam', speed: 760, damage: 66, w: 100, h: 34, scale: 1.25, chip: 8 }) },
        B: { name: 'Teleporte Arcano', anim: 'special', startup: 100, active: 50, recovery: 250, cost: 15,
          teleport: true, invuln: [0, 400] },
        C: { name: 'Vórtice', anim: 'special', startup: 250, active: 50, recovery: 400, cost: 20,
          projectile: proj({ sprite: 'vortex', speed: 120, damage: 28, hits: 4, hitInterval: 150, w: 110, h: 120,
            y: 0, scale: 1.3, life: 1600, kind: 'tornado', pull: 160, chip: 4, knockdownLast: true }) },
        S: { name: 'Aurora Boreal', anim: 'special', startup: 300, active: 100, recovery: 550, cost: 100,
          invuln: [0, 300], superFlash: true,
          projectile: proj({ sprite: 'magicbeam', speed: 820, damage: 44, hits: 6, hitInterval: 80, w: 190, h: 60,
            scale: 2.0, chip: 6, knockdownLast: true }) },
      },
    },
  };

  // Completa cada personagem com golpes normais e valores padrão.
  for (const c of Object.values(CHARACTERS)) {
    c.moves = normals(c);
    for (const [k, s] of Object.entries(c.specials)) {
      s.special = true;
      s.key = k;
      s.isSuper = k === 'S';
      s.height = s.height || 'mid';
      s.stun = s.stun || 10;
      s.sfx = s.sfx || 'special';
      if (s.damage) s.damage *= 1; // valores já ajustados manualmente
      c.moves['sp' + k] = s;
    }
    for (const [k, m] of Object.entries(c.moves)) m.id = k;
  }

  PF.CHARACTERS = CHARACTERS;
  PF.CHARACTER_ORDER = ['pingui', 'rei', 'capitao', 'golem', 'bruxa'];

  // Comandos dos especiais (iguais para todos; o conteúdo do golpe muda).
  PF.SPECIAL_COMMANDS = [
    { key: 'A', motion: 'qcf', text: '↓ ↘ → + Soco  (ou U)' },
    { key: 'B', motion: 'ff', text: '→ → + Soco  (ou → + U)' },
    { key: 'C', motion: 'qcb', text: '↓ ↙ ← + Soco  (ou ↓ + U)' },
    { key: 'S', motion: 'super', text: 'Barra cheia + Soco + Chute  (ou botão SUPER)' },
  ];
})();
