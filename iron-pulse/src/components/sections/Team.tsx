import { MessageCircle } from "lucide-react";
import { hello, site } from "@/config/site";
import { team } from "@/data/content";
import { whatsappUrl } from "@/lib/whatsapp";
import { Photo } from "@/components/ui/Photo";
import { Reveal } from "@/components/ui/Reveal";
import { SectionHeading } from "@/components/ui/SectionHeading";

export function Team() {
  return (
    <section id="equipe" aria-labelledby="equipe-title" className="bg-ink py-24 sm:py-32">
      <div className="mx-auto max-w-[90rem] px-5 sm:px-8 lg:px-12">
        <SectionHeading
          index="05"
          label="Equipe"
          id="equipe-title"
          className="max-w-4xl"
          title={
            <>
              Ao seu lado em <span className="text-lime">cada evolução.</span>
            </>
          }
          text={
            site.isDemo
              ? "Perfis demonstrativos: nomes fictícios e fotos ilustrativas, a serem trocados pela equipe real da academia."
              : "Profissionais que acompanham você do primeiro treino em diante."
          }
        />

        <ul className="mt-14 grid gap-5 sm:grid-cols-2 lg:mt-20 lg:grid-cols-3">
          {team.map((m, i) => (
            <Reveal as="li" key={m.name} delay={i * 110} className={`group ${i === 2 ? "sm:col-span-2 lg:col-span-1" : ""}`}>
              <article className="relative flex h-full flex-col border border-white/10 bg-coal">
                <div className="relative aspect-[4/5] overflow-hidden bg-ink sm:aspect-[3/4] lg:aspect-[4/5]">
                  <Photo
                    name={m.photo}
                    sizes="(min-width: 1024px) 30vw, (min-width: 640px) 46vw, 92vw"
                    className="photo-mono group-hover:scale-[1.05] group-hover:[filter:grayscale(0.2)_contrast(1.05)]"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-coal via-transparent to-transparent" />
                  {site.isDemo && (
                    <span className="tag absolute left-4 top-4 border border-white/20 bg-ink/70 px-2.5 py-1 text-white backdrop-blur">
                      Perfil demonstrativo
                    </span>
                  )}
                </div>
                <div className="flex flex-1 flex-col p-7">
                  <p className="tag text-lime">{m.role}</p>
                  <h3 className="display mt-2 text-[1.6rem]">{m.name}</h3>
                  <p className="mt-3 leading-relaxed text-steel">{m.bio}</p>
                  <a
                    href={whatsappUrl(`${hello} Vim pelo site e quero saber sobre treinos com ${m.name}.`)}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="mt-6 inline-flex min-h-11 items-center gap-2 self-start text-sm font-semibold text-white transition-colors hover:text-lime"
                  >
                    <MessageCircle className="size-4 text-lime" aria-hidden="true" />
                    Falar sobre treinos com {m.name.split(" ")[0]}
                  </a>
                </div>
              </article>
            </Reveal>
          ))}
        </ul>
      </div>
    </section>
  );
}
