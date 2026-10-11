import { describe, expect, it } from "vitest";
import { evaluateExpression, formatNumber } from "../../shared/math";
import { parseCommand, stripWakeWord } from "../../src/lib/commands";
import { parseCsv, summarize } from "../../src/lib/dataAnalysis";
import { toSpeechText } from "../../src/lib/voice";
import { extractMath } from "../../src/lib/localMode";
import { OneEuro } from "../../src/vision/smoothing";

describe("calculadora segura", () => {
  it.each([
    ["2+2*3", 8],
    ["(2+2)*3", 12],
    ["2^3^2", 512],
    ["-3^2", -9],
    ["sqrt(16) + abs(-2)", 6],
    ["10 % 4", 2],
    ["1,5 * 2", 3],
    ["2e3 + 1", 2001],
  ])("%s = %d", (expr, expected) => {
    expect(evaluateExpression(expr)).toBeCloseTo(expected);
  });
  it("rejeita código e entradas inválidas", () => {
    expect(() => evaluateExpression("alert(1)")).toThrow();
    expect(() => evaluateExpression("process.exit()")).toThrow();
    expect(() => evaluateExpression("1/0")).toThrow(/zero/);
    expect(() => evaluateExpression("(1+2")).toThrow();
    expect(() => evaluateExpression("2 +")).toThrow();
  });
  it("formata números", () => {
    expect(formatNumber(0.1 + 0.2)).toBe("0.3");
    expect(formatNumber(42)).toBe("42");
  });
  it("extrai matemática de frases", () => {
    expect(extractMath("quanto é 2 mais 3?")).toBe("2 + 3");
    expect(extractMath("me explique a fotossíntese")).toBeNull();
    expect(extractMath("2024 foi um bom ano")).toBeNull();
  });
});

describe("comandos locais", () => {
  it.each([
    ["Orion, ative o modo scanner", { type: "view_mode", mode: "scanner" }],
    ["Desative a câmera", { type: "camera", on: false }],
    ["ative a câmera", { type: "camera", on: true }],
    ["Pare de falar", { type: "stop_speaking" }],
    ["Leia a resposta em voz alta", { type: "speak_last" }],
    ["Abra o modo programação", { type: "orion_mode", mode: "engenheiro" }],
    ["Mostre os movimentos detectados", { type: "show_movements" }],
    ["abra os projetos", { type: "navigate", page: "projetos" }],
    ["abra as configurações", { type: "navigate", page: "configuracoes" }],
    ["pausar a câmera", { type: "camera_pause", paused: true }],
    ["limpe o histórico da conversa", { type: "clear_chat" }],
  ])("%s", (text, expected) => {
    expect(parseCommand(text)).toEqual(expected);
  });
  it("perguntas vão para a IA", () => {
    expect(parseCommand("Orion, me ajude a criar um jogo")).toBeNull();
    expect(parseCommand("Explique esse assunto")).toBeNull();
    expect(parseCommand("Como funciona a câmera de um celular moderno e por que ela tem vários sensores?")).toBeNull();
  });
  it("remove a palavra de ativação", () => {
    expect(stripWakeWord("Orion, me ajude")).toBe("me ajude");
    expect(stripWakeWord("ok orion explique")).toBe("explique");
  });
});

describe("texto para fala", () => {
  it("remove Markdown e código", () => {
    const t = toSpeechText("# Título\n\nUse **isto**:\n```js\nconsole.log(1)\n```\n- item [link](http://x)");
    expect(t).not.toMatch(/[#*`]/);
    expect(t).toContain("bloco de código omitido");
    expect(t).toContain("link");
    expect(t).not.toContain("http");
  });
});

describe("análise de dados CSV", () => {
  it("lê aspas, separadores e números pt-BR", () => {
    const csv = 'nome;valor;cidade\n"Silva; Ana";1.234,50;SP\nBruno;10;RJ\nCarla;;SP\n';
    const { header, rows, delimiter } = parseCsv(csv);
    expect(delimiter).toBe(";");
    expect(header).toEqual(["nome", "valor", "cidade"]);
    expect(rows[0][0]).toBe("Silva; Ana");
    const s = summarize(csv);
    expect(s.rows).toBe(3);
    const valor = s.columns[1];
    expect(valor.type).toBe("numérica");
    expect(valor.sum).toBeCloseTo(1244.5);
    expect(valor.empty).toBe(1);
    expect(s.columns[2].top?.[0]).toEqual({ value: "SP", count: 2 });
  });
});

describe("suavização One Euro", () => {
  it("reduz tremores mantendo a posição média", () => {
    const f = new OneEuro(1.0, 0.0);
    let out = 0;
    let maxDev = 0;
    for (let i = 0; i < 120; i++) {
      out = f.filter(0.5 + (i % 2 ? 0.02 : -0.02), i * 33);
      if (i > 30) maxDev = Math.max(maxDev, Math.abs(out - 0.5));
    }
    expect(maxDev).toBeLessThan(0.02);
  });
});
