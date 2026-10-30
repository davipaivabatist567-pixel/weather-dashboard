"use client";

import { useState } from "react";
import { ArrowRight, CalendarDays, Clock3, Heart, MapPin, X } from "lucide-react";
import { destinations, type Destination } from "@/data/destinations";
import { Photo } from "@/components/ui/Photo";
import { Reveal } from "@/components/ui/Reveal";
import { SectionHeading } from "@/components/ui/SectionHeading";
import { Dialog } from "@/components/ui/Dialog";
import { PlanTripLink } from "@/components/PlannerContext";
import { arrowClass, buttonClass } from "@/components/ui/button";

export function Destinations() {
  const [selected, setSelected] = useState<Destination | null>(null);

  return (
    <section id="destinos" aria-labelledby="destinos-title" className="bg-white py-24 sm:py-32 lg:py-40">
      <div className="mx-auto max-w-[90rem] px-5 sm:px-8 lg:px-12">
        <div className="grid gap-8 lg:grid-cols-12 lg:items-end">
          <SectionHeading
            index="01"
            label="Destinos"
            id="destinos-title"
            className="lg:col-span-7"
            title={
              <>
                Lugares que ficam <em className="text-gold-ink">para sempre.</em>
              </>
            }
          />
          <Reveal as="p" delay={160} className="max-w-md text-base leading-relaxed text-navy/70 sm:text-lg lg:col-span-4 lg:col-start-9">
            Seis destinos escolhidos a dedo, do Índico à Serra Gaúcha. Toque em um deles para conhecer melhor e começar
            o seu roteiro.
          </Reveal>
        </div>

        <ul className="mt-16 grid gap-x-8 gap-y-16 sm:grid-cols-2 lg:mt-24 lg:grid-cols-3 lg:gap-y-24">
          {destinations.map((d, i) => (
            <Reveal as="li" key={d.slug} delay={(i % 3) * 120} className={i % 3 === 1 ? "lg:translate-y-24" : ""}>
              <DestinationCard destination={d} index={i} onOpen={() => setSelected(d)} />
            </Reveal>
          ))}
        </ul>
      </div>

      <Dialog open={selected !== null} onClose={() => setSelected(null)} labelledBy="destino-dialog-title">
        {selected && <DestinationDetails destination={selected} onClose={() => setSelected(null)} />}
      </Dialog>
    </section>
  );
}

function DestinationCard({ destination: d, index, onOpen }: { destination: Destination; index: number; onOpen: () => void }) {
  return (
    <article className="group">
      <button
        type="button"
        onClick={onOpen}
        tabIndex={-1}
        aria-hidden="true"
        className="relative block aspect-[4/5] w-full cursor-pointer overflow-hidden bg-mist"
      >
        <Photo
          name={d.photo}
          sizes="(min-width: 1024px) 30vw, (min-width: 640px) 46vw, 92vw"
          className="transition-transform duration-[1600ms] ease-aurora group-hover:scale-[1.06]"
        />
        <span className="absolute inset-0 bg-gradient-to-t from-navy/60 via-navy/0 to-navy/0 opacity-80 transition-opacity duration-700 group-hover:opacity-100" />
        <span className="absolute left-5 top-5 font-display text-2xl text-white/90">{String(index + 1).padStart(2, "0")}</span>
        <span className="eyebrow absolute bottom-5 left-5 text-white/85">{d.coordinates}</span>
      </button>

      <div className="mt-6 flex items-start justify-between gap-4">
        <div>
          <p className="eyebrow text-gold-ink">{d.region}</p>
          <h3 className="mt-3 font-display text-[2.4rem] leading-none sm:text-[2.6rem]">{d.name}</h3>
          <p className="mt-2 font-display text-xl italic text-navy/75">{d.tagline}</p>
        </div>
      </div>
      <p className="mt-4 max-w-sm leading-relaxed text-navy/70">{d.summary}</p>
      <button
        type="button"
        onClick={onOpen}
        className="mt-6 inline-flex min-h-11 items-center gap-3 text-[0.78rem] font-semibold uppercase tracking-[0.16em]"
      >
        <span className="link-line pb-1">Conhecer destino</span>
        <ArrowRight className={arrowClass} />
      </button>
    </article>
  );
}

function DestinationDetails({ destination: d, onClose }: { destination: Destination; onClose: () => void }) {
  const facts = [
    { icon: CalendarDays, label: "Melhor época", value: d.bestTime },
    { icon: Heart, label: "Ideal para", value: d.idealFor },
    { icon: Clock3, label: "Duração sugerida", value: d.duration },
  ];
  return (
    <div className="grid min-h-full sm:grid-cols-2">
      <div className="relative min-h-[42vh] sm:min-h-[34rem]">
        <Photo name={d.photo} sizes="(min-width: 640px) 46vw, 100vw" />
        <div className="absolute inset-0 bg-gradient-to-t from-navy/70 via-transparent to-transparent" />
        <p className="eyebrow absolute bottom-5 left-5 flex items-center gap-2 text-white">
          <MapPin className="size-3.5" /> {d.coordinates}
        </p>
      </div>

      <div className="relative flex flex-col p-6 pb-8 sm:p-10">
        <button
          type="button"
          onClick={onClose}
          className="absolute right-3 top-3 inline-flex size-12 items-center justify-center rounded-full text-navy transition-colors hover:bg-mist"
        >
          <X className="size-5" strokeWidth={1.5} />
          <span className="sr-only">Fechar</span>
        </button>
        <p className="eyebrow text-gold-ink">{d.region}</p>
        <h3 id="destino-dialog-title" className="mt-3 pr-10 font-display text-[clamp(2.6rem,6vw,3.75rem)] leading-[0.95]">
          {d.name}
        </h3>
        <p className="mt-2 font-display text-2xl italic text-navy/75">{d.tagline}</p>
        <p className="mt-6 leading-relaxed text-navy/75">{d.story}</p>

        <dl className="mt-8 divide-y divide-navy/10 border-y border-navy/10">
          {facts.map(({ icon: Icon, label, value }) => (
            <div key={label} className="flex items-start gap-4 py-4">
              <Icon className="mt-0.5 size-4 shrink-0 text-gold-ink" strokeWidth={1.5} />
              <dt className="eyebrow w-32 shrink-0 pt-0.5 text-navy/60">{label}</dt>
              <dd className="text-sm leading-relaxed">{value}</dd>
            </div>
          ))}
        </dl>

        <p className="mt-6 text-xs leading-relaxed text-navy/60">
          Valores, disponibilidade e condições são apresentados depois da solicitação de planejamento.
        </p>
        <div className="mt-auto flex flex-col gap-3 pt-8">
          <PlanTripLink destination={d.name} onDone={onClose} className={buttonClass("navy")}>
            Planejar viagem para {d.name} <ArrowRight className={arrowClass} />
          </PlanTripLink>
        </div>
      </div>
    </div>
  );
}
