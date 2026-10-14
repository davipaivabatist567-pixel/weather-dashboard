// Sobreposições do "modo VISION": holograma em tela cheia e a foto tirada por comando.
import { useCallback } from "react";
import { sendMessage } from "../lib/actions";
import { IN_ANDROID_APP } from "../lib/env";
import { useOrion } from "../store";
import { Hologram } from "./Hologram";

export function HologramOverlay() {
  const open = useOrion((s) => s.hologramOpen);
  const fechar = useCallback(() => useOrion.getState().set({ hologramOpen: false }), []);
  if (!open) return null;
  return (
    <div className="holo-overlay" role="dialog" aria-label="Holograma do Orion em tela cheia">
      <Hologram fullscreen onClose={fechar} />
    </div>
  );
}

export function PhotoOverlay() {
  const photo = useOrion((s) => s.photo);
  const ai = useOrion((s) => !!s.server?.ai.configured);
  if (!photo) return null;
  const fechar = () => useOrion.getState().set({ photo: null });
  const nome = `orion-foto-${new Date(photo.at).toISOString().slice(0, 19).replace(/[:T]/g, "-")}.jpg`;
  const perguntar = () => {
    const base64 = photo.data.split(",")[1] ?? "";
    useOrion.getState().setPage("assistente");
    void sendMessage("O que tem nesta foto? Descreva o que você vê.", {
      attachments: [{ name: nome, kind: "image", mediaType: "image/jpeg", data: base64 }],
    });
    fechar();
  };
  return (
    <div className="photo-overlay" role="dialog" aria-label="Foto tirada">
      <div className="panel photo-box">
        <img src={photo.data} alt="Foto tirada pela câmera" />
        <p className="small muted">A foto fica só neste aparelho. Ela só sai daqui se você pedir para a IA analisar.</p>
        <div className="row">
          {!IN_ANDROID_APP && (
            <a className="btn" href={photo.data} download={nome}>Salvar</a>
          )}
          <button className="btn primary" onClick={perguntar} disabled={!ai} title={ai ? "" : "Requer IA conectada"}>Perguntar à IA sobre a foto</button>
          <button className="btn ghost" onClick={fechar}>Fechar e apagar</button>
        </div>
      </div>
    </div>
  );
}
