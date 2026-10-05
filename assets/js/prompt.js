// Delta Experiences — Gerador de prompt para IA de design editorial
// Produz um prompt completo e estruturado, pronto para ser colado em
// Claude / GPT / Gemini ou qualquer modelo com capacidade de gerar
// HTML/CSS editorial, SVG, ou direção para ferramentas como Figma/InDesign.

import { BRAND, BRAND_HASH } from "./brand.js";
import { montarDocumento } from "./sections.js";

const BLOCO = (titulo, corpo) => `## ${titulo}\n\n${corpo.trim()}\n`;

function blocoMarca() {
  const cores = Object.values(BRAND.cores)
    .map((c) => `- ${c.nome} \`${c.hex}\` — ${c.uso}`)
    .join("\n");
  const tipos = Object.entries(BRAND.tipografia)
    .map(([k, t]) => `- **${k}** · ${t.familia} (${t.pesos.join("/")}) — ${t.uso}`)
    .join("\n");
  const principios = BRAND.layout_principios.map((p) => `- ${p}`).join("\n");
  return BLOCO(
    "1. Sistema de marca",
    `**${BRAND.nome}** — ${BRAND.tagline}\n\n${BRAND.manifesto}\n\n` +
      `### Cores\n${cores}\n\n` +
      `### Tipografia\n${tipos}\n\n` +
      `### Princípios de layout\n${principios}\n\n` +
      `### Grid\n` +
      `- Página: A4 retrato (${BRAND.grid.pagina_mm.largura}×${BRAND.grid.pagina_mm.altura}mm)\n` +
      `- Colunas: ${BRAND.grid.colunas} · gutter ${BRAND.grid.gutter_mm}mm\n` +
      `- Margens: topo ${BRAND.grid.margem_mm.topo}mm · lateral ${BRAND.grid.margem_mm.lado}mm · base ${BRAND.grid.margem_mm.base}mm\n` +
      `- Baseline: ${BRAND.grid.baseline_pt}pt`
  );
}

function blocoVoz() {
  const pilares = BRAND.voz.pilares.map((p) => `- ${p}`).join("\n");
  const proibidos = BRAND.voz.proibicoes.map((p) => `- ${p}`).join("\n");
  return BLOCO(
    "2. Voz da marca (para qualquer microcopy que você acrescentar)",
    `**Tom:** ${BRAND.voz.tom}\n**Pessoa:** ${BRAND.voz.pessoa}\n\n` +
      `**Pilares:**\n${pilares}\n\n` +
      `**Proibido:**\n${proibidos}`
  );
}

function blocoSecoes(doc) {
  const paginas = doc.map((s, i) => {
    const conteudo = "```json\n" + JSON.stringify(s.conteudo, null, 2) + "\n```";
    return `### §${i + 1}. ${s.titulo}  _(página sugerida: ${s.pagina_sugerida})_\n\n` +
      `**Direção editorial:**\n${s.direcao}\n\n` +
      `**Conteúdo (fonte da verdade — nunca invente campos):**\n${conteudo}`;
  }).join("\n\n");
  return BLOCO(
    "3. Documento, seção por seção",
    paginas
  );
}

function blocoRegras() {
  return BLOCO(
    "4. Regras não negociáveis",
    [
      "- Nunca mude os valores de `conteudo` — eles são a verdade comercial.",
      "- Nunca introduza cores fora da paleta acima. Nenhum gradiente colorido.",
      "- Nenhum ícone pictórico. Apenas filetes finos (0.5–1pt), algarismos romanos ou numerais, e marcadores circulares.",
      "- Nenhuma caixa com fundo cinza ou borda arredondada. A hierarquia é tipográfica.",
      "- Cada página deve ter respiro vertical ≥ 25%. Se precisar apertar, divida em duas páginas.",
      "- Fotografias devem ser full-bleed quando usadas; nunca contornadas, nunca sombras.",
      "- Preserve o número de página em algarismos romanos Ouro Antigo no canto superior externo.",
      "- O logotipo aparece apenas na capa e no colofão. Não repita em cada página.",
      "- Monetário sempre em Inter tabular-nums; valor principal da proposta em Playfair.",
    ].join("\n")
  );
}

function blocoEntrega() {
  return BLOCO(
    "5. Formato de entrega esperado",
    [
      "Gere **um arquivo HTML único, autocontido, pronto para impressão A4**, usando apenas CSS inline ou em `<style>`.",
      "",
      "Requisitos técnicos:",
      "- `@page { size: A4; margin: 0 }` e `@media print` com quebras de página explícitas (`page-break-after: always`).",
      "- Google Fonts carregados via `<link>` para Playfair Display, Cormorant Garamond, Inter.",
      "- Nenhuma dependência JS. Nenhuma imagem remota não listada. Para fotografias, use placeholders `<div class='photo' data-direction='...'>` com a direção artística em texto, para que o cliente substitua as fotos reais.",
      "- Metadata no `<head>`: `<meta name='delta-brand-hash' content='" + BRAND_HASH + "'>`, `<meta name='proposal-code' content='{codigo}'>`.",
      "- Semântica: `<article>` por seção, `<header>`/`<footer>` por página, `<figure>` para pull quotes.",
      "- CSS acessível: contraste AA mínimo em qualquer texto corrido.",
      "",
      "Depois do HTML, acrescente **um pequeno relatório** em markdown com: páginas geradas, decisões de diagramação não óbvias, e sugestões de fotografia por página (3–7 palavras cada).",
    ].join("\n")
  );
}

function blocoAutocritica() {
  return BLOCO(
    "6. Autocrítica antes de entregar",
    [
      "Antes de responder, releia e verifique:",
      "- A capa tem respiro suficiente? O título sobrepõe a fotografia com clareza?",
      "- A carta de abertura soa como alguém escrevendo, não como um e-mail de vendas?",
      "- Alguma página ficou com densidade de texto > 75%? Divida.",
      "- A paleta foi obedecida pixel a pixel?",
      "- O investimento é mostrado com dignidade — nem gritando, nem escondido?",
      "- O colofão fecha o documento como fechamento de livro?",
      "",
      "Se qualquer item falhar, corrija e só então responda.",
    ].join("\n")
  );
}

export function gerarPrompt(dados) {
  const doc = montarDocumento(dados);
  const cabecalho =
    `# Direção para IA de Design Editorial — ${BRAND.nome}\n\n` +
    `_Proposta ${dados.codigo_proposta} · emitida em ${dados.data_envio} · brand ${BRAND_HASH}_\n\n` +
    "Você é uma IA especializada em design editorial. Sua tarefa é diagramar " +
    "uma proposta comercial premium como se fosse uma peça de revista de alto padrão — " +
    "não um documento de vendas. O conteúdo abaixo é imutável; sua liberdade está na forma.\n";

  return [
    cabecalho,
    blocoMarca(),
    blocoVoz(),
    blocoSecoes(doc),
    blocoRegras(),
    blocoEntrega(),
    blocoAutocritica(),
  ].join("\n");
}

export function gerarPromptCurto(dados) {
  // Variante para modelos com contexto reduzido — mantém o essencial.
  const doc = montarDocumento(dados);
  const resumoCores = Object.values(BRAND.cores).map((c) => `${c.nome} ${c.hex}`).join(" · ");
  const resumoTipos = `${BRAND.tipografia.display.familia} (display) · ${BRAND.tipografia.serif.familia} (narrativa) · ${BRAND.tipografia.sans.familia} (dados)`;
  const secoesResumidas = doc.map((s, i) =>
    `${i + 1}. **${s.titulo}** — ${s.direcao.split(".")[0]}.`
  ).join("\n");
  return [
    `# ${BRAND.nome} — Proposta ${dados.codigo_proposta}`,
    "",
    `Diagrame em HTML único A4 retrato, com fontes Google, estilo revista fine-art.`,
    `Paleta: ${resumoCores}.`,
    `Tipografia: ${resumoTipos}.`,
    "",
    "## Seções",
    secoesResumidas,
    "",
    "## Dados",
    "```json",
    JSON.stringify(dados, null, 2),
    "```",
    "",
    "Nunca mude dados. Respire. Não use ícones nem caixas cinza.",
  ].join("\n");
}
