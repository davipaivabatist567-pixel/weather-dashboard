import { budgets, MAX_TRAVELERS, tripTypes } from "@/data/planner";
import { site } from "@/config/site";

export type PlannerValues = {
  destino: string;
  origem: string;
  ida: string;
  volta: string;
  viajantes: string;
  tipo: string;
  orcamento: string;
};

export type PlannerField = keyof PlannerValues;
export type PlannerErrors = Partial<Record<PlannerField, string>>;

export const emptyPlanner: PlannerValues = {
  destino: "",
  origem: "",
  ida: "",
  volta: "",
  viajantes: "2",
  tipo: "",
  orcamento: "",
};

/** Data de hoje no formato do campo de data (aaaa-mm-dd), no fuso de quem está usando o site. */
export function today() {
  const d = new Date();
  return new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 10);
}

export function validateField(field: PlannerField, v: PlannerValues): string | undefined {
  switch (field) {
    case "destino":
      return v.destino.trim().length < 2 ? "Informe o destino desejado." : undefined;
    case "origem":
      return v.origem.trim().length < 2 ? "Informe a cidade de onde você vai sair." : undefined;
    case "ida":
      if (!v.ida) return "Escolha a data de ida.";
      return v.ida < today() ? "A data de ida precisa ser hoje ou depois." : undefined;
    case "volta":
      if (!v.volta) return "Escolha a data de volta.";
      return v.ida && v.volta <= v.ida ? "A volta precisa ser depois da data de ida." : undefined;
    case "viajantes": {
      const n = Number(v.viajantes);
      return Number.isInteger(n) && n >= 1 && n <= MAX_TRAVELERS
        ? undefined
        : `Informe de 1 a ${MAX_TRAVELERS} viajantes.`;
    }
    case "tipo":
      return (tripTypes as readonly string[]).includes(v.tipo) ? undefined : "Escolha o tipo de viagem.";
    case "orcamento":
      return (budgets as readonly string[]).includes(v.orcamento) ? undefined : "Escolha uma faixa de orçamento.";
  }
}

export const fieldOrder: PlannerField[] = ["destino", "origem", "ida", "volta", "viajantes", "tipo", "orcamento"];

export function validateAll(v: PlannerValues): PlannerErrors {
  const errors: PlannerErrors = {};
  for (const f of fieldOrder) {
    const msg = validateField(f, v);
    if (msg) errors[f] = msg;
  }
  return errors;
}

export const formatDate = (iso: string) => iso.split("-").reverse().join("/");

export function nights(v: PlannerValues) {
  const ms = new Date(v.volta + "T12:00:00").getTime() - new Date(v.ida + "T12:00:00").getTime();
  return Math.round(ms / 86400000);
}

export function summaryRows(v: PlannerValues) {
  const n = nights(v);
  const people = Number(v.viajantes);
  return [
    { label: "Destino", value: v.destino.trim() },
    { label: "Saindo de", value: v.origem.trim() },
    { label: "Ida", value: formatDate(v.ida) },
    { label: "Volta", value: `${formatDate(v.volta)} · ${n} ${n === 1 ? "noite" : "noites"}` },
    { label: "Viajantes", value: `${people} ${people === 1 ? "pessoa" : "pessoas"}` },
    { label: "Tipo de viagem", value: v.tipo },
    { label: "Orçamento", value: v.orcamento },
  ];
}

export function whatsappMessage(v: PlannerValues) {
  return [
    `Olá, ${site.name}! Gostaria de solicitar o planejamento de uma viagem.`,
    "",
    ...summaryRows(v).map((r) => `*${r.label}:* ${r.value}`),
    "",
    "_Solicitação de planejamento enviada pelo site. Ainda não é uma reserva._",
  ].join("\n");
}
