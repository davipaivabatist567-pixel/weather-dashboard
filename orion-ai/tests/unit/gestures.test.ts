import { describe, expect, it } from "vitest";
import { GestureController, optionsFromSensitivity } from "../../src/vision/gestureController";
import { bodyMetrics, classifyHand, classifyPose, fingerStraightness, SwipeDetector, type Pt } from "../../src/vision/gestures";

const p = (x: number, y: number, z = 0): Pt => ({ x, y, z });

/** Mão sintética em coordenadas 3D (metros). y negativo = para cima. */
function hand(opts: { fingers: "straight" | "curled"; thumb: "up" | "curled" | "pinch" }): Pt[] {
  const lm: Pt[] = new Array(21);
  lm[0] = p(0, 0);
  const mcpX = [-0.03, -0.01, 0.01, 0.03];
  [5, 9, 13, 17].forEach((base, i) => {
    const x = mcpX[i];
    lm[base] = p(x, -0.08);
    if (opts.fingers === "straight") {
      lm[base + 1] = p(x, -0.11);
      lm[base + 2] = p(x, -0.135);
      lm[base + 3] = p(x, -0.155);
    } else {
      lm[base + 1] = p(x, -0.11);
      lm[base + 2] = p(x, -0.11, 0.025);
      lm[base + 3] = p(x, -0.09, 0.025);
    }
  });
  if (opts.thumb === "up") {
    lm[1] = p(-0.04, -0.02);
    lm[2] = p(-0.045, -0.05);
    lm[3] = p(-0.05, -0.08);
    lm[4] = p(-0.055, -0.11);
  } else if (opts.thumb === "curled") {
    lm[1] = p(-0.03, -0.02);
    lm[2] = p(-0.045, -0.04, 0.01);
    lm[3] = p(-0.035, -0.06, 0.03);
    lm[4] = p(-0.015, -0.065, 0.03);
  } else {
    // pinça: indicador levemente dobrado tocando a ponta do polegar
    lm[6] = p(-0.035, -0.105);
    lm[7] = p(-0.04, -0.115, 0.01);
    lm[8] = p(-0.045, -0.118, 0.02);
    lm[1] = p(-0.04, -0.02);
    lm[2] = p(-0.05, -0.05, 0.005);
    lm[3] = p(-0.05, -0.085, 0.012);
    lm[4] = p(-0.046, -0.115, 0.02);
  }
  return lm;
}
/** Converte para coordenadas de imagem (0..1), mantendo a orientação. */
const toImage = (lm: Pt[]) => lm.map((q) => p(0.5 + q.x, 0.6 + q.y, q.z));

describe("classificação de gestos da mão", () => {
  it("reconhece a mão aberta", () => {
    const w = hand({ fingers: "straight", thumb: "up" });
    const f = fingerStraightness(w);
    expect(Math.min(f.indicador, f.medio, f.anelar, f.minimo)).toBeGreaterThan(0.95);
    expect(classifyHand(w, toImage(w), 0.98)?.id).toBe("mao_aberta");
  });

  it("reconhece o polegar para cima", () => {
    const w = hand({ fingers: "curled", thumb: "up" });
    const r = classifyHand(w, toImage(w), 0.95);
    expect(r?.id).toBe("polegar_cima");
    expect(r!.confidence).toBeGreaterThan(0.5);
  });

  it("não confunde polegar para cima com polegar para baixo", () => {
    const w = hand({ fingers: "curled", thumb: "up" });
    const flipped = toImage(w).map((q) => p(q.x, 1.2 - q.y, q.z)); // mão de cabeça para baixo na imagem
    expect(classifyHand(w, flipped, 0.95)?.id).not.toBe("polegar_cima");
  });

  it("reconhece a mão fechada", () => {
    const w = hand({ fingers: "curled", thumb: "curled" });
    expect(classifyHand(w, toImage(w), 0.95)?.id).toBe("mao_fechada");
  });

  it("reconhece a pinça", () => {
    const w = hand({ fingers: "straight", thumb: "pinch" });
    expect(classifyHand(w, toImage(w), 0.95)?.id).toBe("pinca");
  });

  it("a confiança acompanha a confiança do detector", () => {
    const w = hand({ fingers: "straight", thumb: "up" });
    const hi = classifyHand(w, toImage(w), 0.99)!.confidence;
    const lo = classifyHand(w, toImage(w), 0.4)!.confidence;
    expect(lo).toBeLessThan(hi);
  });

  it("ignora dados incompletos", () => {
    expect(classifyHand([], [], 1)).toBeNull();
  });
});

/** Pose sintética (coordenadas de imagem). */
function pose(leftWristY: number, rightWristY: number, vis = 0.99): Pt[] {
  const lm: Pt[] = Array.from({ length: 33 }, () => ({ x: 0.5, y: 0.5, z: 0, visibility: vis }));
  lm[0] = { x: 0.5, y: 0.25, z: 0, visibility: vis };
  lm[11] = { x: 0.6, y: 0.4, z: 0, visibility: vis }; // ombro esquerdo (lado direito da imagem)
  lm[12] = { x: 0.4, y: 0.4, z: 0, visibility: vis };
  lm[15] = { x: 0.65, y: leftWristY, z: 0, visibility: vis };
  lm[16] = { x: 0.35, y: rightWristY, z: 0, visibility: vis };
  lm[23] = { x: 0.58, y: 0.7, z: 0, visibility: vis };
  lm[24] = { x: 0.42, y: 0.7, z: 0, visibility: vis };
  return lm;
}

describe("gestos corporais", () => {
  it("mão direita levantada", () => {
    expect(classifyPose(pose(0.6, 0.2)).map((c) => c.id)).toEqual(["mao_direita_levantada"]);
  });
  it("dois braços levantados acima da cabeça", () => {
    expect(classifyPose(pose(0.1, 0.1)).map((c) => c.id)).toEqual(["bracos_levantados"]);
  });
  it("braços abaixados não geram gesto", () => {
    expect(classifyPose(pose(0.6, 0.6))).toEqual([]);
  });
  it("pontos pouco visíveis não geram gesto", () => {
    expect(classifyPose(pose(0.1, 0.1, 0.2))).toEqual([]);
  });
  it("métricas corporais são relativas aos ombros", () => {
    const m = bodyMetrics(pose(0.6, 0.2), null, 0);
    expect(m.detected).toBe(true);
    expect(m.rightHandHeight).toBeCloseTo((0.4 - 0.2) / 0.2);
    expect(m.leftHandHeight).toBeCloseTo((0.4 - 0.6) / 0.2);
    expect(m.lateralSpeed).toBeNull();
    expect(bodyMetrics(null, null, 0).detected).toBe(false);
  });
});

describe("deslize lateral", () => {
  it("detecta deslize para a direita e para a esquerda", () => {
    const s = new SwipeDetector(0.25, 600);
    let r = null;
    for (let i = 0; i <= 6; i++) r = s.push(i * 50, 0.3 + i * 0.06, 0.5) ?? r;
    expect(r?.id).toBe("deslize_direita");
    r = null;
    for (let i = 0; i <= 6; i++) r = s.push(1000 + i * 50, 0.8 - i * 0.06, 0.5) ?? r;
    expect(r?.id).toBe("deslize_esquerda");
  });
  it("ignora movimento lento ou vertical", () => {
    const s = new SwipeDetector(0.25, 600);
    let r = null;
    for (let i = 0; i <= 30; i++) r = s.push(i * 100, 0.3 + i * 0.01, 0.5) ?? r; // lento
    for (let i = 0; i <= 6; i++) r = s.push(5000 + i * 50, 0.5 + i * 0.05, 0.2 + i * 0.08) ?? r; // diagonal/vertical
    expect(r).toBeNull();
  });
});

describe("controlador temporal de gestos", () => {
  const opts = { minConfidence: 0.6, holdMs: 300, minFrames: 4, cooldownMs: 1000, releaseMs: 200 };
  const feed = (c: GestureController, from: number, to: number, conf = 0.9, id = "mao_aberta" as const) => {
    const fired = [];
    for (let t = from; t <= to; t += 33) fired.push(...c.update(t, [{ id, confidence: conf }]));
    return fired;
  };

  it("exige que o gesto seja mantido por vários quadros", () => {
    const c = new GestureController(opts);
    expect(feed(c, 0, 200)).toHaveLength(0);
    expect(feed(c, 233, 400)).toHaveLength(1);
  });

  it("não dispara repetidamente enquanto o gesto é mantido", () => {
    const c = new GestureController(opts);
    expect(feed(c, 0, 5000)).toHaveLength(1);
  });

  it("dispara de novo apenas após soltar e passar o intervalo", () => {
    const c = new GestureController(opts);
    expect(feed(c, 0, 400)).toHaveLength(1);
    c.update(700, []); // soltou
    expect(feed(c, 720, 1000)).toHaveLength(0); // ainda dentro do intervalo de 1000 ms
    c.update(1300, []);
    expect(feed(c, 1500, 2000)).toHaveLength(1);
  });

  it("ignora gestos com baixa confiança", () => {
    const c = new GestureController(opts);
    expect(feed(c, 0, 2000, 0.4)).toHaveLength(0);
  });

  it("respeita gestos desativados", () => {
    const c = new GestureController(opts);
    const fired = [];
    for (let t = 0; t < 1000; t += 33) fired.push(...c.update(t, [{ id: "mao_aberta", confidence: 0.9 }], (id) => id !== "mao_aberta"));
    expect(fired).toHaveLength(0);
  });

  it("deslizes são instantâneos mas respeitam o intervalo", () => {
    const c = new GestureController(opts);
    expect(c.update(0, [{ id: "deslize_direita", confidence: 0.9 }])).toHaveLength(1);
    expect(c.update(100, [{ id: "deslize_direita", confidence: 0.9 }])).toHaveLength(0);
    expect(c.update(1200, [{ id: "deslize_direita", confidence: 0.9 }])).toHaveLength(1);
  });

  it("confirma gestos em dispositivos lentos (1 quadro a cada 2,5 s) sem repetir", () => {
    const c = new GestureController(opts);
    const fired = [];
    for (let t = 0; t <= 20_000; t += 2500) fired.push(...c.update(t, [{ id: "mao_aberta", confidence: 0.9 }]));
    expect(fired).toHaveLength(1);
  });

  it("um único quadro isolado nunca confirma um gesto", () => {
    const c = new GestureController(opts);
    for (let t = 0; t <= 10_000; t += 2500) c.update(t, []);
    expect(c.update(12_500, [{ id: "mao_aberta", confidence: 0.99 }])).toHaveLength(0);
  });

  it("sensibilidade maior reduz o tempo e a confiança exigidos", () => {
    const low = optionsFromSensitivity(1);
    const high = optionsFromSensitivity(10);
    expect(high.holdMs).toBeLessThan(low.holdMs);
    expect(high.minConfidence).toBeLessThan(low.minConfidence);
  });
});
