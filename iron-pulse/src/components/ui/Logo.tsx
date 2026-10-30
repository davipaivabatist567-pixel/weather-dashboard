import { useId } from "react";
import { brand, site } from "@/config/site";

/**
 * Logotipo. Com nome configurado: monograma "IP" da Iron Pulse (versão vetorial da arte da marca).
 * Sem nome (site sem marca): paralelogramo inclinado atravessado por uma linha de pulso.
 */
export function Logo({ className = "" }: { className?: string }) {
  const gradient = useId();
  return (
    <span className={`inline-flex items-center gap-3 ${className}`}>
      {site.name ? (
        <svg viewBox="110 68 410 252" className="h-7 w-[2.85rem] shrink-0" aria-hidden="true">
          <defs>
            <linearGradient id={gradient} x1="118" y1="0" x2="512" y2="0" gradientUnits="userSpaceOnUse">
              <stop offset="0" stopColor="#6DB32A" />
              <stop offset="1" stopColor="#C6FF00" />
            </linearGradient>
          </defs>
          <path
            fill={`url(#${gradient})`}
            fillRule="evenodd"
            d="M166 75H240L190 312H118Z M265 75H465Q512 75 512 122V198Q512 245 465 245H304L290 312H220Z M338 120H440Q452 120 452 132V183Q452 195 440 195H322Z"
          />
        </svg>
      ) : (
        <svg viewBox="0 0 40 32" className="h-7 w-9 shrink-0 text-lime" aria-hidden="true">
          <path d="M12 2h26l-10 28H2z" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinejoin="round" />
          <path d="M4 17h8l3.5-7 5 13 3.5-6h7" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      )}
      <span className="flex flex-col leading-none">
        <span className="font-display text-[1.05rem] font-extrabold uppercase tracking-[0.02em] [font-stretch:125%]">{brand}</span>
        <span className="mt-1 font-mono text-[0.55rem] tracking-[0.42em] text-lime">FITNESS</span>
      </span>
    </span>
  );
}
