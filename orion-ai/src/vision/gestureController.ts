// Confirmação temporal de gestos: limiar de confiança, vários quadros consecutivos,
// intervalo entre ativações e bloqueio de repetição enquanto o gesto é mantido.
import type { GestureCandidate, GestureId } from "./gestures";

export interface GestureFire {
  id: GestureId;
  confidence: number;
  at: number;
}

export interface ControllerOptions {
  /** Confiança mínima para contar um quadro (0..1). */
  minConfidence: number;
  /** Tempo que o gesto precisa ser mantido para ser confirmado (ms). */
  holdMs: number;
  /** Quadros mínimos consecutivos. */
  minFrames: number;
  /** Intervalo mínimo entre ativações do mesmo gesto (ms). */
  cooldownMs: number;
  /** Tempo sem o gesto para considerá-lo "solto" e permitir nova ativação (ms). */
  releaseMs: number;
}

/** Converte a sensibilidade (1 = pouco sensível, 10 = muito sensível) em parâmetros. */
export function optionsFromSensitivity(sensitivity: number): ControllerOptions {
  const s = Math.max(1, Math.min(10, sensitivity));
  return {
    minConfidence: 0.85 - s * 0.04, // 0.81 .. 0.45
    holdMs: 700 - s * 45, // 655 .. 250 ms
    minFrames: Math.round(8 - s * 0.5), // 8 .. 3
    cooldownMs: 1500,
    releaseMs: 350,
  };
}

interface Track {
  since: number;
  frames: number;
  lastSeen: number;
  bestConfidence: number;
  latched: boolean;
}

/** Gestos instantâneos (movimentos) não precisam ser mantidos. */
const INSTANT: GestureId[] = ["deslize_esquerda", "deslize_direita"];

export class GestureController {
  private tracks = new Map<GestureId, Track>();
  private lastFire = new Map<GestureId, number>();
  private lastUpdate: number | null = null;
  /** Intervalo médio entre quadros processados (ms), medido. */
  private frameInterval = 33;

  constructor(public options: ControllerOptions) {}

  /**
   * Em dispositivos lentos (poucos quadros por segundo), o tempo de "soltar" e o número
   * mínimo de quadros se adaptam ao intervalo real entre quadros; caso contrário um gesto
   * mantido nunca seria confirmado. Exige sempre ao menos 2 quadros consecutivos.
   */
  private effective() {
    const o = this.options;
    return {
      releaseMs: Math.max(o.releaseMs, this.frameInterval * 2.5),
      minFrames: Math.max(2, Math.min(o.minFrames, Math.round(1000 / this.frameInterval))),
    };
  }

  /**
   * Recebe os candidatos de um quadro e retorna os gestos confirmados neste quadro.
   * Um gesto mantido dispara uma única vez; só dispara de novo depois de ser solto
   * e de passado o intervalo mínimo.
   */
  update(now: number, candidates: GestureCandidate[], enabled: (id: GestureId) => boolean = () => true): GestureFire[] {
    const o = this.options;
    if (this.lastUpdate !== null && now > this.lastUpdate) {
      this.frameInterval = this.frameInterval * 0.8 + Math.min(now - this.lastUpdate, 3000) * 0.2;
    }
    this.lastUpdate = now;
    const { releaseMs, minFrames } = this.effective();
    const fired: GestureFire[] = [];
    const seen = new Set<GestureId>();

    for (const c of candidates) {
      if (!enabled(c.id) || c.confidence < o.minConfidence || seen.has(c.id)) continue;
      seen.add(c.id);

      if (INSTANT.includes(c.id)) {
        if (now - (this.lastFire.get(c.id) ?? -Infinity) >= o.cooldownMs) {
          this.lastFire.set(c.id, now);
          fired.push({ id: c.id, confidence: c.confidence, at: now });
        }
        continue;
      }

      let t = this.tracks.get(c.id);
      if (!t || now - t.lastSeen > releaseMs) {
        t = { since: now, frames: 0, lastSeen: now, bestConfidence: 0, latched: false };
        this.tracks.set(c.id, t);
      }
      t.frames++;
      t.lastSeen = now;
      t.bestConfidence = Math.max(t.bestConfidence, c.confidence);

      const held = now - t.since >= o.holdMs && t.frames >= minFrames;
      const cooled = now - (this.lastFire.get(c.id) ?? -Infinity) >= o.cooldownMs;
      if (held && !t.latched && cooled) {
        t.latched = true;
        this.lastFire.set(c.id, now);
        fired.push({ id: c.id, confidence: t.bestConfidence, at: now });
      }
    }

    // Remove trilhas de gestos soltos
    for (const [id, t] of this.tracks) if (!seen.has(id) && now - t.lastSeen > releaseMs) this.tracks.delete(id);
    return fired;
  }

  /** Progresso (0..1) da confirmação de um gesto em andamento — usado na interface. */
  progress(id: GestureId, now: number): number {
    const t = this.tracks.get(id);
    if (!t || t.latched) return t?.latched ? 1 : 0;
    return Math.min(1, (now - t.since) / this.options.holdMs);
  }

  reset() {
    this.tracks.clear();
    this.lastUpdate = null;
    this.frameInterval = 33;
  }
}
