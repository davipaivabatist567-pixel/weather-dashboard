/**
 * Configurações do site da academia: tudo o que muda de uma academia para outra fica aqui.
 * Antes de publicar comercialmente, troque os dados de demonstração e mude `isDemo` para false.
 */
export const site = {
  /**
   * Nome da academia (ex.: "Iron Pulse Fitness"). Vazio = site sem marca, para vídeos e demonstrações:
   * o logotipo mostra só "Academia" e as frases falam em "a academia".
   */
  name: "Iron Pulse Fitness",
  /** Nome curto para o logotipo e a assinatura do rodapé (ex.: "Iron Pulse"). Vazio = usa `name`. */
  shortName: "Iron Pulse",
  slogan: "Supere seus limites.",
  description:
    "Academia com musculação, treinamento funcional, condicionamento e acompanhamento profissional. Seu próximo nível começa aqui.",

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

/** Nome em destaque (logotipo, rodapé, título da aba). */
export const brand = site.shortName || site.name || "Academia";
/** Como as frases se referem à academia: "a equipe da …", "autorizo a …". */
export const brandRef = site.name || "academia";
/** Início das mensagens de WhatsApp. */
export const hello = site.name ? `Olá, ${site.name}!` : "Olá!";

export const fullAddress = `${site.address.street}, ${site.address.district}, ${site.address.city} - ${site.address.state}`;
export const mapsUrl = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(fullAddress)}`;
