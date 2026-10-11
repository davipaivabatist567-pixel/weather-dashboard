import { useCallback, useEffect, useState } from "react";
import { DATA_LOCATION } from "../lib/env";
import type { MemoryItem } from "../../shared/types";
import { Toggle } from "../components/Shell";
import { refreshStatus } from "../lib/actions";
import { api } from "../lib/api";
import { useOrion } from "../store";

const CATEGORIES: MemoryItem["category"][] = ["geral", "projeto", "preferencia", "meta", "configuracao"];

export function MemoryPage() {
  const s = useOrion();
  const [items, setItems] = useState<MemoryItem[]>([]);
  const [enabled, setEnabled] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [content, setContent] = useState("");
  const [category, setCategory] = useState<MemoryItem["category"]>("geral");
  const [editing, setEditing] = useState<string | null>(null);
  const [editText, setEditText] = useState("");

  const load = useCallback(async () => {
    try {
      const r = await api.memory.list();
      setItems(r.items);
      setEnabled(r.enabled);
      setError(null);
    } catch (err) {
      setError((err as Error).message);
    }
  }, []);
  useEffect(() => {
    void load();
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
  const chatCount = s.messages.length;

  return (
    <div className="grid">
      {error && <div className="notice err">{error}</div>}
      <div className="grid-2">
        <div className="panel">
          <h2>Memória persistente</h2>
          <p className="small muted">
            Informações que você autorizou o Orion a guardar {DATA_LOCATION} (projetos, preferências, metas). São incluídas no contexto da IA quando a leitura está permitida.
            Senhas, chaves e números de cartão são recusados automaticamente.
          </p>
          <Toggle label="Memória persistente ativada" hint="Desativada: nada é salvo nem enviado à IA" checked={enabled} onChange={(v) => void run(() => api.memory.setEnabled(v), v ? "Memória ativada." : "Memória desativada.")} />
          <div className="row" style={{ marginTop: 10 }}>
            <input className="input" style={{ flex: 1, minWidth: 180 }} placeholder="Algo para o Orion lembrar" value={content} onChange={(e) => setContent(e.target.value)} disabled={!enabled} />
            <select className="input" style={{ width: 150 }} value={category} onChange={(e) => setCategory(e.target.value as MemoryItem["category"])} disabled={!enabled} aria-label="Categoria">
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
                    <span>{m.content} <span className="small muted">· {m.category} · {new Date(m.updatedAt).toLocaleDateString("pt-BR")}</span></span>
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
            O histórico é diferente da memória: fica apenas neste navegador e serve para continuar a conversa atual. Anexos nunca são salvos.
          </p>
          <Toggle label="Salvar histórico neste navegador" checked={s.settings.privacy.saveChatHistory} onChange={(v) => s.updateSettings((x) => ({ ...x, privacy: { ...x.privacy, saveChatHistory: v } }))} />
          <p className="small">{chatCount} mensagem(ns) no histórico atual.</p>
          <button className="btn danger small" disabled={!chatCount} onClick={() => confirm("Limpar o histórico da conversa?") && (s.clearMessages(), s.toast("Histórico limpo.", "ok"))}>Limpar histórico</button>
          <hr className="sep" />
          <h2>Histórico de gestos</h2>
          <p className="small">{s.gestureLog.length} gesto(s) registrados nesta sessão (não são salvos).</p>
          <button className="btn small" disabled={!s.gestureLog.length} onClick={() => s.set({ gestureLog: [] })}>Limpar</button>
        </div>
      </div>
    </div>
  );
}
