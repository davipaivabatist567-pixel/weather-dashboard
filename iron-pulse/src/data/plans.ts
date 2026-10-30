/**
 * Planos. Valores, nomes e benefícios são DEMONSTRATIVOS: edite aqui com as condições reais da academia.
 * `price` em reais por mês; `featured` destaca o cartão (borda verde e etiqueta).
 */
export type Plan = {
  id: string;
  name: string;
  tagline: string;
  price: number;
  period: string;
  features: string[];
  featured?: boolean;
  badge?: string;
};

export const plans: Plan[] = [
  {
    id: "essencial",
    name: "Essencial",
    tagline: "Para começar com consistência.",
    price: 99.9,
    period: "/mês",
    features: ["Acesso à musculação", "Utilização dos equipamentos disponíveis", "Ambiente de treinamento completo"],
  },
  {
    id: "performance",
    name: "Performance",
    tagline: "Mais opções para treinar no seu ritmo.",
    price: 149.9,
    period: "/mês",
    featured: true,
    badge: "Mais popular",
    features: [
      "Benefícios do plano Essencial",
      "Acesso às modalidades incluídas neste plano demonstrativo",
      "Maior flexibilidade de treinamento, conforme as regras da academia",
    ],
  },
  {
    id: "elite",
    name: "Elite",
    tagline: "A experiência completa.",
    price: 219.9,
    period: "/mês",
    features: [
      "Benefícios do plano Performance",
      "Benefícios adicionais de acompanhamento, conforme disponibilidade",
      "Experiência premium de treinamento",
    ],
  },
];

export const formatPrice = (value: number) =>
  value.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
