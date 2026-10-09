// Áudio sintetizado com Web Audio (sem arquivos externos que possam falhar).
// Se o navegador não suportar áudio, o jogo continua normalmente em silêncio.
(function () {
  const PF = globalThis.PF;

  const Audio = {
    ctx: null, master: null, sfxGain: null, musicGain: null,
    enabled: true, musicOn: true, volume: 0.7, failed: false,
    musicTimer: null, musicStep: 0, musicTrack: 0, noiseBuf: null,

    init() {
      try {
        const saved = JSON.parse(localStorage.getItem('pf_audio') || 'null');
        if (saved) { this.volume = saved.volume ?? 0.7; this.musicOn = saved.musicOn ?? true; this.enabled = saved.enabled ?? true; }
      } catch (e) { /* ignora */ }
    },
    save() {
      try { localStorage.setItem('pf_audio', JSON.stringify({ volume: this.volume, musicOn: this.musicOn, enabled: this.enabled })); } catch (e) { /* ignora */ }
    },

    // precisa ser chamado após um gesto do usuário (política de autoplay)
    unlock() {
      if (this.failed) return;
      try {
        if (!this.ctx) {
          const AC = window.AudioContext || window.webkitAudioContext;
          if (!AC) { this.failed = true; console.warn('[Pinguim] Web Audio indisponível: jogo sem som.'); return; }
          this.ctx = new AC();
          this.master = this.ctx.createGain();
          this.master.connect(this.ctx.destination);
          this.sfxGain = this.ctx.createGain(); this.sfxGain.connect(this.master);
          this.musicGain = this.ctx.createGain(); this.musicGain.gain.value = 0.22; this.musicGain.connect(this.master);
          const len = this.ctx.sampleRate * 0.5;
          this.noiseBuf = this.ctx.createBuffer(1, len, this.ctx.sampleRate);
          const d = this.noiseBuf.getChannelData(0);
          for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
          this.applyVolume();
        }
        if (this.ctx.state === 'suspended') this.ctx.resume();
      } catch (e) {
        this.failed = true;
        console.warn('[Pinguim] Falha ao iniciar áudio:', e);
      }
    },
    applyVolume() {
      if (!this.master) return;
      this.master.gain.value = this.enabled ? this.volume : 0;
      this.musicGain.gain.value = this.musicOn ? 0.22 : 0;
    },

    tone(freq, dur, type = 'square', vol = 0.3, slideTo = null, delay = 0) {
      if (!this.ctx || !this.enabled) return;
      try {
        const t = this.ctx.currentTime + delay;
        const o = this.ctx.createOscillator(), g = this.ctx.createGain();
        o.type = type;
        o.frequency.setValueAtTime(freq, t);
        if (slideTo) o.frequency.exponentialRampToValueAtTime(Math.max(20, slideTo), t + dur);
        g.gain.setValueAtTime(vol, t);
        g.gain.exponentialRampToValueAtTime(0.001, t + dur);
        o.connect(g); g.connect(this.sfxGain);
        o.start(t); o.stop(t + dur + 0.02);
      } catch (e) { /* som é opcional */ }
    },
    noise(dur, vol = 0.3, freq = 1200, delay = 0, type = 'lowpass') {
      if (!this.ctx || !this.enabled || !this.noiseBuf) return;
      try {
        const t = this.ctx.currentTime + delay;
        const s = this.ctx.createBufferSource(), f = this.ctx.createBiquadFilter(), g = this.ctx.createGain();
        s.buffer = this.noiseBuf;
        f.type = type; f.frequency.value = freq;
        g.gain.setValueAtTime(vol, t);
        g.gain.exponentialRampToValueAtTime(0.001, t + dur);
        s.connect(f); f.connect(g); g.connect(this.sfxGain);
        s.start(t); s.stop(t + dur + 0.02);
      } catch (e) { /* som é opcional */ }
    },

    play(name) {
      switch (name) {
        case 'light': this.noise(0.08, 0.35, 2500); this.tone(220, 0.07, 'square', 0.12, 110); break;
        case 'medium': this.noise(0.12, 0.45, 1800); this.tone(160, 0.1, 'square', 0.16, 70); break;
        case 'heavy': this.noise(0.2, 0.55, 1200); this.tone(110, 0.18, 'sawtooth', 0.22, 40); break;
        case 'special': this.noise(0.16, 0.45, 2000); this.tone(300, 0.15, 'triangle', 0.2, 90); break;
        case 'block': this.tone(900, 0.05, 'square', 0.12, 600); this.noise(0.05, 0.2, 4000, 0, 'highpass'); break;
        case 'perfect': this.tone(1200, 0.08, 'triangle', 0.2); this.tone(1800, 0.12, 'triangle', 0.18, null, 0.06); break;
        case 'whoosh': this.noise(0.09, 0.12, 900, 0, 'bandpass'); break;
        case 'jump': this.tone(300, 0.12, 'square', 0.08, 600); break;
        case 'land': this.noise(0.06, 0.12, 400); break;
        case 'dash': this.noise(0.15, 0.15, 700, 0, 'bandpass'); break;
        case 'projectile': this.tone(700, 0.25, 'sawtooth', 0.12, 200); this.noise(0.2, 0.15, 3000, 0, 'highpass'); break;
        case 'explosion': this.noise(0.4, 0.5, 600); this.tone(80, 0.35, 'sawtooth', 0.2, 30); break;
        case 'ko': this.tone(400, 0.9, 'sawtooth', 0.25, 60); this.noise(0.6, 0.4, 800); break;
        case 'super': this.tone(200, 0.5, 'sawtooth', 0.2, 900); this.tone(300, 0.5, 'square', 0.12, 1200, 0.05); break;
        case 'round': this.tone(523, 0.15, 'square', 0.2); this.tone(659, 0.15, 'square', 0.2, null, 0.15); break;
        case 'fight': this.tone(784, 0.3, 'square', 0.25); this.tone(1046, 0.35, 'square', 0.2, null, 0.12); break;
        case 'select': this.tone(880, 0.06, 'square', 0.15); break;
        case 'confirm': this.tone(660, 0.08, 'square', 0.18); this.tone(990, 0.12, 'square', 0.18, null, 0.07); break;
        case 'back': this.tone(440, 0.08, 'square', 0.15, 300); break;
        case 'denied': this.tone(150, 0.12, 'square', 0.12); break;
        case 'dizzy': for (let i = 0; i < 3; i++) this.tone(1200 - i * 200, 0.1, 'triangle', 0.12, null, i * 0.1); break;
        case 'teleport': this.tone(1500, 0.25, 'sine', 0.2, 300); break;
        case 'win': [523, 659, 784, 1046].forEach((f, i) => this.tone(f, 0.18, 'square', 0.18, null, i * 0.14)); break;
      }
    },

    // trilha simples em loop (sequenciador de chiptune)
    startMusic(track = 0) {
      this.stopMusic();
      if (!this.ctx) return;
      this.musicTrack = track;
      this.musicStep = 0;
      const tempo = track === 1 ? 150 : 132;
      const stepMs = 60000 / tempo / 2;
      const scales = [
        [220, 261.6, 293.7, 329.6, 392, 440], // menu / gelo
        [196, 233.1, 261.6, 293.7, 349.2, 392], // tensão
      ];
      const sc = scales[track % scales.length];
      const bass = [0, 0, 3, 3, 4, 4, 2, 2];
      const mel = [5, -1, 4, 3, -1, 2, 3, -1, 5, 4, -1, 3, 2, -1, 1, 0];
      this.musicTimer = setInterval(() => {
        if (!this.ctx || !this.musicOn || this.ctx.state !== 'running') return;
        try {
          const i = this.musicStep++;
          const t = this.ctx.currentTime;
          const mk = (f, d, type, v) => {
            const o = this.ctx.createOscillator(), g = this.ctx.createGain();
            o.type = type; o.frequency.value = f;
            g.gain.setValueAtTime(v, t); g.gain.exponentialRampToValueAtTime(0.001, t + d);
            o.connect(g); g.connect(this.musicGain); o.start(t); o.stop(t + d + 0.02);
          };
          if (i % 2 === 0) mk(sc[bass[(i >> 2) % bass.length]] / 2, 0.22, 'triangle', 0.5);
          const n = mel[i % mel.length];
          if (n >= 0) mk(sc[n] * 2, 0.16, 'square', 0.12);
        } catch (e) { /* ignora */ }
      }, stepMs);
    },
    stopMusic() { if (this.musicTimer) clearInterval(this.musicTimer); this.musicTimer = null; },
  };

  PF.Audio = Audio;
})();
