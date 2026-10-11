"""Gera ../docs/ORION_Lista_Componentes.csv (separador ';', UTF-8 com BOM para abrir no Excel em pt-BR)."""
import csv
import json
import os

from orion_band import PECAS, build

AQUI = os.path.dirname(os.path.abspath(__file__))
P, d, pecas, comps, _ = build()
malhas = json.load(open(os.path.join(AQUI, "malhas.json"), encoding="utf-8"))

CAB = ["Item", "Categoria", "Fabricante / modelo", "Qtd", "Dimensões (mm)", "Conectores, posição e observações",
       "Status da medida", "Fonte consultada", "Preço estimado (R$)"]
NC = "não consultado no Brasil"
linhas = [
    ["E1", "Eletrônica", "Seeed Studio XIAO ESP32C6", 1, "21 × 17,5 a 17,8 (placa); altura usada 4,5 com USB-C",
     "USB-C na borda curta (voltado para a parede −Y); pads BAT+/BAT− no verso; antena cerâmica na placa (manter plástico, sem metal, perto dela); carregador de LiPo na placa (~100 mA, varia por versão)",
     "Comprimento × largura de fontes divergentes; espessura e altura NÃO confirmadas", "Seeed wiki; The Pi Hut; CNX Software", NC],
    ["E2", "Eletrônica", "Módulo OLED 0,96\" SSD1306 I2C 128×64 (4 pinos)", 1,
     "placa 27 × 27 a 27,8; altura total ~4,1; vidro 26,7 × 19,2; área ativa 21,7 × 10,8",
     "Conector de 4 pinos numa borda (ordem VCC/GND/SCL/SDA varia entre fabricantes: conferir a serigrafia); soldar fios direto, sem barra de pinos",
     "Aproximada: varia por fabricante", "AZ-Delivery; anúncios de lojas", NC],
    ["E3", "Energia", "Bateria LiPo 3,7 V 402020 COM circuito de proteção (PCM)", 1, "4,0 × 20 × 20 + ~2 do PCM e saída de fios",
     "Capacidade ≥ 100 mAh (carga de 100 mA ≤ 1C). Fios soldados nos pads BAT do ESP32. Nunca usar célula sem proteção",
     "Dimensões consistentes; capacidade anunciada varia de 120 a 450 mAh", "Anúncios eBay.de e Hubtronics", NC],
    ["E4", "Interface", "Chave táctil SMD 6,0 × 3,5 × 4,3 (ex.: Hongyuan 1TS002B-1800-4300-CT ou Würth 434111043826)", 1,
     "6,0 × 3,5, altura 4,3 com atuador", "Colada no suporte da bandeja com o atuador voltado para o botão; 2 fios até o ESP32",
     "Curso não informado (usado 0,25)", "Anúncios e listagem Digi-Key", NC],
    ["E5", "Interface (opcional)", "Motor de vibração tipo moeda 1027, 3 V", 1, "Ø10 × 2,7",
     "Consome ~50 a 100 mA: NÃO ligar direto no pino do ESP32; usar transistor e diodo (E6)",
     "Dimensões consistentes entre fontes", "Protosupplies; datasheet hospedado na Farnell; Core Electronics", NC],
    ["E6", "Eletrônica (motor)", "MOSFET canal N de nível lógico SOT-23 + diodo 1N4148 + resistor de gate 100 Ω a 1 kΩ", 1,
     "SOT-23 ~3 × 1,4", "Montar no chicote com termorretrátil; modelo exato a definir no esquema elétrico (próxima etapa)",
     "A definir", "—", NC],
    ["M1", "Fixação", "Parafuso auto-atarraxante para plástico M2 × 6, cabeça panela Ø ≤ 3,8", 4, "M2 × 6",
     f"Furo passante Ø{P['furo_passante']} e rebaixo Ø{P['cabeca_d']} × {P['cabeca_prof']} na tampa; piloto Ø{P['furo_piloto']} nos postes; não apertar demais (rosca em plástico)",
     "Padrão comercial", "—", NC],
    ["M2", "Pulseira", "Barra de mola (spring bar) de relógio 20 mm × Ø1,5", 2, "20 × Ø1,5",
     f"Furos cegos Ø{P['barra_d_furo']} × {P['barra_prof']} nos adaptadores (passar broca de 1,0 a 1,1 mm após imprimir)",
     "Padrão comercial", "—", NC],
    ["M3", "Pulseira", "Pulseira de silicone 20 mm com barra de mola", 1, "largura 20", "Vão entre hastes no modelo: 20,2", "Padrão comercial", "—", NC],
    ["M4", "Montagem", "Fio de silicone 30 AWG; fita dupla-face fina; espuma EVA 0,5 mm", 1, "—",
     "Espuma sob a bateria (não apertar a célula); fita fina entre a aba da moldura e o vidro do OLED", "—", "—", NC],
    ["M5", "Opcional", "Acrílico transparente 0,5 mm para a janela", 1, f"{P['oled_glass_x']} × {P['oled_glass_y']}",
     "Para usar: janela_acrilico_t = 0.5 em orion_band.py (a altura da caixa aumenta 0,5)", "—", "—", NC],
]
for i, (arq, nome, cor, ex) in enumerate(PECAS, 1):
    mm = malhas[arq]
    vol = mm["volume_cad_mm3"] / 1000
    linhas.append([f"P{i}", "Peça impressa", f"{nome} ({arq}.stl)", 1 if arq != "ORION_Adaptadores_Pulseira" else 2,
                   " × ".join(f"{v:.1f}" for v in mm["dimensoes_impressao_mm"]),
                   f"{mm['orientacao']}. Volume {vol:.2f} cm³ (PLA 100% sólido ≤ {vol * 1.24:.1f} g)",
                   "Do modelo (verificado digitalmente)", "cad/orion_band.py", "custo do filamento: calcular no fatiador"])
with open(os.path.join(os.path.dirname(AQUI), "docs", "ORION_Lista_Componentes.csv"), "w", newline="", encoding="utf-8-sig") as fh:
    w = csv.writer(fh, delimiter=";")
    w.writerow(CAB)
    w.writerows(linhas)
print(len(linhas), "linhas")
