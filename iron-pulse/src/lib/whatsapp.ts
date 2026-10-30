import { site } from "@/config/site";

/** Link do WhatsApp com a mensagem já escrita. Sem número configurado, o WhatsApp pergunta para quem enviar. */
export function whatsappUrl(text: string) {
  return `https://wa.me/${site.phone.whatsapp.replace(/\D/g, "")}?text=${encodeURIComponent(text)}`;
}

export const greetingUrl = () =>
  whatsappUrl(`Olá, ${site.name}! Vim pelo site e quero saber mais sobre a academia.`);
