"use client";

import { useEffect, useState, type ReactNode } from "react";
import { X } from "lucide-react";
import { privacyNotice, privacySections } from "@/data/privacy";
import { Dialog } from "@/components/ui/Dialog";

const OPEN_EVENT = "abrir-privacidade";

/** Link que abre a Política de privacidade (em uma janela, sem sair da página). */
export function PrivacyLink({ className, children }: { className?: string; children: ReactNode }) {
  return (
    <a
      href="#privacidade"
      className={className}
      onClick={(e) => {
        e.preventDefault();
        window.dispatchEvent(new Event(OPEN_EVENT));
      }}
    >
      {children}
    </a>
  );
}

/** Política de privacidade. É um MODELO: revise com a assessoria jurídica da academia antes de publicar. */
export function PrivacyDialog() {
  const [open, setOpen] = useState(false);
  useEffect(() => {
    const show = () => setOpen(true);
    window.addEventListener(OPEN_EVENT, show);
    return () => window.removeEventListener(OPEN_EVENT, show);
  }, []);

  return (
    <Dialog open={open} onClose={() => setOpen(false)} labelledBy="privacidade-title">
      <div className="relative p-6 pb-10 sm:p-10">
        <button
          type="button"
          onClick={() => setOpen(false)}
          className="absolute right-3 top-3 inline-flex size-12 items-center justify-center text-white transition-colors hover:text-lime"
        >
          <X className="size-5" />
          <span className="sr-only">Fechar</span>
        </button>
        <p className="tag text-lime">Seus dados</p>
        <h2 id="privacidade-title" className="display mt-3 pr-10 text-[2rem]">
          Política de privacidade
        </h2>
        {privacyNotice && <p className="mt-4 border-l-2 border-lime pl-3 text-sm text-steel">{privacyNotice}</p>}
        <div className="mt-6 grid gap-5 text-[0.95rem] leading-relaxed text-steel">
          {privacySections.map((s) => (
            <div key={s.title}>
              <h3 className="font-semibold text-white">{s.title}</h3>
              <p>{s.text}</p>
            </div>
          ))}
        </div>
      </div>
    </Dialog>
  );
}
