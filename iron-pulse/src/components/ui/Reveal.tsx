"use client";

import { useEffect, useRef, type CSSProperties, type ComponentPropsWithoutRef, type ElementType, type ReactNode } from "react";

type RevealProps<T extends ElementType> = {
  as?: T;
  delay?: number;
  children: ReactNode;
} & Omit<ComponentPropsWithoutRef<T>, "as" | "children">;

let observer: IntersectionObserver | null = null;
function getObserver() {
  observer ??= new IntersectionObserver(
    (entries) => {
      for (const entry of entries) {
        if (!entry.isIntersecting) continue;
        entry.target.setAttribute("data-shown", "");
        observer?.unobserve(entry.target);
      }
    },
    { rootMargin: "0px 0px -10% 0px" },
  );
  return observer;
}

/** Entrada suave (sobe e aparece) quando o elemento chega na tela. Respeita o movimento reduzido via CSS. */
export function Reveal<T extends ElementType = "div">({ as, delay = 0, children, style, ...rest }: RevealProps<T>) {
  const Tag: ElementType = as ?? "div";
  const ref = useRef<HTMLElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (!("IntersectionObserver" in window)) {
      el.setAttribute("data-shown", "");
      return;
    }
    const io = getObserver();
    io.observe(el);
    return () => io.unobserve(el);
  }, []);

  return (
    <Tag ref={ref} data-reveal="" style={{ ...(style as CSSProperties), "--reveal-delay": `${delay}ms` } as CSSProperties} {...rest}>
      {children}
    </Tag>
  );
}
