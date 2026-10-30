import { brandRef, fullAddress, site } from "../config/site";

/** Política de privacidade (MODELO): revise com a assessoria jurídica da academia antes de publicar. */
export const privacyNotice = site.isDemo
  ? "Modelo para o projeto demonstrativo. Antes da publicação, a academia deve revisar este texto e incluir o nome empresarial, o CNPJ e o contato do encarregado de dados."
  : "";

export const privacySections: { title: string; text: string }[] = [
  {
    title: "Quais dados coletamos",
    text: "No formulário de matrícula: nome, telefone ou WhatsApp, e-mail (opcional), plano de interesse, objetivo de treinamento e melhor horário para contato.",
  },
  {
    title: "Para que usamos",
    text: `Somente para a equipe da ${brandRef} entrar em contato sobre a sua matrícula, tirar dúvidas e combinar uma visita. Não usamos seus dados para outras finalidades sem o seu consentimento.`,
  },
  {
    title: "Compartilhamento",
    text: "Os dados não são vendidos. Podem ser processados por ferramentas usadas pela academia para receber as mensagens (como o WhatsApp ou o sistema de cadastro), apenas para essa finalidade.",
  },
  {
    title: "Por quanto tempo",
    text: "Pelo tempo necessário para o atendimento ou até você pedir a exclusão, salvo obrigação legal de guarda.",
  },
  {
    title: "Seus direitos (LGPD)",
    text: `Você pode pedir acesso, correção ou exclusão dos seus dados e revogar o consentimento a qualquer momento, pelo WhatsApp ${site.phone.display} ou na recepção (${fullAddress}).`,
  },
];
