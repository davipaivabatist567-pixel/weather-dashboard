#!/usr/bin/env python3
"""Gera a versão "arquivo único" de cada cardápio: bibliotecas, fontes e imagens embutidas no HTML.

O arquivo gerado abre em qualquer lugar (navegador do celular, anexo do WhatsApp,
sem internet) com as animações e as fontes certas.

Uso:  python3 tools/gerar-html-unico.py vila-burguer baru-burgers sorveteria-araujo bruthus-burger
Saída: html-unico/cardapio-<pasta>.html
"""
import base64
import io
import mimetypes
import re
import sys
import tarfile
import urllib.request
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
OUT = ROOT / 'html-unico'
# Com um navegador moderno no User-Agent, o Google Fonts responde com arquivos woff2
UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36'
_cache = {}


def fetch(url):
    if url not in _cache:
        req = urllib.request.Request(url, headers={'User-Agent': UA})
        with urllib.request.urlopen(req, timeout=60) as resp:
            _cache[url] = resp.read()
    return _cache[url]


def npm_file(pkg, ver, path):
    tgz = fetch(f'https://registry.npmjs.org/{pkg}/-/{pkg}-{ver}.tgz')
    with tarfile.open(fileobj=io.BytesIO(tgz)) as tar:
        return tar.extractfile(f'package/{path}').read().decode('utf-8')


def inline_fonts(match):
    css = fetch(match.group(1)).decode('utf-8')
    faces = {}  # url -> (bloco, pesos): fontes variáveis repetem o mesmo arquivo para cada peso
    for subset, block in re.findall(r'/\* (\S+) \*/\s*(@font-face\s*\{[^}]*\})', css):
        if subset != 'latin':  # todos os acentos do português estão no subconjunto "latin"
            continue
        url = re.search(r'url\((https://[^)]+)\)', block).group(1)
        weight = int(re.search(r'font-weight:\s*(\d+)', block).group(1))
        faces.setdefault(url, (block, []))[1].append(weight)
    out = []
    for url, (block, weights) in faces.items():
        data = base64.b64encode(fetch(url)).decode('ascii')
        block = re.sub(r'font-weight:\s*\d+', f'font-weight: {min(weights)} {max(weights)}', block)
        out.append(block.replace(url, f'data:font/woff2;base64,{data}'))
    return '<style>\n' + '\n'.join(out) + '\n</style>'


def inline_script(match):
    pkg, ver, path = match.groups()
    code = npm_file(pkg, ver, path)
    code = re.sub(r'//# sourceMappingURL=\S+', '', code).replace('</script', '<\\/script')
    return f'<script>/* {pkg}@{ver} */\n{code}\n</script>'


def inline_image(folder, match):
    path = ROOT / folder / match.group(2)
    mime = mimetypes.guess_type(path.name)[0] or ('image/webp' if path.suffix == '.webp' else 'application/octet-stream')
    return f'{match.group(1)}data:{mime};base64,{base64.b64encode(path.read_bytes()).decode("ascii")}"'


def build(folder):
    html = (ROOT / folder / 'index.html').read_text(encoding='utf-8')
    html = re.sub(r'(src=")(img/[^"]+)"', lambda m: inline_image(folder, m), html)
    html = re.sub(r'\s*<link rel="preconnect"[^>]*>', '', html)
    html = re.sub(r'<link href="(https://fonts\.googleapis\.com/[^"]+)" rel="stylesheet">', inline_fonts, html)
    html = re.sub(r'<script src="https://cdn\.jsdelivr\.net/npm/([^@"]+)@([^/"]+)/([^"]+)"></script>', inline_script, html)
    assert 'cdn.jsdelivr.net' not in html and 'fonts.googleapis.com' not in html and 'src="img/' not in html, folder
    OUT.mkdir(exist_ok=True)
    dest = OUT / f'cardapio-{folder}.html'
    dest.write_text(html, encoding='utf-8')
    print(f'{dest.relative_to(ROOT)}  {dest.stat().st_size / 1024:.0f} KB')


if __name__ == '__main__':
    if len(sys.argv) < 2:
        sys.exit(__doc__)
    for name in sys.argv[1:]:
        build(name)
