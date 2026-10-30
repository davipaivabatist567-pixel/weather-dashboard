"use client";

import { createContext, useCallback, useContext, useState, type ReactNode } from "react";
import type { TripType } from "@/data/planner";

export type PlannerPrefill = { destination?: string; tripType?: TripType };
type Request = PlannerPrefill & { id: number };

const PlannerContext = createContext<{ request: Request | null; planTrip: (prefill: PlannerPrefill) => void } | null>(
  null,
);

/** Permite que cartões de destino e experiências preencham o planejador e levem o visitante até ele. */
export function PlannerProvider({ children }: { children: ReactNode }) {
  const [request, setRequest] = useState<Request | null>(null);

  const planTrip = useCallback((prefill: PlannerPrefill) => {
    setRequest({ ...prefill, id: Date.now() });
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    // espera um instante: se a chamada veio de um diálogo, ele fecha antes e a página volta a rolar
    window.setTimeout(() => {
      document.getElementById("planejar")?.scrollIntoView({ behavior: reduce ? "auto" : "smooth" });
    }, 60);
  }, []);

  return <PlannerContext.Provider value={{ request, planTrip }}>{children}</PlannerContext.Provider>;
}

export function usePlanner() {
  const ctx = useContext(PlannerContext);
  if (!ctx) throw new Error("usePlanner precisa estar dentro de <PlannerProvider>");
  return ctx;
}

type PlanTripLinkProps = PlannerPrefill & { className?: string; children: ReactNode; onDone?: () => void };

/** Link para o planejador. Sem JavaScript, continua funcionando como âncora comum. */
export function PlanTripLink({ destination, tripType, className, children, onDone }: PlanTripLinkProps) {
  const { planTrip } = usePlanner();
  return (
    <a
      href="#planejar"
      className={className}
      onClick={(e) => {
        e.preventDefault();
        onDone?.();
        planTrip({ destination, tripType });
      }}
    >
      {children}
    </a>
  );
}
