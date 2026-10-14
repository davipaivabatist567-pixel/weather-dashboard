import { useEffect, useState } from "react";
import { AiConnection } from "../components/AiConnection";
import { Toggle } from "../components/Shell";
import { STANDALONE } from "../lib/env";
import { ativarOrion, refreshStatus } from "../lib/actions";
import { thresholdFromSensitivity } from "../lib/clap";
import { RING_DEFAULT_KEY, RING_LABELS, runRingAction } from "../lib/ring";
import type { RingEvent } from "../lib/ringDecoder";
import { api } from "../lib/api";
import { listVoices, pickVoice, speak, speechRecognitionSupported, speechSynthesisSupported, stopSpeaking } from "../lib/voice";
import { useOrion, type Settings } from "../store";
import { getVisionEngine } from "../vision/engine";

/** Ativação no estilo VISION: duas palmas, conversa contínua e mãos controlando o holograma. */
function AtivacaoPanel() {
  const s = useOrion();
  const a = s.settings.activation;
  const set = (patch: Partial<Settings["activation"]>) => s.updateSettings((x) => ({ ...x, activation: { ...x.activation, ...patch } }));
  const [nivel, setNivel] = useState(0);
  useEffect(() => {
    if (!s.clapListening) return;
    const id = setInterval(() => setNivel(window.__orionClapLevel ?? 0), 100);
    return () => clearInterval(id);
  }, [s.clapListening]);
  const limiar = thresholdFromSensitivity(a.clapSensitivity);
  return (
    <div className="panel">
      <h2>Ativação (estilo VISION)</h2>
      <Toggle
        label="Ativar com duas palmas"
        hint="O microfone fica ligado só para medir o volume e detectar duas batidas curtas. Nada é gravado nem enviado. Ao detectar, o Orion abre o holograma e cumprimenta."
        checked={a.clap}
        onChange={(clap) => set({ clap })}
      />
      <label className="field">
        Sensibilidade das palmas: {a.clapSensitivity}
        <input type="range" min={1} max={10} value={a.clapSensitivity} onChange={(e) => set({ clapSensitivity: Number(e.target.value) })} />
      </label>
      {s.clapListening && (
        <div className="small" aria-label="Nível do microfone">
          Nível agora: <span className="mono">{(nivel * 100).toFixed(1)}</span> (palma conta acima de <span className="mono">{(limiar * 100).toFixed(1)}</span>)
          <div className="meter"><div style={{ width: `${Math.min(100, (nivel / (limiar * 2)) * 100)}%` }} /><span style={{ left: "50%" }} /></div>
        </div>
      )}
      <Toggle
        label="Conversa contínua depois de ativar"
        hint="Depois de cada resposta falada, o Orion volta a ouvir, até você dizer “pode dormir” ou ficar em silêncio duas vezes. Precisa de ditado por voz (Chrome)."
        checked={a.activeConversation}
        onChange={(activeConversation) => set({ activeConversation })}
      />
      <Toggle
        label="Controlar o holograma com as mãos"
        hint="Com a câmera ligada: uma mão gira o holograma, as duas mãos em pinça dão zoom."
        checked={a.handsHologram}
        onChange={(handsHologram) => set({ handsHologram })}
      />
      <div className="row" style={{ marginTop: 8 }}>
        <button className="btn small" onClick={() => ativarOrion()}>Testar ativação</button>
        <button className="btn small ghost" onClick={() => s.set({ hologramOpen: true })}>Abrir holograma</button>
      </div>
      <p className="small muted" style={{ marginTop: 8 }}>
        Comandos: “abrir YouTube”, “pesquisar gatos no Google”, “tocar Believer”, “tirar foto”, “bateria”, “volume 40”, “abrir holograma”, “quem é você”, “pode dormir”.
      </p>
    </div>
  );
}

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

      <AtivacaoPanel />

      <div className="panel">
        <h2>Orion Ring (controle físico)</h2>
        <p className="small muted">
          Um botão físico que o Orion entende como teclado: o anel (ou qualquer teclado Bluetooth) envia uma tecla, e o Orion transforma o tempo do toque em comandos. Por segurança, o anel nunca confirma exclusões. <strong>Nenhum anel foi construído ou testado ainda</strong>: use um teclado para experimentar.
        </p>
        <Toggle label="Ativar o botão do anel" checked={st.ring.enabled} onChange={(enabled) => set("ring", { enabled })} />
        <div className="row" style={{ margin: "8px 0" }}>
          <span className="small">Tecla atual: <span className="mono">{st.ring.key}</span></span>
          <button className="btn small" onClick={() => { s.set({ ringLearning: true }); s.toast("Aperte agora a tecla do anel (Esc cancela).", "info"); }}>
            {s.ringLearning ? "Aguardando tecla…" : "Aprender tecla"}
          </button>
          <button className="btn small ghost" onClick={() => set("ring", { key: RING_DEFAULT_KEY })}>Restaurar {RING_DEFAULT_KEY}</button>
        </div>
        <table className="diag-table">
          <tbody>
            <tr><td>Clique</td><td>Liga/desliga o microfone (ditado)</td></tr>
            <tr><td>Duplo clique</td><td>Lê em voz alta a última resposta (ou para a leitura)</td></tr>
            <tr><td>Pressão longa (0,6 s)</td><td>Interrompe resposta, fala e microfone</td></tr>
          </tbody>
        </table>
        <div className="row" style={{ marginTop: 10 }}>
          {(["clique", "duplo", "longo"] as RingEvent[]).map((e) => (
            <button key={e} className="btn small ghost" onClick={() => runRingAction(e)}>Testar: {RING_LABELS[e].toLowerCase()}</button>
          ))}
        </div>
        <h3 style={{ marginTop: 12 }}>Últimos comandos recebidos</h3>
        {s.ringLog.length === 0 ? (
          <p className="small muted">Nada recebido ainda.</p>
        ) : (
          <ul className="small ring-log">
            {s.ringLog.slice(0, 6).map((l) => (
              <li key={l.at}>{new Date(l.at).toLocaleTimeString("pt-BR")} · <strong>{RING_LABELS[l.event]}</strong> — {l.result}</li>
            ))}
          </ul>
        )}
        {!speechRecognitionSupported && <p className="small muted">Este navegador/app não tem ditado por voz: o clique avisa e não liga o microfone.</p>}
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
