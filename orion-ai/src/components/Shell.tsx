// Estrutura da interface: barra lateral, barra superior, toasts e cursor da pinça.
import { useEffect, useState } from "react";
import { bus } from "../lib/bus";
import { stopListening, stopSpeaking } from "../lib/voice";
import { PAGES, useOrion } from "../store";
import { getVisionEngine } from "../vision/engine";

export function Sidebar() {
  const page = useOrion((s) => s.page);
  const setPage = useOrion((s) => s.setPage);
  return (
    <nav className="sidebar" aria-label="Navegação principal">
      <div className="brand">
        <div className="brand-mark" aria-hidden="true" />
        <div>
          <h1>ORION</h1>
          <small>AI · LAB SYSTEM</small>
        </div>
      </div>
      {PAGES.map((p) => (
        <button key={p.id} className={`nav-btn ${page === p.id ? "active" : ""}`} onClick={() => setPage(p.id)} aria-current={page === p.id ? "page" : undefined} data-gesture-target>
          <span className="ico" aria-hidden="true">{p.icon}</span>
          {p.label}
        </button>
      ))}
      <div className="sidebar-foot">v0.1 · processamento de imagem local</div>
    </nav>
  );
}

export function TopBar() {
  const s = useOrion();
  const pageLabel = PAGES.find((p) => p.id === s.page)?.label ?? "";
  const cameraLive = s.camera === "ativa" || s.camera === "pausada" || s.camera === "carregando_modelos" || s.camera === "inicializando";
  const ai = s.serverError ? "err" : s.server?.ai.configured ? "on" : "warn";
  return (
    <header className="topbar">
      <div className="title">{pageLabel.toUpperCase()}</div>
      <span className={`chip ${ai}`} title={s.serverError ?? ""}>
        <span className="dot" />
        {s.serverError ? "Servidor offline" : s.server?.ai.configured ? `IA: ${s.server.ai.model}` : "IA não configurada"}
      </span>
      {cameraLive ? (
        <button className="chip live" onClick={() => getVisionEngine().stop()} title="Clique para desligar a câmera imediatamente">
          <span className="dot" />Câmera ativa · desligar
        </button>
      ) : (
        <span className="chip"><span className="dot" />Câmera desligada</span>
      )}
      {s.mic === "escutando" ? (
        <button className="chip live" onClick={stopListening} title="Parar de escutar"><span className="dot" />Microfone ativo · parar</button>
      ) : (
        <span className="chip"><span className="dot" />Microfone desligado</span>
      )}
      {s.clapListening && (
        <button className="chip live" onClick={() => s.updateSettings((x) => ({ ...x, activation: { ...x.activation, clap: false } }))} title="O microfone só mede o volume neste aparelho para detectar palmas. Clique para desligar.">
          <span className="dot" />Ouvindo palmas · desligar
        </button>
      )}
      {s.activeMode && (
        <button className="chip on" onClick={() => { s.set({ activeMode: false }); stopListening(); }} title="O Orion volta a ouvir depois de cada resposta">
          <span className="dot" />Conversa contínua · encerrar
        </button>
      )}
      {s.speaking && (
        <button className="chip on" onClick={stopSpeaking}><span className="dot" />Falando · parar</button>
      )}
      <button className="chip" onClick={() => s.updateSettings((x) => ({ ...x, showDiagnostics: !x.showDiagnostics }))} aria-pressed={s.settings.showDiagnostics}>
        {s.settings.showDiagnostics ? "Ocultar diagnóstico" : "Mostrar diagnóstico"}
      </button>
    </header>
  );
}

export function Toasts() {
  const toasts = useOrion((s) => s.toasts);
  const dismiss = useOrion((s) => s.dismissToast);
  return (
    <div className="toasts" role="status" aria-live="polite">
      {toasts.map((t) => (
        <div key={t.id} className={`toast ${t.kind}`} onClick={() => dismiss(t.id)}>{t.text}</div>
      ))}
    </div>
  );
}

/**
 * Seleção por pinça (experimental): a ponta do indicador move um cursor;
 * ao confirmar a pinça, clica apenas em botões de navegação marcados como seguros.
 */
export function PinchCursor() {
  const [pos, setPos] = useState<{ x: number; y: number; active: boolean } | null>(null);
  useEffect(() => bus.on("pinchMove", (p) => setPos(p ? { x: p.x * window.innerWidth, y: p.y * window.innerHeight, active: p.active } : null)), []);
  useEffect(
    () =>
      bus.on("gesture", (g) => {
        const st = useOrion.getState();
        if (g.id !== "pinca" || !st.settings.gestures.pinchSelect || g.confidence < 0.7 || !pos) return;
        const el = document.elementFromPoint(pos.x, pos.y)?.closest<HTMLElement>("[data-gesture-target]");
        if (el) el.click();
      }),
    [pos],
  );
  if (!pos) return null;
  return <div className={`pinch-cursor ${pos.active ? "active" : ""}`} style={{ left: pos.x, top: pos.y }} aria-hidden="true" />;
}

export function SpecialEffect() {
  const core = useOrion((s) => s.core);
  return core === "especial" ? <div className="special-flash" aria-hidden="true" /> : null;
}

export function Toggle({ label, hint, checked, onChange, disabled }: { label: string; hint?: string; checked: boolean; onChange: (v: boolean) => void; disabled?: boolean }) {
  return (
    <label className="toggle" style={disabled ? { opacity: 0.5 } : undefined}>
      <span>
        {label}
        {hint && <small>{hint}</small>}
      </span>
      <span className="switch">
        <input type="checkbox" checked={checked} disabled={disabled} onChange={(e) => onChange(e.target.checked)} />
        <span />
      </span>
    </label>
  );
}
