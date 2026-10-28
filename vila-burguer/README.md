# Cardápio digital – Vila Burguer (Parnaíba-PI)

Proposta de cardápio digital no estilo "bloco de cor": laranja, magenta, amarelo
e marrom, tipografia gigante (Anton) e um burger ilustrado que se desmonta e
remonta conforme a pessoa rola a página. Um único arquivo: `index.html`.

## Dados usados (conferir com a casa)
- Instagram: @vilaburguerphb · pedidos: https://menu.brendi.com.br/vila-burguer
- Horário e endereço: busca na web (todos os dias 17h40–00h; Av. São Sebastião, Ideal 1, Loja 18)
- Preços "a partir de": apps de delivery (Brendi, iFood, aiqfome) em out/2026
- Descrições curtas: genéricas, escritas para a proposta

## Antes de entregar
- Conferir preços, descrições, horário e endereço (cada produto é um `<li class="item">`)
- Remover a faixa "Proposta · cardápio digital demo" (`<p class="demo">`) e o texto `.fine` do rodapé
- Se o cliente quiser, trocar o burger ilustrado por fotos reais dos lanches

## Técnico
- GSAP 3.12.5 + ScrollTrigger e Lenis 1.1.13 via jsDelivr (versões fixas)
- Sem as bibliotecas, sem JavaScript ou com "reduzir movimento" ativo, a página
  continua completa (só fica sem as animações)
