// Análise local de dados tabulares (CSV/TSV) — executada no navegador, sem IA.

export interface ColumnStats {
  name: string;
  type: "numérica" | "texto";
  filled: number;
  empty: number;
  unique: number;
  min?: number;
  max?: number;
  mean?: number;
  median?: number;
  std?: number;
  sum?: number;
  top?: { value: string; count: number }[];
}

export interface DatasetSummary {
  rows: number;
  columns: ColumnStats[];
  delimiter: string;
}

/** Parser de CSV com suporte a aspas, separador detectado automaticamente. */
export function parseCsv(text: string): { header: string[]; rows: string[][]; delimiter: string } {
  const firstLine = text.split(/\r?\n/, 1)[0] ?? "";
  const candidates = [",", ";", "\t", "|"];
  const delimiter = candidates.reduce((best, d) => (firstLine.split(d).length > firstLine.split(best).length ? d : best), ",");
  const rows: string[][] = [];
  let row: string[] = [];
  let field = "";
  let quoted = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (quoted) {
      if (c === '"') {
        if (text[i + 1] === '"') {
          field += '"';
          i++;
        } else quoted = false;
      } else field += c;
    } else if (c === '"') quoted = true;
    else if (c === delimiter) {
      row.push(field);
      field = "";
    } else if (c === "\n" || c === "\r") {
      if (c === "\r" && text[i + 1] === "\n") i++;
      row.push(field);
      field = "";
      if (row.some((x) => x.trim() !== "")) rows.push(row);
      row = [];
    } else field += c;
  }
  row.push(field);
  if (row.some((x) => x.trim() !== "")) rows.push(row);
  const header = (rows.shift() ?? []).map((h, i) => h.trim() || `coluna_${i + 1}`);
  return { header, rows, delimiter };
}

const toNumber = (s: string): number | null => {
  const t = s.trim();
  if (!t) return null;
  // aceita 1.234,56 (pt-BR) e 1234.56
  const normalized = /^-?\d{1,3}(\.\d{3})+(,\d+)?$/.test(t) ? t.replace(/\./g, "").replace(",", ".") : t.replace(",", ".");
  const n = Number(normalized);
  return Number.isFinite(n) ? n : null;
};

export function summarize(text: string): DatasetSummary {
  const { header, rows, delimiter } = parseCsv(text);
  const columns = header.map((name, ci): ColumnStats => {
    const values = rows.map((r) => (r[ci] ?? "").trim());
    const filledVals = values.filter((v) => v !== "");
    const nums = filledVals.map(toNumber);
    const isNumeric = filledVals.length > 0 && nums.filter((n) => n !== null).length / filledVals.length >= 0.9;
    const base = { name, filled: filledVals.length, empty: values.length - filledVals.length, unique: new Set(filledVals).size };
    if (isNumeric) {
      const ns = nums.filter((n): n is number => n !== null).sort((a, b) => a - b);
      const sum = ns.reduce((a, b) => a + b, 0);
      const mean = sum / ns.length;
      const mid = Math.floor(ns.length / 2);
      const median = ns.length % 2 ? ns[mid] : (ns[mid - 1] + ns[mid]) / 2;
      const std = Math.sqrt(ns.reduce((a, b) => a + (b - mean) ** 2, 0) / ns.length);
      return { ...base, type: "numérica", min: ns[0], max: ns[ns.length - 1], mean, median, std, sum };
    }
    const counts = new Map<string, number>();
    for (const v of filledVals) counts.set(v, (counts.get(v) ?? 0) + 1);
    const top = [...counts.entries()].sort((a, b) => b[1] - a[1]).slice(0, 3).map(([value, count]) => ({ value, count }));
    return { ...base, type: "texto", top };
  });
  return { rows: rows.length, columns, delimiter };
}
