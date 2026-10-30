import { benefits } from "@/data/content";
import { Reveal } from "@/components/ui/Reveal";
import { SectionHeading } from "@/components/ui/SectionHeading";

export function WhyAurora() {
  return (
    <section id="sobre" aria-labelledby="sobre-title" className="bg-white py-24 sm:py-32 lg:py-40">
      <div className="mx-auto grid max-w-[90rem] gap-16 px-5 sm:px-8 lg:grid-cols-12 lg:gap-12 lg:px-12">
        <div className="lg:col-span-5">
          <SectionHeading
            index="04"
            label="Sobre a Aurora"
            id="sobre-title"
            title={
              <>
                Por que viajar com a <em className="text-gold-ink">Aurora?</em>
              </>
            }
            text="Aurora é a primeira luz do dia, o momento em que tudo ainda é possível. É assim que pensamos cada viagem: com calma, intenção e atenção aos detalhes que fazem a diferença."
          />
        </div>

        <ul className="grid gap-px self-end overflow-hidden bg-navy/10 sm:grid-cols-2 lg:col-span-7">
          {benefits.map(({ icon: Icon, title, text }, i) => (
            <Reveal as="li" key={title} delay={i * 90} className="bg-white p-8 sm:p-10">
              <span className="inline-flex size-14 items-center justify-center rounded-full border border-gold/60 text-gold-ink">
                <Icon className="size-6" strokeWidth={1.25} aria-hidden="true" />
              </span>
              <h3 className="mt-8 font-display text-[1.9rem] leading-[1.05]">{title}</h3>
              <p className="mt-3 leading-relaxed text-navy/70">{text}</p>
            </Reveal>
          ))}
        </ul>
      </div>
    </section>
  );
}
