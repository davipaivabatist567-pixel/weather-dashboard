// Painel de conversa: histórico, texto, voz, anexos, interrupção e limpeza.
import { useEffect, useRef, useState } from "react";
import { MODES } from "../../shared/types";
import type { ChatAttachment } from "../../shared/types";
import { abortChat, resolvePending, sendMessage } from "../lib/actions";
import { ACCEPT, readAttachment } from "../lib/files";
import { listenOnce, speak, speechRecognitionSupported, stopListening, stopSpeaking } from "../lib/voice";
import { useOrion, type ChatMessage } from "../store";
import { Markdown } from "./Markdown";

const time = (iso: string) => new Date(iso).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });

function Message({ m }: { m: ChatMessage }) {
  const speaking = useOrion((s) => s.speaking);
  if (m.role === "system") return <div className="msg system">{m.content}</div>;
  return (
    <div className={`msg ${m.role}`}>
      <div className="msg-meta">
        <span className="who">{m.role === "user" ? "VOCÊ" : "ORION"}</span>
        <span>{time(m.at)}</span>
        {m.mode && m.role === "assistant" && !m.local && <span>· modo {m.mode}</span>}
      </div>
      {m.attachments?.length ? (
        <div className="attach-list">{m.attachments.map((a) => <span className="attach" key={a.name}>📎 {a.name}</span>)}</div>
      ) : null}
      {m.tools?.map((t) => (
        <div key={t.id} className={`tool-line ${t.ok === undefined ? "" : t.ok ? "ok" : "fail"}`}>
          <span>{t.ok === undefined ? "⟳" : t.ok ? "✓" : "✕"}</span>
          <span>{t.label}</span>
          <span className={`risk ${t.risk}`}>{t.risk === "baixo" ? "baixo risco" : t.risk === "autorizacao" ? "autorizado" : "requer confirmação"}</span>
          {t.summary && <span style={{ color: "var(--text)" }}>— {t.summary}</span>}
        </div>
      ))}
      {m.role === "assistant" && m.content ? <Markdown text={m.content} /> : m.role === "user" ? <div style={{ whiteSpace: "pre-wrap" }}>{m.content}</div> : null}
      {m.streaming && !m.content && <span className="typing" aria-label="Processando"><i /><i /><i /></span>}
      {m.pending?.map((p) => (
        <div key={p.id} className="pending-box">
          <b>Confirmação necessária:</b> {p.description}
          {p.state === "aguardando" ? (
            <div className="row" style={{ marginTop: 8 }}>
              <button className="btn danger small" onClick={() => void resolvePending(m.id, p.id, true)}>Confirmar</button>
              <button className="btn small" onClick={() => void resolvePending(m.id, p.id, false)}>Cancelar</button>
            </div>
          ) : (
            <div className="small" style={{ marginTop: 6 }}>
              {p.state === "confirmada" ? `✓ ${p.result}` : p.state === "cancelada" ? "Cancelada — nada foi alterado." : `Erro: ${p.result}`}
            </div>
          )}
        </div>
      ))}
      {m.sources?.length ? (
        <div className="sources">
          <b>Fontes consultadas na internet:</b>
          <ol>{m.sources.slice(0, 10).map((s) => <li key={s.url}><a href={s.url} target="_blank" rel="noopener noreferrer">{s.title || s.url}</a></li>)}</ol>
        </div>
      ) : null}
      {m.error && <div className="notice err" style={{ marginTop: 8 }}>{m.error}</div>}
      {m.role === "assistant" && m.content && !m.streaming && (
        <div className="msg-actions">
          <button className="btn small ghost" onClick={() => (speaking ? stopSpeaking() : speak(m.content))}>{speaking ? "■ Parar fala" : "🔊 Ouvir"}</button>
          <button className="btn small ghost" onClick={() => void navigator.clipboard.writeText(m.content)}>Copiar</button>
        </div>
      )}
    </div>
  );
}

export function ChatPanel() {
  const messages = useOrion((s) => s.messages);
  const busy = useOrion((s) => s.chatBusy);
  const mode = useOrion((s) => s.mode);
  const setMode = useOrion((s) => s.setMode);
  const mic = useOrion((s) => s.mic);
  const micError = useOrion((s) => s.micError);
  const interim = useOrion((s) => s.interim);
  const speaking = useOrion((s) => s.speaking);
  const aiConfigured = useOrion((s) => s.server?.ai.configured);
  const serverError = useOrion((s) => s.serverError);
  const clearMessages = useOrion((s) => s.clearMessages);
  const toast = useOrion((s) => s.toast);
  const [text, setText] = useState("");
  const [files, setFiles] = useState<ChatAttachment[]>([]);
  const listRef = useRef<HTMLDivElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    listRef.current?.scrollTo({ top: listRef.current.scrollHeight });
  }, [messages]);

  const submit = async () => {
    if (busy || (!text.trim() && !files.length)) return;
    const t = text;
    const f = files;
    setText("");
    setFiles([]);
    await sendMessage(t, { attachments: f.length ? f : undefined });
  };

  const onFiles = async (list: FileList | null) => {
    if (!list) return;
    for (const file of Array.from(list).slice(0, 5 - files.length)) {
      try {
        const a = await readAttachment(file);
        setFiles((prev) => [...prev, a]);
      } catch (err) {
        toast((err as Error).message, "erro");
      }
    }
    if (fileRef.current) fileRef.current.value = "";
  };

  const toggleMic = () => {
    if (mic === "escutando") stopListening();
    else listenOnce((t) => void sendMessage(t, { viaVoice: true }));
  };

  return (
    <div className="panel chat">
      <div className="chat-head">
        <div className="modes" role="group" aria-label="Modo inteligente">
          {MODES.map((m) => (
            <button key={m.id} className={`mode-btn ${mode === m.id ? "active" : ""}`} title={m.description} onClick={() => setMode(m.id)} aria-pressed={mode === m.id}>
              {m.label}
            </button>
          ))}
        </div>
        <span style={{ flex: 1 }} />
        <button
          className="btn small danger"
          disabled={!messages.length || busy}
          onClick={() => {
            if (confirm("Limpar todo o histórico desta conversa?")) clearMessages();
          }}
        >
          Limpar histórico
        </button>
      </div>
      {serverError ? (
        <div className="notice err">{serverError}</div>
      ) : aiConfigured === false ? (
        <div className="notice">
          <b>Modo local limitado:</b> nenhum modelo de IA está conectado. Cálculos, comandos, memória e projetos funcionam; para conversar, configure <span className="mono">ANTHROPIC_API_KEY</span> no servidor.
        </div>
      ) : null}
      <div className="messages" ref={listRef} aria-live="polite">
        {messages.length === 0 && (
          <div className="empty">
            <p>Comece uma conversa por texto ou voz.</p>
            <p className="small">Exemplos: “Orion, me ajude a criar um jogo”, “Explique fotossíntese de forma simples”, “Ative o modo scanner”.</p>
          </div>
        )}
        {messages.map((m) => <Message key={m.id} m={m} />)}
      </div>
      <div className="interim">{mic === "escutando" ? interim || "Escutando…" : micError ?? ""}</div>
      {files.length > 0 && (
        <div className="attach-list">
          {files.map((f, i) => (
            <span className="attach" key={i}>
              📎 {f.name} <button className="btn small ghost" aria-label={`Remover ${f.name}`} onClick={() => setFiles(files.filter((_, j) => j !== i))}>✕</button>
            </span>
          ))}
        </div>
      )}
      <div className="composer">
        <input ref={fileRef} type="file" accept={ACCEPT} multiple hidden onChange={(e) => void onFiles(e.target.files)} />
        <button className="btn icon" title="Anexar arquivo para análise" aria-label="Anexar arquivo" onClick={() => fileRef.current?.click()} disabled={busy}>📎</button>
        <textarea
          className="input"
          rows={1}
          placeholder={busy ? "Orion está respondendo…" : "Digite uma mensagem (Enter envia, Shift+Enter quebra linha)"}
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              void submit();
            }
          }}
          aria-label="Mensagem"
        />
        <button
          className={`btn icon ${mic === "escutando" ? "recording" : ""}`}
          onClick={toggleMic}
          disabled={!speechRecognitionSupported || busy}
          title={speechRecognitionSupported ? "Falar com o Orion" : "Reconhecimento de fala não suportado neste navegador"}
          aria-label="Microfone"
        >
          🎙
        </button>
        {speaking && <button className="btn icon" onClick={stopSpeaking} title="Parar fala" aria-label="Parar fala">🔇</button>}
        {busy ? (
          <button className="btn danger" onClick={abortChat}>■ Interromper</button>
        ) : (
          <button className="btn primary" onClick={() => void submit()} disabled={!text.trim() && !files.length}>Enviar</button>
        )}
      </div>
      {!speechRecognitionSupported && <div className="small muted" style={{ marginTop: 6 }}>Voz indisponível neste navegador — use o texto (o reconhecimento de fala funciona no Chrome e no Edge).</div>}
    </div>
  );
}
