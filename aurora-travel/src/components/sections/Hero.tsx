import type { CSSProperties } from "react";
import { ArrowRight } from "lucide-react";
import { Photo } from "@/components/ui/Photo";
import { arrowClass, buttonClass } from "@/components/ui/button";

const delay = (ms: number) => ({ "--d": `${ms}ms` }) as CSSProperties;

export function Hero() {
  return (
    <section id="inicio" aria-labelledby="hero-title" className="relative isolate flex min-h-[max(40rem,100svh)] flex-col overflow-hidden bg-navy text-white">
      <div className="absolute inset-0 -z-10">
        <Photo name="hero" sizes="100vw" priority className="hero-photo" />
        {/* véus para leitura: escurece o topo (menu) e a base (título) */}
        <div className="absolute inset-0 bg-[linear-gradient(180deg,rgb(16_29_44/0.55)_0%,rgb(16_29_44/0)_28%,rgb(16_29_44/0.1)_50%,rgb(16_29_44/0.88)_100%)]" />
      </div>

      <div className="mx-auto flex w-full max-w-[90rem] flex-1 flex-col justify-end px-5 pb-14 pt-32 sm:px-8 sm:pb-20 lg:px-12 lg:pb-16">
        <p className="eyebrow hero-fade flex items-center gap-4 text-sky" style={delay(200)}>
          <span className="h-px w-10 bg-gold" aria-hidden="true" />
          Viagens sob medida
        </p>

        <h1 id="hero-title" className="mt-6 max-w-[14ch] font-display text-[clamp(3.2rem,10.5vw,9.5rem)] leading-[0.9] tracking-[-0.02em]">
          <span className="hero-line"><span style={delay(250)}>O mundo é seu</span></span>
          <span className="hero-line"><span style={delay(380)}><em className="text-gold">próximo</em> destino.</span></span>
        </h1>

        <div className="mt-10 flex flex-col gap-10 lg:flex-row lg:items-end lg:justify-between">
          <div className="max-w-xl">
            <p className="hero-fade text-base leading-relaxed text-white/85 sm:text-lg" style={delay(700)}>
              Descubra lugares extraordinários e transforme suas próximas férias em experiências inesquecíveis.
            </p>
            <div className="hero-fade mt-8 flex flex-col gap-3 sm:flex-row" style={delay(850)}>
              <a href="#destinos" className={buttonClass("gold")}>
                Explorar destinos <ArrowRight className={arrowClass} />
              </a>
              <a href="#planejar" className={buttonClass("light")}>
                Planejar viagem
              </a>
            </div>
          </div>

          <div className="hero-fade hidden items-end gap-10 lg:flex" style={delay(1100)}>
            <p className="text-right text-xs leading-relaxed text-white/70">
              <span className="eyebrow block text-gold">Na foto</span>
              Maldivas · Oceano Índico
              <br />
              3°12′ N · 73°13′ L
            </p>
            <ScrollCue />
          </div>
        </div>

        <div className="hero-fade mt-12 flex justify-center lg:hidden" style={delay(1100)}>
          <ScrollCue />
        </div>
      </div>
    </section>
  );
}

function ScrollCue() {
  return (
    <a href="#destinos" className="group flex flex-col items-center gap-3 text-white/80 transition-colors hover:text-white">
      <span className="eyebrow [writing-mode:vertical-rl]">Role</span>
      <span className="relative block h-14 w-px overflow-hidden bg-white/25" aria-hidden="true">
        <span className="absolute inset-0 bg-gold motion-safe:animate-scroll-cue" />
      </span>
      <span className="sr-only">Ir para os destinos</span>
    </a>
  );
}
