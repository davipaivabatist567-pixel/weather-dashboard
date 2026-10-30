import type { CSSProperties } from "react";
import { ArrowRight } from "lucide-react";
import { Photo } from "@/components/ui/Photo";
import { Parallax } from "@/components/ui/Parallax";
import { arrowClass, buttonClass } from "@/components/ui/button";

const delay = (ms: number) => ({ "--d": `${ms}ms` }) as CSSProperties;

export function Hero() {
  return (
    <section
      id="inicio"
      aria-labelledby="hero-title"
      className="relative isolate flex min-h-[max(40rem,100svh)] flex-col overflow-hidden bg-ink"
    >
      {/* foto de fundo: preto e branco, zoom de entrada e movimento suave na rolagem */}
      <div className="absolute inset-0 -z-10 overflow-hidden">
        <Parallax strength={0.18} className="absolute inset-x-0 -inset-y-[12%]">
          <div className="hero-photo absolute inset-0">
            <Photo name="hero" sizes="100vw" priority className="photo-mono" />
          </div>
        </Parallax>
        <div className="absolute inset-0 bg-[linear-gradient(90deg,rgb(8_10_13/0.92)_0%,rgb(8_10_13/0.65)_45%,rgb(8_10_13/0.15)_100%)]" />
        <div className="absolute inset-0 bg-[linear-gradient(180deg,rgb(8_10_13/0.7)_0%,transparent_25%,transparent_55%,rgb(8_10_13/0.95)_100%)]" />
        <div className="absolute inset-0 bg-[radial-gradient(60%_50%_at_85%_30%,rgb(198_255_0/0.10),transparent_70%)]" />
        {/* grade técnica discreta */}
        <div className="absolute inset-0 bg-[linear-gradient(90deg,rgb(255_255_255/0.045)_1px,transparent_1px)] bg-[length:calc(100%/6)_100%]" />
      </div>

      <div className="relative mx-auto flex w-full max-w-[90rem] flex-1 flex-col justify-end px-5 pb-12 pt-32 sm:px-8 sm:pb-16 lg:px-12">
        {/* cantoneiras */}
        <span aria-hidden="true" className="hero-fade absolute left-5 top-28 hidden size-5 border-l-2 border-t-2 border-lime sm:left-8 md:block lg:left-12" style={delay(900)} />
        <span aria-hidden="true" className="hero-fade absolute right-5 top-28 hidden size-5 border-r-2 border-t-2 border-lime sm:right-8 md:block lg:right-12" style={delay(900)} />

        <p className="tag hero-fade flex items-center gap-3 text-white" style={delay(150)}>
          <span className="size-2 bg-lime" aria-hidden="true" />
          Iron Pulse Fitness Club
        </p>

        <h1
          id="hero-title"
          className="display mt-6 max-w-[16ch] text-[clamp(2.35rem,10.4vw,8.75rem)] [font-stretch:100%] sm:[font-stretch:112%] lg:[font-stretch:118%]"
        >
          <span className="hero-line"><span style={delay(200)}>Seu próximo</span></span>
          <span className="hero-line"><span style={delay(320)}><span className="text-lime">nível</span> começa</span></span>
          <span className="hero-line"><span style={delay(440)}>aqui.</span></span>
        </h1>
        <span aria-hidden="true" className="hero-bar mt-6 block h-1 w-24 origin-left bg-lime" style={delay(700)} />

        <div className="mt-8 flex flex-col gap-10 lg:flex-row lg:items-end lg:justify-between">
          <div className="max-w-xl">
            <p className="hero-fade text-base leading-relaxed text-steel sm:text-lg" style={delay(750)}>
              Treine com propósito. Supere seus limites. Construa a melhor versão de você.
            </p>
            <div className="hero-fade mt-8 flex flex-col gap-3 sm:flex-row" style={delay(900)}>
              <a href="#estrutura" className={buttonClass("lime")}>
                Conheça a academia <ArrowRight className={arrowClass} />
              </a>
              <a href="#planos" className={buttonClass("ghost")}>
                Ver planos
              </a>
            </div>
          </div>

          <div className="hero-fade flex items-end justify-between gap-10 lg:justify-end" style={delay(1100)}>
            <ul className="tag hidden gap-2 text-steel sm:grid">
              <li><span className="text-lime">01</span> — Força</li>
              <li><span className="text-lime">02</span> — Disciplina</li>
              <li><span className="text-lime">03</span> — Evolução</li>
            </ul>
            <a href="#impacto" className="group flex flex-col items-center gap-3 text-steel transition-colors hover:text-white">
              <span className="relative block h-11 w-7 rounded-full border border-white/40" aria-hidden="true">
                <span className="absolute left-1/2 top-2 block h-2 w-0.5 -translate-x-1/2 bg-lime motion-safe:animate-scroll-dot" />
              </span>
              <span className="tag">Role</span>
              <span className="sr-only">Ir para a próxima seção</span>
            </a>
          </div>
        </div>
      </div>
    </section>
  );
}
