"""
ORION SMART BAND — modelo CAD paramétrico (CadQuery).

Todas as medidas em milímetros. Eixos: X = comprimento da caixa (as pulseiras saem em ±X),
Y = largura, Z = altura (Z = 0 é a face da tampa traseira que encosta no pulso; a tela fica em +Z).

Edite o dicionário P (ou chame build(P_modificado)). As posições internas são CALCULADAS a partir
dos parâmetros, então mudar uma medida reposiciona o resto. As verificações ficam em check.py.

IMPORTANTE: as medidas dos componentes (ESP32, OLED, bateria, chave, motor) são de anúncios e
fichas de vendedores, que divergem entre si. Elas estão marcadas como "APROX" e precisam ser
conferidas com paquímetro nas peças compradas antes de imprimir a versão final.
"""
from __future__ import annotations

import copy
import cadquery as cq

# ----------------------------------------------------------------------------------------------
# PARÂMETROS
# ----------------------------------------------------------------------------------------------
P = {
    # Caixa (o pedido inicial era 45 x 30 x 14; ver justificativa no relatório)
    "L": 49.0,             # comprimento externo
    "W": 34.0,             # largura externa
    "R_ext": 3.5,          # raio dos cantos verticais externos
    "t_wall": 1.8,         # parede lateral
    "t_top": 1.2,          # pele superior (ao redor da tela)
    "t_back": 2.0,         # tampa traseira
    "chanfro_topo": 0.8,   # chanfro da aresta superior externa (imprime virado para a mesa)
    "filete_base": 1.2,    # arredondamento da aresta inferior externa do corpo
    "filete_tampa": 1.0,   # arredondamento da aresta da tampa em contato com a pele

    # Folgas (não há folga universal: cada tipo de encaixe tem a sua)
    "f_comp": 0.30,        # componente eletrônico x parede/berço (deslizante)
    "f_peca": 0.25,        # peça impressa x peça impressa (deslizante)
    "f_moldura": 0.15,     # moldura x abertura do corpo (ajuste visível, mais justo)
    "f_botao": 0.20,       # haste do botão x furo
    "f_usb_tampa": 0.10,   # tampa USB-C x abertura (ajuste por atrito)
    "f_bat": 0.25,         # bateria x moldura (a célula não pode ser apertada)

    # --- Componentes (APROX: confirmar com paquímetro) ---
    # Seeed XIAO ESP32C6: 21 x 17,5 (anúncios) ou 21 x 17,8 (wiki). Usa-se 17,8 (o maior).
    "mcu_c": 21.0, "mcu_l": 17.8,
    "mcu_pcb_t": 1.2,      # espessura da placa (não confirmada)
    "mcu_comp_h": 3.3,     # altura acima da placa (USB-C ~3,2; não confirmada)
    "mcu_folga_baixo": 1.0,  # espaço sob a placa: pads BAT+/BAT- e fios soldados
    "usb_plug_l": 12.6, "usb_plug_h": 7.0,  # abertura para o corpo do plugue USB-C (sobremolde)
    # OLED 0,96" SSD1306 I2C 128x64: placa ~27 x 27 a 27,8; vidro 26,7 x 19,2; área ativa 21,7 x 10,8
    "oled_pcb_x": 27.8, "oled_pcb_y": 27.8, "oled_pcb_t": 1.6,
    "oled_glass_x": 26.7, "oled_glass_y": 19.3, "oled_glass_t": 1.5,
    "oled_ativa_x": 21.7, "oled_ativa_y": 10.8,
    "oled_glass_off_y": -1.5,  # deslocamento do vidro em relação ao centro da placa (lado oposto ao conector)
    "oled_comp_baixo": 1.0,    # componentes no verso da placa do OLED
    "tela_cx": 3.5,            # centro da placa do OLED em X (tela um pouco deslocada para +X; "queixo" em -X)
    # Bateria LiPo 402020 (4 x 20 x 20) + circuito de proteção (PCM) e saída de fios
    "bat_t": 4.0, "bat_x": 20.0, "bat_y": 20.0, "bat_pcm": 2.0, "bat_espuma": 0.5,
    # Chave táctil SMD 6,0 x 3,5 x 4,3 (altura com atuador)
    "sw_x": 6.0, "sw_z": 3.5, "sw_h": 4.3, "sw_curso": 0.25,
    # Motor de vibração tipo moeda 1027 (opcional)
    "motor": True, "motor_d": 10.0, "motor_t": 2.7,

    # Peças internas
    "bandeja_t": 1.0,      # bandeja interna (chassi) entre as duas camadas
    "nervura_oled_h": 1.2, # nervuras que apoiam a placa do OLED acima dos componentes do verso
    "berco_parede": 0.8,   # paredes do suporte do ESP32 e da bateria
    "bat_parede": 0.8,

    # Moldura da tela
    "moldura_borda": 1.0,  # quanto a moldura cobre além do vidro (protege as bordas)
    "moldura_aba": 1.2,    # aba interna que prende a moldura por dentro
    "moldura_aba_t": 0.8,
    "janela_margem": 0.5,  # margem da janela além da área ativa
    "janela_acrilico_t": 0.0,  # 0 = sem janela transparente; ex.: 0.5 para acrílico de 0,5 mm

    # Fixação: parafusos auto-atarraxantes para plástico M2 x 6 (cabeça panela Ø3,5)
    "boss_r": 2.0, "boss_dentro": 0.9,   # centro do poste a 0,9 mm da face interna da parede
    "furo_piloto": 1.6, "furo_passante": 2.3,
    "cabeca_d": 4.0, "cabeca_prof": 1.3,

    # Botão lateral
    "btn_haste_x": 4.4, "btn_haste_z": 2.4,
    "btn_flange_x": 7.0, "btn_flange_z": 4.0, "btn_flange_t": 0.8,
    "btn_rebaixo_x": 7.6, "btn_rebaixo_z": 5.0, "btn_rebaixo_p": 0.6,
    "btn_recuo_face": 0.3,  # face do botão fica 0,3 mm abaixo da superfície (evita toque acidental)
    "btn_folga_sw": 0.15,

    # Adaptadores da pulseira (barra de mola padrão de relógio)
    "pulseira_w": 20.0, "lug_t": 2.6, "lug_comp": 6.5, "lug_h": 7.2,
    "barra_d_furo": 1.1, "barra_prof": 1.4, "barra_x": 4.2, "barra_z": 3.6,
    "lingua_comp": 6.0, "lingua_w": 14.0, "lingua_t": 1.0,
    "pino_d": 2.0, "pino_folga": 0.3,

    # Acabamento
    "logo": "ORION", "logo_tam": 5.0, "logo_prof": 0.4,
    "linha_luz_comp": 9.0, "linha_luz_larg": 0.6, "linha_luz_prof": 0.4,
}


# ----------------------------------------------------------------------------------------------
# GEOMETRIA DERIVADA (posições calculadas)
# ----------------------------------------------------------------------------------------------
def derive(P):
    d = {}
    d["Li"] = P["L"] - 2 * P["t_wall"]
    d["Wi"] = P["W"] - 2 * P["t_wall"]
    d["R_int"] = max(P["R_ext"] - P["t_wall"], 0.3)
    hx, hy = d["Li"] / 2, d["Wi"] / 2
    d["hx"], d["hy"] = hx, hy

    z0 = P["t_back"]                                   # topo da tampa = fundo da cavidade
    d["z0"] = z0
    # Camada inferior: ESP32 (ao lado da bateria)
    d["z_mcu"] = z0 + P["mcu_folga_baixo"]
    d["z_mcu_top"] = d["z_mcu"] + P["mcu_pcb_t"] + P["mcu_comp_h"]
    d["z_usb"] = d["z_mcu"] + P["mcu_pcb_t"] + 1.6      # centro do receptáculo USB-C (3,2 mm de altura)
    d["z_bandeja"] = max(d["z_mcu_top"], z0 + P["bat_espuma"] + P["bat_t"]) + 0.3
    d["z_bandeja_top"] = d["z_bandeja"] + P["bandeja_t"]
    # Camada superior: OLED
    d["z_oled"] = d["z_bandeja_top"] + P["nervura_oled_h"]
    d["z_vidro"] = d["z_oled"] + P["oled_pcb_t"]
    d["z_vidro_top"] = d["z_vidro"] + P["oled_glass_t"] + P["janela_acrilico_t"]
    d["z_aba"] = d["z_vidro_top"]
    d["z_cav_top"] = d["z_aba"] + P["moldura_aba_t"]
    d["H"] = d["z_cav_top"] + P["t_top"]

    # Bateria (lado -X) e ESP32 (lado +X), lado a lado na camada inferior
    bx = P["bat_x"] + 2 * P["f_bat"]
    by = P["bat_y"] + P["bat_pcm"] + 2 * P["f_bat"]
    d["bat_frame_x0"] = -hx + P["f_peca"]
    d["bat_frame_x1"] = d["bat_frame_x0"] + bx + 2 * P["bat_parede"]
    d["bat_cx"] = (d["bat_frame_x0"] + d["bat_frame_x1"]) / 2
    d["bat_frame_y"] = by + 2 * P["bat_parede"]
    d["mcu_berco_x0"] = d["bat_frame_x1"] + 0.2
    d["mcu_x0"] = d["mcu_berco_x0"] + P["berco_parede"] + 0.2
    d["mcu_x1"] = d["mcu_x0"] + P["mcu_l"]
    d["mcu_cx"] = (d["mcu_x0"] + d["mcu_x1"]) / 2
    d["mcu_berco_x1"] = d["mcu_x1"] + 0.2 + P["berco_parede"]
    # ESP32 encostado na parede -Y (USB-C acessível), comprimento 21 ao longo de Y
    d["mcu_y0"] = -hy + P["f_comp"]
    d["mcu_y1"] = d["mcu_y0"] + P["mcu_c"]

    # OLED: placa encostada perto da parede +X, deixando espaço para a aba da moldura
    d["oled_x0"] = P["tela_cx"] - P["oled_pcb_x"] / 2
    d["oled_x1"] = P["tela_cx"] + P["oled_pcb_x"] / 2
    d["oled_cx"] = (d["oled_x0"] + d["oled_x1"]) / 2
    d["oled_cy"] = 0.0
    d["vidro_cx"], d["vidro_cy"] = d["oled_cx"], d["oled_cy"] + P["oled_glass_off_y"]
    d["moldura_x"] = P["oled_glass_x"] + 2 * P["moldura_borda"]
    d["moldura_y"] = P["oled_glass_y"] + 2 * P["moldura_borda"]

    # Região livre na ponta -X da camada superior: motor (lado -Y) e chave do botão (lado +Y)
    d["zona_x0"] = -hx + P["f_peca"]
    d["zona_x1"] = d["oled_x0"] - P["f_comp"]
    d["motor_cx"] = d["zona_x0"] + 0.8 + 0.2 + P["motor_d"] / 2
    d["motor_cy"] = 0.0
    d["btn_x"] = d["zona_x1"] - 3.5          # suporte da chave (7 mm) termina antes do OLED
    d["sw_cz"] = d["z_bandeja_top"] + 0.6 + P["sw_z"] / 2
    d["btn_z"] = d["sw_cz"]
    # Cadeia do botão em Y: parede +Y -> aba da haste -> folga -> atuador da chave -> suporte
    d["btn_flange_y1"] = hy
    d["btn_flange_y0"] = hy - P["btn_flange_t"]
    d["sw_y1"] = d["btn_flange_y0"] - P["btn_folga_sw"]
    d["sw_y0"] = d["sw_y1"] - P["sw_h"]
    d["sw_suporte_y1"] = d["sw_y0"]
    d["sw_suporte_y0"] = d["sw_y0"] - 1.2

    # Postes dos parafusos nos 4 cantos, fundidos às paredes longas. Ficam FORA do caminho de
    # montagem do OLED e da bandeja (que entram por baixo) e fora da camada do ESP32/bateria.
    yb = hy - P["boss_dentro"]
    xm = -hx + P["boss_r"] + 0.5
    xp = d["mcu_x1"] + 0.3 + P["boss_r"]
    d["bosses"] = [(xm, -yb), (xm, yb), (xp, -yb), (xp, yb)]
    return d


# ----------------------------------------------------------------------------------------------
# AUXILIARES
# ----------------------------------------------------------------------------------------------
def rbox(x, y, z, r, cx=0.0, cy=0.0, z0=0.0):
    """Caixa com cantos verticais arredondados, base em z0."""
    s = cq.Workplane("XY").box(x, y, z, centered=(True, True, False))
    r = min(r, x / 2 - 0.01, y / 2 - 0.01)
    if r > 0.05:
        s = s.edges("|Z").fillet(r)
    return s.translate((cx, cy, z0))


def box(x0, x1, y0, y1, z0, z1):
    return cq.Workplane("XY").box(x1 - x0, y1 - y0, z1 - z0, centered=False).translate((x0, y0, z0))


def slot_y(cx, cz, wx, wz, y0, y1, r=None):
    """Furo retangular arredondado atravessando na direção Y (para paredes ±Y)."""
    s = cq.Workplane("XY").box(wx, y1 - y0, wz, centered=(True, False, True))
    rr = min(r if r is not None else min(wx, wz) / 2 - 0.01, wx / 2 - 0.01, wz / 2 - 0.01)
    if rr > 0.05:
        s = s.edges("|Y").fillet(rr)
    return s.translate((cx, y0, cz))


# ----------------------------------------------------------------------------------------------
# PEÇAS
# ----------------------------------------------------------------------------------------------
def corpo(P, d):
    L, W, H, z0 = P["L"], P["W"], d["H"], d["z0"]
    body = rbox(L, W, H - z0, P["R_ext"], z0=z0)
    body = body.faces(">Z").edges().chamfer(P["chanfro_topo"])
    body = body.faces("<Z").edges().fillet(P["filete_base"])
    cav = rbox(d["Li"], d["Wi"], d["z_cav_top"] - z0 + 0.01, d["R_int"], z0=z0 - 0.01)
    body = body.cut(cav)

    # Abertura da tela (a moldura entra por dentro e aparece por ela)
    ab = rbox(d["moldura_x"] + 2 * P["f_moldura"], d["moldura_y"] + 2 * P["f_moldura"], P["t_top"] + 2, 1.2,
              cx=d["vidro_cx"], cy=d["vidro_cy"], z0=d["z_cav_top"] - 1)
    body = body.cut(ab)

    # Postes para parafusos M2 (fundidos à parede), com topo cônico de 45° (imprime sem suporte)
    h_boss = d["z_bandeja"] - z0
    for (bx, by) in d["bosses"]:
        c = cq.Workplane("XY").circle(P["boss_r"]).extrude(h_boss).translate((bx, by, z0))
        cone = cq.Workplane("XY").circle(P["boss_r"]).workplane(offset=P["boss_r"]).circle(0.05).loft().translate(
            (bx, by, d["z_bandeja"]))
        # parte do poste que ficaria fora da parede é aparada pelo contorno externo
        c = c.union(cone).intersect(rbox(L, W, H, P["R_ext"]))
        body = body.union(c)
        body = body.cut(cq.Workplane("XY").circle(P["furo_piloto"] / 2).extrude(h_boss - 0.4).translate((bx, by, z0 - 0.01)))

    # Abertura do USB-C na parede -Y, aberta por baixo (fechada pela tampa traseira)
    ux = d["mcu_cx"]
    zt = d["z_usb"] + P["usb_plug_h"] / 2
    usb = slot_y(ux, (z0 - 1 + zt) / 2, P["usb_plug_l"], zt - (z0 - 1), -W / 2 - 1, -d["hy"] + 0.5, r=1.2)
    body = body.cut(usb)

    # Botão na parede +Y: rebaixo externo (proteção contra toque acidental) + furo da haste
    reb = slot_y(d["btn_x"], d["btn_z"], P["btn_rebaixo_x"], P["btn_rebaixo_z"], W / 2 - P["btn_rebaixo_p"], W / 2 + 1)
    furo = slot_y(d["btn_x"], d["btn_z"], P["btn_haste_x"] + 2 * P["f_botao"], P["btn_haste_z"] + 2 * P["f_botao"],
                  d["hy"] - 0.5, W / 2 + 1)
    body = body.cut(reb).cut(furo)

    # Linha de luz (acento ciano) no "queixo" da face superior: sulco para tinta/filamento ciano
    lx = (d["zona_x0"] + d["oled_x0"]) / 2 - 1.0
    sulco = rbox(P["linha_luz_larg"], P["linha_luz_comp"], 2, 0.29, cx=lx, cy=d["vidro_cy"],
                 z0=d["H"] - P["linha_luz_prof"])
    body = body.cut(sulco)
    return body


def tampa_traseira(P, d):
    L, W, t = P["L"], P["W"], P["t_back"]
    tampa = rbox(L, W, t, P["R_ext"])
    tampa = tampa.faces("<Z").edges().fillet(P["filete_tampa"])
    for (bx, by) in d["bosses"]:
        tampa = tampa.cut(cq.Workplane("XY").circle(P["furo_passante"] / 2).extrude(t + 1).translate((bx, by, -0.5)))
        tampa = tampa.cut(cq.Workplane("XY").circle(P["cabeca_d"] / 2).extrude(P["cabeca_prof"]).translate((bx, by, -0.01)))
    # Bolsões das línguas dos adaptadores da pulseira (abertos nas pontas) + pinos de travamento
    for s in (-1, 1):
        x_out = s * L / 2
        x_in = s * (L / 2 - P["lingua_comp"])
        bol = box(min(x_in, x_out + s * 1), max(x_in, x_out + s * 1),
                  -(P["lingua_w"] + 2 * P["f_peca"]) / 2, (P["lingua_w"] + 2 * P["f_peca"]) / 2,
                  t - P["lingua_t"], t + 0.5)
        tampa = tampa.cut(bol)
        for py in (-4.0, 4.0):
            px = s * (L / 2 - P["lingua_comp"] / 2 - 0.5)
            tampa = tampa.union(cq.Workplane("XY").circle(P["pino_d"] / 2).extrude(P["lingua_t"]).translate((px, py, t - P["lingua_t"])))
    # Logotipo ORION gravado na face externa (legível olhando a tampa por fora)
    txt = (cq.Workplane("XY").text(P["logo"], P["logo_tam"], P["logo_prof"] + 0.01, kind="bold",
                                    font="DejaVu Sans", halign="center", valign="center")
           .mirror("YZ").translate((0, 0, -0.01)))
    tampa = tampa.cut(txt)
    return tampa


def moldura(P, d):
    mx, my = d["moldura_x"], d["moldura_y"]
    face = rbox(mx, my, P["t_top"], 1.2 - P["f_moldura"], cx=d["vidro_cx"], cy=d["vidro_cy"], z0=d["z_cav_top"])
    aba = rbox(mx + 2 * P["moldura_aba"], my + 2 * P["moldura_aba"], P["moldura_aba_t"], 1.8,
               cx=d["vidro_cx"], cy=d["vidro_cy"], z0=d["z_aba"])
    m = face.union(aba)
    jx, jy = P["oled_ativa_x"] + 2 * P["janela_margem"], P["oled_ativa_y"] + 2 * P["janela_margem"]
    janela = rbox(jx, jy, 10, 0.8, cx=d["vidro_cx"], cy=d["vidro_cy"], z0=d["z_aba"] - 5)
    m = m.cut(janela)
    m = m.faces(">Z").edges("not %LINE").chamfer(0.3) if False else m
    # chanfro decorativo na borda interna da janela (face visível)
    try:
        m = m.edges(cq.selectors.BoxSelector((d["vidro_cx"] - jx, d["vidro_cy"] - jy, d["H"] - 0.01),
                                             (d["vidro_cx"] + jx, d["vidro_cy"] + jy, d["H"] + 0.01))).edges(
            cq.selectors.BoxSelector((d["vidro_cx"] - jx / 2 - 0.1, d["vidro_cy"] - jy / 2 - 0.1, d["H"] - 0.01),
                                     (d["vidro_cx"] + jx / 2 + 0.1, d["vidro_cy"] + jy / 2 + 0.1, d["H"] + 0.01))).chamfer(0.35)
    except Exception:
        pass
    if P["janela_acrilico_t"] > 0:  # rebaixo para o acrílico sob a face
        m = m.cut(rbox(P["oled_glass_x"], P["oled_glass_y"], P["janela_acrilico_t"], 0.5,
                       cx=d["vidro_cx"], cy=d["vidro_cy"], z0=d["z_aba"] - 0.01))
    return m


def bandeja(P, d):
    """Peça 04B: bandeja interna (chassi) entre a camada do ESP32/bateria e a do OLED."""
    z, t = d["z_bandeja"], P["bandeja_t"]
    f = P["f_peca"]
    b = rbox(d["Li"] - 2 * f, d["Wi"] - 2 * f, t, max(d["R_int"] - f, 0.3), z0=z)
    for (bx, by) in d["bosses"]:  # recortes em volta dos postes
        b = b.cut(cq.Workplane("XY").circle(P["boss_r"] + 0.3).extrude(t + 2).translate((bx, by, z - 1)))
    zt = d["z_bandeja_top"]
    # Nervuras de apoio da placa do OLED (nas bordas ±X da placa)
    for xr in (d["oled_x0"] + 1.2, d["oled_x1"] - 1.2):
        b = b.union(box(xr - 0.75, xr + 0.75, -10, 10, zt, d["z_oled"]))
    # Suporte vertical da chave táctil (o atuador aponta para a parede +Y)
    topo_sup = d["sw_cz"] + P["sw_z"] / 2 + 0.2
    b = b.union(box(d["btn_x"] - 3.5, d["btn_x"] + 3.5, d["sw_suporte_y0"], d["sw_suporte_y1"], zt, topo_sup))
    b = b.union(box(d["btn_x"] - 3.5, d["btn_x"] - 3.1, d["sw_suporte_y1"], d["sw_y1"] - 0.6, zt, zt + 1.2))  # batente lateral
    # Anel do motor de vibração
    if P["motor"]:
        anel = (cq.Workplane("XY").circle(P["motor_d"] / 2 + 0.2 + 0.8).circle(P["motor_d"] / 2 + 0.2)
                .extrude(1.2).translate((d["motor_cx"], d["motor_cy"], zt)))
        anel = anel.cut(box(d["motor_cx"] - 1.5, d["motor_cx"] + 1.5, d["motor_cy"], d["motor_cy"] + 7, zt - 1, zt + 3))  # saída dos fios
        b = b.union(anel)
    # Passagens de fios: conector do OLED (+Y) e zona do motor/botão (-X)
    b = b.cut(rbox(8.0, 2.4, 5, 1.1, cx=d["oled_cx"] - 4, cy=d["oled_y_conector"], z0=z - 1))
    b = b.cut(rbox(3.0, 5.0, 5, 1.4, cx=d["zona_x1"] - 1.8, cy=-8.0, z0=z - 1))
    return b


def suporte_esp32(P, d):
    """Peça 04: berço do XIAO ESP32C6 (apoia na tampa e sustenta a bandeja)."""
    z0, z1 = d["z0"], d["z_bandeja"]
    pw = P["berco_parede"]
    x0, x1 = d["mcu_berco_x0"], d["mcu_berco_x1"]
    y0 = -d["hy"] + P["f_peca"]
    y1 = d["mcu_y1"] + 0.2 + pw
    s = box(x0, x1, y0, y1, z0, z1)
    s = s.cut(box(x0 + pw, x1 - pw, y0 - 1, y1 - pw, z0 - 1, z1 + 1))  # vazado: só as paredes -X, +X e +Y
    # a parede +X para antes do poste do parafuso do canto (+X, -Y)
    yc = -d["hy"] + P["boss_dentro"] + P["boss_r"] + 0.3
    s = s.cut(box(x1 - pw - 0.1, x1 + 1, y0 - 1, yc, z0 - 1, z1 + 1))
    # Abas de apoio sob as bordas longas da placa (chanfradas 45°: sem suporte na impressão)
    for xa, sgn in ((x0 + pw, 1), (x1 - pw, -1)):
        hz = d["z_mcu"] - z0
        aba = (cq.Workplane("XZ").polyline([(0, 0), (0, hz), (sgn * 0.7, hz), (sgn * 0.7, hz - 0.3), (0, hz - 1.0)]).close()
               .extrude(-(d["mcu_y1"] - y0)).translate((xa, y0, z0)))
        s = s.union(aba)
    # Passagem dos fios da bateria (parede -X, rente à tampa) e entrada do cabo do OLED/chave
    s = s.cut(box(x0 - 1, x0 + pw + 1, -4, 2, z0 - 1, z0 + 1.6))
    s = s.cut(box(x0 + 3, x1 - 3, y1 - pw - 1, y1 + 1, z1 - 1.8, z1 + 1))
    return s


def suporte_bateria(P, d):
    """Peça 05: moldura da bateria. Não aperta a célula: altura maior que bateria + espuma."""
    z0, z1 = d["z0"], d["z_bandeja"]
    x0, x1 = d["bat_frame_x0"], d["bat_frame_x1"]
    fy = d["bat_frame_y"]
    pw = P["bat_parede"]
    s = rbox(x1 - x0, fy, z1 - z0, 1.2, cx=(x0 + x1) / 2, z0=z0)
    s = s.cut(rbox(x1 - x0 - 2 * pw, fy - 2 * pw, z1 - z0 + 2, 0.5, cx=(x0 + x1) / 2, z0=z0 - 1))
    s = s.cut(box(x1 - pw - 1, x1 + 1, -4, 2, z0 - 1, z0 + 1.6))  # saída dos fios para o ESP32
    s = s.cut(box(x0 + 5, x1 - 5, fy / 2 - pw - 1, fy / 2 + 1, z1 - 1.2, z1 + 1))  # dedo para retirar a bateria
    return s


def botao(P, d):
    """Peça 06: haste do botão com aba interna (entra por dentro, não cai para fora)."""
    W = P["W"]
    face_y = W / 2 - P["btn_rebaixo_p"] - P["btn_recuo_face"] + P["btn_rebaixo_p"]  # face 0,3 abaixo da superfície
    face_y = W / 2 - P["btn_recuo_face"]
    haste = slot_y(d["btn_x"], d["btn_z"], P["btn_haste_x"], P["btn_haste_z"], d["btn_flange_y1"], face_y)
    aba = slot_y(d["btn_x"], d["btn_z"], P["btn_flange_x"], P["btn_flange_z"], d["btn_flange_y0"], d["btn_flange_y1"], r=1.0)
    return haste.union(aba)


def adaptadores(P, d):
    """Peça 07: par de adaptadores (um em cada ponta). A língua fica presa entre corpo e tampa."""
    L = P["L"]
    parts = []
    for s in (-1, 1):
        x_face = s * L / 2
        lw = P["pulseira_w"] + 0.2  # vão entre as hastes
        wtot = lw + 2 * P["lug_t"]
        zb = P["t_back"] - P["lingua_t"]  # base do adaptador = base da língua (fundo plano para imprimir)
        bloco = box(min(x_face, x_face + s * P["lug_comp"]), max(x_face, x_face + s * P["lug_comp"]),
                    -wtot / 2, wtot / 2, zb, zb + P["lug_h"])
        bloco = bloco.edges("|Y").fillet(1.6)
        bloco = bloco.edges("|X").fillet(0.8)
        vao = box(min(x_face + s * 1.6, x_face + s * (P["lug_comp"] + 1)), max(x_face + s * 1.6, x_face + s * (P["lug_comp"] + 1)),
                  -lw / 2, lw / 2, zb - 1, zb + P["lug_h"] + 1)
        a = bloco.cut(vao)
        lingua = box(min(x_face, s * (L / 2 - P["lingua_comp"])), max(x_face, s * (L / 2 - P["lingua_comp"])),
                     -P["lingua_w"] / 2, P["lingua_w"] / 2, P["t_back"] - P["lingua_t"], P["t_back"])
        lingua = lingua.edges("|Z").fillet(1.0)
        for py in (-4.0, 4.0):
            px = s * (L / 2 - P["lingua_comp"] / 2 - 0.5)
            lingua = lingua.cut(cq.Workplane("XY").circle((P["pino_d"] + P["pino_folga"]) / 2).extrude(3).translate((px, py, 0)))
        a = a.union(lingua)
        # Furos cegos para as pontas da barra de mola
        bx = x_face + s * P["barra_x"]
        for sy in (-1, 1):
            y_in = sy * lw / 2
            furo = (cq.Workplane("XZ").circle(P["barra_d_furo"] / 2).extrude(-P["barra_prof"])
                    .translate((bx, 0, zb + P["barra_z"])))
            furo = furo.translate((0, y_in if sy > 0 else y_in - 0, 0))
            if sy < 0:
                furo = (cq.Workplane("XZ").circle(P["barra_d_furo"] / 2).extrude(P["barra_prof"])
                        .translate((bx, y_in, zb + P["barra_z"])))
            a = a.cut(furo)
        # Rebaixo da tampa nas pontas: o bloco não pode invadir a tampa (fica encostado nela)
        parts.append(a)
    return parts[0].union(parts[1]), parts


def tampa_usb(P, d):
    """Peça 08: tampa removível do USB-C (atrito). Imprimir em TPU de preferência."""
    W, z0 = P["W"], d["z0"]
    zt = d["z_usb"] + P["usb_plug_h"] / 2
    f = P["f_usb_tampa"]
    hz = zt - z0
    plug = slot_y(d["mcu_cx"], z0 + hz / 2, P["usb_plug_l"] - 2 * f, hz - f, -W / 2, -W / 2 + P["t_wall"] - 0.2, r=1.1)
    aba = slot_y(d["mcu_cx"], z0 + hz / 2, P["usb_plug_l"] + 2.0, hz + 1.2, -W / 2 - 0.8, -W / 2, r=1.6)
    puxador = slot_y(d["mcu_cx"] + P["usb_plug_l"] / 2 + 1.5, z0 + hz / 2, 3.0, 2.0, -W / 2 - 0.8, -W / 2 - 0.2, r=0.8)
    return plug.union(aba).union(puxador)


# ----------------------------------------------------------------------------------------------
# COMPONENTES (volumes de referência, NÃO são peças impressas)
# ----------------------------------------------------------------------------------------------
def componentes(P, d):
    c = {}
    # XIAO ESP32C6: placa + envelope dos componentes de cima + receptáculo USB-C
    m = box(d["mcu_x0"], d["mcu_x1"], d["mcu_y0"], d["mcu_y1"], d["z_mcu"], d["z_mcu"] + P["mcu_pcb_t"])
    m = m.union(box(d["mcu_x0"] + 0.8, d["mcu_x1"] - 0.8, d["mcu_y0"], d["mcu_y1"] - 1.0,
                    d["z_mcu"] + P["mcu_pcb_t"], d["z_mcu_top"]))
    c["ESP32 (XIAO ESP32C6)"] = m
    # OLED: componentes do verso, placa, vidro
    o = box(d["oled_x0"] + 3, d["oled_x1"] - 3, -10, 10, d["z_oled"] - P["oled_comp_baixo"], d["z_oled"])
    o = o.union(box(d["oled_x0"], d["oled_x1"], d["oled_cy"] - P["oled_pcb_y"] / 2, d["oled_cy"] + P["oled_pcb_y"] / 2,
                    d["z_oled"], d["z_vidro"]))
    o = o.union(box(d["vidro_cx"] - P["oled_glass_x"] / 2, d["vidro_cx"] + P["oled_glass_x"] / 2,
                    d["vidro_cy"] - P["oled_glass_y"] / 2, d["vidro_cy"] + P["oled_glass_y"] / 2,
                    d["z_vidro"], d["z_vidro"] + P["oled_glass_t"]))
    c["OLED 0,96 SSD1306"] = o
    # Bateria 402020 + PCM (+Y) sobre espuma
    bx0 = d["bat_frame_x0"] + P["bat_parede"] + P["f_bat"]
    by0 = -d["bat_frame_y"] / 2 + P["bat_parede"] + P["f_bat"]
    zb = d["z0"] + P["bat_espuma"]
    b = box(bx0, bx0 + P["bat_x"], by0, by0 + P["bat_y"] + P["bat_pcm"], zb, zb + P["bat_t"])
    c["Bateria LiPo 402020 + PCM"] = b
    # Chave táctil (atuador em +Y)
    c["Chave táctil 6x3,5x4,3"] = box(d["btn_x"] - P["sw_x"] / 2, d["btn_x"] + P["sw_x"] / 2, d["sw_y0"], d["sw_y1"],
                                      d["sw_cz"] - P["sw_z"] / 2, d["sw_cz"] + P["sw_z"] / 2)
    if P["motor"]:
        c["Motor de vibração 1027"] = (cq.Workplane("XY").circle(P["motor_d"] / 2).extrude(P["motor_t"])
                                       .translate((d["motor_cx"], d["motor_cy"], d["z_bandeja_top"])))
    # Plugue USB-C (corpo metálico) encaixado: verifica o caminho até o receptáculo
    c["Plugue USB-C (metal)"] = slot_y(d["mcu_cx"], d["z_usb"], 8.4, 2.6, -P["W"] / 2 - 2, d["mcu_y0"] - 0.01, r=1.2)
    return c


# ----------------------------------------------------------------------------------------------
PECAS = [
    # (arquivo, nome, cor RGB 0-1, deslocamento da vista explodida em mm)
    ("ORION_Corpo_Principal", "Peça 01 — Corpo principal", (0.045, 0.05, 0.055), (0, 0, 0)),
    ("ORION_Tampa_Traseira", "Peça 02 — Tampa traseira", (0.06, 0.065, 0.07), (0, 0, -46)),
    ("ORION_Moldura_Tela", "Peça 03 — Moldura da tela", (0.03, 0.03, 0.035), (0, 0, 24)),
    ("ORION_Suporte_ESP32", "Peça 04 — Suporte do ESP32", (0.16, 0.17, 0.18), (10, 0, -30)),
    ("ORION_Bandeja_Interna", "Peça 04B — Bandeja interna (chassi)", (0.12, 0.13, 0.14), (0, 0, -16)),
    ("ORION_Suporte_Bateria", "Peça 05 — Suporte da bateria", (0.16, 0.17, 0.18), (-10, 0, -30)),
    ("ORION_Botao_Lateral", "Peça 06 — Botão lateral", (0.0, 0.85, 1.0), (0, 20, 0)),
    ("ORION_Adaptadores_Pulseira", "Peça 07 — Adaptadores da pulseira", (0.06, 0.065, 0.07), (0, 0, 0)),
    ("ORION_Acesso_USB_C", "Peça 08 — Tampa do USB-C", (0.06, 0.065, 0.07), (0, -20, 0)),
]


def build(params=None):
    Pp = copy.deepcopy(P)
    if params:
        Pp.update(params)
    d = derive(Pp)
    d["oled_y_conector"] = d["oled_cy"] + Pp["oled_pcb_y"] / 2 - 2.0
    adapt, adapt_lados = adaptadores(Pp, d)
    pecas = {
        "ORION_Corpo_Principal": corpo(Pp, d),
        "ORION_Tampa_Traseira": tampa_traseira(Pp, d),
        "ORION_Moldura_Tela": moldura(Pp, d),
        "ORION_Suporte_ESP32": suporte_esp32(Pp, d),
        "ORION_Bandeja_Interna": bandeja(Pp, d),
        "ORION_Suporte_Bateria": suporte_bateria(Pp, d),
        "ORION_Botao_Lateral": botao(Pp, d),
        "ORION_Adaptadores_Pulseira": adapt,
        "ORION_Acesso_USB_C": tampa_usb(Pp, d),
    }
    return Pp, d, pecas, componentes(Pp, d), adapt_lados


if __name__ == "__main__":
    Pp, d, pecas, comps, _ = build()
    for k, v in pecas.items():
        bb = v.val().BoundingBox()
        print(f"{k:28s} vol={v.val().Volume():8.1f} mm3  bbox=({bb.xlen:.1f} x {bb.ylen:.1f} x {bb.zlen:.1f})")
    print("Altura total H =", round(d["H"], 2))
