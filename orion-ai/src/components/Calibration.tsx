// Calibração dos gestos: mede a mão do usuário (aberta e em pinça) e ajusta os limiares.
import { useRef, useState } from "react";
import { useOrion } from "../store";
import { getVisionEngine } from "../vision/engine";
import { dist, fingerStraightness, DEFAULT_CALIBRATION } from "../vision/gestures";

type Phase = "idle" | "aberta" | "pinca" | "fim";

async function sample(ms: number, pick: (world: ReturnType<typeof getVisionEngine>["latest"]["hands"][number]["world"]) => number) {
  const engine = getVisionEngine();
  const values: number[] = [];
  const end = performance.now() + ms;
  let lastT = 0;
  while (performance.now() < end) {
    await new Promise((r) => setTimeout(r, 50));
    const f = engine.latest;
    const h = f.hands.find((x) => x.lastSeen === f.t);
    if (h && f.t !== lastT && h.world.length >= 21) {
      lastT = f.t;
      values.push(pick(h.world));
    }
  }
  return values;
}

const median = (v: number[]) => {
  const s = [...v].sort((a, b) => a - b);
  return s[Math.floor(s.length / 2)];
};

export function Calibration() {
  const camera = useOrion((s) => s.camera);
  const cal = useOrion((s) => s.settings.calibration);
  const update = useOrion((s) => s.updateSettings);
  const [phase, setPhase] = useState<Phase>("idle");
  const [msg, setMsg] = useState<string | null>(null);
  const running = useRef(false);

  const run = async () => {
    if (running.current) return;
    running.current = true;
    setMsg(null);
    try {
      setPhase("aberta");
      await new Promise((r) => setTimeout(r, 1200));
      const open = await sample(2500, (w) => {
        const f = fingerStraightness(w);
        return Math.min(f.indicador, f.medio, f.anelar, f.minimo);
      });
      const openGap = await sample(800, (w) => dist(w[4], w[8]) / (dist(w[0], w[9]) || 1));
      setPhase("pinca");
      await new Promise((r) => setTimeout(r, 1500));
      const pinch = await sample(2500, (w) => dist(w[4], w[8]) / (dist(w[0], w[9]) || 1));
      if (open.length < 10 || pinch.length < 10 || openGap.length < 3) {
        setMsg("Não detectei a mão por tempo suficiente. Mantenha a mão visível e tente de novo.");
        setPhase("idle");
        return;
      }
      const straightness = Math.max(0.6, Math.min(0.92, median(open) * 0.9));
      const pinchThreshold = Math.max(0.15, Math.min(0.6, (median(pinch) + median(openGap)) / 2));
      update((s) => ({ ...s, calibration: { straightness, pinchThreshold } }));
      setMsg(`Calibração concluída: retidão mínima ${straightness.toFixed(2)}, limiar da pinça ${pinchThreshold.toFixed(2)} (amostras: ${open.length} + ${pinch.length}).`);
      setPhase("fim");
    } finally {
      running.current = false;
    }
  };

  return (
    <div className="stack">
      <p className="small muted">
        Ajusta os limiares à sua mão. Etapa 1: mão aberta com os dedos esticados de frente para a câmera. Etapa 2: pinça (polegar tocando o indicador).
      </p>
      {phase === "aberta" && <div className="notice ok">✋ Mostre a <b>mão aberta</b> e mantenha…</div>}
      {phase === "pinca" && <div className="notice ok">🤏 Agora faça a <b>pinça</b> e mantenha…</div>}
      {msg && <div className={`notice ${phase === "fim" ? "ok" : "err"}`}>{msg}</div>}
      <div className="row">
        <button className="btn" onClick={() => void run()} disabled={camera !== "ativa" || phase === "aberta" || phase === "pinca"}>
          {camera !== "ativa" ? "Ative a câmera para calibrar" : "Iniciar calibração"}
        </button>
        <button className="btn ghost small" onClick={() => { update((s) => ({ ...s, calibration: DEFAULT_CALIBRATION })); setMsg(null); setPhase("idle"); }}>
          Restaurar padrão
        </button>
      </div>
      <div className="small mono muted">Atual: retidão ≥ {cal.straightness.toFixed(2)} · pinça &lt; {cal.pinchThreshold.toFixed(2)}</div>
    </div>
  );
}
