// Exibe a câmera ao vivo com as sobreposições de rastreamento.
import { useEffect, useRef } from "react";
import { useOrion, type ViewMode } from "../store";
import { drawFrame } from "../vision/draw";
import { getVisionEngine } from "../vision/engine";

const STATUS: Record<string, string> = {
  desligada: "Câmera desligada",
  aguardando_permissao: "Aguardando permissão…",
  inicializando: "Inicializando câmera…",
  carregando_modelos: "Carregando modelos de visão computacional…",
  ativa: "Detectando movimentos",
  pausada: "Processamento pausado",
  erro: "Erro de câmera",
};

export function VisionView({ compact = false, modeOverride }: { compact?: boolean; modeOverride?: ViewMode }) {
  const ref = useRef<HTMLCanvasElement>(null);
  const camera = useOrion((s) => s.camera);
  const cameraError = useOrion((s) => s.cameraError);
  const storeMode = useOrion((s) => s.viewMode);
  const viewMode = modeOverride ?? storeMode;
  const mirror = useOrion((s) => s.settings.camera.mirror);
  const active = camera === "ativa" || camera === "pausada";

  useEffect(() => {
    if (!active) return;
    const canvas = ref.current!;
    const ctx = canvas.getContext("2d")!;
    const engine = getVisionEngine();
    let raf = 0;
    const loop = (t: number) => {
      raf = requestAnimationFrame(loop);
      const rect = canvas.getBoundingClientRect();
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      const w = Math.round(rect.width * dpr);
      const h = Math.round(rect.height * dpr);
      if (canvas.width !== w || canvas.height !== h) {
        canvas.width = w;
        canvas.height = h;
      }
      drawFrame(ctx, engine.video, engine.latest, { mode: viewMode, mirror, showVideo: true, time: t });
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, [active, viewMode, mirror]);

  return (
    <div className="vision-stage" style={compact ? { aspectRatio: "16 / 10" } : undefined}>
      {active ? (
        <canvas ref={ref} aria-label="Imagem da câmera com rastreamento de corpo e mãos" />
      ) : (
        <div className="vision-overlay">
          <div>
            <div style={{ fontSize: 40, color: "var(--cyan)" }}>◉</div>
            <div>{STATUS[camera]}</div>
            {camera === "erro" && cameraError && <div className="notice err" style={{ marginTop: 10 }}>{cameraError}</div>}
            {camera === "desligada" && <div className="small" style={{ marginTop: 6 }}>A imagem é processada localmente e não é gravada.</div>}
          </div>
        </div>
      )}
      {active && (
        <>
          <span className="chip live live-badge"><span className="dot" />CÂMERA AO VIVO</span>
          <span className={`chip vision-status ${camera === "ativa" ? "on" : "warn"}`}><span className="dot" />{STATUS[camera]}</span>
        </>
      )}
    </div>
  );
}
