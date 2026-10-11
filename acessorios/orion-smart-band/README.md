# ORION SMART BAND — ficha do projeto mecânico

**Versão:** v0.1 (protótipo digital) · **Estágio: PROTÓTIPO DIGITAL**, verificado no computador e ainda não impresso nem testado fisicamente. Nenhuma função eletrônica está implementada.

## Objetivo
Pulseira inteligente que funciona como extensão física do Orion: botão de ativação, tela OLED, vibração e Bluetooth (ESP32), com carcaça desmontável e preparada para impressão 3D FDM.

## Arquivos

| Categoria | Arquivo | Observação |
|---|---|---|
| Fabricação | `stl/ORION_Corpo_Principal.stl` … `stl/ORION_Acesso_USB_C.stl` (9 arquivos) | mm, escala 1:1, **já na orientação de impressão**, apoiados em Z = 0 |
| Engenharia | `step/ORION_Smart_Band.step` | Montagem com as 9 peças nomeadas e os volumes de referência dos componentes (`REF_…`). Abre no FreeCAD, Fusion e Onshape |
| Engenharia | `cad/orion_band.py` | **Fonte paramétrica** (CadQuery). Todas as medidas ficam no dicionário `P` |
| Documentação | `docs/ORION_Desenho_Tecnico.pdf` | 4 folhas A4: vistas cotadas, vista traseira com parafusos, cortes internos, peças, status das dimensões e verificação |
| Documentação | `docs/ORION_Lista_Componentes.csv` | Componentes, peças, fixadores, medidas, fontes e status (separador `;`, abre no Excel) |
| Imagens | `docs/ORION_Modelo_Montado.png`, `docs/ORION_Montagem_Explodida.png` | Renderizadas a partir das malhas do CAD |
| Visualização | `ORION_Visualizador_3D.html` | Abre offline no celular: girar, explodir, esconder peças e ver os componentes |
| Verificação | `cad/verificacao.json`, `cad/malhas.json` | Resultados brutos das verificações |

**Sem `ORION_Smart_Band.FCStd`:** o projeto não foi desenvolvido no FreeCAD, e um FCStd feito importando o STEP seria só sólidos sem parâmetros, o que daria a impressão errada de ser editável. A alternativa é editar `cad/orion_band.py` e regerar tudo, ou abrir o STEP no FreeCAD para medir e conferir.

## Componentes escolhidos (Etapa 1)

| Componente | Modelo | Medidas usadas | Situação |
|---|---|---|---|
| Microcontrolador | **Seeed XIAO ESP32C6** (Bluetooth LE, antena cerâmica na placa, USB-C e carregador de LiPo integrados) | 21 × 17,8 × 4,5 | 17,5 ou 17,8 conforme a fonte; espessura e altura **não confirmadas** |
| Tela | OLED 0,96" SSD1306 I2C 128×64 | placa 27,8 × 27,8, vidro 26,7 × 19,3, área ativa 21,7 × 10,8 | **varia por fabricante** |
| Bateria | LiPo 402020 3,7 V **com proteção** | 4 × 20 × 20 + 2 do PCM | capacidade anunciada de 120 a 450 mAh |
| Botão | chave táctil SMD 6,0 × 3,5 × 4,3 | idem | curso não informado (usado 0,25) |
| Vibração (opcional) | motor moeda 1027 | Ø10 × 2,7 | consistente entre fontes |

O XIAO ESP32C6 elimina a placa de carga e o conector USB-C separados (menos peças e fios) e tem antena na própria placa, sem antena externa para acomodar. O carregador dele trabalha a ~100 mA, então a bateria precisa ter **pelo menos 100 mAh** (carga ≤ 1C).

## Diagrama de blocos
```
 [USB-C] ──► [XIAO ESP32C6 + carregador] ◄──► [Bateria LiPo 402020 + PCM]
                │   │   │   └──Bluetooth LE──► [Celular com o Orion]
          I2C ──┘   │   └── GPIO ──► [MOSFET] ──► [Motor 1027]
     [OLED 0,96"]   └── GPIO ◄── [Chave táctil] ◄── [Botão 06]
```

## Por que a caixa cresceu (45 × 30 × 14 → 49 × 34 × 15,1)
- **Largura 34:** a placa do OLED tem 27 a 27,8 mm. Com 2 × 0,3 de folga e 2 × 1,8 de parede, o mínimo já é 31,4; com 30 mm ela não cabe. Os 34 mm também deixam espaço para os postes dos parafusos ao lado da bateria.
- **Comprimento 49:** na camada de baixo ficam lado a lado a bateria com sua moldura (22,1) e o suporte do ESP32 (~19,7). Além disso, os **4 postes dos parafusos** precisaram ir para os cantos, fora do caminho do OLED: a montagem é feita por baixo, e a verificação mostrou que, com os postes no meio, a placa do OLED batia neles.
- **Altura 15,1:** é a soma da pilha, sem comprimir nada:

| Camada | Altura (mm) |
|---|---|
| Tampa traseira | 2,0 |
| Folga sob o ESP32 (pads e fios da bateria) | 1,0 |
| ESP32 (placa 1,2 + USB-C 3,3, a confirmar) + folga | 4,8 |
| Bandeja interna | 1,0 |
| Apoio do OLED (componentes no verso) | 1,2 |
| OLED: placa 1,6 + vidro 1,5 | 3,1 |
| Aba da moldura + topo | 0,8 + 1,2 |
| **Total** | **15,1** |

Caminhos para reduzir em versões futuras: placa própria em vez do módulo do OLED, ESP32 soldado numa placa própria, bateria mais fina. Em todos os casos, primeiro medir as peças reais.

## Arquitetura mecânica (Etapa 3)
- **01 Corpo:** paredes de 1,8, topo de 1,2, 4 postes M2 fundidos às paredes (topo cônico de 45°, imprime sem suporte), abertura do USB-C, rebaixo do botão e "linha de luz" (sulco para tinta ou filamento ciano).
- **02 Tampa traseira:** 4 rebaixos de parafuso, logotipo ORION gravado, bolsões com pinos que prendem as línguas dos adaptadores.
- **03 Moldura:** entra **por dentro** e fica presa pela aba; cobre 1,0 mm além do vidro. Pode receber acrílico de 0,5 (`janela_acrilico_t`).
- **04 Suporte do ESP32** e **05 suporte da bateria:** ficam apoiados na tampa e sustentam a **04B bandeja interna** (peça extra, necessária para separar as duas camadas). A bateria fica solta na moldura, sobre espuma, sem ser apertada.
- **06 Botão:** entra por dentro e não cai para fora. A face fica 0,3 mm abaixo da superfície, dentro de um rebaixo, para evitar toque acidental.
- **07 Adaptadores:** pulseira padrão de 20 mm com barra de mola. Ficam presos pela língua entre o corpo e a tampa, com 2 pinos Ø2 cada, e trocam fácil (pulseiras de 18 ou 22 mm são só um parâmetro).
- **08 Tampa do USB-C:** encaixe por atrito, de preferência em TPU.

Folgas diferentes para cada encaixe: componente × berço 0,30; peça × peça 0,25; moldura × abertura 0,15; botão × furo 0,20; tampa do USB-C 0,10 (atrito); bateria × moldura 0,25.

## Relatório de validação

| # | Verificação | Resultado |
|---|---|---|
| 1 | Dimensões externas | **Aprovado por verificação digital:** 49,0 × 34,0 × 15,1; 62,0 com adaptadores |
| 2 | Espaço de cada componente | **Pendente de confirmação dimensional** (cabem com as medidas de referência) |
| 3 | Colisões entre placa, tela, bateria, chave, motor, plugue USB-C e carcaça | **Aprovado por verificação digital:** 16 volumes, nenhuma interseção. Os fios **não** foram modelados (só as passagens) |
| 4 | Alinhamento do botão e do USB-C | **Aprovado por verificação digital** (pré-curso do botão 0,15). Altura do USB-C **pendente de confirmação dimensional** |
| 5 | Acesso aos parafusos | **Aprovado por verificação digital:** os 4 ficam livres na face traseira |
| 6 | Remoção da tampa traseira | **Aprovado por verificação digital:** tampa, adaptadores e cada peça interna saem por baixo sem bater (simulação de deslizamento) |
| 7 | Espessura das paredes | **Aprovado por verificação digital:** 1,8 nas paredes e 1,2 no rebaixo do botão. **Pendente de teste de impressão:** 0,7 entre o rebaixo do parafuso e a borda da tampa |
| 8 | Encaixes da pulseira | Geometria **aprovada por verificação digital**; resistência **pendente de teste físico** |
| 9 | Integridade dos sólidos | **Aprovado por verificação digital:** as 9 malhas estão fechadas, com normais consistentes e volume igual ao do CAD (diferença < 0,03%) |
| 10 | Orientação e escala dos STL | **Aprovado por verificação digital:** mm, 1:1, Z = 0 |
| 11 | Viabilidade de impressão | **Pendente de teste de impressão:** pensado para dispensar suportes, mas os furos de Ø1,1 provavelmente precisarão de broca |
| 12 | Montagem e desmontagem | **Aprovado por verificação digital** (ordem abaixo). Com fios reais, **pendente de teste físico** |

O CAD verifica geometria contra geometria. Nada foi impresso, montado ou medido. Este modelo **não** é resistente a água, suor ou poeira, porque não tem vedação.

## Impressão (Etapa 6)
PLA para validar os encaixes; PETG depois, se precisar de mais resistência a impacto e calor. Camada de 0,12 a 0,16 mm, 3 ou mais perímetros. A orientação de cada peça está no desenho (folha 3) e já vem aplicada nos STL. Imprima primeiro o **corpo e a tampa** e confira o encaixe com as peças compradas antes de imprimir o resto.

## Montagem
1. Testar a eletrônica na bancada, fora da caixa.
2. Soldar fios de silicone 30 AWG. O motor precisa de transistor e diodo, nunca ligado direto no pino.
3. Encaixar a moldura (03) por dentro do corpo.
4. Colocar o OLED com o vidro para cima, com fita fina na aba.
5. Colocar o botão (06) por dentro.
6. Montar a bandeja (04B) com a chave e o motor.
7. Colocar o suporte do ESP32 (04) com a placa e o suporte da bateria (05) com a bateria sobre espuma.
8. Encaixar os adaptadores (07) na tampa.
9. Fechar com 4 parafusos M2×6 sem forçar.

## Testes do primeiro protótipo físico (Etapa 9)
1. **Medir** com paquímetro o ESP32, o OLED, a bateria e a chave, e atualizar `P` em `cad/orion_band.py`.
2. Imprimir o corpo e a tampa em PLA e conferir o encaixe da tampa, o alinhamento dos furos e as paredes.
3. Encaixar o OLED e a moldura e ver se o vidro fica centralizado na janela.
4. Plugar o cabo USB-C com a placa no lugar e confirmar que conecta até o fim.
5. Pressionar o botão 50 vezes: o clique precisa ser firme e sem travar; a pulseira em uso não pode apertar o botão sozinha.
6. Carregar por 1 h e medir a temperatura da caixa.
7. Usar no pulso por 2 h (pontos de pressão, peso, bordas) e dar puxões leves na pulseira para testar os adaptadores.
8. Abrir e fechar 10 vezes, para ver se os furos dos parafusos espanam.

## Problemas conhecidos
- Medidas dos componentes são de anúncios e divergem entre fontes.
- Parede de 0,7 mm entre o rebaixo do parafuso e a borda da tampa.
- A tela fica deslocada 3,5 mm para uma das pontas, porque o motor e a chave ocupam a outra ("queixo" com a linha de luz).
- A aba interna do botão tem 0,15 mm de folga e pode chacoalhar levemente.
- Sem vedação.

## Ainda não feito
Esquema elétrico, firmware, integração com o Orion, autonomia medida e custo total (preços no Brasil não consultados).

## Como regerar tudo
```bash
cd acessorios/orion-smart-band/cad
pip install cadquery trimesh rtree matplotlib
python3 verificar.py        # verificação digital (verificacao.json)
python3 gerar.py            # STL, STEP e malhas para o visualizador
python3 lista_componentes.py
python3 desenho.py          # PDF (usa as imagens de docs/)
cd ../viewer && npm install && npm run build   # ORION_Visualizador_3D.html
```
As imagens PNG são capturas do visualizador (`?shot=montado` e `?shot=explodido`) num navegador sem interface.

## Próximas melhorias
Confirmar as medidas reais, fazer o esquema elétrico e o firmware de bancada, testar o encaixe impresso, e depois reduzir o tamanho e arredondar a tampa para acompanhar o pulso.
