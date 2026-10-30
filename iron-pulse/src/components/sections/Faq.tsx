"use client";

import { useId, useState } from "react";
import { Plus } from "lucide-react";
import { faq } from "@/data/content";
import { Reveal } from "@/components/ui/Reveal";
import { SectionHeading } from "@/components/ui/SectionHeading";

export function Faq() {
  const [open, setOpen] = useState<number | null>(0);
  const baseId = useId();

  return (
    <section id="faq" aria-labelledby="faq-title" className="bg-coal py-24 sm:py-32">
      <div className="mx-auto grid max-w-[90rem] gap-14 px-5 sm:px-8 lg:grid-cols-12 lg:gap-12 lg:px-12">
        <SectionHeading
          index="08"
          label="Dúvidas"
          id="faq-title"
          className="lg:col-span-5"
          title={
            <>
              Perguntas <span className="text-lime">frequentes.</span>
            </>
          }
          text="Não achou o que procurava? Fale com a equipe pelo WhatsApp."
        />

        <Reveal as="ul" className="border-t border-white/10 lg:col-span-7">
          {faq.map((item, i) => {
            const isOpen = open === i;
            const buttonId = `${baseId}-q${i}`;
            const panelId = `${baseId}-a${i}`;
            return (
              <li key={item.q} className="border-b border-white/10">
                <h3>
                  <button
                    id={buttonId}
                    type="button"
                    aria-expanded={isOpen}
                    aria-controls={panelId}
                    onClick={() => setOpen(isOpen ? null : i)}
                    className="group flex w-full items-center justify-between gap-6 py-6 text-left"
                  >
                    <span className="text-lg font-semibold leading-snug transition-colors group-hover:text-lime sm:text-xl">{item.q}</span>
                    <span
                      className={`inline-flex size-11 shrink-0 items-center justify-center border transition-colors duration-300 ${
                        isOpen ? "border-lime bg-lime text-ink" : "border-white/20 text-lime group-hover:border-lime"
                      }`}
                    >
                      <Plus className={`size-4 transition-transform duration-500 ease-pulse ${isOpen ? "rotate-45" : ""}`} aria-hidden="true" />
                    </span>
                  </button>
                </h3>
                <div
                  id={panelId}
                  role="region"
                  aria-labelledby={buttonId}
                  inert={!isOpen}
                  className={`grid transition-[grid-template-rows,opacity] duration-500 ease-pulse ${
                    isOpen ? "grid-rows-[1fr] opacity-100" : "grid-rows-[0fr] opacity-0"
                  }`}
                >
                  <div className="overflow-hidden">
                    <p className="max-w-2xl pb-7 pr-14 leading-relaxed text-steel">{item.a}</p>
                  </div>
                </div>
              </li>
            );
          })}
        </Reveal>
      </div>
    </section>
  );
}
