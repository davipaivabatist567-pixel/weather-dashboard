import { ArrowUp, ArrowUpRight } from "lucide-react";
import { brand, fullAddress, site } from "@/config/site";
import { greetingUrl } from "@/lib/whatsapp";
import { Logo } from "@/components/ui/Logo";
import { PrivacyLink } from "@/components/Privacy";
import { buttonClass } from "@/components/ui/button";

export function Footer() {
  const { studio } = site;
  return (
    <footer className="border-t border-white/10 bg-ink">
      <div className="mx-auto max-w-[90rem] px-5 pt-20 sm:px-8 lg:px-12">
        <div className="grid gap-12 sm:grid-cols-2 lg:grid-cols-12">
          <div className="lg:col-span-4">
            <Logo />
            <p className="display mt-6 text-[1.7rem] text-lime">{site.slogan}</p>
            <a href="#matricula" className={buttonClass("lime", "mt-8")}>
              Matricule-se
            </a>
          </div>

          <nav aria-label="Rodapé" className="lg:col-span-2 lg:col-start-6">
            <p className="tag text-lime">Seções</p>
            <ul className="mt-5 grid gap-1">
              {[...site.nav, { label: "Matrícula", href: "#matricula" }, { label: "Dúvidas", href: "#faq" }].map((item) => (
                <li key={item.href}>
                  <a href={item.href} className="inline-flex min-h-10 items-center text-steel transition-colors hover:text-white">
                    {item.label}
                  </a>
                </li>
              ))}
            </ul>
          </nav>

          <div className="lg:col-span-3">
            <p className="tag text-lime">Contato</p>
            <ul className="mt-5 grid gap-3 text-steel">
              <li>
                <a href={greetingUrl()} target="_blank" rel="noopener noreferrer" className="text-white transition-colors hover:text-lime">
                  WhatsApp {site.phone.display}
                </a>
              </li>
              <li>{fullAddress}</li>
              <li>
                {site.hours[0].days}: {site.hours[0].time}
              </li>
              {site.isDemo && <li className="tag text-lime/80">Dados demonstrativos</li>}
            </ul>
          </div>

          <div className="lg:col-span-2">
            <p className="tag text-lime">Redes sociais</p>
            <ul className="mt-5 grid gap-1">
              {site.social.map((s) => (
                <li key={s.label}>
                  <a
                    href={s.href}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="group inline-flex min-h-10 items-center gap-2 text-steel transition-colors hover:text-white"
                  >
                    {s.label}
                    <ArrowUpRight className="size-3.5 transition-transform duration-300 group-hover:-translate-y-0.5 group-hover:translate-x-0.5" aria-hidden="true" />
                  </a>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>

      {/* assinatura gigante em contorno */}
      <p
        aria-hidden="true"
        className="display mt-16 select-none overflow-hidden whitespace-nowrap text-center text-[12.2vw] leading-[0.8] text-transparent [-webkit-text-stroke:1px_rgb(255_255_255/0.12)] [font-stretch:125%]"
      >
        {brand}
      </p>

      <div className="mt-8 border-t border-white/10">
        <div className="mx-auto flex max-w-[90rem] flex-col gap-6 px-5 py-8 text-xs leading-relaxed text-steel sm:px-8 lg:flex-row lg:items-center lg:justify-between lg:px-12">
          <div className="grid gap-1.5">
            {site.isDemo && (
              <p>
                <strong className="font-semibold text-white">Projeto demonstrativo.</strong>{" "}
                {site.name ? `${site.name} é uma marca fictícia` : "A academia é fictícia"}; preços, equipe, endereço e
                contatos são ilustrativos.
              </p>
            )}
            <p className="flex flex-wrap items-center gap-x-4 gap-y-1">
              <span>© {brand}</span>
              <PrivacyLink className="inline-flex min-h-10 items-center underline decoration-white/30 underline-offset-4 hover:text-white">
                Política de privacidade
              </PrivacyLink>
              <span>Fotografias: Unsplash</span>
            </p>
          </div>
          <div className="flex items-center justify-between gap-6 lg:justify-end">
            <p>
              Site criado por{" "}
              {studio.url ? (
                <a href={studio.url} target="_blank" rel="noopener noreferrer" className="font-semibold text-white underline decoration-lime underline-offset-4 hover:text-lime">
                  {studio.name}
                </a>
              ) : (
                <span className="font-semibold text-white">{studio.name}</span>
              )}
            </p>
            <a href="#inicio" className="group inline-flex min-h-10 shrink-0 items-center gap-2 text-white">
              Topo
              <ArrowUp className="size-3.5 text-lime transition-transform duration-300 group-hover:-translate-y-0.5" aria-hidden="true" />
            </a>
          </div>
        </div>
      </div>
    </footer>
  );
}
