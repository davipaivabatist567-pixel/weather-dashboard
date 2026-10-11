import { useEffect, useState } from "react";
import { CameraControls } from "../components/CameraControls";
import { HoloCore } from "../components/HoloCore";
import { Toggle } from "../components/Shell";
import { VisionView } from "../components/VisionView";
import { speechRecognitionSupported, speechSynthesisSupported } from "../lib/voice";
import { useOrion } from "../store";
import { getVisionEngine } from "../vision/engine";
import { GESTURE_LABELS, POSE, type GestureCandidate, type Pt } from "../vision/gestures";

function capabilities(): [string, boolean, string][] {
  let webgl = false;
  try {
    webgl = !!document.createElement("canvas").getContext("webgl2");
  } catch {
    webgl = false;
  }
  let storage = false;
  try {
    localStorage.setItem("orion.test", "1");
    localStorage.removeItem("orion.test");
    storage = true;
  } catch {
    storage = false;
  }
  return [
    ["Contexto seguro (HTTPS/localhost)", window.isSecureContext, "Necessário para câmera e microfone"],
    ["Acesso à câmera (getUserMedia)", !!navigator.mediaDevices?.getUserMedia, "Visão computacional"],
    ["WebGL2 (aceleração GPU)", webgl, "Sem ele, o MediaPipe usa a CPU"],
    ["WebAssembly", typeof WebAssembly === "object", "Necessário para o MediaPipe"],
    ["Reconhecimento de fala", speechRecognitionSupported, "Comandos por voz (Chrome/Edge)"],
    ["Síntese de voz", speechSynthesisSupported, "Respostas faladas"],
    ["Notificações", "Notification" in window, "Lembretes"],
    ["Armazenamento local", storage, "Configurações e histórico"],
  ];
}

const KEY_POINTS: [string, number][] = [
  ["Nariz", POSE.nariz], ["Ombro E", POSE.ombroEsq], ["Ombro D", POSE.ombroDir], ["Cotovelo E", POSE.cotoveloEsq],
  ["Cotovelo D", POSE.cotoveloDir], ["Pulso E", POSE.pulsoEsq], ["Pulso D", POSE.pulsoDir], ["Quadril E", POSE.quadrilEsq],
  ["Quadril D", POSE.quadrilDir], ["Joelho E", POSE.joelhoEsq], ["Joelho D", POSE.joelhoDir], ["Tornozelo E", POSE.tornozeloEsq], ["Tornozelo D", POSE.tornozeloDir],
];

export function LabPage() {
  const s = useOrion();
  const [snap, setSnap] = useState<{ pose: Pt[] | null; candidates: GestureCandidate[] }>({ pose: null, candidates: [] });
  const caps = capabilities();
  useEffect(() => {
    const id = setInterval(() => {
      const f = getVisionEngine().latest;
      setSnap({ pose: f.pose, candidates: f.candidates });
    }, 250);
    return () => clearInterval(id);
  }, []);
  const on = s.camera === "ativa" || s.camera === "pausada";
  return (
    <div className="grid">
      <div className="grid-2" style={{ gridTemplateColumns: "minmax(220px, 300px) minmax(0, 1fr)" }}>
        <div className="panel">
          <HoloCore size={240} />
          <div className="row" style={{ justifyContent: "center", marginTop: 10 }}>
            <button className="btn small" onClick={() => { s.setCore("especial"); setTimeout(() => useOrion.getState().core === "especial" && s.setCore("repouso"), 2500); }}>Testar animação especial</button>
          </div>
        </div>
        <div className="stack">
          <VisionView compact modeOverride="laboratorio" />
          <div className="panel"><CameraControls /></div>
        </div>
      </div>
      <div className="grid-2">
        <div className="panel">
          <h2>Pontos corporais (tempo real)</h2>
          {!on || !snap.pose ? (
            <p className="small muted">{on ? "Nenhum corpo detectado." : "Câmera desligada — dados indisponíveis."}</p>
          ) : (
            <table className="diag-table">
              <tbody>
                <tr><td><b>Ponto</b></td><td><b>x · y · visibilidade</b></td></tr>
                {KEY_POINTS.map(([name, i]) => {
                  const p = snap.pose![i];
                  return <tr key={name}><td>{name}</td><td>{p ? `${p.x.toFixed(3)} · ${p.y.toFixed(3)} · ${Math.round((p.visibility ?? 0) * 100)}%` : "Indisponível"}</td></tr>;
                })}
              </tbody>
            </table>
          )}
          <p className="small muted">Coordenadas normalizadas da imagem (0–1), saída suavizada do PoseLandmarker.</p>
        </div>
        <div className="panel">
          <h2>Candidatos a gesto (por quadro)</h2>
          {on && snap.candidates.length ? (
            snap.candidates.map((c, i) => (
              <div key={i} style={{ marginBottom: 8 }}>
                <div className="row" style={{ justifyContent: "space-between" }}><span>{GESTURE_LABELS[c.id]}</span><span className="mono small">{Math.round(c.confidence * 100)}%</span></div>
                <div className="bar"><i style={{ width: `${Math.round(c.confidence * 100)}%` }} /></div>
              </div>
            ))
          ) : (
            <p className="small muted">{on ? "Nenhum gesto no quadro atual." : "Câmera desligada."}</p>
          )}
          <p className="small muted">Um gesto só é confirmado após ser mantido por vários quadros acima do limiar de confiança.</p>
          <hr className="sep" />
          <h2>Desempenho</h2>
          <Toggle label="Modo econômico" hint="~10 fps de processamento, sem partículas e animações reduzidas" checked={s.settings.performance.economy} onChange={(economy) => s.updateSettings((x) => ({ ...x, performance: { economy } }))} />
        </div>
      </div>
      <div className="panel">
        <h2>Compatibilidade deste navegador</h2>
        <table className="diag-table">
          <tbody>
            {caps.map(([name, ok, why]) => (
              <tr key={name}><td>{name} <span className="small muted">— {why}</span></td><td style={{ color: ok ? "var(--ok)" : "var(--danger)" }}>{ok ? "Suportado" : "Não suportado"}</td></tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
