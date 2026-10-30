import { Check } from "lucide-react";
import { site } from "@/config/site";
import { formatPrice, plans } from "@/data/plans";
import { Reveal } from "@/components/ui/Reveal";
import { SectionHeading } from "@/components/ui/SectionHeading";
import { LeadLink } from "@/components/LeadContext";
import { buttonClass } from "@/components/ui/button";

export function Plans() {
  return (
    <section id="planos" aria-labelledby="planos-title" className="bg-coal py-24 sm:py-32">
      <div className="mx-auto max-w-[90rem] px-5 sm:px-8 lg:px-12">
        <SectionHeading
          index="04"
          label="Planos"
          id="planos-title"
          align="center"
          className="max-w-3xl"
          title={
            <>
              Escolha seu <span className="text-lime">próximo nível.</span>
            </>
          }
          text="Três formas de treinar. Cada plano soma benefícios ao anterior."
        />

        <ul className="mt-14 grid grid-cols-1 items-stretch gap-5 lg:mt-20 lg:grid-cols-3">
          {plans.map((plan, i) => {
            const [reais, centavos] = formatPrice(plan.price).replace("R$", "").trim().split(",");
            return (
              <Reveal
                as="li"
                key={plan.id}
                delay={i * 110}
                className={`relative flex flex-col p-6 transition-transform duration-500 ease-pulse hover:-translate-y-1 sm:p-10 ${
                  plan.featured ? "border-2 border-lime bg-ink lg:-my-4 lg:py-14" : "border border-white/10 bg-ink/60"
                }`}
              >
                {plan.badge && (
                  <span className="tag absolute -top-3 left-8 bg-lime px-3 py-1 font-semibold text-ink sm:left-10">
                    {plan.badge}
                  </span>
                )}
                <p className="tag text-steel">Plano {String(i + 1).padStart(2, "0")}</p>
                <h3 className="display mt-3 text-[1.85rem] [overflow-wrap:anywhere] sm:text-[2.1rem]">{plan.name}</h3>
                <p className="mt-2 text-steel">{plan.tagline}</p>

                <p className="mt-8 flex items-start gap-1">
                  <span className="mt-2 text-lg font-semibold text-steel">R$</span>
                  <span className="display text-[3.75rem] leading-none">{reais}</span>
                  <span className="mt-2 flex flex-col text-sm font-semibold leading-tight">
                    ,{centavos}
                    <span className="font-normal text-steel">{plan.period}</span>
                  </span>
                </p>
                {site.isDemo && <p className="tag mt-3 text-lime/80">Valor demonstrativo</p>}

                <ul className="mt-8 grid gap-4 border-t border-white/10 pt-8">
                  {plan.features.map((f) => (
                    <li key={f} className="flex gap-3 text-[0.95rem] leading-relaxed">
                      <Check className="mt-1 size-4 shrink-0 text-lime" strokeWidth={2.5} aria-hidden="true" />
                      {f}
                    </li>
                  ))}
                </ul>

                <div className="mt-auto pt-10">
                  <LeadLink plan={plan.name} className={buttonClass(plan.featured ? "lime" : "ghost", "w-full")}>
                    Quero o plano {plan.name}
                  </LeadLink>
                </div>
              </Reveal>
            );
          })}
        </ul>

        <Reveal as="p" className="mx-auto mt-12 max-w-2xl text-center text-sm leading-relaxed text-steel">
          {site.isDemo
            ? "Planos, valores e benefícios demonstrativos, apenas para apresentação do projeto. Não são ofertas de uma academia existente."
            : "Valores, fidelidade e formas de pagamento são confirmados com a equipe no momento da matrícula."}
        </Reveal>
      </div>
    </section>
  );
}
