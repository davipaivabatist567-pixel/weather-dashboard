// Avaliador seguro de expressões matemáticas (sem eval).
// Suporta + - * / ^ %, parênteses, constantes (pi, e) e funções comuns.

const FUNCS: Record<string, (x: number) => number> = {
  sqrt: Math.sqrt, raiz: Math.sqrt, abs: Math.abs, sin: Math.sin, sen: Math.sin, cos: Math.cos,
  tan: Math.tan, tg: Math.tan, asin: Math.asin, acos: Math.acos, atan: Math.atan, log: Math.log10,
  ln: Math.log, exp: Math.exp, round: Math.round, floor: Math.floor, ceil: Math.ceil,
};
const CONSTS: Record<string, number> = { pi: Math.PI, e: Math.E };

type Tok = { t: "num"; v: number } | { t: "id"; v: string } | { t: "op"; v: string };

function tokenize(src: string): Tok[] {
  const out: Tok[] = [];
  const s = src.replace(/×/g, "*").replace(/÷/g, "/").replace(/,/g, ".").toLowerCase();
  let i = 0;
  while (i < s.length) {
    const c = s[i];
    if (/\s/.test(c)) { i++; continue; }
    if (/[0-9.]/.test(c)) {
      let j = i;
      while (j < s.length && /[0-9.]/.test(s[j])) j++;
      if (s[j] === "e" && /[0-9+-]/.test(s[j + 1] ?? "")) {
        j++;
        if (/[+-]/.test(s[j])) j++;
        while (j < s.length && /[0-9]/.test(s[j])) j++;
      }
      const v = Number(s.slice(i, j));
      if (Number.isNaN(v)) throw new Error(`Número inválido: ${s.slice(i, j)}`);
      out.push({ t: "num", v });
      i = j;
      continue;
    }
    if (/[a-z]/.test(c)) {
      let j = i;
      while (j < s.length && /[a-z0-9]/.test(s[j])) j++;
      out.push({ t: "id", v: s.slice(i, j) });
      i = j;
      continue;
    }
    if ("+-*/^%()".includes(c)) { out.push({ t: "op", v: c }); i++; continue; }
    throw new Error(`Caractere não permitido: "${c}"`);
  }
  return out;
}

export function evaluateExpression(expr: string): number {
  if (expr.length > 500) throw new Error("Expressão muito longa.");
  const toks = tokenize(expr);
  let pos = 0;
  const peek = () => toks[pos];
  const isOp = (v: string) => peek()?.t === "op" && peek()!.v === v;

  // expr := term (('+'|'-') term)*
  function parseExpr(): number {
    let v = parseTerm();
    while (isOp("+") || isOp("-")) {
      const op = toks[pos++].v;
      const r = parseTerm();
      v = op === "+" ? v + r : v - r;
    }
    return v;
  }
  // term := unary (('*'|'/'|'%') unary)*
  function parseTerm(): number {
    let v = parseUnary();
    while (isOp("*") || isOp("/") || isOp("%")) {
      const op = toks[pos++].v;
      const r = parseUnary();
      if (op === "*") v *= r;
      else if (op === "/") {
        if (r === 0) throw new Error("Divisão por zero.");
        v /= r;
      } else v %= r;
    }
    return v;
  }
  // unary := ('-'|'+') unary | power
  function parseUnary(): number {
    if (isOp("-")) { pos++; return -parseUnary(); }
    if (isOp("+")) { pos++; return parseUnary(); }
    return parsePower();
  }
  // power := primary ('^' unary)?   (associativo à direita)
  function parsePower(): number {
    const base = parsePrimary();
    if (isOp("^")) { pos++; return Math.pow(base, parseUnary()); }
    return base;
  }
  function parsePrimary(): number {
    const tok = toks[pos++];
    if (!tok) throw new Error("Expressão incompleta.");
    if (tok.t === "num") return tok.v;
    if (tok.t === "op" && tok.v === "(") {
      const v = parseExpr();
      if (!isOp(")")) throw new Error("Parêntese não fechado.");
      pos++;
      return v;
    }
    if (tok.t === "id") {
      if (tok.v in CONSTS) return CONSTS[tok.v];
      const fn = FUNCS[tok.v];
      if (!fn) throw new Error(`Função desconhecida: ${tok.v}`);
      if (!isOp("(")) throw new Error(`Use parênteses: ${tok.v}(x)`);
      pos++;
      const arg = parseExpr();
      if (!isOp(")")) throw new Error("Parêntese não fechado.");
      pos++;
      return fn(arg);
    }
    throw new Error(`Símbolo inesperado: ${tok.v}`);
  }

  const result = parseExpr();
  if (pos < toks.length) throw new Error(`Símbolo inesperado: ${toks[pos].v}`);
  if (!Number.isFinite(result)) throw new Error("O resultado não é um número finito.");
  return result;
}

export function formatNumber(n: number): string {
  return Number.isInteger(n) ? String(n) : String(Number(n.toPrecision(12)));
}
