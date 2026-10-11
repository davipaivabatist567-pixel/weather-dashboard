import { useCallback, useEffect, useRef, useState } from "react";
import type { KnowledgeDoc, KnowledgeMeta, MemoryCategory, MemoryItem } from "../../shared/types";
import type { SearchHit } from "../../server/knowledge/search";
import { Toggle } from "../components/Shell";
import { refreshStatus, reportLearning } from "../lib/actions";
import { api } from "../lib/api";
import { DATA_LOCATION, HOW_TO_CONNECT } from "../lib/env";
import { ACCEPT, readAttachment } from "../lib/files";
import { useOrion } from "../store";

const CATEGORIES: MemoryCategory[] = ["geral", "aprendizado", "projeto", "preferencia", "meta", "configuracao"];
const SOURCE_LABEL: Record<KnowledgeMeta["source"], string> = { arquivo: "arquivo", texto: "texto", conversa: "conversa" };
const fmtChars = (n: number) => (n >= 1000 ? `${(n / 1000).toFixed(1)} mil caracteres` : `${n} caracteres`);

/** Uso aproximado do localStorage na versão HTML (o limite típico é ~5 MB). */
function browserUsage(): number | null {
  if (api.kind !== "navegador") return null;
  try {
    return (localStorage.getItem("orion.db")?.length ?? 0) * 2;
  } catch {
    return null;
  }
}

export function MemoryPage() {
  const s = useOrion();
  const [items, setItems] = useState<MemoryItem[]>([]);
  const [docs, setDocs] = useState<KnowledgeMeta[]>([]);
  const [enabled, setEnabled] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [content, setContent] = useState("");
  const [category, setCategory] = useState<MemoryCategory>("geral");
  const [editing, setEditing] = useState<string | null>(null);
  const [editText, setEditText] = useState("");
  const [teachTitle, setTeachTitle] = useState("");
  const [teachText, setTeachText] = useState("");
  const [busy, setBusy] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [hits, setHits] = useState<SearchHit[] | null>(null);
  const [open, setOpen] = useState<KnowledgeDoc | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const learning = s.server?.learningEnabled ?? true;
  const aiOn = !!s.server?.ai.configured;

  const load = useCallback(async () => {
    try {
      const [r, k] = await Promise.all([api.memory.list(), api.knowledge.list()]);
      setItems(r.items);
      setEnabled(r.enabled);
      setDocs(k);
      setError(null);
    } catch (err) {
      setError((err as Error).message);
    }
  }, []);
  useEffect(() => {
    void load();
    const h = () => void load();
    window.addEventListener("orion:data-changed", h);
    return () => window.removeEventListener("orion:data-changed", h);
  }, [load]);

  const run = async (fn: () => Promise<unknown>, ok?: string) => {
    try {
      await fn();
      if (ok) s.toast(ok, "ok");
      await load();
      void refreshStatus();
    } catch (err) {
      s.toast((err as Error).message, "erro");
    }
  };

  const teachFiles = async (list: FileList | null) => {
    if (!list?.length) return;
    setBusy("Lendo arquivos…");
    try {
      const attachments = [];
      for (const f of Array.from(list).slice(0, 5)) {
        try {
          attachments.push(await readAttachment(f));
        } catch (err) {
          s.toast((err as Error).message, "erro");
        }
      }
      if (attachments.length) {
        setBusy(aiOn ? "O Orion está estudando os arquivos…" : "Guardando arquivos…");
        const r = await api.learning.files(attachments, true);
        reportLearning([], r.knowledge, r.skipped);
        if (r.knowledge.length) s.toast(`${r.knowledge.length} arquivo(s) aprendido(s).`, "ok");
        if (r.skipped.length) s.toast(`Não aprendi: ${r.skipped.join("; ")}`, "erro");
      }
      await load();
      void refreshStatus();
    } catch (err) {
      s.toast((err as Error).message, "erro");
    } finally {
      setBusy(null);
      if (fileRef.current) fileRef.current.value = "";
    }
  };

  const learnHistory = async () => {
    const turns = s.messages
      .filter((m) => (m.role === "user" || m.role === "assistant") && !m.local && !m.error && m.content.trim())
      .map((m) => ({ role: m.role as "user" | "assistant", content: m.role === "assistant" ? m.content.slice(0, 3000) : m.content }));
    if (!turns.length) return s.toast("Não há conversa no histórico para aprender.");
    let learnedCount = 0;
    try {
      for (let i = 0; i < turns.length; i += 40) {
        setBusy(`Estudando a conversa… (${Math.min(i + 40, turns.length)}/${turns.length} mensagens)`);
        const r = await api.learning.conversation(turns.slice(i, i + 40), true);
        learnedCount += r.learned.length;
        reportLearning(r.learned, [], r.skipped);
      }
      s.toast(learnedCount ? `Aprendi ${learnedCount} coisa(s) nova(s) com o histórico.` : "Nada novo para aprender no histórico.", "ok");
      await load();
    } catch (err) {
      s.toast((err as Error).message, "erro");
    } finally {
      setBusy(null);
    }
  };

  const usage = browserUsage();
  const autoItems = items.filter((m) => m.origin === "automatico").length;

  return (
    <div className="grid">
      {error && <div className="notice err">{error}</div>}
      <div className="panel">
        <h2>Aprendizado</h2>
        <p className="small muted">
          O Orion aprende guardando o que você ensina e consultando isso a cada pergunta. O modelo de IA em si não é alterado; o
          conhecimento fica {DATA_LOCATION} e você controla tudo aqui.
        </p>
        <div className="grid-2">
          <div>
            <Toggle label="Memória persistente" hint="Desativada: nada é salvo, consultado ou aprendido" checked={enabled} onChange={(v) => void run(() => api.memory.setEnabled(v), v ? "Memória ativada." : "Memória desativada.")} />
            <Toggle
              label="Aprender automaticamente"
              hint={aiOn ? "Depois de cada resposta, guarda o que você ensinou e os arquivos enviados (uma chamada extra e curta à IA)" : "Sem IA: guarda apenas os arquivos de texto enviados no chat"}
              checked={learning}
              disabled={!enabled}
              onChange={(v) => void run(() => api.learning.setEnabled(v), v ? "Aprendizado automático ativado." : "Aprendizado automático desativado.")}
            />
            {!s.settings.permissions.writeMemory && <div className="notice small">A permissão “Salvar memórias” está desligada em Configurações → Permissões; o aprendizado automático fica pausado.</div>}
          </div>
          <div className="metrics">
            <div className="metric"><span>Memórias</span><b>{items.length}</b></div>
            <div className="metric"><span>Aprendidas sozinho</span><b>{autoItems}</b></div>
            <div className="metric"><span>Documentos</span><b>{docs.length}</b></div>
            <div className="metric"><span>Conhecimento</span><b>{fmtChars(docs.reduce((a, d) => a + d.chars, 0))}</b></div>
            {usage !== null && <div className="metric"><span>Espaço usado</span><b>{(usage / 1024 / 1024).toFixed(2)} MB / ~5 MB</b></div>}
          </div>
        </div>
        <div className="row" style={{ marginTop: 10 }}>
          <button className="btn" disabled={!aiOn || !enabled || !!busy || !s.messages.length} onClick={() => void learnHistory()} title={aiOn ? "" : HOW_TO_CONNECT}>
            🧠 Aprender com o histórico da conversa
          </button>
          {!aiOn && <span className="small muted">Requer a IA conectada: {HOW_TO_CONNECT}.</span>}
        </div>
        {busy && <div className="notice ok" style={{ marginTop: 10 }}>{busy}</div>}
      </div>

      <div className="grid-2">
        <div className="panel">
          <h2>Ensinar o Orion</h2>
          <label className="field">Título<input className="input" placeholder="ex.: Matéria de história, Regras do meu jogo" value={teachTitle} onChange={(e) => setTeachTitle(e.target.value)} disabled={!enabled} /></label>
          <label className="field" style={{ marginTop: 8 }}>
            Conteúdo
            <textarea className="input" rows={6} placeholder="Cole aqui anotações, textos, instruções, informações de projetos…" value={teachText} onChange={(e) => setTeachText(e.target.value)} disabled={!enabled} />
          </label>
          <div className="row" style={{ marginTop: 8 }}>
            <button className="btn primary" disabled={!enabled || !teachText.trim() || !!busy} onClick={() => void run(async () => { const d = await api.knowledge.add(teachTitle, teachText); setTeachTitle(""); setTeachText(""); if (d.redacted) s.toast(`${d.redacted} dado(s) sensível(is) removido(s) antes de guardar.`); }, "Conteúdo aprendido.")}>
              📚 Ensinar
            </button>
            <input ref={fileRef} type="file" accept={ACCEPT} multiple hidden onChange={(e) => void teachFiles(e.target.files)} />
            <button className="btn" disabled={!enabled || !!busy} onClick={() => fileRef.current?.click()}>Ensinar com arquivos</button>
          </div>
          <p className="small muted">Texto e código são guardados direto. Imagens e PDFs são lidos pela IA (quando conectada) e transcritos para a base.</p>
          <hr className="sep" />
          <h2>Testar a busca</h2>
          <div className="row">
            <input className="input" style={{ flex: 1, minWidth: 160 }} placeholder="O que o Orion sabe sobre…" value={query} onChange={(e) => setQuery(e.target.value)} onKeyDown={(e) => e.key === "Enter" && query.trim() && void api.knowledge.search(query).then(setHits)} />
            <button className="btn" disabled={!query.trim()} onClick={() => void api.knowledge.search(query).then(setHits)}>Buscar</button>
          </div>
          {hits && (
            <div style={{ marginTop: 8 }}>
              {hits.length === 0 && <p className="small muted">Nenhum trecho relevante encontrado.</p>}
              {hits.map((h, i) => (
                <div key={i} className="task" style={{ display: "block" }}>
                  <div className="small"><b>{h.title}</b> <span className="muted mono">· relevância {h.score.toFixed(1)}</span></div>
                  <div className="small muted" style={{ whiteSpace: "pre-wrap" }}>{h.text.slice(0, 300)}{h.text.length > 300 ? "…" : ""}</div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="panel">
          <h2>Base de conhecimento</h2>
          {docs.length === 0 && <p className="small muted">Nada ensinado ainda. Cole um texto, envie arquivos ou anexe arquivos no chat.</p>}
          {docs.map((d) => (
            <div key={d.id} className="task" style={{ alignItems: "flex-start" }}>
              <span>
                <b>{d.title}</b>
                <div className="small muted">{SOURCE_LABEL[d.source]} · {fmtChars(d.chars)} · {new Date(d.createdAt).toLocaleDateString("pt-BR")}</div>
                {open?.id === d.id ? (
                  <div className="small" style={{ whiteSpace: "pre-wrap", maxHeight: 260, overflowY: "auto", marginTop: 6 }}>{open.content}</div>
                ) : (
                  <div className="small muted">{d.preview}{d.chars > d.preview.length ? "…" : ""}</div>
                )}
              </span>
              <button className="btn small ghost" onClick={() => (open?.id === d.id ? setOpen(null) : void api.knowledge.get(d.id).then(setOpen))}>{open?.id === d.id ? "Fechar" : "Ver"}</button>
              <button className="btn small ghost" aria-label={`Excluir ${d.title}`} onClick={() => void run(() => api.knowledge.remove(d.id), "Documento excluído.")}>✕</button>
            </div>
          ))}
          {docs.length > 0 && <button className="btn danger small" style={{ marginTop: 12 }} onClick={() => confirm("Apagar TODA a base de conhecimento?") && void run(() => api.knowledge.clear(), "Base de conhecimento apagada.")}>Apagar todo o conhecimento</button>}
        </div>
      </div>

      <div className="grid-2">
        <div className="panel">
          <h2>Memórias</h2>
          <p className="small muted">Fatos curtos sobre você e seus projetos. Senhas, chaves e números de cartão são recusados automaticamente.</p>
          <div className="row">
            <input className="input" style={{ flex: 1, minWidth: 180 }} placeholder="Algo para o Orion lembrar" value={content} onChange={(e) => setContent(e.target.value)} disabled={!enabled} />
            <select className="input" style={{ width: 150 }} value={category} onChange={(e) => setCategory(e.target.value as MemoryCategory)} disabled={!enabled} aria-label="Categoria">
              {CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
            </select>
            <button className="btn primary" disabled={!enabled || !content.trim()} onClick={() => void run(async () => { await api.memory.add(content, category); setContent(""); }, "Memória salva.")}>Salvar</button>
          </div>
          <div style={{ marginTop: 12 }}>
            {items.length === 0 && <p className="small muted">Nenhuma memória armazenada.</p>}
            {items.map((m) => (
              <div key={m.id} className="task">
                {editing === m.id ? (
                  <>
                    <input className="input" style={{ flex: 1 }} value={editText} onChange={(e) => setEditText(e.target.value)} />
                    <button className="btn small primary" onClick={() => void run(async () => { await api.memory.update(m.id, { content: editText }); setEditing(null); }, "Memória atualizada.")}>Salvar</button>
                    <button className="btn small" onClick={() => setEditing(null)}>Cancelar</button>
                  </>
                ) : (
                  <>
                    <span>
                      {m.origin === "automatico" && <span title="Aprendido automaticamente">🧠 </span>}
                      {m.content} <span className="small muted">· {m.category} · {new Date(m.updatedAt).toLocaleDateString("pt-BR")}</span>
                    </span>
                    <button className="btn small ghost" onClick={() => { setEditing(m.id); setEditText(m.content); }}>Editar</button>
                    <button className="btn small ghost" aria-label="Excluir memória" onClick={() => void run(() => api.memory.remove(m.id), "Memória excluída.")}>✕</button>
                  </>
                )}
              </div>
            ))}
          </div>
          {items.length > 0 && (
            <button className="btn danger small" style={{ marginTop: 12 }} onClick={() => confirm("Apagar TODAS as memórias?") && void run(() => api.memory.clear(), "Memórias apagadas.")}>Apagar todas as memórias</button>
          )}
        </div>
        <div className="panel">
          <h2>Histórico de conversa</h2>
          <p className="small muted">
            O histórico é diferente da memória: fica apenas neste navegador e serve para continuar a conversa atual. Anexos nunca são salvos nele.
          </p>
          <Toggle label="Salvar histórico neste navegador" checked={s.settings.privacy.saveChatHistory} onChange={(v) => s.updateSettings((x) => ({ ...x, privacy: { ...x.privacy, saveChatHistory: v } }))} />
          <p className="small">{s.messages.length} mensagem(ns) no histórico atual.</p>
          <button className="btn danger small" disabled={!s.messages.length} onClick={() => confirm("Limpar o histórico da conversa?") && (s.clearMessages(), s.toast("Histórico limpo.", "ok"))}>Limpar histórico</button>
          <hr className="sep" />
          <h2>Histórico de gestos</h2>
          <p className="small">{s.gestureLog.length} gesto(s) registrados nesta sessão (não são salvos).</p>
          <button className="btn small" disabled={!s.gestureLog.length} onClick={() => s.set({ gestureLog: [] })}>Limpar</button>
        </div>
      </div>
    </div>
  );
}
