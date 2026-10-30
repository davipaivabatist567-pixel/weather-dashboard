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
    <section id="faq" aria-labelledby="faq-title" className="bg-white py-24 sm:py-32 lg:py-40">
      <div className="mx-auto grid max-w-[90rem] gap-14 px-5 sm:px-8 lg:grid-cols-12 lg:gap-12 lg:px-12">
        <SectionHeading
          index="06"
          label="Dúvidas"
          id="faq-title"
          className="lg:col-span-5"
          title={
            <>
              Perguntas <em className="text-gold-ink">frequentes.</em>
            </>
          }
          text="O essencial sobre como funciona o planejamento com a Aurora."
        />

        <Reveal as="ul" className="border-t border-navy/15 lg:col-span-7">
          {faq.map((item, i) => {
            const isOpen = open === i;
            const buttonId = `${baseId}-q${i}`;
            const panelId = `${baseId}-a${i}`;
            return (
              <li key={item.q} className="border-b border-navy/15">
                <h3>
                  <button
                    id={buttonId}
                    type="button"
                    aria-expanded={isOpen}
                    aria-controls={panelId}
                    onClick={() => setOpen(isOpen ? null : i)}
                    className="group flex w-full items-center justify-between gap-6 py-6 text-left"
                  >
                    <span className="font-display text-[1.6rem] leading-tight sm:text-[1.9rem]">{item.q}</span>
                    <span className="inline-flex size-11 shrink-0 items-center justify-center rounded-full border border-navy/15 transition-colors duration-500 group-hover:border-navy">
                      <Plus
                        className={`size-4 transition-transform duration-500 ease-aurora ${isOpen ? "rotate-45" : ""}`}
                        aria-hidden="true"
                      />
                    </span>
                  </button>
                </h3>
                <div
                  id={panelId}
                  role="region"
                  aria-labelledby={buttonId}
                  inert={!isOpen}
                  className={`grid transition-[grid-template-rows,opacity] duration-500 ease-aurora ${
                    isOpen ? "grid-rows-[1fr] opacity-100" : "grid-rows-[0fr] opacity-0"
                  }`}
                >
                  <div className="overflow-hidden">
                    <p className="max-w-2xl pb-7 pr-14 leading-relaxed text-navy/70">{item.a}</p>
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
