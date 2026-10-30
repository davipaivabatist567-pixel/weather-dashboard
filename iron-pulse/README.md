# Iron Pulse Fitness: site premium de academia (demonstração)

Site de uma academia **fictícia**, criado pela DP Web Studio para demonstração (vídeos no TikTok, portfólio).
Next.js 16 (App Router) + React 19 + TypeScript + Tailwind CSS 4 + Lucide, exportado como site estático.

## Comandos

```bash
npm install
npm run dev     # http://localhost:3000
npm run build   # gera out/ (site estático: Vercel, Netlify, GitHub Pages, qualquer hospedagem)
npm run html    # depois do build: gera iron-pulse.html, o site inteiro em HTML puro num arquivo só
npm run fotos   # baixa e otimiza as fotos do Unsplash para public/photos
npm run lint
```

## Onde editar (tudo centralizado)

| O quê | Arquivo |
| --- | --- |
| Nome, slogan, **telefone/WhatsApp**, endereço, mapa, horários, redes, crédito da DP Web Studio, **envio do formulário**, aviso de demonstração | `src/config/site.ts` |
| **Planos**: nomes, preços, benefícios, plano em destaque | `src/data/plans.ts` |
| Pilares, espaços da estrutura, modalidades, objetivos, horários de contato, equipe, perguntas frequentes | `src/data/content.ts` |
| Política de privacidade | `src/data/privacy.ts` |
| Fotos (id de cada foto no Unsplash e enquadramento) | `src/data/photos.ts` |
| Cores e fontes | `src/app/globals.css` (bloco `@theme`) e `src/app/layout.tsx` |

As respostas das perguntas frequentes usam os dados configurados (planos, modalidades, telefone e horários),
então continuam coerentes quando eles mudam.

## Formulário de matrícula
- Validação: nome e sobrenome, telefone com DDD (máscara automática), e-mail opcional, plano, objetivo, horário e
  **consentimento** (com link para a política de privacidade).
- **Envio real só quando configurado**: preencha `leadEndpoint` em `src/config/site.ts` com um endereço que receba
  POST em JSON (Formspree, Make, Zapier, sistema da academia). O site mostra "Recebemos seus dados" só quando o
  servidor confirma; se falhar, avisa e oferece tentar de novo.
- Sem `leadEndpoint`, **nada é enviado**: o site confere os dados e diz isso claramente, oferecendo continuar pelo
  WhatsApp com a mensagem preenchida.
- O WhatsApp usa `phone.whatsapp` (só dígitos, `"55" + DDD + número`). Vazio = demonstração: o WhatsApp abre com a
  mensagem pronta e a pessoa escolhe o contato.

## Antes de publicar para um cliente
1. Trocar telefone, endereço, horários, redes sociais e o `mapEmbedUrl` (Google Maps → Compartilhar → Incorporar).
2. Trocar planos e preços em `src/data/plans.ts` e a equipe em `src/data/content.ts` (com fotos reais).
3. Revisar a política de privacidade com a academia (razão social, CNPJ, encarregado de dados).
4. Configurar `leadEndpoint`, se a academia tiver onde receber os cadastros.
5. Mudar `isDemo` para `false`: somem os avisos de "demonstrativo".
6. Se quiser, preencher `studio.url` com o portfólio da DP Web Studio: o crédito no rodapé vira link.

## Fotos
As 10 fotos são do Unsplash (licença Unsplash: uso comercial livre). Aparecem em preto e branco com contraste
dramático (a cor volta um pouco ao passar o mouse). Enquanto não forem baixadas, carregam do Unsplash; se alguma
falhar, entra um fundo grafite no lugar. `npm run fotos` baixa todas, gera WebP em 640/1280/1920 px em
`public/photos/` e passa o site a usar as cópias locais.

## Versão em HTML puro
`npm run html` usa o HTML e o CSS do `next build` e troca o React pelas interações de `scripts/html-puro/app.js`
(menu, barra de progresso, seção atual no menu, formulário com validação e envio, WhatsApp, política de privacidade,
perguntas, movimento das fotos). Resultado: `iron-pulse.html`, um arquivo só que abre direto no celular.
Depois de editar o projeto, rode `npm run build && npm run html` de novo.

## Estrutura
```
src/
  config/site.ts         dados da academia
  data/                  planos, conteúdo, privacidade, fotos
  lib/                   formulário (validação, mensagem, envio) e WhatsApp
  components/sections/   Header, Hero, Marquee, Impact, Structure, Modalities, Plans, Team, Motivation,
                         Enroll, Location, Faq, Footer
  components/ui/         Photo, Parallax, Reveal, Dialog, SectionHeading, Logo, button
  components/            LeadContext (botões que preenchem o formulário), Privacy
scripts/                 baixar-fotos.mjs, html-puro.mjs, html-puro/app.js
```
