import { brand } from "@/config/site";

/** Logotipo: paralelogramo inclinado (movimento) atravessado por uma linha de pulso, e o nome em caixa alta larga. */
export function Logo({ className = "" }: { className?: string }) {
  return (
    <span className={`inline-flex items-center gap-3 ${className}`}>
      <svg viewBox="0 0 40 32" className="h-7 w-9 shrink-0 text-lime" aria-hidden="true">
        <path d="M12 2h26l-10 28H2z" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinejoin="round" />
        <path d="M4 17h8l3.5-7 5 13 3.5-6h7" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
      <span className="flex flex-col leading-none">
        <span className="font-display text-[1.05rem] font-extrabold uppercase tracking-[0.02em] [font-stretch:125%]">{brand}</span>
        <span className="mt-1 font-mono text-[0.55rem] tracking-[0.42em] text-steel">FITNESS</span>
      </span>
    </span>
  );
}
