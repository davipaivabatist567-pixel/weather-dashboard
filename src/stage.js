// Arenas em pixel art geradas por código (camadas com paralaxe, cenário
// animado e clima). Desenhadas em meia resolução e ampliadas sem suavização.
(function () {
  const PF = globalThis.PF;
  const PX = 2; // tamanho do "pixel" do cenário

  const STAGES = {
    gelo: { name: 'Picos Gelados', sky: ['#050b1f', '#0d2350', '#1f5f8f'], aurora: ['#3dffb0', '#3dc8ff'],
      far: '#2a4f80', farHi: '#5d8fc4', mid: '#7fc4ef', midHi: '#d8f4ff', floor: '#9fd8f5', floorDark: '#4a86b8',
      weather: 'snow', music: 0 },
    navio: { name: 'Navio Pirata', sky: ['#04060f', '#141a3d', '#3a2d5a'], aurora: null, moon: true,
      far: '#1b2d55', farHi: '#3e5f95', mid: '#4a2f1f', midHi: '#8a5a33', floor: '#8a5a33', floorDark: '#4e3220',
      weather: 'snowLight', sea: true, music: 1 },
    aurora: { name: 'Templo da Aurora', sky: ['#0b0420', '#2a0f4f', '#5a2a7a'], aurora: ['#c77dff', '#5affc8'],
      far: '#2d1652', farHi: '#6b3fa0', mid: '#3b2466', midHi: '#9a6ad8', floor: '#4b2f7a', floorDark: '#24143d',
      weather: 'sparkle', music: 0 },
    trono: { name: 'Trono Gélido', sky: ['#02040c', '#0a1a35', '#123a66'], aurora: ['#7fdcff', '#ffffff'],
      far: '#10284a', farHi: '#2c5c8c', mid: '#5fb7ea', midHi: '#e6f8ff', floor: '#7cc4ea', floorDark: '#2f6a9a',
      weather: 'blizzard', throne: true, icicles: true, music: 1 },
  };
  PF.STAGES = STAGES;
  PF.STAGE_ORDER = ['gelo', 'navio', 'aurora', 'trono'];

  function mkCanvas(w, h) {
    if (typeof document === 'undefined') return null;
    const c = document.createElement('canvas');
    c.width = Math.ceil(w); c.height = Math.ceil(h);
    return c;
  }

  class Stage {
    constructor(id) {
      this.id = STAGES[id] ? id : 'gelo';
      this.def = STAGES[this.id];
      this.rng = PF.makeRng(this.id.length * 977 + 13);
      this.time = 0;
      this.weather = [];
      this.build();
    }

    build() {
      const d = this.def, W = PF.VIEW_W, H = PF.VIEW_H;
      const farW = W + (PF.STAGE_W - W) * 0.25, midW = W + (PF.STAGE_W - W) * 0.55;
      this.far = mkCanvas(farW / PX, H / PX);
      this.mid = mkCanvas(midW / PX, H / PX);
      this.floor = mkCanvas(PF.STAGE_W / PX, (H - PF.GROUND_Y + 40) / PX);
      if (!this.far) return;
      this.stars = [];
      for (let i = 0; i < 90; i++) this.stars.push({ x: this.rng() * W, y: this.rng() * H * 0.55, s: this.rng() < 0.15 ? 2 : 1, p: this.rng() * 6 });
      this.drawFar(this.far.getContext('2d', { willReadFrequently: true }));
      this.drawMid(this.mid.getContext('2d'));
      this.drawFloor(this.floor.getContext('2d'));
      const n = d.weather === 'blizzard' ? 170 : d.weather === 'snowLight' ? 60 : d.weather === 'sparkle' ? 70 : 110;
      for (let i = 0; i < n; i++) this.weather.push(this.newFlake(true));
    }

    // ---------- camadas estáticas ----------
    drawFar(g) {
      const d = this.def, w = g.canvas.width, h = g.canvas.height, r = this.rng;
      const base = PF.GROUND_Y / PX;
      // montanhas distantes
      g.fillStyle = d.far;
      let y = base - 80;
      g.beginPath(); g.moveTo(0, h);
      for (let x = 0; x <= w; x += 6) {
        y += (r() - 0.5) * 14;
        y = PF.clamp(y, base - 150, base - 50);
        g.lineTo(x, Math.round(y));
      }
      g.lineTo(w, h); g.closePath(); g.fill();
      // neve nos picos
      g.fillStyle = d.farHi;
      for (let x = 0; x < w; x += 2) {
        const top = this.topAt(g, x, d.far);
        if (top != null) g.fillRect(x, top, 2, 3 + ((x * 7) % 5));
      }
      if (d.sea) {
        // icebergs distantes
        g.fillStyle = '#9fd0f0';
        for (let i = 0; i < 6; i++) {
          const bx = r() * w, bw = 20 + r() * 40, bh = 10 + r() * 25;
          g.beginPath(); g.moveTo(bx, base - 40); g.lineTo(bx + bw * 0.3, base - 40 - bh); g.lineTo(bx + bw * 0.7, base - 40 - bh * 0.7); g.lineTo(bx + bw, base - 40); g.fill();
        }
      }
    }
    topAt(g, x, color) {
      // procura o topo do relevo varrendo a coluna (feito só na construção)
      const h = g.canvas.height;
      const data = g.getImageData(x, 0, 1, h).data;
      for (let y = 0; y < h; y++) if (data[y * 4 + 3] > 0) return y;
      return null;
    }

    drawMid(g) {
      const d = this.def, w = g.canvas.width, h = g.canvas.height, r = this.rng;
      const base = PF.GROUND_Y / PX;
      if (this.id === 'navio') {
        // mastros, cordas e velas
        for (let i = 0; i < 3; i++) {
          const mx = 120 + i * (w - 200) / 2;
          g.fillStyle = d.mid; g.fillRect(mx, 20, 8, base - 20);
          g.fillStyle = d.midHi; g.fillRect(mx + 1, 20, 2, base - 20);
          g.fillStyle = '#d9cfb8'; g.fillRect(mx - 50, 50, 108, 60); g.fillRect(mx - 40, 125, 88, 45);
          g.fillStyle = '#b9ad94'; g.fillRect(mx - 50, 104, 108, 6); g.fillRect(mx - 40, 165, 88, 5);
          g.strokeStyle = '#2a1a10'; g.lineWidth = 1;
          for (let k = 0; k < 5; k++) { g.beginPath(); g.moveTo(mx + 4, 25 + k * 8); g.lineTo(mx - 90 + k * 50, base - 10); g.stroke(); }
          // bandeira
          g.fillStyle = '#111'; g.fillRect(mx + 8, 20, 30, 18);
          g.fillStyle = '#eee'; g.fillRect(mx + 19, 25, 8, 7);
        }
        // barris
        for (let i = 0; i < 7; i++) {
          const bx = r() * w, by = base - 22;
          g.fillStyle = '#6b4226'; g.fillRect(bx, by, 18, 22);
          g.fillStyle = '#3a2412'; g.fillRect(bx, by + 5, 18, 2); g.fillRect(bx, by + 15, 18, 2);
        }
        // amurada
        g.fillStyle = '#5a3a22'; g.fillRect(0, base - 30, w, 6);
        for (let x = 0; x < w; x += 22) { g.fillRect(x, base - 30, 4, 30); }
        return;
      }
      // pilares/cristais de gelo
      const count = this.id === 'aurora' ? 9 : 14;
      for (let i = 0; i < count; i++) {
        const cx = (i + 0.5) * w / count + (r() - 0.5) * 30;
        if (this.id === 'aurora') {
          const ph = 120 + r() * 60;
          g.fillStyle = d.mid; g.fillRect(cx - 12, base - ph, 24, ph);
          g.fillStyle = d.midHi; g.fillRect(cx - 12, base - ph, 4, ph);
          g.fillStyle = d.far; g.fillRect(cx - 16, base - ph - 8, 32, 8); g.fillRect(cx - 16, base - 8, 32, 8);
          g.fillStyle = '#ff9df5'; g.fillRect(cx - 3, base - ph + 30, 6, 6);
        } else {
          const ch = 40 + r() * 90, cw = 12 + r() * 18;
          g.fillStyle = d.mid;
          g.beginPath(); g.moveTo(cx - cw / 2, base); g.lineTo(cx, base - ch); g.lineTo(cx + cw / 2, base); g.fill();
          g.fillStyle = d.midHi;
          g.beginPath(); g.moveTo(cx - cw / 4, base - 4); g.lineTo(cx, base - ch); g.lineTo(cx - 1, base - 4); g.fill();
        }
      }
      if (d.throne) {
        // trono de gelo: encosto pontiagudo, assento e degraus
        const tx = w / 2;
        const spike = (x, y, ww, hh, c) => { g.fillStyle = c; g.beginPath(); g.moveTo(x - ww / 2, y); g.lineTo(x, y - hh); g.lineTo(x + ww / 2, y); g.fill(); };
        g.fillStyle = '#1d4f7d'; g.fillRect(tx - 46, base - 120, 92, 80);
        spike(tx, base - 118, 60, 50, '#2c6a9f');
        spike(tx - 34, base - 112, 26, 44, '#3d86c0');
        spike(tx + 34, base - 112, 26, 44, '#3d86c0');
        spike(tx, base - 160, 18, 26, '#8fd3ff');
        g.fillStyle = '#2c6a9f'; g.fillRect(tx - 40, base - 112, 80, 70);
        g.fillStyle = '#163d63'; for (let i = 0; i < 5; i++) g.fillRect(tx - 32 + i * 16, base - 104, 4, 56);
        g.fillStyle = '#5fb7ea'; g.fillRect(tx - 56, base - 46, 112, 14);   // assento
        g.fillStyle = '#d8f4ff'; g.fillRect(tx - 56, base - 46, 112, 2);
        g.fillStyle = '#3d86c0'; g.fillRect(tx - 66, base - 32, 132, 12); g.fillRect(tx - 78, base - 20, 156, 12); g.fillRect(tx - 90, base - 8, 180, 8);
        g.fillStyle = '#9fdcff'; g.fillRect(tx - 66, base - 32, 132, 2); g.fillRect(tx - 78, base - 20, 156, 2); g.fillRect(tx - 90, base - 8, 180, 2);
        g.fillStyle = '#ffd34d'; g.fillRect(tx - 6, base - 96, 12, 8); g.fillRect(tx - 2, base - 100, 4, 4);
        g.fillStyle = '#ff5a8a'; g.fillRect(tx - 2, base - 94, 4, 4);
      }
      if (d.icicles) {
        g.fillStyle = d.midHi;
        for (let x = 0; x < w; x += 7 + r() * 9) {
          const l = 8 + r() * 30;
          g.beginPath(); g.moveTo(x, 0); g.lineTo(x + 3, l); g.lineTo(x + 6, 0); g.fill();
        }
      }
    }

    drawFloor(g) {
      const d = this.def, w = g.canvas.width, h = g.canvas.height, r = this.rng;
      g.fillStyle = d.floor; g.fillRect(0, 0, w, h);
      g.fillStyle = d.floorDark;
      if (this.id === 'navio') {
        for (let y = 4; y < h; y += 8) g.fillRect(0, y, w, 1);
        for (let y = 0; y < h; y += 8) for (let x = (y * 3) % 40; x < w; x += 40) g.fillRect(x, y, 1, 8);
        g.fillStyle = '#b07a48'; g.fillRect(0, 0, w, 2);
      } else if (this.id === 'aurora') {
        for (let x = 0; x < w; x += 24) g.fillRect(x, 0, 1, h);
        for (let y = 6; y < h; y += 12) g.fillRect(0, y, w, 1);
        g.fillStyle = '#c77dff';
        for (let x = 12; x < w; x += 72) g.fillRect(x, 8, 4, 2);
        g.fillStyle = '#9a6ad8'; g.fillRect(0, 0, w, 2);
      } else {
        // gelo rachado + neve
        for (let i = 0; i < w / 6; i++) {
          let x = r() * w, y = r() * h;
          for (let k = 0; k < 5; k++) { g.fillRect(x, y, 2, 1); x += (r() - 0.3) * 6; y += (r() - 0.5) * 3; }
        }
        g.fillStyle = '#ffffff';
        g.fillRect(0, 0, w, 3);
        for (let x = 0; x < w; x += 3) if (r() < 0.4) g.fillRect(x, 3, 3, 1 + (r() * 3 | 0));
      }
    }

    // ---------- clima ----------
    newFlake(anywhere) {
      const d = this.def.weather, r = this.rng;
      const f = { x: r() * PF.VIEW_W, y: anywhere ? r() * PF.VIEW_H : -10, s: 1 + (r() * 2 | 0), z: 0.5 + r() * 0.8 };
      if (d === 'blizzard') { f.vx = -260 - r() * 160; f.vy = 160 + r() * 120; }
      else if (d === 'sparkle') { f.vx = (r() - 0.5) * 20; f.vy = -20 - r() * 30; if (!anywhere) f.y = PF.VIEW_H + 5; f.hue = r(); }
      else { f.vx = -20 - r() * 30; f.vy = 40 + r() * 50; }
      return f;
    }

    update(dt) {
      const sec = dt / 1000;
      this.time += dt;
      for (let i = 0; i < this.weather.length; i++) {
        const f = this.weather[i];
        f.x += f.vx * sec * f.z; f.y += f.vy * sec * f.z;
        if (f.y > PF.VIEW_H + 10 || f.y < -20 || f.x < -20 || f.x > PF.VIEW_W + 20) {
          const n = this.newFlake(false);
          if (this.def.weather === 'blizzard' && this.rng() < 0.5) { n.x = PF.VIEW_W + 10; n.y = this.rng() * PF.VIEW_H; }
          this.weather[i] = n;
        }
      }
    }

    // ---------- desenho ----------
    drawBackground(ctx, camX) {
      const d = this.def, W = PF.VIEW_W, H = PF.VIEW_H, t = this.time / 1000;
      const sky = ctx.createLinearGradient(0, 0, 0, PF.GROUND_Y);
      sky.addColorStop(0, d.sky[0]); sky.addColorStop(0.55, d.sky[1]); sky.addColorStop(1, d.sky[2]);
      ctx.fillStyle = sky; ctx.fillRect(0, 0, W, H);
      // estrelas
      if (this.stars) for (const s of this.stars) {
        const a = 0.4 + 0.6 * Math.abs(Math.sin(t * 1.3 + s.p));
        ctx.fillStyle = `rgba(255,255,255,${a})`;
        const x = ((s.x - camX * 0.05) % W + W) % W;
        ctx.fillRect(Math.round(x / PX) * PX, Math.round(s.y / PX) * PX, s.s * PX, s.s * PX);
      }
      if (d.moon) {
        ctx.fillStyle = '#f4f1d8'; ctx.beginPath(); ctx.arc(760 - camX * 0.05, 90, 34, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = '#d8d3b0'; ctx.fillRect(745 - camX * 0.05, 80, 8, 8); ctx.fillRect(770 - camX * 0.05, 100, 10, 6);
      }
      // aurora animada
      if (d.aurora) {
        ctx.save();
        ctx.globalAlpha = 0.28;
        for (let b = 0; b < 3; b++) {
          ctx.fillStyle = d.aurora[b % 2];
          for (let x = 0; x < W; x += PX * 3) {
            const y = 70 + b * 38 + Math.sin(x * 0.006 + t * 0.6 + b) * 26 + Math.sin(x * 0.017 + t * 1.1) * 8;
            const hh = 26 + Math.sin(x * 0.01 + t + b * 2) * 14;
            ctx.fillRect(x, Math.round(y / PX) * PX, PX * 3, Math.max(4, Math.round(hh / PX) * PX));
          }
        }
        ctx.restore();
      }
      if (!this.far) return;
      ctx.imageSmoothingEnabled = false;
      ctx.drawImage(this.far, -Math.round(camX * 0.25), 0, this.far.width * PX, this.far.height * PX);
      // mar animado
      if (d.sea) {
        const seaY = PF.GROUND_Y - 80;
        ctx.fillStyle = '#0c2a52'; ctx.fillRect(0, seaY, W, 80);
        ctx.fillStyle = '#2f6aa8';
        for (let x = 0; x < W; x += 8) {
          const y = seaY + 6 + Math.round(Math.sin(x * 0.03 + t * 2) * 3 / PX) * PX;
          ctx.fillRect(x, y, 6, 2);
          const y2 = seaY + 30 + Math.round(Math.sin(x * 0.02 - t * 1.5) * 4 / PX) * PX;
          ctx.fillRect(x + 4, y2, 4, 2);
        }
      }
      ctx.drawImage(this.mid, -Math.round(camX * 0.55), 0, this.mid.width * PX, this.mid.height * PX);
      ctx.drawImage(this.floor, -Math.round(camX), PF.GROUND_Y - 2, this.floor.width * PX, this.floor.height * PX);
      // brilho animado no chão
      if (this.id === 'aurora') {
        ctx.save(); ctx.globalAlpha = 0.25 + 0.15 * Math.sin(t * 2);
        ctx.fillStyle = '#c77dff'; ctx.fillRect(0, PF.GROUND_Y, W, 4); ctx.restore();
      }
    }

    drawWeather(ctx) {
      const d = this.def;
      for (const f of this.weather) {
        if (d.weather === 'sparkle') {
          ctx.fillStyle = f.hue > 0.5 ? 'rgba(199,125,255,0.8)' : 'rgba(90,255,200,0.7)';
        } else ctx.fillStyle = 'rgba(255,255,255,' + (0.5 + 0.4 * f.z / 1.3) + ')';
        const s = f.s * PX * (d.weather === 'blizzard' ? 1 : 1);
        ctx.fillRect(Math.round(f.x), Math.round(f.y), s, s);
      }
    }
  }

  PF.Stage = Stage;
})();
