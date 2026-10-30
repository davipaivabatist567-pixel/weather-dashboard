"use client";

import { createContext, useCallback, useContext, useState, type ReactNode } from "react";

export type LeadPrefill = { plan?: string; objective?: string };
type Request = LeadPrefill & { id: number };

const LeadContext = createContext<{ request: Request | null; prefill: (p: LeadPrefill) => void } | null>(null);

/** Permite que botões de modalidades e planos preencham o formulário de matrícula e levem o visitante até ele. */
export function LeadProvider({ children }: { children: ReactNode }) {
  const [request, setRequest] = useState<Request | null>(null);
  const prefill = useCallback((p: LeadPrefill) => {
    setRequest({ ...p, id: Date.now() });
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    window.setTimeout(() => {
      document.getElementById("matricula")?.scrollIntoView({ behavior: reduce ? "auto" : "smooth" });
    }, 60);
  }, []);
  return <LeadContext.Provider value={{ request, prefill }}>{children}</LeadContext.Provider>;
}

export function useLead() {
  const ctx = useContext(LeadContext);
  if (!ctx) throw new Error("useLead precisa estar dentro de <LeadProvider>");
  return ctx;
}

/** Link para o formulário; sem JavaScript, continua sendo uma âncora comum. */
export function LeadLink({ plan, objective, className, children }: LeadPrefill & { className?: string; children: ReactNode }) {
  const { prefill } = useLead();
  return (
    <a
      href="#matricula"
      className={className}
      onClick={(e) => {
        e.preventDefault();
        prefill({ plan, objective });
      }}
    >
      {children}
    </a>
  );
}
