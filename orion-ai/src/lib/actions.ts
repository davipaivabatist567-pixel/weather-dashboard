// Ações centrais do cliente: enviar mensagens, executar comandos locais,
// atualizar o estado do servidor e confirmar ações sensíveis.
import type { ChatAttachment, ChatTurn, OrionMode } from "../../shared/types";
import { useOrion, uid, type ChatMessage } from "../store";
import { getVisionEngine } from "../vision/engine";
import { GESTURE_LABELS } from "../vision/gestures";
import { api, ApiError, streamChat } from "./api";
import { describeCommand, parseCommand, stripWakeWord, type LocalCommand } from "./commands";
import { localReply } from "./localMode";
import { speak, stopSpeaking } from "./voice";

let controller: AbortController | null = null;

export async function refreshStatus() {
  try {
    const server = await api.status();
    useOrion.getState().set({ server, serverError: null });
  } catch (err) {
    useOrion.getState().set({ server: null, serverError: (err as Error).message });
  }
}

export function executeCommand(c: LocalCommand) {
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
  }
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
      executeCommand(cmd);
      const reply = describeCommand(cmd);
      st.addMessage({ id: uid(), role: "system", content: `⚙ Comando local executado: ${reply}`, at: new Date().toISOString(), local: true });
      if (opts.viaVoice && cmd.type !== "stop_speaking" && cmd.type !== "speak_last") speak(reply);
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

  // 2) Modo local (sem IA configurada)
  if (!st.server?.ai.configured) {
    let content: string;
    if (opts.attachments?.length) content = "**Modo local limitado** — a análise de arquivos e imagens precisa de um modelo de IA conectado (ANTHROPIC_API_KEY).";
    else content = await localReply(text);
    patch((m) => ({ ...m, content, streaming: false, local: true }));
    finish(opts.viaVoice, content);
    return reply.id;
  }

  // 3) Conversa com a IA
  const history: ChatTurn[] = useOrion
    .getState()
    .messages.filter((m) => (m.role === "user" || m.role === "assistant") && m.id !== reply.id && !m.local && !m.error && (m.content || m.attachmentData))
    .slice(-30)
    .map((m) => ({ role: m.role as "user" | "assistant", content: m.content, attachments: m.attachmentData }));

  controller = new AbortController();
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
  return reply.id;
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
