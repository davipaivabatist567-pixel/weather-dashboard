#!/usr/bin/env python3
"""Gera o cardápio-modelo (sem dados de nenhuma casa real) a partir do layout do Bruthus.

Uso:  python3 tools/gerar-modelo-hamburgueria.py bruthus-burger/index.html hamburgueria-modelo/index.html
"""
import re, sys
from urllib.parse import quote
src, dest = sys.argv[1], sys.argv[2]
h = open(src, encoding='utf-8').read()
NAME = 'Chapa Burger'

def wa(text):
    return 'https://wa.me/?text=' + quote(text, safe='')

def order(name, price):
    href = wa(f'Olá! Quero pedir 1x {name}. Vim pelo cardápio digital.')
    return f'<div class="order" data-item="{name}" data-price="{price}"><a class="add" href="{href}" target="_blank" rel="noopener">Pedir no WhatsApp ↗</a></div>'

def money(p):
    return f'R$ {p}' if isinstance(p, int) else 'R$ ' + f'{p:.2f}'.replace('.', ',')

def big(img, w, hgt, x, name, price, desc, alt):
    return f'''        <li class="item">
          <figure class="ph"><img src="img/{img}.webp" alt="{alt}" width="{w}" height="{hgt}" loading="lazy"><span class="x display" aria-hidden="true">{x}</span></figure>
          <h3 class="item-name display"><span class="mask"><span>{name}</span></span></h3>
          <p class="price">{money(price)}</p>
          <p class="desc">{desc}</p>
          {order(name, price)}
        </li>'''

def row(name, price, desc):
    return f'''        <li class="row">
          <h3 class="row-name display">{name}</h3>
          <p class="price">{money(price)}</p>
          <p class="desc">{desc}</p>
          {order(name, price)}
        </li>'''

def section(sid, tid, kicker, words, note, rows):
    title = ''.join(f'<span class="mask"><span>{w}</span></span>' for w in words)
    return f'''  <section class="menu t-bone" id="{sid}" aria-labelledby="{tid}">
    <div class="menu-head">
      <p class="kicker">{kicker}</p>
      <h2 class="menu-title display reveal" id="{tid}">{title}</h2>
      <p class="menu-note">{note}</p>
    </div>
    <ul class="rows">
{chr(10).join(row(*r) for r in rows)}
    </ul>
  </section>'''

burgers = f'''  <!--
    ============ CARDÁPIO ============
    Modelo: nome, produtos e preços são FICTÍCIOS. Para usar com um cliente, troque pelos dados da casa.
    Cada produto é um <li class="item"> (com foto) ou <li class="row"> (lista).
    O botão de pedido usa data-item (nome) e data-price (preço em reais).
  -->
  <section class="menu t-bone" id="burgers" aria-labelledby="t-peso">
    <div class="menu-head">
      <p class="kicker">01 — Burgers da casa</p>
      <h2 class="menu-title display reveal" id="t-peso"><span class="mask"><span>Escolha</span></span><span class="mask"><span>o peso.</span></span></h2>
      <p class="menu-note">Pão brioche selado na chapa e blend de 150 g. Toque em <strong>+ Adicionar</strong> e monte seu pedido.</p>
    </div>
    <ul class="items">
{big('simples', 712, 617, '1×', 'Clássico', 22, '1 carne de 150 g, cheddar e maionese da casa.', 'Burger Clássico, 1 carne com cheddar')}
{big('duplo', 717, 646, '2×', 'Duplo Bacon', 29, '2 carnes, cheddar em dobro e bacon crocante.', 'Burger Duplo Bacon, 2 carnes com cheddar')}
{big('triplo', 653, 661, '3×', 'Triplo', 35, '3 carnes, cheddar e cebola caramelizada.', 'Burger Triplo, 3 carnes com cheddar')}
{big('bruto', 593, 665, '4×', 'Monstro', 42, '4 carnes, cheddar, bacon e molho especial. Pra quem aguenta.', 'Burger Monstro, 4 carnes com cheddar')}
    </ul>
  </section>

{section('smash', 't-smash', '02 — Smash, frango e kids', ['Na', 'chapa.'], 'Carne prensada na chapa até a borda ficar crocante.', [
    ('Smash Simples', 18, '1 smash de 80 g, cheddar e picles.'),
    ('Smash Duplo', 24, '2 smash de 80 g, cheddar em dobro e cebola na chapa.'),
    ('Salada', 24, 'Carne, queijo, alface, tomate e cebola roxa.'),
    ('Frango Crispy', 26, 'Frango empanado crocante, alface e maionese verde.'),
    ('Kids', 16, 'Burger pequeno com queijo. Pra criançada.'),
])}
'''

rest = f'''{section('combos', 't-combos', '03 — Combos', ['Combos'], 'Burger, batata e refri num preço só.', [
    ('Combo Smash', 30, 'Smash Duplo + batata P + refri lata.'),
    ('Combo Clássico', 34, 'Clássico + batata P + refri lata.'),
    ('Combo Duplo Bacon', 40, 'Duplo Bacon + batata P + refri lata.'),
    ('Combo Casal', 69, '2 Clássicos + batata M + 2 refris lata.'),
    ('Combo Família', 119, '4 burgers Clássico + 2 batatas M + refri 2 L.'),
])}

{section('porcoes', 't-porcoes', '04 — Porções', ['Pra', 'dividir.'], 'Pra pedir junto com o burger ou dividir na mesa.', [
    ('Batata P', 14, 'Batata frita sequinha, 150 g.'),
    ('Batata M', 19, 'Batata frita, 300 g. Dá pra dividir.'),
    ('Batata Cheddar e Bacon', 26, 'Batata M coberta de cheddar cremoso e bacon.'),
    ('Onion Rings', 22, 'Anéis de cebola empanados, 12 unidades.'),
    ('Nuggets', 18, '10 unidades com molho à escolha.'),
])}

{section('bebidas', 't-bebidas', '05 — Bebidas e sobremesas', ['Pra', 'fechar.'], 'Gelada pra acompanhar e um doce no final.', [
    ('Refri lata', 6, '350 ml. Pergunte os sabores.'),
    ('Refri 1 L', 10, 'Pergunte os sabores.'),
    ('Refri 2 L', 14, 'Pergunte os sabores.'),
    ('Suco natural', 9, '500 ml. Laranja, maracujá ou acerola.'),
    ('Água', 4, '500 ml, com ou sem gás.'),
    ('Milkshake', 16, '400 ml. Chocolate, morango ou ninho.'),
    ('Brownie', 12, 'Brownie de chocolate com calda.'),
])}
'''

# --- cardápio: troca o bloco inteiro (burgers + acompanhamentos) e acrescenta as outras seções depois da faixa
a = h.index('  <!--\n    ============ CARDÁPIO')
b = h.index('  <!-- ============ FAIXA DE CONTRASTE')
h = h[:a] + burgers + '\n' + h[b:]
h = h.replace('  </section>\n</main>', '  </section>\n\n' + rest + '</main>', 1)

# --- faixa
star = '<svg class="star" viewBox="0 0 20 20"><path d="M10 0L12.6 7.4L20 10L12.6 12.6L10 20L7.4 12.6L0 10L7.4 7.4Z"/></svg>'
h = h.replace('aria-label="Genuinamente piauiense"', 'aria-label="Feito na chapa"')
h = h.replace('<span>Genuinamente piauiense</span>', '<span>Feito na chapa</span>').replace('<span>Parnaíba</span>', '<span>Artesanal</span>')
for old, new in [('Simples', 'Clássico'), ('Duplo', 'Duplo Bacon'), ('Triplo', 'Triplo'), ('Bruto', 'Monstro')]:
    h = h.replace(f'<span>{old}</span>{star}', f'<span>{new}</span>{star}').replace(f'<span>{old}</span>\n      </div>', f'<span>{new}</span>\n      </div>')

# --- topo, hero e marca
h = h.replace('<title>Cardápio Bruthus Burger</title>', f'<title>Cardápio {NAME}</title>')
h = re.sub(r'<meta name="description" content="[^"]*">', f'<meta name="description" content="Modelo de cardápio digital para hamburgueria: burger que se abre em camadas e pedido pelo WhatsApp.">', h)
h = h.replace('Proposta · cardápio digital demo', 'Modelo · cardápio digital interativo')
h = h.replace('href="#hero">Bruthus Burger</a>', f'href="#hero">{NAME}</a>')
h = h.replace('Hamburgueria genuinamente piauiense', 'Hamburgueria artesanal')
h = h.replace('aria-label="Bruthus Burger"', f'aria-label="{NAME}"')
h = h.replace('<span class="mask word"><span>Bruthus</span></span>', '<span class="mask word"><span>Chapa</span></span>')

# --- rodapé
h = h.replace('Quarta a segunda · 18h às 23h', 'Todos os dias · 18h às 23h')
h = h.replace('<span class="mask"><span>de bruto?</span></span>', '<span class="mask"><span>de burger?</span></span>')
h = re.sub(r'\n\s*<a class="alt" href="https://www\.ifood[^\n]*', '', h)
info = '''  <dl class="info">
    <div><dt class="kicker">Endereço</dt><dd>Rua Exemplo, 123<br>Centro · Sua cidade</dd></div>
    <div><dt class="kicker">Horário</dt><dd>Todos os dias<br>18h às 23h</dd></div>
    <div><dt class="kicker">WhatsApp</dt><dd>(00) 00000-0000</dd></div>
    <div><dt class="kicker">Instagram</dt><dd>@suahamburgueria</dd></div>
  </dl>'''
h = re.sub(r'  <dl class="info">.*?</dl>', info, h, flags=re.S)
h = h.replace('<p class="wordmark display" aria-hidden="true">Bruthus</p>', '<p class="wordmark display" aria-hidden="true">Chapa</p>')
h = re.sub(r'<p class="fine">.*?</p>', '<p class="fine">Modelo de cardápio digital. Nome, produtos, preços, endereço e contatos são fictícios.</p>', h)

# --- WhatsApp: sem número, o WhatsApp abre com a mensagem pronta e a pessoa escolhe o contato
h = h.replace("const WHATS = '5586994552629';", "const WHATS = ''; // número da casa com DDI e DDD, só dígitos, ex.: '55' + DDD + número. Vazio = o WhatsApp pergunta para quem enviar")
h = h.replace('https://wa.me/5586994552629?text=', 'https://wa.me/?text=')
h = h.replace("'*Pedido – Bruthus Burger* 🍔'", f"'*Pedido – {NAME}* 🍔'")

# --- marca do rodapé: o divisor depende da largura da palavra (CHAPA ≈ 2,37 × o tamanho da fonte)
h = h.replace('/ 3.36)', '/ 2.42)')
assert '3.36' not in h

# --- estilo da lista compacta
css = '''  .rows { list-style: none; }
  .row {
    display: grid; grid-template-columns: 1fr auto; column-gap: var(--s-2); align-items: end;
    padding-block: var(--s-2) var(--s-3); border-top: 2px solid var(--line);
  }
  .row:last-child { border-bottom: 2px solid var(--line); }
  .row-name { font-size: clamp(1.9rem, 7.5vw, 3.25rem); line-height: .9; }
  .row .desc, .row .order { grid-column: 1 / -1; }
  .row .desc { margin-top: .4rem; }
  .row .order { margin-top: var(--s-1); }
  .row .order .add { box-shadow: 3px 3px 0 var(--red); }
  @media (max-width: 380px) { .item { --ph: 6rem; } .item-name { font-size: 2.1rem; } }
  .menu + .menu { padding-top: 0; }
  @media (min-width: 900px) { .menu + .menu { padding-top: var(--s-4); } }

  /* ============ FAIXA ============ */'''
h = h.replace('  /* ============ FAIXA ============ */', css, 1)

# --- animação: as linhas da lista também entram
h = h.replace("""  // ---------- faixa: as palavras correm com o scroll ----------""", """  gsap.utils.toArray('.row').forEach(row => {
    gsap.from(row.children, { opacity: 0, y: 16, duration: .6, ease: 'power3.out', stagger: .06, scrollTrigger: { trigger: row, start: 'top 90%' } });
  });

  // ---------- faixa: as palavras correm com o scroll ----------""")

for bad in ['Bruthus', 'bruthus', '99455', '5586', 'ifood', 'instagram.com', 'São Sebastião', 'piauiense', 'Parnaíba']:
    assert bad not in h, (bad, [l for l in h.splitlines() if bad in l][:3])
open(dest, 'w', encoding='utf-8').write(h)
print('ok')
