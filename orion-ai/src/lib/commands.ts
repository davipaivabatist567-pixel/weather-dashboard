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
  | { type: "clear_chat" }
  // Comandos no estilo do VISION
  | { type: "open_site"; site: SiteId }
  | { type: "web_search"; platform: "google" | "youtube"; query: string }
  | { type: "play"; query: string }
  | { type: "photo" }
  | { type: "battery" }
  | { type: "hologram"; open: boolean }
  | { type: "sleep" }
  | { type: "introduce" }
  | { type: "voice_volume"; mode: "up" | "down" | "set" | "mute" | "unmute"; value?: number }
  | { type: "unsupported"; what: "screenshot" | "folder" };

export type SiteId = "youtube" | "google" | "whatsapp" | "instagram" | "gmail" | "maps" | "spotify";
export const SITES: Record<SiteId, { label: string; url: string; re: RegExp }> = {
  youtube: { label: "YouTube", url: "https://www.youtube.com", re: /\b(you ?tube|iutubi)\b/ },
  google: { label: "Google", url: "https://www.google.com", re: /\bgoogle\b(?! maps)/ },
  whatsapp: { label: "WhatsApp", url: "https://web.whatsapp.com", re: /\b(whatsapp|whats|zap|zapzap)\b/ },
  instagram: { label: "Instagram", url: "https://www.instagram.com", re: /\b(instagram|insta)\b/ },
  gmail: { label: "Gmail", url: "https://mail.google.com", re: /\b(gmail|e-?mail)\b/ },
  maps: { label: "Google Maps", url: "https://www.google.com/maps", re: /\b(google maps|maps|mapa|mapas)\b/ },
  spotify: { label: "Spotify", url: "https://open.spotify.com", re: /\bspotify\b/ },
};

export const searchUrl = (platform: "google" | "youtube", q: string) =>
  platform === "youtube"
    ? `https://www.youtube.com/results?search_query=${encodeURIComponent(q)}`
    : `https://www.google.com/search?q=${encodeURIComponent(q)}`;

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
  if (!t) return null;
  const v = parseVisionCommand(t);
  if (v) return v;
  if (t.split(" ").length > 9) return null;
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

const NUMEROS: Record<string, number> = { zero: 0, dez: 10, vinte: 20, trinta: 30, quarenta: 40, cinquenta: 50, sessenta: 60, setenta: 70, oitenta: 80, noventa: 90, cem: 100 };

/** Comandos do estilo VISION (abrir sites, pesquisar, tocar música, foto, bateria, holograma…). `t` já normalizado. */
export function parseVisionCommand(t: string): LocalCommand | null {
  const palavras = t.split(" ").length;
  if (palavras > 14) return null;

  if (/^(pode |va |vai |hora de )?(dormir|descansar)\b|^(modo (dormir|descanso)|pare de (me )?ouvir|para de (me )?ouvir)\b/.test(t)) return { type: "sleep" };
  if (palavras <= 6 && /\b(quem e voce|quem voce e|se apresente|apresente se|o que voce e|fale sobre voce)\b/.test(t)) return { type: "introduce" };
  if (palavras <= 7 && /\bbateria\b/.test(t) && !/\b(carro|moto|placa|projeto|lipo|celula)\b/.test(t)) return { type: "battery" };

  if (/\b(holograma|interface holografica)\b/.test(t) || /^(abr\w*|fech\w*|mostr\w*|ativ\w*) (a )?interface$/.test(t)) {
    return { type: "hologram", open: !/\b(fech\w*|desativ\w*|sair|sai|esconde\w*|ocult\w*|tira\w*)\b/.test(t) };
  }

  if (t === "selfie" || /\b(tir\w*|bat\w*|captur\w*|faz|faca|fazer|fazendo)\b.*\b(foto|selfie|retrato)\b/.test(t)) return { type: "photo" };

  if (/\b(print|printa\w*|captura de tela|screenshot|foto da tela)\b/.test(t)) return { type: "unsupported", what: "screenshot" };
  if (/\b(cri\w*|abr\w*|nova)\b.*\bpasta\b/.test(t)) return { type: "unsupported", what: "folder" };

  // volume (da voz do Orion: o volume do aparelho não pode ser mudado por uma página)
  if (/^(silencio|fica quieto|fique quieto)$|\b(ativ\w* o mudo|modo mudo|mutar|silenci\w* (a voz|o orion|voce))\b/.test(t)) return { type: "voice_volume", mode: "mute" };
  if (/\b(desativ\w* o mudo|tir\w* o mudo|desmut\w*|volt\w* a falar)\b/.test(t)) return { type: "voice_volume", mode: "unmute" };
  if (/\b(volume|som)\b/.test(t) && palavras <= 8) {
    const n = t.match(/\b(\d{1,3})\b/)?.[1];
    const pal = Object.keys(NUMEROS).find((w) => new RegExp(`\\b${w}\\b`).test(t));
    if (n || pal) return { type: "voice_volume", mode: "set", value: Math.min(100, n ? Number(n) : NUMEROS[pal!]) };
    if (/\b(aument\w*|sob\w*|mais alto|mais|maximo|alto)\b/.test(t)) return { type: "voice_volume", mode: /\bmaximo\b/.test(t) ? "set" : "up", value: /\bmaximo\b/.test(t) ? 100 : undefined };
    if (/\b(diminu\w*|abaix\w*|baix\w*|menos|mais baixo)\b/.test(t)) return { type: "voice_volume", mode: "down" };
  }

  // pesquisar NO GOOGLE / NO YOUTUBE (sem citar o site, a pergunta vai para a IA, que pesquisa e cita fontes)
  const busca = t.match(/^(?:pesquis\w*|procur\w*|busc\w*|ache|achar)\s+(?:por\s+|sobre\s+)?(.+?)\s+(?:no|na|em)\s+(google|you ?tube)$/);
  if (busca && busca[1].trim()) return { type: "web_search", platform: /tube/.test(busca[2]) ? "youtube" : "google", query: busca[1].trim() };
  const busca2 = t.match(/^(?:pesquis\w*|procur\w*|busc\w*)\s+no\s+(google|you ?tube)\s+(?:por\s+|sobre\s+)?(.+)$/);
  if (busca2 && busca2[2].trim()) return { type: "web_search", platform: /tube/.test(busca2[1]) ? "youtube" : "google", query: busca2[2].trim() };

  // tocar música (abre os resultados do YouTube, como o VISION)
  const toca = t.match(/^(?:toca|toque|tocar|bota|bote|botar|coloca|coloque|colocar|poe|ponha)\s+(?:pra mim\s+|para mim\s+)?(?:a\s+|o\s+|uma\s+|um\s+)?(?:musica|cancao|som|clipe)?\s*(?:do\s+|da\s+|de\s+)?(.+?)(?:\s+(?:pra|para)\s+tocar)?(?:\s+no\s+you ?tube)?$/);
  if (toca && toca[1] && !/^(o volume|volume|o som|som)$/.test(toca[1])) return { type: "play", query: toca[1].trim() };

  // abrir site
  const abrir = t.match(/^(?:abr\w*|entr\w*|vai|va|ir|acess\w*)\s+(?:no |na |o |a |para o |pro |ao )?(.+)$/);
  if (abrir && palavras <= 5) {
    for (const [id, site] of Object.entries(SITES) as [SiteId, (typeof SITES)[SiteId]][]) if (site.re.test(abrir[1])) return { type: "open_site", site: id };
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
    case "open_site":
      return `Abrindo ${SITES[c.site].label}.`;
    case "web_search":
      return `Pesquisando “${c.query}” no ${c.platform === "youtube" ? "YouTube" : "Google"}.`;
    case "play":
      return `Procurando “${c.query}” no YouTube.`;
    case "photo":
      return "Foto tirada. Ela fica só neste aparelho.";
    case "battery":
      return "Verificando a bateria.";
    case "hologram":
      return c.open ? "Abrindo o holograma." : "Holograma fechado.";
    case "sleep":
      return "Entendido. Vou descansar. Bata palmas duas vezes ou toque em Falar para me chamar.";
    case "introduce":
      return "Eu sou o Orion, seu assistente pessoal. Converso por texto e por voz, vejo pela câmera quando você permite, organizo seus projetos e lembro do que você me ensina. Qual é o comando?";
    case "voice_volume":
      return "Volume da voz ajustado.";
    case "unsupported":
      return c.what === "screenshot"
        ? "Não consigo tirar print da tela: uma página web não tem acesso à tela do sistema. Use o atalho do seu aparelho."
        : "Não consigo criar nem abrir pastas: uma página web não tem acesso aos arquivos do sistema.";
  }
}
