import { useMemo, useState } from "react";
import { HoloCore } from "../components/HoloCore";
import { sendMessage } from "../lib/actions";
import { pickGreeting } from "../lib/greetings";
import { listenOnce, speechRecognitionSupported } from "../lib/voice";
import { useOrion } from "../store";
import { getVisionEngine } from "../vision/engine";

export function HomePage() {
  const greeting = useMemo(() => pickGreeting(), []);
  const s = useOrion();
  const [q, setQ] = useState("");
  const go = (page: Parameters<typeof s.setPage>[0]) => s.setPage(page);
  const ask = () => {
    if (!q.trim()) return;
    s.setPage("assistente");
    void sendMessage(q);
    setQ("");
  };
  const cameraOn = s.camera === "ativa" || s.camera === "pausada";
  return (
    <div className="grid">
      <section className="hero">
        <HoloCore size={340} />
        <div className="stack">
          <p className="greeting">{greeting}</p>
          <div className="row">
            <span className={`chip ${s.server?.ai.configured ? "on" : s.serverError ? "err" : "warn"}`}>
              <span className="dot" />
              {s.serverError ? "Servidor offline" : s.server?.ai.configured ? "Inteligência central conectada" : "Modo local limitado"}
            </span>
            <span className={`chip ${cameraOn ? "on" : ""}`}><span className="dot" />Visão {cameraOn ? "ativa" : "desligada"}</span>
            <span className="chip"><span className="dot" />Modo {s.mode}</span>
          </div>
          <div className="row" style={{ marginTop: 8 }}>
            <input className="input" style={{ flex: 1, minWidth: 200 }} placeholder="Pergunte algo ao Orion…" value={q} onChange={(e) => setQ(e.target.value)} onKeyDown={(e) => e.key === "Enter" && ask()} aria-label="Pergunta rápida" />
            <button className="btn primary" onClick={ask} disabled={!q.trim()}>Enviar</button>
            <button
              className="btn"
              disabled={!speechRecognitionSupported}
              title={speechRecognitionSupported ? "Falar" : "Reconhecimento de fala não suportado"}
              onClick={() => {
                s.setPage("assistente");
                listenOnce((t) => void sendMessage(t, { viaVoice: true }));
              }}
            >
              🎙 Falar
            </button>
          </div>
          {s.serverError && <div className="notice err">{s.serverError}</div>}
        </div>
      </section>
      <section className="panel">
        <h2>Atalhos</h2>
        <div className="shortcuts">
          <button className="shortcut" data-gesture-target onClick={() => go("assistente")}><b>◈ Conversar</b><span>Texto e voz com a IA</span></button>
          <button className="shortcut" data-gesture-target onClick={() => { go("visao"); void getVisionEngine().start(s.settings.camera.deviceId); }}><b>◉ Ativar visão</b><span>Câmera, corpo e mãos</span></button>
          <button className="shortcut" data-gesture-target onClick={() => { s.setViewMode("scanner"); go("visao"); }}><b>⌖ Modo scanner</b><span>Rastreamento destacado</span></button>
          <button className="shortcut" data-gesture-target onClick={() => { s.setMode("engenheiro"); go("assistente"); }}><b>⌨ Modo engenheiro</b><span>Programação e projetos</span></button>
          <button className="shortcut" data-gesture-target onClick={() => { s.setMode("estudos"); go("assistente"); }}><b>✎ Modo estudos</b><span>Professor particular</span></button>
          <button className="shortcut" data-gesture-target onClick={() => go("projetos")}><b>▦ Meus projetos</b><span>Etapas, tarefas e lembretes</span></button>
          <button className="shortcut" data-gesture-target onClick={() => go("pesquisa")}><b>⌕ Pesquisa</b><span>Internet, arquivos e dados</span></button>
          <button className="shortcut" data-gesture-target onClick={() => go("laboratorio")}><b>⌬ Laboratório</b><span>Diagnóstico técnico</span></button>
        </div>
      </section>
    </div>
  );
}
