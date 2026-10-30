import type { ReactNode } from "react";
import { Reveal } from "./Reveal";

type SectionHeadingProps = {
  index: string;
  label: string;
  title: ReactNode;
  text?: ReactNode;
  id?: string;
  tone?: "light" | "dark";
  className?: string;
};

/** Cabeçalho editorial das seções: "(01) Destinos", título grande em serifa e texto de apoio. */
export function SectionHeading({ index, label, title, text, id, tone = "light", className = "" }: SectionHeadingProps) {
  const dark = tone === "dark";
  return (
    <div className={className}>
      <Reveal as="p" className={`eyebrow flex items-center gap-4 ${dark ? "text-gold" : "text-gold-ink"}`}>
        <span>({index})</span>
        <span className={`h-px w-10 ${dark ? "bg-gold/60" : "bg-gold-ink/50"}`} aria-hidden="true" />
        <span>{label}</span>
      </Reveal>
      <Reveal
        as="h2"
        id={id}
        delay={80}
        className="mt-6 font-display text-[clamp(2.6rem,7vw,5.5rem)] leading-[0.95] tracking-[-0.015em]"
      >
        {title}
      </Reveal>
      {text && (
        <Reveal
          as="p"
          delay={160}
          className={`mt-6 max-w-xl text-base leading-relaxed sm:text-lg ${dark ? "text-white/75" : "text-navy/70"}`}
        >
          {text}
        </Reveal>
      )}
    </div>
  );
}
