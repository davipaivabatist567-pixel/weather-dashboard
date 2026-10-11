// Núcleo holográfico do Orion: animação em Canvas que reflete o estado do sistema.
import { useEffect, useRef } from "react";
import { useOrion, type CoreState } from "../store";

const LABELS: Record<CoreState, string> = {
  repouso: "Em repouso",
  escuta: "Escutando",
  processando: "Processando",
  falando: "Respondendo",
  gesto: "Gesto reconhecido",
  erro: "Erro",
  especial: "Modo laboratório",
};

export function HoloCore({ size = 340, showLabel = true }: { size?: number; showLabel?: boolean }) {
  const ref = useRef<HTMLCanvasElement>(null);
  const core = useOrion((s) => s.core);
  const reduced = useOrion((s) => s.settings.appearance.reducedMotion || s.settings.performance.economy);
  const stateRef = useRef(core);
  stateRef.current = core;

  useEffect(() => {
    const canvas = ref.current!;
    const ctx = canvas.getContext("2d")!;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = size * dpr;
    canvas.height = size * dpr;
    ctx.scale(dpr, dpr);
    let raf = 0;
    let changedAt = performance.now();
    let last: CoreState = stateRef.current;
    const c = size / 2;

    const draw = (t: number) => {
      const st = stateRef.current;
      if (st !== last) {
        last = st;
        changedAt = t;
      }
      const since = t - changedAt;
      ctx.clearRect(0, 0, size, size);
      const color = st === "erro" ? "255,77,109" : st === "gesto" ? "61,255,168" : st === "especial" ? "190,120,255" : "0,229,255";
      const speed = reduced ? 0.25 : 1;
      const time = t * speed;

      // Pulso base
      let pulse = 0.5 + 0.5 * Math.sin(time / 900);
      if (st === "falando") pulse = 0.5 + 0.5 * Math.abs(Math.sin(time / 120) * Math.sin(time / 333));
      if (st === "processando") pulse = 0.5 + 0.5 * Math.sin(time / 200);
      const r0 = size * 0.16 * (1 + pulse * (st === "falando" ? 0.25 : 0.08));

      // Brilho
      const g = ctx.createRadialGradient(c, c, 0, c, c, size * 0.45);
      g.addColorStop(0, `rgba(${color},${0.35 + pulse * 0.2})`);
      g.addColorStop(0.35, `rgba(${color},0.08)`);
      g.addColorStop(1, `rgba(${color},0)`);
      ctx.fillStyle = g;
      ctx.fillRect(0, 0, size, size);

      // Núcleo
      ctx.shadowColor = `rgb(${color})`;
      ctx.shadowBlur = 25;
      ctx.fillStyle = `rgba(${color},0.9)`;
      ctx.beginPath();
      ctx.arc(c, c, r0 * 0.45, 0, Math.PI * 2);
      ctx.fill();
      ctx.lineWidth = 2;
      ctx.strokeStyle = `rgba(${color},0.9)`;
      ctx.beginPath();
      ctx.arc(c, c, r0, 0, Math.PI * 2);
      ctx.stroke();

      // Anéis (rotação mais rápida ao processar)
      const rot = st === "processando" ? 2.6 : st === "especial" ? 3.5 : 0.6;
      const rings = [0.3, 0.38, 0.46];
      rings.forEach((rr, i) => {
        const dir = i % 2 ? -1 : 1;
        const a = (time / 1000) * rot * dir * (1 + i * 0.3);
        ctx.lineWidth = i === 1 ? 3 : 1.5;
        ctx.strokeStyle = `rgba(${color},${0.25 + 0.15 * (2 - i)})`;
        ctx.shadowBlur = 10;
        const segs = 3 + i;
        for (let s = 0; s < segs; s++) {
          const start = a + (s * Math.PI * 2) / segs;
          ctx.beginPath();
          ctx.arc(c, c, size * rr, start, start + (Math.PI * 2) / segs - 0.35);
          ctx.stroke();
        }
      });

      // Ondas de escuta
      if (st === "escuta") {
        for (let k = 0; k < 3; k++) {
          const p = ((time / 1400 + k / 3) % 1);
          ctx.strokeStyle = `rgba(${color},${(1 - p) * 0.6})`;
          ctx.lineWidth = 2;
          ctx.beginPath();
          ctx.arc(c, c, r0 + p * size * 0.32, 0, Math.PI * 2);
          ctx.stroke();
        }
      }
      // Confirmação de gesto / erro: onda única
      if (st === "gesto" || st === "erro" || st === "especial") {
        const p = Math.min(1, since / 900);
        ctx.strokeStyle = `rgba(${color},${1 - p})`;
        ctx.lineWidth = 4;
        ctx.beginPath();
        ctx.arc(c, c, r0 + p * size * 0.35, 0, Math.PI * 2);
        ctx.stroke();
      }
      if (st === "erro") {
        ctx.shadowBlur = 0;
        ctx.fillStyle = "#fff";
        ctx.font = `bold ${Math.round(size * 0.08)}px Inter, sans-serif`;
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.fillText("!", c, c + 1);
      }
      // Marcas externas
      ctx.shadowBlur = 0;
      ctx.strokeStyle = `rgba(${color},0.35)`;
      ctx.lineWidth = 1;
      for (let k = 0; k < 60; k++) {
        const ang = (k / 60) * Math.PI * 2 + time / 20000;
        const r1 = size * 0.485;
        const r2 = r1 - (k % 5 === 0 ? 8 : 4);
        ctx.beginPath();
        ctx.moveTo(c + Math.cos(ang) * r1, c + Math.sin(ang) * r1);
        ctx.lineTo(c + Math.cos(ang) * r2, c + Math.sin(ang) * r2);
        ctx.stroke();
      }
      raf = requestAnimationFrame(draw);
    };
    raf = requestAnimationFrame(draw);
    return () => cancelAnimationFrame(raf);
  }, [size, reduced]);

  return (
    <div className="core-wrap">
      <canvas ref={ref} className="core-canvas" style={{ maxWidth: size }} role="img" aria-label={`Núcleo do Orion: ${LABELS[core]}`} />
      {showLabel && <div className="core-label" aria-live="polite">{LABELS[core]}</div>}
    </div>
  );
}
