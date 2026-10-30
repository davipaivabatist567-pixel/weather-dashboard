import type { PhotoKey } from "./photos";
import type { TripType } from "./planner";

export type Experience = {
  title: string;
  description: string;
  highlights: string[];
  tripType: TripType;
  cta: string;
  photo: PhotoKey;
};

export const experiences: Experience[] = [
  {
    title: "Viagens românticas",
    description:
      "Lua de mel, bodas ou uma escapada a dois. Roteiros com tempo para o que importa: pores do sol, jantares especiais e hospedagens com privacidade.",
    highlights: ["Lua de mel", "Bodas", "Escapadas a dois"],
    tripType: "Romântica",
    cta: "Explorar viagens românticas",
    photo: "romantica",
  },
  {
    title: "Aventuras e natureza",
    description:
      "Trilhas, mergulhos e paisagens que mudam a forma como você enxerga o mundo, no ritmo certo para o seu preparo.",
    highlights: ["Trilhas", "Mergulho", "Parques naturais"],
    tripType: "Aventura e natureza",
    cta: "Explorar aventuras",
    photo: "aventura",
  },
  {
    title: "Férias em família",
    description:
      "Roteiros que funcionam para todas as idades: deslocamentos tranquilos, hospedagens com estrutura e passeios que encantam do avô ao caçula.",
    highlights: ["Todas as idades", "Resorts", "Parques"],
    tripType: "Família",
    cta: "Explorar férias em família",
    photo: "familia",
  },
  {
    title: "Experiências de luxo",
    description:
      "Hotéis de alto padrão, experiências exclusivas e cada detalhe pensado com antecedência, para você só aproveitar.",
    highlights: ["Hotéis de alto padrão", "Experiências exclusivas", "Roteiros privativos"],
    tripType: "Luxo",
    cta: "Explorar experiências de luxo",
    photo: "luxo",
  },
];
