type Variant = "lime" | "ghost" | "dark";

// canto chanfrado só nos botões preenchidos (no contorno, o corte apagaria a borda)
const cut = "[clip-path:polygon(0_0,100%_0,100%_calc(100%-10px),calc(100%-10px)_100%,0_100%)]";

const variants: Record<Variant, string> = {
  lime: `bg-lime text-ink hover:bg-white ${cut}`,
  ghost: "border border-white/30 text-white hover:border-lime hover:text-lime",
  dark: `bg-ink text-white hover:bg-coal-2 ${cut}`,
};

/** Botão de cantos retos, caixa alta e seta que avança no hover. */
export function buttonClass(variant: Variant = "lime", extra = "", size: "md" | "sm" = "md") {
  return [
    "group relative inline-flex items-center justify-center gap-3 font-semibold uppercase",
    size === "md" ? "min-h-13 px-7 text-[0.8rem] tracking-[0.14em]" : "min-h-11 px-5 text-[0.72rem] tracking-[0.14em]",
    "transition-[background-color,color,border-color,transform] duration-300 ease-pulse active:scale-[0.98]",
    variants[variant],
    extra,
  ].join(" ");
}

export const arrowClass = "size-4 shrink-0 transition-transform duration-300 ease-pulse group-hover:translate-x-1";
