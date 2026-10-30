import localPhotos from "./local-photos.json";

/**
 * Fotografias do site (Unsplash, licença Unsplash: uso comercial livre).
 * Cada foto é identificada pelo id da página em unsplash.com/photos/<id>.
 *
 * Enquanto as fotos não forem baixadas para `public/photos`, elas carregam direto do Unsplash.
 * Para baixar e otimizar todas: `npm run fotos` (veja o README).
 */
export const photos = {
  hero: { id: "kjicxykvfiA", alt: "Vista aérea de um resort com bangalôs sobre o mar azul-turquesa nas Maldivas" },
  maldivas: { id: "imQcNKOnLTA", alt: "Bangalôs sobre a água ligados por passarelas de madeira nas Maldivas" },
  paris: { id: "om99GJJsCVM", alt: "Torre Eiffel se erguendo sobre os telhados de Paris" },
  santorini: { id: "MdTtpxGlrz8", alt: "Igreja branca com cúpula azul diante do mar Egeu em Oia, Santorini" },
  noronha: { id: "LLXhVppSMeA", alt: "Morro Dois Irmãos se erguendo do mar em Fernando de Noronha" },
  gramado: { id: "z4TCAhwkjeE", alt: "Pinheiros altos às margens do Lago Negro, em Gramado" },
  dubai: { id: "4d7QSKv1uKo", alt: "Avenida com o horizonte de Dubai e o Burj Khalifa ao fundo" },
  romantica: { id: "NCZYHX71p4I", alt: "Casal abraçado assistindo ao pôr do sol na praia" },
  aventura: { id: "YaUv7f4d0-U", alt: "Viajante diante de um lago de montanha cercado por picos nos Alpes" },
  familia: { id: "dc8Yoc2lDTA", alt: "Família caminhando de mãos dadas na praia ao entardecer" },
  luxo: { id: "Fg6-6zK46aU", alt: "Piscina de borda infinita com vista para o oceano" },
  destaque: { id: "Oj0ykWKf5To", alt: "Asa de avião sobre um mar de nuvens ao pôr do sol" },
} as const;

export type PhotoKey = keyof typeof photos;

/** Larguras geradas para cada foto (o navegador escolhe a ideal para a tela). */
export const PHOTO_WIDTHS = [640, 1280, 1920] as const;

const local = localPhotos as Partial<Record<PhotoKey, boolean>>;

export function photoSrc(key: PhotoKey, width: number) {
  if (local[key]) return `/photos/${key}-${width}.webp`;
  return `https://unsplash.com/photos/${photos[key].id}/download?w=${width}`;
}

export function photoSrcSet(key: PhotoKey) {
  return PHOTO_WIDTHS.map((w) => `${photoSrc(key, w)} ${w}w`).join(", ");
}
