// Modo local limitado: usado quando nenhum modelo de IA está configurado.
// Responde apenas ao que pode ser resolvido de verdade, sem fingir inteligência.
import { evaluateExpression, formatNumber } from "../../shared/math";
import { HOW_TO_CONNECT } from "./env";
import { api } from "./api";
import { normalize } from "./commands";

export const LOCAL_PREFIX = "**Modo local limitado** — nenhum modelo de IA está conectado.";

const HELP = `${LOCAL_PREFIX}

Sem a IA, eu consigo fazer apenas o que é processado localmente:

- **Cálculos**: \`quanto é (12*7)^2\` ou \`sqrt(2)\`
- **Data e hora**: \`que horas são?\`
- **Memória**: \`lembre que meu projeto principal é o jogo X\`, \`liste minhas memórias\`
- **Projetos**: \`liste meus projetos\`
- **Comandos**: \`ative o modo scanner\`, \`desative a câmera\`, \`abra o modo programação\`, \`pare de falar\`
- **Visão computacional, gestos e voz** funcionam sem a IA.

Para conversar de verdade, ${HOW_TO_CONNECT}.`;

/** Tenta extrair uma expressão matemática da frase. */
export function extractMath(text: string): string | null {
  const t = text
    .toLowerCase()
    .replace(/^(quanto (e|é)|calcule|calcula|calcular|resultado de|qual (e|é) o resultado de)\s*/i, "")
    .replace(/\bvezes\b/g, "*")
    .replace(/\bmais\b/g, "+")
    .replace(/\bmenos\b/g, "-")
    .replace(/\bdividido por\b/g, "/")
    .replace(/\belevado a\b/g, "^")
    .replace(/\braiz quadrada de\s*([\d.,]+)/g, "sqrt($1)")
    .replace(/[?=]/g, "")
    .trim();
  if (!t || !/\d/.test(t) || !/^[\d\s+\-*/^%().,a-z×÷]+$/.test(t)) return null;
  if (/[a-z]{2,}/.test(t) && !/(sqrt|sin|cos|tan|log|ln|abs|pi|exp|round|floor|ceil|raiz|sen|tg)/.test(t)) return null;
  return t;
}

export async function localReply(input: string): Promise<string> {
  const n = normalize(input);

  const math = extractMath(input);
  if (math) {
    try {
      return `${LOCAL_PREFIX}\n\n\`${math}\` = **${formatNumber(evaluateExpression(math))}**`;
    } catch (err) {
      return `${LOCAL_PREFIX}\n\nNão consegui calcular: ${(err as Error).message}`;
    }
  }

  if (/\b(que horas|hora atual|que dia|data de hoje|hoje e)\b/.test(n)) {
    const now = new Date();
    return `${LOCAL_PREFIX}\n\nAgora são **${now.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}** de ${now.toLocaleDateString("pt-BR", { dateStyle: "full" })} (relógio deste dispositivo).`;
  }

  const remember = input.match(/^\s*(?:orion,?\s*)?(?:lembre(?:-se)?|lembra|guarde|memorize)\s+(?:que\s+|de\s+)?(.+)$/i);
  if (remember) {
    try {
      await api.memory.add(remember[1].trim());
      return `${LOCAL_PREFIX}\n\nMemória salva (gravação confirmada): “${remember[1].trim()}”.`;
    } catch (err) {
      return `${LOCAL_PREFIX}\n\nNão salvei: ${(err as Error).message}`;
    }
  }

  if (/\b(liste|listar|mostre|quais)\b.*\bmemorias?\b/.test(n)) {
    try {
      const { enabled, items } = await api.memory.list();
      if (!enabled) return `${LOCAL_PREFIX}\n\nA memória persistente está desativada.`;
      return items.length
        ? `${LOCAL_PREFIX}\n\n${items.map((m) => `- ${m.content}`).join("\n")}`
        : `${LOCAL_PREFIX}\n\nNão há memórias salvas.`;
    } catch (err) {
      return `${LOCAL_PREFIX}\n\n${(err as Error).message}`;
    }
  }

  if (/\b(liste|listar|mostre|quais)\b.*\bprojetos?\b/.test(n)) {
    try {
      const projects = await api.projects.list();
      return projects.length
        ? `${LOCAL_PREFIX}\n\n${projects.map((p) => `- **${p.name}** — ${p.status.replace("_", " ")} (${p.steps.filter((s) => s.done).length}/${p.steps.length} etapas)`).join("\n")}`
        : `${LOCAL_PREFIX}\n\nNenhum projeto cadastrado. Crie um em MEUS PROJETOS.`;
    } catch (err) {
      return `${LOCAL_PREFIX}\n\n${(err as Error).message}`;
    }
  }

  if (/^(oi|ola|bom dia|boa tarde|boa noite|e ai|hey)\b/.test(n)) {
    return `${LOCAL_PREFIX}\n\nOlá! Estou funcionando com recursos locais. Digite **ajuda** para ver o que consigo fazer sem a IA.`;
  }

  return HELP;
}
