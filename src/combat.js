// Sistema de combate: colisões hitbox x hurtbox, dano, defesa, combos,
// projéteis e separação dos corpos.
(function () {
  const PF = globalThis.PF;
  const { clamp, rectsOverlap } = PF;

  const HITSTOP = { light: 70, medium: 95, heavy: 120, special: 105 };
  const BLOCKABLE_STATES = new Set(['idle', 'walk', 'crouch', 'blockstun', 'land']);

  function pushVelocity(dist) {
    // velocidade inicial que percorre "dist" com desaceleração de 1400 px/s²
    return Math.sqrt(2 * 1400 * Math.max(0, dist));
  }

  const Combat = {
    // ---------------------------------------------------------------
    // Resolve um impacto. Retorna 'hit', 'block', 'armor' ou 'miss'.
    // ---------------------------------------------------------------
    resolveHit(att, def, data, ctx = {}) {
      if (!def || def.isKO) return 'miss';
      if (def.isInvulnerable()) return 'miss';
      const dir = ctx.dir || (def.x >= (ctx.x != null ? ctx.x : att.x) ? 1 : -1);
      const world = ctx.world;
      const fxPos = ctx.fxPos || { x: def.x - dir * def.def.bodyW * 0.3, y: def.y + def.def.bodyH * 0.6 };

      // superarmadura (absorve um impacto durante o golpe)
      if (def.state === 'attack' && def.armor > 0 && def.phase() !== 'recovery' && !data.throw) {
        def.armor--;
        const dmg = Math.round(data.damage * 0.5 * att.damageMult / def.def.defense);
        def.hp = clamp(def.hp - dmg, 1, def.maxHp);
        def.flash = 120;
        if (world) world.emit('armor', { x: fxPos.x, y: fxPos.y, attacker: att, defender: def });
        return 'armor';
      }

      // defesa
      const held = def.input.held;
      const canBlock = !data.throw && def.grounded && held.block && BLOCKABLE_STATES.has(def.state);
      const crouchBlock = !!held.down;
      const heightOk = data.height === 'low' ? crouchBlock : data.height === 'high' ? !crouchBlock : true;
      if (canBlock && heightOk) {
        const perfect = def.input.time - def.input.lastPressTime('block') <= 120;
        let chip = 0;
        if (data.special && !perfect) chip = Math.round(data.chip != null ? data.chip : data.damage * 0.15);
        // dano de defesa nunca nocauteia
        if (chip > 0) def.hp = clamp(def.hp - chip, 1, def.maxHp);
        def.move = null;
        def.crouching = crouchBlock;
        def.setState('blockstun');
        def.stunTimer = (data.blockstun || 180) * (perfect ? 0.5 : 1);
        def.vx = dir * pushVelocity((data.push || 80) * (perfect ? 0.6 : 1));
        // se o defensor está na parede, o atacante é empurrado (corpo a corpo)
        if (!ctx.projectile && Combat.atWall(def, dir)) att.vx = -dir * pushVelocity((data.push || 80) * 0.7);
        def.addEnergy(perfect ? 10 : 3);
        att.addEnergy(2);
        const stop = perfect ? 90 : 55;
        def.hitstop = stop;
        if (!ctx.projectile) att.hitstop = stop;
        if (world) world.emit(perfect ? 'perfect' : 'block', { x: fxPos.x, y: fxPos.y, attacker: att, defender: def, data });
        return 'block';
      }

      // acerto
      const wasAirborne = !def.grounded;
      const counter = def.state === 'attack' && def.phase() === 'startup';
      if (def.state === 'dizzy') def.stunPts = 0;
      let scale = Math.max(0.35, 1 - 0.1 * def.comboHits);
      if (data.special && def.comboMoves.has(data.id)) scale *= 0.5; // repetição no mesmo combo
      const base = data.damage * att.damageMult / def.def.defense;
      const dmg = Math.max(1, Math.round(base * scale * (counter ? 1.2 : 1)));
      def.hp = clamp(def.hp - dmg, def.noKO ? 1 : 0, def.maxHp);
      def.comboHits++;
      def.comboDamage += dmg;
      if (data.id) def.comboMoves.add(data.id);
      def.lastHitBy = att;
      def.move = null;
      def.guarding = false;
      def.flash = 90;
      if (data.freeze) def.frozen = 450;
      if (def.state !== 'dizzy' && def.state !== 'knockdown') {
        def.stunPts += data.stun || 0;
        if (def.stunPts >= def.def.stunMax && def.hp > 0) { def.pendingDizzy = true; def.stunPts = 0; }
      }

      const ko = def.hp <= 0;
      const knock = ko || data.knockdown || wasAirborne || def.comboHits >= 15;
      if (knock) {
        const l = data.launch || { vx: 220, vy: 420 };
        def.crouching = false;
        def.setState(ko ? 'ko' : 'launched');
        def.vx = dir * (l.vx / def.def.weight) * (ko ? 1.2 : 1);
        def.vy = Math.max(l.vy / Math.sqrt(def.def.weight), wasAirborne ? 380 : 0) * (ko ? 1.1 : 1);
        def.y = Math.max(def.y, 1);
        if (wasAirborne) def.juggle++;
        if (ko) def.emit('ko');
      } else {
        def.setState('hitstun');
        const decay = Math.max(0.55, 1 - 0.05 * (def.comboHits - 1));
        def.stunTimer = (data.hitstun || 300) * decay + (counter ? 80 : 0) + (data.freeze ? 120 : 0);
        def.vx = dir * pushVelocity(data.push || 80);
        if (!ctx.projectile && Combat.atWall(def, dir)) att.vx = -dir * pushVelocity((data.push || 80) * 0.8);
      }

      att.addEnergy(data.isSuper ? 0 : 6);
      def.addEnergy(4);
      const stop = (HITSTOP[data.sfx] || 90) + (ko ? 120 : 0);
      def.hitstop = stop;
      if (!ctx.projectile) att.hitstop = stop;
      if (world) world.emit('hit', { x: fxPos.x, y: fxPos.y, attacker: att, defender: def, data, damage: dmg,
        counter, ko, combo: def.comboHits });
      return 'hit';
    },

    atWall(f, dir) {
      return (dir > 0 && f.x >= PF.STAGE_W - PF.STAGE_MARGIN - 2) || (dir < 0 && f.x <= PF.STAGE_MARGIN + 2);
    },

    // ---------------------------------------------------------------
    // Golpes corpo a corpo: só acertam durante a fase ativa e quando a
    // hitbox toca a hurtbox. Cada golpe (ou cada parte de golpe múltiplo)
    // registra o impacto apenas uma vez.
    // ---------------------------------------------------------------
    // Verifica (sem aplicar) se o golpe corpo a corpo de "att" toca "def".
    meleeProbe(att, def) {
      if (att.state !== 'attack' || !att.move || att.isKO) return null;
      const m = att.move;
      if (!m.hitbox || att.phase() !== 'active') return null;
      const n = m.multi || 1;
      const idx = n > 1 ? Math.min(n - 1, Math.floor((att.moveTime - m.startup) / (m.hitInterval || 100))) : 0;
      if (att.hitIds.has(idx)) return null;
      if (m.throw) return { move: m, idx, n, throw: true };
      const hb = att.worldBox(m.hitbox);
      const hurt = def.hurtbox();
      const limb = def.limbHurtbox();
      if (!rectsOverlap(hb, hurt) && !(limb && rectsOverlap(hb, limb))) return null;
      const fx = { x: att.facing > 0 ? Math.max(hb.x, hurt.x) + 6 : Math.min(hb.x + hb.w, hurt.x + hurt.w) - 6,
        y: Math.min(hb.y + hb.h / 2, hurt.y + hurt.h - 10) };
      return { move: m, idx, n, fx };
    },

    applyMelee(att, def, probe, world) {
      const { move: m, idx, n } = probe;
      if (probe.throw) {
        att.hitIds.add(idx);
        if (!att.canThrow(def)) return 'miss';
        // arremessa o oponente para trás do atacante
        def.x = clamp(att.x - att.facing * 30, PF.STAGE_MARGIN, PF.STAGE_W - PF.STAGE_MARGIN);
        const r = Combat.resolveHit(att, def, Object.assign({}, m, { id: 'throw' }), { dir: -att.facing, world });
        if (r === 'hit') { att.contact = true; if (world) world.emit('throw', { attacker: att, defender: def }); }
        return r;
      }
      const last = n === 1 || idx === n - 1;
      const data = Object.assign({}, m, { knockdown: !!m.knockdown && (last || !def.grounded) });
      const r = Combat.resolveHit(att, def, data, { dir: att.facing, world, fxPos: probe.fx });
      if (r !== 'miss') {
        att.hitIds.add(idx);
        att.contact = true;
        if (m.impactFx && world) world.emit('fx', { name: m.impactFx, x: probe.fx.x, y: probe.fx.y, scale: 1.4 });
      }
      return r;
    },

    // Golpes corpo a corpo: só acertam durante a fase ativa e quando a
    // hitbox toca a hurtbox; cada parte do golpe registra um único impacto.
    checkMelee(att, def, world) {
      const p = Combat.meleeProbe(att, def);
      return p ? Combat.applyMelee(att, def, p, world) : null;
    },

    // impede que os corpos se atravessem
    separate(a, b) {
      if (a.isKO || b.isKO) return;
      const pa = a.pushbox(), pb = b.pushbox();
      const vert = pa.y < pb.y + pb.h && pa.y + pa.h > pb.y;
      if (!vert) return;
      const dx = b.x - a.x;
      const minDist = (pa.w + pb.w) / 2;
      const overlap = minDist - Math.abs(dx);
      if (overlap <= 0) return;
      const s = dx === 0 ? (a.facing > 0 ? 1 : -1) : Math.sign(dx);
      const lo = PF.STAGE_MARGIN, hi = PF.STAGE_W - PF.STAGE_MARGIN;
      let ax = a.x - s * overlap / 2, bx = b.x + s * overlap / 2;
      // se um está encostado na parede, o outro é empurrado inteiro
      if (ax < lo) { bx += lo - ax; ax = lo; }
      if (ax > hi) { bx -= ax - hi; ax = hi; }
      if (bx < lo) { ax += lo - bx; bx = lo; }
      if (bx > hi) { ax -= bx - hi; bx = hi; }
      a.x = clamp(ax, lo, hi);
      b.x = clamp(bx, lo, hi);
    },
  };

  // -----------------------------------------------------------------
  // Projéteis e áreas de efeito
  // -----------------------------------------------------------------
  let projId = 1;
  class Projectile {
    constructor(owner, spec, opts = {}) {
      this.id = projId++;
      this.owner = owner;
      this.spec = spec;
      this.kind = spec.kind || 'ball';
      this.sprite = spec.sprite;
      this.scale = spec.scale || 1;
      this.w = spec.w; this.h = spec.h;
      this.facing = owner.facing;
      const startX = opts.x != null ? opts.x : owner.x + owner.facing * (owner.def.bodyW * 0.45 + spec.w / 2);
      this.x = startX;
      this.y = opts.y != null ? opts.y : (spec.y === 0 ? spec.h / 2 : owner.def.bodyH * spec.y);
      this.vx = (opts.vx != null ? opts.vx : spec.speed * owner.facing);
      this.vy = opts.vy != null ? opts.vy : (spec.vy || 0);
      this.gravity = spec.gravity || 0;
      this.life = spec.life || 2000;
      this.age = 0;
      this.hitsLeft = spec.hits == null ? 1 : spec.hits;
      this.cooldown = 0;
      this.rot = 0;
      this.dead = false;
      this.absorbs = !!spec.absorbs;
      this.data = {
        id: 'proj_' + (spec.sprite || 'x') + '_' + owner.def.id, special: true, isSuper: !!spec.isSuper,
        damage: spec.damage || 0, hitstun: spec.hitstun, blockstun: spec.blockstun, push: spec.push,
        height: spec.height || 'mid', chip: spec.chip, stun: spec.stun || 10, freeze: spec.freeze,
        knockdown: !!spec.knockdown, launch: spec.launch || { vx: 260, vy: 460 }, sfx: 'special',
      };
    }

    box() { return { x: this.x - this.w / 2, y: this.y - this.h / 2, w: this.w, h: this.h }; }

    update(dt, world) {
      const sec = dt / 1000;
      this.age += dt;
      this.cooldown = Math.max(0, this.cooldown - dt);
      if (this.gravity) this.vy -= this.gravity * sec;
      this.x += this.vx * sec;
      this.y += this.vy * sec;
      if (this.spec.spin) this.rot += this.spec.spin * sec * Math.sign(this.vx || 1);
      if ((this.kind === 'arc' || this.kind === 'fall') && this.y <= this.h / 2 && this.vy < 0) {
        this.y = this.h / 2;
        this.kill(world, true);
      }
      if (this.kind === 'wall' && this.owner) {
        this.x = this.owner.x + this.owner.facing * this.spec.x;
        if (this.owner.state !== 'attack') this.kill(world, false);
      }
      // vórtice puxa o oponente
      if (this.spec.pull && world) {
        const opp = world.opponentOf(this.owner);
        if (opp && opp.grounded && !opp.isKO && Math.abs(opp.x - this.x) < 260) {
          opp.x += Math.sign(this.x - opp.x) * this.spec.pull * sec;
        }
      }
      if (this.age >= this.life) this.kill(world, false);
      if (this.x < -200 || this.x > PF.STAGE_W + 200 || this.y > 1200) this.dead = true; // saiu da arena
    }

    kill(world, explode) {
      if (this.dead) return;
      this.dead = true;
      if (explode && world) {
        world.emit('fx', { name: this.spec.explode || 'explosion', x: this.x, y: this.y, scale: 1.2 });
        world.emit('explode', { x: this.x, y: this.y });
      }
    }

    // tenta acertar o lutador; respeita intervalo entre acertos múltiplos
    tryHit(def, world) {
      if (this.dead || this.hitsLeft <= 0 || this.cooldown > 0 || this.kind === 'wall') return null;
      if (def === this.owner) return null;
      const hurt = def.hurtbox();
      if (!rectsOverlap(this.box(), hurt)) return null;
      const last = this.hitsLeft === 1;
      const data = Object.assign({}, this.data, {
        knockdown: this.data.knockdown || (this.spec.knockdownLast && last),
      });
      const fx = { x: def.x - Math.sign(this.vx || this.facing) * def.def.bodyW * 0.3, y: clamp(this.y, def.y + 20, def.y + def.def.bodyH - 10) };
      const dir = this.kind === 'area' || this.kind === 'fall' ? (def.x >= this.owner.x ? 1 : -1) : Math.sign(this.vx) || this.facing;
      const r = Combat.resolveHit(this.owner, def, data, { dir, world, projectile: this, fxPos: fx, x: this.x });
      if (r !== 'miss') {
        this.hitsLeft--;
        this.cooldown = this.spec.hitInterval || 120;
        if (this.hitsLeft <= 0) this.kill(world, this.kind === 'ball' || this.kind === 'fall');
      }
      return r;
    }
  }

  Combat.Projectile = Projectile;

  // projéteis de donos diferentes se anulam
  Combat.clashProjectiles = function (list, world) {
    for (let i = 0; i < list.length; i++) {
      const a = list[i];
      if (a.dead) continue;
      for (let j = i + 1; j < list.length; j++) {
        const b = list[j];
        if (b.dead || a.owner === b.owner) continue;
        if (!rectsOverlap(a.box(), b.box())) continue;
        if (a.absorbs && b.kind !== 'area') { b.kill(world, true); continue; }
        if (b.absorbs && a.kind !== 'area') { a.kill(world, true); continue; }
        if (a.kind === 'area' || b.kind === 'area' || a.kind === 'wall' || b.kind === 'wall') continue;
        a.hitsLeft--; b.hitsLeft--;
        if (a.hitsLeft <= 0) a.kill(world, true);
        if (b.hitsLeft <= 0) b.kill(world, true);
        if (world) world.emit('clash', { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 });
      }
    }
  };

  PF.Combat = Combat;
})();
