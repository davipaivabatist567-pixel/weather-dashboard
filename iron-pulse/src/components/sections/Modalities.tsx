import { ArrowRight } from "lucide-react";
import { modalities } from "@/data/content";
import { Reveal } from "@/components/ui/Reveal";
import { SectionHeading } from "@/components/ui/SectionHeading";
import { LeadLink } from "@/components/LeadContext";
import { arrowClass } from "@/components/ui/button";

export function Modalities() {
  return (
    <section id="modalidades" aria-labelledby="modalidades-title" className="bg-ink py-24 sm:py-32">
      <div className="mx-auto max-w-[90rem] px-5 sm:px-8 lg:px-12">
        <SectionHeading
          index="03"
          label="Modalidades"
          id="modalidades-title"
          title={
            <>
              Encontre seu <span className="text-lime">ritmo.</span>
            </>
          }
          text="Do primeiro treino ao acompanhamento individual: escolha o caminho que combina com você."
        />

        <ul className="mt-14 grid grid-cols-1 gap-4 md:grid-cols-2 lg:mt-20 xl:grid-cols-6">
          {modalities.map(({ icon: Icon, title, text }, i) => (
            <Reveal
              as="li"
              key={title}
              delay={(i % 3) * 100}
              className={`group flex flex-col border border-white/10 bg-coal p-6 transition-[border-color,background-color] duration-500 ease-pulse hover:border-lime/40 hover:bg-coal-2 sm:p-10 ${
                i < 3 ? "xl:col-span-2" : "xl:col-span-3"
              } ${i === modalities.length - 1 ? "md:col-span-2 xl:col-span-3" : ""}`}
            >
              <div className="flex items-start justify-between">
                <Icon
                  className="size-10 text-lime transition-transform duration-500 ease-pulse group-hover:-rotate-6 group-hover:scale-110"
                  strokeWidth={1.4}
                  aria-hidden="true"
                />
                <span className="tag text-steel">Mod. {String(i + 1).padStart(2, "0")}</span>
              </div>
              <h3 className="display mt-10 text-[1.4rem] [overflow-wrap:anywhere] sm:text-[1.7rem] xl:text-[1.45rem] 2xl:text-[1.7rem]">{title}</h3>
              <p className="mt-3 max-w-md leading-relaxed text-steel">{text}</p>
              <LeadLink
                objective={title}
                className="group/link mt-8 inline-flex min-h-11 items-center gap-3 self-start text-[0.78rem] font-semibold uppercase tracking-[0.14em] text-lime"
              >
                <span className="border-b border-lime/40 pb-1 transition-colors group-hover/link:border-lime">Quero conhecer</span>
                <ArrowRight className={`${arrowClass} group-hover/link:translate-x-1`} />
              </LeadLink>
            </Reveal>
          ))}
        </ul>
      </div>
    </section>
  );
}
