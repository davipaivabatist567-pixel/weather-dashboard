// Ativação por duas palmas (como o VISION): o microfone é lido só neste aparelho, nível a nível,
// sem gravar nem enviar áudio. Duas batidas fortes entre 0,1 s e 0,8 s ativam o Orion.
import { useEffect } from "react";
import { useOrion } from "../store";

export interface ClapOptions {
  /** nível RMS (0..1) acima do ruído de fundo que conta como batida */
  threshold: number;
  minInterval: number; // s
  maxInterval: number; // s
  debounce: number; // s
}

/** Sensibilidade 1 (difícil) … 10 (fácil) → limiar. 5 ≈ o CLAP_THRESHOLD do VISION (2000/32768). */
export const thresholdFromSensitivity = (s: number) => 0.14 * Math.pow(0.8, Math.max(1, Math.min(10, s)) - 1);

export const DEFAULT_CLAP: ClapOptions = { threshold: thresholdFromSensitivity(5), minInterval: 0.1, maxInterval: 0.8, debounce: 0.05 };

/** Detector puro (testável): recebe níveis RMS com o tempo e avisa quando houver duas palmas. */
export class ClapDetector {
  private count = 0;
  private first = 0;
  private lastClap = -1;
  private floor = 0;
  private acima = false;
  private inicio = 0;
  private longo = false;
  /** duração máxima de uma palma: sons mais longos (fala, música) não contam */
  static readonly MAX_DURACAO = 0.15;
  constructor(public options: ClapOptions = DEFAULT_CLAP) {}

  /** @returns true quando confirma uma palma dupla */
  push(level: number, t: number): boolean {
    const o = this.options;
    if (!this.acima) this.floor = this.floor ? this.floor * 0.99 + Math.min(level, this.floor * 3 + 0.005) * 0.01 : level;
    const batida = level > o.threshold && level > this.floor * 4;
    if (batida && !this.acima) {
      this.acima = true;
      this.inicio = t;
      this.longo = false;
      return false;
    }
    if (batida) {
      if (t - this.inicio > ClapDetector.MAX_DURACAO) this.longo = true;
      return false;
    }
    if (this.acima) {
      // fim de um som forte: só conta se foi curto como uma palma
      this.acima = false;
      if (this.longo) {
        this.count = 0;
        return false;
      }
      return this.palma(this.inicio);
    }
    if (this.count === 1 && t - this.first > o.maxInterval) this.count = 0;
    return false;
  }

  private palma(tc: number): boolean {
    const o = this.options;
    if (this.lastClap >= 0 && tc - this.lastClap < o.debounce) return false;
    this.lastClap = tc;
    if (this.count === 0) {
      this.count = 1;
      this.first = tc;
      return false;
    }
    const dt = tc - this.first;
    if (dt < o.minInterval) return false;
    if (dt <= o.maxInterval) {
      this.count = 0;
      return true;
    }
    this.count = 1; // devagar demais: vira a primeira palma de um novo par
    this.first = tc;
    return false;
  }

  reset() {
    this.count = 0;
    this.lastClap = -1;
    this.acima = false;
    this.longo = false;
  }
}

type Listener = () => void;

/** Escuta o microfone e chama `onDouble` a cada palma dupla. Retorna uma função para parar. */
export async function startClapListening(onDouble: Listener, onLevel?: (l: number) => void): Promise<() => void> {
  const stream = await navigator.mediaDevices.getUserMedia({
    audio: { echoCancellation: false, noiseSuppression: false, autoGainControl: false },
    video: false,
  });
  const Ctx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
  const ac = new Ctx();
  const src = ac.createMediaStreamSource(stream);
  const an = ac.createAnalyser();
  an.fftSize = 1024;
  src.connect(an);
  const buf = new Float32Array(an.fftSize);
  const det = new ClapDetector({ ...DEFAULT_CLAP, threshold: thresholdFromSensitivity(useOrion.getState().settings.activation.clapSensitivity) });
  const timer = window.setInterval(() => {
    det.options.threshold = thresholdFromSensitivity(useOrion.getState().settings.activation.clapSensitivity);
    an.getFloatTimeDomainData(buf);
    let s = 0;
    for (let i = 0; i < buf.length; i++) s += buf[i] * buf[i];
    const level = Math.sqrt(s / buf.length);
    onLevel?.(level);
    if (det.push(level, ac.currentTime)) onDouble();
  }, 20);
  return () => {
    clearInterval(timer);
    stream.getTracks().forEach((tr) => tr.stop());
    void ac.close();
  };
}

/**
 * Mantém a escuta de palmas ligada enquanto a opção estiver ativa e o Orion não estiver usando
 * o microfone para outra coisa (ditado). Ao detectar: abre o holograma e cumprimenta.
 */
export function useClapActivation(onActivate: Listener) {
  const enabled = useOrion((s) => s.settings.activation.clap);
  const mic = useOrion((s) => s.mic);
  const ocupado = mic === "escutando" || mic === "processando";
  useEffect(() => {
    if (!enabled || ocupado) return;
    let parar: (() => void) | null = null;
    let cancelado = false;
    const st = useOrion.getState();
    startClapListening(
      () => onActivate(),
      (l) => {
        window.__orionClapLevel = l;
      },
    )
      .then((stop) => {
        if (cancelado) stop();
        else {
          parar = stop;
          useOrion.getState().set({ clapListening: true });
        }
      })
      .catch((err) => {
        st.set({ clapListening: false });
        st.toast(`Não foi possível ouvir as palmas: ${err instanceof Error ? err.message : String(err)}`, "erro");
      });
    return () => {
      cancelado = true;
      parar?.();
      useOrion.getState().set({ clapListening: false });
    };
  }, [enabled, ocupado, onActivate]);
}

declare global {
  interface Window {
    __orionClapLevel?: number;
  }
}
