import { site } from "@/config/site";

const words = ["Supere seus limites", "Força", "Disciplina", "Evolução", "Treine com propósito"];

/** Faixa verde com palavras correndo. Com movimento reduzido, fica parada. */
export function Marquee() {
  const row = (
    <span className="flex shrink-0 items-center gap-8 pr-8">
      {words.map((w) => (
        <span key={w} className="flex items-center gap-8">
          <span>{w}</span>
          <svg viewBox="0 0 10 10" className="size-3 shrink-0 fill-ink" aria-hidden="true">
            <path d="M3 0h7L7 10H0z" />
          </svg>
        </span>
      ))}
    </span>
  );
  return (
    <div className="relative overflow-hidden border-y border-lime bg-lime py-4 text-ink">
      <p className="sr-only">{site.slogan}</p>
      <div aria-hidden="true" className="display flex w-max text-[clamp(1.25rem,3vw,2rem)] motion-safe:animate-marquee">
        {row}
        {row}
      </div>
    </div>
  );
}
