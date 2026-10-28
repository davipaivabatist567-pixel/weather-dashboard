# Cardápio digital – Bruthus Burger (Parnaíba-PI)

Estilo bruto: preto, vermelho e mostarda, fonte Big Shoulders Display.
No topo, um Duplo realista; com o scroll ele se abre camada por camada no ar
(pão com gergelim, carne + cheddar, carne + cheddar, tomate, alface, pão), com
o nome de cada camada ao lado, e depois fecha de novo.

As imagens ficam em `img/`: `camada-0` a `camada-5` (de baixo para cima) e as
fotos do cardápio (`simples`, `duplo`, `triplo`, `bruto`). São renderizações 3D
ilustrativas. Para usar fotos reais da casa, troque os arquivos mantendo os
nomes (cada camada recortada com fundo transparente, no mesmo enquadramento).

## Pedido pelo WhatsApp
- Cada burger e acompanhamento tem "+ Adicionar", que vira contador (− 1 +)
- O botão flutuante mostra "Ver pedido (n) · total" e abre a tela do pedido:
  nome, entrega ou retirada, endereço, pagamento e observações
- "Enviar pedido no WhatsApp" abre a conversa com (86) 99455-2629 e a mensagem pronta
- Sem JavaScript, cada item vira um link direto para o WhatsApp

## ATENÇÃO: cardápio de exemplo
O cardápio real da Bruthus não estava disponível na web. Os burgers
Simples/Duplo/Triplo/Bruto e os preços R$ 19/26/33/39 são EXEMPLOS e estão
marcados assim na página. Trocar pelo cardápio da casa antes de entregar.

## Dados reais usados (conferir com a casa)
- Slogan "Hamburgueria genuinamente piauiense": página da Bruthus no Facebook
- Endereço Av. São Sebastião, 3500 · quarta a segunda, 18h–23h · WhatsApp (86) 99455-2629: Instagram @bruthusphb
  (o Foursquare lista outro número na mesma avenida: 2960; confirmar)
- iFood: Bruthus Hamburgueria (Frei Higino); item "Batata palito P"
- Pedidos: WhatsApp (botão principal) e iFood (link secundário)

## Antes de entregar
- Colocar os itens e preços reais (cada produto é um `<li class="item">`)
- Remover a faixa "Proposta · cardápio digital demo" (`<p class="demo">`) e o texto `.fine` do rodapé
