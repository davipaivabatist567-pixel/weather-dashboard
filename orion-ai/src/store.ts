// Estado global do Orion (zustand). Configurações e histórico ficam no navegador;
// memória, projetos e tarefas ficam no backend.
import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { ChatAttachment, OrionMode, Permissions, ServerStatus } from "../shared/types";
import type { GestureId } from "./vision/gestures";
import { DEFAULT_CALIBRATION, type BodyMetrics, type Calibration } from "./vision/gestures";

export type Page = "inicio" | "assistente" | "visao" | "laboratorio" | "projetos" | "pesquisa" | "memoria" | "configuracoes";
export const PAGES: { id: Page; label: string; icon: string }[] = [
  { id: "inicio", label: "Início", icon: "◎" },
  { id: "assistente", label: "Assistente", icon: "◈" },
  { id: "visao", label: "Visão Computacional", icon: "◉" },
  { id: "laboratorio", label: "Laboratório", icon: "⌬" },
  { id: "projetos", label: "Meus Projetos", icon: "▦" },
  { id: "pesquisa", label: "Pesquisa", icon: "⌕" },
  { id: "memoria", label: "Memória", icon: "◇" },
  { id: "configuracoes", label: "Configurações", icon: "⚙" },
];

export type CoreState = "repouso" | "escuta" | "processando" | "falando" | "gesto" | "erro" | "especial";
export type ViewMode = "normal" | "scanner" | "laboratorio";
export type CameraStatus = "desligada" | "aguardando_permissao" | "inicializando" | "carregando_modelos" | "ativa" | "pausada" | "erro";
export type MicStatus = "indisponivel" | "desligado" | "aguardando" | "escutando" | "processando" | "respondendo";

export interface ChatMessage {
  id: string;
  role: "user" | "assistant" | "system";
  content: string;
  at: string;
  attachments?: Omit<ChatAttachment, "data">[];
  /** dados dos anexos — mantidos só em memória, nunca salvos no navegador */
  attachmentData?: ChatAttachment[];
  tools?: { id: string; label: string; ok?: boolean; summary?: string; risk: string }[];
  sources?: { title: string; url: string }[];
  pending?: { id: string; description: string; state: "aguardando" | "confirmada" | "cancelada" | "erro"; result?: string }[];
  error?: string;
  local?: boolean;
  streaming?: boolean;
  mode?: OrionMode;
}

export interface GestureLogEntry {
  id: GestureId;
  confidence: number;
  at: number;
  action: string;
}

export interface Settings {
  voice: { voiceURI: string | null; rate: number; volume: number; muted: boolean; autoSpeak: boolean };
  camera: { deviceId: string | null; resolution: "320x240" | "640x480" | "1280x720"; mirror: boolean };
  performance: { economy: boolean };
  gestures: {
    enabled: boolean;
    sensitivity: number;
    navigation: boolean;
    raiseHandToListen: boolean;
    pinchSelect: boolean;
    disabled: GestureId[];
  };
  calibration: Calibration;
  appearance: { particles: boolean; reducedMotion: boolean };
  privacy: { saveChatHistory: boolean; speechNoticeAccepted: boolean };
  permissions: Permissions;
  showDiagnostics: boolean;
}

export const DEFAULT_SETTINGS: Settings = {
  voice: { voiceURI: null, rate: 1, volume: 1, muted: false, autoSpeak: false },
  camera: { deviceId: null, resolution: "640x480", mirror: true },
  performance: { economy: false },
  gestures: { enabled: true, sensitivity: 5, navigation: false, raiseHandToListen: false, pinchSelect: false, disabled: [] },
  calibration: DEFAULT_CALIBRATION,
  appearance: { particles: true, reducedMotion: false },
  privacy: { saveChatHistory: true, speechNoticeAccepted: false },
  permissions: { readMemory: true, writeMemory: true, manageProjects: true, webSearch: true },
  showDiagnostics: true,
};

export interface VisionDiag {
  fps: number | null;
  inferenceMs: number | null;
  hands: number;
  handedness: string[];
  body: BodyMetrics | null;
  gesture: { id: GestureId; confidence: number } | null;
  delegate: "GPU" | "CPU" | null;
  resolution: string | null;
}

export interface Toast {
  id: number;
  text: string;
  kind: "info" | "ok" | "erro";
}

interface OrionState {
  page: Page;
  mode: OrionMode;
  viewMode: ViewMode;
  core: CoreState;
  settings: Settings;
  messages: ChatMessage[];
  chatBusy: boolean;
  server: ServerStatus | null;
  serverError: string | null;
  lastLatencyMs: number | null;
  camera: CameraStatus;
  cameraError: string | null;
  cameras: MediaDeviceInfo[];
  mic: MicStatus;
  micError: string | null;
  interim: string;
  speaking: boolean;
  vision: VisionDiag;
  gestureLog: GestureLogEntry[];
  toasts: Toast[];

  setPage: (p: Page) => void;
  setMode: (m: OrionMode) => void;
  setViewMode: (v: ViewMode) => void;
  setCore: (c: CoreState) => void;
  updateSettings: (fn: (s: Settings) => Settings) => void;
  resetSettings: () => void;
  addMessage: (m: ChatMessage) => void;
  patchMessage: (id: string, fn: (m: ChatMessage) => ChatMessage) => void;
  clearMessages: () => void;
  set: (patch: Partial<OrionState>) => void;
  logGesture: (e: GestureLogEntry) => void;
  toast: (text: string, kind?: Toast["kind"]) => void;
  dismissToast: (id: number) => void;
}

let toastSeq = 1;

export const useOrion = create<OrionState>()(
  persist(
    (set) => ({
      page: "inicio",
      mode: "assistente",
      viewMode: "normal",
      core: "repouso",
      settings: DEFAULT_SETTINGS,
      messages: [],
      chatBusy: false,
      server: null,
      serverError: null,
      lastLatencyMs: null,
      camera: "desligada",
      cameraError: null,
      cameras: [],
      mic: "desligado",
      micError: null,
      interim: "",
      speaking: false,
      vision: { fps: null, inferenceMs: null, hands: 0, handedness: [], body: null, gesture: null, delegate: null, resolution: null },
      gestureLog: [],
      toasts: [],

      setPage: (page) => set({ page }),
      setMode: (mode) => set({ mode }),
      setViewMode: (viewMode) => set({ viewMode }),
      setCore: (core) => set({ core }),
      updateSettings: (fn) => set((s) => ({ settings: fn(s.settings) })),
      resetSettings: () => set({ settings: DEFAULT_SETTINGS }),
      addMessage: (m) => set((s) => ({ messages: [...s.messages, m] })),
      patchMessage: (id, fn) => set((s) => ({ messages: s.messages.map((m) => (m.id === id ? fn(m) : m)) })),
      clearMessages: () => set({ messages: [] }),
      set: (patch) => set(patch),
      logGesture: (e) => set((s) => ({ gestureLog: [e, ...s.gestureLog].slice(0, 50) })),
      toast: (text, kind = "info") => {
        const id = toastSeq++;
        set((s) => ({ toasts: [...s.toasts, { id, text, kind }].slice(-4) }));
        setTimeout(() => set((s) => ({ toasts: s.toasts.filter((t) => t.id !== id) })), 4500);
      },
      dismissToast: (id) => set((s) => ({ toasts: s.toasts.filter((t) => t.id !== id) })),
    }),
    {
      name: "orion-state",
      version: 1,
      partialize: (s) => ({
        mode: s.mode,
        viewMode: s.viewMode,
        settings: s.settings,
        // Histórico só é salvo se o usuário permitir; anexos nunca são salvos.
        messages: s.settings.privacy.saveChatHistory
          ? s.messages
              .filter((m) => !m.streaming)
              .slice(-100)
              .map(({ attachmentData: _d, ...m }) => m)
          : [],
      }),
      merge: (persisted, current) => {
        const p = (persisted ?? {}) as Partial<OrionState>;
        return {
          ...current,
          ...p,
          settings: deepMerge(DEFAULT_SETTINGS, p.settings ?? {}),
        };
      },
    },
  ),
);

function deepMerge<T>(base: T, patch: unknown): T {
  if (typeof base !== "object" || base === null || Array.isArray(base)) return (patch ?? base) as T;
  const out: Record<string, unknown> = { ...(base as Record<string, unknown>) };
  if (patch && typeof patch === "object") {
    for (const [k, v] of Object.entries(patch)) {
      if (!(k in out)) continue;
      out[k] = deepMerge(out[k], v);
    }
  }
  return out as T;
}

export const uid = () => (crypto.randomUUID ? crypto.randomUUID() : String(Date.now() + Math.random()));
