import type { PhotoKey } from "./photos";

export type Destination = {
  slug: string;
  name: string;
  region: string;
  tagline: string;
  summary: string;
  story: string;
  coordinates: string;
  bestTime: string;
  idealFor: string;
  duration: string;
  photo: PhotoKey;
};

export const destinations: Destination[] = [
  {
    slug: "maldivas",
    name: "Maldivas",
    region: "Oceano Índico",
    tagline: "Paraíso sobre as águas.",
    summary: "Bangalôs sobre o mar, águas cristalinas e silêncio absoluto entre atóis de coral.",
    story:
      "Mais de mil ilhas espalhadas pelo Índico, onde o dia começa com café da manhã sobre a água e termina com o céu mais estrelado que você já viu. Mergulho entre corais, jantares na areia e tempo de sobra para não fazer nada.",
    coordinates: "3°12′ N · 73°13′ L",
    bestTime: "Dezembro a abril, na estação seca",
    idealFor: "Lua de mel, descanso e mergulho",
    duration: "7 a 10 dias",
    photo: "maldivas",
  },
  {
    slug: "paris",
    name: "Paris",
    region: "França",
    tagline: "Romance em cada esquina.",
    summary: "Boulevards, museus e cafés à beira do Sena: a cidade que transforma passeios em memórias.",
    story:
      "Manhãs no Louvre, tardes em Montmartre e noites iluminadas pela Torre Eiffel. Paris recompensa quem caminha sem pressa, com bistrôs de bairro, livrarias antigas e jardins feitos para contemplar.",
    coordinates: "48°51′ N · 2°21′ L",
    bestTime: "Abril a junho e setembro a outubro",
    idealFor: "Casais, arte e gastronomia",
    duration: "5 a 7 dias",
    photo: "paris",
  },
  {
    slug: "santorini",
    name: "Santorini",
    region: "Grécia",
    tagline: "O encanto do Mediterrâneo.",
    summary: "Casas brancas sobre falésias vulcânicas, cúpulas azuis e um pôr do sol inesquecível.",
    story:
      "Vilarejos pendurados na caldeira de um vulcão, vinhos de solo vulcânico e o mar Egeu em todos os tons de azul. Em Oia, o fim de tarde vira um ritual que reúne a ilha inteira.",
    coordinates: "36°25′ N · 25°25′ L",
    bestTime: "Maio a outubro",
    idealFor: "Casais, fotografia e gastronomia",
    duration: "4 a 6 dias",
    photo: "santorini",
  },
  {
    slug: "fernando-de-noronha",
    name: "Fernando de Noronha",
    region: "Pernambuco, Brasil",
    tagline: "Natureza extraordinária.",
    summary: "Arquipélago protegido, com praias entre as mais bonitas do Brasil e vida marinha abundante.",
    story:
      "Golfinhos rotadores ao amanhecer, tartarugas nas piscinas naturais e trilhas que terminam em mirantes de tirar o fôlego. O acesso é controlado e há taxa de preservação ambiental, o que mantém a ilha preservada.",
    coordinates: "3°51′ S · 32°25′ O",
    bestTime: "Agosto a janeiro, na estação seca",
    idealFor: "Natureza, mergulho e trilhas",
    duration: "5 a 7 dias",
    photo: "noronha",
  },
  {
    slug: "gramado",
    name: "Gramado",
    region: "Rio Grande do Sul, Brasil",
    tagline: "Charme e aconchego.",
    summary: "Arquitetura de inspiração europeia, gastronomia de serra e o clima ameno da Serra Gaúcha.",
    story:
      "Ruas floridas, chocolate artesanal, fondue em noites frias e passeios entre lagos e araucárias. No fim do ano, a cidade se transforma com as luzes e os espetáculos de Natal.",
    coordinates: "29°22′ S · 50°52′ O",
    bestTime: "O ano todo; inverno e Natal são os mais procurados",
    idealFor: "Famílias, casais e gastronomia",
    duration: "3 a 5 dias",
    photo: "gramado",
  },
  {
    slug: "dubai",
    name: "Dubai",
    region: "Emirados Árabes Unidos",
    tagline: "Uma experiência fora do comum.",
    summary: "Arranha-céus icônicos, deserto dourado e hotelaria de alto padrão numa só viagem.",
    story:
      "Do alto do Burj Khalifa às dunas do deserto ao entardecer, Dubai mistura o futurista e o tradicional: souks de especiarias, praias urbanas, gastronomia do mundo inteiro e compras sem fim.",
    coordinates: "25°12′ N · 55°16′ L",
    bestTime: "Novembro a março",
    idealFor: "Luxo, compras e deserto",
    duration: "5 a 7 dias",
    photo: "dubai",
  },
];
