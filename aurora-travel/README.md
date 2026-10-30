# Aurora Travel: site de viagens premium (demonstração)

Site de uma agência de viagens **fictícia**, feito para demonstração comercial (vídeos no TikTok, portfólio).
Next.js 16 (App Router) + React 19 + TypeScript + Tailwind CSS 4 + Lucide, exportado como site estático.

## Rodar e publicar

```bash
npm install
npm run dev            # http://localhost:3000
npm run build          # gera a pasta out/ (site estático, hospede em qualquer lugar: Vercel, Netlify, GitHub Pages...)
npm run html           # depois do build: gera aurora-travel.html, versão em HTML puro num arquivo só
npm run fotos          # baixa e otimiza as fotos do Unsplash para public/photos (veja abaixo)
npm run lint
```

## Versão em HTML puro
`npm run html` gera `aurora-travel.html`: o mesmo site num arquivo só (~300 KB), sem React nem Next.js no navegador.
Usa o HTML e o CSS que o `next build` gerou e troca o React pelas interações de `scripts/html-puro/app.js`
(menu, janelas dos destinos, planejador com validação e WhatsApp, perguntas, animações). Fontes, ícone e fotos
baixadas vão dentro do arquivo; abre direto no celular e funciona sem internet, exceto as fotos que ainda vêm do
Unsplash. Depois de editar o projeto, rode `npm run build && npm run html` de novo.

## Onde editar

| O quê | Arquivo |
| --- | --- |
| Nome, slogan, **número do WhatsApp**, horário, redes sociais, menu, aviso de demonstração | `src/config/site.ts` |
| Destinos (textos, melhor época, duração) | `src/data/destinations.ts` |
| Experiências | `src/data/experiences.ts` |
| Tipos de viagem e faixas de orçamento do planejador | `src/data/planner.ts` |
| Benefícios e perguntas frequentes | `src/data/content.ts` |
| Fotos (id de cada foto no Unsplash) | `src/data/photos.ts` |
| Cores e fontes | `src/app/globals.css` (bloco `@theme`) e `src/app/layout.tsx` |

### WhatsApp
`site.whatsapp.number` está vazio de propósito: na demonstração, o WhatsApp abre com a mensagem pronta e a pessoa
escolhe o contato, e o site mostra "+55 (00) 00000-0000 · número de demonstração". Para um cliente real, coloque o
número só com dígitos (`"55" + DDD + número`), troque `display` e mude `isDemo` para `false`.

### Fotos
As 12 fotos são do Unsplash (licença Unsplash: uso comercial livre, sem atribuição obrigatória). Enquanto não forem
baixadas, carregam direto do Unsplash. `npm run fotos` baixa cada uma, gera WebP em 640/1280/1920 px em
`public/photos/` e marca em `src/data/local-photos.json` quais já são locais. Se uma foto não carregar, o site mostra
um degradê da marca no lugar (nunca o ícone de imagem quebrada).

## Estrutura

```
src/
  app/            layout (fontes, metadados), página, estilos globais e ícone
  config/site.ts  dados da agência
  data/           conteúdo (destinos, experiências, planejador, FAQ, fotos)
  lib/            regras do planejador (validação, resumo, mensagem) e link do WhatsApp
  components/
    sections/     uma seção da página por arquivo (Header, Hero, Destinations, Experiences, TripPlanner,
                  Feature, WhyAurora, Testimonials, Faq, Footer)
    ui/           peças reutilizáveis (Photo, Reveal, Dialog, SectionHeading, Logo, button)
    PlannerContext.tsx  liga cartões de destino/experiência ao planejador
scripts/          baixar-fotos.mjs, html-puro.mjs e html-puro/app.js
```

## O que o site faz
- **Menu** fixo que fica sólido ao rolar; no celular, menu em tela cheia (Esc fecha, foco no primeiro link).
- **Destinos**: "Conhecer destino" abre uma janela com história, melhor época, perfil e duração sugerida, e um botão
  que preenche o planejador com aquele destino.
- **Experiências**: cada uma preenche o tipo de viagem no planejador.
- **Planejador**: validação com mensagens claras (datas no passado, volta antes da ida, 1 a 20 viajantes...),
  resumo antes de enviar e envio pelo WhatsApp. O texto deixa claro que é **só uma solicitação de planejamento**,
  sem reserva.
- **Depoimentos**: cartões reservados, sem avaliações inventadas, enquanto `isDemo` for `true`.
- Animações discretas (entrada ao rolar, abertura da foto em destaque) desligadas quando o sistema pede
  **movimento reduzido**; sem JavaScript, todo o conteúdo continua visível.

## Avisos de demonstração
Com `isDemo: true`, o rodapé diz que a marca é fictícia e que telefone e redes são ilustrativos. As redes sociais
apontam para as páginas iniciais do Instagram, TikTok e YouTube até serem trocadas pelos perfis reais. Não há
páginas de privacidade e termos; inclua links para elas no rodapé quando existirem.
