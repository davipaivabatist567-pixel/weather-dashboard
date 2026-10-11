// Interpretação de comandos locais (voz ou texto). Funções puras e testáveis.
// Comandos locais são executados por funções reais do app; o resto vai para a IA.
import type { OrionMode } from "../../shared/types";
import type { Page, ViewMode } from "../store";

export type LocalCommand =
  | { type: "view_mode"; mode: ViewMode }
  | { type: "orion_mode"; mode: OrionMode }
  | { type: "navigate"; page: Page }
  | { type: "camera"; on: boolean }
  | { type: "camera_pause"; paused: boolean }
  | { type: "speak_last" }
  | { type: "stop_speaking" }
  | { type: "show_movements" }
  | { type: "clear_chat" };

export const normalize = (s: string) =>
  s
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[.,!?;:]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();

/** Remove o chamado "Orion," do início. */
export function stripWakeWord(text: string): string {
  return text.replace(/^\s*(ok\s+|ei\s+|hey\s+)?[oó]r[iy]on[\s,:!-]*/i, "").trim();
}

const MODE_WORDS: [RegExp, OrionMode][] = [
  [/\b(programacao|engenheiro|engenharia|codigo)\b/, "engenheiro"],
  [/\b(estudo|estudos|professor)\b/, "estudos"],
  [/\b(criativo|criatividade)\b/, "criativo"],
  [/\b(produtividade|organizacao)\b/, "produtividade"],
  [/\b(pesquisa)\b/, "pesquisa"],
  [/\b(assistente)\b/, "assistente"],
];

const PAGE_WORDS: [RegExp, Page][] = [
  [/\b(inicio|home|painel inicial)\b/, "inicio"],
  [/\b(conversa|chat|assistente)\b/, "assistente"],
  [/\b(visao|camera)\b/, "visao"],
  [/\b(laboratorio|diagnostico)\b/, "laboratorio"],
  [/\b(projetos?|tarefas)\b/, "projetos"],
  [/\b(pesquisa)\b/, "pesquisa"],
  [/\b(memoria)\b/, "memoria"],
  [/\b(configuracoes|configuracao|ajustes)\b/, "configuracoes"],
];

/**
 * Retorna um comando local se o texto for claramente um comando curto.
 * Frases longas ou perguntas são tratadas como conversa com a IA.
 */
export function parseCommand(input: string): LocalCommand | null {
  const t = normalize(stripWakeWord(input));
  if (!t || t.split(" ").length > 9) return null;
  const verb = /^(ative|ativar|ativa|ligue|ligar|liga|abra|abrir|abre|mude|mudar|muda|entre|entrar|va|ir|mostre|mostrar|mostra|use|usar|modo|desative|desativar|desliga|desligue|desligar|pare|parar|para|pause|pausar|pausa|retome|retomar|continue|leia|ler|limpe|limpar|apague|fecha|feche)\b/;
  if (!verb.test(t)) return null;

  if (/^(pare|parar|para)( de)? (falar|fala)|^(silencio|cala)/.test(t) || /\b(pare de falar|parar de falar)\b/.test(t)) return { type: "stop_speaking" };
  if (/\b(leia|ler)\b.*\b(resposta|voz alta|em voz)\b/.test(t)) return { type: "speak_last" };
  if (/\b(desative|desativar|desliga|desligue|desligar|fecha|feche)\b.*\b(camera|visao)\b/.test(t)) return { type: "camera", on: false };
  if (/\b(pause|pausar|pausa)\b.*\b(camera|processamento|visao|rastreamento)\b/.test(t)) return { type: "camera_pause", paused: true };
  if (/\b(retome|retomar|continue)\b.*\b(camera|processamento|visao|rastreamento)\b/.test(t)) return { type: "camera_pause", paused: false };
  if (/\b(ative|ativar|ativa|ligue|ligar|liga)\b.*\b(camera|visao)\b/.test(t)) return { type: "camera", on: true };
  if (/\bmodo (scanner|escaner)\b/.test(t)) return { type: "view_mode", mode: "scanner" };
  if (/\bmodo normal\b/.test(t)) return { type: "view_mode", mode: "normal" };
  if (/\b(modo laboratorio)\b/.test(t) && /\b(ative|ativar|ativa|mude|use|usar|modo)\b/.test(t) && !/\babr/.test(t)) return { type: "view_mode", mode: "laboratorio" };
  if (/\b(mostre|mostrar|mostra)\b.*\b(movimentos?|rastreamento|esqueleto)\b/.test(t)) return { type: "show_movements" };
  if (/\b(limpe|limpar|apague)\b.*\b(conversa|historico|chat)\b/.test(t)) return { type: "clear_chat" };

  if (/\bmodo\b/.test(t)) {
    for (const [re, mode] of MODE_WORDS) if (re.test(t)) return { type: "orion_mode", mode };
  }
  if (/\b(abra|abrir|abre|va|ir|mostre|mostrar|mostra|entre|entrar)\b/.test(t)) {
    for (const [re, page] of PAGE_WORDS) if (re.test(t)) return { type: "navigate", page };
  }
  return null;
}

export function describeCommand(c: LocalCommand): string {
  switch (c.type) {
    case "view_mode":
      return `Modo de visualização: ${c.mode}.`;
    case "orion_mode":
      return `Modo ${c.mode} ativado.`;
    case "navigate":
      return `Abrindo ${c.page}.`;
    case "camera":
      return c.on ? "Ativando a visão computacional." : "Câmera desligada.";
    case "camera_pause":
      return c.paused ? "Processamento da câmera pausado." : "Processamento da câmera retomado.";
    case "speak_last":
      return "Lendo a última resposta.";
    case "stop_speaking":
      return "Fala interrompida.";
    case "show_movements":
      return "Mostrando os movimentos detectados no modo scanner.";
    case "clear_chat":
      return "Histórico da conversa limpo.";
  }
}
