// Controles da câmera: ativar, desligar, pausar/retomar, escolher dispositivo e modo de visualização.
import { useOrion, type ViewMode } from "../store";
import { getVisionEngine } from "../vision/engine";

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
        <span className="small muted">Visualização:</span>
        {VIEW_MODES.map((m) => (
          <button key={m.id} className={`mode-btn ${viewMode === m.id ? "active" : ""}`} onClick={() => setViewMode(m.id)} aria-pressed={viewMode === m.id}>
            {m.label}
          </button>
        ))}
      </div>
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
