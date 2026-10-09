// Lutador: atributos, física e máquina de estados.
// Estados: intro, idle, walk, crouch, jumpSquat, air, land, dash, run, attack,
// blockstun, hitstun, launched, knockdown, getup, dizzy, thrown, ko, victory, defeat.
(function () {
  const PF = globalThis.PF;
  const { clamp } = PF;

  const MAX_VX = 950, MAX_VY = 1500;
  const NEUTRAL = new Set(['idle', 'walk', 'crouch']);
  const ACTIONABLE = new Set(['idle', 'walk', 'crouch', 'run']);

  let nextId = 1;

  class Fighter {
    constructor(def, side, opts = {}) {
      if (!def) throw new Error('Personagem inexistente');
      this.id = nextId++;
      this.def = def;
      this.side = side;                     // 1 = esquerda, 2 = direita
      this.hpMult = opts.hpMult || 1;
      this.damageMult = opts.damageMult || 1;
      this.maxHp = Math.round(def.hp * this.hpMult);
      this.input = new PF.InputBuffer();
      this.controller = null;
      this.roundsWon = 0;
      this.infiniteEnergy = false;
      this.resetForRound(side === 1 ? PF.STAGE_W / 2 - 160 : PF.STAGE_W / 2 + 160);
    }

    // Restaura TODO o estado volátil do lutador (usado entre rounds).
    resetForRound(x, keepHp = false) {
      this.x = x; this.y = 0; this.vx = 0; this.vy = 0;
      this.facing = this.side === 1 ? 1 : -1;
      if (!keepHp) this.hp = this.maxHp;
      this.hp = clamp(this.hp, 0, this.maxHp);
      this.displayHp = this.hp;
      this.energy = 25;
      this.stunPts = 0;
      this.state = 'idle';
      this.stateTime = 0;
      this.move = null;
      this.moveTime = 0;
      this.hitIds = new Set();
      this.contact = false;
      this.spawned = false;
      this.airAttackUsed = false;
      this.stunTimer = 0;
      this.hitstop = 0;
      this.invuln = 0;
      this.armor = 0;
      this.guarding = false;
      this.crouching = false;
      this.comboHits = 0;
      this.comboDamage = 0;
      this.comboMoves = new Set();
      this.juggle = 0;
      this.flash = 0;
      this.frozen = 0;
      this.lastHitBy = null;
      this.cooldowns = {};
      this.input.reset();
      this.locked = false;
      this.dead = false;
      this.events = [];
    }

    get grounded() { return this.y <= 0; }
    get isKO() { return this.state === 'ko' || this.dead; }
    get canAct() { return !this.locked && !this.isKO && ACTIONABLE.has(this.state); }
    get inCombo() { return this.state === 'hitstun' || this.state === 'launched' || this.state === 'thrown'; }

    setState(s) {
      if (this.state === s) return;
      this.state = s;
      this.stateTime = 0;
    }

    // ---------------------------------------------------------------
    // Caixas de colisão (independentes do sprite)
    // y é a altura acima do chão.
    // ---------------------------------------------------------------
    hurtbox() {
      const d = this.def;
      let w = d.bodyW, h = d.bodyH, y = this.y;
      if (this.crouching || (this.move && this.move.crouch)) h = d.bodyH * 0.7;
      if (this.state === 'knockdown' || this.state === 'ko') { h = d.bodyH * 0.3; w = d.bodyW * 1.5; }
      if (this.state === 'launched' || this.state === 'thrown') { h = d.bodyH * 0.6; w = d.bodyW * 1.2; }
      if (this.state === 'air' || this.state === 'attack' && this.move && this.move.air) { h = d.bodyH * 0.85; y = this.y + d.bodyH * 0.1; }
      return { x: this.x - w / 2, y, w, h };
    }

    // caixa extra no membro que ataca (permite punir golpes errados)
    limbHurtbox() {
      if (this.state !== 'attack' || !this.move || !this.move.hitbox || this.move.throw) return null;
      const ph = this.phase();
      if (ph === 'startup') return null;
      const hb = this.worldBox(this.move.hitbox);
      const shrink = hb.w * 0.25;
      return { x: hb.x + (this.facing > 0 ? 0 : shrink), y: hb.y, w: hb.w - shrink, h: hb.h };
    }

    worldBox(b) {
      const x = this.facing > 0 ? this.x + b.x : this.x - b.x - b.w;
      return { x, y: this.y + b.y, w: b.w, h: b.h };
    }

    pushbox() {
      const w = this.def.bodyW * 0.8;
      return { x: this.x - w / 2, y: this.y, w, h: this.def.bodyH * 0.8 };
    }

    phase() {
      const m = this.move;
      if (!m) return null;
      if (this.moveTime < m.startup) return 'startup';
      if (this.moveTime < m.startup + m.active) return 'active';
      return 'recovery';
    }

    isInvulnerable() {
      if (this.invuln > 0) return true;
      if (this.state === 'knockdown' || this.state === 'getup') return true;
      if (this.state === 'launched' && this.juggle >= 2) return true;
      const m = this.move;
      if (this.state === 'attack' && m && m.invuln && this.moveTime >= m.invuln[0] && this.moveTime < m.invuln[1]) return true;
      return false;
    }

    addEnergy(v) {
      this.energy = clamp(this.energy + v, 0, 100);
    }

    // ---------------------------------------------------------------
    // Atualização por passo fixo
    // ---------------------------------------------------------------
    update(dt, world) {
      this.world = world;
      const opp = world.opponentOf(this);
      if (this.hitstop > 0) {
        this.hitstop = Math.max(0, this.hitstop - dt);
        return;
      }
      const sec = dt / 1000;
      this.stateTime += dt;
      if (this.invuln > 0) this.invuln = Math.max(0, this.invuln - dt);
      if (this.flash > 0) this.flash = Math.max(0, this.flash - dt);
      if (this.frozen > 0) this.frozen = Math.max(0, this.frozen - dt);
      for (const k in this.cooldowns) this.cooldowns[k] = Math.max(0, this.cooldowns[k] - dt);
      if (this.infiniteEnergy) this.energy = 100;
      else if (!this.locked && !this.isKO) this.addEnergy(2 * sec);
      // o atordoamento acumulado diminui com o tempo
      if (!this.inCombo) this.stunPts = Math.max(0, this.stunPts - 12 * sec);

      const inp = this.input;
      const held = inp.held;

      // vira para o oponente quando está em estado neutro no chão
      if (opp && this.grounded && (NEUTRAL.has(this.state) || this.state === 'run' && false) && Math.abs(opp.x - this.x) > 4) {
        this.facing = opp.x > this.x ? 1 : -1;
      }

      switch (this.state) {
        case 'intro':
        case 'victory':
        case 'defeat':
          this.vx = 0;
          break;

        case 'idle': case 'walk': case 'crouch':
          this.updateNeutral(dt, world, opp);
          break;

        case 'run':
          if (this.locked || !inp.fwd) { this.setState('idle'); this.vx = 0; break; }
          if (this.tryActions(world, opp)) break;
          this.vx = this.def.dash * 0.75 * this.facing;
          break;

        case 'jumpSquat':
          this.vx = 0;
          if (this.stateTime >= 50) {
            this.vy = this.def.jumpV;
            this.vx = this.jumpDir * this.def.airSpeed;
            this.y = 1;
            this.airAttackUsed = false;
            this.setState('air');
            this.emit('jump');
          }
          break;

        case 'air':
          if (!this.locked && !this.airAttackUsed) {
            if (inp.pressed('punch')) { inp.consume('punch'); this.startMove('jp', world); break; }
            if (inp.pressed('kick')) { inp.consume('kick'); this.startMove('jk', world); break; }
          }
          break;

        case 'land':
          this.vx = 0;
          if (this.stateTime >= 60) this.setState('idle');
          break;

        case 'dash':
          this.vx = PF.approach(this.vx, 0, this.def.dash * 3 * sec);
          if (this.stateTime >= 230) {
            if (this.dashDir > 0 && inp.fwd && !this.locked) this.setState('run');
            else { this.setState('idle'); this.vx = 0; }
          }
          break;

        case 'attack':
          this.updateAttack(dt, world, opp);
          break;

        case 'blockstun':
          this.vx = PF.approach(this.vx, 0, 1400 * sec);
          if (this.stateTime >= this.stunTimer) { this.setState(this.crouching ? 'crouch' : 'idle'); this.vx = 0; }
          break;

        case 'hitstun':
          this.vx = PF.approach(this.vx, 0, 1300 * sec);
          if (this.stateTime >= this.stunTimer) {
            this.vx = 0;
            if (this.hp <= 0) this.toKO();
            else if (this.pendingDizzy) { this.pendingDizzy = false; this.setState('dizzy'); this.emit('dizzy'); }
            else this.recover();
          }
          break;

        case 'launched': case 'thrown': case 'ko':
          // física tratada abaixo
          break;

        case 'knockdown':
          this.vx = PF.approach(this.vx, 0, 1600 * sec);
          if (this.stateTime >= 550) {
            if (this.hp <= 0) { this.toKO(); break; }
            this.setState('getup');
          }
          break;

        case 'getup':
          this.vx = 0;
          if (this.stateTime >= 380) {
            this.invuln = Math.max(this.invuln, 120); // pequena proteção ao levantar
            if (this.pendingDizzy) { this.pendingDizzy = false; this.setState('dizzy'); this.emit('dizzy'); }
            else this.recover();
          }
          break;

        case 'dizzy':
          this.vx = 0;
          if (this.stateTime >= 1700) { this.stunPts = 0; this.recover(); }
          break;
      }

      this.integrate(dt, world);
    }

    recover() {
      this.comboHits = 0;
      this.comboDamage = 0;
      this.comboMoves.clear();
      this.juggle = 0;
      this.setState('idle');
    }

    updateNeutral(dt, world, opp) {
      const inp = this.input, held = inp.held;
      this.crouching = false;
      this.guarding = false;
      if (this.locked) { this.vx = 0; this.setState('idle'); return; }
      if (this.tryActions(world, opp)) return;

      // pulo
      if (held.up) {
        this.jumpDir = inp.fwd ? this.facing : inp.back ? -this.facing : 0;
        this.setState('jumpSquat');
        return;
      }
      // corrida (frente, frente) e recuo (trás, trás)
      if (inp.motion('ff') && this.stateTime > 0) {
        inp.clearMotion();
        this.dashDir = 1;
        this.vx = this.def.dash * this.facing;
        this.setState('dash');
        this.emit('dash');
        return;
      }
      if (inp.motion('bb')) {
        inp.clearMotion();
        this.dashDir = -1;
        this.vx = -this.def.dash * 0.85 * this.facing;
        this.invuln = 90;
        this.setState('dash');
        this.emit('dash');
        return;
      }

      this.guarding = !!held.block;
      if (held.down) {
        this.crouching = true;
        this.vx = 0;
        this.setState('crouch');
        return;
      }
      if (this.guarding) { this.vx = 0; this.setState('idle'); return; }
      if (inp.fwd) { this.vx = this.def.walk * this.facing; this.setState('walk'); this.walkDir = 1; }
      else if (inp.back) { this.vx = -this.def.back * this.facing; this.setState('walk'); this.walkDir = -1; }
      else { this.vx = 0; this.setState('idle'); }
    }

    // Decide golpes a partir do buffer de entrada. Retorna true se iniciou algo.
    tryActions(world, opp) {
      const inp = this.input, held = inp.held;
      const moves = this.def.moves;
      // supergolpe
      if (this.energy >= 100 && (inp.pressed('super') || inp.together('punch', 'kick'))) {
        inp.consumeAll();
        return this.startMove('spS', world);
      }
      // agarrão
      if (inp.together('punch', 'kick') && opp && this.canThrow(opp)) {
        inp.consumeAll();
        return this.startMove('throw', world);
      }
      // especiais por comando ou atalho com U
      const sp = this.readSpecial();
      if (sp) return this.startMove(sp, world);
      // normais
      if (inp.pressed('punch')) {
        inp.consume('punch');
        if (held.down) return this.startMove('cp', world);
        if (inp.fwd) return this.startMove('hp', world);
        return this.startMove('lp', world);
      }
      if (inp.pressed('kick')) {
        inp.consume('kick');
        if (held.down) return this.startMove('sweep', world);
        if (inp.fwd) return this.startMove('mk', world);
        return this.startMove('lk', world);
      }
      return false;
    }

    readSpecial() {
      const inp = this.input;
      const p = inp.pressed('punch'), u = inp.pressed('special');
      let key = null;
      if (p || u) {
        if (inp.motion('qcf')) key = 'A';
        else if (inp.motion('qcb')) key = 'C';
        else if (inp.motion('ff') && p) key = 'B';
      }
      if (!key && u) {
        if (inp.held.down) key = 'C';
        else if (inp.fwd) key = 'B';
        else key = 'A';
      }
      if (!key) return null;
      const id = 'sp' + key;
      if (!this.canUseSpecial(id)) {
        // sem energia/recarga: não consome o soco para que vire golpe normal
        if (u) inp.consume('special');
        if (u && !p) this.emit('denied');
        return null;
      }
      inp.consume('punch'); inp.consume('special');
      inp.clearMotion();
      return id;
    }

    canUseSpecial(id) {
      const m = this.def.moves[id];
      if (!m) return false;
      if (this.energy < (m.cost || 0)) return false;
      if (this.cooldowns[id] > 0) return false;
      // apenas um projétil próprio na tela por vez
      if (m.projectile && this.world && this.world.projectiles.some((p) => p.owner === this && !p.dead && p.kind !== 'area')) return false;
      return true;
    }

    canThrow(opp) {
      if (!this.grounded || !opp.grounded) return false;
      if (opp.isInvulnerable() || opp.isKO) return false;
      if (!['idle', 'walk', 'crouch', 'run', 'land', 'attack', 'dash'].includes(opp.state)) return false;
      const reach = (this.def.bodyW + opp.def.bodyW) / 2 + this.def.moves.throw.range;
      return Math.abs(opp.x - this.x) <= reach;
    }

    startMove(id, world) {
      const m = this.def.moves[id];
      if (!m) { PF.warnOnce('move' + id, 'Golpe inexistente: ' + id); return false; }
      if (m.air && this.grounded) return false;
      if (m.special) {
        if (!this.infiniteEnergy) this.energy = clamp(this.energy - (m.cost || 0), 0, 100);
        this.cooldowns[id] = (m.cooldown || 250) + m.startup + m.active + m.recovery;
        if (m.isSuper) world.superFlash(this, m);
      }
      this.move = m;
      this.moveTime = 0;
      this.hitIds = new Set();
      this.contact = false;
      this.spawned = false;
      this.armor = m.armor || 0;
      this.crouching = !!m.crouch;
      this.guarding = false;
      if (m.air) this.airAttackUsed = true;
      else this.vx = 0;
      this.setState('attack');
      this.emit('attack', m);
      return true;
    }

    updateAttack(dt, world, opp) {
      const m = this.move;
      if (!m) { this.setState('idle'); return; }
      this.moveTime += dt;
      const ph = this.phase();
      const sec = dt / 1000;

      // deslocamento do golpe
      if (!m.air) {
        if (m.rush && ph === 'active') this.vx = m.rush * this.facing;
        else if (m.rush && ph === 'recovery') this.vx = PF.approach(this.vx, 0, 2400 * sec);
        else if (m.lunge && ph !== 'recovery') this.vx = (m.lunge / ((m.startup + m.active) / 1000)) * this.facing;
        else this.vx = PF.approach(this.vx, 0, 2400 * sec);
      }
      if (m.hop && !this.spawned && ph === 'active') { this.vy = m.hop; this.y = 1; }

      // efeitos que nascem no início da fase ativa (uma única vez)
      if (ph !== 'startup' && !this.spawned) {
        this.spawned = true;
        world.onMoveActive(this, m);
      }

      // cancelamentos permitidos apenas após contato (acerto ou defesa)
      if (this.contact && !this.locked && (ph === 'active' || ph === 'recovery')) {
        const inp = this.input;
        if ((m.cancel || m.superCancel) && this.energy >= 100 && (inp.pressed('super') || inp.together('punch', 'kick'))) {
          inp.consumeAll();
          this.startMove('spS', world); return;
        }
        if (m.cancel) {
          const sp = this.readSpecial();
          if (sp) { this.startMove(sp, world); return; }
        }
        if (m.chain) {
          for (const btn of ['punch', 'kick']) {
            if (m.chain[btn] && inp.pressed(btn, 200)) {
              inp.consume(btn);
              this.startMove(m.chain[btn], world);
              return;
            }
          }
        }
      }

      const total = m.startup + m.active + m.recovery;
      if (this.moveTime >= total) {
        this.move = null;
        if (!this.grounded) { this.setState('air'); }
        else {
          this.setState(this.input.held.down ? 'crouch' : 'idle');
          this.crouching = this.state === 'crouch';
        }
      }
    }

    toKO() {
      this.hp = 0;
      this.move = null;
      if (this.state !== 'ko') {
        this.setState('ko');
        this.emit('ko');
      }
    }

    // física comum
    integrate(dt, world) {
      const sec = dt / 1000;
      const airborne = this.y > 0 || this.vy > 0;
      if (airborne) {
        this.vy -= this.def.gravity * sec;
      }
      this.vx = clamp(this.vx, -MAX_VX, MAX_VX);
      this.vy = clamp(this.vy, -MAX_VY, MAX_VY);
      this.x += this.vx * sec;
      this.y += this.vy * sec;
      if (this.y <= 0) {
        this.y = 0;
        if (airborne) this.onLand(world);
        this.vy = 0;
      }
      const lo = PF.STAGE_MARGIN, hi = PF.STAGE_W - PF.STAGE_MARGIN;
      this.x = clamp(this.x, lo, hi);
      if (!Number.isFinite(this.x)) this.x = PF.STAGE_W / 2;
      if (!Number.isFinite(this.y)) this.y = 0;
    }

    onLand(world) {
      switch (this.state) {
        case 'air':
          this.vx = 0; this.setState('land'); this.emit('land'); break;
        case 'attack':
          if (this.move && this.move.air) { this.move = null; this.vx = 0; this.setState('land'); this.emit('land'); }
          break;
        case 'launched': case 'thrown':
          this.vx *= 0.3;
          this.setState('knockdown');
          this.emit('knockdown');
          break;
        case 'ko':
          this.vx *= 0.3;
          this.emit('knockdown');
          break;
        case 'hitstun':
          // atingido no ar mas sem lançamento: cai de pé
          break;
      }
    }

    emit(type, data) { this.events.push({ type, data }); }
  }

  PF.Fighter = Fighter;
})();
