"""Gera os ícones do app Android (anéis holográficos ciano sobre fundo escuro)."""
import math, os, sys
from PIL import Image

BG = (2, 6, 13)
CYAN = (0, 229, 255)
SOFT = (122, 243, 255)
SIZES = {"mdpi": 48, "hdpi": 72, "xhdpi": 96, "xxhdpi": 144, "xxxhdpi": 192}


def render(n):
    ss = 4  # supersampling para suavizar as bordas
    big = n * ss
    img = Image.new("RGB", (big, big), BG)
    px = img.load()
    c = big / 2
    rings = [(0.42, 0.030, CYAN, 1.0), (0.30, 0.022, SOFT, 0.85), (0.17, 0.016, CYAN, 0.9)]
    for y in range(big):
        for x in range(big):
            r = math.hypot(x - c, y - c) / big
            a = 0.0
            col = BG
            for radius, width, color, strength in rings:
                d = abs(r - radius)
                if d < width:
                    k = (1 - d / width) * strength
                    if k > a:
                        a, col = k, color
            if r < 0.07:  # núcleo
                a, col = 1.0, SOFT
            elif r < 0.11:
                k = 1 - (r - 0.07) / 0.04
                if k > a:
                    a, col = k, CYAN
            if a > 0:
                px[x, y] = tuple(int(BG[i] + (col[i] - BG[i]) * a) for i in range(3))
    return img.resize((n, n), Image.LANCZOS)


out = sys.argv[1]
for name, n in SIZES.items():
    d = os.path.join(out, f"mipmap-{name}")
    os.makedirs(d, exist_ok=True)
    render(n).save(os.path.join(d, "ic_launcher.png"))
print("ícones gerados em", out)
