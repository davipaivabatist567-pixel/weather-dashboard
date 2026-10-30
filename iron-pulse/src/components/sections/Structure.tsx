import { spaces } from "@/data/content";
import { Photo } from "@/components/ui/Photo";
import { Reveal } from "@/components/ui/Reveal";
import { SectionHeading } from "@/components/ui/SectionHeading";

// tamanho de cada foto na composição (celular: uma coluna; tablet: duas; computador: mosaico)
const layout = [
  "sm:col-span-2 aspect-[4/3] sm:aspect-[16/9] lg:col-span-7 lg:row-span-2 lg:aspect-auto",
  "aspect-[4/3] lg:col-span-5 lg:aspect-[16/10]",
  "aspect-[4/3] lg:col-span-5 lg:aspect-[16/10]",
  "aspect-[4/3] lg:col-span-6 lg:aspect-[16/9]",
  "aspect-[4/3] lg:col-span-6 lg:aspect-[16/9]",
];
const sizes = [
  "(min-width: 1024px) 56vw, 100vw",
  "(min-width: 1024px) 40vw, (min-width: 640px) 50vw, 100vw",
  "(min-width: 1024px) 40vw, (min-width: 640px) 50vw, 100vw",
  "(min-width: 1024px) 48vw, (min-width: 640px) 50vw, 100vw",
  "(min-width: 1024px) 48vw, (min-width: 640px) 50vw, 100vw",
];

export function Structure() {
  return (
    <section id="estrutura" aria-labelledby="estrutura-title" className="bg-coal py-24 sm:py-32">
      <div className="mx-auto max-w-[90rem] px-5 sm:px-8 lg:px-12">
        <div className="grid gap-8 lg:grid-cols-12 lg:items-end">
          <SectionHeading
            index="02"
            label="Estrutura"
            id="estrutura-title"
            className="lg:col-span-8"
            title={
              <>
                Estrutura que <span className="text-lime">impulsiona</span> resultados.
              </>
            }
          />
          <Reveal as="p" delay={160} className="max-w-md leading-relaxed text-steel sm:text-lg lg:col-span-4">
            Cada espaço foi organizado para o seu treino render: do aquecimento ao último exercício.
          </Reveal>
        </div>

        <ul className="mt-14 grid gap-4 sm:grid-cols-2 lg:mt-20 lg:grid-cols-12">
          {spaces.map((s, i) => (
            <Reveal as="li" key={s.title} delay={(i % 3) * 100} className={`group relative overflow-hidden bg-ink ${layout[i]}`}>
              <Photo
                name={s.photo}
                sizes={sizes[i]}
                className="transition-transform duration-[1400ms] ease-pulse group-hover:scale-[1.06]"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-ink via-ink/30 to-transparent" />
              <span
                aria-hidden="true"
                className="absolute right-4 top-4 size-4 border-r-2 border-t-2 border-lime opacity-0 transition-opacity duration-500 group-hover:opacity-100"
              />
              <div className="absolute inset-x-0 bottom-0 p-5 sm:p-7">
                <p className="tag text-lime">
                  {String(i + 1).padStart(2, "0")} / {String(spaces.length).padStart(2, "0")}
                </p>
                <h3 className="display mt-2 text-[1.45rem] sm:text-[1.7rem]">{s.title}</h3>
                <p className="mt-2 max-w-sm text-sm leading-relaxed text-steel">{s.text}</p>
              </div>
            </Reveal>
          ))}
        </ul>
      </div>
    </section>
  );
}
