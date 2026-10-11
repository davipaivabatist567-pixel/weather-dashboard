import { useState } from "react";
import { Calibration } from "../components/Calibration";
import { CameraControls } from "../components/CameraControls";
import { Toggle } from "../components/Shell";
import { VisionView } from "../components/VisionView";
import { sendMessage } from "../lib/actions";
import { dataUrlToAttachment } from "../lib/files";
import { useOrion } from "../store";
import { getVisionEngine } from "../vision/engine";
import { GESTURE_LABELS, type GestureId } from "../vision/gestures";

const fmt = (n: number | null | undefined, unit = "", d = 2) => (n === null || n === undefined ? "Indisponível" : `${n.toFixed(d)}${unit}`);

function armPosition(h: number | null) {
  if (h === null) return "Indisponível";
  if (h > 0.5) return "Levantado";
  if (h > -0.6) return "Na altura do ombro";
  return "Abaixado";
}

export function VisionPage() {
  const s = useOrion();
  const v = s.vision;
  const b = v.body;
  const on = s.camera === "ativa" || s.camera === "pausada";
  const [confirmShot, setConfirmShot] = useState(false);
  const gs = s.settings.gestures;
  const setG = (patch: Partial<typeof gs>) => s.updateSettings((x) => ({ ...x, gestures: { ...x.gestures, ...patch } }));

  const analyzeFrame = () => {
    setConfirmShot(false);
    const shot = getVisionEngine().captureFrame();
    if (!shot) return s.toast("Nenhum quadro disponível.", "erro");
    s.setPage("assistente");
    void sendMessage("Descreva o que você vê nesta imagem da minha câmera.", {
      attachments: [dataUrlToAttachment(shot, "quadro-da-camera.jpg")],
      noCommands: true,
    });
  };

  return (
    <div className="grid">
      <div className="grid-2" style={{ gridTemplateColumns: "minmax(0, 2fr) minmax(280px, 1fr)" }}>
        <div className="stack">
          <VisionView />
          <div className="panel">
            <CameraControls />
          </div>
        </div>
        <div className="stack">
          <div className="panel">
            <h2>Rastreamento</h2>
            <div className="hands-indicator" style={{ marginBottom: 12 }} aria-label={`${v.hands} mãos detectadas`}>
              <span className={`hand-pill ${on && v.hands === 0 ? "on" : ""}`}>Nenhuma mão</span>
              <span className={`hand-pill ${on && v.hands === 1 ? "on" : ""}`}>1 mão</span>
              <span className={`hand-pill ${on && v.hands === 2 ? "on" : ""}`}>2 mãos</span>
            </div>
            <div className="metrics">
              <div className="metric"><span>Corpo</span><b>{on ? (b?.detected ? "Detectado" : "Não detectado") : "—"}</b></div>
              <div className="metric"><span>Confiança</span><b>{on && b?.detected ? `${Math.round(b.confidence * 100)}%` : "—"}</b></div>
              <div className="metric"><span>Braço esq.</span><b>{on ? armPosition(b?.leftHandHeight ?? null) : "—"}</b></div>
              <div className="metric"><span>Braço dir.</span><b>{on ? armPosition(b?.rightHandHeight ?? null) : "—"}</b></div>
              <div className="metric"><span>Mão esq. (alt.)</span><b>{on ? fmt(b?.leftHandHeight) : "—"}</b></div>
              <div className="metric"><span>Mão dir. (alt.)</span><b>{on ? fmt(b?.rightHandHeight) : "—"}</b></div>
              <div className="metric"><span>Mov. lateral</span><b>{on ? fmt(b?.lateralSpeed, "/s") : "—"}</b></div>
              <div className="metric"><span>Gesto</span><b>{on && v.gesture ? GESTURE_LABELS[v.gesture.id] : "—"}</b></div>
            </div>
            <p className="small muted">Alturas em larguras de ombro (positivo = acima do ombro). Valores relativos, sem medição física.</p>
            {v.handedness.length > 0 && <p className="small">Mãos: {v.handedness.join(" · ")}</p>}
          </div>
          <div className="panel">
            <h2>Histórico de gestos</h2>
            {s.gestureLog.length === 0 ? (
              <p className="small muted">Nenhum gesto confirmado ainda.</p>
            ) : (
              <ul className="gesture-log">
                {s.gestureLog.map((g, i) => (
                  <li key={i}>
                    <span>{GESTURE_LABELS[g.id]} <span className="muted small">· {g.action}</span></span>
                    <span className="mono small">{Math.round(g.confidence * 100)}% · {new Date(g.at).toLocaleTimeString("pt-BR")}</span>
                  </li>
                ))}
              </ul>
            )}
            {s.gestureLog.length > 0 && <button className="btn small ghost" onClick={() => s.set({ gestureLog: [] })}>Limpar histórico de gestos</button>}
          </div>
        </div>
      </div>

      <div className="grid-2">
        <div className="panel">
          <h2>Controle por gestos</h2>
          <Toggle label="Reconhecimento de gestos" checked={gs.enabled} onChange={(enabled) => setG({ enabled })} />
          <label className="field">
            Sensibilidade: {gs.sensitivity} {gs.sensitivity <= 3 ? "(mais seguro)" : gs.sensitivity >= 8 ? "(mais rápido)" : ""}
            <input type="range" min={1} max={10} value={gs.sensitivity} onChange={(e) => setG({ sensitivity: Number(e.target.value) })} />
          </label>
          <Toggle label="Navegar entre painéis com movimento lateral" hint="Deslize a mão para a esquerda/direita" checked={gs.navigation} onChange={(navigation) => setG({ navigation })} />
          <Toggle label="Levantar a mão direita inicia a escuta por voz" checked={gs.raiseHandToListen} onChange={(raiseHandToListen) => setG({ raiseHandToListen })} />
          <Toggle label="Seleção por pinça (experimental)" hint="Cursor no indicador; a pinça clica somente em botões de navegação" checked={gs.pinchSelect} onChange={(pinchSelect) => setG({ pinchSelect })} />
          <details style={{ marginTop: 8 }}>
            <summary>Ativar/desativar gestos individualmente</summary>
            {(Object.keys(GESTURE_LABELS) as GestureId[]).map((id) => (
              <Toggle key={id} label={GESTURE_LABELS[id]} checked={!gs.disabled.includes(id)} onChange={(en) => setG({ disabled: en ? gs.disabled.filter((x) => x !== id) : [...gs.disabled, id] })} />
            ))}
          </details>
        </div>
        <div className="panel">
          <h2>Calibração</h2>
          <Calibration />
          <hr className="sep" />
          <h2>Análise do quadro pela IA</h2>
          <p className="small muted">Envia <b>um único quadro</b> da câmera ao modelo de IA conectado, somente após sua confirmação. Nada é enviado automaticamente.</p>
          {!confirmShot ? (
            <button className="btn" disabled={s.camera !== "ativa" || !s.server?.ai.configured} onClick={() => setConfirmShot(true)}>
              {s.server?.ai.configured ? "Analisar quadro atual com a IA" : "Requer modelo de IA conectado"}
            </button>
          ) : (
            <div className="pending-box">
              Enviar o quadro atual da câmera para {s.server?.ai.provider}? A imagem sai deste dispositivo.
              <div className="row" style={{ marginTop: 8 }}>
                <button className="btn danger small" onClick={analyzeFrame}>Enviar quadro</button>
                <button className="btn small" onClick={() => setConfirmShot(false)}>Cancelar</button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
