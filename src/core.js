// Núcleo: namespace, constantes e utilitários compartilhados.
// Todos os módulos usam scripts clássicos (sem bundler) para o jogo
// funcionar abrindo o index.html direto, inclusive no Android.
(function () {
  const PF = (globalThis.PF = globalThis.PF || {});

  PF.VIEW_W = 960;
  PF.VIEW_H = 540;
  PF.GROUND_Y = 470;          // linha do chão na tela (y dos pés)
  PF.STAGE_W = 1700;          // largura da arena em unidades do mundo
  PF.STAGE_MARGIN = 40;       // distância mínima da borda da arena
  PF.STEP_MS = 1000 / 60;     // passo fixo da simulação
  PF.MAX_FRAME_MS = 250;      // limite do delta para evitar "espiral da morte"

  PF.clamp = (v, lo, hi) => (v < lo ? lo : v > hi ? hi : v);
  PF.lerp = (a, b, t) => a + (b - a) * t;
  PF.approach = (v, target, amount) =>
    v < target ? Math.min(v + amount, target) : Math.max(v - amount, target);
  PF.rectsOverlap = (a, b) =>
    a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y;

  // Gerador pseudoaleatório com semente (útil para testes reprodutíveis).
  PF.makeRng = function (seed) {
    let s = seed >>> 0 || 1;
    return function () {
      s ^= s << 13; s >>>= 0;
      s ^= s >> 17;
      s ^= s << 5; s >>>= 0;
      return s / 4294967296;
    };
  };
  PF.rng = PF.makeRng(Date.now());

  // Log de desenvolvimento: registra cada aviso só uma vez.
  const warned = new Set();
  PF.warnOnce = function (key, msg) {
    if (warned.has(key)) return;
    warned.add(key);
    if (typeof console !== 'undefined') console.warn('[Pinguim] ' + msg);
  };

  // Barramento de eventos simples (som, efeitos, HUD).
  PF.Events = class {
    constructor() { this.handlers = {}; }
    on(name, fn) { (this.handlers[name] = this.handlers[name] || []).push(fn); }
    emit(name, data) {
      const list = this.handlers[name];
      if (!list) return;
      for (const fn of list) {
        try { fn(data); } catch (e) { console.error('Erro no evento ' + name, e); }
      }
    }
    clear() { this.handlers = {}; }
  };
})();
