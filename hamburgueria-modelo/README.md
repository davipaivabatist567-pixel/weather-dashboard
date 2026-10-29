# Cardápio digital – modelo de hamburgueria

Mesmo layout do cardápio do Bruthus (burger que se abre em camadas no scroll e
pedido pelo WhatsApp), mas **sem nenhum dado de uma casa real**: o nome
"Chapa Burger", os produtos, os preços, o endereço e os contatos são fictícios.
Serve para mostrar o trabalho (vídeo, TikTok, portfólio) e como ponto de partida
para um cliente novo.

## Cardápio (fictício)
- **Burgers da casa** (com foto): Clássico R$ 22 · Duplo Bacon R$ 29 · Triplo R$ 35 · Monstro R$ 42
- **Smash, frango e kids:** Smash Simples R$ 18 · Smash Duplo R$ 24 · Salada R$ 24 · Frango Crispy R$ 26 · Kids R$ 16
- **Combos:** Smash R$ 30 · Clássico R$ 34 · Duplo Bacon R$ 40 · Casal R$ 69 · Família R$ 119
- **Porções:** Batata P R$ 14 · Batata M R$ 19 · Batata Cheddar e Bacon R$ 26 · Onion Rings R$ 22 · Nuggets R$ 18
- **Bebidas e sobremesas:** Refri lata R$ 6 · Refri 1 L R$ 10 · Refri 2 L R$ 14 · Suco natural R$ 9 · Água R$ 4 · Milkshake R$ 16 · Brownie R$ 12

## WhatsApp
`WHATS` no script está vazio: o WhatsApp abre com o pedido já escrito e pergunta
para quem enviar. Para um cliente, coloque o número dele (só dígitos, com 55 e DDD).

## Imagens
- `img/camada-0` a `camada-5`: recortes da foto de burger enviada para o projeto.
  Se a foto veio de outro site ou perfil, ela tem dono; para postar sem risco,
  troque por uma foto sua ou de banco de imagens livre.
- `img/simples`, `duplo`, `triplo`, `bruto`: renderizações 3D feitas para o projeto.

## Gerar de novo
O `index.html` é gerado a partir do Bruthus:
`python3 tools/gerar-modelo-hamburgueria.py bruthus-burger/index.html hamburgueria-modelo/index.html`
e o arquivo único com `python3 tools/gerar-html-unico.py hamburgueria-modelo`.
