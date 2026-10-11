// Diagnóstico da câmera passo a passo: mostra o que de fato funciona neste aparelho e,
// quando algo falha, o erro real (nome e mensagem), sem adivinhar.
import { IN_ANDROID_APP } from "../lib/env";
import { getVisionEngine, MODEL_URLS, pickModel, WASM_PATH } from "./engine";

export interface DiagStep {
  name: string;
  ok: boolean;
  detail: string;
}

const errText = (e: unknown) => (e instanceof DOMException || e instanceof Error ? `${e.name}: ${e.message}` : String(e));

async function head(url: string): Promise<string> {
  const r = await fetch(url, { method: "HEAD" });
  if (!r.ok) throw new Error(`HTTP ${r.status}`);
  const len = r.headers.get("content-length");
  return `HTTP ${r.status}${len ? `, ${(Number(len) / 1048576).toFixed(1)} MB` : ""}`;
}

export async function diagnoseCamera(): Promise<DiagStep[]> {
  const steps: DiagStep[] = [];
  const add = (name: string, ok: boolean, detail: string) => steps.push({ name, ok, detail });
  const run = async (name: string, fn: () => Promise<string> | string) => {
    try {
      add(name, true, await fn());
    } catch (e) {
      add(name, false, errText(e));
    }
  };

  add("Onde está rodando", true, `${IN_ANDROID_APP ? "App Android (WebView)" : "Navegador"} · ${location.protocol}//${location.host || "(arquivo)"}`);
  add("Contexto seguro (exigido pela câmera)", window.isSecureContext, window.isSecureContext ? "sim" : "NÃO: a câmera não funciona fora de https/localhost");
  const hasGum = typeof navigator.mediaDevices?.getUserMedia === "function";
  add("API de câmera (getUserMedia)", hasGum, hasGum ? "disponível" : "indisponível neste navegador");
  await run("Permissão da câmera", async () => {
    if (IN_ANDROID_APP) return "tratada pelo app (veja o próximo passo)";
    const s = await navigator.permissions.query({ name: "camera" as PermissionName });
    if (s.state === "denied") throw new Error("bloqueada (denied)");
    return s.state;
  });
  const engine = getVisionEngine();
  if (engine.running) {
    add("Abrir a câmera", true, "já está ativa");
  } else {
    await run("Abrir a câmera", async () => {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: "user" }, audio: false });
      const t = stream.getVideoTracks()[0];
      const s = t.getSettings();
      stream.getTracks().forEach((x) => x.stop());
      return `${t.label || "câmera"} · ${s.width ?? "?"}×${s.height ?? "?"}`;
    });
  }
  await run("Câmeras encontradas", async () => {
    const n = (await navigator.mediaDevices.enumerateDevices()).filter((d) => d.kind === "videoinput").length;
    if (!n) throw new Error("nenhuma câmera listada");
    return String(n);
  });
  await run("WebAssembly", () => {
    if (typeof WebAssembly !== "object") throw new Error("indisponível");
    return "disponível";
  });
  await run("WebGL2 (aceleração por GPU)", () => {
    if (!document.createElement("canvas").getContext("webgl2")) throw new Error("indisponível (o Orion usará a CPU, mais lenta)");
    return "disponível";
  });
  await run("Arquivo do MediaPipe (WASM)", async () => `${WASM_PATH}: ${await head(`${WASM_PATH}/vision_wasm_internal.wasm`)}`);
  for (const [nome, m] of [["corpo", MODEL_URLS.pose], ["mãos", MODEL_URLS.hand]] as const) {
    await run(`Modelo de ${nome}`, async () => {
      const url = await pickModel(m);
      return `${url.startsWith("http") ? new URL(url).host : url}: ${await head(url)}`;
    });
  }
  return steps;
}
