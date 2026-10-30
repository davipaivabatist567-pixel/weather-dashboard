import { ArrowRight } from "lucide-react";
import { experiences } from "@/data/experiences";
import { Photo } from "@/components/ui/Photo";
import { Reveal } from "@/components/ui/Reveal";
import { SectionHeading } from "@/components/ui/SectionHeading";
import { PlanTripLink } from "@/components/PlannerContext";
import { arrowClass } from "@/components/ui/button";

export function Experiences() {
  return (
    <section id="experiencias" aria-labelledby="experiencias-title" className="bg-mist py-24 sm:py-32 lg:py-40">
      <div className="mx-auto max-w-[90rem] px-5 sm:px-8 lg:px-12">
        <SectionHeading
          index="02"
          label="Experiências"
          id="experiencias-title"
          className="max-w-4xl"
          title={
            <>
              Não viaje apenas para conhecer. <em className="text-gold-ink">Viaje para sentir.</em>
            </>
          }
          text="Antes do destino, a intenção. Escolha o tipo de viagem que combina com este momento e nós desenhamos o resto."
        />

        <ol className="mt-20 grid gap-24 lg:mt-28 lg:gap-36">
          {experiences.map((exp, i) => {
            const flip = i % 2 === 1;
            return (
              <li key={exp.title} className="grid items-center gap-8 lg:grid-cols-12 lg:gap-12">
                <Reveal
                  className={`relative aspect-[4/5] overflow-hidden sm:aspect-[3/2] lg:col-span-7 ${
                    flip ? "lg:order-2 lg:col-start-6" : ""
                  }`}
                >
                  <Photo
                    name={exp.photo}
                    sizes="(min-width: 1024px) 56vw, 92vw"
                    className="transition-transform duration-[1600ms] ease-aurora hover:scale-[1.04]"
                  />
                </Reveal>

                <Reveal
                  delay={120}
                  className={`lg:col-span-4 ${flip ? "lg:order-1 lg:col-start-1" : "lg:col-start-9"}`}
                >
                  <p className="font-display text-[4.5rem] leading-none text-gold sm:text-[5.5rem]" aria-hidden="true">
                    {String(i + 1).padStart(2, "0")}
                  </p>
                  <h3 className="mt-4 font-display text-[clamp(2.2rem,4.4vw,3.5rem)] leading-[0.95]">{exp.title}</h3>
                  <p className="mt-5 leading-relaxed text-navy/70 sm:text-lg">{exp.description}</p>
                  <ul className="mt-6 flex flex-wrap gap-2">
                    {exp.highlights.map((h) => (
                      <li key={h} className="rounded-full border border-navy/15 px-4 py-1.5 text-xs font-medium text-navy/75">
                        {h}
                      </li>
                    ))}
                  </ul>
                  <PlanTripLink
                    tripType={exp.tripType}
                    className="group mt-8 inline-flex min-h-11 items-center gap-3 text-[0.78rem] font-semibold uppercase tracking-[0.16em]"
                  >
                    <span className="link-line pb-1">{exp.cta}</span>
                    <ArrowRight className={arrowClass} />
                  </PlanTripLink>
                </Reveal>
              </li>
            );
          })}
        </ol>
      </div>
    </section>
  );
}
