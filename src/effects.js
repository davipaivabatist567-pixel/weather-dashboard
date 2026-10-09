// Efeitos visuais: partículas, faíscas de impacto, efeitos com sprite,
// textos flutuantes, tremor de câmera e flashes.
// Tudo aqui é opcional: uma falha num efeito nunca interrompe a luta.
(function () {
  const PF = globalThis.PF;
  const MAX_PARTICLES = 400;

  class Effects {
    constructor() { this.reset(); }
    reset() {
      this.particles = [];
      this.sprites = [];
      this.texts = [];
      this.shakeAmt = 0;
      this.flashA = 0;
      this.flashColor = '#fff';
      this.darken = 0;
      this.rings = [];
    }

    attach(match) {
      const on = (n, fn) => match.on(n, (d) => { try { fn(d); } catch (e) { console.error('Efeito falhou', e); } });
      on('hit', (d) => {
        const heavy = d.data.sfx === 'heavy' || d.data.special;
        this.spark(d.x, d.y, heavy ? '#ffffff' : '#fff6b0', heavy ? 18 : 10, heavy ? 420 : 300);
        this.spark(d.x, d.y, d.data.freeze ? '#7fdcff' : '#ffb347', heavy ? 10 : 5, 260);
        this.ring(d.x, d.y, heavy ? 48 : 30, d.data.freeze ? '#9be7ff' : '#fff');
        this.shake(d.ko ? 14 : heavy ? 6 : 3);
        if (d.counter) this.text(d.x, d.y + 60, 'CONTRA-ATAQUE!', '#ff5a5a');
        if (d.ko) this.flash('#fff', 0.7);
      });
      on('block', (d) => { this.spark(d.x, d.y, '#7fc8ff', 8, 220); this.ring(d.x, d.y, 26, '#7fc8ff'); });
      on('perfect', (d) => {
        this.spark(d.x, d.y, '#ffffff', 16, 320); this.ring(d.x, d.y, 50, '#ffffff');
        this.text(d.x, d.y + 60, 'DEFESA PERFEITA!', '#9be7ff'); this.flash('#bfe9ff', 0.25);
      });
      on('armor', (d) => { this.spark(d.x, d.y, '#d0f0ff', 12, 260); this.text(d.x, d.y + 50, 'ARMADURA', '#d0f0ff'); });
      on('clash', (d) => { this.spark(d.x, d.y, '#ffffff', 20, 380); this.ring(d.x, d.y, 60, '#fff'); });
      on('fx', (d) => this.sprite(d.name, d.x, d.y, d.scale || 1, d.life || 450, d.flip, d.follow, d.rot));
      on('explode', (d) => { this.spark(d.x, d.y, '#ff9a3c', 14, 300); this.shake(5); });
      on('shake', (d) => this.shake(d.amount || 5));
      on('super', (d) => { this.darken = 1; this.flash('#ffffff', 0.4); this.ring(d.fighter.x, d.fighter.def.bodyH * 0.6, 120, d.fighter.def.color); });
      on('throw', (d) => { this.shake(6); this.text(d.defender.x, d.defender.def.bodyH + 30, 'AGARRÃO!', '#ffd166'); });
      on('fighter:dizzy', (d) => this.text(d.fighter.x, d.fighter.def.bodyH + 40, 'ATORDOADO!', '#ffd166'));
      on('fighter:land', (d) => this.dust(d.fighter.x, 6));
      on('fighter:knockdown', (d) => { this.dust(d.fighter.x, 14); this.shake(4); });
      on('fighter:dash', (d) => this.dust(d.fighter.x, 6));
      on('teleport', (d) => this.spark(d.fighter.x, 60, '#c77dff', 18, 300));
    }

    spark(x, y, color, n, speed) {
      for (let i = 0; i < n && this.particles.length < MAX_PARTICLES; i++) {
        const a = Math.random() * Math.PI * 2, s = speed * (0.3 + Math.random() * 0.7);
        this.particles.push({ x, y, vx: Math.cos(a) * s, vy: Math.sin(a) * s, life: 260 + Math.random() * 200,
          age: 0, color, size: 2 + Math.random() * 3, gravity: 600 });
      }
    }
    dust(x, n) {
      for (let i = 0; i < n && this.particles.length < MAX_PARTICLES; i++) {
        this.particles.push({ x: x + (Math.random() - 0.5) * 40, y: 4, vx: (Math.random() - 0.5) * 160,
          vy: 40 + Math.random() * 80, life: 400 + Math.random() * 200, age: 0, color: '#dfefff', size: 3 + Math.random() * 3, gravity: 80 });
      }
    }
    ring(x, y, r, color) { this.rings.push({ x, y, r, color, age: 0, life: 220 }); }
    sprite(name, x, y, scale, life, flip, follow, rot) {
      this.sprites.push({ name, x, y, scale, life, age: 0, flip: !!flip, follow, rot: rot || 0,
        dx: follow ? x - follow.x : 0, dy: follow ? y - follow.y : 0 });
    }
    text(x, y, text, color) { this.texts.push({ x, y, text, color, age: 0, life: 900 }); }
    shake(a) { this.shakeAmt = Math.min(16, Math.max(this.shakeAmt, a)); }
    flash(color, a) { this.flashColor = color; this.flashA = Math.max(this.flashA, a); }

    update(dt) {
      const sec = dt / 1000;
      for (const p of this.particles) {
        p.age += dt; p.vy -= p.gravity * sec; p.x += p.vx * sec; p.y += p.vy * sec;
        if (p.y < 0) { p.y = 0; p.vy *= -0.3; p.vx *= 0.6; }
      }
      this.particles = this.particles.filter((p) => p.age < p.life);
      for (const s of this.sprites) {
        s.age += dt;
        if (s.follow) { s.x = s.follow.x + s.dx; s.y = s.follow.y + s.dy; }
      }
      this.sprites = this.sprites.filter((s) => s.age < s.life);
      for (const t of this.texts) { t.age += dt; t.y += 40 * sec; }
      this.texts = this.texts.filter((t) => t.age < t.life);
      for (const r of this.rings) r.age += dt;
      this.rings = this.rings.filter((r) => r.age < r.life);
      this.shakeAmt = Math.max(0, this.shakeAmt - 40 * sec);
      this.flashA = Math.max(0, this.flashA - 2.5 * sec);
      this.darken = Math.max(0, this.darken - 1.6 * sec);
    }
  }

  PF.Effects = Effects;
})();
