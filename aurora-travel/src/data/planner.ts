export const tripTypes = ["Romântica", "Aventura e natureza", "Família", "Luxo", "Outro"] as const;
export type TripType = (typeof tripTypes)[number];

export const budgets = [
  "Até R$ 5 mil por pessoa",
  "De R$ 5 mil a R$ 10 mil por pessoa",
  "De R$ 10 mil a R$ 20 mil por pessoa",
  "Acima de R$ 20 mil por pessoa",
  "Prefiro conversar sobre isso",
] as const;

export const MAX_TRAVELERS = 20;
