import { ArrowUp, ArrowUpRight } from "lucide-react";
import { site } from "@/config/site";
import { greetingUrl } from "@/lib/whatsapp";
import { Logo } from "@/components/ui/Logo";
import { Reveal } from "@/components/ui/Reveal";
import { arrowClass, buttonClass } from "@/components/ui/button";

export function Footer() {
  const demoNumber = site.isDemo && !site.whatsapp.number;
  return (
    <footer id="contato" aria-labelledby="contato-title" className="bg-navy text-white">
      <div className="mx-auto max-w-[90rem] px-5 pt-24 sm:px-8 sm:pt-32 lg:px-12">
        <div className="grid gap-10 border-b border-white/10 pb-20 lg:grid-cols-12 lg:items-end">
          <Reveal
            as="h2"
            id="contato-title"
            className="font-display text-[clamp(3rem,9vw,7rem)] leading-[0.92] tracking-[-0.02em] lg:col-span-8"
          >
            Para onde vamos <em className="text-gold">agora?</em>
          </Reveal>
          <Reveal delay={120} className="flex flex-col gap-3 sm:flex-row lg:col-span-4 lg:flex-col lg:items-stretch">
            <a href={greetingUrl()} target="_blank" rel="noopener noreferrer" className={buttonClass("gold")}>
              Conversar no WhatsApp <ArrowUpRight className={arrowClass} />
            </a>
            <a href="#planejar" className={buttonClass("light")}>
              Planejar minha viagem
            </a>
          </Reveal>
        </div>

        <div className="grid gap-12 py-16 sm:grid-cols-2 lg:grid-cols-12">
          <div className="lg:col-span-4">
            <Logo />
            <p className="mt-5 font-display text-2xl italic text-white/80">{site.slogan}</p>
          </div>

          <nav aria-label="Rodapé" className="lg:col-span-2 lg:col-start-6">
            <p className="eyebrow text-gold">Navegação</p>
            <ul className="mt-5 grid gap-1">
              {site.nav.map((item) => (
                <li key={item.href}>
                  <a href={item.href} className="link-line inline-flex min-h-10 items-center text-white/80 hover:text-white">
                    {item.label}
                  </a>
                </li>
              ))}
            </ul>
          </nav>

          <div className="lg:col-span-3">
            <p className="eyebrow text-gold">Contato</p>
            <ul className="mt-5 grid gap-3 text-white/80">
              <li>
                <a href={greetingUrl()} target="_blank" rel="noopener noreferrer" className="link-line text-white">
                  WhatsApp {site.whatsapp.display}
                </a>
                {demoNumber && <span className="mt-1 block text-xs text-white/50">Número de demonstração</span>}
              </li>
              <li>{site.hours}</li>
              <li>{site.coverage}</li>
            </ul>
          </div>

          <div className="lg:col-span-2">
            <p className="eyebrow text-gold">Redes sociais</p>
            <ul className="mt-5 grid gap-1">
              {site.social.map((s) => (
                <li key={s.label}>
                  <a
                    href={s.href}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="group inline-flex min-h-10 items-center gap-2 text-white/80 hover:text-white"
                  >
                    <span className="link-line">{s.label}</span>
                    <ArrowUpRight className="size-3.5 transition-transform duration-500 group-hover:-translate-y-0.5 group-hover:translate-x-0.5" />
                  </a>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>

      {/* assinatura gigante */}
      <p aria-hidden="true" className="select-none overflow-hidden whitespace-nowrap text-center font-display text-[24vw] leading-[0.78] text-white/[0.06]">
        Aurora
      </p>

      <div className="border-t border-white/10">
        <div className="mx-auto flex max-w-[90rem] flex-col gap-6 px-5 py-8 text-xs leading-relaxed text-white/55 sm:px-8 lg:flex-row lg:items-center lg:justify-between lg:px-12">
          <div className="grid gap-1">
            {site.isDemo && (
              <p>
                <strong className="font-semibold text-white/75">Projeto de demonstração.</strong> Aurora Travel é uma
                marca fictícia; telefone e redes sociais são ilustrativos e nenhum serviço é vendido por este site.
              </p>
            )}
            <p>Fotografias: Unsplash (licença Unsplash).</p>
          </div>
          <a href="#inicio" className="group inline-flex min-h-10 shrink-0 items-center gap-2 text-white/75 hover:text-white">
            Voltar ao topo
            <ArrowUp className="size-3.5 transition-transform duration-500 group-hover:-translate-y-0.5" />
          </a>
        </div>
      </div>
    </footer>
  );
}
