"""Gera os atlas de sprites do jogo a partir das duas pranchas originais.

Uso: python3 tools/build_sprites.py
Saida: assets/sprites/<personagem>.png (quadros de tamanho uniforme)
       assets/sprites/atlas.json (metadados de cada animacao)
"""
import json, os, sys
sys.path.insert(0, os.path.dirname(__file__))
from segment import extract
from PIL import Image
import numpy as np

ROOT = os.path.join(os.path.dirname(__file__), '..')
S1 = Image.open(os.path.join(ROOT, 'assets/source/prancha_personagens.png')).convert('RGB')
S2 = Image.open(os.path.join(ROOT, 'assets/source/prancha_luta.png')).convert('RGB')
SHEETS = {'s1': S1, 's2': S2}

# (prancha, caixa, quantidade de quadros, escala, espelhar)
CHARS = {
  'pingui': {
    'idle':    [('s1', (965, 872, 1022, 937), 1)],
    'walk':    [('s1', (1028, 872, 1092, 937), 1)],
    'run':     [('s1', (1094, 872, 1157, 937), 1)],
    'jump':    [('s1', (1158, 872, 1218, 937), 1)],
    'attack':  [('s1', (1222, 872, 1279, 937), 1)],
    'hit':     [('s1', (1366, 872, 1432, 937), 1)],
    'defeat':  [('s1', (1440, 872, 1510, 937), 1)],
    'portrait':[('s1', (965, 872, 1022, 937), 1)],
  },
  'rei': {
    'idle':    [('s2', (345, 128, 572, 203), 3)],
    'walk':    [('s2', (582, 128, 793, 203), 4)],
    'run':     [('s2', (798, 128, 1065, 203), 4)],
    'jump':    [('s2', (1073, 123, 1308, 203), 4)],
    'fall':    [('s2', (1315, 128, 1528, 203), 2)],
    'attack':  [('s2', (342, 232, 512, 306), 3)],
    'special': [('s2', (520, 232, 618, 306), 2)],
    'victory': [('s2', (1273, 232, 1390, 306), 1, 0.9)],
    'defeat':  [('s2', (1395, 240, 1527, 306), 1)],
    'portrait':[('s2', (10, 110, 153, 306), 1)],
  },
  'capitao': {
    'idle':    [('s2', (342, 345, 572, 426), 4)],
    'walk':    [('s2', (580, 345, 795, 426), 5)],
    'run':     [('s2', (798, 345, 1063, 426), 4)],
    'jump':    [('s2', (1073, 345, 1300, 426), 3)],
    'attack':  [('s2', (342, 452, 470, 522), 2)],
    'special': [('s2', (572, 452, 690, 522), 2)],
    'victory': [('s2', (1306, 350, 1432, 475), 1, 0.68)],
    'defeat':  [('s2', (1440, 380, 1528, 475), 1, 0.75)],
    'portrait':[('s2', (10, 330, 160, 530), 1)],
  },
  'golem': {
    'idle':    [('s2', (342, 560, 556, 638), 3)],
    'walk':    [('s2', (565, 560, 800, 638), 4)],
    'jump':    [('s2', (808, 560, 1060, 638), 3)],
    'fall':    [('s2', (1070, 560, 1262, 638), 2)],
    'attack':  [('s2', (342, 665, 470, 742), 2)],
    'special': [('s2', (528, 665, 577, 742), 1), ('s2', (900, 670, 962, 742), 1)],
    'victory': [('s2', (1285, 555, 1427, 745), 1, 0.5)],
    'defeat':  [('s2', (1435, 590, 1528, 700), 1, 0.62)],
    'portrait':[('s2', (10, 555, 158, 736), 1)],
  },
  'bruxa': {
    'idle':    [('s2', (342, 777, 572, 841), 3)],
    'walk':    [('s2', (580, 777, 800, 841), 4)],
    'run':     [('s2', (808, 777, 1060, 841), 4)],
    'attack':  [('s2', (342, 868, 500, 936), 3)],
    'special': [('s2', (550, 868, 612, 936), 1)],
    'victory': [('s2', (1268, 770, 1405, 936), 1, 0.55)],
    'defeat':  [('s2', (1420, 780, 1528, 925), 1, 0.6)],
    'portrait':[('s2', (10, 760, 162, 936), 1)],
  },
}

EFFECTS = {
  'iceball':   ('s1', (1280, 885, 1356, 925)),
  'rajada':    ('s2', (618, 238, 748, 302)),
  'flocos':    ('s2', (752, 236, 872, 306)),
  'tempestade':('s2', (880, 236, 1074, 306)),
  'cannonfire':('s2', (470, 452, 562, 522)),
  'anchor':    ('s2', (702, 448, 760, 522)),
  'cannonrain':('s2', (945, 455, 1132, 522)),
  'punchfx':   ('s2', (470, 665, 518, 742)),
  'quake':     ('s2', (577, 665, 700, 742)),
  'crystals':  ('s2', (770, 670, 892, 742)),
  'beam':      ('s2', (962, 675, 1104, 735)),
  'orb':       ('s2', (500, 868, 540, 936)),
  'magicbeam': ('s2', (612, 868, 726, 936)),
  'vortex':    ('s2', (732, 868, 884, 936)),
  'teleport':  ('s2', (893, 868, 1062, 936)),
  'blast':     ('s1', (585, 870, 672, 927)),
  'storm':     ('s1', (676, 870, 744, 938)),
  'explosion': ('s1', (762, 868, 818, 927)),
  'smoke':     ('s1', (822, 872, 892, 927)),
  'dust':      ('s1', (894, 872, 930, 927)),
  'pinguinha': ('s1', (14, 748, 76, 822)),
  'pinguinha_feliz': ('s1', (240, 765, 292, 818)),
}

UPRIGHT = {'idle', 'walk', 'run', 'jump', 'fall', 'attack', 'special'}

def core_area(img):
    a = np.array(img)[:, :, 3] > 0
    for _ in range(2):  # erosão simples
        a = a & np.roll(a, 1, 0) & np.roll(a, -1, 0) & np.roll(a, 1, 1) & np.roll(a, -1, 1)
    return max(1, int(a.sum()))

def normalize_sizes(name, frames):
    # compara cada quadro com a mediana da PRÓPRIA animação (a escala entre
    # painéis diferentes da prancha já é parecida; o problema são quadros
    # isolados desenhados maiores ou menores dentro da mesma sequência)
    for anim in UPRIGHT:
        group = [p for a, p in frames if a == anim]
        if len(group) < 3:
            continue
        ref = float(np.median([core_area(p['img']) for p in group]))
        for p in group:
            s = (ref / core_area(p['img'])) ** 0.5
            s = max(0.8, min(1.25, s))
            if abs(s - 1) > 0.08:
                im = p['img']
                p['img'] = im.resize((max(1, round(im.width * s)), max(1, round(im.height * s))), Image.LANCZOS)
                p['anchor_x'] *= s
                print(f'  {name}:{anim} quadro reescalado x{s:.2f}')
    return frames

def build(outdir):
    os.makedirs(outdir, exist_ok=True)
    meta = {'characters': {}, 'effects': {}}
    for name, anims in CHARS.items():
        frames = []  # (anim, piece)
        for anim, parts in anims.items():
            for part in parts:
                sheet, box, n = part[:3]
                scale = part[3] if len(part) > 3 else 1.0
                for piece in extract(SHEETS[sheet], box, n, single=(anim != 'portrait')):
                    if scale != 1.0:
                        im = piece['img']
                        nw, nh = max(1, round(im.width * scale)), max(1, round(im.height * scale))
                        piece['img'] = im.resize((nw, nh), Image.LANCZOS)
                        piece['anchor_x'] *= scale
                    frames.append((anim, piece))
        # descarta quadros cortados pela borda do painel (muito menores que o resto)
        filtered = []
        for anim in dict.fromkeys(a for a, _ in frames):
            group = [p for a, p in frames if a == anim]
            hmax = max(p['img'].height * p['img'].width for p in group)
            for p in group:
                if p['img'].height * p['img'].width >= hmax * 0.45:
                    filtered.append((anim, p))
                else:
                    print('  descartado quadro parcial', name, anim, p['src'])
        frames = filtered
        # normaliza o tamanho: a prancha desenha alguns quadros maiores/menores
        # que outros. Mede a "massa" do corpo (máscara erodida, sem cajados e
        # partículas finas) e reescala quadros fora do padrão da animação.
        frames = normalize_sizes(name, frames)
        # portrait vai num arquivo proprio
        port = [p for a, p in frames if a == 'portrait']
        frames = [(a, p) for a, p in frames if a != 'portrait']
        if port:
            port[0]['img'].save(os.path.join(outdir, f'{name}_retrato.png'))
        # celula uniforme: largura = 2 * maior distancia da ancora, altura = maior altura
        half = max(max(p['anchor_x'], p['img'].width - p['anchor_x']) for _, p in frames)
        cw = int(half * 2) + 4
        ch = max(p['img'].height for _, p in frames) + 2
        cols = 8
        rows = (len(frames) + cols - 1) // cols
        atlas = Image.new('RGBA', (cw * cols, ch * rows), (0, 0, 0, 0))
        anim_meta = {}
        for i, (anim, p) in enumerate(frames):
            cx, cy = (i % cols) * cw, (i // cols) * ch
            ox = int(round(cw / 2 - p['anchor_x']))
            oy = ch - p['img'].height - 1
            atlas.paste(p['img'], (cx + ox, cy + oy), p['img'])
            anim_meta.setdefault(anim, []).append(i)
        atlas.save(os.path.join(outdir, f'{name}.png'))
        meta['characters'][name] = {
            'image': f'assets/sprites/{name}.png',
            'portrait': f'assets/sprites/{name}_retrato.png' if port else None,
            'cell': [cw, ch], 'columns': cols, 'frames': len(frames),
            'animations': anim_meta,
        }
    for name, (sheet, box) in EFFECTS.items():
        pieces = extract(SHEETS[sheet], box, 1, single=False)
        if not pieces:
            print('efeito vazio', name); continue
        pieces[0]['img'].save(os.path.join(outdir, f'fx_{name}.png'))
        meta['effects'][name] = {'image': f'assets/sprites/fx_{name}.png',
                                 'size': list(pieces[0]['img'].size)}
    with open(os.path.join(outdir, 'atlas.json'), 'w') as f:
        json.dump(meta, f, indent=1)
    # versao JS para funcionar tambem abrindo o index.html direto (file://)
    with open(os.path.join(ROOT, 'src/data/atlas.js'), 'w') as f:
        f.write('// Gerado por tools/build_sprites.py - nao editar a mao\n')
        f.write('(globalThis.PF = globalThis.PF || {}).ATLAS = ' + json.dumps(meta) + ';\n')
    return meta

if __name__ == '__main__':
    os.makedirs(os.path.join(ROOT, 'src/data'), exist_ok=True)
    m = build(os.path.join(ROOT, 'assets/sprites'))
    for k, v in m['characters'].items():
        print(k, v['cell'], {a: len(f) for a, f in v['animations'].items()})
