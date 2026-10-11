"""
Gera os arquivos da ORION SMART BAND a partir do modelo paramétrico:
  ../stl/*.stl        peças na ORIENTAÇÃO DE IMPRESSÃO, em mm, escala 1:1, apoiadas em Z = 0
  ../step/ORION_Smart_Band.step   montagem (peças + volumes de referência dos componentes)
  ../viewer/pecas.json            malhas na posição de montagem (para o visualizador e as imagens)
  malhas.json                     verificação das malhas (fechada, normais, volume, espessura)

Uso:  python3 gerar.py
"""
from __future__ import annotations

import json
import math
import os

import cadquery as cq
import numpy as np
import trimesh

from orion_band import PECAS, build

AQUI = os.path.dirname(os.path.abspath(__file__))
RAIZ = os.path.dirname(AQUI)

# Orientação de impressão: (rotações em graus aplicadas na ordem) e motivo
ORIENTACAO = {
    "ORION_Corpo_Principal": ([("X", 180)], "Face da tela na mesa: topo liso, paredes sobem; postes com topo cônico de 45°"),
    "ORION_Tampa_Traseira": ([], "Face do pulso na mesa: logotipo e rebaixos dos parafusos ficam lisos"),
    "ORION_Moldura_Tela": ([("X", 180)], "Face visível na mesa; a aba interna fica para cima"),
    "ORION_Suporte_ESP32": ([], "Paredes para cima; abas de apoio chanfradas a 45°"),
    "ORION_Bandeja_Interna": ([], "Placa na mesa; nervuras, anel do motor e suporte da chave para cima"),
    "ORION_Suporte_Bateria": ([], "Moldura em pé, sem saliências"),
    "ORION_Botao_Lateral": ([("X", -90)], "Aba interna na mesa, haste para cima"),
    "ORION_Adaptadores_Pulseira": ([], "Base plana (língua) na mesa; furos da barra de mola horizontais (passar broca 1,0–1,1 mm)"),
    "ORION_Acesso_USB_C": ([("X", 90)], "Aba externa na mesa; imprimir em TPU se possível"),
}


def to_mesh(wp, tol=0.01, ang=0.15):
    verts, tris = [], []
    for solid in wp.vals():
        v, t = solid.tessellate(tol, ang)
        off = len(verts)
        verts += [(p.x, p.y, p.z) for p in v]
        tris += [(a + off, b + off, c + off) for a, b, c in t]
    m = trimesh.Trimesh(vertices=np.array(verts), faces=np.array(tris), process=True)
    m.merge_vertices()
    return m


def orientar(wp, rots):
    s = wp
    for eixo, ang in rots:
        s = s.rotate((0, 0, 0), {"X": (1, 0, 0), "Y": (0, 1, 0), "Z": (0, 0, 1)}[eixo], ang)
    bb = s.val().BoundingBox()
    return s.translate((-(bb.xmin + bb.xmax) / 2, -(bb.ymin + bb.ymax) / 2, -bb.zmin))


def espessura(m, n=12000, seed=1):
    """Espessura local por raios: de pontos da superfície para dentro (contra a normal)."""
    rng = np.random.default_rng(seed)
    pts, idx = trimesh.sample.sample_surface(m, n, seed=int(rng.integers(1e9)))
    nr = m.face_normals[idx]
    orig = pts - nr * 1e-3
    locs, ray_idx, _ = m.ray.intersects_location(orig, -nr, multiple_hits=False)
    if len(ray_idx) == 0:
        return None
    dd = np.linalg.norm(locs - orig[ray_idx], axis=1)
    dd = dd[dd > 0.02]
    return {"p1": float(np.percentile(dd, 1)), "p5": float(np.percentile(dd, 5)), "mediana": float(np.median(dd))}


def main():
    P, d, pecas, comps, adapt_lados = build()
    os.makedirs(os.path.join(RAIZ, "stl"), exist_ok=True)
    os.makedirs(os.path.join(RAIZ, "step"), exist_ok=True)
    os.makedirs(os.path.join(RAIZ, "viewer"), exist_ok=True)
    relatorio = {}

    for arq, nome, cor, expl in PECAS:
        wp = pecas[arq]
        rots, motivo = ORIENTACAO[arq]
        imp = orientar(wp, rots)
        caminho = os.path.join(RAIZ, "stl", arq + ".stl")
        cq.exporters.export(imp, caminho, tolerance=0.01, angularTolerance=0.15)
        m = trimesh.load(caminho)
        if isinstance(m, trimesh.Scene):
            m = trimesh.util.concatenate(list(m.geometry.values()))
        cad_vol = sum(s.Volume() for s in wp.vals())
        bb = m.bounds
        relatorio[arq] = {
            "nome": nome,
            "orientacao": motivo,
            "rotacoes": rots,
            "fechada_watertight": bool(m.is_watertight),
            "normais_consistentes": bool(m.is_winding_consistent),
            "volume_malha_mm3": round(float(m.volume), 2),
            "volume_cad_mm3": round(cad_vol, 2),
            "dif_volume_pct": round(100 * abs(m.volume - cad_vol) / cad_vol, 3),
            "corpos": int(len(m.split(only_watertight=False))),
            "dimensoes_impressao_mm": [round(float(x), 2) for x in (bb[1] - bb[0])],
            "apoiada_em_z0": bool(abs(bb[0][2]) < 1e-6),
            "espessura_local_mm": espessura(m),
            "triangulos": int(len(m.faces)),
        }
        print(arq, relatorio[arq]["fechada_watertight"], relatorio[arq]["normais_consistentes"],
              relatorio[arq]["dif_volume_pct"], relatorio[arq]["espessura_local_mm"])

    # STEP da montagem
    assy = cq.Assembly(name="ORION_Smart_Band")
    for arq, nome, cor, expl in PECAS:
        assy.add(pecas[arq], name=arq, color=cq.Color(*cor))
    for k, v in comps.items():
        assy.add(v, name="REF_" + "".join(ch if ch.isalnum() else "_" for ch in k), color=cq.Color(0.9, 0.55, 0.1, 0.6))
    assy.export(os.path.join(RAIZ, "step", "ORION_Smart_Band.step"))

    # Malhas na posição de montagem (visualizador e imagens)
    cena = {"pecas": [], "componentes": [], "medidas": {"L": P["L"], "W": P["W"], "H": round(d["H"], 2)}}
    for arq, nome, cor, expl in PECAS:
        if arq == "ORION_Adaptadores_Pulseira":
            partes = [(adapt_lados[0], (-16, 0, 0)), (adapt_lados[1], (16, 0, 0))]
        else:
            partes = [(pecas[arq], expl)]
        for i, (wp, ex) in enumerate(partes):
            m = to_mesh(wp, 0.02, 0.2)
            cena["pecas"].append({
                "id": arq + (f"_{i}" if len(partes) > 1 else ""), "nome": nome, "cor": cor, "explodir": ex,
                "v": np.round(m.vertices, 3).flatten().tolist(), "f": m.faces.flatten().tolist(),
            })
    for k, v in comps.items():
        m = to_mesh(v, 0.02, 0.2)
        cena["componentes"].append({"id": k, "nome": k + " (referência, medidas aproximadas)",
                                    "v": np.round(m.vertices, 3).flatten().tolist(), "f": m.faces.flatten().tolist()})
    with open(os.path.join(RAIZ, "viewer", "pecas.json"), "w") as fh:
        json.dump(cena, fh, separators=(",", ":"))
    with open(os.path.join(AQUI, "malhas.json"), "w", encoding="utf-8") as fh:
        json.dump(relatorio, fh, ensure_ascii=False, indent=2)
    print("ok")


if __name__ == "__main__":
    main()
