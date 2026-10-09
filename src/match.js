// Partida: rounds, cronômetro, projéteis, eventos e regras de vitória.
// Todos os modos (Arcade, CPU, 2 jogadores, Treino, Sobrevivência) usam esta
// mesma classe, apenas com opções diferentes.
(function () {
  const PF = globalThis.PF;
  const { clamp } = PF;

  const INTRO_MS = 1500, FIGHT_TEXT_MS = 700, KO_SLOW_MS = 1300, ROUND_END_MS = 2300;

  class Match {
    constructor(opts) {
      this.opts = Object.assign({
        roundsToWin: 2, roundTime: 99, training: false, maxRounds: 5,
        p1: 'pingui', p2: 'rei', p1Opts: {}, p2Opts: {}, stage: 'gelo', keepHp: null,
      }, opts);
      const C = PF.CHARACTERS;
      this.fighters = [
        new PF.Fighter(C[this.opts.p1], 1, this.opts.p1Opts),
        new PF.Fighter(C[this.opts.p2], 2, this.opts.p2Opts),
      ];
      if (this.opts.training) for (const f of this.fighters) f.noKO = true;
      if (this.opts.keepHp != null) this.fighters[0].hp = clamp(this.opts.keepHp, 1, this.fighters[0].maxHp);
      this.controllers = [opts.c1 || null, opts.c2 || null];
      this.events = new PF.Events();
      this.projectiles = [];
      this.scheduled = [];
      this.round = 0;
      this.time = 0;          // tempo total simulado
      this.timer = this.opts.roundTime;
      this.state = 'init';
      this.stateTime = 0;
      this.superFreeze = 0;
      this.superOwner = null;
      this.paused = false;
      this.result = null;     // { winner: 0|1|2, reason }
      this.roundResults = [];
      this.message = null;
      this.slowmo = 1;
      this.trainingRefill = 0;
      this.stats = { hits: [0, 0], maxCombo: [0, 0] };
      this.startRound();
    }

    on(name, fn) { this.events.on(name, fn); }
    emit(name, data) { this.events.emit(name, data); }
    opponentOf(f) { return f === this.fighters[0] ? this.fighters[1] : this.fighters[0]; }

    startRound() {
      this.round++;
      const [a, b] = this.fighters;
      const keep = this.opts.keepHp != null && this.round === 1;
      a.resetForRound(PF.STAGE_W / 2 - 170, keep);
      b.resetForRound(PF.STAGE_W / 2 + 170);
      for (const f of this.fighters) { f.locked = true; f.setState('intro'); }
      this.projectiles = [];
      this.scheduled = [];
      this.timer = this.opts.roundTime;
      this.superFreeze = 0;
      this.slowmo = 1;
      this.setState(this.opts.training ? 'fight' : 'intro');
      if (this.opts.training) { this.unlock(); this.message = null; }
      else this.message = { text: this.isFinalRound() ? 'ROUND FINAL' : 'ROUND ' + this.round, sub: '', t: 0 };
      for (const c of this.controllers) if (c && c.reset) c.reset();
      this.emit('roundStart', { round: this.round });
    }

    isFinalRound() {
      const [a, b] = this.fighters, n = this.opts.roundsToWin - 1;
      return a.roundsWon === n && b.roundsWon === n && this.round > 1;
    }

    unlock() {
      for (const f of this.fighters) { f.locked = false; if (f.state === 'intro') f.setState('idle'); }
    }

    setState(s) { this.state = s; this.stateTime = 0; }

    // --------------------------------------------------------------
    // Passo fixo de simulação
    // --------------------------------------------------------------
    step(dt) {
      if (this.paused || this.state === 'over') return;
      this.time += dt;
      this.stateTime += dt;
      if (this.message) this.message.t += dt;

      if (this.superFreeze > 0) {
        this.superFreeze = Math.max(0, this.superFreeze - dt);
        // o dono do super continua a contar a preparação; o resto congela
        return;
      }

      const sdt = dt * this.slowmo;
      switch (this.state) {
        case 'intro':
          this.updateFighters(sdt, false);
          if (this.stateTime >= INTRO_MS && !this.fightAnnounced) {
            this.fightAnnounced = true;
            this.message = { text: 'LUTE!', sub: '', t: 0 };
            this.unlock();
            this.emit('fight');
            this.setState('fight');
            this.fightAnnounced = false;
          }
          break;
        case 'fight':
          if (this.message && this.message.t > FIGHT_TEXT_MS) this.message = null;
          this.updateFighters(sdt, true);
          if (!this.opts.training) {
            this.timer = Math.max(0, this.timer - sdt / 1000);
            this.checkRoundEnd();
          } else this.updateTraining(dt);
          break;
        case 'ko':
          this.updateFighters(sdt, true);
          if (this.stateTime > 450) this.slowmo = 1;
          if (this.stateTime >= KO_SLOW_MS && this.fightersSettled()) this.finishRound();
          break;
        case 'roundEnd':
          this.updateFighters(sdt, true);
          if (this.stateTime >= ROUND_END_MS) this.nextRoundOrEnd();
          break;
      }
    }

    fightersSettled() {
      return this.fighters.every((f) => f.grounded && f.hitstop <= 0) || this.stateTime > 3500;
    }

    updateFighters(dt, active) {
      const [a, b] = this.fighters;
      // entrada (lutador travado recebe entrada vazia)
      for (let i = 0; i < 2; i++) {
        const f = this.fighters[i], c = this.controllers[i];
        let raw = PF.emptyInput();
        if (c && !f.locked && active) {
          try { raw = c.read(this, f) || raw; } catch (e) { console.error('Erro no controle', e); }
        }
        f.input.push(raw, f.facing, dt);
      }
      const prevA = a.x, prevB = b.x;
      a.update(dt, this);
      b.update(dt, this);

      // os dois sempre visíveis: distância máxima limitada pela câmera
      const maxDist = PF.VIEW_W - 130;
      if (Math.abs(a.x - b.x) > maxDist) {
        a.x = clamp(a.x, prevB - maxDist, prevB + maxDist);
        b.x = clamp(b.x, a.x - maxDist, a.x + maxDist);
      }
      PF.Combat.separate(a, b);

      // golpes corpo a corpo (testados antes de aplicar: permite trocas)
      const pa = PF.Combat.meleeProbe(a, b), pb = PF.Combat.meleeProbe(b, a);
      if (pa) PF.Combat.applyMelee(a, b, pa, this);
      if (pb) PF.Combat.applyMelee(b, a, pb, this);

      // agendados (chuva de balas etc.)
      for (const s of this.scheduled) {
        s.t -= dt;
        if (s.t <= 0 && !s.done) { s.done = true; if (!s.owner.isKO) s.fn(); }
      }
      this.scheduled = this.scheduled.filter((s) => !s.done);

      // projéteis
      for (const p of this.projectiles) p.update(dt, this);
      PF.Combat.clashProjectiles(this.projectiles, this);
      for (const p of this.projectiles) {
        if (p.dead) continue;
        const target = this.opponentOf(p.owner);
        const r = p.tryHit(target, this);
        if (r) this.emit('projHit', { p, result: r });
      }
      this.projectiles = this.projectiles.filter((p) => !p.dead);

      // eventos internos dos lutadores (som/efeitos)
      for (const f of this.fighters) {
        if (f.events.length) {
          for (const ev of f.events) this.emit('fighter:' + ev.type, { fighter: f, data: ev.data });
          f.events.length = 0;
        }
      }
      // estatísticas de combo
      for (let i = 0; i < 2; i++) {
        const victim = this.fighters[1 - i];
        if (victim.comboHits > this.stats.maxCombo[i]) this.stats.maxCombo[i] = victim.comboHits;
      }
    }

    // efeitos que nascem no início da fase ativa de um golpe
    onMoveActive(f, m) {
      const opp = this.opponentOf(f);
      if (m.muzzle) this.emit('fx', { name: m.muzzle, x: f.x + f.facing * f.def.bodyW * 0.75, y: f.def.bodyH * 0.45, scale: 1.2, flip: f.facing < 0 });
      if (m.projectile) {
        const spec = Object.assign({}, m.projectile, { isSuper: !!m.isSuper });
        const opts = {};
        if (spec.targetOpponent && opp) opts.x = opp.x;
        this.projectiles.push(new PF.Combat.Projectile(f, spec, opts));
        this.emit('projectile', { fighter: f, move: m });
      }
      if (m.wall) {
        const spec = Object.assign({ kind: 'wall', w: m.wall.w, h: m.wall.h, y: 0, hits: 0, absorbs: true,
          life: m.active + 50, sprite: m.wall.sprite, scale: 1.2, speed: 0, x: m.wall.x }, {});
        this.projectiles.push(new PF.Combat.Projectile(f, spec, { x: f.x + f.facing * m.wall.x, vx: 0 }));
      }
      if (m.teleport && opp) {
        this.emit('fx', { name: 'teleport', x: f.x, y: 60, scale: 1 });
        const behind = opp.x - opp.facing * ((f.def.bodyW + opp.def.bodyW) / 2 + 20);
        let nx = clamp(behind, PF.STAGE_MARGIN, PF.STAGE_W - PF.STAGE_MARGIN);
        // se não couber atrás (parede), aparece na frente
        if (Math.abs(nx - opp.x) < (f.def.bodyW + opp.def.bodyW) / 2) nx = clamp(opp.x + opp.facing * 120, PF.STAGE_MARGIN, PF.STAGE_W - PF.STAGE_MARGIN);
        f.x = nx;
        f.facing = opp.x > f.x ? 1 : -1;
        this.emit('fx', { name: 'teleport', x: f.x, y: 60, scale: 1 });
        this.emit('teleport', { fighter: f });
      }
      if (m.rain && opp) {
        const r = m.rain;
        const baseX = opp.x;
        for (let i = 0; i < r.count; i++) {
          const off = (i - (r.count - 1) / 2) * r.spread * (i % 2 ? 1 : -0.6);
          this.scheduled.push({ t: 200 + i * r.delay, owner: f, fn: () => {
            const spec = { sprite: 'cannonball', kind: 'fall', w: 40, h: 40, speed: 0, damage: r.damage, hits: 1,
              hitstun: 340, blockstun: 200, push: 70, height: 'high', chip: 5, stun: 6, life: 2500, scale: 1,
              explode: 'explosion', knockdownLast: !!m.isSuper && i === r.count - 1, isSuper: !!m.isSuper };
            const x = clamp(baseX + off, PF.STAGE_MARGIN, PF.STAGE_W - PF.STAGE_MARGIN);
            this.projectiles.push(new PF.Combat.Projectile(f, spec, { x, y: 640, vx: 0, vy: -820 }));
          } });
        }
        this.emit('fx', { name: 'cannonfire', x: f.x + f.facing * 50, y: f.def.bodyH * 0.7, scale: 1.2, flip: f.facing < 0, rot: -0.9 * f.facing });
      }
      if (m.aura) this.emit('fx', { name: m.aura, x: f.x, y: f.y + 70, scale: 2.2, follow: f, life: m.active + 100 });
      if (m.id === 'spB' && f.def.id === 'golem' || m.anim === 'quake') this.emit('shake', { amount: 7 });
    }

    superFlash(f, m) {
      this.superFreeze = 600;
      this.superOwner = f;
      this.emit('super', { fighter: f, move: m });
    }

    // --------------------------------------------------------------
    // Regras de fim de round
    // --------------------------------------------------------------
    checkRoundEnd() {
      const [a, b] = this.fighters;
      const aKO = a.hp <= 0, bKO = b.hp <= 0;
      if (aKO || bKO) {
        for (const f of this.fighters) f.locked = true;
        if (aKO && a.state !== 'ko' && a.state !== 'launched') a.toKO();
        if (bKO && b.state !== 'ko' && b.state !== 'launched') b.toKO();
        const winner = aKO && bKO ? 0 : aKO ? 2 : 1;
        this.pendingResult = { winner, reason: aKO && bKO ? 'double' : 'ko' };
        this.message = { text: aKO && bKO ? 'DUPLO K.O.!' : 'K.O.!', sub: '', t: 0 };
        this.slowmo = 0.35;
        this.projectiles = [];
        this.scheduled = [];
        this.setState('ko');
        this.emit('ko', this.pendingResult);
        return;
      }
      if (this.timer <= 0) {
        for (const f of this.fighters) f.locked = true;
        const ra = a.hp / a.maxHp, rb = b.hp / b.maxHp;
        const winner = Math.abs(ra - rb) < 1e-6 ? 0 : ra > rb ? 1 : 2;
        this.pendingResult = { winner, reason: 'time' };
        this.message = { text: 'TEMPO ESGOTADO', sub: '', t: 0 };
        this.projectiles = [];
        this.scheduled = [];
        this.setState('ko');
        this.emit('timeover', this.pendingResult);
      }
    }

    finishRound() {
      const r = this.pendingResult || { winner: 0, reason: 'double' };
      const [a, b] = this.fighters;
      if (r.winner === 1) a.roundsWon++;
      if (r.winner === 2) b.roundsWon++;
      this.roundResults.push(r);
      for (const f of this.fighters) {
        f.locked = true;
        f.move = null;
        if (f.isKO) continue;
        const won = (r.winner === 1 && f === a) || (r.winner === 2 && f === b);
        f.setState(won ? 'victory' : 'defeat');
        f.vx = 0;
      }
      const wf = r.winner ? this.fighters[r.winner - 1] : null;
      const perfect = wf && wf.hp === wf.maxHp;
      this.message = { text: r.winner ? (perfect ? 'PERFEITO!' : wf.def.name.toUpperCase() + ' VENCE!') : 'EMPATE', sub: '', t: 0 };
      this.setState('roundEnd');
      this.emit('roundEnd', r);
    }

    nextRoundOrEnd() {
      const [a, b] = this.fighters, need = this.opts.roundsToWin;
      const over = a.roundsWon >= need || b.roundsWon >= need || this.round >= this.opts.maxRounds;
      if (!over) { this.startRound(); return; }
      let winner = a.roundsWon > b.roundsWon ? 1 : b.roundsWon > a.roundsWon ? 2 : 0;
      this.result = { winner, rounds: [a.roundsWon, b.roundsWon] };
      this.message = null;
      this.setState('over');
      this.emit('matchEnd', this.result);
    }

    // --------------------------------------------------------------
    // Treino: vida e energia se recuperam fora dos combos
    // --------------------------------------------------------------
    updateTraining(dt) {
      for (const f of this.fighters) {
        if (!f.inCombo && f.state !== 'knockdown' && f.state !== 'getup' && f.hp < f.maxHp) {
          f.refillT = (f.refillT || 0) + dt;
          if (f.refillT > 900) { f.hp = f.maxHp; f.refillT = 0; }
        } else f.refillT = 0;
      }
    }

    resetPositions() {
      const [a, b] = this.fighters;
      a.resetForRound(PF.STAGE_W / 2 - 170);
      b.resetForRound(PF.STAGE_W / 2 + 170);
      this.projectiles = [];
      this.scheduled = [];
      if (this.opts.training) this.unlock();
      this.emit('reset');
    }

    setPaused(p) { this.paused = !!p; }
  }

  PF.Match = Match;
})();
