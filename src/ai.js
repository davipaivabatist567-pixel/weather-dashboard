// Inteligência artificial da CPU.
// A CPU só "enxerga" o estado público da luta (posição, estado e golpe do
// oponente) com um atraso de reação, e age apertando os mesmos botões de um
// jogador. Ela nunca lê a entrada do jogador nem causa dano diretamente.
(function () {
  const PF = globalThis.PF;

  const LEVELS = {
    facil:   { react: 420, think: 480, block: 0.18, aggro: 0.45, combo: 0.15, special: 0.12, antiAir: 0.15, throwRate: 0.05, superRate: 0.25 },
    normal:  { react: 260, think: 300, block: 0.5,  aggro: 0.6,  combo: 0.55, special: 0.25, antiAir: 0.45, throwRate: 0.12, superRate: 0.6 },
    dificil: { react: 150, think: 170, block: 0.78, aggro: 0.72, combo: 0.9,  special: 0.35, antiAir: 0.75, throwRate: 0.2,  superRate: 0.9 },
  };
  PF.AI_LEVELS = LEVELS;
  PF.AI_LEVEL_NAMES = { facil: 'Fácil', normal: 'Normal', dificil: 'Difícil' };

  class CPUController {
    constructor(level = 'normal', seed) {
      this.setLevel(level);
      this.rng = PF.makeRng(seed || (Math.random() * 1e9) | 0);
      this.reset();
    }
    setLevel(level) {
      this.levelName = LEVELS[level] ? level : 'normal';
      this.cfg = Object.assign({}, LEVELS[this.levelName]);
    }
    reset() {
      this.queue = [];
      this.thinkT = 0;
      this.snapshots = [];
      this.holdBlock = 0;
      this.holdLow = false;
      this.oppBlocks = 0;
      this.t = 0;
    }

    // guarda o que a CPU "viu" para aplicar o tempo de reação
    observe(match, me, opp) {
      this.snapshots.push({
        t: this.t, x: opp.x, y: opp.y, vy: opp.vy, state: opp.state,
        phase: opp.phase(), move: opp.move, grounded: opp.grounded,
        threat: match.projectiles.some((p) => p.owner === opp && !p.dead && p.kind !== 'wall' &&
          Math.abs(p.x - me.x) < 340 && (Math.sign(me.x - p.x) === Math.sign(p.vx) || p.kind === 'area' || p.kind === 'fall')),
      });
      while (this.snapshots.length > 2 && this.snapshots[1].t <= this.t - this.cfg.react) this.snapshots.shift();
    }
    seen() {
      // instantâneo de "react" ms atrás
      for (let i = this.snapshots.length - 1; i >= 0; i--) if (this.snapshots[i].t <= this.t - this.cfg.react) return this.snapshots[i];
      return this.snapshots[0];
    }

    push(ms, rel) { this.queue.push({ ms, rel }); }
    press(btn, rel = {}) { this.push(50, Object.assign({}, rel, { [btn]: true })); this.push(34, {}); }

    read(match, me) {
      const dt = PF.STEP_MS;
      this.t += dt;
      const opp = match.opponentOf(me);
      if (!opp) return PF.emptyInput();
      this.observe(match, me, opp);
      const s = this.seen();
      const rnd = this.rng;
      const cfg = this.cfg;
      const gap = Math.abs(opp.x - me.x) - (me.def.bodyW + opp.def.bodyW) / 2;
      const myReach = me.def.reach;

      if (opp.state === 'blockstun' && opp.stateTime < 20) this.oppBlocks++;

      // continua defendendo enquanto estiver em bloqueio
      if (me.state === 'blockstun') this.holdBlock = Math.max(this.holdBlock, 140);

      // reação defensiva (baseada no que foi visto com atraso)
      if (me.canAct && this.holdBlock <= 0 && s) {
        const oppAtk = s.state === 'attack' && s.move && s.phase !== 'recovery';
        const range = (s.move && s.move.hitbox ? s.move.hitbox.x + s.move.hitbox.w : 0) + 30;
        const danger = (oppAtk && (gap < range || s.move.rush)) || s.threat;
        if (danger && !this.decidedFor(s)) {
          this.lastDecision = s;
          if (rnd() < cfg.block) {
            this.queue = [];
            this.holdBlock = 260 + rnd() * 160;
            this.holdLow = !!(s.move && s.move.height === 'low');
            if (s.move && s.move.height === 'high') this.holdLow = false;
          } else if (s.threat && rnd() < cfg.antiAir * 0.5 && gap > 120) {
            this.queue = [];
            this.push(60, { up: true, fwd: true });
            this.push(300, {});
            this.press('kick');
          }
        }
      }
      // antecipação: oponente perto e livre para atacar -> às vezes já defende
      if (me.canAct && this.holdBlock <= 0 && !this.queue.length && gap < opp.def.reach * 1.2 &&
          ['idle', 'walk', 'dash', 'run'].includes(opp.state) && this.rng() < cfg.block * 0.04) {
        this.holdBlock = 200 + this.rng() * 200;
        this.holdLow = this.rng() < 0.4;
      }
      if (this.holdBlock > 0) {
        this.holdBlock -= dt;
        return this.toAbs(me, { block: true, down: this.holdLow });
      }

      // executa plano atual
      if (this.queue.length) {
        const cur = this.queue[0];
        cur.ms -= dt;
        if (cur.ms <= 0) this.queue.shift();
        return this.toAbs(me, cur.rel);
      }

      this.thinkT -= dt;
      if (this.thinkT > 0 || !me.canAct) {
        // combo: se acertou um golpe, tenta continuar (respeitando as regras normais)
        if (me.state === 'attack' && me.contact && me.move && me.move.chain && rnd() < cfg.combo * 0.25) {
          const btn = me.move.chain.punch ? 'punch' : 'kick';
          this.press(btn);
        }
        return PF.emptyInput();
      }
      this.thinkT = cfg.think * (0.6 + rnd() * 0.8);
      this.decide(match, me, opp, s, gap, myReach);
      return PF.emptyInput();
    }

    decidedFor(s) { return this.lastDecision && this.lastDecision.move === s.move && this.lastDecision.state === s.state && s.state === 'attack'; }

    decide(match, me, opp, s, gap, reach) {
      const rnd = this.rng, cfg = this.cfg;
      const energy = me.energy;
      const sp = (k) => me.canUseSpecial('sp' + k);

      // supergolpe
      if (energy >= 100 && gap < 420 && rnd() < cfg.superRate * 0.5) { this.press('super'); return; }

      // anti-aéreo
      if (s && !s.grounded && s.vy < 200 && gap < 200 && rnd() < cfg.antiAir) {
        if (sp('C') && rnd() < 0.5) this.press('special', { down: true });
        else this.press('punch', { fwd: true });
        return;
      }

      // punição: oponente em recuperação ou atordoado
      const vulnerable = opp.state === 'dizzy' || (opp.state === 'attack' && opp.phase() === 'recovery') || opp.state === 'land';
      if (vulnerable && gap < reach * 1.1 && rnd() < cfg.aggro + 0.2) {
        this.combo(me, rnd() < cfg.combo);
        return;
      }

      if (gap > 260) {
        const r = rnd();
        if (sp('A') && r < cfg.special) { this.press('special'); return; }
        if (r < cfg.special + 0.12 && sp('B') && me.def.id === 'bruxa') { this.press('special', { fwd: true }); return; }
        if (r < 0.75 * cfg.aggro + 0.2) { this.push(250 + rnd() * 350, { fwd: true }); return; }
        if (r < 0.9) { this.push(60, { fwd: true }); this.push(40, {}); this.push(60, { fwd: true }); this.push(200, { fwd: true }); return; }
        this.push(300, {});
        return;
      }
      if (gap > reach * 0.9) {
        const r = rnd();
        if (r < 0.18 * cfg.aggro) { // pulo com ataque
          this.push(60, { up: true, fwd: true }); this.push(330, {}); this.press('kick'); return;
        }
        if (r < 0.28 && sp('B') && me.def.specials.B.rush) { this.press('special', { fwd: true }); return; }
        if (r < 0.36 && sp('A')) { this.press('special'); return; }
        if (r < 0.85) { this.push(160 + rnd() * 220, { fwd: true }); return; }
        this.push(200, { back: true });
        return;
      }
      // perto
      const r = rnd();
      if (this.oppBlocks > 2 && r < cfg.throwRate * 3) { this.oppBlocks = 0; this.push(50, { punch: true, kick: true }); this.push(40, {}); return; }
      if (r < cfg.aggro) { this.combo(me, rnd() < cfg.combo); return; }
      if (r < cfg.aggro + 0.12) { this.press('kick', { down: true }); return; }
      if (r < cfg.aggro + 0.2 && sp('C')) { this.press('special', { down: true }); return; }
      if (r < 0.92) { this.push(220, { back: true }); return; }
      this.push(250, { block: true });
    }

    combo(me, full) {
      if (full) {
        this.press('punch'); this.push(90, {});
        this.press('punch'); this.push(130, {});
        if (me.energy >= 20 && this.rng() < 0.4) this.press('special');
        else this.press('kick');
      } else {
        this.press(this.rng() < 0.5 ? 'punch' : 'kick', this.rng() < 0.4 ? { fwd: true } : {});
      }
    }

    // converte frente/trás em esquerda/direita
    toAbs(me, rel) {
      const o = PF.emptyInput();
      const fwdRight = me.facing > 0;
      if (rel.fwd) o[fwdRight ? 'right' : 'left'] = true;
      if (rel.back) o[fwdRight ? 'left' : 'right'] = true;
      for (const k of ['up', 'down', 'punch', 'kick', 'block', 'special', 'super']) if (rel[k]) o[k] = true;
      return o;
    }
  }
  PF.CPUController = CPUController;

  // Boneco do modo treino
  PF.DummyController = class {
    constructor(mode = 'stand') { this.mode = mode; this.cpu = new CPUController('normal'); }
    reset() { this.cpu.reset(); }
    read(match, me) {
      const o = PF.emptyInput();
      switch (this.mode) {
        case 'crouch': o.down = true; break;
        case 'block': o.block = true; break;
        case 'blockLow': o.block = true; o.down = true; break;
        case 'jump': o.up = true; break;
        case 'cpu': return this.cpu.read(match, me);
        default: break;
      }
      return o;
    }
  };
  PF.DUMMY_MODES = { stand: 'Parado', crouch: 'Agachado', block: 'Defendendo', blockLow: 'Defesa baixa', jump: 'Pulando', cpu: 'CPU', p2: 'Jogador 2' };
})();
