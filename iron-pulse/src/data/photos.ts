import localPhotos from "./local-photos.json";

/**
 * Fotografias (Unsplash, licença Unsplash: uso comercial livre). Id = final do endereço unsplash.com/photos/<id>.
 * Enquanto não forem baixadas (`npm run fotos`), carregam direto do Unsplash.
 * `position` ajusta o enquadramento quando a foto é recortada (CSS object-position).
 */
export const photos = {
  hero: { id: "qZ-U9z4TQ6A", alt: "Atleta levantando uma barra com anilhas em uma academia", position: "50% 35%" },
  musculacao: { id: "mi4Gfdl36yg", alt: "Aparelhos de musculação alinhados na academia", position: "50% 50%" },
  cardio: { id: "CC8kc3ONwtk", alt: "Fileira de esteiras diante de janelas amplas", position: "50% 50%" },
  pesos: { id: "VJ2s0c20qCo", alt: "Halteres organizados em um suporte", position: "50% 50%" },
  funcional: { id: "U5kQvbQWoG0", alt: "Atleta treinando com cordas navais", position: "50% 40%" },
  ambiente: { id: "_MNnA-qojT4", alt: "Ambiente interno da academia com piso quadriculado", position: "50% 50%" },
  motivacao: { id: "9dzWZQWZMdE", alt: "Atleta concentrado levantando uma barra", position: "50% 30%" },
  equipe1: { id: "mviOOZJ-dZA", alt: "Foto ilustrativa de um atleta em pose de força", position: "50% 25%" },
  equipe2: { id: "qo1pyCD02t4", alt: "Foto ilustrativa de um atleta fazendo barra fixa", position: "50% 30%" },
  equipe3: { id: "cwhGcdX1ZDI", alt: "Foto ilustrativa de treino acompanhado na academia", position: "50% 35%" },
} as const;

export type PhotoKey = keyof typeof photos;

export const PHOTO_WIDTHS = [640, 1280, 1920] as const;

const local = localPhotos as Partial<Record<PhotoKey, boolean>>;

export function photoSrc(key: PhotoKey, width: number) {
  if (local[key]) return `/photos/${key}-${width}.webp`;
  return `https://unsplash.com/photos/${photos[key].id}/download?w=${width}`;
}

export function photoSrcSet(key: PhotoKey) {
  return PHOTO_WIDTHS.map((w) => `${photoSrc(key, w)} ${w}w`).join(", ");
}
