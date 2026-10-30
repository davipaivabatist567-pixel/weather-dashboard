"use client";

import { useEffect, useRef } from "react";
import { ArrowRight } from "lucide-react";
import { Photo } from "@/components/ui/Photo";
import { Reveal } from "@/components/ui/Reveal";
import { arrowClass, buttonClass } from "@/components/ui/button";

/**
 * Foto panorâmica que se abre enquanto a seção entra na tela: começa recortada, com cantos
 * arredondados, e termina de ponta a ponta. A variável --p vai de 0 a 1 (sem JavaScript fica em 1).
 */
export function Feature() {
  const ref = useRef<HTMLElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    let frame = 0;
    const update = () => {
      frame = 0;
      const rect = el.getBoundingClientRect();
      const vh = window.innerHeight;
      const p = Math.min(1, Math.max(0, (vh - rect.top) / (vh * 0.85)));
      el.style.setProperty("--p", p.toFixed(3));
    };
    const onScroll = () => {
      if (!frame) frame = requestAnimationFrame(update);
    };
    update();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);
    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
    };
  }, []);

  return (
    <section ref={ref} aria-labelledby="destaque-title" className="relative bg-white">
      <div
        className="relative isolate flex min-h-[max(38rem,100svh)] items-end overflow-hidden bg-navy text-white sm:items-center"
        style={{
          clipPath:
            "inset(calc((1 - var(--p, 1)) * 9%) calc((1 - var(--p, 1)) * 6%) round calc((1 - var(--p, 1)) * 2rem))",
        }}
      >
        <div className="absolute inset-0 -z-10" style={{ transform: "scale(calc(1.18 - var(--p, 1) * 0.18))" }}>
          <Photo name="destaque" sizes="100vw" />
        </div>
        <div className="absolute inset-0 -z-10 bg-[linear-gradient(180deg,rgb(16_29_44/0.25)_0%,rgb(16_29_44/0.35)_45%,rgb(16_29_44/0.85)_100%)] sm:bg-[radial-gradient(80%_70%_at_50%_55%,rgb(16_29_44/0.55),rgb(16_29_44/0.2))]" />

        <div className="mx-auto w-full max-w-5xl px-5 pb-16 pt-32 sm:px-8 sm:py-32 sm:text-center">
          <Reveal as="p" className="eyebrow flex items-center gap-4 text-gold sm:justify-center">
            <span className="h-px w-10 bg-gold/70" aria-hidden="true" />
            Em destaque
            <span className="hidden h-px w-10 bg-gold/70 sm:block" aria-hidden="true" />
          </Reveal>
          <Reveal
            as="h2"
            id="destaque-title"
            delay={100}
            className="mt-6 font-display text-[clamp(3rem,9vw,7.5rem)] leading-[0.92] tracking-[-0.02em]"
          >
            Seu próximo capítulo <em className="text-gold">começa aqui.</em>
          </Reveal>
          <Reveal
            as="p"
            delay={200}
            className="mt-8 max-w-xl text-base leading-relaxed text-white/85 sm:mx-auto sm:text-lg"
          >
            Dos refúgios tropicais às grandes cidades do mundo, existe uma experiência esperando por você.
          </Reveal>
          <Reveal delay={300} className="mt-10">
            <a href="#destinos" className={buttonClass("gold", "w-full sm:w-auto")}>
              Encontrar minha próxima viagem <ArrowRight className={arrowClass} />
            </a>
          </Reveal>
        </div>
      </div>
    </section>
  );
}
