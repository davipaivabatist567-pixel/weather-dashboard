type Variant = "gold" | "light" | "navy" | "outline";

const variants: Record<Variant, string> = {
  gold: "bg-gold text-navy hover:bg-[#d4b783]",
  light: "border border-white/60 text-white hover:bg-white hover:text-navy",
  navy: "bg-navy text-white hover:bg-navy-700",
  outline: "border border-navy/25 text-navy hover:border-navy hover:bg-navy hover:text-white",
};

/** Classes do botão em formato de pílula, usado em links e botões. */
export function buttonClass(variant: Variant = "gold", extra = "", size: "md" | "sm" = "md") {
  return [
    "group inline-flex items-center justify-center gap-3 rounded-full",
    size === "md" ? "min-h-13 px-7" : "min-h-11 px-5",
    "text-[0.78rem] font-semibold uppercase tracking-[0.16em]",
    "transition-[background-color,color,border-color,transform] duration-500 ease-aurora active:scale-[0.98]",
    variants[variant],
    extra,
  ].join(" ");
}

/** Seta que avança ao passar o mouse sobre o botão. */
export const arrowClass = "size-4 shrink-0 transition-transform duration-500 ease-aurora group-hover:translate-x-1";
