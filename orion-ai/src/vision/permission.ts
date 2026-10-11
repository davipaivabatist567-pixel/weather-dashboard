// Estado da permissão da câmera no navegador e ligação automática.
// Nenhuma página consegue pular a permissão do navegador; o que o Orion faz é ligar a
// câmera sozinho quando o navegador JÁ guardou a permissão para este endereço.
import { useEffect, useState } from "react";
import { useOrion } from "../store";
import { getVisionEngine } from "./engine";

export type CameraPermission = "granted" | "prompt" | "denied" | "unknown";

export async function cameraPermission(): Promise<CameraPermission> {
  try {
    const status = await navigator.permissions.query({ name: "camera" as PermissionName });
    return status.state as CameraPermission;
  } catch {
    return "unknown"; // navegadores que não informam o estado (ex.: Firefox antigo)
  }
}

/** Acompanha o estado da permissão (atualiza quando o usuário muda nas configurações do site). */
export function useCameraPermission(): CameraPermission {
  const [state, setState] = useState<CameraPermission>("unknown");
  const camera = useOrion((s) => s.camera);
  useEffect(() => {
    let status: PermissionStatus | null = null;
    const update = () => status && setState(status.state as CameraPermission);
    navigator.permissions
      ?.query({ name: "camera" as PermissionName })
      .then((s) => {
        status = s;
        update();
        s.addEventListener("change", update);
      })
      .catch(() => setState("unknown"));
    return () => status?.removeEventListener("change", update);
  }, [camera]);
  return state;
}

/** Liga a câmera ao abrir o Orion se a opção estiver ativa e o navegador já tiver permitido. */
export function useCameraAutoStart() {
  useEffect(() => {
    const st = useOrion.getState();
    if (!st.settings.camera.autoStart) return;
    void cameraPermission().then((p) => {
      const now = useOrion.getState();
      if (p === "granted" && now.camera === "desligada") void getVisionEngine().start(now.settings.camera.deviceId);
    });
  }, []);
}
