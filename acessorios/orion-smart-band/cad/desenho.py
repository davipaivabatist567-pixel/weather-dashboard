"""
Desenho técnico da ORION SMART BAND -> ../docs/ORION_Desenho_Tecnico.pdf (A4 paisagem, mm).

As vistas são projeções do próprio sólido (remoção de linhas ocultas do OpenCascade) e os cortes
são interseções reais das peças com o plano de corte. As cotas usam os valores do modelo.
"""
from __future__ import annotations

import datetime
import json
import os

import cadquery as cq
import matplotlib

matplotlib.use("Agg")
import matplotlib.pyplot as plt
import numpy as np
from matplotlib.backends.backend_pdf import PdfPages
from matplotlib.patches import PathPatch, Rectangle
from matplotlib.path import Path
from OCP.gp import gp_Ax2, gp_Dir, gp_Pnt
from OCP.HLRAlgo import HLRAlgo_Projector
from OCP.HLRBRep import HLRBRep_Algo, HLRBRep_HLRToShape

from orion_band import PECAS, build

AQUI = os.path.dirname(os.path.abspath(__file__))
SAIDA = os.path.join(os.path.dirname(AQUI), "docs", "ORION_Desenho_Tecnico.pdf")
A4 = (297, 210)
TINTA = "#10161c"
COTA = "#0a6f86"
plt.rcParams.update({"font.family": "DejaVu Sans", "font.size": 6.5})


# ---------------------------------------------------------------------------------- projeção
def _edges_2d(compound, n=24):
    out = []
    if compound is None or compound.IsNull():
        return out
    for e in cq.Shape.cast(compound).Edges():
        ts = [0, 1] if e.geomType() == "LINE" else list(np.linspace(0, 1, n))
        pts = e.positions(ts)
        out.append(np.array([(p.x, p.y) for p in pts]))
    return out


def projetar(shape, normal, xdir, ocultas=False):
    algo = HLRBRep_Algo()
    algo.Add(shape.wrapped)
    algo.Projector(HLRAlgo_Projector(gp_Ax2(gp_Pnt(0, 0, 0), gp_Dir(*normal), gp_Dir(*xdir))))
    algo.Update()
    algo.Hide()
    h = HLRBRep_HLRToShape(algo)
    vis = _edges_2d(h.VCompound()) + _edges_2d(h.OutLineVCompound())
    hid = (_edges_2d(h.HCompound()) + _edges_2d(h.OutLineHCompound())) if ocultas else []
    return vis, hid


class Folha:
    def __init__(self, pdf, titulo, n, total, escala_txt):
        self.pdf = pdf
        self.fig = plt.figure(figsize=(A4[0] / 25.4, A4[1] / 25.4))
        self.ax = self.fig.add_axes([0, 0, 1, 1])
        self.ax.set_xlim(0, A4[0])
        self.ax.set_ylim(0, A4[1])
        self.ax.set_aspect("equal")
        self.ax.axis("off")
        ax = self.ax
        ax.add_patch(Rectangle((8, 8), A4[0] - 16, A4[1] - 16, fill=False, lw=0.8, ec=TINTA))
        # carimbo
        x0, y0 = A4[0] - 8 - 120, 8
        ax.add_patch(Rectangle((x0, y0), 120, 24, fill=False, lw=0.8, ec=TINTA))
        ax.plot([x0, x0 + 120], [y0 + 12, y0 + 12], lw=0.4, c=TINTA)
        ax.plot([x0 + 80, x0 + 80], [y0, y0 + 24], lw=0.4, c=TINTA)
        ax.text(x0 + 2, y0 + 19, "ORION SMART BAND  v0.1", fontsize=9, weight="bold", va="center")
        ax.text(x0 + 2, y0 + 14.5, titulo, fontsize=7, va="center")
        ax.text(x0 + 2, y0 + 7.5, "PROTÓTIPO DIGITAL — verificado no CAD; não impresso nem testado", fontsize=5.6, va="center", color="#9a2b1a")
        ax.text(x0 + 2, y0 + 3, f"Medidas em mm · gerado em {datetime.date.today():%d/%m/%Y}", fontsize=5.6, va="center")
        ax.text(x0 + 82, y0 + 19, f"Folha {n}/{total}", fontsize=7, va="center")
        ax.text(x0 + 82, y0 + 14.5, f"Escala {escala_txt}", fontsize=7, va="center")
        ax.text(x0 + 82, y0 + 7.5, "1º diedro (ISO)", fontsize=6, va="center")
        ax.text(x0 + 82, y0 + 3, "Fonte: cad/orion_band.py", fontsize=5.4, va="center")

    def vista(self, shape, normal, xdir, origem, escala, titulo, ocultas=False):
        vis, hid = projetar(shape, normal, xdir, ocultas)
        ox, oy = origem
        for e in hid:
            self.ax.plot(ox + escala * e[:, 0], oy + escala * e[:, 1], lw=0.25, c="#8a959c", ls=(0, (3, 2)))
        for e in vis:
            self.ax.plot(ox + escala * e[:, 0], oy + escala * e[:, 1], lw=0.45, c=TINTA, solid_capstyle="round")
        allp = np.vstack(vis) if vis else np.zeros((1, 2))
        self.ax.text(ox + escala * (allp[:, 0].min() + allp[:, 0].max()) / 2, oy + escala * allp[:, 1].min() - 15, titulo,
                     ha="center", fontsize=7, weight="bold")
        return (lambda u, v: (ox + escala * u, oy + escala * v)), allp

    def cota(self, p1, p2, desloc, texto, lado="h"):
        """Cota linear entre p1 e p2 (coordenadas da folha), linha deslocada `desloc` mm."""
        ax = self.ax
        (x1, y1), (x2, y2) = p1, p2
        if lado == "h":
            yl = y1 + desloc if desloc > 0 else min(y1, y2) + desloc
            yl = max(y1, y2) + desloc if desloc > 0 else yl
            ax.plot([x1, x1], [y1, yl], lw=0.25, c=COTA)
            ax.plot([x2, x2], [y2, yl], lw=0.25, c=COTA)
            ax.annotate("", (x1, yl), (x2, yl), arrowprops=dict(arrowstyle="<|-|>", lw=0.35, color=COTA, shrinkA=0, shrinkB=0, mutation_scale=4))
            ax.text((x1 + x2) / 2, yl + (0.8 if desloc > 0 else -0.8), texto, ha="center", va="bottom" if desloc > 0 else "top", color=COTA, fontsize=6)
        else:
            xl = max(x1, x2) + desloc if desloc > 0 else min(x1, x2) + desloc
            ax.plot([x1, xl], [y1, y1], lw=0.25, c=COTA)
            ax.plot([x2, xl], [y2, y2], lw=0.25, c=COTA)
            ax.annotate("", (xl, y1), (xl, y2), arrowprops=dict(arrowstyle="<|-|>", lw=0.35, color=COTA, shrinkA=0, shrinkB=0, mutation_scale=4))
            ax.text(xl + (0.8 if desloc > 0 else -0.8), (y1 + y2) / 2, texto, ha="left" if desloc > 0 else "right", va="center", color=COTA, fontsize=6, rotation=0)

    def nota(self, x, y, texto, **kw):
        self.ax.text(x, y, texto, fontsize=kw.pop("fontsize", 6), va="top", **kw)

    def fechar(self):
        self.pdf.savefig(self.fig)
        plt.close(self.fig)


# ---------------------------------------------------------------------------------- cortes
def corte(shape, plano, coord):
    """Faces da interseção do sólido com o plano x=coord ('x') ou y=coord ('y')."""
    big = 400
    if plano == "x":
        lamina = cq.Workplane("XY").box(0.002, big, big).translate((coord, 0, 0))
    else:
        lamina = cq.Workplane("XY").box(big, 0.002, big).translate((0, coord, 0))
    try:
        inter = cq.Workplane("XY").add(shape).intersect(lamina)
    except Exception:
        return []
    faces = []
    for f in inter.faces().vals():
        n = f.normalAt()
        if (plano == "x" and abs(n.x) > 0.99) or (plano == "y" and abs(n.y) > 0.99):
            c = f.Center()
            if (plano == "x" and c.x > coord) or (plano == "y" and c.y > coord):
                faces.append(f)
    return faces


def face_path(face, mapa):
    verts, codes = [], []
    for w in [face.outerWire()] + face.innerWires():
        pts = []
        for e in w.Edges():
            ts = [0, 1] if e.geomType() == "LINE" else list(np.linspace(0, 1, 16))
            pts += [mapa(p) for p in e.positions(ts)]
        # ordena pela sequência do fio
        pts = [w_ for w_ in pts]
        verts += pts + [pts[0]]
        codes += [Path.MOVETO] + [Path.LINETO] * (len(pts) - 1) + [Path.CLOSEPOLY]
    return Path(verts, codes)


def wire_pts(w, mapa):
    pts = []
    for e in w.Edges():
        ts = [0, 1] if e.geomType() == "LINE" else list(np.linspace(0, 1, 16))
        ps = [mapa(p) for p in e.positions(ts)]
        if pts and np.hypot(ps[0][0] - pts[-1][0], ps[0][1] - pts[-1][1]) > np.hypot(ps[-1][0] - pts[-1][0], ps[-1][1] - pts[-1][1]):
            ps = ps[::-1]
        pts += ps
    return pts


def desenhar_corte(folha, itens, plano, coord, mapa, cores):
    for nome, shape in itens:
        for f in corte(shape, plano, coord):
            verts, codes = [], []
            for w in [f.outerWire()] + f.innerWires():
                pts = wire_pts(w, mapa)
                verts += pts + [pts[0]]
                codes += [Path.MOVETO] + [Path.LINETO] * (len(pts) - 1) + [Path.CLOSEPOLY]
            cor, hach = cores.get(nome, ("#d9dee2", None))
            folha.ax.add_patch(PathPatch(Path(verts, codes), fc=cor, ec=TINTA, lw=0.35, hatch=hach))


# ---------------------------------------------------------------------------------- principal
def main():
    P, d, pecas, comps, lados = build()
    ver = json.load(open(os.path.join(AQUI, "verificacao.json"), encoding="utf-8"))
    malhas = json.load(open(os.path.join(AQUI, "malhas.json"), encoding="utf-8"))
    L, W, H = P["L"], P["W"], d["H"]
    externo = (pecas["ORION_Corpo_Principal"].union(pecas["ORION_Tampa_Traseira"]).union(pecas["ORION_Moldura_Tela"])
               .union(pecas["ORION_Botao_Lateral"]).union(pecas["ORION_Acesso_USB_C"]).union(pecas["ORION_Adaptadores_Pulseira"]))
    sem_adapt = (pecas["ORION_Corpo_Principal"].union(pecas["ORION_Tampa_Traseira"]).union(pecas["ORION_Moldura_Tela"])
                 .union(pecas["ORION_Botao_Lateral"]))
    TOTAL = 4
    os.makedirs(os.path.dirname(SAIDA), exist_ok=True)
    with PdfPages(SAIDA) as pdf:
        # ---------------- Folha 1: vistas externas
        f = Folha(pdf, "Vistas externas e cotas gerais", 1, TOTAL, "2:1")
        s = 2.0
        # Frontal (tela) — vista de cima (+Z): u = x, v = y
        m, _ = f.vista(externo.val(), (0, 0, 1), (1, 0, 0), (95, 148), s, "VISTA FRONTAL (tela)")
        f.cota(m(-L / 2, W / 2), m(L / 2, W / 2), 8, f"{L:.1f}")
        f.cota(m(L / 2 + 6.5, -W / 2), m(L / 2 + 6.5, W / 2), 6, f"{W:.1f}", lado="v")
        f.cota(m(-(L / 2 + P["lug_comp"]), -W / 2 - 1.5), m(L / 2 + P["lug_comp"], -W / 2 - 1.5), -5,
               f"{L + 2 * P['lug_comp']:.1f} (com adaptadores)")
        jx, jy = P["oled_ativa_x"] + 2 * P["janela_margem"], P["oled_ativa_y"] + 2 * P["janela_margem"]
        cx, cy = d["vidro_cx"], d["vidro_cy"]
        f.cota(m(cx - jx / 2, cy + jy / 2), m(cx + jx / 2, cy + jy / 2), 3.2, f"janela {jx:.1f}")
        f.cota(m(cx - jx / 2, cy - jy / 2), m(cx - jx / 2, cy + jy / 2), -3.0, f"{jy:.1f}", lado="v")
        f.cota(m(-L / 2, -W / 2 + 4), m(cx, -W / 2 + 4), 0.01, f"{cx + L / 2:.2f} (centro da janela)")
        f.nota(20, 196, f"Pulseira: largura entre hastes {P['pulseira_w'] + 0.2:.1f} mm (pulseira de 20 mm com barra de mola padrão Ø1,5).")
        # Lateral com o botão (+Y): u = -x, v = z
        m2, _ = f.vista(sem_adapt.val(), (0, 1, 0), (-1, 0, 0), (85, 60), s, "VISTA LATERAL DIREITA (botão)")
        f.cota(m2(L / 2, 0), m2(L / 2, H), 8, f"{H:.1f}", lado="v")
        bx, bz = d["btn_x"], d["btn_z"]
        f.cota(m2(L / 2, 0), m2(-bx, 0), -6, f"{bx + L / 2:.2f} (centro do botão)")
        f.cota(m2(-bx - P["btn_rebaixo_x"] / 2 - 1.5, 0), m2(-bx - P["btn_rebaixo_x"] / 2 - 1.5, bz), -2, f"{bz:.2f}", lado="v")
        f.nota(16, 26, f"Botão: haste {P['btn_haste_x']}×{P['btn_haste_z']} em rebaixo {P['btn_rebaixo_x']}×{P['btn_rebaixo_z']}×{P['btn_rebaixo_p']} mm;\n"
                        f"face 0,3 mm abaixo da superfície (evita toque acidental). Chave: pré-curso 0,15 + curso 0,25 (curso a confirmar).")
        # Lateral com o USB-C (-Y): u = x, v = z
        m3, _ = f.vista(sem_adapt.val(), (0, -1, 0), (1, 0, 0), (210, 60), s, "VISTA LATERAL ESQUERDA (USB-C)")
        ux = d["mcu_cx"]
        zt = d["z_usb"] + P["usb_plug_h"] / 2
        f.cota(m3(ux - P["usb_plug_l"] / 2, zt), m3(ux + P["usb_plug_l"] / 2, zt), 5, f"abertura USB-C {P['usb_plug_l']:.1f}")
        f.cota(m3(ux + P["usb_plug_l"] / 2, d["z0"]), m3(ux + P["usb_plug_l"] / 2, zt), 4, f"{zt - d['z0']:.1f}", lado="v")
        f.cota(m3(-L / 2, 0), m3(ux, 0), -6, f"{ux + L / 2:.2f} (eixo do USB-C)")
        f.cota(m3(L / 2, 0), m3(L / 2, d["z_usb"]), 5, f"{d['z_usb']:.2f} (eixo, a confirmar)", lado="v")
        # Ponta (+X): u = y, v = z
        m4, _ = f.vista(externo.val(), (1, 0, 0), (0, 1, 0), (232, 150), s, "VISTA DA PONTA (pulseira)")
        lw = P["pulseira_w"] + 0.2
        f.cota(m4(-lw / 2, d["z0"] - P["lingua_t"] + P["lug_h"]), m4(lw / 2, d["z0"] - P["lingua_t"] + P["lug_h"]), 4, f"vão {lw:.1f}")
        zb = d["z0"] - P["lingua_t"]
        f.cota(m4(-lw / 2 - P["lug_t"], zb), m4(-lw / 2 - P["lug_t"], zb + P["barra_z"]), -3, f"barra Ø1,5 a {P['barra_z']:.1f}", lado="v")
        f.fechar()

        # ---------------- Folha 2: traseira + cortes
        f = Folha(pdf, "Vista traseira, fixação e cortes internos", 2, TOTAL, "1,6:1 · cortes 2,4:1")
        tr = pecas["ORION_Tampa_Traseira"].union(pecas["ORION_Adaptadores_Pulseira"])
        s = 1.6
        m, _ = f.vista(tr.val(), (0, 0, -1), (-1, 0, 0), (68, 160), s, "VISTA TRASEIRA (pulso) — 4 parafusos M2×6, escala 1,6:1")
        for (bx, by) in d["bosses"]:
            px, py = m(-bx, by)
            f.ax.plot(px, py, "+", c=COTA, ms=4, mew=0.4)
        b0, b1 = d["bosses"][0], d["bosses"][3]
        f.cota(m(-b0[0], b0[1]), m(-b1[0], b0[1]), -5, f"{b1[0] - b0[0]:.2f} entre furos")
        f.cota(m(-b1[0], b0[1]), m(-b1[0], b1[1]), -7, f"{b1[1] - b0[1]:.2f}", lado="v")
        f.nota(16, 112, f"Parafusos: auto-atarraxantes para plástico M2×6, cabeça panela Ø≤3,8; furo passante Ø{P['furo_passante']},\n"
                        f"rebaixo Ø{P['cabeca_d']}×{P['cabeca_prof']}; furo piloto nos postes Ø{P['furo_piloto']}. Logotipo gravado {P['logo_prof']} mm.")
        cores = {
            "corpo": ("#3c454c", "////"), "tampa": ("#59636a", "\\\\\\\\"), "moldura": ("#20272c", "xxxx"),
            "bandeja": ("#8d989f", None), "suporte": ("#b6bfc4", None), "botao": ("#00c8e6", None),
            "adapt": ("#59636a", "...."),
            "oled": ("#ff9a2e", None), "mcu": ("#ffb866", None), "bat": ("#ffd29a", None), "sw": ("#ffcc80", None), "motor": ("#ffa64d", None),
        }
        itens = [("corpo", pecas["ORION_Corpo_Principal"].val()), ("tampa", pecas["ORION_Tampa_Traseira"].val()),
                 ("moldura", pecas["ORION_Moldura_Tela"].val()), ("bandeja", pecas["ORION_Bandeja_Interna"].val()),
                 ("suporte", pecas["ORION_Suporte_ESP32"].val()), ("suporte", pecas["ORION_Suporte_Bateria"].val()),
                 ("botao", pecas["ORION_Botao_Lateral"].val()), ("adapt", pecas["ORION_Adaptadores_Pulseira"].val()),
                 ("oled", comps["OLED 0,96 SSD1306"].val()), ("mcu", comps["ESP32 (XIAO ESP32C6)"].val()),
                 ("bat", comps["Bateria LiPo 402020 + PCM"].val()), ("sw", comps["Chave táctil 6x3,5x4,3"].val())]
        if "Motor de vibração 1027" in comps:
            itens.append(("motor", comps["Motor de vibração 1027"].val()))
        # Corte A-A: plano y = -6 (atravessa bateria, ESP32 e OLED), visto de -Y: u = x, v = z
        ya = -6.0
        sA = 2.4
        oxA, oyA = 210, 140
        mapaA = lambda p: (oxA + sA * p.x, oyA + sA * p.z)  # noqa: E731
        desenhar_corte(f, itens, "y", ya, mapaA, cores)
        f.ax.text(oxA, oyA - 10, f"CORTE A-A (plano Y = {ya:.0f}, visto pelo lado do USB-C) — escala 2,4:1", ha="center", fontsize=7, weight="bold")
        f.cota((oxA + sA * (L / 2), oyA), (oxA + sA * (L / 2), oyA + sA * H), 10, f"{H:.1f}", lado="v")
        for z, txt in [(d["z0"], "tampa 2,0"), (d["z_bandeja"], "bandeja"), (d["z_oled"], "placa OLED"), (d["z_vidro_top"], "vidro"),
                       (d["z_cav_top"], "aba da moldura")]:
            f.ax.plot([oxA - sA * L / 2 - 6, oxA - sA * L / 2 - 1], [oyA + sA * z] * 2, lw=0.25, c=COTA)
            f.ax.text(oxA - sA * L / 2 - 7, oyA + sA * z, f"{txt}  z={z:.1f}", ha="right", va="center", fontsize=5.6, color=COTA)
        # Corte B-B: plano x = centro do ESP32, visto de +X: u = y, v = z
        xb = d["mcu_cx"]
        oxB, oyB = 210, 62
        mapaB = lambda p: (oxB + sA * p.y, oyB + sA * p.z)  # noqa: E731
        desenhar_corte(f, itens, "x", xb, mapaB, cores)
        f.ax.text(oxB, oyB - 10, f"CORTE B-B (plano X = {xb:.2f}, pelo eixo do USB-C) — escala 2,4:1", ha="center", fontsize=7, weight="bold")
        f.cota((oxB - sA * W / 2, oyB + sA * d["z_usb"]), (oxB - sA * W / 2, oyB + sA * d["z_usb"]), -6, "", lado="v") if False else None
        f.ax.annotate("USB-C", (oxB - sA * (d["hy"] - 1), oyB + sA * d["z_usb"]), (oxB - sA * W / 2 - 18, oyB + sA * d["z_usb"] + 6),
                      fontsize=6, color=COTA, arrowprops=dict(arrowstyle="-", lw=0.3, color=COTA))
        leg_y = 98
        f.nota(16, leg_y, "Legenda dos cortes:", weight="bold")
        for i, (k, txt) in enumerate([("corpo", "Peça 01 corpo"), ("tampa", "Peça 02 tampa"), ("moldura", "Peça 03 moldura"),
                                      ("bandeja", "Peça 04B bandeja"), ("suporte", "Peças 04/05 suportes"), ("botao", "Peça 06 botão"),
                                      ("oled", "OLED (ref.)"), ("mcu", "ESP32 (ref.)"), ("bat", "Bateria (ref.)"), ("sw", "Chave (ref.)")]):
            yy = leg_y - 5 - i * 4.2
            fc, hh = cores[k]
            f.ax.add_patch(Rectangle((16, yy - 2.6), 6, 3, fc=fc, ec=TINTA, lw=0.3, hatch=hh))
            f.ax.text(24, yy - 1.1, txt, fontsize=5.8, va="center")
        f.nota(16, 50, "Laranja = volumes de referência dos componentes\ncomprados (medidas de anúncios; conferir com\npaquímetro antes da versão final).", fontsize=5.6)
        f.fechar()

        # ---------------- Folha 3: peças, impressão e status das dimensões
        f = Folha(pdf, "Peças, impressão FDM e dimensões pendentes", 3, TOTAL, "—")
        lin = 196
        f.nota(14, lin, "PEÇAS IMPRESSAS (STL na orientação de impressão, mm, 1:1)", weight="bold", fontsize=7)
        cab = ["Arquivo", "Dimensões na mesa (mm)", "Volume (cm³)", "Orientação sugerida / observações"]
        xs = [14, 70, 108, 128]
        lin -= 6
        for x, t in zip(xs, cab):
            f.nota(x, lin, t, weight="bold")
        for arq, nome, cor, ex in PECAS:
            lin -= 5.2
            mm = malhas[arq]
            dims = " × ".join(f"{v:.1f}" for v in mm["dimensoes_impressao_mm"])
            f.nota(xs[0], lin, arq + ".stl")
            f.nota(xs[1], lin, dims)
            f.nota(xs[2], lin, f"{mm['volume_cad_mm3'] / 1000:.2f}")
            f.nota(xs[3], lin, mm["orientacao"][:118])
        lin -= 9
        f.nota(14, lin, "MATERIAL: PLA para validar encaixes; PETG depois, para impacto e calor. Tampa do USB-C em TPU, se houver. "
                        "Camada 0,12–0,16 mm; 3+ perímetros; 30–40% de preenchimento nas peças estruturais.", fontsize=6)
        lin -= 5
        f.nota(14, lin, "FOLGAS USADAS (ajustar após o 1º teste na sua impressora): componente×berço 0,30 · peça×peça 0,25 · "
                        "moldura×abertura 0,15 · botão×furo 0,20 · tampa USB-C 0,10 (atrito) · bateria×moldura 0,25.", fontsize=6)
        lin -= 10
        f.nota(14, lin, "STATUS DAS DIMENSÕES", weight="bold", fontsize=7)
        defin = [
            "DEFINIDAS NESTA VERSÃO (do projeto): caixa 49,0 × 34,0 × 15,1; paredes 1,8; topo 1,2; tampa 2,0; postes Ø4,0 com piloto Ø1,6;",
            "   abertura e aba da moldura; rebaixo e furo do botão; vão da pulseira 20,2; furos da barra de mola Ø1,1 × 1,4; folgas da lista acima.",
            "PENDENTES DE CONFIRMAÇÃO COM AS PEÇAS REAIS (medir com paquímetro):",
            "   • XIAO ESP32C6: 21 × 17,5 ou 17,8 (fontes divergem); espessura da placa (usada 1,2) e altura do USB-C (usada 3,3);",
            "     elas mudam a altura do eixo do USB-C (5,80).",
            "   • OLED 0,96\": placa 27 × 27 a 27,8 (varia por fabricante); vidro 26,7 × 19,2; área ativa 21,7 × 10,8; posição do vidro na placa (usado −1,5 em Y);",
            "     componentes no verso (usado 1,0) e onde ficam (as nervuras de apoio ficam nas bordas laterais da placa).",
            "   • Bateria 402020: 4 × 20 × 20 + circuito de proteção (reservado 2,0). Capacidade anunciada varia de 120 a 450 mAh: confirmar no rótulo.",
            "   • Chave táctil 6,0 × 3,5 × 4,3: curso não informado nos anúncios (usado 0,25).  • Motor 1027: Ø10 × 2,7 (consistente entre fontes).",
            "   • Plugue USB-C do SEU cabo: o sobremolde precisa caber na abertura 12,6 × 7,3; cabos com sobremolde maior não encaixam até o fim.",
        ]
        for t in defin:
            lin -= 4.6
            f.nota(14, lin, t, fontsize=5.9)
        lin -= 8
        f.nota(14, lin, "SEQUÊNCIA DE MONTAGEM (desmontagem: ordem inversa)", weight="bold", fontsize=7)
        passos = [
            "1. Testar toda a eletrônica na bancada, fora da caixa, antes de montar.",
            "2. Soldar fios finos de silicone (30 AWG) no OLED, na chave, no motor (via transistor) e a bateria nos pads BAT do ESP32.",
            "3. Encaixar a moldura (03) por dentro do corpo, com a aba encostada no topo.",
            "4. Colocar o OLED com o vidro para cima, com fita dupla-face fina sobre a aba.",
            "5. Inserir o botão (06) por dentro, no furo da parede.",
            "6. Bandeja (04B): colar a chave no suporte (atuador voltado ao botão) e o motor no anel.",
            "7. Suporte do ESP32 (04) com a placa, USB-C voltado para a abertura; suporte da bateria (05) com a bateria sobre espuma.",
            "8. Encaixar as línguas dos adaptadores (07) nos bolsões da tampa (pinos Ø2,0).",
            "9. Fechar a tampa (02) e apertar os 4 parafusos M2×6 sem forçar; pulseira com barras de mola.",
        ]
        for t in passos:
            lin -= 4.3
            f.nota(14, lin, t, fontsize=5.8)
        img = plt.imread(os.path.join(os.path.dirname(SAIDA), "ORION_Montagem_Explodida.png"))
        f.ax.imshow(img, extent=(176, 286, 36, 36 + 110 * img.shape[0] / img.shape[1]), zorder=1)
        f.nota(176, 36 + 110 * img.shape[0] / img.shape[1] + 4, "VISTA EXPLODIDA (renderizada a partir do CAD)", weight="bold", fontsize=6.5)
        f.fechar()

        # ---------------- Folha 4: verificação digital
        f = Folha(pdf, "Relatório de verificação digital", 4, TOTAL, "—")
        lin = 196
        f.nota(14, lin, "VERIFICAÇÃO DIGITAL (cad/verificar.py e cad/gerar.py)", weight="bold", fontsize=7)
        for it in ver["itens"]:
            lin -= 3.7
            cor = "#0b6b2b" if it["status"].startswith("Aprovado") else "#9a2b1a"
            f.nota(14, lin, "✓" if it["status"].startswith("Aprovado") else "✗", color=cor, weight="bold")
            f.nota(19, lin, f"{it['item']}: {it['detalhe']}"[:175], fontsize=5.7)
        lin -= 5
        f.nota(14, lin, "MALHAS STL", weight="bold", fontsize=7)
        for arq, mm in malhas.items():
            lin -= 3.7
            e = mm["espessura_local_mm"] or {}
            f.nota(19, lin, f"{arq}: fechada={'sim' if mm['fechada_watertight'] else 'NÃO'} · normais={'ok' if mm['normais_consistentes'] else 'NÃO'} · "
                            f"volume malha×CAD {mm['dif_volume_pct']:.3f}% · espessura local p1 {e.get('p1', 0):.2f} mm · apoiada em Z=0: {'sim' if mm['apoiada_em_z0'] else 'não'}",
                   fontsize=5.7)
        lin -= 5
        f.nota(14, lin, "PENDENTE DE TESTE DE IMPRESSÃO: tolerâncias reais da sua impressora; furos Ø1,1 da barra de mola (passar broca); "
                        "parede de 0,7 mm entre o rebaixo do parafuso e a borda da tampa;", fontsize=5.9)
        f.nota(14, lin - 4, "encaixe da moldura por dentro; atrito da tampa do USB-C.", fontsize=5.9)
        f.nota(14, lin - 9, "PENDENTE DE TESTE FÍSICO/ELETRÔNICO: dimensões reais dos componentes; alcance do plugue USB-C; curso do botão; aquecimento durante a carga; "
                            "conforto no pulso; autonomia;", fontsize=5.9)
        f.nota(14, lin - 13, "rigidez da tampa com 4 parafusos; resistência dos adaptadores (pinos Ø2,0 + aperto). Sem vedação: NÃO é resistente a água, suor ou poeira.", fontsize=5.9)
        f.fechar()
    print("PDF:", SAIDA)


if __name__ == "__main__":
    main()
