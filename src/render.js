// Renderização em Canvas 2D: câmera, cenário, lutadores, projéteis,
// efeitos, interface (HUD) e caixas de colisão para depuração.
(function () {
  const PF = globalThis.PF;
  const { clamp } = PF;
  const FONT = '"Press Start 2P", "Courier New", monospace';

  class Renderer {
    constructor(canvas) {
      this.canvas = canvas;
      this.ctx = canvas.getContext('2d');
      this.k = 1;
      this.camX = (PF.STAGE_W - PF.VIEW_W) / 2;
      this.debug = false;
      this.tmp = document.createElement('canvas');
      this.tmpCtx = this.tmp.getContext('2d');
      this.trails = new Map();
      this.hpAnim = new Map();
      this.resize();
    }

    // Ajusta o canvas à tela mantendo 16:9 (sem distorcer os sprites)
    resize() {
      const parent = this.canvas.parentElement || document.body;
      const pw = parent.clientWidth || window.innerWidth, ph = parent.clientHeight || window.innerHeight;
      const ratio = PF.VIEW_W / PF.VIEW_H;
      let cw = pw, ch = pw / ratio;
      if (ch > ph) { ch = ph; cw = ph * ratio; }
      cw = Math.max(160, Math.floor(cw)); ch = Math.max(90, Math.floor(ch));
      this.canvas.style.width = cw + 'px';
      this.canvas.style.height = ch + 'px';
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      const bw = Math.min(1920, Math.round(cw * dpr));
      this.canvas.width = bw;
      this.canvas.height = Math.round(bw / ratio);
      this.k = this.canvas.width / PF.VIEW_W;
      this.cssScale = cw / PF.VIEW_W;
    }

    updateCamera(match, dt) {
      const [a, b] = match.fighters;
      const target = clamp((a.x + b.x) / 2 - PF.VIEW_W / 2, 0, PF.STAGE_W - PF.VIEW_W);
      const t = 1 - Math.pow(0.0005, dt / 1000);
      this.camX = PF.lerp(this.camX, target, t);
      this.camX = clamp(this.camX, 0, PF.STAGE_W - PF.VIEW_W);
      // garante que os dois lutadores estejam sempre dentro da tela
      const lo = Math.max(a.x, b.x) - PF.VIEW_W + 50, hi = Math.min(a.x, b.x) - 50;
      if (lo <= hi) this.camX = clamp(this.camX, lo, hi);
      this.camX = clamp(this.camX, 0, PF.STAGE_W - PF.VIEW_W);
    }

    sx(x) { return x - this.camX; }
    sy(y) { return PF.GROUND_Y - y; }

    draw(game, now) {
      const ctx = this.ctx, match = game.match, fx = game.effects, stage = game.stage;
      ctx.setTransform(this.k, 0, 0, this.k, 0, 0);
      ctx.imageSmoothingEnabled = false;
      ctx.fillStyle = '#000'; ctx.fillRect(0, 0, PF.VIEW_W, PF.VIEW_H);
      if (!match || !stage) return;

      const shake = fx ? fx.shakeAmt : 0;
      const shx = shake ? (Math.random() - 0.5) * shake : 0, shy = shake ? (Math.random() - 0.5) * shake : 0;
      ctx.save();
      ctx.translate(shx, shy);
      stage.drawBackground(ctx, this.camX);

      // escurece durante o super
      const dark = Math.max(fx ? fx.darken * 0.6 : 0, match.superFreeze > 0 ? 0.6 : 0);
      if (dark > 0) { ctx.fillStyle = `rgba(0,0,20,${dark})`; ctx.fillRect(-20, -20, PF.VIEW_W + 40, PF.VIEW_H + 40); }

      for (const f of match.fighters) this.drawShadow(f);
      // projéteis "no chão" atrás, lutador que ataca na frente
      const order = match.fighters.slice().sort((p, q) => (p.state === 'attack') - (q.state === 'attack'));
      for (const p of match.projectiles) if (p.kind === 'wall' || p.kind === 'area') this.drawProjectile(p, now);
      for (const f of order) this.drawFighter(f, now, match);
      for (const p of match.projectiles) if (p.kind !== 'wall' && p.kind !== 'area') this.drawProjectile(p, now);
      if (fx) this.drawEffects(fx);
      if (this.debug) this.drawDebug(match);
      ctx.restore();
      stage.drawWeather(ctx);
      if (fx && fx.flashA > 0) { ctx.globalAlpha = fx.flashA; ctx.fillStyle = fx.flashColor; ctx.fillRect(0, 0, PF.VIEW_W, PF.VIEW_H); ctx.globalAlpha = 1; }
      this.drawHUD(game, now);
    }

    drawShadow(f) {
      const ctx = this.ctx;
      const s = clamp(1 - f.y / 400, 0.3, 1);
      ctx.fillStyle = 'rgba(0,0,0,0.35)';
      ctx.beginPath();
      ctx.ellipse(this.sx(f.x), PF.GROUND_Y + 2, f.def.bodyW * 0.6 * s, 7 * s, 0, 0, Math.PI * 2);
      ctx.fill();
    }

    // desenha um quadro do atlas com transformações
    blitFrame(img, meta, frame, x, y, facing, scale, pose, alpha = 1, tint = null, tintA = 0) {
      const ctx = this.ctx;
      const [cw, ch] = meta.cell;
      const sx = (frame % meta.columns) * cw, sy = Math.floor(frame / meta.columns) * ch;
      let src = img, srcX = sx, srcY = sy;
      if (tint && tintA > 0) {
        if (this.tmp.width < cw || this.tmp.height < ch) { this.tmp.width = Math.max(this.tmp.width, cw); this.tmp.height = Math.max(this.tmp.height, ch); }
        const t = this.tmpCtx;
        t.globalCompositeOperation = 'source-over';
        t.clearRect(0, 0, this.tmp.width, this.tmp.height);
        t.drawImage(img, sx, sy, cw, ch, 0, 0, cw, ch);
        t.globalCompositeOperation = 'source-atop';
        t.globalAlpha = tintA; t.fillStyle = tint; t.fillRect(0, 0, cw, ch);
        t.globalAlpha = 1; t.globalCompositeOperation = 'source-over';
        src = this.tmp; srcX = 0; srcY = 0;
      }
      ctx.save();
      ctx.globalAlpha = alpha;
      ctx.translate(x + pose.ox * facing, y - pose.oy);
      ctx.scale(facing * scale * pose.sx, scale * pose.sy);
      ctx.rotate(pose.rot);
      ctx.drawImage(src, srcX, srcY, cw, ch, -cw / 2, -ch + 1, cw, ch);
      ctx.restore();
    }

    drawFighter(f, now, match) {
      const ctx = this.ctx;
      const pose = PF.Anim.pose(f, now);
      const img = PF.Assets.get('char:' + f.def.id);
      const meta = PF.ATLAS && PF.ATLAS.characters[f.def.id];
      const x = this.sx(f.x), y = this.sy(f.y);

      // rastro (investidas, corrida e supers)
      let trail = this.trails.get(f);
      if (!trail) { trail = []; this.trails.set(f, trail); }
      const showTrail = f.state === 'dash' || f.state === 'run' || (f.state === 'attack' && f.move && (f.move.rush || f.move.isSuper || f.move.teleport));
      if (showTrail) { trail.push({ x: f.x, y: f.y, pose, facing: f.facing }); if (trail.length > 5) trail.shift(); }
      else if (trail.length) trail.shift();

      if (!img || !meta || pose.frame < 0) { this.drawSilhouette(f, x, y, pose); return; }

      for (let i = 0; i < trail.length; i++) {
        const tr = trail[i];
        this.blitFrame(img, meta, tr.pose.frame, this.sx(tr.x), this.sy(tr.y), tr.facing, f.def.scale, tr.pose,
          0.12 + i * 0.05, (f.move && f.move.trail) || f.def.color, 0.8);
      }

      // piscar durante invulnerabilidade de levantar
      if ((f.state === 'getup' || f.invuln > 0) && Math.floor(now / 60) % 2 === 0) ctx.globalAlpha = 0.6;
      let tint = null, tintA = 0;
      if (f.flash > 0) { tint = '#ffffff'; tintA = Math.min(0.6, f.flash / 120); }
      else if (f.frozen > 0) { tint = '#7fdcff'; tintA = 0.45; }
      else if (f.state === 'attack' && f.move && f.move.isSuper && f.phase() === 'startup') { tint = f.def.color; tintA = 0.35 + 0.25 * Math.sin(now / 40); }
      else if (f.armor > 0 && f.state === 'attack') { tint = '#d0f0ff'; tintA = 0.3; }
      this.blitFrame(img, meta, pose.frame, x, y, f.facing, f.def.scale, pose, ctx.globalAlpha, tint, tintA);
      ctx.globalAlpha = 1;

      // escudo de defesa
      if (f.guarding && (f.state === 'idle' || f.state === 'crouch') || f.state === 'blockstun') {
        const h = f.def.bodyH * (f.crouching ? 0.62 : 1);
        ctx.save();
        ctx.globalAlpha = f.state === 'blockstun' ? 0.55 : 0.28;
        ctx.strokeStyle = '#9be7ff'; ctx.lineWidth = 3;
        ctx.fillStyle = 'rgba(120,200,255,0.25)';
        ctx.beginPath();
        ctx.ellipse(x + f.facing * f.def.bodyW * 0.45, y - h / 2, 14, h / 2, 0, 0, Math.PI * 2);
        ctx.fill(); ctx.stroke();
        ctx.restore();
      }
      // golpe ativo: arco de movimento
      if (f.state === 'attack' && f.move && f.move.hitbox && f.phase() === 'active' && !f.move.throw) {
        const hb = f.worldBox(f.move.hitbox);
        ctx.save();
        ctx.globalAlpha = 0.5;
        ctx.strokeStyle = f.move.special ? f.def.color : '#ffffff';
        ctx.lineWidth = 4;
        const cx = this.sx(hb.x + hb.w / 2), cy = this.sy(hb.y + hb.h / 2);
        ctx.beginPath();
        const r = Math.max(hb.w, hb.h) * 0.55;
        if (f.facing > 0) ctx.arc(cx - r * 0.5, cy, r, -0.9, 0.9); else ctx.arc(cx + r * 0.5, cy, r, Math.PI - 0.9, Math.PI + 0.9);
        ctx.stroke();
        ctx.restore();
      }
      // estrelas de atordoamento
      if (f.state === 'dizzy') {
        for (let i = 0; i < 3; i++) {
          const a = now / 250 + i * 2.1;
          this.star(x + Math.cos(a) * 30, y - f.def.bodyH - 10 + Math.sin(a) * 8, '#ffd166');
        }
      }
    }

    star(x, y, color) {
      const ctx = this.ctx;
      ctx.fillStyle = color;
      ctx.fillRect(x - 1, y - 5, 3, 11); ctx.fillRect(x - 5, y - 1, 11, 3);
    }

    // substituto quando o sprite não carregou
    drawSilhouette(f, x, y, pose) {
      const ctx = this.ctx, d = f.def;
      ctx.save();
      ctx.translate(x, y);
      ctx.scale(f.facing, pose.sy || 1);
      ctx.rotate(pose.rot || 0);
      ctx.fillStyle = d.color;
      ctx.fillRect(-d.bodyW / 2, -d.bodyH * 0.8, d.bodyW, d.bodyH * 0.8);
      ctx.beginPath(); ctx.arc(0, -d.bodyH * 0.85, d.bodyW * 0.35, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = '#fff'; ctx.fillRect(d.bodyW * 0.1, -d.bodyH * 0.9, 8, 8);
      if (f.state === 'attack') { ctx.fillStyle = d.color; ctx.fillRect(d.bodyW / 2, -d.bodyH * 0.6, d.reach * 0.6, 14); }
      ctx.restore();
    }

    drawProjectile(p, now) {
      const ctx = this.ctx;
      const img = PF.Assets.get('fx:' + p.sprite);
      const x = this.sx(p.x), y = this.sy(p.y);
      const dir = p.kind === 'fall' || p.kind === 'area' ? 1 : (Math.sign(p.vx) || p.facing);
      ctx.save();
      ctx.translate(x, y);
      if (p.kind === 'tornado') ctx.scale(1 + Math.sin(now / 60) * 0.06, 1);
      if (p.kind === 'area') ctx.globalAlpha = Math.min(1, (p.life - p.age) / 250, p.age / 120);
      if (p.kind === 'wall') ctx.globalAlpha = Math.min(1, p.age / 80);
      ctx.rotate(p.rot || 0);
      if (img) {
        const s = p.scale * (1 + Math.sin(now / 45 + p.id) * 0.04);
        const w = img.width * s, h = img.height * s;
        ctx.scale(dir, 1);
        const by = p.kind === 'wall' || p.kind === 'area' || p.kind === 'tornado' || p.kind === 'ground' ? p.h / 2 - h : -h / 2;
        ctx.drawImage(img, -w / 2, by, w, h);
      } else if (p.sprite === 'cannonball') {
        ctx.fillStyle = '#1b1b22'; ctx.beginPath(); ctx.arc(0, 0, 16, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = '#5a5a6a'; ctx.beginPath(); ctx.arc(-5, -5, 5, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = 'rgba(255,160,60,0.7)'; ctx.fillRect(-dir * 22, -3, 8, 6);
      } else {
        // substituto genérico: esfera brilhante na cor do dono
        ctx.fillStyle = p.owner.def.color; ctx.globalAlpha *= 0.85;
        ctx.beginPath(); ctx.arc(0, 0, Math.min(p.w, p.h) / 2, 0, Math.PI * 2); ctx.fill();
      }
      ctx.restore();
    }

    drawEffects(fx) {
      const ctx = this.ctx;
      for (const s of fx.sprites) {
        const img = PF.Assets.get('fx:' + s.name);
        const p = s.age / s.life;
        const pop = p < 0.15 ? 0.6 + p / 0.15 * 0.4 : 1;
        ctx.save();
        ctx.globalAlpha = p > 0.6 ? (1 - p) / 0.4 : 1;
        ctx.translate(this.sx(s.x), this.sy(s.y));
        ctx.rotate(s.rot || 0);
        ctx.scale((s.flip ? -1 : 1) * s.scale * pop, s.scale * pop);
        if (img) ctx.drawImage(img, -img.width / 2, -img.height / 2);
        else { ctx.fillStyle = '#ffd166'; ctx.beginPath(); ctx.arc(0, 0, 16, 0, Math.PI * 2); ctx.fill(); }
        ctx.restore();
      }
      for (const r of fx.rings) {
        const p = r.age / r.life;
        ctx.save();
        ctx.globalAlpha = 1 - p;
        ctx.strokeStyle = r.color; ctx.lineWidth = 3;
        ctx.beginPath(); ctx.arc(this.sx(r.x), this.sy(r.y), r.r * (0.3 + p), 0, Math.PI * 2); ctx.stroke();
        ctx.restore();
      }
      for (const q of fx.particles) {
        ctx.globalAlpha = clamp(1 - q.age / q.life, 0, 1);
        ctx.fillStyle = q.color;
        ctx.fillRect(Math.round(this.sx(q.x)), Math.round(this.sy(q.y)), q.size, q.size);
      }
      ctx.globalAlpha = 1;
      for (const t of fx.texts) {
        const a = clamp(1 - t.age / t.life, 0, 1);
        this.text(t.text, this.sx(t.x), this.sy(t.y), 12, t.color, 'center', a);
      }
    }

    drawDebug(match) {
      const ctx = this.ctx;
      const box = (b, color) => {
        ctx.strokeStyle = color; ctx.lineWidth = 2;
        ctx.strokeRect(this.sx(b.x), this.sy(b.y + b.h), b.w, b.h);
      };
      for (const f of match.fighters) {
        box(f.pushbox(), 'rgba(80,255,120,0.8)');
        box(f.hurtbox(), f.isInvulnerable() ? 'rgba(255,255,255,0.5)' : 'rgba(60,160,255,0.9)');
        const limb = f.limbHurtbox(); if (limb) box(limb, 'rgba(60,160,255,0.6)');
        if (f.state === 'attack' && f.move && f.move.hitbox && f.phase() === 'active') box(f.worldBox(f.move.hitbox), 'rgba(255,40,40,1)');
        this.text(f.state + (f.move ? ':' + f.move.id + ':' + f.phase() : ''), this.sx(f.x), this.sy(f.y + f.def.bodyH + 20), 8, '#fff', 'center');
      }
      for (const p of match.projectiles) box(p.box(), 'rgba(255,120,40,1)');
    }

    // ---------------- HUD ----------------
    text(str, x, y, size, color, align = 'left', alpha = 1, stroke = '#000') {
      const ctx = this.ctx;
      ctx.save();
      ctx.globalAlpha = alpha;
      ctx.font = `${size}px ${FONT}`;
      ctx.textAlign = align;
      ctx.textBaseline = 'middle';
      ctx.lineWidth = Math.max(3, size / 4);
      ctx.strokeStyle = stroke;
      ctx.lineJoin = 'round';
      ctx.strokeText(str, x, y);
      ctx.fillStyle = color;
      ctx.fillText(str, x, y);
      ctx.restore();
    }

    drawHUD(game, now) {
      const ctx = this.ctx, match = game.match;
      const [a, b] = match.fighters;
      this.drawBar(a, 1, now, match);
      this.drawBar(b, 2, now, match);

      // cronômetro
      ctx.fillStyle = 'rgba(5,15,35,0.85)'; ctx.fillRect(PF.VIEW_W / 2 - 38, 10, 76, 58);
      ctx.strokeStyle = '#4fc3ff'; ctx.lineWidth = 2; ctx.strokeRect(PF.VIEW_W / 2 - 38, 10, 76, 58);
      const tval = match.opts.training ? '∞' : String(Math.ceil(match.timer)).padStart(2, '0');
      this.text(tval, PF.VIEW_W / 2, 41, 24, match.timer <= 10 && !match.opts.training ? '#ff6b6b' : '#ffffff', 'center');

      // contador de combo
      for (const [att, def, side] of [[a, b, 1], [b, a, 2]]) {
        if (def.comboHits >= 2 && (def.inCombo || def.state === 'knockdown' || def.state === 'dizzy')) {
          const x = side === 1 ? 40 : PF.VIEW_W - 40, al = side === 1 ? 'left' : 'right';
          const pulse = 1 + Math.max(0, 0.2 - (def.stateTime / 1000)) ;
          this.text(def.comboHits + ' GOLPES', x, 170, Math.round(20 * pulse), '#ffd166', al);
          this.text('COMBO!  ' + def.comboDamage + ' dano', x, 198, 10, '#ffffff', al);
        }
      }

      // mensagens centrais
      if (match.message) {
        const m = match.message;
        const pop = Math.min(1, m.t / 160);
        const size = Math.round(46 * (0.6 + 0.4 * pop));
        this.text(m.text, PF.VIEW_W / 2, PF.VIEW_H / 2 - 30, size, '#ffffff', 'center', 1, '#0b2a5a');
        if (m.sub) this.text(m.sub, PF.VIEW_W / 2, PF.VIEW_H / 2 + 20, 14, '#9be7ff', 'center');
      }
      if (match.superFreeze > 0 && match.superOwner) {
        const f = match.superOwner;
        const mv = f.move;
        this.text(mv ? mv.name.toUpperCase() : 'SUPER!', PF.VIEW_W / 2, 120, 22, f.def.color, 'center', 1, '#000');
      }
      // informações do modo
      if (game.modeLabel) this.text(game.modeLabel, PF.VIEW_W / 2, 84, 9, '#9be7ff', 'center');
      if (match.opts.training) this.drawTrainingInfo(game);
      if (match.paused) { ctx.fillStyle = 'rgba(0,0,0,0.4)'; ctx.fillRect(0, 0, PF.VIEW_W, PF.VIEW_H); }
    }

    drawBar(f, side, now, match) {
      const ctx = this.ctx;
      const W = 330, H = 20, y = 24;
      const left = side === 1;
      const x0 = left ? 92 : PF.VIEW_W - 92 - W;
      // retrato
      const px = left ? 12 : PF.VIEW_W - 12 - 72;
      ctx.fillStyle = 'rgba(5,15,35,0.9)'; ctx.fillRect(px, 10, 72, 72);
      ctx.strokeStyle = f.def.color; ctx.lineWidth = 2; ctx.strokeRect(px, 10, 72, 72);
      const por = PF.Assets.get('portrait:' + f.def.id);
      if (por) {
        // recorta a parte de cima (rosto) do retrato
        const sw = por.width, sh = Math.min(por.height, por.width);
        ctx.save();
        ctx.beginPath(); ctx.rect(px + 2, 12, 68, 68); ctx.clip();
        if (!left) { ctx.translate(px + 72, 0); ctx.scale(-1, 1); ctx.drawImage(por, 0, 0, sw, sh, 2, 12, 68, 68); }
        else ctx.drawImage(por, 0, 0, sw, sh, px + 2, 12, 68, 68);
        ctx.restore();
      } else { ctx.fillStyle = f.def.color; ctx.fillRect(px + 16, 26, 40, 40); }

      // vida com dano "atrasado" animado
      const ratio = clamp(f.hp / f.maxHp, 0, 1);
      let anim = this.hpAnim.get(f);
      if (anim == null || anim < ratio) anim = ratio;
      anim = Math.max(ratio, anim - 0.004);
      this.hpAnim.set(f, anim);
      ctx.fillStyle = '#1a0d14'; ctx.fillRect(x0 - 3, y - 3, W + 6, H + 6);
      ctx.fillStyle = '#3a0f1a'; ctx.fillRect(x0, y, W, H);
      const fill = (r, color) => {
        const w = Math.round(W * r);
        ctx.fillStyle = color;
        if (left) ctx.fillRect(x0 + W - w, y, w, H); else ctx.fillRect(x0, y, w, H);
      };
      fill(anim, '#ff4d4d');
      const g = ctx.createLinearGradient(0, y, 0, y + H);
      const low = ratio < 0.25;
      g.addColorStop(0, low && Math.floor(now / 200) % 2 ? '#ffe066' : '#ffd84d');
      g.addColorStop(1, low ? '#ff7b2e' : '#f0a020');
      fill(ratio, g);
      ctx.fillStyle = 'rgba(255,255,255,0.35)';
      if (left) ctx.fillRect(x0 + W - Math.round(W * ratio), y + 2, Math.round(W * ratio), 3); else ctx.fillRect(x0, y + 2, Math.round(W * ratio), 3);
      ctx.strokeStyle = '#cfe8ff'; ctx.lineWidth = 2; ctx.strokeRect(x0, y, W, H);

      // nome e vitórias
      this.text(f.def.name.toUpperCase(), left ? x0 : x0 + W, y + H + 14, 10, '#ffffff', left ? 'left' : 'right');
      for (let i = 0; i < match.opts.roundsToWin; i++) {
        const cx = left ? x0 + W - 8 - i * 18 : x0 + 8 + i * 18;
        ctx.fillStyle = i < f.roundsWon ? '#ffd166' : 'rgba(255,255,255,0.15)';
        ctx.beginPath(); ctx.arc(cx, y + H + 14, 6, 0, Math.PI * 2); ctx.fill();
        ctx.strokeStyle = '#000'; ctx.lineWidth = 1; ctx.stroke();
      }

      // barra de energia (em baixo)
      const EW = 260, EH = 12, ey = PF.VIEW_H - 30;
      const ex = left ? 24 : PF.VIEW_W - 24 - EW;
      ctx.fillStyle = 'rgba(0,0,0,0.6)'; ctx.fillRect(ex - 2, ey - 2, EW + 4, EH + 4);
      const er = clamp(f.energy / 100, 0, 1);
      const full = er >= 1;
      ctx.fillStyle = full ? (Math.floor(now / 120) % 2 ? '#ffffff' : f.def.color) : '#3d7bd9';
      const ew = Math.round(EW * er);
      if (left) ctx.fillRect(ex, ey, ew, EH); else ctx.fillRect(ex + EW - ew, ey, ew, EH);
      ctx.strokeStyle = 'rgba(0,0,0,0.6)';
      for (let i = 1; i < 4; i++) { ctx.beginPath(); ctx.moveTo(ex + EW * i / 4, ey); ctx.lineTo(ex + EW * i / 4, ey + EH); ctx.stroke(); }
      ctx.strokeStyle = '#9be7ff'; ctx.lineWidth = 1.5; ctx.strokeRect(ex, ey, EW, EH);
      this.text(full ? 'SUPER PRONTO!' : 'ENERGIA', left ? ex : ex + EW, ey - 10, 8, full ? '#ffd166' : '#9be7ff', left ? 'left' : 'right');
    }

    drawTrainingInfo(game) {
      const m = game.match, [a, b] = m.fighters;
      const lines = [
        'TREINO  |  Boneco: ' + (PF.DUMMY_MODES[game.dummyMode] || ''),
        'Último combo: ' + (game.lastCombo ? game.lastCombo.hits + ' golpes / ' + game.lastCombo.damage + ' dano' : '-'),
        'Maior combo: ' + m.stats.maxCombo[0] + '   |   R: reiniciar  F1: caixas',
      ];
      const ctx = this.ctx;
      ctx.fillStyle = 'rgba(5,15,35,0.7)'; ctx.fillRect(PF.VIEW_W / 2 - 230, 96, 460, 54);
      lines.forEach((l, i) => this.text(l, PF.VIEW_W / 2, 108 + i * 16, 8, '#cfe8ff', 'center'));
    }
  }

  PF.Renderer = Renderer;
})();
