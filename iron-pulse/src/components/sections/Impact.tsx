import { pillars } from "@/data/content";
import { Reveal } from "@/components/ui/Reveal";
import { SectionHeading } from "@/components/ui/SectionHeading";

export function Impact() {
  return (
    <section id="impacto" aria-labelledby="impacto-title" className="bg-ink py-24 sm:py-32">
      <div className="mx-auto max-w-[90rem] px-5 sm:px-8 lg:px-12">
        <SectionHeading
          index="01"
          label="Mentalidade"
          id="impacto-title"
          className="max-w-4xl"
          title={
            <>
              Mais que treino. <span className="text-lime">Uma nova mentalidade.</span>
            </>
          }
          text="Um ambiente pensado para quem busca evolução, consistência e resultados."
        />

        <ul className="mt-16 grid gap-4 md:grid-cols-3 lg:mt-20">
          {pillars.map(({ icon: Icon, title, text }, i) => (
            <Reveal
              as="li"
              key={title}
              delay={i * 110}
              className="group relative overflow-hidden border border-white/10 bg-coal/60 p-8 transition-[border-color,background-color,transform] duration-500 ease-pulse hover:-translate-y-1 hover:border-lime/50 hover:bg-coal sm:p-10"
            >
              <span
                aria-hidden="true"
                className="absolute inset-x-0 top-0 h-0.5 origin-left scale-x-0 bg-lime transition-transform duration-700 ease-pulse group-hover:scale-x-100"
              />
              <div className="flex items-start justify-between">
                <span className="inline-flex size-14 items-center justify-center border border-lime/40 text-lime transition-colors duration-500 group-hover:bg-lime group-hover:text-ink">
                  <Icon className="size-6" strokeWidth={1.5} aria-hidden="true" />
                </span>
                <span className="tag text-steel">0{i + 1}</span>
              </div>
              <h3 className="display mt-10 text-[1.7rem]">{title}</h3>
              <p className="mt-3 leading-relaxed text-steel">{text}</p>
            </Reveal>
          ))}
        </ul>
      </div>
    </section>
  );
}
