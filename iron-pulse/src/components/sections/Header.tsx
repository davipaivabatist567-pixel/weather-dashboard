"use client";

import { useEffect, useRef, useState } from "react";
import { ArrowUpRight, Menu, X } from "lucide-react";
import { brand, site } from "@/config/site";
import { greetingUrl } from "@/lib/whatsapp";
import { Logo } from "@/components/ui/Logo";
import { buttonClass } from "@/components/ui/button";

export function Header() {
  const [scrolled, setScrolled] = useState(false);
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState("#inicio");
  const progressRef = useRef<HTMLSpanElement>(null);
  const toggleRef = useRef<HTMLButtonElement>(null);
  const firstLinkRef = useRef<HTMLAnchorElement>(null);

  // fundo ao rolar + barra de progresso da página
  useEffect(() => {
    let frame = 0;
    const update = () => {
      frame = 0;
      setScrolled(window.scrollY > 24);
      const max = document.documentElement.scrollHeight - window.innerHeight;
      if (progressRef.current) progressRef.current.style.transform = `scaleX(${max > 0 ? window.scrollY / max : 0})`;
    };
    const onScroll = () => {
      if (!frame) frame = requestAnimationFrame(update);
    };
    update();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);
    return () => {
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
    };
  }, []);

  // indicador da seção atual no menu
  useEffect(() => {
    const sections = site.nav.map((n) => document.querySelector(n.href)).filter((el): el is Element => !!el);
    const io = new IntersectionObserver(
      (entries) => {
        for (const e of entries) if (e.isIntersecting) setActive(`#${e.target.id}`);
      },
      { rootMargin: "-45% 0px -50% 0px" },
    );
    sections.forEach((s) => io.observe(s));
    return () => io.disconnect();
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

  // link do menu do celular: fecha o menu (que trava a rolagem) e só então rola até a seção
  const goTo = (e: React.MouseEvent<HTMLAnchorElement>) => {
    const hash = e.currentTarget.hash;
    e.preventDefault();
    setOpen(false);
    window.setTimeout(() => {
      const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
      document.querySelector(hash)?.scrollIntoView({ behavior: reduce ? "auto" : "smooth" });
      history.pushState(null, "", hash);
    }, 0);
  };

  return (
    <>
      <header
        className={`fixed inset-x-0 top-0 z-50 transition-[background-color,border-color] duration-500 ease-pulse ${
          scrolled || open ? "border-b border-white/10 bg-ink/80 backdrop-blur-md" : "border-b border-transparent"
        }`}
      >
        <div className="mx-auto flex h-18 max-w-[90rem] items-center justify-between gap-6 px-5 sm:px-8 lg:h-20 lg:px-12">
          <a href="#inicio" aria-label={`${brand}, voltar ao início`} onClick={(e) => open && goTo(e)}>
            <Logo />
          </a>

          <nav aria-label="Principal" className="hidden lg:block">
            <ul className="flex items-center gap-1">
              {site.nav.map((item) => {
                const current = active === item.href;
                return (
                  <li key={item.href}>
                    <a
                      href={item.href}
                      aria-current={current ? "true" : undefined}
                      className={`relative inline-flex min-h-11 items-center px-3.5 text-[0.82rem] font-medium transition-colors duration-300 hover:text-white ${
                        current ? "text-white" : "text-steel"
                      }`}
                    >
                      {item.label}
                      <span
                        aria-hidden="true"
                        className={`absolute bottom-1.5 left-1/2 size-1 -translate-x-1/2 bg-lime transition-opacity duration-300 ${
                          current ? "opacity-100" : "opacity-0"
                        }`}
                      />
                    </a>
                  </li>
                );
              })}
            </ul>
          </nav>

          <div className="flex items-center gap-2">
            <span className="hidden sm:block">
              <a href="#matricula" className={buttonClass("lime", "", "sm")}>
                Matricule-se
              </a>
            </span>
            <button
              ref={toggleRef}
              type="button"
              aria-expanded={open}
              aria-controls="menu-celular"
              onClick={() => setOpen((v) => !v)}
              className="-mr-2 inline-flex size-12 items-center justify-center lg:hidden"
            >
              <span className="sr-only">{open ? "Fechar menu" : "Abrir menu"}</span>
              {open ? <X className="size-6" strokeWidth={1.75} /> : <Menu className="size-6" strokeWidth={1.75} />}
            </button>
          </div>
        </div>
        {/* barra de progresso da página */}
        <span
          ref={progressRef}
          aria-hidden="true"
          className="absolute inset-x-0 bottom-[-1px] h-0.5 origin-left scale-x-0 bg-lime"
        />
      </header>

      <div
        id="menu-celular"
        role="dialog"
        aria-modal="true"
        aria-label="Menu"
        hidden={!open}
        className="fixed inset-0 z-40 overflow-y-auto bg-ink lg:hidden"
      >
        <div className="flex min-h-full flex-col px-5 pb-10 pt-28 sm:px-8">
          <p className="tag text-lime">Menu</p>
          <nav aria-label="Menu do celular" className="mt-5">
            <ul className="border-t border-white/10">
              {site.nav.map((item, i) => (
                <li key={item.href} className="border-b border-white/10">
                  <a
                    ref={i === 0 ? firstLinkRef : undefined}
                    href={item.href}
                    onClick={goTo}
                    className="display flex items-center justify-between py-4 text-[1.9rem]"
                  >
                    {item.label}
                    <span className="tag text-steel">0{i + 1}</span>
                  </a>
                </li>
              ))}
            </ul>
          </nav>
          <div className="mt-auto grid gap-3 pt-10">
            <a href="#matricula" onClick={goTo} className={buttonClass("lime")}>
              Matricule-se
            </a>
            <a href={greetingUrl()} target="_blank" rel="noopener noreferrer" className={buttonClass("ghost")}>
              Falar no WhatsApp <ArrowUpRight className="size-4" />
            </a>
            <p className="tag mt-4 text-center text-steel">{site.slogan}</p>
          </div>
        </div>
      </div>
    </>
  );
}
