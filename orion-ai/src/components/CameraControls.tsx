// Controles da câmera: ativar, desligar, pausar/retomar, escolher dispositivo e modo de visualização.
import { useState } from "react";
import { useOrion, type ViewMode } from "../store";
import { diagnoseCamera, type DiagStep } from "../vision/diagnose";
import { getVisionEngine } from "../vision/engine";
import { useCameraPermission } from "../vision/permission";

const VIEW_MODES: { id: ViewMode; label: string }[] = [
  { id: "normal", label: "Normal" },
  { id: "scanner", label: "Scanner" },
  { id: "laboratorio", label: "Laboratório" },
];

export function CameraControls() {
  const camera = useOrion((s) => s.camera);
  const cameras = useOrion((s) => s.cameras);
  const deviceId = useOrion((s) => s.settings.camera.deviceId);
  const viewMode = useOrion((s) => s.viewMode);
  const setViewMode = useOrion((s) => s.setViewMode);
  const engine = getVisionEngine();
  const on = camera !== "desligada" && camera !== "erro";
  const busy = camera === "aguardando_permissao" || camera === "inicializando" || camera === "carregando_modelos";
  const permission = useCameraPermission();
  const autoStart = useOrion((s) => s.settings.camera.autoStart);
  const isFile = location.protocol === "file:";
  const [report, setReport] = useState<DiagStep[] | null>(null);
  const [diagBusy, setDiagBusy] = useState(false);
  const runDiagnosis = async () => {
    setDiagBusy(true);
    setReport(null);
    try {
      setReport(await diagnoseCamera());
    } finally {
      setDiagBusy(false);
    }
  };

  return (
    <div className="stack">
      <div className="row">
        {!on ? (
          <button className="btn primary big" onClick={() => void engine.start(deviceId)}>
            ◉ ATIVAR VISÃO COMPUTACIONAL
          </button>
        ) : (
          <>
            <button className="btn danger" onClick={() => engine.stop()}>■ Desligar câmera</button>
            {camera === "pausada" ? (
              <button className="btn" onClick={() => engine.resume()}>▶ Retomar</button>
            ) : (
              <button className="btn" onClick={() => engine.pause()} disabled={busy}>❚❚ Pausar processamento</button>
            )}
          </>
        )}
      </div>
      <div className="row">
        <button className="btn small ghost" onClick={() => void runDiagnosis()} disabled={diagBusy}>
          {diagBusy ? "Diagnosticando…" : "Diagnosticar câmera"}
        </button>
      </div>
      {report && (
        <ul className="small cam-diag" aria-label="Resultado do diagnóstico da câmera">
          {report.map((r) => (
            <li key={r.name} className={r.ok ? "ok" : "falha"}>
              {r.ok ? "✓" : "✗"} <b>{r.name}</b>: {r.detail}
            </li>
          ))}
        </ul>
      )}
      <div className="row">
        <span className="small muted">Visualização:</span>
        {VIEW_MODES.map((m) => (
          <button key={m.id} className={`mode-btn ${viewMode === m.id ? "active" : ""}`} onClick={() => setViewMode(m.id)} aria-pressed={viewMode === m.id}>
            {m.label}
          </button>
        ))}
      </div>
      {camera === "aguardando_permissao" && (
        <div className="notice">
          Na janela do navegador, escolha <b>“Permitir ao visitar o site”</b> (ou “Sempre permitir”). Assim o navegador não pergunta de novo
          {autoStart ? " e o Orion liga a câmera sozinho quando você abrir" : ""}.
        </div>
      )}
      {permission === "denied" && (
        <div className="notice err">
          A câmera está bloqueada para este endereço. Clique no ícone de cadeado/câmera ao lado do endereço, mude Câmera para “Permitir” e recarregue a página.
        </div>
      )}
      {permission === "granted" && autoStart && <div className="small muted">✓ Permissão salva no navegador: a câmera liga sozinha ao abrir o Orion.</div>}
      {isFile && permission !== "granted" && (
        <div className="small muted">
          Aberto como arquivo, alguns navegadores voltam a perguntar a cada vez. Para lembrar de vez, use o Orion pelo endereço http://localhost (versão com servidor).
        </div>
      )}
      {cameras.length > 1 && (
        <label className="field">
          Câmera
          <select className="input" value={deviceId ?? ""} onChange={(e) => void engine.switchCamera(e.target.value || null)}>
            <option value="">Padrão (frontal)</option>
            {cameras.map((c, i) => (
              <option key={c.deviceId} value={c.deviceId}>{c.label || `Câmera ${i + 1}`}</option>
            ))}
          </select>
        </label>
      )}
    </div>
  );
}
