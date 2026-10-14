// Ações centrais do cliente: enviar mensagens, executar comandos locais,
// atualizar o estado do servidor e confirmar ações sensíveis.
import type { ChatAttachment, ChatTurn, KnowledgeMeta, LearnResult, MemoryItem, OrionMode } from "../../shared/types";
import { HOW_TO_CONNECT, IN_ANDROID_APP } from "./env";
import { useOrion, uid, type ChatMessage } from "../store";
import { getVisionEngine } from "../vision/engine";
import { GESTURE_LABELS } from "../vision/gestures";
import { api, ApiError, streamChat } from "./api";
import { describeCommand, parseCommand, searchUrl, SITES, stripWakeWord, type LocalCommand } from "./commands";
import { localReply } from "./localMode";
import { listenOnce, speak, speechRecognitionSupported, stopListening, stopSpeaking } from "./voice";

let controller: AbortController | null = null;

export async function refreshStatus() {
  try {
    const server = await api.status();
    useOrion.getState().set({ server, serverError: null });
  } catch (err) {
    useOrion.getState().set({ server: null, serverError: (err as Error).message });
  }
}

/** Executa um comando local e devolve a resposta (texto) que o Orion mostra e fala. */
export async function executeCommand(c: LocalCommand): Promise<string> {
  const st = useOrion.getState();
  const engine = getVisionEngine();
  switch (c.type) {
    case "view_mode":
      st.setViewMode(c.mode);
      if (st.page !== "visao" && st.page !== "laboratorio") st.setPage("visao");
      break;
    case "orion_mode":
      st.setMode(c.mode);
      st.setPage("assistente");
      break;
    case "navigate":
      st.setPage(c.page);
      break;
    case "camera":
      if (c.on) {
        st.setPage("visao");
        void engine.start(st.settings.camera.deviceId);
      } else engine.stop();
      break;
    case "camera_pause":
      if (c.paused) engine.pause();
      else engine.resume();
      break;
    case "speak_last": {
      const last = [...st.messages].reverse().find((m) => m.role === "assistant" && m.content);
      if (last) speak(last.content);
      else st.toast("Ainda não há resposta para ler.");
      break;
    }
    case "stop_speaking":
      stopSpeaking();
      break;
    case "show_movements":
      st.setViewMode("scanner");
      st.setPage("visao");
      if (!engine.running) void engine.start(st.settings.camera.deviceId);
      break;
    case "clear_chat":
      st.clearMessages();
      break;
    case "open_site": {
      const site = SITES[c.site];
      return abrirLink(site.url, `Abrindo ${site.label}.`);
    }
    case "web_search":
      return abrirLink(searchUrl(c.platform, c.query), describeCommand(c));
    case "play":
      return abrirLink(searchUrl("youtube", c.query), describeCommand(c));
    case "photo":
      return tirarFoto();
    case "battery":
      return lerBateria();
    case "hologram":
      st.set({ hologramOpen: c.open });
      break;
    case "sleep":
      st.set({ activeMode: false });
      stopListening();
      break;
    case "voice_volume": {
      const v = st.settings.voice;
      if (c.mode === "mute" || c.mode === "unmute") {
        st.updateSettings((x) => ({ ...x, voice: { ...x.voice, muted: c.mode === "mute" } }));
        return c.mode === "mute" ? "Voz do Orion silenciada." : "Voz do Orion ativada.";
      }
      const atual = Math.round(v.volume * 100);
      const alvo = Math.max(0, Math.min(100, c.mode === "set" ? (c.value ?? atual) : atual + (c.mode === "up" ? 10 : -10)));
      st.updateSettings((x) => ({ ...x, voice: { ...x.voice, volume: alvo / 100, muted: alvo === 0 ? x.voice.muted : false } }));
      return `Volume da voz do Orion em ${alvo}%. O volume do aparelho só muda pelos botões do sistema.`;
    }
    case "introduce":
    case "unsupported":
      break;
  }
  return describeCommand(c);
}

/** Abre um link fora do Orion. Sem um toque do usuário o navegador pode bloquear: então devolve o link. */
function abrirLink(url: string, texto: string): string {
  if (IN_ANDROID_APP) {
    // o app Android intercepta a navegação e abre o navegador do sistema
    window.location.href = url;
    return texto;
  }
  const w = window.open(url, "_blank", "noopener");
  return w === null ? `${texto} O navegador bloqueou a janela: [toque aqui para abrir](${url}).` : `${texto} [Link](${url})`;
}

async function lerBateria(): Promise<string> {
  const nav = navigator as Navigator & { getBattery?: () => Promise<{ level: number; charging: boolean }> };
  if (!nav.getBattery) return "Este navegador não informa o nível da bateria.";
  try {
    const b = await nav.getBattery();
    return `Bateria em ${Math.round(b.level * 100)}%, ${b.charging ? "carregando" : "sem carregar"}.`;
  } catch {
    return "Não consegui ler a bateria neste aparelho.";
  }
}

const esperar = (ms: number) => new Promise((r) => setTimeout(r, ms));

/** Tira uma foto com a câmera (contagem de 3 s, como o VISION). A foto fica só em memória. */
async function tirarFoto(): Promise<string> {
  const st = useOrion.getState();
  const engine = getVisionEngine();
  if (!engine.running) {
    st.toast("Ligando a câmera…");
    void engine.start(st.settings.camera.deviceId);
    for (let i = 0; i < 40 && !engine.running && useOrion.getState().camera !== "erro"; i++) await esperar(250);
    for (let i = 0; i < 40 && engine.video.readyState < 2 && useOrion.getState().camera !== "erro"; i++) await esperar(250);
  }
  if (useOrion.getState().camera === "erro" || !engine.running) return `Não consegui ligar a câmera: ${useOrion.getState().cameraError ?? "erro desconhecido"}`;
  for (const n of [3, 2, 1]) {
    useOrion.getState().toast(`Foto em ${n}…`);
    await esperar(1000);
  }
  const data = engine.captureFrame();
  if (!data) return "Não consegui capturar a foto.";
  useOrion.getState().set({ photo: { data, at: Date.now() } });
  return "Foto tirada. Ela fica só neste aparelho até você salvar ou fechar.";
}

/**
 * Ativação no estilo VISION (duas palmas): abre o holograma, cumprimenta com o estado real do
 * Orion e, se o navegador tiver ditado, começa a conversa contínua.
 */
export function ativarOrion() {
  const st = useOrion.getState();
  if (st.chatBusy || st.mic === "escutando") return;
  st.set({ hologramOpen: true });
  const h = new Date().getHours();
  const saudacao = h < 12 ? "Bom dia" : h < 18 ? "Boa tarde" : "Boa noite";
  const ia = st.server?.ai.configured ? "Inteligência central conectada" : "Estou em modo local limitado";
  const texto = `${saudacao}. Orion online. ${ia}. Qual é o plano?`;
  st.addMessage({ id: uid(), role: "assistant", content: texto, at: new Date().toISOString(), local: true });
  speak(texto);
  if (st.settings.activation.activeConversation && speechRecognitionSupported) {
    st.set({ activeMode: true });
    continuarConversa();
  } else if (!speechRecognitionSupported) {
    st.toast("Ditado por voz indisponível aqui: digite sua pergunta.", "info");
  }
}

let vaziosSeguidos = 0;
/** Na conversa contínua, volta a ouvir quando o Orion termina de falar (até "pode dormir"). */
export function continuarConversa() {
  const tentar = (n = 0) => {
    const s = useOrion.getState();
    if (!s.activeMode) return;
    if (s.speaking || s.chatBusy || s.mic === "escutando") {
      if (n < 600) setTimeout(() => tentar(n + 1), 250);
      return;
    }
    listenOnce(
      (texto) => {
        vaziosSeguidos = 0;
        void sendMessage(texto, { viaVoice: true }).finally(() => continuarConversa());
      },
      () => {
        // ninguém falou: depois de 2 silêncios seguidos, o Orion descansa (não deixa o microfone aberto à toa)
        vaziosSeguidos++;
        if (vaziosSeguidos >= 2) {
          vaziosSeguidos = 0;
          useOrion.getState().set({ activeMode: false });
          useOrion.getState().toast("Conversa encerrada por silêncio. Bata palmas duas vezes para chamar de novo.");
        } else continuarConversa();
      },
    );
  };
  setTimeout(() => tentar(), 400);
}



/** Resumo das medições reais da visão computacional, enviado como contexto à IA. */
export function visionContext(): string | undefined {
  const st = useOrion.getState();
  if (st.camera !== "ativa" && st.camera !== "pausada") return undefined;
  const v = st.vision;
  const b = v.body;
  const fmt = (n: number | null | undefined, d = 2) => (n === null || n === undefined ? "indisponível" : n.toFixed(d));
  return [
    `Câmera: ${st.camera}. Medições do MediaPipe (relativas, sem calibração métrica):`,
    `- Corpo detectado: ${b?.detected ? "sim" : "não"} (pontos visíveis: ${b?.visibleLandmarks ?? 0}, confiança média ${fmt(b?.confidence)})`,
    `- Altura da mão esquerda/direita em relação ao ombro (larguras de ombro): ${fmt(b?.leftHandHeight)} / ${fmt(b?.rightHandHeight)}`,
    `- Mãos detectadas: ${v.hands} ${v.handedness.join(", ")}`,
    `- Gesto atual: ${v.gesture ? `${GESTURE_LABELS[v.gesture.id]} (${Math.round(v.gesture.confidence * 100)}%)` : "nenhum"}`,
    `- Últimos gestos confirmados: ${st.gestureLog.slice(0, 5).map((g) => GESTURE_LABELS[g.id]).join(", ") || "nenhum"}`,
    `- FPS de processamento: ${v.fps ?? "indisponível"}; inferência: ${v.inferenceMs ?? "indisponível"} ms`,
  ].join("\n");
}

export interface SendOptions {
  attachments?: ChatAttachment[];
  viaVoice?: boolean;
  mode?: OrionMode;
  /** Não verifica comandos locais (ex.: pesquisa) */
  noCommands?: boolean;
  /** Mensagem extra de contexto (ex.: pedido de análise de imagem da câmera) */
  extraContext?: string;
}

export async function sendMessage(raw: string, opts: SendOptions = {}): Promise<string | null> {
  const st = useOrion.getState();
  const text = opts.viaVoice ? stripWakeWord(raw) : raw.trim();
  if (!text && !opts.attachments?.length) return null;
  if (st.chatBusy) {
    st.toast("Aguarde a resposta atual ou interrompa-a.", "info");
    return null;
  }

  // 1) Comandos locais
  if (!opts.noCommands && !opts.attachments?.length) {
    const cmd = parseCommand(text);
    if (cmd) {
      st.addMessage({ id: uid(), role: "user", content: raw, at: new Date().toISOString() });
      const reply = await executeCommand(cmd);
      st.addMessage({ id: uid(), role: "system", content: `⚙ Comando local executado: ${reply}`, at: new Date().toISOString(), local: true });
      if (opts.viaVoice && cmd.type !== "stop_speaking" && cmd.type !== "speak_last") speak(reply.replace(/\[[^\]]*\]\([^)]*\)/g, ""));
      return null;
    }
  }

  const mode = opts.mode ?? st.mode;
  const userMsg: ChatMessage = {
    id: uid(),
    role: "user",
    content: text,
    at: new Date().toISOString(),
    attachments: opts.attachments?.map(({ data: _d, ...a }) => a),
    attachmentData: opts.attachments,
    mode,
  };
  st.addMessage(userMsg);
  const reply: ChatMessage = { id: uid(), role: "assistant", content: "", at: new Date().toISOString(), streaming: true, mode };
  st.addMessage(reply);
  st.set({ chatBusy: true });
  st.setCore("processando");
  const patch = (fn: (m: ChatMessage) => ChatMessage) => useOrion.getState().patchMessage(reply.id, fn);

  // 2) Modo local (sem IA configurada). Se o estado ainda não foi carregado, consulta antes
  //    para não responder em modo local por engano logo após abrir o Orion.
  if (!useOrion.getState().server) await refreshStatus();
  if (!useOrion.getState().server?.ai.configured) {
    let content: string;
    if (opts.attachments?.length) content = `**Modo local limitado** — a análise de arquivos e imagens precisa de um modelo de IA conectado: ${HOW_TO_CONNECT}.`;
    else content = await localReply(text);
    patch((m) => ({ ...m, content, streaming: false, local: true }));
    finish(opts.viaVoice, content);
    void learnAfterReply(userMsg, null);
    return reply.id;
  }

  // 3) Conversa com a IA
  const history: ChatTurn[] = useOrion
    .getState()
    .messages.filter((m) => (m.role === "user" || m.role === "assistant") && m.id !== reply.id && !m.local && !m.error && (m.content || m.attachmentData))
    .slice(-30)
    .map((m) => ({ role: m.role as "user" | "assistant", content: m.content, attachments: m.attachmentData }));

  controller = new AbortController();
  const signal = controller.signal;
  const started = performance.now();
  let firstToken = true;
  try {
    const ctx = [opts.extraContext, mode === "laboratorio" || st.page === "visao" ? visionContext() : undefined].filter(Boolean).join("\n\n");
    await streamChat(
      { mode, messages: history, permissions: st.settings.permissions, clientContext: ctx || undefined },
      (e) => {
        switch (e.type) {
          case "text":
            if (firstToken) {
              firstToken = false;
              useOrion.getState().set({ lastLatencyMs: Math.round(performance.now() - started) });
            }
            patch((m) => ({ ...m, content: m.content + e.text }));
            break;
          case "tool_start":
            patch((m) => ({ ...m, tools: [...(m.tools ?? []), { id: e.id, label: e.label, risk: e.risk }] }));
            break;
          case "tool_result":
            patch((m) => ({
              ...m,
              tools: (m.tools ?? []).some((t) => t.id === e.id)
                ? m.tools!.map((t) => (t.id === e.id ? { ...t, ok: e.ok, summary: e.summary } : t))
                : [...(m.tools ?? []), { id: e.id, label: e.name, ok: e.ok, summary: e.summary, risk: "baixo" }],
            }));
            if (e.ok && /projeto|tarefa|lembrete|etapa/.test(e.name)) window.dispatchEvent(new Event("orion:data-changed"));
            break;
          case "search_results":
            patch((m) => {
              const seen = new Set((m.sources ?? []).map((s) => s.url));
              return { ...m, sources: [...(m.sources ?? []), ...e.sources.filter((s) => !seen.has(s.url))] };
            });
            break;
          case "pending_action":
            patch((m) => ({ ...m, pending: [...(m.pending ?? []), { id: e.action.id, description: e.action.description, state: "aguardando" }] }));
            break;
          case "error":
            patch((m) => ({ ...m, error: e.message }));
            break;
          case "done":
            break;
        }
      },
      controller.signal,
    );
    patch((m) => ({ ...m, streaming: false }));
  } catch (err) {
    if (controller?.signal.aborted) {
      patch((m) => ({ ...m, streaming: false, content: m.content + (m.content ? "\n\n" : "") + "_(resposta interrompida)_" }));
    } else {
      const message = err instanceof ApiError ? err.message : `Falha na conversa: ${(err as Error).message}`;
      patch((m) => ({ ...m, streaming: false, error: message }));
      if (err instanceof ApiError && err.status === 503) void refreshStatus();
    }
  } finally {
    controller = null;
  }
  const final = useOrion.getState().messages.find((m) => m.id === reply.id);
  finish(opts.viaVoice, final?.content ?? "", !!final?.error);
  if (final && !final.error && final.content && !signal.aborted) void learnAfterReply(userMsg, final.content);
  return reply.id;
}

/**
 * Aprendizado contínuo: depois de cada resposta, guarda os arquivos enviados na base de
 * conhecimento e pede à IA para extrair o que o usuário ensinou na conversa.
 * Roda em segundo plano e mostra no chat exatamente o que foi guardado.
 */
async function learnAfterReply(user: ChatMessage, replyContent: string | null) {
  const st = useOrion.getState();
  const server = st.server;
  if (!server?.memoryEnabled || !server.learningEnabled || !st.settings.permissions.writeMemory) return;
  const jobs: Promise<LearnResult>[] = [];
  if (user.attachmentData?.length) jobs.push(api.learning.files(user.attachmentData));
  if (server.ai.configured && replyContent && user.content.trim()) {
    jobs.push(
      api.learning.conversation([
        { role: "user", content: user.content },
        { role: "assistant", content: replyContent.slice(0, 4000) },
      ]),
    );
  }
  if (!jobs.length) return;
  const results = await Promise.allSettled(jobs);
  const learned = results.flatMap((r) => (r.status === "fulfilled" ? r.value.learned : []));
  const docs = results.flatMap((r) => (r.status === "fulfilled" ? r.value.knowledge : []));
  const skipped = results.flatMap((r) => (r.status === "fulfilled" ? r.value.skipped : [`aprendizado indisponível: ${(r.reason as Error).message}`]));
  reportLearning(learned, docs, skipped);
  void refreshStatus();
}

/** Mostra no chat o que foi aprendido (somente o que o armazenamento confirmou). */
export function reportLearning(learned: MemoryItem[], docs: KnowledgeMeta[], skipped: string[] = []) {
  const st = useOrion.getState();
  const lines: string[] = [];
  if (learned.length) lines.push(`🧠 Aprendi: ${learned.map((m) => m.content).join(" · ")}`);
  if (docs.length) lines.push(`📚 Guardei na base de conhecimento: ${docs.map((d) => d.title).join(", ")}`);
  if (skipped.length) lines.push(`⚠ Não aprendi: ${skipped.join("; ")}`);
  if (!lines.length) return;
  st.addMessage({ id: uid(), role: "system", content: lines.join("\n"), at: new Date().toISOString(), local: true });
  if (learned.length || docs.length) window.dispatchEvent(new Event("orion:data-changed"));
}

function finish(viaVoice: boolean | undefined, content: string, isError = false) {
  const s = useOrion.getState();
  s.set({ chatBusy: false });
  s.setCore(isError ? "erro" : "repouso");
  if (isError) setTimeout(() => useOrion.getState().core === "erro" && useOrion.getState().setCore("repouso"), 2500);
  if (!isError && content && (viaVoice || s.settings.voice.autoSpeak)) speak(content);
}

export function abortChat() {
  controller?.abort();
}

export async function resolvePending(messageId: string, actionId: string, confirm: boolean) {
  const st = useOrion.getState();
  const setState = (state: "confirmada" | "cancelada" | "erro", result?: string) =>
    st.patchMessage(messageId, (m) => ({ ...m, pending: m.pending?.map((p) => (p.id === actionId ? { ...p, state, result } : p)) }));
  try {
    if (confirm) {
      const r = await api.actions.confirm(actionId);
      setState("confirmada", r.message);
      window.dispatchEvent(new Event("orion:data-changed"));
    } else {
      await api.actions.cancel(actionId);
      setState("cancelada");
    }
  } catch (err) {
    setState("erro", (err as Error).message);
  }
}
