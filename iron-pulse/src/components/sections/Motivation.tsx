import { ArrowRight } from "lucide-react";
import { Photo } from "@/components/ui/Photo";
import { Parallax } from "@/components/ui/Parallax";
import { Reveal } from "@/components/ui/Reveal";
import { arrowClass, buttonClass } from "@/components/ui/button";

export function Motivation() {
  return (
    <section aria-labelledby="motivacao-title" className="relative isolate overflow-hidden bg-ink">
      <div className="absolute inset-0 -z-10 overflow-hidden">
        <Parallax strength={0.14} className="absolute inset-x-0 -inset-y-[14%]">
          <Photo name="motivacao" sizes="100vw" className="photo-mono" />
        </Parallax>
        <div className="absolute inset-0 bg-[linear-gradient(180deg,rgb(8_10_13/0.85)_0%,rgb(8_10_13/0.55)_45%,rgb(8_10_13/0.92)_100%)]" />
        <div className="absolute inset-0 bg-[radial-gradient(50%_60%_at_15%_80%,rgb(198_255_0/0.12),transparent_70%)]" />
      </div>

      <div className="mx-auto flex min-h-[max(36rem,90svh)] max-w-[90rem] flex-col justify-center px-5 py-28 sm:px-8 lg:px-12">
        <Reveal as="p" className="tag flex items-center gap-3 text-lime">
          <span className="size-2 bg-lime" aria-hidden="true" />
          Mentalidade Iron Pulse
        </Reveal>
        <Reveal
          as="h2"
          id="motivacao-title"
          delay={80}
          className="display mt-6 max-w-[15ch] text-[clamp(2.3rem,8.6vw,7.5rem)] [font-stretch:100%] sm:[font-stretch:115%]"
        >
          <span className="text-lime">Disciplina</span> constrói o que a motivação começa.
        </Reveal>
        <Reveal as="p" delay={180} className="mt-8 max-w-xl text-base leading-relaxed text-steel sm:text-lg">
          Cada treino é uma oportunidade de avançar. O próximo passo depende de você.
        </Reveal>
        <Reveal delay={260} className="mt-10">
          <a href="#matricula" className={buttonClass("lime", "w-full sm:w-auto")}>
            Comece sua jornada <ArrowRight className={arrowClass} />
          </a>
        </Reveal>
      </div>
    </section>
  );
}
