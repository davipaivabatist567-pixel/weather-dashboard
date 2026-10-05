// Delta Experiences — Renderizador de preview editorial
// Gera o HTML que materializa visualmente a proposta usando a marca.
// Este preview é intencionalmente mais simples do que a saída que a IA
// editorial produzirá — serve para que o curador valide o conteúdo
// antes de enviar o prompt.

import { BRAND } from "./brand.js";
import { montarDocumento } from "./sections.js";

const esc = (s) =>
  String(s ?? "").replace(/[&<>"']/g, (c) =>
    ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c])
  );

const fmtBRL = (n, moeda = "BRL") =>
  typeof n === "number"
    ? new Intl.NumberFormat("pt-BR", { style: "currency", currency: moeda, minimumFractionDigits: 0 }).format(n)
    : esc(n);

const pagina = (classe, html) =>
  `<section class="page ${classe}">${html}</section>`;

function pageCapa(c, dados) {
  return pagina(
    "page--capa",
    `
    <div class="capa__topo">
      <span class="brand">${BRAND.nome}</span>
      <span class="brand__tagline">${BRAND.tagline}</span>
    </div>
    <div class="capa__meio" data-photo="${esc(dados.destino || '')}">
      <p class="capa__cliente">PROPOSTA PARA</p>
      <p class="capa__cliente-nome">${esc(c.cliente_nome || "")}</p>
    </div>
    <div class="capa__base">
      <h1 class="capa__titulo">${esc(c.titulo || "")}</h1>
      <p class="capa__sub">${esc(c.linha_destaque || "")}</p>
      <div class="capa__meta">
        <span>${esc(c.codigo || "")}</span>
        <span>${esc(c.data || "")}</span>
      </div>
    </div>
    `
  );
}

function pageCarta(c) {
  const corpo = (c.corpo || []).map((p, i) => {
    if (i === 0) {
      const [first, ...rest] = p;
      return `<p><span class="capitular">${esc(first || "")}</span>${esc(rest.join(""))}</p>`;
    }
    return `<p>${esc(p)}</p>`;
  }).join("");
  return pagina(
    "page--carta",
    `
    <div class="carta">
      <p class="saudacao">${esc(c.saudacao)}</p>
      ${corpo}
      <p class="despedida">${esc(c.despedida)}</p>
      <p class="assinante">${esc(c.assinante?.nome || "")}<br><span>${esc(c.assinante?.cargo || "")}</span></p>
    </div>
    `
  );
}

function pageVisao(c) {
  const narrativa = (c.narrativa || []).map((n) => `<p>${esc(n)}</p>`).join("");
  const meta = c.meta || {};
  return pagina(
    "page--visao",
    `
    <aside class="visao__foto" data-photo="${esc(c.titulo)}">
      <span class="photo-note">FOTOGRAFIA FULL-BLEED · ${esc(c.titulo || "")}</span>
    </aside>
    <article class="visao__texto">
      <p class="eyebrow">A EXPERIÊNCIA</p>
      <h2>${esc(c.titulo || "")}</h2>
      ${c.subtitulo ? `<p class="sub">${esc(c.subtitulo)}</p>` : ""}
      ${narrativa}
      ${c.pull_quote ? `<blockquote>${esc(c.pull_quote)}</blockquote>` : ""}
      <dl class="meta">
        ${meta.duracao   ? `<dt>Duração</dt><dd>${esc(meta.duracao)}</dd>` : ""}
        ${meta.convidados ? `<dt>Convidados</dt><dd>${esc(meta.convidados)}</dd>` : ""}
        ${meta.epoca     ? `<dt>Época</dt><dd>${esc(meta.epoca)}</dd>` : ""}
      </dl>
    </article>
    `
  );
}

function pageProgramaDia(d, idx) {
  const num = String(idx + 1).padStart(2, "0");
  const highs = (d.destaques || []).map((h) => `<li>${esc(h)}</li>`).join("");
  return pagina(
    "page--programa",
    `
    <header class="programa__hd">
      <span>DIA ${num}</span>
      <span class="rule"></span>
    </header>
    <h2 class="programa__titulo">${esc(d.titulo || "")}</h2>
    <ul class="programa__itens">${highs}</ul>
    `
  );
}

function pageInclusoes(c) {
  const itens = (c.inclusoes || []).map((i) => `
    <li>
      <span class="inc__nome">${esc(i.nome)}</span>
      <span class="inc__desc">${esc(i.descricao || "")}</span>
    </li>`).join("");
  return pagina(
    "page--inclusoes",
    `
    <p class="eyebrow">O QUE ESTÁ INCLUSO</p>
    <h2>Inclusões exclusivas</h2>
    <ol class="inclusoes">${itens}</ol>
    `
  );
}

function pageInvestimento(c) {
  const parcelas = (c.parcelas || []).map((p) =>
    `<tr><td>${esc(p.descricao)}</td><td class="num">${esc(p.percentual)}%</td></tr>`
  ).join("");
  const inc = (c.inclui || []).map((x) => `<li>${esc(x)}</li>`).join("");
  const nao = (c.nao_inclui || []).map((x) => `<li>${esc(x)}</li>`).join("");
  return pagina(
    "page--investimento",
    `
    <p class="eyebrow">INVESTIMENTO</p>
    <p class="valor">
      <span class="valor__moeda">${esc(c.moeda || "BRL")}</span>
      <span class="valor__num">${fmtBRL(c.valor, c.moeda)}</span>
    </p>
    ${c.por_convidado ? `<p class="valor__sub">${fmtBRL(c.por_convidado, c.moeda)} por convidado</p>` : ""}
    <table class="parcelas"><tbody>${parcelas}</tbody></table>
    <div class="inc-dois">
      <div><h4>Inclui</h4><ul>${inc}</ul></div>
      <div><h4>Não inclui</h4><ul>${nao}</ul></div>
    </div>
    `
  );
}

function pageCondicoes(c) {
  return pagina(
    "page--condicoes",
    `
    <p class="eyebrow">CONDIÇÕES</p>
    <div class="condicoes">
      <h4>Validade</h4><p>${esc(c.validade || "")}</p>
      <h4>Pagamento</h4><p>${esc(c.pagamento || "")}</p>
      <h4>Cancelamento</h4><p>${esc(c.cancelamento || "")}</p>
      <h4>Sigilo</h4><p>${esc(c.sigilo || "")}</p>
    </div>
    `
  );
}

function pageProximos(c) {
  const passos = (c.passos || []).map((p) => `
    <li>
      <span class="passo__num">${esc(p.numero)}</span>
      <div>
        <h3>${esc(p.titulo)}</h3>
        <p>${esc(p.descricao)}</p>
      </div>
    </li>`).join("");
  const contato = c.contato || {};
  return pagina(
    "page--proximos",
    `
    <p class="eyebrow eyebrow--light">PRÓXIMOS PASSOS</p>
    <ol class="passos">${passos}</ol>
    <footer class="contato">
      ${esc(contato.nome || "")} · ${esc(contato.email || "")} · ${esc(contato.telefone || "")}
    </footer>
    `
  );
}

function pageColofao(c) {
  return pagina(
    "page--colofao",
    `
    <div class="colofao">
      <p class="marca">${BRAND.nome.toUpperCase()}</p>
      <p class="codigo">${esc(c.codigo || "")}</p>
      <p class="info">EMITIDA EM ${esc(c.data || "")}</p>
      <p class="info">CURADOR · ${esc(c.curador || "").toUpperCase()}</p>
    </div>
    `
  );
}

export function renderizarPreview(dados) {
  const doc = montarDocumento(dados);
  const parts = [];
  for (const s of doc) {
    switch (s.id) {
      case "capa":         parts.push(pageCapa(s.conteudo, dados)); break;
      case "carta":        parts.push(pageCarta(s.conteudo)); break;
      case "visao":        parts.push(pageVisao(s.conteudo)); break;
      case "programa":
        s.conteudo.dias.forEach((d, i) => parts.push(pageProgramaDia(d, i)));
        break;
      case "inclusoes":    parts.push(pageInclusoes(s.conteudo)); break;
      case "investimento": parts.push(pageInvestimento(s.conteudo)); break;
      case "condicoes":    parts.push(pageCondicoes(s.conteudo)); break;
      case "proximos":     parts.push(pageProximos(s.conteudo)); break;
      case "colofao":      parts.push(pageColofao(s.conteudo)); break;
    }
  }
  return parts.join("\n");
}
