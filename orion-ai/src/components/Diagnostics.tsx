// Painel de diagnóstico: apenas valores medidos de verdade; o resto aparece como "Indisponível".
import { speechRecognitionSupported, speechSynthesisSupported } from "../lib/voice";
import { useOrion } from "../store";
import { GESTURE_LABELS } from "../vision/gestures";

const NA = "Indisponível";
const pct = (n: number | null | undefined) => (n === null || n === undefined ? NA : `${Math.round(n * 100)}%`);

const CAMERA: Record<string, string> = {
  desligada: "Desligada", aguardando_permissao: "Aguardando permissão", inicializando: "Inicializando",
  carregando_modelos: "Carregando modelos", ativa: "Ativa", pausada: "Pausada", erro: "Erro",
};
const MIC: Record<string, string> = {
  indisponivel: "Sem suporte", desligado: "Desligado", aguardando: "Aguardando comando", escutando: "Escutando",
  processando: "Processando", respondendo: "Respondendo",
};

export function DiagnosticsPanel({ onClose }: { onClose?: () => void }) {
  const s = useOrion();
  const v = s.vision;
  const cameraOn = s.camera === "ativa" || s.camera === "pausada";
  const rows: [string, string, [string, string][]][] = [
    ["sistema", "Sistema", [
      ["Servidor", s.serverError ? "Inacessível" : s.server ? "Conectado" : "Verificando…"],
      ["Modelo de IA", s.server ? (s.server.ai.configured ? s.server.ai.model ?? "Conectado" : "Não configurado") : NA],
      ["Provedor", s.server?.ai.provider ?? NA],
      ["Pesquisa na internet", s.server ? (s.server.ai.webSearch ? "Disponível" : "Indisponível") : NA],
      ["Latência (1º token)", s.lastLatencyMs !== null ? `${s.lastLatencyMs} ms` : NA],
      ["Armazenamento", s.server ? (s.server.storage.ok ? "OK" : "Falha") : NA],
      ["Memória persistente", s.server ? (s.server.memoryEnabled ? "Ativada" : "Desativada") : NA],
    ]],
    ["dispositivos", "Dispositivos", [
      ["Câmera", CAMERA[s.camera]],
      ["Resolução", cameraOn ? v.resolution ?? NA : NA],
      ["Microfone", speechRecognitionSupported ? MIC[s.mic] : "Sem suporte"],
      ["Síntese de voz", speechSynthesisSupported ? (s.speaking ? "Falando" : "Pronta") : "Sem suporte"],
    ]],
    ["visao", "Visão computacional", [
      ["Aceleração", cameraOn ? v.delegate ?? NA : NA],
      ["Taxa de quadros", cameraOn && v.fps !== null ? `${v.fps} fps` : NA],
      ["Tempo de inferência", cameraOn && v.inferenceMs !== null ? `${v.inferenceMs} ms` : NA],
      ["Corpo detectado", cameraOn && v.body ? (v.body.detected ? "Sim" : "Não") : NA],
      ["Confiança do corpo", cameraOn && v.body?.detected ? pct(v.body.confidence) : NA],
      ["Mãos detectadas", cameraOn ? String(v.hands) : NA],
      ["Gesto atual", cameraOn ? (v.gesture ? GESTURE_LABELS[v.gesture.id] : "Nenhum") : NA],
      ["Confiança do gesto", cameraOn && v.gesture ? pct(v.gesture.confidence) : NA],
    ]],
  ];
  return (
    <aside className="diag" aria-label="Painel de diagnóstico">
      <h2>
        DIAGNÓSTICO
        {onClose && <button className="btn small ghost" onClick={onClose} aria-label="Ocultar diagnóstico">✕</button>}
      </h2>
      {rows.map(([id, title, items]) => (
        <div className="diag-section" key={id}>
          <h3>{title}</h3>
          <table className="diag-table"><tbody>{items.map(([k, val]) => <tr key={k}><td>{k}</td><td>{val}</td></tr>)}</tbody></table>
        </div>
      ))}
      <p className="small muted">Valores medidos em tempo real neste dispositivo. Distâncias e posições são relativas (sem calibração métrica).</p>
    </aside>
  );
}
