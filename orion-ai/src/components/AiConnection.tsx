// Versão HTML: o usuário informa a própria chave da API, guardada só neste navegador.
import { useState } from "react";
import { refreshStatus } from "../lib/actions";
import { api } from "../lib/api";
import { useOrion } from "../store";
import { Toggle } from "./Shell";

const MODELS = [
  ["claude-opus-5-5", "Claude Opus 5.5 (recomendado)"],
  ["claude-sonnet-5-5", "Claude Sonnet 5.5 (mais rápido e econômico)"],
  ["claude-haiku-5-5", "Claude Haiku 5.5 (o mais econômico)"],
  ["claude-fable-5-1", "Claude Fable 5.1 (o mais capaz, mais caro)"],
] as const;

export function AiConnection() {
  const cfgApi = api.aiConfig!;
  const toast = useOrion((s) => s.toast);
  const server = useOrion((s) => s.server);
  const [cfg, setCfg] = useState(cfgApi.get());
  const [show, setShow] = useState(false);
  const hasKey = !!cfgApi.get().apiKey;

  const save = async () => {
    if (cfg.apiKey && !/^sk-ant-/.test(cfg.apiKey.trim())) {
      toast("A chave parece inválida (deve começar com sk-ant-).", "erro");
      return;
    }
    cfgApi.set(cfg);
    await refreshStatus();
    toast(cfg.apiKey ? "Conexão salva neste navegador." : "Configuração salva (sem chave: modo local limitado).", "ok");
  };

  return (
    <div className="stack">
      <div className="notice">
        <b>Atenção:</b> nesta versão HTML não há servidor. A chave fica guardada <b>somente neste navegador</b> (localStorage) e as
        conversas vão direto do navegador para a API da Anthropic. Use apenas em um dispositivo pessoal e <b>não publique este
        arquivo com a sua chave</b>. Para uso compartilhado, prefira a versão com servidor (a chave fica no backend).
      </div>
      <label className="field">
        Chave da API da Anthropic
        <div className="row">
          <input
            className="input mono"
            style={{ flex: 1, minWidth: 200 }}
            type={show ? "text" : "password"}
            autoComplete="off"
            spellCheck={false}
            placeholder="sk-ant-…"
            value={cfg.apiKey}
            onChange={(e) => setCfg({ ...cfg, apiKey: e.target.value })}
          />
          <button className="btn small" type="button" onClick={() => setShow(!show)}>{show ? "Ocultar" : "Mostrar"}</button>
        </div>
      </label>
      <p className="small muted">
        Crie uma chave em <a href="https://console.anthropic.com/settings/keys" target="_blank" rel="noopener noreferrer">console.anthropic.com</a>. O uso é cobrado na sua conta.
      </p>
      <label className="field">
        Modelo
        <select className="input" value={cfg.model} onChange={(e) => setCfg({ ...cfg, model: e.target.value })}>
          {MODELS.map(([id, label]) => <option key={id} value={id}>{label}</option>)}
        </select>
      </label>
      <label className="field">
        Esforço de raciocínio
        <select className="input" value={cfg.effort} onChange={(e) => setCfg({ ...cfg, effort: e.target.value as typeof cfg.effort })}>
          <option value="low">Baixo (mais rápido)</option>
          <option value="medium">Médio (padrão)</option>
          <option value="high">Alto</option>
          <option value="xhigh">Muito alto</option>
          <option value="max">Máximo</option>
        </select>
      </label>
      <Toggle label="Pesquisa na internet (web_search)" hint="Precisa estar liberada na sua organização da Anthropic" checked={cfg.webSearch} onChange={(webSearch) => setCfg({ ...cfg, webSearch })} />
      <div className="row">
        <button className="btn primary" onClick={() => void save()}>Salvar conexão</button>
        {hasKey && (
          <button
            className="btn danger small"
            onClick={async () => {
              cfgApi.forgetKey();
              setCfg(cfgApi.get());
              await refreshStatus();
              toast("Chave apagada deste navegador.", "ok");
            }}
          >
            Esquecer chave
          </button>
        )}
      </div>
      <div className="small">
        Estado: {server?.ai.configured ? <b style={{ color: "var(--ok)" }}>conectado ({server.ai.model})</b> : <b>sem chave, modo local limitado</b>}.
        A validade da chave é confirmada na primeira mensagem.
      </div>
    </div>
  );
}
