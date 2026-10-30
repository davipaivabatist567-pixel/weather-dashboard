import { site } from "@/config/site";

/** Link do WhatsApp com a mensagem já escrita. Sem número configurado, abre a escolha de contato. */
export function whatsappUrl(text: string) {
  const number = site.whatsapp.number.replace(/\D/g, "");
  return `https://wa.me/${number}?text=${encodeURIComponent(text)}`;
}

export const greetingUrl = () =>
  whatsappUrl(`Olá, ${site.name}! Vim pelo site e gostaria de planejar uma viagem.`);
