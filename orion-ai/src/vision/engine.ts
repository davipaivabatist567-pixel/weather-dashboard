// Motor de visão computacional: câmera (getUserMedia) + MediaPipe Tasks Vision
// (PoseLandmarker e HandLandmarker). Todo o processamento é local, no navegador.
// Nenhum quadro é gravado ou enviado para fora sem uma ação explícita do usuário.
import { FilesetResolver, HandLandmarker, PoseLandmarker } from "@mediapipe/tasks-vision";
import { bus } from "../lib/bus";
import { STANDALONE } from "../lib/env";
import { useOrion } from "../store";
import { GestureController, optionsFromSensitivity } from "./gestureController";
import { bodyMetrics, classifyHand, classifyPose, SwipeDetector, type GestureCandidate, type Pt } from "./gestures";
import { LandmarkSmoother } from "./smoothing";

const MODEL_URLS = {
  pose: {
    local: "/models/pose_landmarker_lite.task",
    remote: "https://storage.googleapis.com/mediapipe-models/pose_landmarker/pose_landmarker_lite/float16/1/pose_landmarker_lite.task",
  },
  hand: {
    local: "/models/hand_landmarker.task",
    remote: "https://storage.googleapis.com/mediapipe-models/hand_landmarker/hand_landmarker/float16/1/hand_landmarker.task",
  },
};

export interface HandFrame {
  label: string;
  score: number;
  image: Pt[];
  world: Pt[];
  lastSeen: number;
}

export interface VisionFrame {
  t: number;
  pose: Pt[] | null;
  hands: HandFrame[];
  candidates: GestureCandidate[];
}

// Versão HTML: o WASM vem da CDN (versão fixa, igual à do pacote instalado).
const WASM_PATH = STANDALONE ? "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@1.1.0/wasm" : "/mediapipe/wasm";

async function pickModel(m: { local: string; remote: string }) {
  if (STANDALONE) return m.remote;
  try {
    const r = await fetch(m.local, { method: "HEAD" });
    const type = r.headers.get("content-type") ?? "";
    if (r.ok && !type.includes("text/html")) return m.local;
  } catch {
    /* sem modelo local */
  }
  return m.remote;
}

function describeCameraError(err: unknown): string {
  const name = err instanceof DOMException ? err.name : "";
  if (!window.isSecureContext) return "A câmera exige HTTPS (ou http://localhost). Abra o Orion em um endereço seguro.";
  if (!navigator.mediaDevices?.getUserMedia) return "Este navegador não oferece acesso à câmera (getUserMedia indisponível).";
  switch (name) {
    case "NotAllowedError":
    case "SecurityError":
      return "Permissão da câmera negada. Libere o acesso nas configurações do navegador e tente novamente.";
    case "NotFoundError":
    case "OverconstrainedError":
      return "Nenhuma câmera compatível foi encontrada.";
    case "NotReadableError":
      return "A câmera está em uso por outro aplicativo.";
    default:
      return `Erro de câmera: ${err instanceof Error ? err.message : String(err)}`;
  }
}

class VisionEngine {
  readonly video: HTMLVideoElement;
  private stream: MediaStream | null = null;
  private pose: PoseLandmarker | null = null;
  private hands: HandLandmarker | null = null;
  private modelsLoading: Promise<void> | null = null;
  private raf = 0;
  private paused = false;
  private lastProcess = 0;
  private lastVideoTime = -1;
  private poseSmoother = new LandmarkSmoother(1.0, 0.05);
  private handSmoothers = new Map<string, LandmarkSmoother>();
  private swipe = new SwipeDetector();
  private prevCenterX: number | null = null;
  private prevT = 0;
  private frameTimes: number[] = [];
  private inferTimes: number[] = [];
  private lastDiag = 0;
  private handMemory: HandFrame[] = [];
  readonly controller = new GestureController(optionsFromSensitivity(5));
  latest: VisionFrame = { t: 0, pose: null, hands: [], candidates: [] };

  constructor() {
    this.video = document.createElement("video");
    this.video.muted = true;
    this.video.playsInline = true;
    this.video.setAttribute("playsinline", "");
  }

  get running() {
    return !!this.stream;
  }

  async start(deviceId?: string | null) {
    const st = useOrion.getState();
    if (this.stream) return;
    st.set({ camera: "aguardando_permissao", cameraError: null });
    const [w, h] = st.settings.camera.resolution.split("x").map(Number);
    try {
      if (!navigator.mediaDevices?.getUserMedia) throw new Error("getUserMedia indisponível");
      this.stream = await navigator.mediaDevices.getUserMedia({
        audio: false,
        video: deviceId ? { deviceId: { exact: deviceId }, width: { ideal: w }, height: { ideal: h } } : { facingMode: "user", width: { ideal: w }, height: { ideal: h } },
      });
    } catch (err) {
      this.stream = null;
      st.set({ camera: "erro", cameraError: describeCameraError(err) });
      return;
    }
    st.set({ camera: "inicializando" });
    this.video.srcObject = this.stream;
    try {
      await this.video.play();
    } catch (err) {
      this.stop();
      useOrion.getState().set({ camera: "erro", cameraError: `Não foi possível reproduzir o vídeo: ${String(err)}` });
      return;
    }
    // Lista as câmeras (os nomes só ficam disponíveis após a permissão)
    try {
      const devices = await navigator.mediaDevices.enumerateDevices();
      useOrion.getState().set({ cameras: devices.filter((d) => d.kind === "videoinput") });
    } catch {
      /* ignora */
    }
    const track = this.stream?.getVideoTracks()[0];
    const s = track?.getSettings();
    useOrion.getState().set({ vision: { ...useOrion.getState().vision, resolution: s?.width ? `${s.width}×${s.height}` : null } });

    if (!this.pose || !this.hands) {
      useOrion.getState().set({ camera: "carregando_modelos" });
      try {
        await this.loadModels();
      } catch (err) {
        this.stop();
        useOrion.getState().set({
          camera: "erro",
          cameraError: `Falha ao carregar os modelos de visão computacional (MediaPipe). Verifique a conexão. Detalhe: ${err instanceof Error ? err.message : String(err)}`,
        });
        return;
      }
    }
    if (!this.stream) return; // desligada durante o carregamento
    this.paused = false;
    useOrion.getState().set({ camera: "ativa" });
    this.loop();
  }

  private loadModels() {
    this.modelsLoading ??= (async () => {
      const fileset = await FilesetResolver.forVisionTasks(WASM_PATH);
      const [poseUrl, handUrl] = await Promise.all([pickModel(MODEL_URLS.pose), pickModel(MODEL_URLS.hand)]);
      const make = async (delegate: "GPU" | "CPU") => {
        const pose = await PoseLandmarker.createFromOptions(fileset, {
          baseOptions: { modelAssetPath: poseUrl, delegate },
          runningMode: "VIDEO",
          numPoses: 1,
          minPoseDetectionConfidence: 0.5,
          minPosePresenceConfidence: 0.5,
          minTrackingConfidence: 0.5,
        });
        const hands = await HandLandmarker.createFromOptions(fileset, {
          baseOptions: { modelAssetPath: handUrl, delegate },
          runningMode: "VIDEO",
          numHands: 2,
          minHandDetectionConfidence: 0.5,
          minHandPresenceConfidence: 0.5,
          minTrackingConfidence: 0.5,
        });
        return { pose, hands };
      };
      let delegate: "GPU" | "CPU" = "GPU";
      let m: Awaited<ReturnType<typeof make>>;
      try {
        m = await make("GPU");
      } catch {
        delegate = "CPU";
        m = await make("CPU");
      }
      this.pose = m.pose;
      this.hands = m.hands;
      useOrion.getState().set({ vision: { ...useOrion.getState().vision, delegate } });
    })().catch((err) => {
      this.modelsLoading = null;
      throw err;
    });
    return this.modelsLoading;
  }

  /** Desliga a câmera imediatamente (para todas as trilhas de vídeo). */
  stop() {
    cancelAnimationFrame(this.raf);
    this.raf = 0;
    this.stream?.getTracks().forEach((t) => t.stop());
    this.stream = null;
    this.video.pause();
    this.video.srcObject = null;
    this.latest = { t: 0, pose: null, hands: [], candidates: [] };
    this.handMemory = [];
    this.controller.reset();
    this.swipe.reset();
    this.poseSmoother.reset();
    this.handSmoothers.clear();
    this.frameTimes = [];
    this.inferTimes = [];
    bus.emit("pinchMove", null);
    const st = useOrion.getState();
    if (st.camera !== "erro") st.set({ camera: "desligada" });
    st.set({ vision: { ...st.vision, fps: null, inferenceMs: null, hands: 0, handedness: [], body: null, gesture: null, resolution: null } });
  }

  pause() {
    if (!this.stream) return;
    this.paused = true;
    useOrion.getState().set({ camera: "pausada" });
  }

  resume() {
    if (!this.stream) return;
    this.paused = false;
    useOrion.getState().set({ camera: "ativa" });
  }

  async switchCamera(deviceId: string | null) {
    useOrion.getState().updateSettings((s) => ({ ...s, camera: { ...s.camera, deviceId } }));
    if (this.stream) {
      this.stop();
      await this.start(deviceId);
    }
  }

  /** Captura o quadro atual como JPEG (somente quando o usuário pede explicitamente). */
  captureFrame(): string | null {
    if (!this.stream || !this.video.videoWidth) return null;
    const c = document.createElement("canvas");
    c.width = this.video.videoWidth;
    c.height = this.video.videoHeight;
    c.getContext("2d")!.drawImage(this.video, 0, 0);
    return c.toDataURL("image/jpeg", 0.85);
  }

  private loop = () => {
    this.raf = requestAnimationFrame(this.loop);
    if (this.paused || !this.pose || !this.hands || this.video.readyState < 2) return;
    const now = performance.now();
    const st = useOrion.getState();
    // Frequência adaptativa: modo econômico ~10 fps; senão limitado pelo custo medido da inferência.
    const avgInfer = this.inferTimes.length ? this.inferTimes.reduce((a, b) => a + b, 0) / this.inferTimes.length : 0;
    const minInterval = Math.max(st.settings.performance.economy ? 100 : 33, avgInfer * 1.25);
    if (now - this.lastProcess < minInterval) return;
    if (this.video.currentTime === this.lastVideoTime) return;
    this.lastVideoTime = this.video.currentTime;
    this.lastProcess = now;

    const t0 = performance.now();
    const poseRes = this.pose.detectForVideo(this.video, now);
    const handRes = this.hands.detectForVideo(this.video, now);
    const inferMs = performance.now() - t0;
    this.inferTimes.push(inferMs);
    if (this.inferTimes.length > 20) this.inferTimes.shift();
    this.frameTimes.push(now);
    while (this.frameTimes.length && now - this.frameTimes[0] > 1000) this.frameTimes.shift();

    // Pose (suavizada)
    const rawPose = poseRes.landmarks[0] as Pt[] | undefined;
    const pose = rawPose ? this.poseSmoother.apply(rawPose, now) : null;
    if (!rawPose) this.poseSmoother.reset();

    // Mãos (suavizadas por lateralidade). Mãos que somem são mantidas por um instante
    // para a interface não piscar, e o rastreamento é retomado quando voltam.
    const hands: HandFrame[] = handRes.landmarks.map((lm, i) => {
      const cat = handRes.handedness[i]?.[0];
      const label = cat?.categoryName ?? `mao${i}`;
      let sm = this.handSmoothers.get(label);
      if (!sm) this.handSmoothers.set(label, (sm = new LandmarkSmoother(1.5, 0.03)));
      return {
        label,
        score: cat?.score ?? 0,
        image: sm.apply(lm as Pt[], now),
        world: (handRes.worldLandmarks[i] ?? []) as Pt[],
        lastSeen: now,
      };
    });
    const kept = this.handMemory.filter((h) => now - h.lastSeen < 400 && !hands.some((n) => n.label === h.label));
    this.handMemory = [...hands, ...kept];

    // Gestos candidatos
    const cal = st.settings.calibration;
    const candidates: GestureCandidate[] = [];
    for (const h of hands) {
      const c = classifyHand(h.world, h.image, h.score, cal);
      if (c) candidates.push(c);
    }
    if (pose) candidates.push(...classifyPose(pose));
    if (hands[0]) {
      const wrist = hands[0].image[0];
      const screenX = st.settings.camera.mirror ? 1 - wrist.x : wrist.x;
      const sw = this.swipe.push(now, screenX, wrist.y);
      if (sw) candidates.push(sw);
    } else this.swipe.reset();

    // Cursor experimental da pinça (ponta do indicador)
    if (st.settings.gestures.enabled && st.settings.gestures.pinchSelect && hands[0]) {
      const tip = hands[0].image[8];
      bus.emit("pinchMove", { x: st.settings.camera.mirror ? 1 - tip.x : tip.x, y: tip.y, active: candidates.some((c) => c.id === "pinca") });
    } else bus.emit("pinchMove", null);

    // Confirmação temporal
    if (st.settings.gestures.enabled) {
      this.controller.options = optionsFromSensitivity(st.settings.gestures.sensitivity);
      const disabled = st.settings.gestures.disabled;
      for (const fire of this.controller.update(now, candidates, (id) => !disabled.includes(id))) bus.emit("gesture", fire);
    }

    this.latest = { t: now, pose, hands: this.handMemory, candidates };

    // Atualiza o diagnóstico ~4x por segundo (evita re-renderizações excessivas)
    if (now - this.lastDiag > 250) {
      const dt = this.prevT ? (now - this.prevT) / 1000 : 0;
      const body = bodyMetrics(pose, this.prevCenterX, dt);
      this.prevCenterX = body.centerX;
      this.prevT = now;
      this.lastDiag = now;
      const best = [...candidates].sort((a, b) => b.confidence - a.confidence)[0] ?? null;
      st.set({
        vision: {
          ...st.vision,
          fps: this.frameTimes.length,
          inferenceMs: Math.round(avgInfer || inferMs),
          hands: hands.length,
          handedness: hands.map((h) => `${handName(h.label)} (${Math.round(h.score * 100)}%)`),
          body,
          gesture: best ? { id: best.id, confidence: best.confidence } : null,
        },
      });
    }
  };
}

/**
 * O MediaPipe rotula a lateralidade supondo imagem espelhada (selfie). Como o Orion
 * processa o quadro original da câmera, "Left" corresponde à mão direita da pessoa.
 */
export function handName(label: string) {
  return label === "Left" ? "Direita" : label === "Right" ? "Esquerda" : label;
}

let instance: VisionEngine | null = null;
export const getVisionEngine = () => (instance ??= new VisionEngine());
