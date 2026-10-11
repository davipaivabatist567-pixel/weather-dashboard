// Desenho da imagem da câmera e das sobreposições holográficas no Canvas.
import { HandLandmarker, PoseLandmarker } from "@mediapipe/tasks-vision";
import type { ViewMode } from "../store";
import type { VisionFrame } from "./engine";
import { handName } from "./engine";
import { GESTURE_LABELS, type Pt } from "./gestures";

const POSE_LINKS = PoseLandmarker.POSE_CONNECTIONS.filter((c) => c.start > 10 && c.end > 10); // corpo (sem o rosto detalhado)
const HAND_LINKS = HandLandmarker.HAND_CONNECTIONS;
const FINGERTIPS = [4, 8, 12, 16, 20];
const POSE_LABELS: Record<number, string> = {
  0: "cabeça", 11: "ombro E", 12: "ombro D", 13: "cotovelo E", 14: "cotovelo D", 15: "pulso E", 16: "pulso D",
  23: "quadril E", 24: "quadril D", 25: "joelho E", 26: "joelho D", 27: "tornozelo E", 28: "tornozelo D",
};

export interface DrawOptions {
  mode: ViewMode;
  mirror: boolean;
  showVideo: boolean;
  time: number;
}

export function drawFrame(ctx: CanvasRenderingContext2D, video: HTMLVideoElement, frame: VisionFrame, o: DrawOptions) {
  const { width: W, height: H } = ctx.canvas;
  ctx.save();
  ctx.clearRect(0, 0, W, H);

  // Ajusta o vídeo ao canvas (cover)
  const vw = video.videoWidth || W;
  const vh = video.videoHeight || H;
  const scale = Math.max(W / vw, H / vh);
  const dw = vw * scale;
  const dh = vh * scale;
  const ox = (W - dw) / 2;
  const oy = (H - dh) / 2;
  const P = (p: Pt) => ({ x: ox + (o.mirror ? 1 - p.x : p.x) * dw, y: oy + p.y * dh });

  if (o.showVideo && video.readyState >= 2) {
    ctx.save();
    if (o.mirror) {
      ctx.translate(W, 0);
      ctx.scale(-1, 1);
    }
    ctx.filter = o.mode === "scanner" ? "grayscale(0.7) brightness(0.55) contrast(1.2)" : o.mode === "laboratorio" ? "brightness(0.75) saturate(0.8)" : "none";
    ctx.drawImage(video, o.mirror ? W - ox - dw : ox, oy, dw, dh);
    ctx.restore();
    if (o.mode === "scanner") {
      ctx.fillStyle = "rgba(0, 40, 60, 0.35)";
      ctx.fillRect(0, 0, W, H);
    }
  }

  const glow = (color: string, blur: number) => {
    ctx.shadowColor = color;
    ctx.shadowBlur = blur;
  };

  // ---------- Corpo ----------
  if (frame.pose) {
    const pose = frame.pose;
    const visible = (i: number) => (pose[i]?.visibility ?? 1) > 0.5;
    ctx.lineWidth = o.mode === "normal" ? 2 : 3;
    ctx.strokeStyle = o.mode === "scanner" ? "rgba(0, 255, 230, 0.9)" : "rgba(0, 220, 255, 0.8)";
    glow("#00e5ff", o.mode === "normal" ? 4 : 12);
    for (const { start, end } of POSE_LINKS) {
      if (!visible(start) || !visible(end)) continue;
      const a = P(pose[start]);
      const b = P(pose[end]);
      ctx.beginPath();
      ctx.moveTo(a.x, a.y);
      ctx.lineTo(b.x, b.y);
      ctx.stroke();
    }
    for (const iStr of Object.keys(POSE_LABELS)) {
      const i = Number(iStr);
      if (!visible(i)) continue;
      const p = P(pose[i]);
      ctx.fillStyle = "#e0fdff";
      ctx.beginPath();
      ctx.arc(p.x, p.y, o.mode === "normal" ? 3 : 4.5, 0, Math.PI * 2);
      ctx.fill();
      if (o.mode === "laboratorio") {
        ctx.shadowBlur = 0;
        ctx.font = "10px 'JetBrains Mono', monospace";
        ctx.fillStyle = "rgba(160, 240, 255, 0.9)";
        ctx.fillText(`${POSE_LABELS[i]} ${Math.round((pose[i].visibility ?? 1) * 100)}%`, p.x + 6, p.y - 6);
        glow("#00e5ff", 12);
      }
    }
    // Retícula na cabeça (modo scanner/laboratório)
    if (o.mode !== "normal" && visible(0)) {
      const h = P(pose[0]);
      const r = 34 + Math.sin(o.time / 300) * 3;
      ctx.strokeStyle = "rgba(0, 255, 230, 0.6)";
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.arc(h.x, h.y, r, o.time / 600, o.time / 600 + Math.PI * 1.4);
      ctx.stroke();
    }
  }

  // ---------- Mãos ----------
  for (const hand of frame.hands) {
    const age = frame.t - hand.lastSeen;
    const alpha = age > 0 ? Math.max(0.15, 1 - age / 400) : 1;
    ctx.globalAlpha = alpha;
    ctx.lineWidth = 2;
    ctx.strokeStyle = "rgba(120, 180, 255, 0.95)";
    glow("#4aa3ff", o.mode === "normal" ? 6 : 14);
    for (const { start, end } of HAND_LINKS) {
      const a = P(hand.image[start]);
      const b = P(hand.image[end]);
      ctx.beginPath();
      ctx.moveTo(a.x, a.y);
      ctx.lineTo(b.x, b.y);
      ctx.stroke();
    }
    hand.image.forEach((pt, i) => {
      const p = P(pt);
      ctx.fillStyle = FINGERTIPS.includes(i) ? "#00ffd5" : "#dbeaff";
      ctx.beginPath();
      ctx.arc(p.x, p.y, FINGERTIPS.includes(i) ? 4 : 2.5, 0, Math.PI * 2);
      ctx.fill();
    });
    if (o.mode !== "normal") {
      const w = P(hand.image[0]);
      ctx.shadowBlur = 0;
      ctx.font = "11px 'JetBrains Mono', monospace";
      ctx.fillStyle = "#9fd8ff";
      ctx.fillText(`mão ${handName(hand.label).toLowerCase()} ${Math.round(hand.score * 100)}%`, w.x + 8, w.y + 16);
    }
    ctx.globalAlpha = 1;
  }

  // ---------- Elementos de HUD ----------
  ctx.shadowBlur = 0;
  if (o.mode === "scanner") {
    const y = ((o.time / 8) % (H + 40)) - 20;
    const grad = ctx.createLinearGradient(0, y - 20, 0, y + 20);
    grad.addColorStop(0, "rgba(0,255,230,0)");
    grad.addColorStop(0.5, "rgba(0,255,230,0.35)");
    grad.addColorStop(1, "rgba(0,255,230,0)");
    ctx.fillStyle = grad;
    ctx.fillRect(0, y - 20, W, 40);
    ctx.strokeStyle = "rgba(0,229,255,0.12)";
    ctx.lineWidth = 1;
    for (let x = 0; x < W; x += 40) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, H);
      ctx.stroke();
    }
    for (let yy = 0; yy < H; yy += 40) {
      ctx.beginPath();
      ctx.moveTo(0, yy);
      ctx.lineTo(W, yy);
      ctx.stroke();
    }
  }
  // Cantoneiras
  ctx.strokeStyle = "rgba(0,229,255,0.7)";
  ctx.lineWidth = 2;
  const c = 22;
  for (const [x, y, dx, dy] of [
    [8, 8, 1, 1],
    [W - 8, 8, -1, 1],
    [8, H - 8, 1, -1],
    [W - 8, H - 8, -1, -1],
  ]) {
    ctx.beginPath();
    ctx.moveTo(x, y + dy * c);
    ctx.lineTo(x, y);
    ctx.lineTo(x + dx * c, y);
    ctx.stroke();
  }
  if (o.mode === "laboratorio" && frame.candidates.length) {
    ctx.font = "12px 'JetBrains Mono', monospace";
    ctx.fillStyle = "#9ff";
    frame.candidates.forEach((cand, i) => {
      ctx.fillText(`${GESTURE_LABELS[cand.id]} · ${Math.round(cand.confidence * 100)}%`, 16, H - 16 - i * 16);
    });
  }
  ctx.restore();
}
