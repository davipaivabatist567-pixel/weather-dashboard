---
name: remover-marca-dagua
description: Remove marcas d'água, logos ou textos fixos de vídeos que o próprio usuário criou (ex.: marca do app de edição, logo antigo, texto que ficou na tela). Use quando o usuário pedir para tirar/apagar/esconder marca d'água, logo ou texto de um vídeo dele.
---

# Remover marca d'água de vídeos

Ferramenta: `ffmpeg` (já instalado). Scripts em `scripts/` desta skill.

> Use apenas em vídeos que o usuário criou ou tem direito de editar. Se o vídeo
> for de outra pessoa (ex.: baixado do TikTok/YouTube de outro criador) e a marca
> identifica o autor, não remova — explique o motivo e ofereça outra ajuda.

## Passo a passo

1. **Localizar o vídeo.** Peça o caminho do arquivo se o usuário não informou.

2. **Achar a posição da marca.** Extraia um quadro com grade de coordenadas e
   olhe a imagem (com a ferramenta Read):

   ```bash
   scripts/frame.sh video.mp4 quadro.png 2
   ```

   A grade vermelha tem linhas a cada 100px; o script também mostra largura,
   altura e duração. Anote `X Y LARGURA ALTURA` da caixa que cobre a marca,
   com uns 5–10px de folga. Se a marca muda de lugar, extraia quadros em
   outros segundos para conferir.

3. **Remover.** Escolha o modo:

   | Modo     | Quando usar                                            |
   |----------|--------------------------------------------------------|
   | `delogo` | Padrão. Marca pequena e fixa; preenche com os vizinhos |
   | `blur`   | Fundo muito detalhado onde o delogo fica estranho      |
   | `crop`   | Marca bem na borda; corta a faixa (muda o tamanho)     |

   ```bash
   scripts/remover.sh video.mp4 video_limpo.mp4 X Y LARGURA ALTURA delogo
   ```

   Para mais de uma marca, rode de novo usando a saída como entrada.

4. **Conferir.** Extraia um quadro de `video_limpo.mp4` com `frame.sh`, olhe o
   resultado e ajuste a caixa ou o modo se ainda aparecer algo. Mostre o antes
   e depois ao usuário.

## Observações

- O áudio é copiado sem perdas; o vídeo é recodificado em H.264 (CRF 18, alta qualidade).
- Marcas que se movem pelo vídeo não são cobertas por uma caixa fixa: divida o
  vídeo por trechos (`-ss`/`-to`) e trate cada um, ou use o modo `crop`.
- A melhor solução costuma ser exportar de novo sem marca a partir do projeto
  original no editor (muitos apps tiram a marca no plano pago ou numa opção de
  exportação) — mencione isso ao usuário.
