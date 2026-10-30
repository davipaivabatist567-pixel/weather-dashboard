import { hello, site } from "@/config/site";
import { contactTimes, objectives } from "@/data/content";
import { plans } from "@/data/plans";

export const planOptions = [...plans.map((p) => p.name), "Ainda não sei"];

export type LeadValues = {
  nome: string;
  telefone: string;
  email: string;
  plano: string;
  objetivo: string;
  horario: string;
  consentimento: boolean;
};
export type LeadField = keyof LeadValues;
export type LeadErrors = Partial<Record<LeadField, string>>;

export const emptyLead: LeadValues = {
  nome: "",
  telefone: "",
  email: "",
  plano: "",
  objetivo: "",
  horario: "",
  consentimento: false,
};

export const leadFieldOrder: LeadField[] = ["nome", "telefone", "email", "plano", "objetivo", "horario", "consentimento"];

/** Formata enquanto a pessoa digita: (00) 00000-0000 */
export function formatPhone(value: string) {
  const d = value.replace(/\D/g, "").slice(0, 11);
  if (d.length <= 2) return d.length ? `(${d}` : "";
  if (d.length <= 6) return `(${d.slice(0, 2)}) ${d.slice(2)}`;
  if (d.length <= 10) return `(${d.slice(0, 2)}) ${d.slice(2, 6)}-${d.slice(6)}`;
  return `(${d.slice(0, 2)}) ${d.slice(2, 7)}-${d.slice(7)}`;
}

export function validateLeadField(field: LeadField, v: LeadValues): string | undefined {
  switch (field) {
    case "nome": {
      const parts = v.nome.trim().split(/\s+/).filter((p) => p.length >= 2);
      if (!v.nome.trim()) return "Informe seu nome completo.";
      return parts.length < 2 ? "Informe nome e sobrenome." : undefined;
    }
    case "telefone": {
      const digits = v.telefone.replace(/\D/g, "");
      if (!digits) return "Informe um telefone ou WhatsApp.";
      return digits.length === 10 || digits.length === 11 ? undefined : "Digite o número com DDD, por exemplo (11) 91234-5678.";
    }
    case "email":
      if (!v.email.trim()) return undefined; // opcional
      return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(v.email.trim()) ? undefined : "Confira o e-mail (exemplo: nome@email.com).";
    case "plano":
      return planOptions.includes(v.plano) ? undefined : "Escolha um plano de interesse.";
    case "objetivo":
      return objectives.includes(v.objetivo) ? undefined : "Escolha seu objetivo de treinamento.";
    case "horario":
      return contactTimes.includes(v.horario) ? undefined : "Escolha o melhor horário para contato.";
    case "consentimento":
      return v.consentimento ? undefined : "Para continuar, autorize o uso dos dados para contato.";
  }
}

export function validateLead(v: LeadValues): LeadErrors {
  const errors: LeadErrors = {};
  for (const f of leadFieldOrder) {
    const msg = validateLeadField(f, v);
    if (msg) errors[f] = msg;
  }
  return errors;
}

export function leadMessage(v: LeadValues) {
  return [
    `${hello} Quero fazer minha matrícula.`,
    "",
    `*Nome:* ${v.nome.trim()}`,
    `*Telefone:* ${v.telefone}`,
    ...(v.email.trim() ? [`*E-mail:* ${v.email.trim()}`] : []),
    `*Plano de interesse:* ${v.plano}`,
    `*Objetivo:* ${v.objetivo}`,
    `*Melhor horário para contato:* ${v.horario}`,
  ].join("\n");
}

/** Envia para o endereço configurado em `site.leadEndpoint`. Só é chamado quando ele existe. */
export async function sendLead(v: LeadValues) {
  const res = await fetch(site.leadEndpoint, {
    method: "POST",
    headers: { "Content-Type": "application/json", Accept: "application/json" },
    body: JSON.stringify({
      nome: v.nome.trim(),
      telefone: v.telefone,
      email: v.email.trim() || null,
      plano: v.plano,
      objetivo: v.objetivo,
      horario: v.horario,
      consentimento: true,
      origem: "site",
      enviadoEm: new Date().toISOString(),
    }),
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
}
