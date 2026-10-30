/*
 * Aurora Travel: interações da versão HTML pura (sem React).
 * Os dados (DADOS) e os ícones (ICONES) são inseridos pelo gerador: scripts/html-puro.mjs.
 */
(() => {
  const { site, destinos, experiencias } = DADOS;
  const $ = (sel, el = document) => el.querySelector(sel);
  const $$ = (sel, el = document) => [...el.querySelectorAll(sel)];
  const reduzMovimento = () => matchMedia("(prefers-reduced-motion: reduce)").matches;
  const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]);
  const icone = (nome, classe, traco = 2) =>
    ICONES[nome].replace("<svg", `<svg class="${classe}" stroke-width="${traco}" aria-hidden="true"`);

  // mesmas classes dos botões do projeto Next.js (src/components/ui/button.ts)
  const variantes = {
    gold: "bg-gold text-navy hover:bg-[#d4b783]",
    light: "border border-white/60 text-white hover:bg-white hover:text-navy",
    navy: "bg-navy text-white hover:bg-navy-700",
    outline: "border border-navy/25 text-navy hover:border-navy hover:bg-navy hover:text-white",
  };
  const botao = (v, extra = "") =>
    `group inline-flex items-center justify-center gap-3 rounded-full min-h-13 px-7 text-[0.78rem] font-semibold uppercase tracking-[0.16em] transition-[background-color,color,border-color,transform] duration-500 ease-aurora active:scale-[0.98] ${variantes[v]} ${extra}`;
  const seta = "size-4 shrink-0 transition-transform duration-500 ease-aurora group-hover:translate-x-1";

  const whatsapp = (texto) => `https://wa.me/${site.whatsapp.replace(/\D/g, "")}?text=${encodeURIComponent(texto)}`;

  function rolarAte(alvo) {
    const el = typeof alvo === "string" ? document.querySelector(alvo) : alvo;
    el?.scrollIntoView({ behavior: reduzMovimento() ? "auto" : "smooth" });
  }

  /* ============ FOTOS: se não carregar, entra o degradê da marca ============ */
  const fundoFoto =
    "absolute inset-0 block bg-navy bg-[radial-gradient(120%_80%_at_20%_0%,rgb(220_234_245/0.35),transparent_60%),radial-gradient(90%_70%_at_100%_100%,rgb(197_164_109/0.35),transparent_60%)]";
  function trocarPorFundo(img) {
    if (!img.isConnected) return;
    const fundo = document.createElement("span");
    fundo.setAttribute("role", "img");
    fundo.setAttribute("aria-label", img.alt);
    const extra = img.className.replace(/\b(absolute|inset-0|h-full|w-full|object-cover)\b/g, "");
    fundo.className = `${fundoFoto} ${extra}`;
    img.replaceWith(fundo);
  }
  function vigiarFoto(img) {
    if (img.complete && img.naturalWidth === 0) trocarPorFundo(img);
    else img.addEventListener("error", () => trocarPorFundo(img), { once: true });
  }
  $$("img").forEach(vigiarFoto);

  /* ============ ENTRADAS AO ROLAR ============ */
  const revelar = (el) => el.setAttribute("data-shown", "");
  if ("IntersectionObserver" in window) {
    const io = new IntersectionObserver(
      (entradas) => entradas.forEach((e) => e.isIntersecting && (revelar(e.target), io.unobserve(e.target))),
      { rootMargin: "0px 0px -10% 0px" },
    );
    $$("[data-reveal]").forEach((el) => io.observe(el));
  } else {
    $$("[data-reveal]").forEach(revelar);
  }

  /* ============ TOPO E MENU DO CELULAR ============ */
  const topo = $("header");
  const ctaTopo = $('header a[href="#planejar"]');
  const botaoMenu = $('button[aria-controls="menu-celular"]');
  const menu = $("#menu-celular");
  let menuAberto = false;

  function pintarTopo() {
    const solido = scrollY > 24 && !menuAberto;
    topo.classList.toggle("text-white", !solido);
    "bg-white/95 text-navy shadow-[0_1px_0_rgb(16_29_44/0.08)] backdrop-blur-md".split(" ").forEach((c) => topo.classList.toggle(c, solido));
    // botão do topo: claro sobre a foto, azul-marinho com o topo sólido
    `${variantes.light} ${variantes.navy}`.split(" ").forEach((c) => ctaTopo.classList.remove(c));
    (solido ? variantes.navy : variantes.light).split(" ").forEach((c) => ctaTopo.classList.add(c));
  }
  addEventListener("scroll", pintarTopo, { passive: true });
  pintarTopo();

  function abrirMenu(abrir) {
    menuAberto = abrir;
    menu.hidden = !abrir;
    document.documentElement.classList.toggle("menu-open", abrir);
    botaoMenu.setAttribute("aria-expanded", String(abrir));
    botaoMenu.innerHTML = `<span class="sr-only">${abrir ? "Fechar menu" : "Abrir menu"}</span>${icone(abrir ? "x" : "menu", "size-6", 1.5)}`;
    pintarTopo();
    if (abrir) $("a", menu)?.focus();
  }
  botaoMenu.addEventListener("click", () => abrirMenu(!menuAberto));
  addEventListener("keydown", (e) => {
    if (e.key === "Escape" && menuAberto) {
      abrirMenu(false);
      botaoMenu.focus();
    }
  });
  addEventListener("resize", () => menuAberto && innerWidth >= 1024 && abrirMenu(false));
  // links do menu (e o logotipo, com o menu aberto): fecha o menu, que trava a rolagem, e só então rola
  [...$$("a[href^='#']", menu), $("header a[href='#inicio']")].forEach((a) =>
    a.addEventListener("click", (e) => {
      if (!menuAberto) return;
      e.preventDefault();
      abrirMenu(false);
      setTimeout(() => {
        rolarAte(a.hash);
        history.pushState(null, "", a.hash);
      }, 0);
    }),
  );

  /* ============ JANELAS (diálogos) ============ */
  function abrirJanela(html, tamanho, tituloId) {
    const janela = document.createElement("dialog");
    janela.className = `aurora-dialog m-0 h-dvh w-full overflow-y-auto overscroll-contain bg-white p-0 text-navy sm:m-auto sm:h-auto sm:max-h-[min(92dvh,56rem)] ${
      tamanho === "lg" ? "sm:w-[min(92vw,62rem)]" : "sm:w-[min(92vw,38rem)]"
    }`;
    janela.setAttribute("aria-labelledby", tituloId);
    janela.innerHTML = html;
    janela.addEventListener("click", (e) => e.target === janela && janela.close());
    janela.addEventListener("close", () => janela.remove());
    $$("[data-fechar]", janela).forEach((b) => b.addEventListener("click", () => janela.close()));
    document.body.append(janela);
    janela.showModal();
    return janela;
  }
  const botaoFechar = `<button type="button" data-fechar class="absolute right-3 top-3 inline-flex size-12 items-center justify-center rounded-full text-navy transition-colors hover:bg-mist">${icone("x", "size-5", 1.5)}<span class="sr-only">Fechar</span></button>`;

  /* ============ DESTINOS ============ */
  $$("#destinos article").forEach((cartao, i) => {
    const d = destinos[i];
    $$("button", cartao).forEach((b) => b.addEventListener("click", () => abrirDestino(d, cartao)));
  });

  function abrirDestino(d, cartao) {
    const fatos = [
      ["calendar-days", "Melhor época", d.bestTime],
      ["heart", "Ideal para", d.idealFor],
      ["clock-3", "Duração sugerida", d.duration],
    ];
    const janela = abrirJanela(
      `<div class="grid min-h-full sm:grid-cols-2">
        <div class="relative min-h-[42vh] sm:min-h-[34rem]" data-foto>
          <div class="absolute inset-0 bg-gradient-to-t from-navy/70 via-transparent to-transparent"></div>
          <p class="eyebrow absolute bottom-5 left-5 flex items-center gap-2 text-white">${icone("map-pin", "size-3.5")} ${esc(d.coordinates)}</p>
        </div>
        <div class="relative flex flex-col p-6 pb-8 sm:p-10">
          ${botaoFechar}
          <p class="eyebrow text-gold-ink">${esc(d.region)}</p>
          <h3 id="destino-dialog-title" class="mt-3 pr-10 font-display text-[clamp(2.6rem,6vw,3.75rem)] leading-[0.95]">${esc(d.name)}</h3>
          <p class="mt-2 font-display text-2xl italic text-navy/75">${esc(d.tagline)}</p>
          <p class="mt-6 leading-relaxed text-navy/75">${esc(d.story)}</p>
          <dl class="mt-8 divide-y divide-navy/10 border-y border-navy/10">
            ${fatos
              .map(
                ([ic, rotulo, valor]) => `<div class="flex items-start gap-4 py-4">
                  ${icone(ic, "mt-0.5 size-4 shrink-0 text-gold-ink", 1.5)}
                  <dt class="eyebrow w-32 shrink-0 pt-0.5 text-navy/60">${rotulo}</dt>
                  <dd class="text-sm leading-relaxed">${esc(valor)}</dd>
                </div>`,
              )
              .join("")}
          </dl>
          <p class="mt-6 text-xs leading-relaxed text-navy/60">Valores, disponibilidade e condições são apresentados depois da solicitação de planejamento.</p>
          <div class="mt-auto flex flex-col gap-3 pt-8">
            <a href="#planejar" data-planejar class="${botao("navy")}">Planejar viagem para ${esc(d.name)} ${icone("arrow-right", seta)}</a>
          </div>
        </div>
      </div>`,
      "lg",
      "destino-dialog-title",
    );
    // a foto da janela é a mesma do cartão
    const foto = $(".aspect-\\[4\\/5\\] img, .aspect-\\[4\\/5\\] [role=img]", cartao)?.cloneNode(true);
    if (foto) {
      foto.className = foto.className.replace(/\btransition-transform\S*|duration-\S+|ease-aurora|group-hover:\S+/g, "");
      if (foto.tagName === "IMG") {
        foto.sizes = "(min-width: 640px) 46vw, 100vw";
        foto.loading = "eager";
        vigiarFoto(foto);
      }
      $("[data-foto]", janela).prepend(foto);
    }
    $("[data-planejar]", janela).addEventListener("click", (e) => {
      e.preventDefault();
      janela.close();
      planejar({ destino: d.name });
    });
  }

  /* ============ EXPERIÊNCIAS ============ */
  $$('#experiencias a[href="#planejar"]').forEach((a, i) =>
    a.addEventListener("click", (e) => {
      e.preventDefault();
      planejar({ tipo: experiencias[i].tripType });
    }),
  );

  /* ============ PLANEJADOR ============ */
  const form = $("#planejar form");
  const campo = (nome) => form.elements[nome];
  const status = $("#planner-status");
  const ordem = ["destino", "origem", "ida", "volta", "viajantes", "tipo", "orcamento"];
  const erros = {};
  const MAX = 20;

  const hoje = () => {
    const d = new Date();
    return new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 10);
  };
  campo("ida").min = hoje();
  campo("volta").min = hoje();

  const valores = () => Object.fromEntries(ordem.map((n) => [n, campo(n).value]));
  const opcoes = (nome) => [...campo(nome).options].map((o) => o.value).filter(Boolean);

  function validar(nome, v) {
    switch (nome) {
      case "destino":
        return v.destino.trim().length < 2 ? "Informe o destino desejado." : "";
      case "origem":
        return v.origem.trim().length < 2 ? "Informe a cidade de onde você vai sair." : "";
      case "ida":
        if (!v.ida) return "Escolha a data de ida.";
        return v.ida < hoje() ? "A data de ida precisa ser hoje ou depois." : "";
      case "volta":
        if (!v.volta) return "Escolha a data de volta.";
        return v.ida && v.volta <= v.ida ? "A volta precisa ser depois da data de ida." : "";
      case "viajantes": {
        const n = Number(v.viajantes);
        return Number.isInteger(n) && n >= 1 && n <= MAX ? "" : `Informe de 1 a ${MAX} viajantes.`;
      }
      case "tipo":
        return opcoes("tipo").includes(v.tipo) ? "" : "Escolha o tipo de viagem.";
      case "orcamento":
        return opcoes("orcamento").includes(v.orcamento) ? "" : "Escolha uma faixa de orçamento.";
    }
  }

  const semErro = ["border-navy/20", "hover:border-navy/45", "focus:border-navy"];
  function mostrarErro(nome, msg) {
    erros[nome] = msg;
    const el = campo(nome);
    const caixa = $(`label[for="${el.id}"]`).parentElement;
    const idErro = `${el.id}-erro`;
    document.getElementById(idErro)?.remove();
    el.setAttribute("aria-invalid", String(Boolean(msg)));
    el.classList.toggle("border-danger", Boolean(msg));
    semErro.forEach((c) => el.classList.toggle(c, !msg));
    if (msg) {
      el.setAttribute("aria-describedby", idErro);
      caixa.insertAdjacentHTML(
        "beforeend",
        `<p id="${idErro}" class="mt-2 flex items-center gap-1.5 text-sm text-danger">${icone("circle-alert", "size-4 shrink-0", 1.75)}${esc(msg)}</p>`,
      );
    } else {
      el.removeAttribute("aria-describedby");
    }
  }
  function aviso(texto, tom) {
    status.textContent = texto;
    status.classList.toggle("text-danger", tom === "erro");
    status.classList.toggle("text-gold-ink", tom !== "erro");
  }

  ordem.forEach((nome) => {
    const el = campo(nome);
    el.addEventListener(el.tagName === "SELECT" ? "change" : "input", () => {
      if (el.tagName === "SELECT") el.classList.toggle("text-navy/45", !el.value);
      if (nome === "ida") campo("volta").min = el.value || hoje();
      if (nome === "viajantes") atualizarContador();
      const v = valores();
      if (erros[nome]) mostrarErro(nome, validar(nome, v));
      if (nome === "ida" && erros.volta) mostrarErro("volta", validar("volta", v));
    });
    el.addEventListener("blur", () => {
      if (!el.value && nome !== "viajantes") return; // não acusa erro em campo que a pessoa só atravessou
      mostrarErro(nome, validar(nome, valores()));
    });
  });

  // contador de viajantes (− 2 +)
  const [menos, mais] = $$("button", campo("viajantes").parentElement);
  function atualizarContador() {
    const n = Number(campo("viajantes").value) || 0;
    menos.disabled = n <= 1;
    mais.disabled = n >= MAX;
  }
  [[menos, -1], [mais, 1]].forEach(([b, passo]) =>
    b.addEventListener("click", () => {
      const n = Number(campo("viajantes").value) || 0;
      campo("viajantes").value = Math.min(MAX, Math.max(1, n + passo));
      campo("viajantes").dispatchEvent(new Event("input"));
    }),
  );
  atualizarContador();

  function planejar({ destino, tipo }) {
    if (destino) {
      campo("destino").value = destino;
      mostrarErro("destino", "");
      aviso(`Destino preenchido: ${destino}.`, "info");
    }
    if (tipo) {
      campo("tipo").value = tipo;
      campo("tipo").classList.remove("text-navy/45");
      mostrarErro("tipo", "");
      aviso(`Tipo de viagem preenchido: ${tipo}.`, "info");
    }
    setTimeout(() => rolarAte("#planejar"), 60);
  }

  form.addEventListener("submit", (e) => {
    e.preventDefault();
    const v = valores();
    const invalidos = ordem.filter((n) => {
      const msg = validar(n, v);
      mostrarErro(n, msg);
      return msg;
    });
    if (invalidos.length) {
      aviso(invalidos.length === 1 ? "Falta corrigir 1 campo." : `Faltam corrigir ${invalidos.length} campos.`, "erro");
      campo(invalidos[0]).focus();
      return;
    }
    aviso("", "info");
    abrirResumo(v);
  });

  const data = (iso) => iso.split("-").reverse().join("/");
  function linhas(v) {
    const noites = Math.round((new Date(v.volta + "T12:00:00") - new Date(v.ida + "T12:00:00")) / 864e5);
    const pessoas = Number(v.viajantes);
    return [
      ["Destino", v.destino.trim()],
      ["Saindo de", v.origem.trim()],
      ["Ida", data(v.ida)],
      ["Volta", `${data(v.volta)} · ${noites} ${noites === 1 ? "noite" : "noites"}`],
      ["Viajantes", `${pessoas} ${pessoas === 1 ? "pessoa" : "pessoas"}`],
      ["Tipo de viagem", v.tipo],
      ["Orçamento", v.orcamento],
    ];
  }

  function abrirResumo(v) {
    const mensagem = [
      `Olá, ${site.name}! Gostaria de solicitar o planejamento de uma viagem.`,
      "",
      ...linhas(v).map(([r, val]) => `*${r}:* ${val}`),
      "",
      "_Solicitação de planejamento enviada pelo site. Ainda não é uma reserva._",
    ].join("\n");
    const demo = site.isDemo && !site.whatsapp;
    const janela = abrirJanela(
      `<div class="relative flex min-h-full flex-col p-6 pb-8 sm:p-10">
        ${botaoFechar}
        <p class="eyebrow text-gold-ink">Quase lá</p>
        <h3 id="resumo-title" class="mt-3 pr-10 font-display text-[clamp(2.3rem,6vw,3.25rem)] leading-[0.95]">Resumo da sua solicitação</h3>
        <dl class="mt-8 divide-y divide-navy/10 border-y border-navy/10">
          ${linhas(v)
            .map(
              ([r, val]) => `<div class="grid grid-cols-[8.5rem_1fr] gap-4 py-3.5 text-sm sm:grid-cols-[10rem_1fr]">
                <dt class="eyebrow pt-0.5 text-navy/55">${r}</dt><dd class="font-medium">${esc(val)}</dd></div>`,
            )
            .join("")}
        </dl>
        <p class="mt-6 bg-sky/60 p-4 text-sm leading-relaxed text-navy/80">Esta é apenas uma <strong>solicitação de planejamento</strong>. Nenhuma passagem, hospedagem ou reserva é confirmada neste envio; valores e disponibilidade são apresentados depois, por um especialista.</p>
        ${demo ? '<p class="mt-3 text-xs leading-relaxed text-navy/60">Demonstração: nenhum número real está configurado. O WhatsApp abre com a mensagem pronta e você escolhe o contato.</p>' : ""}
        <div class="mt-auto grid gap-3 pt-8 sm:grid-cols-2">
          <a href="${whatsapp(mensagem)}" target="_blank" rel="noopener noreferrer" data-enviar class="${botao("navy", "sm:order-2")}">Enviar pelo WhatsApp ${icone("arrow-up-right", seta)}</a>
          <button type="button" data-fechar class="${botao("outline", "sm:order-1")}">Editar informações</button>
        </div>
        <p role="status" class="mt-4 min-h-5 text-center text-sm text-gold-ink"></p>
      </div>`,
      "md",
      "resumo-title",
    );
    $("[data-enviar]", janela).addEventListener("click", () => {
      $("[role=status]", janela).textContent = "Abrimos o WhatsApp com sua solicitação. É só tocar em enviar por lá.";
    });
  }

  /* ============ PERGUNTAS FREQUENTES ============ */
  const perguntas = $$("#faq button[aria-expanded]");
  function abrirPergunta(botaoAlvo) {
    perguntas.forEach((b) => {
      const aberta = b === botaoAlvo && b.getAttribute("aria-expanded") !== "true";
      const painel = document.getElementById(b.getAttribute("aria-controls"));
      b.setAttribute("aria-expanded", String(aberta));
      painel.inert = !aberta;
      painel.classList.toggle("grid-rows-[1fr]", aberta);
      painel.classList.toggle("opacity-100", aberta);
      painel.classList.toggle("grid-rows-[0fr]", !aberta);
      painel.classList.toggle("opacity-0", !aberta);
      $("svg", b).classList.toggle("rotate-45", aberta);
    });
  }
  perguntas.forEach((b) => b.addEventListener("click", () => abrirPergunta(b)));

  /* ============ DESTAQUE: a foto panorâmica se abre ao rolar ============ */
  const destaque = $('section[aria-labelledby="destaque-title"]');
  if (destaque && !reduzMovimento()) {
    let quadro = 0;
    const atualizar = () => {
      quadro = 0;
      const topoSecao = destaque.getBoundingClientRect().top;
      const p = Math.min(1, Math.max(0, (innerHeight - topoSecao) / (innerHeight * 0.85)));
      destaque.style.setProperty("--p", p.toFixed(3));
    };
    const pedir = () => (quadro ||= requestAnimationFrame(atualizar));
    addEventListener("scroll", pedir, { passive: true });
    addEventListener("resize", pedir);
    atualizar();
  }
})();
