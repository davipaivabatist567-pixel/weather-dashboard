// Delta Experiences — Orquestração da aplicação
// Lê o formulário, atualiza o preview, gera prompt e exporta.

import { BRAND, BRAND_HASH } from "./brand.js";
import { DADOS_EXEMPLO } from "./data.js";
import { renderizarPreview } from "./preview.js";
import { gerarPrompt, gerarPromptCurto } from "./prompt.js";

const $ = (sel) => document.querySelector(sel);
const $$ = (sel) => Array.from(document.querySelectorAll(sel));

const STATE = {
  dados: structuredClone(DADOS_EXEMPLO),
  proposalCss: "",
};

// --- Form <-> State ---------------------------------------------------------
function lerForm() {
  const d = STATE.dados;
  d.codigo_proposta = $("#f-codigo").value.trim();
  d.data_envio      = $("#f-data").value.trim();
  d.titulo          = $("#f-titulo").value.trim();
  d.subtitulo       = $("#f-subtitulo").value.trim();
  d.destino         = $("#f-destino").value.trim();
  d.destino_titulo  = $("#f-destino-titulo").value.trim();
  d.destino_subtitulo = $("#f-destino-sub").value.trim();
  d.duracao         = $("#f-duracao").value.trim();
  d.convidados      = $("#f-convidados").value.trim();
  d.epoca           = $("#f-epoca").value.trim();
  d.pull_quote      = $("#f-pullquote").value.trim();
  d.contexto_abertura = $("#f-contexto").value.trim();

  d.cliente = {
    nome: $("#f-cliente-nome").value.trim(),
    primeiro_nome: $("#f-cliente-primeiro").value.trim(),
    email: $("#f-cliente-email").value.trim(),
    telefone: $("#f-cliente-tel").value.trim(),
  };

  d.assinante = {
    nome: $("#f-assin-nome").value.trim(),
    cargo: $("#f-assin-cargo").value.trim(),
  };

  d.contato = {
    nome: $("#f-cont-nome").value.trim(),
    email: $("#f-cont-email").value.trim(),
    telefone: $("#f-cont-tel").value.trim(),
  };

  d.narrativa = $("#f-narrativa").value
    .split(/\n\s*\n/)
    .map((s) => s.trim())
    .filter(Boolean);

  d.programa = $("#f-programa").value
    .split("\n")
    .map((l) => l.trim())
    .filter(Boolean)
    .map((l, i) => {
      const [titulo, ...dest] = l.split("|").map((x) => x.trim());
      return { dia: i + 1, titulo, destaques: dest };
    });

  d.inclusoes = $("#f-inclusoes").value
    .split("\n")
    .map((l) => l.trim())
    .filter(Boolean)
    .map((l) => {
      const [nome, descricao = ""] = l.split("—").map((x) => x.trim());
      return { nome, descricao };
    });

  d.investimento = {
    valor:         parseInt($("#f-valor").value, 10) || 0,
    moeda:         $("#f-moeda").value.trim() || "BRL",
    por_convidado: parseInt($("#f-por-conv").value, 10) || null,
    parcelas:      $("#f-parcelas").value
      .split("\n").map((l) => l.trim()).filter(Boolean)
      .map((l) => {
        const [descricao, perc] = l.split("|").map((x) => x.trim());
        return { descricao, percentual: parseInt(perc, 10) || 0 };
      }),
    inclui:        $("#f-inc").value.split("\n").map((s) => s.trim()).filter(Boolean),
    nao_inclui:    $("#f-naoinc").value.split("\n").map((s) => s.trim()).filter(Boolean),
  };

  d.condicoes = {
    validade:     $("#f-validade").value.trim(),
    pagamento:    $("#f-pagamento").value.trim(),
    cancelamento: $("#f-cancelamento").value.trim(),
    sigilo:       $("#f-sigilo").value.trim(),
  };
}

function escreverForm() {
  const d = STATE.dados;
  $("#f-codigo").value          = d.codigo_proposta;
  $("#f-data").value            = d.data_envio;
  $("#f-titulo").value          = d.titulo;
  $("#f-subtitulo").value       = d.subtitulo || "";
  $("#f-destino").value         = d.destino || "";
  $("#f-destino-titulo").value  = d.destino_titulo || "";
  $("#f-destino-sub").value     = d.destino_subtitulo || "";
  $("#f-duracao").value         = d.duracao || "";
  $("#f-convidados").value      = d.convidados || "";
  $("#f-epoca").value           = d.epoca || "";
  $("#f-pullquote").value       = d.pull_quote || "";
  $("#f-contexto").value        = d.contexto_abertura || "";

  $("#f-cliente-nome").value    = d.cliente?.nome || "";
  $("#f-cliente-primeiro").value= d.cliente?.primeiro_nome || "";
  $("#f-cliente-email").value   = d.cliente?.email || "";
  $("#f-cliente-tel").value     = d.cliente?.telefone || "";

  $("#f-assin-nome").value      = d.assinante?.nome || "";
  $("#f-assin-cargo").value     = d.assinante?.cargo || "";

  $("#f-cont-nome").value       = d.contato?.nome || "";
  $("#f-cont-email").value      = d.contato?.email || "";
  $("#f-cont-tel").value        = d.contato?.telefone || "";

  $("#f-narrativa").value       = (d.narrativa || []).join("\n\n");
  $("#f-programa").value        = (d.programa || [])
    .map((p) => [p.titulo, ...(p.destaques || [])].join(" | ")).join("\n");
  $("#f-inclusoes").value       = (d.inclusoes || [])
    .map((i) => `${i.nome} — ${i.descricao || ""}`).join("\n");

  $("#f-valor").value           = d.investimento?.valor || "";
  $("#f-moeda").value           = d.investimento?.moeda || "BRL";
  $("#f-por-conv").value        = d.investimento?.por_convidado || "";
  $("#f-parcelas").value        = (d.investimento?.parcelas || [])
    .map((p) => `${p.descricao} | ${p.percentual}`).join("\n");
  $("#f-inc").value             = (d.investimento?.inclui || []).join("\n");
  $("#f-naoinc").value          = (d.investimento?.nao_inclui || []).join("\n");

  $("#f-validade").value        = d.condicoes?.validade || "";
  $("#f-pagamento").value       = d.condicoes?.pagamento || "";
  $("#f-cancelamento").value    = d.condicoes?.cancelamento || "";
  $("#f-sigilo").value          = d.condicoes?.sigilo || "";
}

// --- Preview ---------------------------------------------------------------
function atualizarPreview() {
  $("#preview").innerHTML = renderizarPreview(STATE.dados);
  $("#brand-hash").textContent = BRAND_HASH;
}

// --- Export ----------------------------------------------------------------
function download(name, content, type = "text/plain;charset=utf-8") {
  const blob = new Blob([content], { type });
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = name;
  document.body.appendChild(a);
  a.click();
  setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 0);
}

function exportJSON() {
  download(`${STATE.dados.codigo_proposta}.json`,
    JSON.stringify(STATE.dados, null, 2), "application/json");
}

function exportPrompt(curto = false) {
  const prompt = curto ? gerarPromptCurto(STATE.dados) : gerarPrompt(STATE.dados);
  download(`${STATE.dados.codigo_proposta}-prompt${curto ? "-curto" : ""}.md`, prompt, "text/markdown");
}

function copiarPrompt(curto = false) {
  const prompt = curto ? gerarPromptCurto(STATE.dados) : gerarPrompt(STATE.dados);
  navigator.clipboard.writeText(prompt).then(() => flash("Prompt copiado"));
}

function exportHTMLPreview() {
  const inner = renderizarPreview(STATE.dados);
  const html = `<!doctype html><html lang="pt-BR"><head>
<meta charset="utf-8">
<title>${STATE.dados.codigo_proposta} — ${STATE.dados.titulo}</title>
<meta name="delta-brand-hash" content="${BRAND_HASH}">
<meta name="proposal-code" content="${STATE.dados.codigo_proposta}">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Playfair+Display:ital,wght@0,400;0,500;0,700;1,400&family=Cormorant+Garamond:ital,wght@0,300;0,400;0,500;1,400&family=Inter:wght@300;400;500;600&display=swap" rel="stylesheet">
<style>${STATE.proposalCss}</style>
</head><body class="print-root">${inner}</body></html>`;
  download(`${STATE.dados.codigo_proposta}-preview.html`, html, "text/html;charset=utf-8");
}

// --- Utilitários -----------------------------------------------------------
function flash(msg) {
  const el = $("#flash");
  el.textContent = msg;
  el.classList.add("flash--on");
  setTimeout(() => el.classList.remove("flash--on"), 1600);
}

function salvarLocal() {
  localStorage.setItem("delta.rascunho", JSON.stringify(STATE.dados));
  flash("Rascunho salvo localmente");
}

function carregarLocal() {
  const raw = localStorage.getItem("delta.rascunho");
  if (!raw) return flash("Nenhum rascunho encontrado");
  try {
    STATE.dados = JSON.parse(raw);
    escreverForm();
    atualizarPreview();
    flash("Rascunho carregado");
  } catch { flash("Rascunho corrompido"); }
}

function resetarExemplo() {
  STATE.dados = structuredClone(DADOS_EXEMPLO);
  escreverForm();
  atualizarPreview();
  flash("Exemplo recarregado");
}

async function carregarProposalCss() {
  try {
    const r = await fetch("assets/css/proposal.css");
    if (r.ok) STATE.proposalCss = await r.text();
  } catch { /* preview continua funcionando; só o export inline fica sem CSS */ }
}

// --- Bootstrap -------------------------------------------------------------
async function init() {
  await carregarProposalCss();
  escreverForm();
  atualizarPreview();

  $$("input, textarea, select").forEach((el) =>
    el.addEventListener("input", () => { lerForm(); atualizarPreview(); })
  );

  $("#btn-export-json").addEventListener("click", exportJSON);
  $("#btn-export-prompt").addEventListener("click", () => exportPrompt(false));
  $("#btn-export-prompt-curto").addEventListener("click", () => exportPrompt(true));
  $("#btn-copy-prompt").addEventListener("click", () => copiarPrompt(false));
  $("#btn-export-html").addEventListener("click", exportHTMLPreview);
  $("#btn-save-local").addEventListener("click", salvarLocal);
  $("#btn-load-local").addEventListener("click", carregarLocal);
  $("#btn-reset").addEventListener("click", resetarExemplo);

  $("#brand-name").textContent = BRAND.nome;
  $("#brand-tagline").textContent = BRAND.tagline;
}

document.addEventListener("DOMContentLoaded", init);
