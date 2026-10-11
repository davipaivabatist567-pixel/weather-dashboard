// Busca na base de conhecimento: divide os documentos em trechos e ordena por relevância
// (BM25 com normalização para português). Roda localmente, sem custo e sem internet.

export interface SearchableDoc {
  id: string;
  title: string;
  content: string;
}

export interface Chunk {
  docId: string;
  title: string;
  index: number;
  text: string;
}

export interface SearchHit extends Chunk {
  score: number;
}

const STOPWORDS = new Set(
  (
    "a o as os um uma uns umas de do da dos das em no na nos nas por pelo pela pelos pelas para pra com sem " +
    "e ou mas que se como quando onde qual quais quem porque pois ja nao sim mais menos muito muita muitos " +
    "muitas meu minha meus minhas seu sua seus suas teu tua nosso nossa eu tu ele ela nos vos eles elas voce " +
    "voces me te lhe isso isto aquilo esse essa este esta aquele aquela ao aos ser estar ter foi era sao esta " +
    "tem the of and to in is it for on with"
  ).split(" "),
);

export function normalizeText(s: string): string {
  return s.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "");
}

/** Reduz plurais comuns do português ao singular (funções → funcao, animais → animal, flores → flor). */
export function singular(t: string): string {
  if (t.length <= 3) return t;
  const rules: [RegExp, string][] = [
    [/oes$/, "ao"],
    [/aes$/, "ao"],
    [/ais$/, "al"],
    [/eis$/, "el"],
    [/ois$/, "ol"],
    [/uis$/, "ul"],
    [/ns$/, "m"],
    [/([rz])es$/, "$1"],
    [/([^s])s$/, "$1"],
  ];
  for (const [re, rep] of rules) if (re.test(t)) return t.replace(re, rep);
  return t;
}

/** Termos normalizados, sem palavras vazias, com plurais reduzidos ao singular. */
export function tokenize(s: string): string[] {
  return (normalizeText(s).match(/[a-z0-9]+/g) ?? []).filter((t) => t.length > 1 && !STOPWORDS.has(t)).map(singular);
}

/** Divide o texto em trechos de ~maxChars, respeitando parágrafos e frases. */
export function chunkText(text: string, maxChars = 900): string[] {
  const paragraphs = text.replace(/\r/g, "").split(/\n{2,}/).map((p) => p.trim()).filter(Boolean);
  const chunks: string[] = [];
  let current = "";
  const push = () => {
    if (current.trim()) chunks.push(current.trim());
    current = "";
  };
  for (const p of paragraphs) {
    if (p.length > maxChars) {
      push();
      const sentences = p.match(/[^.!?\n]+[.!?]*\s*/g) ?? [p];
      for (const s of sentences) {
        if ((current + s).length > maxChars) push();
        if (s.length > maxChars) for (let i = 0; i < s.length; i += maxChars) chunks.push(s.slice(i, i + maxChars).trim());
        else current += s;
      }
      push();
    } else {
      if ((current + "\n\n" + p).length > maxChars) push();
      current += (current ? "\n\n" : "") + p;
    }
  }
  push();
  return chunks;
}

export class KnowledgeIndex {
  private chunks: (Chunk & { terms: Map<string, number>; length: number })[] = [];
  private df = new Map<string, number>();
  private avgLength = 1;

  constructor(docs: SearchableDoc[]) {
    for (const d of docs) {
      chunkText(d.content).forEach((text, index) => {
        const tokens = tokenize(`${d.title} ${text}`);
        const terms = new Map<string, number>();
        for (const t of tokens) terms.set(t, (terms.get(t) ?? 0) + 1);
        this.chunks.push({ docId: d.id, title: d.title, index, text, terms, length: tokens.length });
      });
    }
    for (const c of this.chunks) for (const t of c.terms.keys()) this.df.set(t, (this.df.get(t) ?? 0) + 1);
    this.avgLength = this.chunks.reduce((s, c) => s + c.length, 0) / (this.chunks.length || 1) || 1;
  }

  get size() {
    return this.chunks.length;
  }

  /**
   * Trechos ordenados por relevância. O corte é relativo ao melhor resultado (o BM25 dá
   * notas baixas em coleções pequenas, então um limite fixo descartaria acertos).
   */
  search(query: string, limit = 5, relativeCut = 0.3): SearchHit[] {
    const q = [...new Set(tokenize(query))];
    if (!q.length || !this.chunks.length) return [];
    const N = this.chunks.length;
    const k1 = 1.4;
    const b = 0.75;
    const scored: SearchHit[] = [];
    for (const c of this.chunks) {
      let score = 0;
      for (const t of q) {
        const tf = c.terms.get(t);
        if (!tf) continue;
        const df = this.df.get(t) ?? 0;
        const idf = Math.log(1 + (N - df + 0.5) / (df + 0.5));
        score += (idf * tf * (k1 + 1)) / (tf + k1 * (1 - b + (b * c.length) / this.avgLength));
      }
      if (score > 0) scored.push({ docId: c.docId, title: c.title, index: c.index, text: c.text, score });
    }
    scored.sort((a, b2) => b2.score - a.score);
    const top = scored[0]?.score ?? 0;
    return scored.filter((h) => h.score >= top * relativeCut).slice(0, limit);
  }
}
