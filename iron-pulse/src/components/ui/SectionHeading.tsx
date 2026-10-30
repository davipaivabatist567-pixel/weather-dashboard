import type { ReactNode } from "react";
import { Reveal } from "./Reveal";

type SectionHeadingProps = {
  index: string;
  label: string;
  title: ReactNode;
  text?: ReactNode;
  id?: string;
  align?: "left" | "center";
  className?: string;
};

/** Cabeçalho das seções: "[02] ESTRUTURA", título largo e texto de apoio. */
export function SectionHeading({ index, label, title, text, id, align = "left", className = "" }: SectionHeadingProps) {
  const center = align === "center";
  return (
    <div className={`${center ? "mx-auto text-center" : ""} ${className}`}>
      <Reveal as="p" className={`tag flex items-center gap-3 text-lime ${center ? "justify-center" : ""}`}>
        <span className="text-steel">[{index}]</span>
        <span className="h-px w-8 bg-lime" aria-hidden="true" />
        {label}
      </Reveal>
      <Reveal as="h2" id={id} delay={80} className="display mt-5 text-[clamp(2.1rem,6.6vw,5.25rem)]">
        {title}
      </Reveal>
      {text && (
        <Reveal
          as="p"
          delay={160}
          className={`mt-6 max-w-xl text-base leading-relaxed text-steel sm:text-lg ${center ? "mx-auto" : ""}`}
        >
          {text}
        </Reveal>
      )}
    </div>
  );
}
