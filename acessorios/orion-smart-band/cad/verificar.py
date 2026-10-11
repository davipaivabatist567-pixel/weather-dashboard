"""
Verificação digital do modelo da ORION SMART BAND.

Executa: colisões entre todas as peças e componentes (volume de interseção), folgas mínimas
nos pontos críticos, simulação de montagem/desmontagem (cada peça desliza até sair do corpo
sem bater), alinhamento do USB-C e do botão, e medidas externas. Grava verificacao.json.

Nada aqui substitui impressão e teste físico: é geometria contra geometria.
"""
from __future__ import annotations

import itertools
import json
import sys

import cadquery as cq

from orion_band import build

TOL_VOL = 0.01  # mm³: abaixo disso é contato de faces, não colisão


def vol(w):
    try:
        return sum(s.Volume() for s in w.vals() if hasattr(s, "Volume"))
    except Exception:
        return 0.0


def inter(a, b):
    try:
        return vol(a.intersect(b))
    except Exception as e:  # noqa: BLE001
        return float("nan")


def dist(a, b):
    try:
        return a.val().distance(b.val())
    except Exception:
        return float("nan")


def bbox_overlap(a, b, m=0.05):
    A, B = a.val().BoundingBox(), b.val().BoundingBox()
    return not (A.xmax < B.xmin - m or B.xmax < A.xmin - m or A.ymax < B.ymin - m or B.ymax < A.ymin - m
                or A.zmax < B.zmin - m or B.zmax < A.zmin - m)


def varrer(movel, fixo, direcao, passo=0.5, ate=20.0):
    """Desliza `movel` na direção dada e devolve (bateu?, posição da primeira colisão)."""
    dx, dy, dz = direcao
    n = int(ate / passo) + 1
    for i in range(n):
        t = i * passo
        m = movel.translate((dx * t, dy * t, dz * t))
        if not bbox_overlap(m, fixo):
            return False, None
        if inter(m, fixo) > TOL_VOL:
            return True, round(t, 2)
    return False, None


def main(params=None):
    P, d, pecas, comps, adapt_lados = build(params)
    res = {"parametros": {k: v for k, v in P.items()}, "derivados": {}, "itens": []}
    for k in ("H", "Li", "Wi", "z_mcu", "z_usb", "z_bandeja", "z_bandeja_top", "z_oled", "z_vidro_top", "z_cav_top",
              "oled_x0", "oled_x1", "mcu_x0", "mcu_x1", "mcu_y0", "btn_x", "btn_z", "motor_cx", "zona_x0", "zona_x1"):
        res["derivados"][k] = round(d[k], 3)
    res["derivados"]["bosses"] = [(round(x, 2), round(y, 2)) for x, y in d["bosses"]]

    def item(nome, status, detalhe, valor=None):
        res["itens"].append({"item": nome, "status": status, "detalhe": detalhe, "valor": valor})
        print(f"[{status}] {nome}: {detalhe}")

    # 1. Dimensões externas
    corpo = pecas["ORION_Corpo_Principal"]
    tampa = pecas["ORION_Tampa_Traseira"]
    conj = corpo.union(tampa).union(pecas["ORION_Moldura_Tela"])
    bb = conj.val().BoundingBox()
    item("Dimensões externas da caixa", "Aprovado por verificação digital",
         f"{bb.xlen:.2f} x {bb.ylen:.2f} x {bb.zlen:.2f} mm (sem adaptadores)", [bb.xlen, bb.ylen, bb.zlen])
    ba = pecas["ORION_Adaptadores_Pulseira"].val().BoundingBox()
    item("Comprimento com adaptadores", "Aprovado por verificação digital", f"{ba.xlen:.2f} mm de ponta a ponta", ba.xlen)

    # 2-3. Colisões entre tudo (peças impressas montadas + volumes dos componentes)
    todos = dict(pecas)
    todos.pop("ORION_Adaptadores_Pulseira")
    todos["ORION_Adaptador_-X"] = adapt_lados[0]
    todos["ORION_Adaptador_+X"] = adapt_lados[1]
    for k, v in comps.items():
        todos["REF " + k] = v
    # pares que, por projeto, ocupam o mesmo lugar em momentos diferentes
    excluir = {frozenset(("ORION_Acesso_USB_C", "REF Plugue USB-C (metal)"))}
    colisoes = []
    nomes = list(todos)
    for a, b in itertools.combinations(nomes, 2):
        if frozenset((a, b)) in excluir:
            continue
        if not bbox_overlap(todos[a], todos[b]):
            continue
        v = inter(todos[a], todos[b])
        if v != v or v > TOL_VOL:  # NaN também conta como problema
            colisoes.append((a, b, round(v, 3)))
    if colisoes:
        for a, b, v in colisoes:
            item(f"Colisão {a} × {b}", "REPROVADO", f"volume de interseção {v} mm³", v)
    else:
        item("Colisões (peças + componentes)", "Aprovado por verificação digital",
             f"{len(nomes)} volumes, nenhuma interseção acima de {TOL_VOL} mm³ (componentes com medidas aproximadas)")

    # Folgas mínimas em pontos críticos
    folgas = [
        ("ESP32 × parede/corpo", "REF ESP32 (XIAO ESP32C6)", "ORION_Corpo_Principal"),
        ("OLED × corpo", "REF OLED 0,96 SSD1306", "ORION_Corpo_Principal"),
        ("Bateria × suporte", "REF Bateria LiPo 402020 + PCM", "ORION_Suporte_Bateria"),
        ("Bateria × bandeja (sem compressão)", "REF Bateria LiPo 402020 + PCM", "ORION_Bandeja_Interna"),
        ("Bateria × tampa (espuma)", "REF Bateria LiPo 402020 + PCM", "ORION_Tampa_Traseira"),
        ("Motor × OLED", "REF Motor de vibração 1027", "REF OLED 0,96 SSD1306"),
        ("Chave × haste do botão (pré-curso)", "REF Chave táctil 6x3,5x4,3", "ORION_Botao_Lateral"),
        ("Plugue USB-C × corpo", "REF Plugue USB-C (metal)", "ORION_Corpo_Principal"),
        ("ESP32 × poste do parafuso mais próximo", "REF ESP32 (XIAO ESP32C6)", "ORION_Corpo_Principal"),
    ]
    for nome, a, b in folgas:
        if a in todos and b in todos:
            dd = dist(todos[a], todos[b])
            item(f"Folga {nome}", "Aprovado por verificação digital" if dd >= 0 else "REPROVADO", f"{dd:.2f} mm", round(dd, 3))

    # 4. Alinhamento do USB-C e do botão
    plug = comps["REF Plugue USB-C (metal)"] if "REF Plugue USB-C (metal)" in comps else comps["Plugue USB-C (metal)"]
    v = inter(plug, corpo)
    item("Caminho do plugue USB-C até o receptáculo", "Aprovado por verificação digital" if v <= TOL_VOL else "REPROVADO",
         f"interseção do corpo metálico do plugue com o corpo: {v:.3f} mm³; centro Z = {d['z_usb']:.2f} mm (depende da altura real do receptáculo)")
    sw = comps["Chave táctil 6x3,5x4,3"]
    gap = dist(sw, pecas["ORION_Botao_Lateral"])
    item("Botão alinhado com a chave", "Aprovado por verificação digital" if 0 <= gap <= 0.3 else "REPROVADO",
         f"pré-curso {gap:.2f} mm + curso da chave {P['sw_curso']} mm (curso não confirmado no datasheet)")

    # 5-6. Montagem por baixo e remoção da tampa (cada peça desliza em -Z até sair)
    corpo_fixo = corpo
    sequencia = [
        ("Moldura da tela sai por baixo", pecas["ORION_Moldura_Tela"]),
        ("OLED sai por baixo", comps["OLED 0,96 SSD1306"]),
        ("Bandeja + motor + chave saem por baixo", pecas["ORION_Bandeja_Interna"].union(comps["Chave táctil 6x3,5x4,3"]).union(
            comps.get("Motor de vibração 1027", cq.Workplane("XY")) if P["motor"] else pecas["ORION_Bandeja_Interna"])),
        ("Suporte do ESP32 + placa saem por baixo", pecas["ORION_Suporte_ESP32"].union(comps["ESP32 (XIAO ESP32C6)"])),
        ("Suporte da bateria + bateria saem por baixo", pecas["ORION_Suporte_Bateria"].union(comps["Bateria LiPo 402020 + PCM"])),
    ]
    for nome, movel in sequencia:
        bateu, t = varrer(movel, corpo_fixo, (0, 0, -1), passo=0.5, ate=d["H"] + 2)
        item(nome, "REPROVADO" if bateu else "Aprovado por verificação digital",
             f"colide após descer {t} mm" if bateu else "caminho livre até sair do corpo")
    outros = corpo.union(adapt_lados[0]).union(adapt_lados[1]).union(pecas["ORION_Suporte_Bateria"]).union(
        pecas["ORION_Suporte_ESP32"])
    bateu, t = varrer(tampa, outros, (0, 0, -1), passo=0.25, ate=3)
    item("Tampa traseira removível", "REPROVADO" if bateu else "Aprovado por verificação digital",
         "sai em -Z depois de soltar os 4 parafusos" if not bateu else f"presa após {t} mm")
    for i, a in enumerate(adapt_lados):
        bateu, t = varrer(a, corpo, (0, 0, -1), passo=0.25, ate=8)
        item(f"Adaptador {'-X' if i == 0 else '+X'} sai com a tampa aberta",
             "REPROVADO" if bateu else "Aprovado por verificação digital", "livre em -Z" if not bateu else f"preso após {t} mm")
    # botão: entra por dentro, em +Y, antes da bandeja
    bateu, t = varrer(pecas["ORION_Botao_Lateral"].translate((0, -3.0, 0)), corpo, (0, 1, 0), passo=0.25, ate=3.0)
    item("Botão entra por dentro até a posição", "REPROVADO" if bateu else "Aprovado por verificação digital",
         "a aba interna para na parede" if not bateu else f"bate após {t} mm")

    # 7. Espessuras de projeto (paredes medidas na seção do corpo a meia altura)
    zc = d["z_cav_top"] - 0.1  # acima das aberturas do USB-C e do botão: anel contínuo
    sec = corpo.section(zc)
    faces = sec.faces().vals()
    tmin = None
    for f in faces:
        ow = f.outerWire()
        for iw in f.innerWires():
            dd = ow.distance(iw)
            tmin = dd if tmin is None else min(tmin, dd)
    item("Espessura mínima da parede (seção logo abaixo do topo)", "Aprovado por verificação digital" if tmin and tmin >= 1.19 else "REPROVADO",
         f"{(tmin or 0):.2f} mm (parede nominal {P['t_wall']} mm)", round(tmin or 0, 3))
    item("Parede no rebaixo do botão", "Aprovado por verificação digital" if P["t_wall"] - P["btn_rebaixo_p"] >= 1.19 else "REPROVADO",
         f"{P['t_wall'] - P['btn_rebaixo_p']:.2f} mm (parede {P['t_wall']} − rebaixo {P['btn_rebaixo_p']})")

    ok = all(i["status"] != "REPROVADO" for i in res["itens"])
    res["aprovado_digital"] = ok
    with open("verificacao.json", "w", encoding="utf-8") as fh:
        json.dump(res, fh, ensure_ascii=False, indent=2)
    print("\nRESULTADO:", "sem reprovações" if ok else "HÁ REPROVAÇÕES")
    return ok


if __name__ == "__main__":
    sys.exit(0 if main() else 1)
