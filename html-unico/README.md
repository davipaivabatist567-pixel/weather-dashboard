# Cardápios em arquivo único (para enviar ao cliente)

Cada arquivo aqui é um cardápio completo em um único `.html`: animações e fontes
e imagens estão dentro do arquivo. Abre no navegador do celular ou do computador, como
anexo do WhatsApp e até sem internet (os botões de pedido precisam de internet).

| Arquivo | Estabelecimento |
|---|---|
| `cardapio-vila-burguer.html` | Vila Burguer |
| `cardapio-baru-burgers.html` | Baru Burgers |
| `cardapio-sorveteria-araujo.html` | Sorveteria Araújo |
| `cardapio-bruthus-burger.html` | Bruthus Burger: burger que se abre em camadas e pedido pelo WhatsApp (itens de exemplo) |

As versões para editar ficam nas pastas de cada estabelecimento (`index.html`).
Depois de editar, gere de novo:

    python3 tools/gerar-html-unico.py vila-burguer baru-burgers sorveteria-araujo bruthus-burger

## site-aurora-travel.html
Site de demonstração da agência fictícia Aurora Travel (projeto em `aurora-travel/`, Next.js).
Gerado com `npm run build && npm run arquivo-unico` dentro de `aurora-travel/`. Funciona sem internet,
exceto as fotos, que carregam do Unsplash até serem baixadas com `npm run fotos`.
