// Suavização temporal dos pontos de referência (filtro One Euro), reduzindo tremores
// sem atrasar demais movimentos rápidos.
import type { Pt } from "./gestures";

class LowPass {
  private y: number | null = null;
  filter(x: number, alpha: number) {
    this.y = this.y === null ? x : alpha * x + (1 - alpha) * this.y;
    return this.y;
  }
  get last() {
    return this.y;
  }
  reset() {
    this.y = null;
  }
}

const alphaFor = (cutoff: number, dt: number) => {
  const tau = 1 / (2 * Math.PI * cutoff);
  return 1 / (1 + tau / dt);
};

export class OneEuro {
  private x = new LowPass();
  private dx = new LowPass();
  private lastT: number | null = null;
  constructor(
    public minCutoff = 1.2,
    public beta = 0.02,
    public dCutoff = 1.0,
  ) {}

  filter(value: number, tMs: number): number {
    const dt = this.lastT === null ? 1 / 30 : Math.max(1e-3, (tMs - this.lastT) / 1000);
    this.lastT = tMs;
    const prev = this.x.last;
    const deriv = prev === null ? 0 : (value - prev) / dt;
    const edx = this.dx.filter(deriv, alphaFor(this.dCutoff, dt));
    const cutoff = this.minCutoff + this.beta * Math.abs(edx);
    return this.x.filter(value, alphaFor(cutoff, dt));
  }

  reset() {
    this.x.reset();
    this.dx.reset();
    this.lastT = null;
  }
}

/** Suaviza um conjunto de pontos (x, y, z) mantendo a visibilidade original. */
export class LandmarkSmoother {
  private filters: OneEuro[][] = [];
  private lastSeen = 0;

  constructor(
    private minCutoff = 1.2,
    private beta = 0.02,
  ) {}

  apply(points: Pt[], tMs: number): Pt[] {
    // Se o alvo sumiu por muito tempo, recomeça para não "arrastar" a posição antiga.
    if (tMs - this.lastSeen > 500) this.filters = [];
    this.lastSeen = tMs;
    return points.map((p, i) => {
      const f = (this.filters[i] ??= [new OneEuro(this.minCutoff, this.beta), new OneEuro(this.minCutoff, this.beta), new OneEuro(this.minCutoff, this.beta)]);
      return { x: f[0].filter(p.x, tMs), y: f[1].filter(p.y, tMs), z: f[2].filter(p.z, tMs), visibility: p.visibility };
    });
  }

  reset() {
    this.filters = [];
  }
}
