// Delta Experiences — Sistema de Marca
// Fonte canônica de identidade visual e verbal.
// Qualquer alteração aqui propaga para o preview, para o prompt de IA e para o export.

export const BRAND = {
  nome: "Delta Experiences",
  tagline: "A curadoria do extraordinário",
  manifesto:
    "Delta Experiences desenha experiências raras para quem já teve tudo. " +
    "Cada proposta é uma peça editorial — não um documento comercial.",

  posicionamento: {
    categoria: "Experiências premium sob medida",
    publico:
      "C-level, famílias patrimoniais, colecionadores de experiências e marcas que " +
      "convidam seus VIPs para momentos irrepetíveis.",
    promessa:
      "Transformar um desejo em memória — com discrição, requinte e domínio absoluto do detalhe.",
    diferenciais: [
      "Rede global de parceiros fechados ao público",
      "Produção white-glove de ponta a ponta",
      "Confidencialidade contratual",
      "Direção artística editorial em cada entrega",
    ],
  },

  cores: {
    midnight:   { hex: "#0E1A2B", nome: "Midnight",       uso: "Fundos editoriais, capa, páginas de abertura" },
    bone:       { hex: "#F4EFE6", nome: "Bone",           uso: "Fundo principal de leitura, respiros" },
    gold:       { hex: "#B59162", nome: "Ouro Antigo",    uso: "Detalhes, numerais capitulares, filetes" },
    charcoal:   { hex: "#2B2E33", nome: "Charcoal",       uso: "Texto corrido" },
    mist:       { hex: "#D8D2C7", nome: "Mist",           uso: "Divisores, legendas, dados tabulares" },
    wine:       { hex: "#6B2A3A", nome: "Vinho",          uso: "Acento raro, exclusividades" },
    paper:      { hex: "#FBF8F2", nome: "Paper",          uso: "Páginas de narrativa longa" },
  },

  tipografia: {
    display: {
      familia: "Playfair Display",
      pesos:   [400, 500, 700],
      uso:     "Títulos capitulares, aberturas, pull quotes",
      tracking:"-0.01em em títulos grandes; 0 em subtítulos",
    },
    serif: {
      familia: "Cormorant Garamond",
      pesos:   [300, 400, 500],
      uso:     "Narrativa editorial, cartas, citações",
    },
    sans: {
      familia: "Inter",
      pesos:   [300, 400, 500, 600],
      uso:     "Dados, tabelas, condições, UI",
    },
    micro: {
      familia: "Inter",
      pesos:   [500],
      uso:     "Caps alta, numeração de capítulos, legendas",
      tracking:"0.18em, uppercase",
    },
  },

  grid: {
    colunas: 12,
    gutter_mm: 6,
    margem_mm: { topo: 22, lado: 20, base: 25 },
    pagina_mm: { largura: 210, altura: 297 }, // A4 retrato
    baseline_pt: 12,
  },

  voz: {
    tom: "Confiante, íntimo, cinematográfico, sem adjetivos vazios.",
    pessoa: "Você (formal), narrativa em terceira pessoa quando descreve a experiência.",
    pilares: [
      "Mostre, não anuncie. 'Jantar sob as estrelas no deserto' > 'Jantar inesquecível'.",
      "Sensorial sobre adjetivos. Som, cheiro, textura, luz.",
      "Precisão numérica. '14 convidados' > 'grupo íntimo'.",
      "Discrição. Não cite marcas que exigem sigilo; use 'parceiros selecionados'.",
    ],
    proibicoes: [
      "Clichês: 'experiência única', 'sonho realizado', 'momentos mágicos'",
      "Exclamações, emojis, superlativos vazios",
      "Jargão corporativo ('sinergia', 'solução')",
    ],
  },

  layout_principios: [
    "Respiro é luxo — nunca encha a página.",
    "Fotografia full-bleed abre cada capítulo.",
    "Numeração capitular em algarismos romanos, Ouro Antigo, canto superior.",
    "Pull quotes em Playfair 32–48pt, Midnight, com filete de 1pt em Ouro.",
    "Dados sempre em Inter, tabular-nums, sem bordas duras.",
    "Nenhuma página sem respiro vertical mínimo de 25% da altura.",
  ],

  entregas: {
    formato: "PDF A4 retrato, 12–24 páginas, otimizado para impressão fine-art",
    acabamento_sugerido: "Capa em papel Cordenons Stardream, miolo em Munken Pure 120g, costurado",
    digital: "Versão interativa HTML espelhando a diagramação, para envio por link privado",
  },
};

export const BRAND_HASH = (() => {
  // Hash simples para versionar a identidade; útil ao auditar propostas antigas.
  const s = JSON.stringify(BRAND);
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) | 0;
  return "DX-" + (h >>> 0).toString(36).toUpperCase();
})();
