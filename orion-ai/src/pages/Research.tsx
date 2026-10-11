import { useMemo, useRef, useState } from "react";
import { HOW_TO_CONNECT } from "../lib/env";
import { evaluateExpression, formatNumber } from "../../shared/math";
import type { ChatAttachment } from "../../shared/types";
import { Markdown } from "../components/Markdown";
import { sendMessage } from "../lib/actions";
import { summarize, type DatasetSummary } from "../lib/dataAnalysis";
import { ACCEPT, readAttachment } from "../lib/files";
import { useOrion } from "../store";

function ResultView({ id }: { id: string | null }) {
  const msg = useOrion((s) => s.messages.find((m) => m.id === id));
  if (!id || !msg) return null;
  return (
    <div className="panel" style={{ marginTop: 12, background: "rgba(0,14,26,0.7)" }}>
      {msg.tools?.map((t) => <div key={t.id} className={`tool-line ${t.ok ? "ok" : ""}`}>{t.ok === undefined ? "⟳" : "✓"} {t.label} {t.summary && `— ${t.summary}`}</div>)}
      {msg.content ? <Markdown text={msg.content} /> : msg.streaming ? <span className="typing"><i /><i /><i /></span> : null}
      {msg.sources?.length ? (
        <div className="sources"><b>Fontes:</b><ol>{msg.sources.map((s) => <li key={s.url}><a href={s.url} target="_blank" rel="noopener noreferrer">{s.title || s.url}</a></li>)}</ol></div>
      ) : !msg.streaming && msg.content && !msg.local ? (
        <p className="small muted">Nenhuma fonte da internet foi consultada nesta resposta.</p>
      ) : null}
      {msg.error && <div className="notice err">{msg.error}</div>}
    </div>
  );
}

export function ResearchPage() {
  const s = useOrion();
  const ai = s.server?.ai;
  const [query, setQuery] = useState("");
  const [researchId, setResearchId] = useState<string | null>(null);
  const [files, setFiles] = useState<ChatAttachment[]>([]);
  const [instr, setInstr] = useState("Resuma o conteúdo, destaque pontos importantes e possíveis problemas.");
  const [fileId, setFileId] = useState<string | null>(null);
  const [data, setData] = useState<{ name: string; summary: DatasetSummary } | null>(null);
  const [expr, setExpr] = useState("");
  const fileRef = useRef<HTMLInputElement>(null);
  const calc = useMemo(() => {
    if (!expr.trim()) return null;
    try {
      return { ok: true, v: formatNumber(evaluateExpression(expr)) };
    } catch (err) {
      return { ok: false, v: (err as Error).message };
    }
  }, [expr]);

  const research = async () => {
    if (!query.trim()) return;
    const id = await sendMessage(query, { mode: "pesquisa", noCommands: true });
    setResearchId(id);
  };

  return (
    <div className="grid">
      <div className="panel">
        <h2>Pesquisa na internet</h2>
        {!ai?.configured ? (
          <div className="notice">A pesquisa precisa de um modelo de IA conectado: {HOW_TO_CONNECT}.</div>
        ) : !ai.webSearch ? (
          <div className="notice">A ferramenta de pesquisa na internet está desativada na configuração da IA. As respostas virão apenas do conhecimento do modelo.</div>
        ) : !s.settings.permissions.webSearch ? (
          <div className="notice">Você desativou a permissão de pesquisa na internet em Configurações → Permissões.</div>
        ) : (
          <p className="small muted">Pesquisa real via ferramenta web_search do provedor; as fontes consultadas aparecem abaixo da resposta.</p>
        )}
        <div className="row">
          <input className="input" style={{ flex: 1, minWidth: 200 }} placeholder="O que você quer investigar?" value={query} onChange={(e) => setQuery(e.target.value)} onKeyDown={(e) => e.key === "Enter" && void research()} />
          <button className="btn primary" disabled={!query.trim() || !ai?.configured || s.chatBusy} onClick={() => void research()}>Pesquisar</button>
        </div>
        <ResultView id={researchId} />
      </div>

      <div className="grid-2">
        <div className="panel">
          <h2>Análise de arquivos e imagens</h2>
          <p className="small muted">Imagens, PDFs e arquivos de texto/código são enviados ao modelo de IA somente quando você clicar em “Analisar”.</p>
          <input ref={fileRef} type="file" accept={ACCEPT} multiple hidden onChange={async (e) => {
            for (const f of Array.from(e.target.files ?? []).slice(0, 5)) {
              try { const a = await readAttachment(f); setFiles((p) => [...p, a]); } catch (err) { s.toast((err as Error).message, "erro"); }
            }
            e.target.value = "";
          }} />
          <div className="row"><button className="btn" onClick={() => fileRef.current?.click()}>Escolher arquivos</button>{files.length > 0 && <button className="btn ghost small" onClick={() => setFiles([])}>Limpar</button>}</div>
          <div className="attach-list" style={{ marginTop: 8 }}>{files.map((f, i) => <span key={i} className="attach">📎 {f.name}</span>)}</div>
          <label className="field">Instrução<textarea className="input" rows={2} value={instr} onChange={(e) => setInstr(e.target.value)} /></label>
          <button className="btn primary" style={{ marginTop: 8 }} disabled={!files.length || !ai?.configured || s.chatBusy} onClick={async () => setFileId(await sendMessage(instr, { attachments: files, noCommands: true }))}>
            {ai?.configured ? "Analisar com a IA" : "Requer modelo de IA"}
          </button>
          <ResultView id={fileId} />
        </div>

        <div className="stack">
          <div className="panel">
            <h2>Análise de dados (local)</h2>
            <p className="small muted">Estatísticas calculadas no navegador para arquivos CSV/TSV — nada é enviado.</p>
            <input type="file" accept=".csv,.tsv,.txt" className="input" onChange={async (e) => {
              const f = e.target.files?.[0];
              if (!f) return;
              if (f.size > 20 * 1024 * 1024) return s.toast("Arquivo maior que 20 MB.", "erro");
              setData({ name: f.name, summary: summarize(await f.text()) });
            }} />
            {data && (
              <div style={{ marginTop: 10 }}>
                <div className="small">{data.name}: <b>{data.summary.rows}</b> linhas · <b>{data.summary.columns.length}</b> colunas · separador “{data.summary.delimiter === "\t" ? "TAB" : data.summary.delimiter}”</div>
                <div className="md" style={{ overflowX: "auto" }}>
                  <table>
                    <thead><tr><th>Coluna</th><th>Tipo</th><th>Preenchidos</th><th>Únicos</th><th>Mín</th><th>Máx</th><th>Média</th><th>Mediana</th><th>Mais frequentes</th></tr></thead>
                    <tbody>
                      {data.summary.columns.map((c) => (
                        <tr key={c.name}>
                          <td>{c.name}</td><td>{c.type}</td><td>{c.filled}/{c.filled + c.empty}</td><td>{c.unique}</td>
                          <td>{c.min !== undefined ? formatNumber(c.min) : "—"}</td><td>{c.max !== undefined ? formatNumber(c.max) : "—"}</td>
                          <td>{c.mean !== undefined ? formatNumber(c.mean) : "—"}</td><td>{c.median !== undefined ? formatNumber(c.median) : "—"}</td>
                          <td>{c.top?.map((t) => `${t.value} (${t.count})`).join(", ") ?? "—"}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
          <div className="panel">
            <h2>Calculadora</h2>
            <input className="input mono" placeholder="ex.: (2^10 + sqrt(144)) / 3" value={expr} onChange={(e) => setExpr(e.target.value)} aria-label="Expressão" />
            {calc && <div className="mono" style={{ marginTop: 8, color: calc.ok ? "var(--ok)" : "var(--danger)" }}>{calc.ok ? `= ${calc.v}` : calc.v}</div>}
          </div>
        </div>
      </div>
    </div>
  );
}
