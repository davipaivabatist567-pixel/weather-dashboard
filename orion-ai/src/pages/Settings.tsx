import { useEffect, useState } from "react";
import { AiConnection } from "../components/AiConnection";
import { Toggle } from "../components/Shell";
import { STANDALONE } from "../lib/env";
import { refreshStatus } from "../lib/actions";
import { api } from "../lib/api";
import { listVoices, pickVoice, speak, speechRecognitionSupported, speechSynthesisSupported, stopSpeaking } from "../lib/voice";
import { useOrion, type Settings } from "../store";
import { getVisionEngine } from "../vision/engine";

export function SettingsPage() {
  const s = useOrion();
  const st = s.settings;
  const [voices, setVoices] = useState<SpeechSynthesisVoice[]>(listVoices());
  useEffect(() => {
    if (!speechSynthesisSupported) return;
    const update = () => setVoices(listVoices());
    window.speechSynthesis.addEventListener("voiceschanged", update);
    update();
    return () => window.speechSynthesis.removeEventListener("voiceschanged", update);
  }, []);
  const set = <K extends keyof Settings>(key: K, patch: Partial<Settings[K]>) =>
    s.updateSettings((x) => ({ ...x, [key]: { ...(x[key] as object), ...patch } }));
  const current = pickVoice(st.voice.voiceURI);
  const ptVoices = voices.filter((v) => v.lang.toLowerCase().startsWith("pt"));
  const otherVoices = voices.filter((v) => !v.lang.toLowerCase().startsWith("pt"));

  return (
    <div className="grid-2">
      {api.aiConfig && (
        <div className="panel">
          <h2>Conexão com a IA</h2>
          <AiConnection />
        </div>
      )}
      <div className="panel">
        <h2>Voz</h2>
        {!speechSynthesisSupported ? (
          <div className="notice">Este navegador não oferece síntese de voz.</div>
        ) : (
          <>
            <label className="field">
              Voz do Orion
              <select className="input" value={st.voice.voiceURI ?? ""} onChange={(e) => set("voice", { voiceURI: e.target.value || null })}>
                <option value="">Automática ({current ? `${current.name} — ${current.lang}` : "nenhuma voz pt-BR encontrada"})</option>
                {ptVoices.length > 0 && <optgroup label="Português">{ptVoices.map((v) => <option key={v.voiceURI} value={v.voiceURI}>{v.name} — {v.lang}</option>)}</optgroup>}
                {otherVoices.length > 0 && <optgroup label="Outros idiomas">{otherVoices.map((v) => <option key={v.voiceURI} value={v.voiceURI}>{v.name} — {v.lang}</option>)}</optgroup>}
              </select>
            </label>
            {ptVoices.length === 0 && <p className="small muted">Nenhuma voz em português instalada neste sistema; será usada a voz padrão.</p>}
            <label className="field">Velocidade: {st.voice.rate.toFixed(1)}×<input type="range" min={0.5} max={2} step={0.1} value={st.voice.rate} onChange={(e) => set("voice", { rate: Number(e.target.value) })} /></label>
            <label className="field">Volume: {Math.round(st.voice.volume * 100)}%<input type="range" min={0} max={1} step={0.05} value={st.voice.volume} onChange={(e) => set("voice", { volume: Number(e.target.value) })} /></label>
            <Toggle label="Silenciar o Orion" checked={st.voice.muted} onChange={(muted) => { set("voice", { muted }); if (muted) stopSpeaking(); }} />
            <Toggle label="Ler respostas em voz alta automaticamente" hint="Respostas a comandos falados são sempre lidas (se não estiver silenciado)" checked={st.voice.autoSpeak} onChange={(autoSpeak) => set("voice", { autoSpeak })} />
            <div className="row"><button className="btn small" onClick={() => speak("Olá. Esta é a voz do Orion. Sistemas operacionais.")}>Testar voz</button><button className="btn small ghost" onClick={stopSpeaking}>Parar</button></div>
          </>
        )}
        <hr className="sep" />
        <h2>Reconhecimento de fala</h2>
        <p className="small muted">
          {speechRecognitionSupported
            ? "Usa o reconhecimento de fala do navegador em pt-BR. Atenção: no Chrome e no Edge o áudio é enviado ao serviço de fala do fabricante do navegador para transcrição. O Orion não grava nem armazena o áudio; o microfone só é ativado quando você clica em 🎙 (ou com o gesto, se habilitado)."
            : "Este navegador não oferece reconhecimento de fala. Use o Chrome ou o Edge, ou converse por texto."}
        </p>
      </div>

      <div className="panel">
        <h2>Câmera e desempenho</h2>
        <label className="field">
          Resolução da câmera
          <select className="input" value={st.camera.resolution} onChange={(e) => set("camera", { resolution: e.target.value as Settings["camera"]["resolution"] })}>
            <option value="320x240">320×240 (leve)</option>
            <option value="640x480">640×480 (recomendado)</option>
            <option value="1280x720">1280×720 (alta)</option>
          </select>
        </label>
        <p className="small muted">A nova resolução é aplicada na próxima vez que a câmera for ativada.</p>
        {s.cameras.length > 1 && (
          <label className="field">Câmera padrão
            <select className="input" value={st.camera.deviceId ?? ""} onChange={(e) => void getVisionEngine().switchCamera(e.target.value || null)}>
              <option value="">Padrão (frontal)</option>
              {s.cameras.map((c, i) => <option key={c.deviceId} value={c.deviceId}>{c.label || `Câmera ${i + 1}`}</option>)}
            </select>
          </label>
        )}
        <Toggle
          label="Ligar a câmera automaticamente ao abrir"
          hint="Funciona quando o navegador já guardou a permissão (“Permitir ao visitar o site”). A câmera continua indicada como ativa e pode ser desligada a qualquer momento."
          checked={st.camera.autoStart}
          onChange={(autoStart) => set("camera", { autoStart })}
        />
        <Toggle label="Espelhar imagem" hint="Como um espelho (recomendado para câmera frontal)" checked={st.camera.mirror} onChange={(mirror) => set("camera", { mirror })} />
        <Toggle label="Modo econômico" hint="~10 fps de processamento, sem partículas, animações reduzidas" checked={st.performance.economy} onChange={(economy) => set("performance", { economy })} />
        <hr className="sep" />
        <h2>Aparência</h2>
        <Toggle label="Partículas de fundo" checked={st.appearance.particles} onChange={(particles) => set("appearance", { particles })} />
        <Toggle label="Reduzir animações" checked={st.appearance.reducedMotion} onChange={(reducedMotion) => set("appearance", { reducedMotion })} />
        <Toggle label="Mostrar painel de diagnóstico" checked={st.showDiagnostics} onChange={(showDiagnostics) => s.updateSettings((x) => ({ ...x, showDiagnostics }))} />
      </div>

      <div className="panel">
        <h2>Permissões do Orion</h2>
        <p className="small muted">Ferramentas não autorizadas não são oferecidas ao modelo. Exclusões sempre exigem sua confirmação final.</p>
        <Toggle label="Ler a memória e o conhecimento aprendido" hint="Nível: com autorização" checked={st.permissions.readMemory} onChange={(readMemory) => set("permissions", { readMemory })} />
        <Toggle label="Salvar memórias e aprender" hint="Nível: com autorização (inclui o aprendizado automático)" checked={st.permissions.writeMemory} onChange={(writeMemory) => set("permissions", { writeMemory })} />
        <Toggle label="Ler e criar projetos, tarefas e lembretes" hint="Nível: com autorização" checked={st.permissions.manageProjects} onChange={(manageProjects) => set("permissions", { manageProjects })} />
        <Toggle label="Pesquisar na internet" hint="Nível: com autorização (serviço externo)" checked={st.permissions.webSearch} onChange={(webSearch) => set("permissions", { webSearch })} />
        <table className="diag-table" style={{ marginTop: 10 }}>
          <tbody>
            <tr><td>Baixo risco</td><td>cálculos, data/hora, explicações</td></tr>
            <tr><td>Com autorização</td><td>memória, projetos, pesquisa, arquivos</td></tr>
            <tr><td>Confirmação final</td><td>exclusões de memória e projetos</td></tr>
          </tbody>
        </table>
      </div>

      <div className="panel">
        <h2>Privacidade</h2>
        <ul className="small" style={{ paddingLeft: 18, marginTop: 0 }}>
          <li>Vídeo processado localmente (MediaPipe no navegador); nenhum quadro é gravado ou enviado automaticamente.</li>
          <li>Sem reconhecimento de identidade de pessoas.</li>
          <li>Imagens só vão para a IA quando você anexa um arquivo ou confirma “Analisar quadro”.</li>
          <li>{STANDALONE ? "A chave da API fica apenas neste navegador e só é enviada à API da Anthropic." : "A chave da API fica apenas no servidor."}</li>
        </ul>
        <div className="stack">
          <button className="btn small" onClick={() => { getVisionEngine().stop(); s.toast("Câmera desligada.", "ok"); }}>Desligar câmera agora</button>
          <button className="btn small danger" onClick={() => confirm("Apagar configurações deste navegador (voz, câmera, gestos, permissões)?") && (s.resetSettings(), s.toast("Configurações restauradas.", "ok"))}>Restaurar configurações padrão</button>
          <button
            className="btn small danger"
            onClick={async () => {
              if (!confirm("Apagar TODOS os dados pessoais: memória, projetos, tarefas, lembretes e histórico de conversa? Isso não pode ser desfeito.")) return;
              try {
                await api.wipeAll();
                s.clearMessages();
                s.set({ gestureLog: [] });
                window.dispatchEvent(new Event("orion:data-changed"));
                s.toast("Todos os dados pessoais foram apagados.", "ok");
              } catch (err) {
                s.toast((err as Error).message, "erro");
              }
            }}
          >
            Apagar todos os meus dados
          </button>
        </div>
      </div>

      <div className="panel">
        <h2>Integrações</h2>
        <table className="diag-table">
          <tbody>
            <tr><td>{STANDALONE ? "Versão" : "Servidor do Orion"}</td><td>{STANDALONE ? `HTML independente (v${s.server?.version ?? "?"})` : s.serverError ? "Inacessível" : s.server ? `Online (v${s.server.version})` : "Verificando…"}</td></tr>
            <tr><td>Modelo de IA</td><td>{s.server?.ai.configured ? `${s.server.ai.provider} · ${s.server.ai.model}` : "Não configurado"}</td></tr>
            <tr><td>Pesquisa na internet</td><td>{s.server?.ai.webSearch ? "web_search (Anthropic)" : "Indisponível"}</td></tr>
            <tr><td>Armazenamento</td><td>{s.server?.storage.ok ? s.server.storage.path : "Indisponível"}</td></tr>
            <tr><td>Notificações</td><td>{"Notification" in window ? Notification.permission : "Sem suporte"}</td></tr>
          </tbody>
        </table>
        <div className="row" style={{ marginTop: 10 }}>
          <button className="btn small" onClick={() => void refreshStatus()}>Verificar novamente</button>
          {"Notification" in window && Notification.permission === "default" && (
            <button className="btn small" onClick={() => void Notification.requestPermission().then(() => s.toast("Permissão de notificações atualizada."))}>Permitir notificações</button>
          )}
        </div>
        {!s.server?.ai.configured && !STANDALONE && (
          <p className="small muted" style={{ marginTop: 10 }}>
            Para conectar a IA: crie o arquivo <span className="mono">.env</span> no servidor com <span className="mono">ANTHROPIC_API_KEY=…</span> e reinicie. A chave nunca é enviada ao navegador.
          </p>
        )}
      </div>
    </div>
  );
}
