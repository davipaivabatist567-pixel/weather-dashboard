import { Quote } from "lucide-react";
import { site } from "@/config/site";
import { Reveal } from "@/components/ui/Reveal";
import { SectionHeading } from "@/components/ui/SectionHeading";

/**
 * Seção pronta para avaliações reais. Enquanto o site é demonstração, mostra cartões reservados,
 * sem inventar depoimentos. Para publicar avaliações, troque os cartões pelo texto e nome do cliente.
 */
export function Testimonials() {
  return (
    <section id="depoimentos" aria-labelledby="depoimentos-title" className="bg-mist py-24 sm:py-32 lg:py-40">
      <div className="mx-auto max-w-[90rem] px-5 sm:px-8 lg:px-12">
        <SectionHeading
          index="05"
          label="Depoimentos"
          id="depoimentos-title"
          className="max-w-3xl"
          title={
            <>
              Histórias que ainda <em className="text-gold-ink">vamos contar.</em>
            </>
          }
          text={
            site.isDemo
              ? "Este é um projeto de demonstração. O espaço abaixo está pronto para receber avaliações reais de clientes; por isso, nenhum depoimento é exibido."
              : undefined
          }
        />

        <ul className="mt-16 grid gap-6 md:grid-cols-3">
          {[0, 1, 2].map((i) => (
            <Reveal
              as="li"
              key={i}
              delay={i * 100}
              className="flex min-h-72 flex-col border border-dashed border-navy/20 bg-white/60 p-8"
            >
              <Quote className="size-8 text-gold/70" strokeWidth={1.25} aria-hidden="true" />
              <div className="mt-8 grid gap-3" aria-hidden="true">
                <span className="h-2.5 w-full rounded-full bg-navy/[0.06]" />
                <span className="h-2.5 w-11/12 rounded-full bg-navy/[0.06]" />
                <span className="h-2.5 w-3/4 rounded-full bg-navy/[0.06]" />
              </div>
              <p className="mt-auto pt-10 text-sm text-navy/60">
                <span className="eyebrow block text-gold-ink">Em breve</span>
                Espaço reservado para a avaliação de um cliente.
              </p>
            </Reveal>
          ))}
        </ul>
      </div>
    </section>
  );
}
