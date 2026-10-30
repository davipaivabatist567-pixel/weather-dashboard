import { Clock, MapPin, MessageCircle, Navigation, Phone, TriangleAlert } from "lucide-react";
import { fullAddress, mapsUrl, site } from "@/config/site";
import { greetingUrl } from "@/lib/whatsapp";
import { Reveal } from "@/components/ui/Reveal";
import { SectionHeading } from "@/components/ui/SectionHeading";
import { buttonClass } from "@/components/ui/button";

export function Location() {
  const { address } = site;
  return (
    <section id="contato" aria-labelledby="contato-title" className="bg-ink py-24 sm:py-32">
      <div className="mx-auto max-w-[90rem] px-5 sm:px-8 lg:px-12">
        <SectionHeading
          index="07"
          label="Localização e contato"
          id="contato-title"
          title={
            <>
              Venha <span className="text-lime">treinar.</span>
            </>
          }
        />

        {site.isDemo && (
          <Reveal as="p" className="mt-8 flex max-w-3xl items-start gap-3 border border-lime/30 bg-lime/[0.06] p-4 text-sm leading-relaxed text-steel">
            <TriangleAlert className="mt-0.5 size-4 shrink-0 text-lime" aria-hidden="true" />
            <span>
              <strong className="font-semibold text-white">Dados demonstrativos.</strong> Endereço, horários e telefone
              precisam ser substituídos pelos dados reais antes da publicação comercial.
            </span>
          </Reveal>
        )}

        <div className="mt-12 grid gap-5 lg:grid-cols-12">
          <Reveal className="grid gap-px self-start overflow-hidden border border-white/10 bg-white/10 lg:col-span-5">
            <div className="bg-coal p-7">
              <p className="tag flex items-center gap-2 text-lime">
                <MapPin className="size-4" aria-hidden="true" /> Endereço
              </p>
              <address className="mt-3 text-lg not-italic leading-relaxed">
                {address.street}
                <br />
                {address.district} · {address.city} – {address.state}
              </address>
            </div>
            <div className="bg-coal p-7">
              <p className="tag flex items-center gap-2 text-lime">
                <Clock className="size-4" aria-hidden="true" /> Horários
              </p>
              <dl className="mt-3 grid gap-2">
                {site.hours.map((h) => (
                  <div key={h.days} className="flex justify-between gap-4 border-b border-white/5 pb-2 last:border-0 last:pb-0">
                    <dt className="text-steel">{h.days}</dt>
                    <dd className="font-semibold">{h.time}</dd>
                  </div>
                ))}
              </dl>
            </div>
            <div className="bg-coal p-7">
              <p className="tag flex items-center gap-2 text-lime">
                <Phone className="size-4" aria-hidden="true" /> Telefone e WhatsApp
              </p>
              <p className="mt-3 text-lg">{site.phone.display}</p>
              <div className="mt-6 flex flex-col gap-3 sm:flex-row lg:flex-col xl:flex-row">
                <a href={greetingUrl()} target="_blank" rel="noopener noreferrer" className={buttonClass("lime", "flex-1")}>
                  <MessageCircle className="size-4" aria-hidden="true" /> Abrir WhatsApp
                </a>
                <a href={mapsUrl} target="_blank" rel="noopener noreferrer" className={buttonClass("ghost", "flex-1")}>
                  <Navigation className="size-4" aria-hidden="true" /> Ver no mapa
                </a>
              </div>
            </div>
          </Reveal>

          <Reveal delay={120} className="relative min-h-[22rem] overflow-hidden border border-white/10 bg-coal lg:col-span-7">
            {address.mapEmbedUrl ? (
              <iframe
                src={address.mapEmbedUrl}
                title={`Mapa: ${fullAddress}`}
                loading="lazy"
                referrerPolicy="no-referrer-when-downgrade"
                className="absolute inset-0 h-full w-full grayscale invert-[0.9] hue-rotate-180"
              />
            ) : (
              <MapPlaceholder />
            )}
          </Reveal>
        </div>
      </div>
    </section>
  );
}

/** Espaço do mapa enquanto o endereço real não é configurado (src/config/site.ts → address.mapEmbedUrl). */
function MapPlaceholder() {
  return (
    <div className="absolute inset-0 flex flex-col items-center justify-center p-8 text-center">
      <svg aria-hidden="true" className="absolute inset-0 h-full w-full text-white/[0.07]" preserveAspectRatio="xMidYMid slice" viewBox="0 0 600 400">
        <g fill="none" stroke="currentColor" strokeWidth="1">
          {Array.from({ length: 13 }, (_, i) => (
            <path key={`v${i}`} d={`M${i * 50} 0V400`} />
          ))}
          {Array.from({ length: 9 }, (_, i) => (
            <path key={`h${i}`} d={`M0 ${i * 50}H600`} />
          ))}
        </g>
        <g fill="none" stroke="currentColor" strokeWidth="10" className="text-white/[0.06]">
          <path d="M-20 300C120 260 200 120 340 140S520 60 640 40" />
          <path d="M150 -20L230 420" />
          <path d="M420 -20C400 120 470 260 440 420" />
        </g>
      </svg>
      <span className="relative inline-flex size-16 items-center justify-center bg-lime text-ink [clip-path:polygon(0_0,100%_0,100%_70%,50%_100%,0_70%)]">
        <MapPin className="-mt-2 size-7" strokeWidth={2} aria-hidden="true" />
      </span>
      <p className="display relative mt-6 text-xl">Mapa da academia</p>
      <p className="relative mt-2 max-w-sm text-sm leading-relaxed text-steel">
        Espaço reservado para o mapa. Ele aparece aqui quando o endereço real for configurado.
      </p>
    </div>
  );
}
