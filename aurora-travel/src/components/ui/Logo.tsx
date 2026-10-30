/** Logotipo tipográfico: AURORA em serifa com o arco do amanhecer, TRAVEL em caixa alta espaçada. */
export function Logo({ className = "" }: { className?: string }) {
  return (
    <span className={`inline-flex items-center gap-3 ${className}`}>
      <svg viewBox="0 0 32 20" className="h-4 w-6.5 text-gold" aria-hidden="true">
        <path d="M4 18a12 12 0 0 1 24 0" fill="none" stroke="currentColor" strokeWidth="1.5" />
        <path d="M16 1v4M6.5 5.5l2.6 2.6M25.5 5.5l-2.6 2.6M0 18.5h32" stroke="currentColor" strokeWidth="1.5" />
      </svg>
      <span className="flex items-baseline gap-2 leading-none">
        <span className="font-display text-[1.6rem] tracking-[0.06em]">AURORA</span>
        <span className="text-[0.6rem] font-semibold tracking-[0.42em]">TRAVEL</span>
      </span>
    </span>
  );
}
