// Sistema de animação: escolhe o quadro do atlas para cada estado do lutador.
// Cada animação usa a quantidade real de quadros disponível; quando um
// personagem não possui quadros para uma ação, um substituto consistente é
// usado (o quadro mais próximo + transformação simples), nunca um arquivo
// inexistente ou região errada da imagem.
(function () {
  const PF = globalThis.PF;

  // duração de cada quadro (ms) e se a animação repete
  const TIMING = {
    idle: { ms: 190, loop: true }, walk: { ms: 120, loop: true }, walkBack: { ms: 135, loop: true },
    run: { ms: 85, loop: true }, crouch: { ms: 200, loop: false }, jumpUp: { ms: 140, loop: false },
    jumpDown: { ms: 140, loop: false }, block: { ms: 200, loop: false }, blockLow: { ms: 200, loop: false },
    hit: { ms: 120, loop: false }, launched: { ms: 120, loop: false }, down: { ms: 200, loop: false },
    getup: { ms: 130, loop: false }, dizzy: { ms: 220, loop: true }, victory: { ms: 220, loop: true },
    defeatPose: { ms: 200, loop: false },
  };

  // cadeia de substitutos quando a animação não existe
  const FALLBACK = {
    walkBack: 'walk', run: 'walk', walk: 'idle', jumpUp: 'idle', jumpDown: 'jumpUp', punch: 'idle',
    kick: 'punch', special: 'punch', quake: 'special', hit: 'idle', launched: 'hit', down: 'defeat',
    defeat: 'hit', getup: 'idle', dizzy: 'hit', victory: 'idle', block: 'idle', blockLow: 'crouch',
    crouch: 'idle', defeatPose: 'hit',
  };

  const cache = {};

  // Lista de índices do atlas para uma animação lógica do personagem.
  function resolve(charId, name) {
    const key = charId + ':' + name;
    if (cache[key]) return cache[key];
    const def = PF.CHARACTERS[charId];
    const atlas = PF.ATLAS && PF.ATLAS.characters[charId];
    let cur = name, reversed = false, substitute = false;
    for (let guard = 0; guard < 12 && cur; guard++) {
      const spec = def && def.sprites[cur];
      const src = spec ? spec.from : cur;
      const list = atlas && atlas.animations[src];
      if (list && list.length) {
        let frames = spec && spec.seq ? spec.seq.filter((i) => i < list.length).map((i) => list[i]) : list.slice();
        if (!frames.length) frames = [list[0]];
        if (name === 'walkBack' && cur === 'walk') reversed = true;
        if (reversed) frames = frames.slice().reverse();
        const out = { frames, substitute, from: cur };
        if (substitute) PF.warnOnce('anim' + key, `Animação "${name}" ausente para ${charId}; usando "${cur}" como substituto.`);
        cache[key] = out;
        return out;
      }
      if (cur === 'walkBack') reversed = true;
      cur = FALLBACK[cur];
      substitute = true;
    }
    // nenhum quadro disponível (atlas não carregado): o renderizador desenha uma silhueta
    const none = { frames: [], substitute: true, from: null };
    cache[key] = none;
    return none;
  }

  // Animação lógica a partir do estado do lutador.
  function logicalAnim(f) {
    switch (f.state) {
      case 'idle': case 'intro': return f.guarding ? 'block' : 'idle';
      case 'walk': return f.walkDir < 0 ? 'walkBack' : 'walk';
      case 'crouch': return f.guarding ? 'blockLow' : 'crouch';
      case 'jumpSquat': case 'land': return 'crouch';
      case 'air': return f.vy > 0 ? 'jumpUp' : 'jumpDown';
      case 'dash': return f.dashDir < 0 ? 'walkBack' : 'run';
      case 'run': return 'run';
      case 'attack': return (f.move && f.move.anim) || 'punch';
      case 'blockstun': return f.crouching ? 'blockLow' : 'block';
      case 'hitstun': return 'hit';
      case 'launched': case 'thrown': return 'launched';
      case 'knockdown': return 'down';
      case 'getup': return 'getup';
      case 'dizzy': return 'dizzy';
      case 'ko': return f.grounded && f.vy === 0 ? 'down' : 'launched';
      case 'victory': return 'victory';
      case 'defeat': return 'defeatPose';
      default: return 'idle';
    }
  }

  // Calcula o quadro e as transformações do lutador no instante atual.
  function pose(f, now) {
    const name = logicalAnim(f);
    const r = resolve(f.def.id, name);
    const frames = r.frames;
    const n = frames.length;
    const t = f.stateTime;
    const out = { name, frame: n ? frames[0] : -1, sx: 1, sy: 1, rot: 0, ox: 0, oy: 0, substitute: r.substitute, from: r.from };
    if (!n) return out;

    if (f.state === 'attack' && f.move) {
      const m = f.move, mt = f.moveTime;
      let idx;
      if (mt < m.startup) {
        const p = mt / Math.max(1, m.startup);
        idx = n >= 2 ? Math.min(n - 2, Math.floor(p * (n - 1))) : 0;
        out.ox = -5 * p; out.sy = 1 - 0.03 * p;
      } else if (mt < m.startup + m.active) {
        idx = n - 1;
        out.ox = 9; out.sx = 1.05;
      } else {
        const p = (mt - m.startup - m.active) / Math.max(1, m.recovery);
        idx = n >= 2 ? Math.max(0, Math.round((1 - p) * (n - 2))) : 0;
        out.ox = 9 * (1 - p);
      }
      out.frame = frames[idx];
      if (name === 'kick' && r.substitute) { out.rot = -0.1; out.oy = 6; }
      if (name === 'kick' && !r.substitute) { out.rot = -0.05; }
      if (m.crouch) { out.sy *= 0.74; out.sx *= 1.06; }
      if (m.air) out.rot += -0.08;
      return out;
    }

    const tm = TIMING[name] || { ms: 160, loop: true };
    let idx = Math.floor(t / tm.ms);
    if (tm.loop) idx = idx % n;
    else idx = Math.min(idx, n - 1);
    out.frame = frames[idx];

    const time = (now || 0) / 1000;
    switch (name) {
      case 'idle': {
        const b = Math.sin(time * Math.PI * 1.6 + f.side);
        out.sy = 1 + 0.018 * b; out.sx = 1 - 0.01 * b;
        break;
      }
      case 'walk': case 'walkBack': case 'run':
        if (n < 3) out.oy = Math.abs(Math.sin(t / (name === 'run' ? 70 : 110))) * 5;
        if (name === 'run') out.rot = 0.05;
        break;
      case 'crouch': case 'blockLow': {
        const p = f.state === 'jumpSquat' || f.state === 'land' ? 0.85 : 0.72;
        out.sy = p; out.sx = 1.07;
        if (name === 'blockLow') out.rot = -0.04;
        break;
      }
      case 'block': out.rot = -0.06; out.ox = -3; break;
      case 'hit': out.rot = -0.14; out.ox = -6 * Math.max(0, 1 - t / 250); break;
      case 'launched': out.rot = -Math.min(0.9, 0.25 + t / 700); break;
      case 'down':
        if (r.from !== 'defeat') { out.rot = -1.45; out.oy = -10; }
        break;
      case 'getup': out.sy = 0.6 + 0.4 * Math.min(1, t / 380); break;
      case 'dizzy': out.rot = Math.sin(time * 5) * 0.08; break;
      case 'jumpUp': case 'jumpDown':
        if (r.substitute) { out.sy = 0.94; out.rot = f.vy > 0 ? -0.05 : 0.05; }
        break;
      case 'victory':
        if (r.substitute) out.oy = Math.abs(Math.sin(time * 4)) * 10;
        break;
      case 'defeatPose': out.rot = -0.05; out.sy = 0.96; break;
    }
    return out;
  }

  PF.Anim = { resolve, logicalAnim, pose, TIMING, FALLBACK, clearCache: () => { for (const k in cache) delete cache[k]; } };
})();
