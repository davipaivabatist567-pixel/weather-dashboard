// Reconhecimento de fala (Web Speech API) e síntese de voz (speechSynthesis).
import { useOrion } from "../store";

// Tipos mínimos da Web Speech API (não fazem parte do lib.dom padrão em todos os ambientes)
interface SpeechRecognitionAlternativeLike {
  transcript: string;
  confidence: number;
}
interface SpeechRecognitionResultLike {
  isFinal: boolean;
  0: SpeechRecognitionAlternativeLike;
}
interface SpeechRecognitionEventLike extends Event {
  resultIndex: number;
  results: ArrayLike<SpeechRecognitionResultLike>;
}
interface SpeechRecognitionLike extends EventTarget {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  start(): void;
  stop(): void;
  abort(): void;
  onresult: ((e: SpeechRecognitionEventLike) => void) | null;
  onerror: ((e: Event & { error?: string }) => void) | null;
  onend: (() => void) | null;
  onstart: (() => void) | null;
}
type RecognitionCtor = new () => SpeechRecognitionLike;

const Recognition: RecognitionCtor | undefined =
  typeof window !== "undefined"
    ? ((window as unknown as { SpeechRecognition?: RecognitionCtor; webkitSpeechRecognition?: RecognitionCtor }).SpeechRecognition ??
      (window as unknown as { webkitSpeechRecognition?: RecognitionCtor }).webkitSpeechRecognition)
    : undefined;

export const speechRecognitionSupported = !!Recognition;
export const speechSynthesisSupported = typeof window !== "undefined" && "speechSynthesis" in window;

let rec: SpeechRecognitionLike | null = null;

const ERRORS: Record<string, string> = {
  "not-allowed": "Permissão do microfone negada. Libere o acesso nas configurações do navegador.",
  "service-not-allowed": "O serviço de reconhecimento de fala foi bloqueado pelo navegador.",
  "no-speech": "Não ouvi nada. Tente novamente.",
  "audio-capture": "Nenhum microfone encontrado.",
  network: "O reconhecimento de fala do navegador precisa de conexão com a internet.",
  "language-not-supported": "O navegador não reconhece fala em português neste dispositivo.",
};

/**
 * Escuta uma frase. O áudio é processado pelo serviço de fala do próprio navegador
 * (no Chrome, isso envolve os servidores do Google) — o Orion não grava nem armazena o áudio.
 */
export function listenOnce(onFinal: (text: string) => void) {
  const st = useOrion.getState();
  if (!Recognition) {
    st.set({ mic: "indisponivel", micError: "Este navegador não oferece reconhecimento de fala. Use o campo de texto (ou o Chrome/Edge)." });
    return;
  }
  stopListening();
  stopSpeaking();
  const r = new Recognition();
  rec = r;
  r.lang = "pt-BR";
  r.continuous = false;
  r.interimResults = true;
  let finalText = "";
  r.onstart = () => {
    useOrion.getState().set({ mic: "escutando", micError: null, interim: "" });
    useOrion.getState().setCore("escuta");
  };
  r.onresult = (e) => {
    let interim = "";
    for (let i = e.resultIndex; i < e.results.length; i++) {
      const res = e.results[i];
      if (res.isFinal) finalText += res[0].transcript;
      else interim += res[0].transcript;
    }
    useOrion.getState().set({ interim: finalText + interim });
  };
  r.onerror = (e) => {
    const code = e.error ?? "desconhecido";
    if (code === "aborted") return;
    useOrion.getState().set({ micError: ERRORS[code] ?? `Erro no reconhecimento de fala: ${code}` });
  };
  r.onend = () => {
    rec = null;
    const s = useOrion.getState();
    s.set({ mic: "desligado", interim: "" });
    if (s.core === "escuta") s.setCore("repouso");
    const text = finalText.trim();
    if (text) {
      s.set({ mic: "processando" });
      onFinal(text);
      if (useOrion.getState().mic === "processando") useOrion.getState().set({ mic: "desligado" });
    }
  };
  try {
    r.start();
  } catch (err) {
    st.set({ micError: `Não foi possível iniciar o microfone: ${String(err)}` });
  }
}

export function stopListening() {
  if (rec) {
    rec.abort();
    rec = null;
  }
  const s = useOrion.getState();
  if (s.mic === "escutando") s.set({ mic: "desligado", interim: "" });
  if (s.core === "escuta") s.setCore("repouso");
}

// ---------------- Síntese de voz ----------------

export function listVoices(): SpeechSynthesisVoice[] {
  if (!speechSynthesisSupported) return [];
  return window.speechSynthesis.getVoices();
}

export function pickVoice(voiceURI: string | null): SpeechSynthesisVoice | null {
  const voices = listVoices();
  if (voiceURI) {
    const v = voices.find((x) => x.voiceURI === voiceURI);
    if (v) return v;
  }
  return voices.find((v) => v.lang === "pt-BR") ?? voices.find((v) => v.lang.startsWith("pt")) ?? null;
}

/** Converte Markdown em texto adequado para leitura em voz alta. */
export function toSpeechText(md: string): string {
  return md
    .replace(/```[\s\S]*?```/g, " (bloco de código omitido na leitura) ")
    .replace(/`([^`]+)`/g, "$1")
    .replace(/!\[[^\]]*\]\([^)]*\)/g, "")
    .replace(/\[([^\]]+)\]\([^)]*\)/g, "$1")
    .replace(/^\s*\|.*\|\s*$/gm, "")
    .replace(/^#+\s*/gm, "")
    .replace(/[*_~>#]/g, "")
    .replace(/^\s*[-+]\s+/gm, "")
    .replace(/\n{2,}/g, ". ")
    .replace(/\s+/g, " ")
    .trim();
}

let speakSeq = 0;

export function speak(markdown: string) {
  const st = useOrion.getState();
  if (!speechSynthesisSupported) {
    st.toast("A síntese de voz não é suportada neste navegador.", "erro");
    return;
  }
  if (st.settings.voice.muted) return;
  const text = toSpeechText(markdown);
  if (!text) return;
  window.speechSynthesis.cancel();
  const seq = ++speakSeq;
  // Divide em frases para evitar o corte de falas longas em alguns navegadores
  const chunks = text.match(/[^.!?]+[.!?]*/g)?.map((c) => c.trim()).filter(Boolean) ?? [text];
  const voice = pickVoice(st.settings.voice.voiceURI);
  chunks.forEach((chunk, i) => {
    const u = new SpeechSynthesisUtterance(chunk);
    u.lang = voice?.lang ?? "pt-BR";
    if (voice) u.voice = voice;
    u.rate = st.settings.voice.rate;
    u.volume = st.settings.voice.volume;
    if (i === 0)
      u.onstart = () => {
        if (seq !== speakSeq) return;
        useOrion.getState().set({ speaking: true, mic: "respondendo" });
        useOrion.getState().setCore("falando");
      };
    if (i === chunks.length - 1) u.onend = u.onerror = () => finishSpeaking(seq);
    window.speechSynthesis.speak(u);
  });
}

function finishSpeaking(seq: number) {
  if (seq !== speakSeq) return;
  const s = useOrion.getState();
  s.set({ speaking: false, mic: s.mic === "respondendo" ? "desligado" : s.mic });
  if (s.core === "falando") s.setCore("repouso");
}

export function stopSpeaking() {
  if (!speechSynthesisSupported) return;
  speakSeq++;
  window.speechSynthesis.cancel();
  const s = useOrion.getState();
  s.set({ speaking: false, mic: s.mic === "respondendo" ? "desligado" : s.mic });
  if (s.core === "falando") s.setCore("repouso");
}
