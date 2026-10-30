/**
 * Configurações da Aurora Travel.
 * Para colocar o site no ar com dados reais, edite só este arquivo.
 */
export const site = {
  name: "Aurora Travel",
  slogan: "O mundo é seu próximo destino.",
  description:
    "Aurora Travel: viagens sob medida para destinos extraordinários. Planeje sua próxima viagem com atendimento próximo e personalizado.",

  /** Enquanto for `true`, o site mostra os avisos de projeto de demonstração. */
  isDemo: true,

  whatsapp: {
    /**
     * Número que recebe as mensagens: só dígitos, com 55 + DDD (ex.: "5511999999999").
     * Vazio = demonstração: o WhatsApp abre com a mensagem pronta e a pessoa escolhe o contato.
     */
    number: "",
    /** Como o número aparece no site. */
    display: "+55 (00) 00000-0000",
  },

  hours: "Segunda a sexta, das 9h às 18h",
  coverage: "Atendimento on-line para todo o Brasil",

  /** Troque pelos perfis reais da agência. */
  social: [
    { label: "Instagram", href: "https://www.instagram.com/" },
    { label: "TikTok", href: "https://www.tiktok.com/" },
    { label: "YouTube", href: "https://www.youtube.com/" },
  ],

  nav: [
    { label: "Início", href: "#inicio" },
    { label: "Destinos", href: "#destinos" },
    { label: "Experiências", href: "#experiencias" },
    { label: "Sobre", href: "#sobre" },
    { label: "Contato", href: "#contato" },
  ],
} as const;
