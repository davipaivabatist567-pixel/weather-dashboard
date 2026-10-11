// Efeitos globais: ações dos gestos, lembretes, verificação do servidor e navegação.
import { useEffect } from "react";
import { PAGES, useOrion, type Page } from "../store";
import { GESTURE_LABELS, type GestureId } from "../vision/gestures";
import { refreshStatus, sendMessage } from "./actions";
import { api } from "./api";
import { bus } from "./bus";
import { listenOnce } from "./voice";

/** Confiança mínima para gestos que executam ações (não apenas confirmação visual). */
export const ACTION_CONFIDENCE = 0.7;

export function useGestureActions() {
  useEffect(
    () =>
      bus.on("gesture", (g) => {
        const st = useOrion.getState();
        const gs = st.settings.gestures;
        let action = "Confirmação visual";
        const flash = (core: "gesto" | "especial", ms: number) => {
          st.setCore(core);
          setTimeout(() => useOrion.getState().core === core && useOrion.getState().setCore("repouso"), ms);
        };
        const important = g.confidence >= ACTION_CONFIDENCE;
        switch (g.id as GestureId) {
          case "mao_aberta":
            flash("gesto", 900);
            break;
          case "polegar_cima":
            action = "Confirmação positiva";
            flash("gesto", 900);
            st.toast("👍 Confirmação positiva reconhecida", "ok");
            break;
          case "mao_fechada":
            action = "Identificado (sem ação)";
            break;
          case "mao_direita_levantada":
            if (gs.raiseHandToListen && important && st.mic !== "escutando" && !st.chatBusy) {
              action = "Iniciar escuta por voz";
              listenOnce((text) => void sendMessage(text, { viaVoice: true }));
            } else action = gs.raiseHandToListen ? "Ignorado (confiança baixa ou ocupado)" : "Identificado (ação desativada)";
            break;
          case "bracos_levantados":
            action = "Animação especial";
            flash("especial", 2500);
            break;
          case "deslize_esquerda":
          case "deslize_direita":
            if (gs.navigation && important) {
              const idx = PAGES.findIndex((p) => p.id === st.page);
              const next = (idx + (g.id === "deslize_direita" ? 1 : -1) + PAGES.length) % PAGES.length;
              st.setPage(PAGES[next].id);
              action = `Navegar → ${PAGES[next].label}`;
            } else action = gs.navigation ? "Ignorado (confiança baixa)" : "Identificado (navegação desativada)";
            break;
          case "pinca":
            if (gs.pinchSelect && important) action = "Seleção (experimental)";
            else action = "Identificado";
            break;
        }
        st.logGesture({ id: g.id, confidence: g.confidence, at: Date.now(), action });
        if (g.id !== "polegar_cima" && g.id !== "mao_fechada") st.toast(`Gesto: ${GESTURE_LABELS[g.id]} — ${action}`, "info");
      }),
    [],
  );
}

/** Dispara os lembretes salvos no servidor como notificações do navegador (enquanto o Orion estiver aberto). */
export function useReminderScheduler() {
  useEffect(() => {
    let stopped = false;
    const check = async () => {
      try {
        const reminders = await api.reminders.list();
        for (const r of reminders) {
          if (r.fired || new Date(r.at).getTime() > Date.now()) continue;
          await api.reminders.fired(r.id);
          if ("Notification" in window && Notification.permission === "granted") new Notification("Orion — lembrete", { body: r.text });
          useOrion.getState().toast(`⏰ Lembrete: ${r.text}`, "ok");
          window.dispatchEvent(new Event("orion:data-changed"));
        }
      } catch {
        /* servidor indisponível: tenta de novo no próximo ciclo */
      }
    };
    void check();
    const id = setInterval(() => !stopped && void check(), 20_000);
    return () => {
      stopped = true;
      clearInterval(id);
    };
  }, []);
}

export function useServerStatus() {
  useEffect(() => {
    void refreshStatus();
    const id = setInterval(() => void refreshStatus(), 30_000);
    return () => clearInterval(id);
  }, []);
}

/** Sincroniza a página com o hash da URL (botão voltar funciona, sem recarregar). */
export function useHashNavigation() {
  const page = useOrion((s) => s.page);
  useEffect(() => {
    const fromHash = () => {
      const h = location.hash.replace("#/", "") as Page;
      if (PAGES.some((p) => p.id === h) && h !== useOrion.getState().page) useOrion.getState().setPage(h);
    };
    fromHash();
    window.addEventListener("hashchange", fromHash);
    return () => window.removeEventListener("hashchange", fromHash);
  }, []);
  useEffect(() => {
    if (location.hash !== `#/${page}`) history.pushState(null, "", `#/${page}`);
  }, [page]);
}
