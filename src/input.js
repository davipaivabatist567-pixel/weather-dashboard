// Entrada: teclado (remapeável), toque com multitouch, controle (gamepad)
// e o buffer de comandos usado para combos e especiais.
(function () {
  const PF = globalThis.PF;

  const ACTIONS = ['left', 'right', 'up', 'down', 'punch', 'kick', 'block', 'special', 'super'];
  PF.ACTIONS = ACTIONS;
  PF.ACTION_NAMES = {
    left: 'Esquerda', right: 'Direita', up: 'Pular', down: 'Agachar', punch: 'Soco',
    kick: 'Chute', block: 'Defesa', special: 'Especial', super: 'Super',
  };

  const DEFAULT_KEYS = {
    1: { left: ['KeyA'], right: ['KeyD'], up: ['KeyW'], down: ['KeyS'], punch: ['KeyJ'],
      kick: ['KeyK'], block: ['KeyL'], special: ['KeyU'], super: ['KeyI'] },
    2: { left: ['ArrowLeft'], right: ['ArrowRight'], up: ['ArrowUp'], down: ['ArrowDown'],
      punch: ['Numpad1', 'Comma'], kick: ['Numpad2', 'Period'], block: ['Numpad3', 'Slash'],
      special: ['Numpad5', 'KeyM'], super: ['Numpad6', 'KeyN'] },
  };

  // ----------------------------------------------------------------------
  // Teclado
  // ----------------------------------------------------------------------
  const Keyboard = {
    down: new Set(),
    map: { 1: null, 2: null },
    listening: false,
    captureCallback: null,

    init() {
      this.loadMap();
      if (this.listening || typeof window === 'undefined') return;
      this.listening = true;
      window.addEventListener('keydown', (e) => {
        if (this.captureCallback) {
          e.preventDefault();
          const cb = this.captureCallback;
          this.captureCallback = null;
          cb(e.code);
          return;
        }
        if (this.isGameKey(e.code)) e.preventDefault();
        if (e.repeat) return;
        this.down.add(e.code);
      });
      window.addEventListener('keyup', (e) => { this.down.delete(e.code); });
      // evita teclas "presas" ao trocar de aba ou perder o foco
      window.addEventListener('blur', () => this.down.clear());
      document.addEventListener('visibilitychange', () => { if (document.hidden) this.down.clear(); });
    },

    isGameKey(code) {
      for (const p of [1, 2]) for (const a of ACTIONS) if (this.map[p][a].includes(code)) return true;
      return false;
    },

    loadMap() {
      const copy = JSON.parse(JSON.stringify(DEFAULT_KEYS));
      try {
        const saved = JSON.parse(localStorage.getItem('pf_keys') || 'null');
        if (saved) for (const p of [1, 2]) for (const a of ACTIONS)
          if (saved[p] && Array.isArray(saved[p][a]) && saved[p][a].length) copy[p][a] = saved[p][a];
      } catch (e) { /* sem localStorage: usa padrão */ }
      this.map = copy;
    },
    saveMap() {
      try { localStorage.setItem('pf_keys', JSON.stringify(this.map)); } catch (e) { /* ignora */ }
    },
    resetMap() { this.map = JSON.parse(JSON.stringify(DEFAULT_KEYS)); this.saveMap(); },
    setKey(player, action, code) {
      // remove a tecla de qualquer outra ação para não haver conflito
      for (const p of [1, 2]) for (const a of ACTIONS)
        this.map[p][a] = this.map[p][a].filter((c) => c !== code);
      this.map[player][action] = [code];
      for (const p of [1, 2]) for (const a of ACTIONS)
        if (!this.map[p][a].length) this.map[p][a] = DEFAULT_KEYS[p][a].filter((c) => !this.isUsed(c));
      this.saveMap();
    },
    isUsed(code) {
      for (const p of [1, 2]) for (const a of ACTIONS) if (this.map[p][a].includes(code)) return true;
      return false;
    },
    capture(cb) { this.captureCallback = cb; },
    read(player) {
      const st = {};
      const m = this.map[player];
      for (const a of ACTIONS) st[a] = m[a].some((c) => this.down.has(c));
      return st;
    },
    clear() { this.down.clear(); },
  };
  PF.Keyboard = Keyboard;

  PF.keyLabel = function (code) {
    if (!code) return '?';
    if (code.startsWith('Key')) return code.slice(3);
    if (code.startsWith('Digit')) return code.slice(5);
    if (code.startsWith('Numpad')) return 'Num ' + code.slice(6);
    const names = { ArrowLeft: '←', ArrowRight: '→', ArrowUp: '↑', ArrowDown: '↓', Space: 'Espaço',
      Comma: ',', Period: '.', Slash: '/', Semicolon: ';', ShiftLeft: 'Shift', ShiftRight: 'Shift D',
      ControlLeft: 'Ctrl', Enter: 'Enter' };
    return names[code] || code;
  };

  // ----------------------------------------------------------------------
  // Toque (multitouch). Cada dedo é rastreado pelo pointerId, então é possível
  // andar e atacar ao mesmo tempo e deslizar o dedo entre botões.
  // ----------------------------------------------------------------------
  const Touch = {
    state: { left: false, right: false, up: false, down: false, punch: false, kick: false,
      block: false, special: false, super: false },
    pointers: new Map(),
    root: null,
    dpad: null,

    init(root) {
      if (!root || this.root) return;
      this.root = root;
      this.dpad = root.querySelector('[data-dpad]');
      const opts = { passive: false };
      root.addEventListener('pointerdown', (e) => this.onDown(e), opts);
      root.addEventListener('pointermove', (e) => this.onMove(e), opts);
      root.addEventListener('pointerup', (e) => this.onUp(e), opts);
      root.addEventListener('pointercancel', (e) => this.onUp(e), opts);
      root.addEventListener('lostpointercapture', (e) => this.onUp(e), opts);
      root.addEventListener('contextmenu', (e) => e.preventDefault());
      // gestos do navegador (pinça, zoom por duplo toque, rolagem)
      root.addEventListener('touchstart', (e) => e.preventDefault(), opts);
      root.addEventListener('touchmove', (e) => e.preventDefault(), opts);
      window.addEventListener('blur', () => this.releaseAll());
    },

    onDown(e) {
      e.preventDefault();
      const target = this.targetAt(e.clientX, e.clientY);
      if (!target) return;
      try { this.root.setPointerCapture(e.pointerId); } catch (err) { /* ok */ }
      this.pointers.set(e.pointerId, { kind: target.kind, btn: target.btn, x: e.clientX, y: e.clientY });
      this.recompute();
    },
    onMove(e) {
      const p = this.pointers.get(e.pointerId);
      if (!p) return;
      e.preventDefault();
      p.x = e.clientX; p.y = e.clientY;
      if (p.kind === 'btn') {
        const t = this.targetAt(e.clientX, e.clientY);
        if (t && t.kind === 'btn') p.btn = t.btn;
      }
      this.recompute();
    },
    onUp(e) {
      if (!this.pointers.has(e.pointerId)) return;
      this.pointers.delete(e.pointerId);
      this.recompute();
    },
    targetAt(x, y) {
      const el = document.elementFromPoint(x, y);
      if (!el) return null;
      if (this.dpad && (el === this.dpad || this.dpad.contains(el))) return { kind: 'dpad' };
      const b = el.closest('[data-btn]');
      if (b && this.root.contains(b)) return { kind: 'btn', btn: b.dataset.btn };
      return null;
    },
    recompute() {
      const s = this.state;
      for (const k in s) s[k] = false;
      for (const p of this.pointers.values()) {
        if (p.kind === 'dpad' && this.dpad) {
          const r = this.dpad.getBoundingClientRect();
          const dx = p.x - (r.left + r.width / 2), dy = p.y - (r.top + r.height / 2);
          const dead = r.width * 0.16;
          if (Math.hypot(dx, dy) > dead) {
            const ang = Math.atan2(dy, dx); // 8 direções
            const oct = Math.round(ang / (Math.PI / 4));
            const o = (oct + 8) % 8;
            if (o === 0 || o === 1 || o === 7) s.right = true;
            if (o === 3 || o === 4 || o === 5) s.left = true;
            if (o === 1 || o === 2 || o === 3) s.down = true;
            if (o === 5 || o === 6 || o === 7) s.up = true;
          }
        } else if (p.kind === 'btn' && p.btn in s) {
          s[p.btn] = true;
        }
      }
      if (this.root) {
        this.root.querySelectorAll('[data-btn]').forEach((b) => b.classList.toggle('on', !!s[b.dataset.btn]));
        if (this.dpad) this.dpad.dataset.dir = (s.up ? 'u' : '') + (s.down ? 'd' : '') + (s.left ? 'l' : '') + (s.right ? 'r' : '');
      }
    },
    releaseAll() { this.pointers.clear(); this.recompute(); },
    read() { return Object.assign({}, this.state); },
  };
  PF.Touch = Touch;

  // ----------------------------------------------------------------------
  // Gamepad (opcional)
  // ----------------------------------------------------------------------
  PF.readGamepad = function (index) {
    if (typeof navigator === 'undefined' || !navigator.getGamepads) return null;
    const gp = navigator.getGamepads()[index];
    if (!gp || !gp.connected) return null;
    const b = (i) => !!(gp.buttons[i] && gp.buttons[i].pressed);
    const ax = gp.axes[0] || 0, ay = gp.axes[1] || 0;
    return {
      left: b(14) || ax < -0.5, right: b(15) || ax > 0.5, up: b(12) || ay < -0.5, down: b(13) || ay > 0.5,
      punch: b(2), kick: b(0), block: b(1) || b(5) || b(4), special: b(3), super: b(7) || b(6),
    };
  };

  // ----------------------------------------------------------------------
  // Controladores: fontes de entrada para um lutador.
  // ----------------------------------------------------------------------
  PF.HumanController = class {
    constructor(player, opts = {}) {
      this.player = player;
      this.useTouch = !!opts.touch;
      this.gamepad = opts.gamepad == null ? player - 1 : opts.gamepad;
      this.enabled = true;
    }
    read() {
      const s = Keyboard.read(this.player);
      if (this.useTouch) {
        const t = Touch.read();
        for (const k in s) s[k] = s[k] || t[k];
      }
      const g = PF.readGamepad(this.gamepad);
      if (g) for (const k in s) s[k] = s[k] || g[k];
      return s;
    }
  };

  PF.emptyInput = () => ({ left: false, right: false, up: false, down: false, punch: false,
    kick: false, block: false, special: false, super: false });

  // ----------------------------------------------------------------------
  // Buffer de comandos: guarda o histórico de direções (notação numérica,
  // relativa à direção do lutador) e de botões apertados.
  //   7 8 9
  //   4 5 6     6 = para frente, 4 = para trás
  //   1 2 3
  // ----------------------------------------------------------------------
  const BUTTONS = ['punch', 'kick', 'block', 'special', 'super'];
  PF.InputBuffer = class {
    constructor() { this.reset(); }
    reset() {
      this.time = 0;
      this.history = [];       // {t, dir}
      this.presses = [];       // {t, btn, used}
      this.prev = PF.emptyInput();
      this.held = PF.emptyInput();
      this.dir = 5;
      this.fwd = false; this.back = false;
    }
    push(raw, facing, dtMs) {
      this.time += dtMs;
      // direções opostas simultâneas se anulam (SOCD neutro)
      let left = raw.left && !raw.right, right = raw.right && !raw.left;
      const up = raw.up && !raw.down, down = raw.down && !raw.up;
      const fwd = facing > 0 ? right : left;
      const back = facing > 0 ? left : right;
      let dir = 5;
      if (down) dir = fwd ? 3 : back ? 1 : 2;
      else if (up) dir = fwd ? 9 : back ? 7 : 8;
      else dir = fwd ? 6 : back ? 4 : 5;
      this.fwd = fwd; this.back = back; this.dir = dir;
      if (!this.history.length || this.history[this.history.length - 1].dir !== dir)
        this.history.push({ t: this.time, dir });
      for (const b of BUTTONS) if (raw[b] && !this.prev[b]) this.presses.push({ t: this.time, btn: b, used: false });
      this.held = Object.assign({}, raw, { left, right, up, down });
      this.prev = Object.assign({}, raw);
      // descarta histórico antigo
      const limit = this.time - 1000;
      while (this.history.length > 1 && this.history[1].t < limit) this.history.shift();
      while (this.presses.length && this.presses[0].t < limit) this.presses.shift();
    }
    // botão apertado dentro da janela (buffer) e ainda não consumido
    pressed(btn, windowMs = 100) {
      for (let i = this.presses.length - 1; i >= 0; i--) {
        const p = this.presses[i];
        if (this.time - p.t > windowMs) break;
        if (p.btn === btn && !p.used) return p;
      }
      return null;
    }
    consume(btn, windowMs = 120) {
      for (let i = this.presses.length - 1; i >= 0; i--) {
        const p = this.presses[i];
        if (this.time - p.t > windowMs) break;
        if (p.btn === btn) p.used = true;
      }
    }
    consumeAll() { for (const p of this.presses) p.used = true; }
    // dois botões apertados quase juntos (para agarrão / super)
    together(a, b, windowMs = 90) {
      const pa = this.pressed(a, windowMs), pb = this.pressed(b, windowMs);
      return !!(pa && pb && Math.abs(pa.t - pb.t) <= 70);
    }
    lastPressTime(btn) {
      for (let i = this.presses.length - 1; i >= 0; i--) if (this.presses[i].btn === btn) return this.presses[i].t;
      return -Infinity;
    }
    // procura a sequência de direções dentro da janela de tempo
    matchSequence(seq, windowMs) {
      const start = this.time - windowMs;
      let idx = seq.length - 1;
      for (let i = this.history.length - 1; i >= 0 && idx >= 0; i--) {
        const h = this.history[i];
        const next = this.history[i + 1];
        if (next && next.t < start) break;
        if (seq[idx].includes(h.dir)) idx--;
      }
      return idx < 0;
    }
    motion(name, windowMs = 450) {
      switch (name) {
        case 'qcf': return this.matchSequence([[2], [3], [6]], windowMs);
        case 'qcb': return this.matchSequence([[2], [1], [4]], windowMs);
        case 'ff': return this.matchSequence([[6], [5, 2, 8, 4], [6]], 300);
        case 'bb': return this.matchSequence([[4], [5, 2, 8, 6], [4]], 300);
        default: return false;
      }
    }
    clearMotion() { this.history = [{ t: this.time, dir: this.dir }]; }
  };
})();
