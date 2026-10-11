import { useCallback, useEffect, useState } from "react";
import type { Project, ProjectStatus, Reminder, Task } from "../../shared/types";
import { api } from "../lib/api";
import { useOrion } from "../store";

const STATUS: { id: ProjectStatus; label: string }[] = [
  { id: "planejado", label: "Planejado" },
  { id: "em_andamento", label: "Em andamento" },
  { id: "pausado", label: "Pausado" },
  { id: "concluido", label: "Concluído" },
];

function useData() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [reminders, setReminders] = useState<Reminder[]>([]);
  const [error, setError] = useState<string | null>(null);
  const load = useCallback(async () => {
    try {
      const [p, t, r] = await Promise.all([api.projects.list(), api.tasks.list(), api.reminders.list()]);
      setProjects(p);
      setTasks(t);
      setReminders(r);
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
  return { projects, tasks, reminders, error, load };
}

function ProjectEditor({ project, onSaved, onDeleted }: { project: Project; onSaved: () => void; onDeleted: () => void }) {
  const toast = useOrion((s) => s.toast);
  const aiConfigured = useOrion((s) => s.server?.ai.configured);
  const [draft, setDraft] = useState(project);
  const [newStep, setNewStep] = useState("");
  const [newFile, setNewFile] = useState("");
  const [plan, setPlan] = useState<{ etapas: string[]; proximo_passo: string; riscos: string[] } | null>(null);
  const [planning, setPlanning] = useState(false);
  useEffect(() => {
    setDraft(project);
    setPlan(null);
  }, [project]);

  const save = async (p: Partial<Project> = draft) => {
    try {
      await api.projects.update(project.id, p);
      onSaved();
    } catch (err) {
      toast((err as Error).message, "erro");
    }
  };
  const setSteps = (steps: Project["steps"]) => {
    setDraft({ ...draft, steps });
    void save({ steps });
  };
  const askPlan = async () => {
    setPlanning(true);
    try {
      setPlan(await api.projects.plan(project.id));
    } catch (err) {
      toast((err as Error).message, "erro");
    } finally {
      setPlanning(false);
    }
  };
  const acceptPlan = async () => {
    if (!plan) return;
    const steps = [...draft.steps, ...plan.etapas.map((title) => ({ id: "", title, done: false }))];
    await save({ steps });
    setPlan(null);
    toast("Etapas adicionadas ao projeto.", "ok");
  };
  const done = draft.steps.filter((s) => s.done).length;

  return (
    <div className="panel stack">
      <h2>Projeto</h2>
      <label className="field">Nome<input className="input" value={draft.name} onChange={(e) => setDraft({ ...draft, name: e.target.value })} onBlur={() => void save()} /></label>
      <label className="field">Descrição<textarea className="input" rows={2} value={draft.description} onChange={(e) => setDraft({ ...draft, description: e.target.value })} onBlur={() => void save()} /></label>
      <label className="field">Objetivo<input className="input" value={draft.objective} onChange={(e) => setDraft({ ...draft, objective: e.target.value })} onBlur={() => void save()} /></label>
      <div className="row">
        <label className="field" style={{ flex: 1 }}>Status
          <select className="input" value={draft.status} onChange={(e) => { const status = e.target.value as ProjectStatus; setDraft({ ...draft, status }); void save({ status }); }}>
            {STATUS.map((s) => <option key={s.id} value={s.id}>{s.label}</option>)}
          </select>
        </label>
        <label className="field" style={{ flex: 1 }}>Prazo
          <input className="input" type="date" value={draft.deadline ?? ""} onChange={(e) => { const deadline = e.target.value || null; setDraft({ ...draft, deadline }); void save({ deadline }); }} />
        </label>
      </div>

      <div>
        <h3 className="small muted" style={{ margin: "8px 0" }}>ETAPAS ({done}/{draft.steps.length})</h3>
        {draft.steps.length > 0 && <div className="bar" style={{ marginBottom: 8 }}><i style={{ width: `${(done / draft.steps.length) * 100}%` }} /></div>}
        {draft.steps.map((st, i) => (
          <div key={st.id || i} className={`step ${st.done ? "done" : ""}`}>
            <input type="checkbox" checked={st.done} aria-label={`Concluir ${st.title}`} onChange={() => setSteps(draft.steps.map((x, j) => (j === i ? { ...x, done: !x.done } : x)))} />
            <span>{st.title}</span>
            <button className="btn small ghost" aria-label="Subir" disabled={i === 0} onClick={() => { const s = [...draft.steps]; [s[i - 1], s[i]] = [s[i], s[i - 1]]; setSteps(s); }}>↑</button>
            <button className="btn small ghost" aria-label={`Remover ${st.title}`} onClick={() => setSteps(draft.steps.filter((_, j) => j !== i))}>✕</button>
          </div>
        ))}
        <div className="row" style={{ marginTop: 8 }}>
          <input className="input" style={{ flex: 1 }} placeholder="Nova etapa" value={newStep} onChange={(e) => setNewStep(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter" && newStep.trim()) { setSteps([...draft.steps, { id: "", title: newStep.trim(), done: false }]); setNewStep(""); } }} />
          <button className="btn small" disabled={!newStep.trim()} onClick={() => { setSteps([...draft.steps, { id: "", title: newStep.trim(), done: false }]); setNewStep(""); }}>Adicionar</button>
        </div>
        <div className="row" style={{ marginTop: 8 }}>
          <button className="btn small primary" disabled={!aiConfigured || planning} onClick={() => void askPlan()} title={aiConfigured ? "" : "Requer modelo de IA conectado"}>
            {planning ? "Orion está planejando…" : aiConfigured ? "✦ Orion: dividir em etapas" : "Dividir em etapas (requer IA)"}
          </button>
        </div>
        {plan && (
          <div className="pending-box" style={{ borderColor: "var(--border-strong)", background: "rgba(0,30,50,0.5)" }}>
            <b>Sugestão do Orion</b> (revise antes de adicionar):
            <ol>{plan.etapas.map((e, i) => <li key={i}>{e}</li>)}</ol>
            <div className="small"><b>Próximo passo:</b> {plan.proximo_passo}</div>
            {plan.riscos.length > 0 && <div className="small"><b>Riscos:</b> {plan.riscos.join("; ")}</div>}
            <div className="row" style={{ marginTop: 8 }}>
              <button className="btn small primary" onClick={() => void acceptPlan()}>Adicionar etapas</button>
              <button className="btn small" onClick={() => setPlan(null)}>Descartar</button>
            </div>
          </div>
        )}
      </div>

      <label className="field">Notas<textarea className="input" rows={4} value={draft.notes} onChange={(e) => setDraft({ ...draft, notes: e.target.value })} onBlur={() => void save()} /></label>
      <div>
        <h3 className="small muted" style={{ margin: "8px 0" }}>ARQUIVOS E LINKS RELACIONADOS</h3>
        {draft.files.map((f, i) => (
          <div key={i} className="task">
            <span className="mono small">{/^https?:\/\//.test(f) ? <a href={f} target="_blank" rel="noopener noreferrer">{f}</a> : f}</span>
            <button className="btn small ghost" aria-label="Remover" onClick={() => { const files = draft.files.filter((_, j) => j !== i); setDraft({ ...draft, files }); void save({ files }); }}>✕</button>
          </div>
        ))}
        <div className="row" style={{ marginTop: 6 }}>
          <input className="input" style={{ flex: 1 }} placeholder="Caminho do arquivo ou link" value={newFile} onChange={(e) => setNewFile(e.target.value)} />
          <button className="btn small" disabled={!newFile.trim()} onClick={() => { const files = [...draft.files, newFile.trim()]; setDraft({ ...draft, files }); setNewFile(""); void save({ files }); }}>Adicionar</button>
        </div>
      </div>
      <hr className="sep" />
      <button
        className="btn danger small"
        onClick={async () => {
          if (!confirm(`Excluir o projeto “${project.name}”? Esta ação não pode ser desfeita.`)) return;
          try {
            await api.projects.remove(project.id);
            onDeleted();
          } catch (err) {
            toast((err as Error).message, "erro");
          }
        }}
      >
        Excluir projeto
      </button>
    </div>
  );
}

export function ProjectsPage() {
  const toast = useOrion((s) => s.toast);
  const { projects, tasks, reminders, error, load } = useData();
  const [selected, setSelected] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [taskTitle, setTaskTitle] = useState("");
  const [taskDue, setTaskDue] = useState("");
  const [taskProject, setTaskProject] = useState("");
  const [remText, setRemText] = useState("");
  const [remAt, setRemAt] = useState("");
  const current = projects.find((p) => p.id === selected) ?? null;

  const run = async (fn: () => Promise<unknown>, ok?: string) => {
    try {
      await fn();
      if (ok) toast(ok, "ok");
      await load();
    } catch (err) {
      toast((err as Error).message, "erro");
    }
  };

  const createReminder = async () => {
    if ("Notification" in window && Notification.permission === "default") await Notification.requestPermission();
    await run(async () => {
      await api.reminders.create(remText, new Date(remAt).toISOString());
      setRemText("");
      setRemAt("");
    }, "Lembrete agendado (confirmado pelo servidor).");
  };

  return (
    <div className="grid">
      {error && <div className="notice err">{error}</div>}
      <div className="grid-2" style={{ gridTemplateColumns: "minmax(260px, 1fr) minmax(0, 1.6fr)" }}>
        <div className="stack">
          <div className="panel">
            <h2>Meus projetos</h2>
            <div className="row" style={{ marginBottom: 10 }}>
              <input className="input" style={{ flex: 1 }} placeholder="Nome do novo projeto" value={name} onChange={(e) => setName(e.target.value)} onKeyDown={(e) => e.key === "Enter" && name.trim() && void run(async () => { const p = await api.projects.create({ name }); setName(""); setSelected(p.id); })} />
              <button className="btn primary" disabled={!name.trim()} onClick={() => void run(async () => { const p = await api.projects.create({ name }); setName(""); setSelected(p.id); })}>Criar</button>
            </div>
            {projects.length === 0 && <p className="small muted">Nenhum projeto ainda. Crie um acima ou peça ao Orion no chat.</p>}
            <div className="stack">
              {projects.map((p) => {
                const done = p.steps.filter((s) => s.done).length;
                return (
                  <div key={p.id} className={`panel project-card ${selected === p.id ? "selected" : ""}`} role="button" tabIndex={0} onClick={() => setSelected(p.id)} onKeyDown={(e) => e.key === "Enter" && setSelected(p.id)} style={{ padding: 12 }}>
                    <div className="row" style={{ justifyContent: "space-between" }}>
                      <b>{p.name}</b>
                      <span className={`status ${p.status}`}>{STATUS.find((s) => s.id === p.status)?.label}</span>
                    </div>
                    {p.objective && <div className="small muted">{p.objective}</div>}
                    <div className="small muted">{done}/{p.steps.length} etapas{p.deadline ? ` · prazo ${new Date(p.deadline + "T12:00").toLocaleDateString("pt-BR")}` : ""}</div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
        {current ? (
          <ProjectEditor project={current} onSaved={() => void load()} onDeleted={() => { setSelected(null); void load(); toast("Projeto excluído.", "ok"); }} />
        ) : (
          <div className="panel empty">Selecione um projeto para ver e editar os detalhes.</div>
        )}
      </div>

      <div className="grid-2">
        <div className="panel">
          <h2>Tarefas</h2>
          <div className="row" style={{ marginBottom: 8 }}>
            <input className="input" style={{ flex: 2, minWidth: 160 }} placeholder="Nova tarefa" value={taskTitle} onChange={(e) => setTaskTitle(e.target.value)} />
            <input className="input" style={{ flex: 1, minWidth: 130 }} type="date" value={taskDue} onChange={(e) => setTaskDue(e.target.value)} aria-label="Prazo" />
            <select className="input" style={{ flex: 1, minWidth: 130 }} value={taskProject} onChange={(e) => setTaskProject(e.target.value)} aria-label="Projeto">
              <option value="">Sem projeto</option>
              {projects.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
            </select>
            <button className="btn" disabled={!taskTitle.trim()} onClick={() => void run(async () => { await api.tasks.create({ title: taskTitle, due: taskDue || null, projectId: taskProject || null }); setTaskTitle(""); setTaskDue(""); })}>Adicionar</button>
          </div>
          {tasks.length === 0 && <p className="small muted">Nenhuma tarefa.</p>}
          {[...tasks].sort((a, b) => Number(a.done) - Number(b.done) || (a.due ?? "9").localeCompare(b.due ?? "9")).map((t) => {
            const overdue = !t.done && t.due && new Date(t.due + "T23:59") < new Date();
            return (
              <div key={t.id} className={`task ${t.done ? "done" : ""}`}>
                <input type="checkbox" checked={t.done} aria-label={`Concluir ${t.title}`} onChange={() => void run(() => api.tasks.update(t.id, { done: !t.done }))} />
                <span>
                  {t.title}
                  {t.projectId && <span className="small muted"> · {projects.find((p) => p.id === t.projectId)?.name}</span>}
                </span>
                {t.due && <span className="small mono" style={{ color: overdue ? "var(--danger)" : "var(--muted)" }}>{new Date(t.due + "T12:00").toLocaleDateString("pt-BR")}</span>}
                <button className="btn small ghost" aria-label={`Excluir ${t.title}`} onClick={() => void run(() => api.tasks.remove(t.id))}>✕</button>
              </div>
            );
          })}
        </div>
        <div className="panel">
          <h2>Lembretes</h2>
          <p className="small muted">Os lembretes ficam salvos no servidor e aparecem como notificação do navegador <b>enquanto o Orion estiver aberto</b>.</p>
          <div className="row" style={{ marginBottom: 8 }}>
            <input className="input" style={{ flex: 2, minWidth: 160 }} placeholder="Lembrar de…" value={remText} onChange={(e) => setRemText(e.target.value)} />
            <input className="input" style={{ flex: 1, minWidth: 190 }} type="datetime-local" value={remAt} onChange={(e) => setRemAt(e.target.value)} aria-label="Data e hora" />
            <button className="btn" disabled={!remText.trim() || !remAt} onClick={() => void createReminder()}>Agendar</button>
          </div>
          {"Notification" in window && Notification.permission === "denied" && <div className="notice small">Notificações bloqueadas neste navegador; os lembretes aparecerão apenas dentro do Orion.</div>}
          {reminders.length === 0 && <p className="small muted">Nenhum lembrete.</p>}
          {[...reminders].sort((a, b) => a.at.localeCompare(b.at)).map((r) => (
            <div key={r.id} className={`task ${r.fired ? "done" : ""}`}>
              <span>{r.text}</span>
              <span className="small mono muted">{new Date(r.at).toLocaleString("pt-BR", { dateStyle: "short", timeStyle: "short" })}{r.fired ? " · disparado" : ""}</span>
              <button className="btn small ghost" aria-label={`Excluir lembrete ${r.text}`} onClick={() => void run(() => api.reminders.remove(r.id))}>✕</button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
