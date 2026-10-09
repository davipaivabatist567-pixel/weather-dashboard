"""Ferramentas de segmentacao: separa sprites do fundo escuro das pranchas."""
import numpy as np
from collections import deque
from PIL import Image

def fg_mask(arr, thr=48):
    a = arr.astype(np.int32)
    mx = a.max(axis=2)
    mn = a.min(axis=2)
    # fundo e azul-marinho muito escuro; sprite tem brilho ou saturacao maior
    return (mx > thr) | ((mx - mn) > 60)

def label(mask):
    h, w = mask.shape
    lab = np.zeros((h, w), np.int32)
    n = 0
    sizes = [0]
    for y in range(h):
        for x in range(w):
            if mask[y, x] and not lab[y, x]:
                n += 1
                q = deque([(y, x)]); lab[y, x] = n; s = 0
                while q:
                    cy, cx = q.popleft(); s += 1
                    for dy in (-1, 0, 1):
                        for dx in (-1, 0, 1):
                            ny, nx = cy + dy, cx + dx
                            if 0 <= ny < h and 0 <= nx < w and mask[ny, nx] and not lab[ny, nx]:
                                lab[ny, nx] = n; q.append((ny, nx))
                sizes.append(s)
    return lab, sizes

def fill_holes(mask):
    h, w = mask.shape
    outside = np.zeros_like(mask)
    q = deque()
    for x in range(w):
        for y in (0, h - 1):
            if not mask[y, x] and not outside[y, x]:
                outside[y, x] = True; q.append((y, x))
    for y in range(h):
        for x in (0, w - 1):
            if not mask[y, x] and not outside[y, x]:
                outside[y, x] = True; q.append((y, x))
    while q:
        cy, cx = q.popleft()
        for dy, dx in ((1, 0), (-1, 0), (0, 1), (0, -1)):
            ny, nx = cy + dy, cx + dx
            if 0 <= ny < h and 0 <= nx < w and not mask[ny, nx] and not outside[ny, nx]:
                outside[ny, nx] = True; q.append((ny, nx))
    return ~outside

def dilate(mask, r=1):
    out = mask.copy()
    for dy in range(-r, r + 1):
        for dx in range(-r, r + 1):
            out |= np.roll(np.roll(mask, dy, 0), dx, 1)
    return out

def runs(mask, axis):
    """Comprimento da sequencia continua de pixels em cada posicao (por eixo)."""
    m = mask if axis == 1 else mask.T
    out = np.zeros(m.shape, np.int32)
    for r in range(m.shape[0]):
        row = m[r]; x = 0; w = len(row)
        while x < w:
            if row[x]:
                e = x
                while e < w and row[e]: e += 1
                out[r, x:e] = e - x; x = e
            else:
                x += 1
    return out if axis == 1 else out.T

def remove_lines(m, length=26, thick=3):
    """Remove bordas de painel: linhas longas e finas."""
    h_run = runs(m, 1); v_run = runs(m, 0)
    line = ((h_run >= length) & (v_run <= thick)) | ((v_run >= length) & (h_run <= thick))
    return m & ~line

def clean_mask(arr, thr=48, min_size=12):
    m = remove_lines(fg_mask(arr, thr))
    lab, sizes = label(m)
    keep = np.zeros(len(sizes), bool)
    for i, s in enumerate(sizes):
        if i and s >= min_size:
            ys, xs = np.nonzero(lab == i)
            bh, bw = np.ptp(ys) + 1, np.ptp(xs) + 1
            # descarta tracos finos e contornos vazados (bordas)
            if min(bh, bw) <= 3:
                continue
            if bh * bw > 400 and s / (bh * bw) < 0.12:
                continue
            keep[i] = True
    return keep[lab]

def split_columns(mask, min_gap=3, min_width=10, min_count=4):
    cols = mask.sum(axis=0) >= min_count
    segs = []; start = None; gap = 0
    for x, c in enumerate(cols):
        if c:
            if start is None: start = x
            gap = 0; end = x
        elif start is not None:
            gap += 1
            if gap >= min_gap:
                segs.append((start, end + 1)); start = None
    if start is not None: segs.append((start, end + 1))
    return [s for s in segs if s[1] - s[0] >= min_width]

def cut_sprite(img, box, thr=48, min_size=12, keep_largest_group=False):
    """Recorta box=(x0,y0,x1,y1) e devolve RGBA com fundo transparente."""
    arr = np.array(img.crop(box).convert('RGB'))
    m = clean_mask(arr, thr, min_size)
    m = fill_holes(m)
    m = dilate(m, 1) & (np.array(img.crop(box).convert('L')) > 3)
    ys, xs = np.nonzero(m)
    if len(ys) == 0:
        return None
    y0, y1, x0, x1 = ys.min(), ys.max() + 1, xs.min(), xs.max() + 1
    rgba = np.dstack([arr, (m * 255).astype(np.uint8)])[y0:y1, x0:x1]
    return Image.fromarray(rgba, 'RGBA')

def auto_frames(img, box, thr=48, min_gap=3, min_width=10):
    arr = np.array(img.crop(box).convert('RGB'))
    m = clean_mask(arr, thr)
    segs = split_columns(m, min_gap, min_width)
    x0, y0, x1, y1 = box
    return [(x0 + a, y0, x0 + b, y1) for a, b in segs]

def split_n(mask, n, min_count=1):
    """Divide a regiao em n quadros cortando nos vales da projecao vertical."""
    cols = mask.sum(axis=0).astype(float)
    occ = np.nonzero(cols >= min_count)[0]
    if n <= 1 or len(occ) == 0:
        return [(int(occ.min()), int(occ.max()) + 1)] if len(occ) else []
    a, b = occ.min(), occ.max() + 1
    span = (b - a) / n
    cuts = []
    for i in range(1, n):
        c = a + span * i
        lo, hi = int(c - span * 0.35), int(c + span * 0.35)
        win = cols[lo:hi]
        # menor coluna; em empate, a mais perto do centro esperado
        best = min(range(len(win)), key=lambda j: (win[j], abs(lo + j - c)))
        cuts.append(lo + best)
    edges = [a] + cuts + [b]
    return [(int(edges[i]), int(edges[i + 1])) for i in range(n)]

def main_object(m, ratio=0.12):
    lab, sizes = label(m)
    if len(sizes) <= 1:
        return m
    big = int(np.argmax(sizes[1:])) + 1
    ys, xs = np.nonzero(lab == big)
    bh, bw = ys.max() - ys.min(), xs.max() - xs.min()
    y0, y1 = ys.min() - bh * 0.5, ys.max() + 3
    x0, x1 = xs.min() - bw * 0.12, xs.max() + bw * 0.12
    keep = np.zeros(len(sizes), bool); keep[big] = True
    for i in range(1, len(sizes)):
        if i == big or sizes[i] < max(8, sizes[big] * ratio * 0.1):
            continue
        yy, xx = np.nonzero(lab == i)
        cy, cx = yy.mean(), xx.mean()
        if y0 <= cy <= y1 and x0 <= cx <= x1:
            keep[i] = True
    return keep[lab]

def drop_slivers(m):
    """Remove lascas finas que sobram do quadro vizinho após o corte."""
    lab, sizes = label(m)
    keep = np.zeros(len(sizes), bool)
    for i in range(1, len(sizes)):
        ys, xs = np.nonzero(lab == i)
        if np.ptp(xs) + 1 > 3 and np.ptp(ys) + 1 > 3:
            keep[i] = True
    return keep[lab]

def extract(img, box, n=1, thr=48, single=True):
    """Extrai n sprites RGBA de uma caixa da prancha."""
    rgb = np.array(img.crop(box).convert('RGB'))
    m = clean_mask(rgb, thr)
    segs = split_n(m, n, 3)
    out = []
    for a, b in segs:
        sub = m[:, a:b].copy()
        sub = drop_slivers(sub)
        if single:
            sub = main_object(sub)
        sub = fill_holes(sub)
        sub = dilate(sub, 1)
        sub &= rgb[:, a:b].max(axis=2) > 2
        # limpeza final: pontos soltos e traços de 1-2 px
        lab, sizes = label(sub)
        for i in range(1, len(sizes)):
            ys, xs = np.nonzero(lab == i)
            if sizes[i] < 30 or np.ptp(xs) < 2 or np.ptp(ys) < 2:
                sub[ys, xs] = False
        ys, xs = np.nonzero(sub)
        if len(ys) == 0:
            continue
        y0, y1, x0, x1 = ys.min(), ys.max() + 1, xs.min(), xs.max() + 1
        piece = rgb[y0:y1, a + x0:a + x1]
        alpha = (sub[y0:y1, x0:x1] * 255).astype(np.uint8)
        im = Image.fromarray(np.dstack([piece, alpha]), 'RGBA')
        # ancora: centro dos pixels da parte de baixo (pes)
        h = y1 - y0
        bottom = sub[y0 + int(h * 0.7):y1, x0:x1]
        bx = np.nonzero(bottom)[1]
        ax = float(bx.mean()) if len(bx) else (x1 - x0) / 2
        out.append({'img': im, 'anchor_x': ax, 'src': (box[0] + a + x0, box[1] + y0, box[0] + a + x1, box[1] + y1)})
    return out
