import type { LucideIcon } from "lucide-react";
import { Compass, Gem, HeartHandshake, LifeBuoy } from "lucide-react";

export const benefits: { icon: LucideIcon; title: string; text: string }[] = [
  {
    icon: Compass,
    title: "Planejamento personalizado",
    text: "Cada roteiro começa por você: ritmo, interesses e orçamento orientam todas as escolhas.",
  },
  {
    icon: Gem,
    title: "Seleção cuidadosa de experiências",
    text: "Hospedagens, passeios e restaurantes escolhidos com critério, sem excesso de opções.",
  },
  {
    icon: HeartHandshake,
    title: "Atendimento próximo e humanizado",
    text: "Conversa direta com um especialista, do primeiro contato ao roteiro final.",
  },
  {
    icon: LifeBuoy,
    title: "Suporte durante o planejamento",
    text: "Dúvidas sobre documentos, datas ou ajustes? Acompanhamos cada etapa com você.",
  },
];

export const faq: { q: string; a: string }[] = [
  {
    q: "Como planejar uma viagem?",
    a: "Preencha o planejador com destino, datas, número de viajantes e faixa de orçamento. Com essas informações, um especialista conversa com você pelo WhatsApp para entender seu estilo e preparar uma proposta de roteiro.",
  },
  {
    q: "É possível personalizar um roteiro?",
    a: "Sim. Todo roteiro é montado a partir das suas preferências: ritmo da viagem, tipo de hospedagem, passeios e tempo em cada cidade. Você pode pedir ajustes até ficar do seu jeito.",
  },
  {
    q: "Como solicitar um orçamento?",
    a: "Envie sua solicitação pelo planejador ou pelo WhatsApp. O orçamento é preparado depois da conversa inicial, com valores e condições apresentados antes de qualquer reserva.",
  },
  {
    q: "Posso viajar com minha família?",
    a: "Claro. Montamos roteiros para todas as idades, considerando o ritmo das crianças, hospedagens com estrutura para famílias e passeios que agradam a todos.",
  },
  {
    q: "Como funciona o atendimento?",
    a: "O atendimento é feito pelo WhatsApp, de segunda a sexta, das 9h às 18h. Você fala com um especialista do início do planejamento até a véspera da viagem.",
  },
];
