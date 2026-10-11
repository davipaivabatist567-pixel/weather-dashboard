// Orion Ring: controle físico de um botão. O anel (ou qualquer teclado Bluetooth) envia uma
// tecla; o Orion transforma clique / duplo clique / pressão longa em ações.
//   clique  → liga ou desliga o microfone (ditado)
//   duplo   → lê em voz alta a última resposta (ou para a leitura)
//   longo   → interrompe tudo: resposta em andamento, fala e microfone
// Por segurança, o anel NUNCA confirma exclusões: isso continua exigindo um toque na tela.
import { useEffect } from "react";
import { useOrion } from "../store";
import { abortChat, sendMessage } from "./actions";
import { RingDecoder, type RingEvent } from "./ringDecoder";
import { listenOnce, speak, speechRecognitionSupported, speechSynthesisSupported, stopListening, stopSpeaking } from "./voice";

export const RING_LABELS: Record<RingEvent, string> = { clique: "Clique", duplo: "Duplo clique", longo: "Pressão longa" };
export const RING_DEFAULT_KEY = "F9";

/** Identificador estável da tecla (e.code; teclas sem code, como as de mídia, usam e.key). */
export const keyId = (e: KeyboardEvent) => e.code || e.key;

export function runRingAction(event: RingEvent) {
  const st = useOrion.getState();
  let result = "";
  switch (event) {
    case "clique":
      if (st.mic === "escutando") {
        stopListening();
        result = "Microfone desligado";
      } else if (!speechRecognitionSupported) {
        result = "Ditado indisponível neste navegador/app";
        st.toast("O ditado por voz não existe neste navegador/app. Use o Chrome (ou digite).", "erro");
      } else if (st.chatBusy) {
        result = "Ignorado (Orion respondendo)";
      } else {
        listenOnce((t) => void sendMessage(t, { viaVoice: true }));
        result = "Microfone ligado";
      }
      break;
    case "duplo": {
      if (st.speaking) {
        stopSpeaking();
        result = "Leitura interrompida";
        break;
      }
      const last = [...st.messages].reverse().find((m) => m.role === "assistant" && !m.streaming && m.content.trim());
      if (!last) result = "Nada para ler ainda";
      else if (!speechSynthesisSupported) result = "Síntese de voz indisponível";
      else if (st.settings.voice.muted) result = "Orion está silenciado";
      else {
        speak(last.content);
        result = "Lendo a última resposta";
      }
      break;
    }
    case "longo":
      abortChat();
      stopSpeaking();
      stopListening();
      result = "Tudo interrompido";
      break;
  }
  st.logRing({ event, at: Date.now(), result });
  st.toast(`Anel: ${RING_LABELS[event]} — ${result}`, "info");
}

const isTyping = (t: EventTarget | null) => {
  const el = t as HTMLElement | null;
  return !!el && (el.tagName === "INPUT" || el.tagName === "TEXTAREA" || el.tagName === "SELECT" || el.isContentEditable);
};

export function useRing() {
  useEffect(() => {
    const decoder = new RingDecoder((e) => {
      if (useOrion.getState().settings.ring.enabled) runRingAction(e);
    });
    const matches = (e: KeyboardEvent) => {
      const { enabled, key } = useOrion.getState().settings.ring;
      if (!enabled || keyId(e) !== key) return false;
      // Uma tecla de caractere não pode roubar a digitação de um campo de texto.
      return !(e.key.length === 1 && isTyping(e.target));
    };
    const down = (e: KeyboardEvent) => {
      const st = useOrion.getState();
      if (st.ringLearning) {
        e.preventDefault();
        st.set({ ringLearning: false });
        if (e.key === "Escape") return st.toast("Aprendizado da tecla cancelado.");
        const id = keyId(e);
        st.updateSettings((s) => ({ ...s, ring: { ...s.ring, key: id } }));
        st.toast(`Tecla do anel: ${id}`, "ok");
        return;
      }
      if (!matches(e)) return;
      e.preventDefault();
      if (!e.repeat) decoder.down();
    };
    const up = (e: KeyboardEvent) => {
      if (!matches(e)) return;
      e.preventDefault();
      decoder.up();
    };
    window.addEventListener("keydown", down, true);
    window.addEventListener("keyup", up, true);
    return () => {
      window.removeEventListener("keydown", down, true);
      window.removeEventListener("keyup", up, true);
      decoder.reset();
    };
  }, []);
}
