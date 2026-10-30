/**
 * Configurações da IRON PULSE FITNESS: tudo o que muda de uma academia para outra fica aqui.
 * Antes de publicar comercialmente, troque os dados de demonstração e mude `isDemo` para false.
 */
export const site = {
  name: "Iron Pulse Fitness",
  shortName: "Iron Pulse",
  slogan: "Supere seus limites.",
  description:
    "Iron Pulse Fitness: academia com musculação, treinamento funcional, condicionamento e acompanhamento profissional. Seu próximo nível começa aqui.",

  /** Enquanto for `true`, o site identifica preços, equipe, endereço e contatos como demonstrativos. */
  isDemo: true,

  /** Telefone da academia: definido só aqui e usado em todo o site. */
  phone: {
    /** Só dígitos, com 55 + DDD (ex.: "5511999999999"). Vazio = demonstração: o WhatsApp abre e a pessoa escolhe o contato. */
    whatsapp: "",
    /** Como o número aparece na tela. */
    display: "(00) 00000-0000",
  },

  address: {
    street: "Av. Exemplo, 1000",
    district: "Centro",
    city: "Sua Cidade",
    state: "UF",
    /** Endereço de "incorporar mapa" do Google Maps (Compartilhar → Incorporar um mapa → só o link do src). */
    mapEmbedUrl: "",
  },

  hours: [
    { days: "Segunda a sexta", time: "5h30 às 23h" },
    { days: "Sábado", time: "8h às 18h" },
    { days: "Domingo e feriados", time: "8h às 13h" },
  ],

  /**
   * Para onde o formulário de matrícula envia os dados (POST com JSON), por exemplo um endpoint do
   * Formspree, Make ou do sistema da academia. Vazio = nada é enviado; a pessoa continua pelo WhatsApp.
   */
  leadEndpoint: "",

  /** Troque pelos perfis reais da academia. */
  social: [
    { label: "Instagram", href: "https://www.instagram.com/" },
    { label: "TikTok", href: "https://www.tiktok.com/" },
    { label: "YouTube", href: "https://www.youtube.com/" },
  ],

  /** Crédito do estúdio que criou o site. Com `url` preenchida, o nome vira link. */
  studio: { name: "DP Web Studio", url: "" },

  nav: [
    { label: "Início", href: "#inicio" },
    { label: "Estrutura", href: "#estrutura" },
    { label: "Modalidades", href: "#modalidades" },
    { label: "Planos", href: "#planos" },
    { label: "Equipe", href: "#equipe" },
    { label: "Contato", href: "#contato" },
  ],
} as const;

export const fullAddress = `${site.address.street}, ${site.address.district}, ${site.address.city} - ${site.address.state}`;
export const mapsUrl = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(fullAddress)}`;
