import type { LucideIcon } from "lucide-react";
import { Activity, BicepsFlexed, Dumbbell, Gauge, TrendingUp, UserCheck, Zap } from "lucide-react";
import type { PhotoKey } from "./photos";
import { site } from "../config/site";
import { plans } from "./plans";

export const pillars: { icon: LucideIcon; title: string; text: string }[] = [
  { icon: Dumbbell, title: "Equipamentos", text: "Estrutura para diferentes objetivos, do primeiro treino ao mais avançado." },
  { icon: Gauge, title: "Performance", text: "Espaço para treinar com intensidade, foco e segurança." },
  { icon: TrendingUp, title: "Evolução", text: "Um ambiente que incentiva a consistência, treino após treino." },
];

export const spaces: { title: string; text: string; photo: PhotoKey }[] = [
  { title: "Área de musculação", text: "Aparelhos para todos os grupos musculares, organizados para o treino fluir.", photo: "musculacao" },
  { title: "Cardio", text: "Esteiras e equipamentos aeróbicos para aquecer, condicionar e acelerar.", photo: "cardio" },
  { title: "Pesos livres", text: "Halteres, barras e anilhas para quem gosta de treinar pesado.", photo: "pesos" },
  { title: "Treinamento funcional", text: "Espaço livre com cordas, kettlebells e acessórios para treinos dinâmicos.", photo: "funcional" },
  { title: "Vestiários", text: "Armários, bancadas e iluminação aconchegante: conforto e praticidade para o seu dia.", photo: "vestiarios" },
];

export type Modality = { icon: LucideIcon; title: string; text: string };

export const modalities: Modality[] = [
  { icon: Dumbbell, title: "Musculação", text: "Treinos com aparelhos e pesos livres, montados de acordo com o seu objetivo e o seu nível." },
  { icon: Zap, title: "Treinamento funcional", text: "Movimentos do dia a dia, circuitos e acessórios para treinar o corpo de forma integrada." },
  { icon: Activity, title: "Condicionamento físico", text: "Treinos para melhorar o fôlego e a disposição, com intensidade ajustada a você." },
  { icon: BicepsFlexed, title: "Treinamento de força", text: "Exercícios básicos bem executados e progressão planejada para ficar mais forte." },
  { icon: UserCheck, title: "Personal trainer", text: "Acompanhamento individual, com atenção à técnica e um plano feito para a sua rotina." },
];

export const objectives = [...modalities.map((m) => m.title), "Ainda estou decidindo"];

export const contactTimes = ["Manhã (6h às 12h)", "Tarde (12h às 18h)", "Noite (18h às 22h)", "Qualquer horário"];

/** Equipe: perfis DEMONSTRATIVOS (nomes inventados e fotos ilustrativas) até a academia cadastrar os reais. */
export const team: { name: string; role: string; bio: string; photo: PhotoKey }[] = [
  { name: "Bruno Costa", role: "Musculação e força", bio: "Foco em técnica e progressão de cargas, do iniciante ao avançado.", photo: "equipe1" },
  { name: "Diego Ramos", role: "Funcional e condicionamento", bio: "Treinos dinâmicos que desafiam o corpo inteiro, no ritmo de cada aluno.", photo: "equipe2" },
  { name: "Alex Moura", role: "Personal trainer", bio: "Acompanhamento individual com planejamento pensado para a sua rotina.", photo: "equipe3" },
];

/** Perguntas frequentes: as respostas usam os dados configurados (planos, modalidades, horários). */
export const faq: { q: string; a: string }[] = [
  {
    q: "Como posso me matricular?",
    a: "Preencha o formulário de matrícula com seus dados e o plano de interesse, ou chame a equipe pelo WhatsApp. A matrícula é concluída com a equipe da academia, que explica as condições e tira suas dúvidas.",
  },
  {
    q: "Quais modalidades estão disponíveis?",
    a: `${modalities.map((m) => m.title).join(", ").replace(/, ([^,]*)$/, " e $1")}. O que cada plano inclui você confere na seção de planos.`,
  },
  {
    q: "Como funcionam os planos?",
    a: `São ${plans.length} planos: ${plans.map((p) => p.name).join(", ").replace(/, ([^,]*)$/, " e $1")}. Cada um soma benefícios ao anterior; valores, fidelidade e formas de pagamento são confirmados com a equipe antes da matrícula.`,
  },
  {
    q: "Posso conhecer a academia antes de me matricular?",
    a: "Sim. Envie uma mensagem pelo WhatsApp ou pelo formulário dizendo o melhor horário, e a equipe combina uma visita com você.",
  },
  {
    q: "Como entro em contato com a equipe?",
    a: `Pelo WhatsApp ${site.phone.display}, pelo formulário desta página ou pessoalmente na recepção, nos horários de funcionamento: ${site.hours.map((h) => `${h.days.toLowerCase()}, ${h.time}`).join("; ")}.`,
  },
];

