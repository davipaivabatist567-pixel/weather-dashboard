# Aventura do Pinguim: Fighting Arena

Jogo de luta 2D (estilo Street Fighter) em HTML5 + Canvas 2D + JavaScript puro, com os
personagens da Aventura do Pinguim. Funciona no computador e no celular (Android), sem
bibliotecas externas.

## Como jogar

- **Arquivo único:** `dist/aventura-do-pinguim.html` tem tudo embutido (código, estilos e
  sprites). Basta abrir no navegador do computador ou do celular, sem precisar de mais nada.
  Para gerar de novo depois de mudar o código: `npm run build`.
- **Android (APK):** `dist/aventura-do-pinguim.apk`. Copie para o celular, abra o arquivo e
  permita "instalar apps de fontes desconhecidas". Requer Android 7.0 ou mais novo. O app abre
  em tela cheia, sempre na horizontal; o botão *voltar* pausa a luta, volta de tela nos menus
  e fecha o app na tela inicial. Para gerar de novo: `npm run apk` (precisa de Java e internet
  para baixar do Maven Central as ferramentas listadas em `android/tools/build_apk.py`;
  não precisa do Android SDK).
- Versão em pastas: abra `index.html` direto no navegador **ou** rode `npm start` e acesse
  `http://localhost:8080`.
- Para publicar, basta enviar a pasta inteira para qualquer hospedagem estática (GitHub Pages etc.).

### Controles (teclado, remapeáveis em *Controles*)

| Ação | Jogador 1 | Jogador 2 |
|---|---|---|
| Andar | A / D | ← / → |
| Pular | W | ↑ |
| Agachar | S | ↓ |
| Soco | J | Num 1 ou `,` |
| Chute | K | Num 2 ou `.` |
| Defesa | L | Num 3 ou `/` |
| Especial | U | Num 5 ou M |
| Super | I (ou J+K com barra cheia) | Num 6 ou N |
| Pausa | Esc ou P | |

Controles USB/Bluetooth (gamepad) também funcionam. No celular aparecem botões virtuais
com multitouch (andar e atacar ao mesmo tempo).

### Golpes comuns a todos

- `J, J, K` combo básico · `→+J` soco forte · `→+K` chute médio · `↓+K` rasteira (golpe baixo)
- `J+K` perto: agarrão · `→ →` corrida · `← ←` recuo
- `L` defende (segure `↓` para defesa baixa); apertar `L` no instante do golpe = **defesa perfeita**
- Especiais: `↓↘→+J` (ou `U`), `→→+J` (ou `→+U`), `↓↙←+J` (ou `↓+U`), Super: barra cheia + `J+K`

| Personagem | ↓↘→ / U | →→ / →+U | ↓↙← / ↓+U | Super |
|---|---|---|---|---|
| Pingui | Bola de Gelo | Investida Congelante | Tempestade Polar | Nevasca Suprema |
| Rei Gélido | Rajada de Gelo | Escudo Glacial | Tornado Congelante | Era do Gelo |
| Capitão Barracuda | Tiro de Canhão | Ataque de Âncora | Chuva de Balas de Canhão | Bombardeio Total |
| Golem de Neve | Soco Sísmico (armadura) | Terremoto (golpe baixo) | Avalanche | Fúria do Glaciar |
| Bruxa Aurora | Raio Mágico | Teleporte Arcano | Vórtice | Aurora Boreal |

## Modos

Arcade (até o chefe final e o resgate da Pinguinha), Jogador x CPU (fácil/normal/difícil),
2 Jogadores locais, Treinamento (boneco parado/agachado/defendendo/pulando/CPU/Jogador 2,
contador de combo e dano, vida recarregável, `R` reposiciona, `F1` mostra caixas de colisão)
e Sobrevivência (ondas cada vez mais difíceis, recorde salvo).

## Estrutura

```
index.html, style.css      página, menus e controles de toque
src/core.js                constantes e utilitários
src/assets.js              carregamento de imagens com tratamento de falhas
src/input.js               teclado remapeável, toque multitouch, gamepad, buffer de comandos
src/data/characters.js     atributos, golpes e especiais de cada personagem
src/data/atlas.js          metadados dos spritesheets (gerado)
src/animation.js           seleção de quadros e substitutos de animação
src/fighter.js             máquina de estados do lutador e física
src/combat.js              hitbox x hurtbox, dano, defesa, combos, projéteis
src/match.js               rounds, cronômetro, regras de vitória (usado por todos os modos)
src/ai.js                  CPU e boneco do treino
src/effects.js, stage.js   partículas, tremor de câmera, arenas animadas e clima
src/audio.js               efeitos e música sintetizados (Web Audio)
src/render.js              câmera, desenho e HUD
src/ui.js, src/game.js     telas e laço principal (requestAnimationFrame + passo fixo)
tools/build_sprites.py     recorta as pranchas originais e gera os atlas
tools/build_single_html.py gera o HTML único em dist/
android/                   app Android (WebView) e gerador do APK
assets/source/             as duas pranchas originais
assets/sprites/            spritesheets gerados (quadros uniformes, fundo transparente)
tests/                     testes automáticos (Node) e teste no navegador (Playwright)
```

### Adicionar um personagem

1. Acrescente o recorte dele em `tools/build_sprites.py` e rode `npm run sprites`.
2. Crie a entrada em `src/data/characters.js` (atributos, `sprites` e `specials`) e inclua o id em
   `PF.CHARACTER_ORDER`. O sistema de combate não precisa mudar. Animações sem quadros usam
   automaticamente um substituto (ver `FALLBACK` em `src/animation.js`).

## Testes

- `npm test` — regras de combate (alcance, dano único por golpe, limites de vida/energia,
  defesa alta/baixa, projéteis, agarrão, super, rounds, pausa, anti-infinito, colisão entre
  corpos, tempo esgotado, treino, animações e 25 partidas CPU x CPU completas).
- `npm run test:browser` — abre o jogo no Chromium (desktop, celular com multitouch e tela em
  retrato), joga uma luta, testa pausa, reinício sem duplicar o laço e procura erros de JavaScript.
- Lista de verificação manual: [TESTES.md](TESTES.md).

## Limitações conhecidas

- O APK é assinado com uma chave de desenvolvimento (`android/keystore/`, senha no script),
  guardada no repositório para que as próximas versões instalem por cima da anterior. Para
  publicar na Play Store é preciso gerar uma chave própria e mantê-la em segredo.

- As pranchas originais são imagens de apresentação, não spritesheets. Os quadros foram
  recortados automaticamente: cada personagem tem de 1 a 5 quadros por ação. Ações sem
  desenho próprio (agachar, defesa, soco/chute fraco/médio/forte separados, atordoamento,
  dano para os 4 personagens além do Pingui) usam um quadro existente com transformação
  simples (escala sempre uniforme, inclinação, deslocamento, brilho) — o desenho nunca é
  achatado ou esticado. Quadros que a prancha desenhou maiores/menores que o resto da
  mesma animação são reescalados automaticamente na geração dos sprites. O Pingui tem só 1 quadro por ação,
  então suas animações são as mais "duras".
- No celular o jogo fica sempre na horizontal: ao tocar em *Começar* ele tenta tela cheia e
  trava a orientação (Android/Chrome). Se o navegador não permitir (ex.: iPhone ou trava de
  rotação), a interface inteira é girada 90° — é só virar o celular. Dá para desligar em
  *Opções → Celular sempre na horizontal*.
- O modo 2 jogadores no mesmo celular não tem dois conjuntos de botões na tela; o 2º jogador
  precisa de teclado ou controle.
- A fonte "Press Start 2P" vem do Google Fonts; sem internet o jogo usa uma fonte monoespaçada.
