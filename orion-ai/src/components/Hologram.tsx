// Holograma do Orion no estilo do VISION (interface.py), redesenhado em Canvas 2D:
// esfera de dados com onda de varredura, anéis giroscópicos com cometas, anel graduado, órbitas,
// núcleo em wireframe, cristal pulsante, ondas de choque, nós, palavras flutuantes, arcos de HUD,
// brilho (bloom) e linhas de varredura. Azul em repouso, vermelho enquanto o Orion fala.
// Controle: arrastar gira, roda/pinça dá zoom, toque duplo reinicia; com a câmera ligada,
// uma mão gira e as duas mãos em pinça dão zoom (mesma lógica do VISION).
import { useEffect, useRef } from "react";
import { useOrion, type CoreState } from "../store";
import { getVisionEngine } from "../vision/engine";

type V3 = [number, number, number];
type M3 = number[]; // 3x3, linha a linha

// ------------------------------------------------------------------ geometria (fixa, semente 7)
function mulberry32(a: number) {
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
const rnd = mulberry32(7);
const uni = (a: number, b: number) => a + (b - a) * rnd();
const gauss = () => Math.sqrt(-2 * Math.log(rnd() + 1e-12)) * Math.cos(2 * Math.PI * rnd());

const rotX = (a: number): M3 => [1, 0, 0, 0, Math.cos(a), -Math.sin(a), 0, Math.sin(a), Math.cos(a)];
const rotY = (a: number): M3 => [Math.cos(a), 0, Math.sin(a), 0, 1, 0, -Math.sin(a), 0, Math.cos(a)];
const rotZ = (a: number): M3 => [Math.cos(a), -Math.sin(a), 0, Math.sin(a), Math.cos(a), 0, 0, 0, 1];
const mul = (a: M3, b: M3): M3 => {
  const o = new Array(9).fill(0);
  for (let i = 0; i < 3; i++) for (let j = 0; j < 3; j++) for (let k = 0; k < 3; k++) o[i * 3 + j] += a[i * 3 + k] * b[k * 3 + j];
  return o;
};
const apply = (m: M3, p: V3): V3 => [
  m[0] * p[0] + m[1] * p[1] + m[2] * p[2],
  m[3] * p[0] + m[4] * p[1] + m[5] * p[2],
  m[6] * p[0] + m[7] * p[1] + m[8] * p[2],
];
const norm = (p: V3): V3 => {
  const l = Math.hypot(p[0], p[1], p[2]) || 1;
  return [p[0] / l, p[1] / l, p[2] / l];
};

function icosphere(sub: number) {
  const t = (1 + Math.sqrt(5)) / 2;
  const verts: V3[] = (
    [[-1, t, 0], [1, t, 0], [-1, -t, 0], [1, -t, 0], [0, -1, t], [0, 1, t], [0, -1, -t], [0, 1, -t], [t, 0, -1], [t, 0, 1], [-t, 0, -1], [-t, 0, 1]] as V3[]
  ).map(norm);
  let faces = [[0, 11, 5], [0, 5, 1], [0, 1, 7], [0, 7, 10], [0, 10, 11], [1, 5, 9], [5, 11, 4], [11, 10, 2], [10, 7, 6], [7, 1, 8], [3, 9, 4], [3, 4, 2], [3, 2, 6], [3, 6, 8], [3, 8, 9], [4, 9, 5], [2, 4, 11], [6, 2, 10], [8, 6, 7], [9, 8, 1]];
  const cache = new Map<string, number>();
  const mid = (a: number, b: number) => {
    const k = a < b ? `${a}-${b}` : `${b}-${a}`;
    const c = cache.get(k);
    if (c !== undefined) return c;
    const p = norm([verts[a][0] + verts[b][0], verts[a][1] + verts[b][1], verts[a][2] + verts[b][2]]);
    verts.push(p);
    cache.set(k, verts.length - 1);
    return verts.length - 1;
  };
  for (let s = 0; s < sub; s++) {
    const nf: number[][] = [];
    for (const [a, b, c] of faces) {
      const ab = mid(a, b), bc = mid(b, c), ca = mid(c, a);
      nf.push([a, ab, ca], [b, bc, ab], [c, ca, bc], [ab, bc, ca]);
    }
    faces = nf;
  }
  const edges = new Set<string>();
  for (const [a, b, c] of faces) for (const [p, q] of [[a, b], [b, c], [c, a]]) edges.add(p < q ? `${p}-${q}` : `${q}-${p}`);
  return { verts, edges: [...edges].map((e) => e.split("-").map(Number) as [number, number]) };
}

const CORE = icosphere(1);
const INNER = icosphere(0);
const CRYSTAL_V: V3[] = [[0, 1, 0], [1, 0, 0], [0, 0, 1], [-1, 0, 0], [0, 0, -1], [0, -1, 0]];
const CRYSTAL_F = [[0, 1, 2], [0, 2, 3], [0, 3, 4], [0, 4, 1], [5, 2, 1], [5, 3, 2], [5, 4, 3], [5, 1, 4]];
const CRYSTAL_E: [number, number][] = [];
{
  const s = new Set<string>();
  for (const f of CRYSTAL_F) for (const [a, b] of [[f[0], f[1]], [f[1], f[2]], [f[2], f[0]]]) s.add(a < b ? `${a}-${b}` : `${b}-${a}`);
  for (const e of s) CRYSTAL_E.push(e.split("-").map(Number) as [number, number]);
}
const circle = (n: number, f: (a: number) => V3): V3[] => Array.from({ length: n }, (_, i) => f((i / (n - 1)) * 2 * Math.PI));
const LAT_RINGS: V3[][] = Array.from({ length: 24 }, (_, i) => {
  const u = -1 + (2 * i) / 23;
  const g = Math.sign(u) * Math.abs(u) ** 1.6 * 1.35;
  return circle(72, (a) => [Math.cos(g) * Math.cos(a), Math.sin(g), Math.cos(g) * Math.sin(a)]);
});
const UNIT_CIRCLE = circle(181, (a) => [Math.cos(a), 0, Math.sin(a)]);
// (raio, inclinação x, inclinação z, giro, velocidade do cometa, cauda)
const GYROS = [
  [1.0, 1.15, 0.0, 0.3, 0.22, 0.2],
  [1.0, 0.35, 1.05, -0.24, -0.17, 0.2],
  [1.0, -0.75, -0.8, 0.18, 0.27, 0.16],
  [1.24, 0.55, 0.35, -0.1, 0.12, 0.1],
];
const ORBITS = Array.from({ length: 8 }, () => {
  const a = uni(0.3, 0.75);
  const b = a * uni(0.45, 0.85);
  const R = mul(mul(rotX(uni(0, 3.14)), rotY(uni(0, 3.14))), rotZ(uni(0, 3.14)));
  return { pts: circle(72, (t) => apply(R, [a * Math.cos(t), b * Math.sin(t), 0])), speed: uni(0.08, 0.22) * (rnd() < 0.5 ? -1 : 1) };
});
const SHELL: V3[] = Array.from({ length: 340 }, (_, k) => {
  const i = k + 0.5;
  const phi = Math.acos(1 - (2 * i) / 340);
  const th = Math.PI * (1 + Math.sqrt(5)) * i;
  return [Math.cos(th) * Math.sin(phi), Math.cos(phi), Math.sin(th) * Math.sin(phi)];
});
const randDir = (): V3 => norm([gauss(), gauss(), gauss()]);
const scale = (p: V3, s: number): V3 => [p[0] * s, p[1] * s, p[2] * s];
const NODES = Array.from({ length: 18 }, () => scale(randDir(), uni(1.9, 3.25)));
const STARS = Array.from({ length: 48 }, () => scale(randDir(), uni(2.1, 4.1)));
const TOKENS = ["0xFF3A", "fn main", "async ()", "λ x→y", "vec3", "quat", "tensor", "∑ wᵢxᵢ", "malloc()", "fork()", "spawn()",
  "void*", "impl Orb", "01101001", "10110100", "hash256", "mutex.lk", "kernel.d", "core.0", "pipe |>", "::bind", "matriz",
  "sinal", "órbita", "vetor", "pt-BR", "ORION", "→ RDY", "IRQ 0x7", "DMA", "HEAP 4K", "REG EAX", "eth0", "∫ f(t)dt", "δ/δt",
  "chmod +x", "pixels", "frame", "landmark", "BLE"];
const LABELS = Array.from({ length: 140 }, () => {
  const d = randDir();
  const r = 0.35 + 0.72 * Math.sqrt(rnd());
  return { p: [d[0] * r, d[1] * 0.85 * r, d[2] * r] as V3, txt: TOKENS[Math.floor(rnd() * TOKENS.length)] };
});

// ------------------------------------------------------------------ paleta
type RGB = [number, number, number];
const AZUL = { bright: [110, 225, 255], mid: [45, 160, 255], text: [140, 235, 255], white: [235, 250, 255] } as Record<string, RGB>;
const VERMELHO = { bright: [255, 70, 70], mid: [232, 42, 38], text: [255, 145, 135], white: [255, 240, 235] } as Record<string, RGB>;
const blend = (k: number) => {
  const o: Record<string, RGB> = {};
  for (const n of Object.keys(AZUL)) o[n] = AZUL[n].map((v, i) => v * (1 - k) + VERMELHO[n][i] * k) as RGB;
  return o;
};
const mix = (c: RGB, w: RGB, a: number): RGB => {
  const t = Math.max(0, Math.min(1, a));
  return [c[0] * (1 - t) + w[0] * t, c[1] * (1 - t) + w[1] * t, c[2] * (1 - t) + w[2] * t];
};
const rgb = (c: RGB, b = 1) => `rgb(${Math.min(255, c[0] * b) | 0},${Math.min(255, c[1] * b) | 0},${Math.min(255, c[2] * b) | 0})`;

const ESTADO: Record<CoreState, string> = {
  repouso: "EM REPOUSO", escuta: "ESCUTANDO", processando: "PROCESSANDO", falando: "RESPONDENDO",
  gesto: "GESTO RECONHECIDO", erro: "ERRO", especial: "MODO ESPECIAL",
};

// ------------------------------------------------------------------ componente
export function Hologram({ fullscreen = false, onClose }: { fullscreen?: boolean; onClose?: () => void }) {
  const wrap = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current!;
    const ctx = canvas.getContext("2d")!;
    const glow = document.createElement("canvas");
    const gctx = glow.getContext("2d")!;
    const temFiltro = typeof (ctx as { filter?: unknown }).filter === "string";
    let W = 0, H = 0, K = 1, F = 1;
    let raf = 0;
    let parado = false;

    // estado da câmera virtual
    const S = { yaw: 0, pitch: 0.15, vyaw: 0.25, vpitch: 0, zoom: 1, zoomT: 1, glow: 1, red: 0 };
    const AUTO = 0.25;
    let mdx = 0, mdy = 0;
    const clampZ = (z: number) => Math.max(0.45, Math.min(3.6, z));

    const resize = () => {
      const r = canvas.getBoundingClientRect();
      const dpr = Math.min(window.devicePixelRatio || 1, 1.5);
      // limita a resolução de renderização (como o VISION) para poupar bateria
      const lim = Math.min(1, 1600 / (r.width * dpr), 1000 / (r.height * dpr));
      W = Math.max(200, Math.round(r.width * dpr * lim));
      H = Math.max(200, Math.round(r.height * dpr * lim));
      canvas.width = W;
      canvas.height = H;
      glow.width = Math.max(1, Math.round(W / 2));
      glow.height = Math.max(1, Math.round(H / 2));
      K = Math.min(W, H) / 720;
      F = 1.5 * Math.min(W, H);
    };
    const ro = new ResizeObserver(resize);
    ro.observe(canvas);
    resize();

    // ---- entrada: arrastar, pinça, roda, toque duplo, teclado
    const ptrs = new Map<number, { x: number; y: number }>();
    let pinch0 = 0;
    const onDown = (e: PointerEvent) => {
      canvas.setPointerCapture(e.pointerId);
      ptrs.set(e.pointerId, { x: e.clientX, y: e.clientY });
    };
    const onMove = (e: PointerEvent) => {
      const p = ptrs.get(e.pointerId);
      if (!p) return;
      const w = canvas.getBoundingClientRect().width || 1;
      if (ptrs.size === 1) {
        mdx += (e.clientX - p.x) / w;
        mdy += (e.clientY - p.y) / w;
      }
      p.x = e.clientX;
      p.y = e.clientY;
      if (ptrs.size === 2) {
        const [a, b] = [...ptrs.values()];
        const d = Math.hypot(a.x - b.x, a.y - b.y);
        if (pinch0) S.zoomT = clampZ(S.zoomT * (d / pinch0));
        pinch0 = d;
      }
    };
    const onUp = (e: PointerEvent) => {
      ptrs.delete(e.pointerId);
      pinch0 = 0;
    };
    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      S.zoomT = clampZ(S.zoomT * (e.deltaY < 0 ? 1.1 : 1 / 1.1));
    };
    const reset = () => Object.assign(S, { yaw: 0, pitch: 0.15, zoomT: 1, vyaw: AUTO, vpitch: 0 });
    const onKey = (e: KeyboardEvent) => {
      if (!fullscreen) return;
      if (e.key === "Escape") onClose?.();
      else if (e.key === "+" || e.key === "=") S.zoomT = clampZ(S.zoomT * 1.25);
      else if (e.key === "-") S.zoomT = clampZ(S.zoomT / 1.25);
      else if (e.key === "]") S.glow = Math.min(3, S.glow * 1.2);
      else if (e.key === "[") S.glow = Math.max(0.2, S.glow / 1.2);
      else if (e.key.toLowerCase() === "r") reset();
    };
    canvas.addEventListener("pointerdown", onDown);
    canvas.addEventListener("pointermove", onMove);
    canvas.addEventListener("pointerup", onUp);
    canvas.addEventListener("pointercancel", onUp);
    canvas.addEventListener("wheel", onWheel, { passive: false });
    canvas.addEventListener("dblclick", reset);
    window.addEventListener("keydown", onKey);

    // ---- mãos (câmera): uma mão gira, duas mãos em pinça dão zoom
    const mao = { prevPalm: null as null | [number, number], palmS: null as null | [number, number], prevDist: 0 };
    const lerMaos = (now: number) => {
      const st = useOrion.getState();
      const eng = getVisionEngine();
      if (!st.settings.activation.handsHologram || !eng.running) return;
      const espelho = st.settings.camera.mirror;
      const maos = eng.latest.hands.filter((h) => now - h.lastSeen < 150);
      const d = (a: { x: number; y: number }, b: { x: number; y: number }) => Math.hypot(a.x - b.x, a.y - b.y);
      const info = maos.map((h) => {
        const lm = h.image;
        const tam = Math.max(d(lm[0], lm[9]), 1e-4);
        const px = (x: number) => (espelho ? 1 - x : x);
        return { pinca: d(lm[4], lm[8]) / tam < 0.55, palma: [px(lm[9].x), lm[9].y] as [number, number], pp: [px((lm[4].x + lm[8].x) / 2), (lm[4].y + lm[8].y) / 2] as [number, number] };
      });
      if (info.length === 2 && info[0].pinca && info[1].pinca) {
        const dist = Math.hypot(info[0].pp[0] - info[1].pp[0], info[0].pp[1] - info[1].pp[1]);
        if (mao.prevDist) S.zoomT = clampZ(S.zoomT * Math.max(0.7, Math.min(1.4, (dist / mao.prevDist) ** 1.8)));
        mao.prevDist = dist;
        mao.prevPalm = mao.palmS = null;
        return;
      }
      mao.prevDist = 0;
      if (info.length === 1) {
        const p = info[0].palma;
        mao.palmS = mao.palmS ? [mao.palmS[0] * 0.5 + p[0] * 0.5, mao.palmS[1] * 0.5 + p[1] * 0.5] : p;
        if (mao.prevPalm) {
          let dx = mao.palmS[0] - mao.prevPalm[0];
          let dy = mao.palmS[1] - mao.prevPalm[1];
          if (Math.abs(dx) < 0.0015 && Math.abs(dy) < 0.0015) dx = dy = 0;
          mdx += dx;
          mdy += dy;
        }
        mao.prevPalm = mao.palmS;
      } else mao.prevPalm = mao.palmS = null;
    };

    // ---- projeção (igual ao VISION)
    let R: M3 = rotX(0);
    let camd = 4;
    const proj = (p: V3) => {
      const c = apply(R, p);
      const depth = Math.max(camd + c[2], 0.12);
      const s = F / depth;
      return { x: W / 2 + c[0] * s, y: H / 2 - c[1] * s, s, z: c[2] };
    };

    // anel com sombreamento por profundidade + cometa (segmentos agrupados por brilho)
    const anel = (pts: V3[], pal: Record<string, RGB>, cor: RGB, th: number, gth: number, bmin: number, bmax: number, t: number, speed: number, tail: number) => {
      const P = pts.map(proj);
      const n = P.length - 1;
      const head = speed ? (((t * speed) % 1) + 1) % 1 * n : -1;
      const grupos = new Map<number, number[]>();
      const cometas: number[] = [];
      const brs = new Float32Array(n), bos = new Float32Array(n);
      for (let i = 0; i < n; i++) {
        const zm = (P[i].z + P[i + 1].z) / 2;
        const fr = Math.max(0, Math.min(1, 0.5 - zm / 2));
        brs[i] = bmin + (bmax - bmin) * fr;
        if (speed) {
          const dd = (((head - i) % n) + n) % n;
          bos[i] = Math.max(0, Math.min(1, 1 - dd / Math.max(1, tail * n))) ** 1.5;
        }
        if (bos[i] > 0.01) cometas.push(i);
        else {
          const k = Math.round(brs[i] * 10);
          (grupos.get(k) ?? grupos.set(k, []).get(k)!).push(i);
        }
      }
      for (const [k, segs] of grupos) {
        const b = k / 10;
        ctx.strokeStyle = rgb(mix(cor, pal.white, 0.35), b);
        ctx.lineWidth = th;
        ctx.beginPath();
        for (const i of segs) {
          ctx.moveTo(P[i].x, P[i].y);
          ctx.lineTo(P[i + 1].x, P[i + 1].y);
        }
        ctx.stroke();
        if (gth) {
          gctx.strokeStyle = rgb(cor, b * 0.85);
          gctx.lineWidth = gth;
          gctx.beginPath();
          for (const i of segs) {
            gctx.moveTo(P[i].x, P[i].y);
            gctx.lineTo(P[i + 1].x, P[i + 1].y);
          }
          gctx.stroke();
        }
      }
      for (const i of cometas) {
        const bo = bos[i], b = brs[i];
        ctx.strokeStyle = rgb(mix(cor, pal.white, 0.35 + bo * 0.6), b + bo * 0.9);
        ctx.lineWidth = th + (bo > 0.55 ? 1 : 0);
        ctx.beginPath();
        ctx.moveTo(P[i].x, P[i].y);
        ctx.lineTo(P[i + 1].x, P[i + 1].y);
        ctx.stroke();
        if (gth) {
          gctx.strokeStyle = rgb(cor, b * 0.85 + bo * 1.1);
          gctx.lineWidth = gth;
          gctx.beginPath();
          gctx.moveTo(P[i].x, P[i].y);
          gctx.lineTo(P[i + 1].x, P[i + 1].y);
          gctx.stroke();
        }
      }
      if (speed) {
        const hp = P[Math.floor(head) % n];
        const r1 = Math.max(2, 2.2 * K);
        gctx.fillStyle = rgb(pal.bright, 0.5 + brs[Math.floor(head) % n] * 0.8);
        gctx.beginPath();
        gctx.arc(hp.x, hp.y, r1 * 4, 0, 7);
        gctx.fill();
        ctx.fillStyle = rgb(pal.white, 0.6 + brs[Math.floor(head) % n]);
        ctx.beginPath();
        ctx.arc(hp.x, hp.y, r1, 0, 7);
        ctx.fill();
      }
    };

    const t0 = performance.now();
    let last = t0;
    let quadros = 0;
    let fpsT = t0;
    let leve = false; // reduz elementos se o aparelho não acompanhar

    const frame = (nowMs: number) => {
      if (parado) return;
      raf = requestAnimationFrame(frame);
      const st = useOrion.getState();
      const economia = st.settings.performance.economy || st.settings.appearance.reducedMotion;
      const dt = Math.max(1e-3, Math.min(0.1, (nowMs - last) / 1000));
      last = nowMs;
      const t = (nowMs - t0) / 1000;
      quadros++;
      if (nowMs - fpsT > 2000) {
        leve = quadros / ((nowMs - fpsT) / 1000) < 24 || economia;
        quadros = 0;
        fpsT = nowMs;
      }

      lerMaos(nowMs);
      const dx = mdx, dy = mdy;
      mdx = mdy = 0;
      if (Math.abs(dx) > 1e-5 || Math.abs(dy) > 1e-5) {
        const ay = -dx * 6, ap = -dy * 5;
        S.yaw += ay;
        S.pitch += ap;
        S.vyaw = 0.6 * S.vyaw + 0.4 * (ay / dt);
        S.vpitch = 0.6 * S.vpitch + 0.4 * (ap / dt);
      } else {
        const k = Math.min(1, dt * 1.5);
        const auto = economia ? AUTO * 0.4 : st.core === "processando" ? AUTO * 2.4 : AUTO;
        S.vyaw += (auto - S.vyaw) * k;
        S.vpitch += (0 - S.vpitch) * k;
        S.yaw += S.vyaw * dt;
        S.pitch += S.vpitch * dt;
      }
      S.pitch = Math.max(-1.4, Math.min(1.4, S.pitch));
      S.zoom += (S.zoomT - S.zoom) * Math.min(1, dt * 8);
      const alvoVermelho = st.core === "falando" || st.core === "erro" ? 1 : 0;
      S.red += (alvoVermelho - S.red) * Math.min(1, dt * 7);
      const pal = blend(S.red);

      R = mul(rotX(S.pitch), rotY(S.yaw));
      camd = 4 / S.zoom;
      const base = F / 4;
      const T1 = Math.max(1, 0.6 * K), T2 = Math.max(2, 2 * K), GTH = Math.max(4, 5 * K);

      // fundo
      ctx.globalCompositeOperation = "source-over";
      ctx.globalAlpha = 1;
      const bg = ctx.createRadialGradient(W / 2, H / 2, 0, W / 2, H / 2, Math.hypot(W, H) / 2);
      const fundo = mix([3, 13, 38], [38, 6, 4], S.red);
      bg.addColorStop(0, rgb(fundo));
      bg.addColorStop(1, "rgb(1,3,8)");
      ctx.fillStyle = bg;
      ctx.fillRect(0, 0, W, H);
      gctx.setTransform(1, 0, 0, 1, 0, 0);
      gctx.clearRect(0, 0, glow.width, glow.height);
      gctx.setTransform(glow.width / W, 0, 0, glow.height / H, 0, 0);
      gctx.lineCap = "round";
      ctx.globalCompositeOperation = "lighter";
      ctx.lineCap = "round";

      // estrelas
      STARS.forEach((p, i) => {
        const q = proj(p);
        if (q.x < 0 || q.x > W || q.y < 0 || q.y > H) return;
        const tw = 0.55 + 0.45 * Math.sin(t * 2.3 + i * 1.7);
        ctx.fillStyle = rgb(pal.bright, tw);
        ctx.beginPath();
        ctx.arc(q.x, q.y, Math.max(1, (1 * K * q.s) / base), 0, 7);
        ctx.fill();
      });

      // anéis de latitude (grade fraca)
      ctx.strokeStyle = rgb(pal.mid, 0.3);
      ctx.lineWidth = T1;
      ctx.beginPath();
      for (const ring of leve ? LAT_RINGS.filter((_, i) => i % 2 === 0) : LAT_RINGS) {
        ring.forEach((p, i) => {
          const q = proj(p);
          if (i === 0) ctx.moveTo(q.x, q.y);
          else ctx.lineTo(q.x, q.y);
        });
      }
      ctx.stroke();

      // casca de pontos com onda de varredura
      const rs = rotY(t * 0.15);
      const passo = leve ? 2 : 1;
      for (let i = 0; i < SHELL.length; i += passo) {
        const p = apply(rs, SHELL[i]);
        const q = proj(p);
        const wave = 0.5 + 0.5 * Math.sin(p[1] * 4 - t * 2.2);
        const fr = Math.max(0, Math.min(1, 0.5 - q.z / 2));
        const b = (0.15 + 0.85 * fr) * (0.4 + 0.6 * wave);
        const r = wave > 0.92 && fr > 0.5 ? 2 : 1;
        ctx.fillStyle = rgb(mix(pal.bright, pal.white, r === 2 ? 0.6 : 0.2), b);
        ctx.beginPath();
        ctx.arc(q.x, q.y, Math.max(1, r * K), 0, 7);
        ctx.fill();
      }

      // anéis giroscópicos com cometas
      for (const [rad, tx, tz, spin, cs, tail] of GYROS) {
        const Rr = mul(mul(rotY(spin * t), rotX(tx)), rotZ(tz));
        anel(UNIT_CIRCLE.map((p) => apply(Rr, scale(p, rad))), pal, pal.bright, T1, GTH, 0.3, 1.0, t, cs, tail);
      }

      // anel graduado do equador
      {
        const tilt = rotZ(0.22);
        const n = leve ? 60 : 120;
        ctx.lineWidth = 1;
        for (let k = 0; k < n; k++) {
          const ang = (k * 2 * Math.PI) / n + 0.1 * t;
          const ln = k % 10 === 0 ? 0.075 : k % 5 === 0 ? 0.045 : 0.022;
          const a = proj(apply(tilt, [1.08 * Math.cos(ang), 0, 1.08 * Math.sin(ang)]));
          const b = proj(apply(tilt, [(1.08 + ln) * Math.cos(ang), 0, (1.08 + ln) * Math.sin(ang)]));
          const fr = Math.max(0, Math.min(1, 0.5 - a.z / 2));
          const longo = k % 10 === 0;
          const br = 0.2 + 0.75 * fr * (longo ? 1 : 0.7);
          ctx.strokeStyle = rgb(mix(pal.bright, pal.white, 0.3), br);
          ctx.beginPath();
          ctx.moveTo(a.x, a.y);
          ctx.lineTo(b.x, b.y);
          ctx.stroke();
          if (longo) {
            gctx.strokeStyle = rgb(pal.bright, br * 0.9);
            gctx.lineWidth = Math.max(2, 2 * K);
            gctx.beginPath();
            gctx.moveTo(a.x, a.y);
            gctx.lineTo(b.x, b.y);
            gctx.stroke();
          }
        }
      }

      // órbitas com luz viajante
      ORBITS.forEach((o, i) => {
        if (leve && i % 2) return;
        const ro2 = rotY(t * 0.07 * (1 + (i % 3)));
        anel(o.pts.map((p) => apply(ro2, p)), pal, pal.mid, T1, 3, 0.15, 0.55, t + i * 0.37, o.speed, 0.14);
      });

      // pulso central
      const ritmo = st.core === "escuta" ? 6.0 : 3.4;
      const beat = (0.5 + 0.5 * Math.sin(t * ritmo)) ** 1.3;
      const pulse = 0.5 + 0.9 * beat;
      const coreK = 0.7 + 0.6 * beat;

      // núcleo em wireframe
      const Rc = mul(rotY(t * 0.6), rotX(t * 0.35));
      for (const [G, sc, bb] of [[CORE, 0.2, 0.85], [INNER, 0.11, 0.6]] as const) {
        const Q = G.verts.map((v) => proj(apply(Rc, scale(v, sc * coreK))));
        ctx.strokeStyle = rgb(pal.bright, bb);
        ctx.lineWidth = T1;
        ctx.beginPath();
        for (const [a, b] of G.edges) {
          ctx.moveTo(Q[a].x, Q[a].y);
          ctx.lineTo(Q[b].x, Q[b].y);
        }
        ctx.stroke();
        ctx.fillStyle = "rgb(220,255,255)";
        for (const q of Q) {
          ctx.beginPath();
          ctx.arc(q.x, q.y, Math.max(1, (2.5 * K * q.s) / base), 0, 7);
          ctx.fill();
        }
      }

      const c0 = proj([0, 0, 0]);
      const cr = Math.max(5, 0.15 * c0.s * pulse);
      for (const [m, b, cor] of [[2.8, 0.72, pal.mid], [1.45, 0.92, pal.bright]] as const) {
        const rr = Math.max(cr * m, m > 2 ? 18 : 10);
        ctx.strokeStyle = rgb(cor, b * pulse);
        ctx.lineWidth = Math.max(1, T1);
        ctx.beginPath();
        ctx.arc(c0.x, c0.y, rr, 0, 7);
        ctx.stroke();
        gctx.strokeStyle = rgb(cor, b * pulse);
        gctx.lineWidth = Math.max(3, T2 * 2);
        gctx.beginPath();
        gctx.arc(c0.x, c0.y, rr, 0, 7);
        gctx.stroke();
      }
      gctx.fillStyle = rgb(pal.bright, 0.12 + 0.3 * beat);
      gctx.beginPath();
      gctx.arc(c0.x, c0.y, cr * (0.8 + 0.9 * beat), 0, 7);
      gctx.fill();
      // ondas de choque
      for (let k = 0; k < 3; k++) {
        const ph = (t * 0.8 + k / 3) % 1;
        const rr = cr * (1.4 + ph * 6);
        const bw = (1 - ph) ** 1.6;
        ctx.strokeStyle = rgb(mix(pal.bright, pal.white, 0.4), 0.9 * bw);
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.arc(c0.x, c0.y, rr, 0, 7);
        ctx.stroke();
        gctx.strokeStyle = rgb(pal.bright, 0.9 * bw);
        gctx.lineWidth = Math.max(3, T2 * 2);
        gctx.beginPath();
        gctx.arc(c0.x, c0.y, rr, 0, 7);
        gctx.stroke();
      }
      // cristal
      const Rx = mul(rotY(t * 0.8), rotX(t * 0.35));
      const CQ = CRYSTAL_V.map((v) => proj(apply(Rx, scale(v, 0.15 * pulse))));
      const ordem = CRYSTAL_F.map((f, i) => ({ f, i, z: f.reduce((s, v) => s + CQ[v].z, 0) })).sort((a, b) => b.z - a.z);
      for (const { f, i } of ordem) {
        ctx.fillStyle = rgb(pal.bright, (i % 2 === 0 ? 0.24 : 0.14) * pulse * 0.72);
        ctx.beginPath();
        ctx.moveTo(CQ[f[0]].x, CQ[f[0]].y);
        ctx.lineTo(CQ[f[1]].x, CQ[f[1]].y);
        ctx.lineTo(CQ[f[2]].x, CQ[f[2]].y);
        ctx.closePath();
        ctx.fill();
      }
      ctx.strokeStyle = rgb(pal.white, pulse);
      ctx.lineWidth = Math.max(1, K);
      gctx.strokeStyle = rgb(pal.bright, pulse);
      gctx.lineWidth = Math.max(2, 2 * K);
      ctx.beginPath();
      gctx.beginPath();
      for (const [a, b] of CRYSTAL_E) {
        ctx.moveTo(CQ[a].x, CQ[a].y);
        ctx.lineTo(CQ[b].x, CQ[b].y);
        gctx.moveTo(CQ[a].x, CQ[a].y);
        gctx.lineTo(CQ[b].x, CQ[b].y);
      }
      ctx.stroke();
      gctx.stroke();

      // nós brilhantes
      for (const p of NODES) {
        const q = proj(p);
        if (q.x < -50 || q.x > W + 50 || q.y < -50 || q.y > H + 50) continue;
        const r = Math.min(16, Math.max(1, (1.35 * K * q.s) / base));
        const fr = 0.72 + 0.28 * (0.5 - q.z / 2);
        gctx.fillStyle = rgb(pal.bright, fr);
        gctx.beginPath();
        gctx.arc(q.x, q.y, r * 2, 0, 7);
        gctx.fill();
        ctx.fillStyle = rgb(pal.bright, fr);
        ctx.beginPath();
        ctx.arc(q.x, q.y, r, 0, 7);
        ctx.fill();
      }

      // palavras flutuantes
      ctx.textBaseline = "alphabetic";
      const nPal = leve ? 50 : LABELS.length;
      for (let i = 0; i < nPal; i++) {
        const { p, txt } = LABELS[i];
        const q = proj(p);
        if (q.x < -250 || q.x > W + 250 || q.y < -100 || q.y > H + 100) continue;
        const fs = (0.22 * K * q.s) / base;
        if (fs < 0.14 || fs > 4) continue;
        const fr = 0.5 - q.z / 2;
        const b = (0.45 + 0.55 * Math.max(0, Math.min(1, fr))) * (0.8 + 0.2 * Math.sin(t * 3 + i * 1.3));
        const px = Math.round(fs * 30);
        ctx.font = `${px}px ui-monospace, Menlo, monospace`;
        gctx.font = ctx.font;
        gctx.fillStyle = rgb(pal.bright, 1.25 * b);
        gctx.fillText(txt, q.x, q.y);
        ctx.fillStyle = rgb(mix(pal.text, pal.white, 0.55), Math.min(1.4, b * 1.35));
        ctx.fillText(txt, q.x, q.y);
      }

      // arcos de HUD (no plano da tela)
      const rad = c0.s;
      if (rad > 30 && rad < 4 * W) {
        const r1 = rad * 1.4, r2 = rad * 1.48, r3 = rad * 1.56;
        ctx.lineWidth = 1;
        ctx.strokeStyle = rgb(pal.mid, 0.75);
        ctx.beginPath();
        for (let i = 0; i < 12; i++) {
          const a0 = ((i * 30 + t * 10) * Math.PI) / 180;
          ctx.moveTo(c0.x + r1 * Math.cos(a0), c0.y + r1 * Math.sin(a0));
          ctx.arc(c0.x, c0.y, r1, a0, a0 + (20 * Math.PI) / 180);
        }
        ctx.stroke();
        ctx.strokeStyle = rgb(pal.white, 0.95);
        gctx.strokeStyle = rgb(pal.bright, 1);
        gctx.lineWidth = Math.max(2, 2 * K) * 2;
        for (let i = 0; i < 3; i++) {
          const a0 = ((i * 120 - t * 16) * Math.PI) / 180;
          ctx.beginPath();
          ctx.arc(c0.x, c0.y, r2, a0, a0 + (62 * Math.PI) / 180);
          ctx.stroke();
          gctx.beginPath();
          gctx.arc(c0.x, c0.y, r2, a0, a0 + (62 * Math.PI) / 180);
          gctx.stroke();
        }
        ctx.beginPath();
        for (let i = 0; i < 72; i++) {
          const a = ((i * 5 + t * 4) * Math.PI) / 180;
          const ln = (i % 6 === 0 ? 9 : 4) * K;
          ctx.moveTo(c0.x + Math.cos(a) * r3, c0.y + Math.sin(a) * r3);
          ctx.lineTo(c0.x + Math.cos(a) * (r3 + ln), c0.y + Math.sin(a) * (r3 + ln));
        }
        ctx.strokeStyle = rgb(pal.bright, 0.7);
        ctx.stroke();
      }

      // título "O R I O N" e estado
      const pul = 0.88 + 0.12 * Math.sin(t * 2);
      const fsT = Math.round(30 * K);
      ctx.font = `600 ${fsT}px system-ui, sans-serif`;
      ctx.textAlign = "center";
      const titulo = "O R I O N";
      const ty = 28 * K + fsT + 14 * K;
      gctx.font = ctx.font;
      gctx.textAlign = "center";
      gctx.fillStyle = rgb(pal.bright, pul);
      gctx.fillText(titulo, W / 2, ty);
      ctx.fillStyle = rgb(mix(pal.bright, pal.white, 0.55), pul);
      ctx.fillText(titulo, W / 2, ty);
      const tw = ctx.measureText(titulo).width;
      ctx.strokeStyle = rgb(pal.bright, 0.8 * pul);
      ctx.lineWidth = 1;
      for (const sg of [-1, 1]) {
        const xa = W / 2 + sg * (tw / 2 + 26 * K);
        const ly = ty - fsT * 0.35;
        ctx.beginPath();
        ctx.moveTo(xa, ly);
        ctx.lineTo(xa + sg * 150 * K, ly);
        ctx.stroke();
        ctx.fillStyle = rgb(pal.white);
        ctx.beginPath();
        ctx.arc(xa, ly, Math.max(2, 2.5 * K), 0, 7);
        ctx.fill();
      }
      ctx.font = `${Math.round(14 * K)}px ui-monospace, Menlo, monospace`;
      ctx.fillStyle = rgb(pal.text, 0.9);
      ctx.fillText(ESTADO[st.core], W / 2, H - 24 * K);
      ctx.textAlign = "start";
      gctx.textAlign = "start";

      // bloom: brilho borrado somado por cima
      if (temFiltro) {
        ctx.filter = `blur(${(1.4 * K).toFixed(1)}px)`;
        ctx.globalAlpha = Math.min(1, 0.9 * S.glow);
        ctx.drawImage(glow, 0, 0, W, H);
        ctx.filter = `blur(${(9 * K).toFixed(1)}px)`;
        ctx.globalAlpha = Math.min(1, 0.85 * S.glow);
        ctx.drawImage(glow, 0, 0, W, H);
        ctx.filter = "none";
      } else {
        ctx.globalAlpha = 0.6 * S.glow;
        ctx.drawImage(glow, 0, 0, W, H);
      }
      ctx.globalAlpha = 1;

      // feixe de varredura subindo e descendo + linhas de varredura
      ctx.globalCompositeOperation = "lighter";
      const span = H - 1;
      const ph = (t * 190 * (H / 720)) % (2 * span);
      const yb = ph <= span ? ph : 2 * span - ph;
      for (const [off, a] of [[-3, 0.035], [-2, 0.07], [-1, 0.16], [0, 0.5], [1, 0.16], [2, 0.07], [3, 0.035]]) {
        ctx.fillStyle = `rgba(${pal.bright.map((v) => v | 0).join(",")},${a})`;
        ctx.fillRect(0, yb + off, W, 1);
      }
      ctx.globalCompositeOperation = "source-over";
      ctx.fillStyle = "rgba(0,0,0,0.06)";
      for (let y = 0; y < H; y += 4) ctx.fillRect(0, y, W, 1);
      if (Math.random() < 0.05) {
        ctx.fillStyle = "rgba(0,0,0,0.07)";
        ctx.fillRect(0, 0, W, H);
      }
      canvas.dataset.quadros = String(Number(canvas.dataset.quadros ?? 0) + 1);
    };
    raf = requestAnimationFrame(frame);
    return () => {
      parado = true;
      cancelAnimationFrame(raf);
      ro.disconnect();
      canvas.removeEventListener("pointerdown", onDown);
      canvas.removeEventListener("pointermove", onMove);
      canvas.removeEventListener("pointerup", onUp);
      canvas.removeEventListener("pointercancel", onUp);
      canvas.removeEventListener("wheel", onWheel);
      canvas.removeEventListener("dblclick", reset);
      window.removeEventListener("keydown", onKey);
    };
  }, [fullscreen, onClose]);

  return (
    <div ref={wrap} className={fullscreen ? "holo-full" : "holo-box"}>
      <canvas ref={canvasRef} className="holo-canvas" role="img" aria-label="Holograma do Orion: gire arrastando, aproxime com pinça ou roda do mouse" />
      {fullscreen && (
        <button className="btn holo-close" onClick={onClose} aria-label="Fechar holograma">✕ Fechar</button>
      )}
    </div>
  );
}
