// Classificação de gestos a partir dos pontos de referência do MediaPipe.
// Funções puras (sem DOM), testadas em tests/unit/gestures.test.ts.

export interface Pt {
  x: number;
  y: number;
  z: number;
  visibility?: number;
}

export type GestureId =
  | "mao_aberta"
  | "polegar_cima"
  | "mao_fechada"
  | "pinca"
  | "mao_direita_levantada"
  | "bracos_levantados"
  | "deslize_esquerda"
  | "deslize_direita";

export const GESTURE_LABELS: Record<GestureId, string> = {
  mao_aberta: "Mão aberta",
  polegar_cima: "Polegar para cima",
  mao_fechada: "Mão fechada",
  pinca: "Pinça",
  mao_direita_levantada: "Mão direita levantada",
  bracos_levantados: "Dois braços levantados",
  deslize_esquerda: "Movimento lateral ←",
  deslize_direita: "Movimento lateral →",
};

export interface GestureCandidate {
  id: GestureId;
  /** 0..1 — combina a confiança do detector com a clareza geométrica do gesto. */
  confidence: number;
}

export interface Calibration {
  /** Distância polegar–indicador (normalizada pelo tamanho da palma) abaixo da qual há pinça. */
  pinchThreshold: number;
  /** Cosseno mínimo das articulações para considerar um dedo esticado. */
  straightness: number;
}

export const DEFAULT_CALIBRATION: Calibration = { pinchThreshold: 0.35, straightness: 0.8 };

// Índices do HandLandmarker
const WRIST = 0;
const THUMB = [1, 2, 3, 4];
const FINGERS: Record<"indicador" | "medio" | "anelar" | "minimo", [number, number, number, number]> = {
  indicador: [5, 6, 7, 8],
  medio: [9, 10, 11, 12],
  anelar: [13, 14, 15, 16],
  minimo: [17, 18, 19, 20],
};
const MIDDLE_MCP = 9;
const INDEX_MCP = 5;

const sub = (a: Pt, b: Pt) => ({ x: a.x - b.x, y: a.y - b.y, z: a.z - b.z });
const len = (v: { x: number; y: number; z: number }) => Math.hypot(v.x, v.y, v.z);
export const dist = (a: Pt, b: Pt) => len(sub(a, b));
function cosAngle(a: Pt, b: Pt, c: Pt) {
  // cosseno entre (a→b) e (b→c): 1 = alinhado (dedo reto)
  const u = sub(b, a);
  const v = sub(c, b);
  const d = len(u) * len(v);
  return d === 0 ? 0 : (u.x * v.x + u.y * v.y + u.z * v.z) / d;
}

export interface FingerState {
  polegar: number;
  indicador: number;
  medio: number;
  anelar: number;
  minimo: number;
}

/**
 * Retidão de cada dedo em 0..1 (1 = totalmente esticado).
 * Usa pontos 3D (preferencialmente worldLandmarks), portanto independe da rotação da mão.
 */
export function fingerStraightness(lm: Pt[]): FingerState {
  const straight = ([a, b, c, d]: number[]) => {
    const s1 = cosAngle(lm[a], lm[b], lm[c]);
    const s2 = cosAngle(lm[b], lm[c], lm[d]);
    return Math.max(0, Math.min(1, (s1 + s2) / 2));
  };
  const palm = dist(lm[WRIST], lm[MIDDLE_MCP]) || 1;
  // Polegar: reto e afastado da base do indicador
  const thumbStraight = straight(THUMB);
  const thumbAway = Math.min(1, dist(lm[THUMB[3]], lm[INDEX_MCP]) / palm / 0.5);
  const curled = (f: [number, number, number, number]) => {
    // dedo esticado também precisa ter a ponta mais longe do punho que a articulação PIP
    const s = straight(f);
    const reach = dist(lm[WRIST], lm[f[3]]) > dist(lm[WRIST], lm[f[1]]) ? 1 : 0;
    return s * reach;
  };
  return {
    polegar: thumbStraight * thumbAway,
    indicador: curled(FINGERS.indicador),
    medio: curled(FINGERS.medio),
    anelar: curled(FINGERS.anelar),
    minimo: curled(FINGERS.minimo),
  };
}

/**
 * Classifica o gesto estático de uma mão.
 * @param world pontos 3D em metros (worldLandmarks) — usados para a forma da mão
 * @param image pontos normalizados na imagem — usados para a orientação (para cima/baixo)
 * @param score confiança do detector de mão (handedness score)
 */
export function classifyHand(world: Pt[], image: Pt[], score: number, cal: Calibration = DEFAULT_CALIBRATION): GestureCandidate | null {
  if (world.length < 21 || image.length < 21) return null;
  const f = fingerStraightness(world);
  const th = cal.straightness;
  const ext = (v: number) => v >= th;
  // margem: quão longe do limiar está cada decisão (clareza do gesto)
  const margin = (v: number, extended: boolean) => Math.min(1, Math.abs(v - th) / 0.15 + 0.4) * (ext(v) === extended ? 1 : 0);
  const four = [f.indicador, f.medio, f.anelar, f.minimo];
  const palm = dist(world[WRIST], world[MIDDLE_MCP]) || 1;
  const pinchDist = dist(world[THUMB[3]], world[FINGERS.indicador[3]]) / palm;

  // Pinça: polegar e indicador se tocando, com o indicador não totalmente fechado
  if (pinchDist < cal.pinchThreshold && dist(world[WRIST], world[8]) / palm > 0.9) {
    const clarity = Math.min(1, (cal.pinchThreshold - pinchDist) / (cal.pinchThreshold * 0.5) + 0.4);
    return { id: "pinca", confidence: score * clarity };
  }

  if (four.every((v) => ext(v)) && ext(f.polegar)) {
    const clarity = Math.min(...four.map((v) => margin(v, true)), margin(f.polegar, true));
    return { id: "mao_aberta", confidence: score * clarity };
  }

  if (four.every((v) => !ext(v))) {
    const clarity4 = Math.min(...four.map((v) => margin(v, false)));
    // Polegar para cima: polegar esticado apontando para cima na imagem (y menor = mais alto)
    const tip = image[THUMB[3]];
    const base = image[THUMB[0]];
    const up = base.y - tip.y; // positivo se a ponta está acima da base
    const horiz = Math.abs(tip.x - base.x);
    if (ext(f.polegar) && up > 0.06 && up > horiz * 1.2) {
      return { id: "polegar_cima", confidence: score * Math.min(clarity4, margin(f.polegar, true)) };
    }
    if (!ext(f.polegar) || up <= 0.02) {
      return { id: "mao_fechada", confidence: score * clarity4 };
    }
  }
  return null;
}

// Índices do PoseLandmarker (lado anatômico da pessoa)
export const POSE = {
  nariz: 0,
  ombroEsq: 11,
  ombroDir: 12,
  cotoveloEsq: 13,
  cotoveloDir: 14,
  pulsoEsq: 15,
  pulsoDir: 16,
  quadrilEsq: 23,
  quadrilDir: 24,
  joelhoEsq: 25,
  joelhoDir: 26,
  tornozeloEsq: 27,
  tornozeloDir: 28,
} as const;

const vis = (p: Pt | undefined) => (p ? (p.visibility ?? 1) : 0);

/** Gestos corporais a partir da pose (coordenadas normalizadas da imagem). */
export function classifyPose(pose: Pt[], minVisibility = 0.5): GestureCandidate[] {
  if (pose.length < 25) return [];
  const out: GestureCandidate[] = [];
  const p = (i: number) => pose[i];
  const shoulderW = Math.abs(p(POSE.ombroEsq).x - p(POSE.ombroDir).x) || 0.2;
  const raised = (wrist: number, shoulder: number) =>
    vis(p(wrist)) >= minVisibility && vis(p(shoulder)) >= minVisibility && p(shoulder).y - p(wrist).y > shoulderW * 0.5;
  const aboveHead = (wrist: number) => vis(p(wrist)) >= minVisibility && p(POSE.nariz).y - p(wrist).y > shoulderW * 0.3;

  const leftUp = raised(POSE.pulsoEsq, POSE.ombroEsq);
  const rightUp = raised(POSE.pulsoDir, POSE.ombroDir);

  if (aboveHead(POSE.pulsoEsq) && aboveHead(POSE.pulsoDir)) {
    out.push({ id: "bracos_levantados", confidence: Math.min(vis(p(POSE.pulsoEsq)), vis(p(POSE.pulsoDir))) });
  } else if (rightUp && !leftUp) {
    out.push({ id: "mao_direita_levantada", confidence: Math.min(vis(p(POSE.pulsoDir)), vis(p(POSE.ombroDir))) });
  }
  return out;
}

/** Medições corporais exibidas na interface (todas relativas, sem calibração métrica). */
export interface BodyMetrics {
  detected: boolean;
  visibleLandmarks: number;
  /** Altura relativa de cada mão em relação ao ombro, em larguras de ombro (+ = acima). */
  leftHandHeight: number | null;
  rightHandHeight: number | null;
  /** Ângulo do braço (ombro→pulso) em graus em relação à vertical para baixo. */
  leftArmAngle: number | null;
  rightArmAngle: number | null;
  /** Centro do tronco no eixo X (0..1, espelhado para a tela) */
  centerX: number | null;
  /** Velocidade lateral do tronco (larguras de tela por segundo, + = direita na tela) */
  lateralSpeed: number | null;
  /** Média de visibilidade dos pontos principais (estimativa de confiança). */
  confidence: number;
}

export function bodyMetrics(pose: Pt[] | null, prevCenterX: number | null, dtSec: number, minVisibility = 0.5): BodyMetrics {
  const empty: BodyMetrics = {
    detected: false, visibleLandmarks: 0, leftHandHeight: null, rightHandHeight: null,
    leftArmAngle: null, rightArmAngle: null, centerX: null, lateralSpeed: null, confidence: 0,
  };
  if (!pose || pose.length < 25) return empty;
  const keys: number[] = Object.values(POSE);
  const visibleLandmarks = keys.filter((i) => vis(pose[i]) >= minVisibility).length;
  const confidence = keys.reduce((s, i) => s + vis(pose[i]), 0) / keys.length;
  const ls = pose[POSE.ombroEsq];
  const rs = pose[POSE.ombroDir];
  const shoulderW = Math.abs(ls.x - rs.x) || 0.2;
  const handH = (w: number, s: number) =>
    vis(pose[w]) >= minVisibility && vis(pose[s]) >= minVisibility ? (pose[s].y - pose[w].y) / shoulderW : null;
  const armAngle = (s: number, w: number) => {
    if (vis(pose[w]) < minVisibility || vis(pose[s]) < minVisibility) return null;
    const dx = pose[w].x - pose[s].x;
    const dy = pose[w].y - pose[s].y;
    return Math.round((Math.atan2(Math.abs(dx), dy) * 180) / Math.PI);
  };
  const centerX = vis(ls) >= minVisibility && vis(rs) >= minVisibility ? 1 - (ls.x + rs.x) / 2 : null;
  const lateralSpeed = centerX !== null && prevCenterX !== null && dtSec > 0 ? (centerX - prevCenterX) / dtSec : null;
  return {
    detected: visibleLandmarks >= 4,
    visibleLandmarks,
    leftHandHeight: handH(POSE.pulsoEsq, POSE.ombroEsq),
    rightHandHeight: handH(POSE.pulsoDir, POSE.ombroDir),
    leftArmAngle: armAngle(POSE.ombroEsq, POSE.pulsoEsq),
    rightArmAngle: armAngle(POSE.ombroDir, POSE.pulsoDir),
    centerX,
    lateralSpeed,
    confidence,
  };
}

/**
 * Detecta deslizes laterais da mão a partir de um histórico de posições (x espelhado para a tela).
 * Exige deslocamento horizontal grande, pouco deslocamento vertical e janela curta de tempo.
 */
export class SwipeDetector {
  private trail: { t: number; x: number; y: number }[] = [];
  constructor(
    public minDistance = 0.25,
    public windowMs = 600,
  ) {}

  push(t: number, screenX: number, y: number): GestureCandidate | null {
    this.trail.push({ t, x: screenX, y });
    while (this.trail.length && t - this.trail[0].t > this.windowMs) this.trail.shift();
    if (this.trail.length < 4) return null;
    const first = this.trail[0];
    const dx = screenX - first.x;
    const dy = Math.abs(y - first.y);
    if (Math.abs(dx) >= this.minDistance && dy < Math.abs(dx) * 0.6) {
      this.trail = [];
      const confidence = Math.min(1, Math.abs(dx) / (this.minDistance * 1.5));
      return { id: dx > 0 ? "deslize_direita" : "deslize_esquerda", confidence };
    }
    return null;
  }

  reset() {
    this.trail = [];
  }
}
