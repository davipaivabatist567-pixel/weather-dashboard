"use client";

import { useEffect, useRef, useState } from "react";
import { ArrowUpRight, Menu, X } from "lucide-react";
import { site } from "@/config/site";
import { greetingUrl } from "@/lib/whatsapp";
import { buttonClass } from "@/components/ui/button";
import { Logo } from "@/components/ui/Logo";

export function Header() {
  const [scrolled, setScrolled] = useState(false);
  const [open, setOpen] = useState(false);
  const toggleRef = useRef<HTMLButtonElement>(null);
  const firstLinkRef = useRef<HTMLAnchorElement>(null);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 24);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  // menu do celular: trava a rolagem, foca o primeiro link, Esc fecha
  useEffect(() => {
    document.documentElement.classList.toggle("menu-open", open);
    if (!open) return;
    firstLinkRef.current?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setOpen(false);
        toggleRef.current?.focus();
      }
    };
    const onResize = () => window.innerWidth >= 1024 && setOpen(false);
    window.addEventListener("keydown", onKey);
    window.addEventListener("resize", onResize);
    return () => {
      window.removeEventListener("keydown", onKey);
      window.removeEventListener("resize", onResize);
    };
  }, [open]);

  const solid = scrolled && !open;

  // link do menu do celular: primeiro fecha o menu (que trava a rolagem), depois rola até a seção
  const goTo = (e: React.MouseEvent<HTMLAnchorElement>) => {
    const hash = e.currentTarget.hash;
    e.preventDefault();
    setOpen(false);
    window.setTimeout(() => {
      const target = document.querySelector(hash);
      if (!target) return;
      const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
      target.scrollIntoView({ behavior: reduce ? "auto" : "smooth" });
      history.pushState(null, "", hash);
    }, 0);
  };

  return (
    <>
      <header
        className={`fixed inset-x-0 top-0 z-50 transition-[background-color,color,box-shadow] duration-500 ease-aurora ${
          solid ? "bg-white/95 text-navy shadow-[0_1px_0_rgb(16_29_44/0.08)] backdrop-blur-md" : "text-white"
        }`}
      >
        <div className="mx-auto flex h-18 max-w-[90rem] items-center justify-between gap-6 px-5 sm:px-8 lg:h-20 lg:px-12">
          <a href="#inicio" aria-label={`${site.name}, voltar ao início`} onClick={(e) => open && goTo(e)}>
            <Logo />
          </a>

          <nav aria-label="Principal" className="hidden lg:block">
            <ul className="flex items-center gap-9">
              {site.nav.map((item) => (
                <li key={item.href}>
                  <a href={item.href} className="group inline-block py-2.5 text-[0.8rem] font-medium tracking-[0.08em]">
                    <span className="link-line pb-1">{item.label}</span>
                  </a>
                </li>
              ))}
            </ul>
          </nav>

          <div className="flex items-center gap-3">
            <span className="hidden sm:block">
              <a href="#planejar" className={buttonClass(solid ? "navy" : "light", "", "sm")}>
                Planejar minha viagem
              </a>
            </span>
            <button
              ref={toggleRef}
              type="button"
              aria-expanded={open}
              aria-controls="menu-celular"
              onClick={() => setOpen((v) => !v)}
              className="-mr-2 inline-flex size-12 items-center justify-center rounded-full lg:hidden"
            >
              <span className="sr-only">{open ? "Fechar menu" : "Abrir menu"}</span>
              {open ? <X className="size-6" strokeWidth={1.5} /> : <Menu className="size-6" strokeWidth={1.5} />}
            </button>
          </div>
        </div>
      </header>

      {/* menu do celular */}
      <div
        id="menu-celular"
        role="dialog"
        aria-modal="true"
        aria-label="Menu"
        hidden={!open}
        className="fixed inset-0 z-40 overflow-y-auto bg-navy text-white lg:hidden"
      >
        <div className="flex min-h-full flex-col px-5 pb-10 pt-28 sm:px-8">
          <p className="eyebrow text-gold">Menu</p>
          <nav aria-label="Menu do celular" className="mt-6">
            <ul className="divide-y divide-white/10 border-y border-white/10">
              {site.nav.map((item, i) => (
                <li key={item.href}>
                  <a
                    ref={i === 0 ? firstLinkRef : undefined}
                    href={item.href}
                    onClick={goTo}
                    className="flex items-baseline justify-between py-4 font-display text-[2.4rem] leading-none"
                  >
                    {item.label}
                    <span className="eyebrow text-white/40">0{i + 1}</span>
                  </a>
                </li>
              ))}
            </ul>
          </nav>
          <div className="mt-auto grid gap-3 pt-10">
            <a href="#planejar" onClick={goTo} className={buttonClass("gold")}>
              Planejar minha viagem
            </a>
            <a href={greetingUrl()} target="_blank" rel="noopener noreferrer" className={buttonClass("light")}>
              Falar no WhatsApp <ArrowUpRight className="size-4" />
            </a>
            <p className="mt-4 text-center text-sm text-white/60">{site.slogan}</p>
          </div>
        </div>
      </div>
    </>
  );
}
