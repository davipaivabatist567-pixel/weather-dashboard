"""Gera um único arquivo HTML com CSS, JavaScript e sprites embutidos.

Uso: python3 tools/build_single_html.py
Saída: dist/aventura-do-pinguim.html (abre direto no navegador, inclusive no celular)
"""
import base64, json, os, re

ROOT = os.path.join(os.path.dirname(__file__), '..')

def read(p):
    with open(os.path.join(ROOT, p), encoding='utf-8') as f:
        return f.read()

def data_uri(p):
    with open(os.path.join(ROOT, p), 'rb') as f:
        return 'data:image/png;base64,' + base64.b64encode(f.read()).decode()

def main():
    html = read('index.html')
    atlas = json.loads(read('assets/sprites/atlas.json'))
    paths = []
    for c in atlas['characters'].values():
        paths.append(c['image'])
        if c.get('portrait'):
            paths.append(c['portrait'])
    for e in atlas['effects'].values():
        paths.append(e['image'])
    embedded = {p: data_uri(p) for p in paths}

    css = read('style.css')
    html = html.replace('<link rel="stylesheet" href="style.css">', '<style>\n' + css + '\n</style>')

    first = True
    def inline(m):
        nonlocal first
        js = read(m.group(1)).replace('</script', '<\\/script')
        out = ''
        if first:
            first = False
            out += '<script>(globalThis.PF = globalThis.PF || {}).EMBEDDED = ' + json.dumps(embedded) + ';</script>\n  '
        return out + '<script>\n/* ' + m.group(1) + ' */\n' + js + '\n</script>'
    html = re.sub(r'<script src="([^"]+)"></script>', inline, html)
    assert 'src="src/' not in html, 'script sem embutir'

    os.makedirs(os.path.join(ROOT, 'dist'), exist_ok=True)
    out = os.path.join(ROOT, 'dist', 'aventura-do-pinguim.html')
    with open(out, 'w', encoding='utf-8') as f:
        f.write(html)
    print('gerado', os.path.relpath(out, ROOT), f'{os.path.getsize(out) / 1024:.0f} KB')

if __name__ == '__main__':
    main()
