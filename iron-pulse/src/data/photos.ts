import localPhotos from "./local-photos.json";

/**
 * Fotos do site.
 * - `own: true`: imagens da própria academia, já em public/photos/<chave>-640.webp e -1280.webp
 *   (recortadas da arte da Iron Pulse). Para trocar, substitua esses dois arquivos.
 * - `id`: foto do Unsplash (licença Unsplash: uso comercial livre), id = final de unsplash.com/photos/<id>.
 *   Enquanto não forem baixadas (`npm run fotos`), carregam direto do Unsplash.
 * `position` ajusta o enquadramento quando a foto é recortada (CSS object-position).
 */
type PhotoInfo = { alt: string; position: string } & ({ own: true; id?: never } | { id: string; own?: never });

export const photos = {
  hero: { own: true, alt: "Halteres com o monograma da academia em primeiro plano", position: "30% 50%" },
  musculacao: { own: true, alt: "Área de musculação com bancos e aparelhos sob luzes de LED", position: "50% 55%" },
  cardio: { own: true, alt: "Esteiras e bicicletas diante de janelas amplas", position: "50% 90%" },
  pesos: { own: true, alt: "Fileiras de halteres e bancos na área de pesos livres", position: "40% 55%" },
  funcional: { own: true, alt: "Espaço funcional com grama sintética, cordas, caixa de salto e medicine balls", position: "55% 55%" },
  vestiarios: { own: true, alt: "Vestiário com armários escuros, bancada e iluminação indireta", position: "50% 50%" },
  motivacao: { own: true, alt: "Atleta de costas, concentrado antes do treino", position: "60% 30%" },
  equipe1: { id: "mviOOZJ-dZA", alt: "Foto ilustrativa de um atleta em pose de força", position: "50% 25%" },
  equipe2: { id: "qo1pyCD02t4", alt: "Foto ilustrativa de um atleta fazendo barra fixa", position: "50% 30%" },
  equipe3: { own: true, alt: "Foto ilustrativa de um treinador acompanhando o agachamento de uma aluna", position: "40% 50%" },
} as const satisfies Record<string, PhotoInfo>;

export type PhotoKey = keyof typeof photos;

const local = localPhotos as Partial<Record<PhotoKey, boolean>>;
const isOwn = (key: PhotoKey) => "own" in photos[key];

function widths(key: PhotoKey) {
  return isOwn(key) ? [640, 1280] : [640, 1280, 1920];
}

export function photoSrc(key: PhotoKey, width: number) {
  const entry: PhotoInfo = photos[key];
  if (entry.own || local[key]) return `/photos/${key}-${width}.webp`;
  return `https://unsplash.com/photos/${entry.id}/download?w=${width}`;
}

export function photoSrcSet(key: PhotoKey) {
  return widths(key).map((w) => `${photoSrc(key, w)} ${w}w`).join(", ");
}
