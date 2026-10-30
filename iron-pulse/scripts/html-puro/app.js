/*
 * Site da academia: interações da versão HTML pura (sem React).
 * DADOS e ICONES são inseridos pelo gerador (scripts/html-puro.mjs) a partir de src/config e src/data.
 */
(() => {
  const { site, modalidades, planos, privacidade } = DADOS;
  const $ = (sel, el = document) => el.querySelector(sel);
  const $$ = (sel, el = document) => [...el.querySelectorAll(sel)];
  const reduzMovimento = () => matchMedia("(prefers-reduced-motion: reduce)").matches;
  const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]);
  const icone = (nome, classe, traco = 2) => ICONES[nome].replace("<svg", `<svg class="${classe}" stroke-width="${traco}" aria-hidden="true"`);
  const whatsapp = (texto) => `https://wa.me/${site.whatsapp.replace(/\D/g, "")}?text=${encodeURIComponent(texto)}`;
  const rolarAte = (alvo) => document.querySelector(alvo)?.scrollIntoView({ behavior: reduzMovimento() ? "auto" : "smooth" });
  const alternar = (el, classes, ligar) => classes.split(" ").forEach((c) => el.classList.toggle(c, ligar));

  // mesmas classes do projeto Next.js (src/components/ui/button.ts)
  const corte = "[clip-path:polygon(0_0,100%_0,100%_calc(100%-10px),calc(100%-10px)_100%,0_100%)]";
  const variantes = {
    lime: `bg-lime text-ink hover:bg-white ${corte}`,
    ghost: "border border-white/30 text-white hover:border-lime hover:text-lime",
  };
  const botao = (v) =>
    `group relative inline-flex items-center justify-center gap-3 font-semibold uppercase min-h-13 px-7 text-[0.8rem] tracking-[0.14em] transition-[background-color,color,border-color,transform] duration-300 ease-pulse active:scale-[0.98] ${variantes[v]}`;

  /* ============ FOTOS: se não carregar, entra o fundo grafite ============ */
  const fundoFoto =
    "absolute inset-0 block bg-coal bg-[radial-gradient(90%_70%_at_80%_10%,rgb(198_255_0/0.12),transparent_60%),repeating-linear-gradient(135deg,rgb(255_255_255/0.035)_0_2px,transparent_2px_14px)]";
  function trocarPorFundo(img) {
    if (!img.isConnected) return;
    const fundo = document.createElement("span");
    fundo.setAttribute("role", "img");
    fundo.setAttribute("aria-label", img.alt);
    fundo.className = `${fundoFoto} ${img.className.replace(/\b(absolute|inset-0|h-full|w-full|object-cover)\b/g, "")}`;
    img.replaceWith(fundo);
  }
  $$("img").forEach((img) => {
    if (img.complete && img.naturalWidth === 0) trocarPorFundo(img);
    else img.addEventListener("error", () => trocarPorFundo(img), { once: true });
  });

  /* ============ ENTRADAS AO ROLAR ============ */
  const revelar = (el) => el.setAttribute("data-shown", "");
  if ("IntersectionObserver" in window) {
    const io = new IntersectionObserver(
      (es) => es.forEach((e) => e.isIntersecting && (revelar(e.target), io.unobserve(e.target))),
      { rootMargin: "0px 0px -10% 0px" },
    );
    $$("[data-reveal]").forEach((el) => io.observe(el));
  } else $$("[data-reveal]").forEach(revelar);

  /* ============ TOPO: fundo ao rolar, barra de progresso, seção atual ============ */
  const topo = $("header");
  const progresso = $("header > span[aria-hidden]");
  let menuAberto = false;
  let quadro = 0;
  function pintarTopo() {
    quadro = 0;
    const solido = scrollY > 24 || menuAberto;
    alternar(topo, "border-white/10 bg-ink/80 backdrop-blur-md", solido);
    topo.classList.toggle("border-transparent", !solido);
    const max = document.documentElement.scrollHeight - innerHeight;
    progresso.style.transform = `scaleX(${max > 0 ? scrollY / max : 0})`;
  }
  addEventListener("scroll", () => (quadro ||= requestAnimationFrame(pintarTopo)), { passive: true });
  addEventListener("resize", () => (quadro ||= requestAnimationFrame(pintarTopo)));
  pintarTopo();

  const linksMenu = $$('nav[aria-label="Principal"] a');
  if ("IntersectionObserver" in window) {
    const espiao = new IntersectionObserver(
      (es) =>
        es.forEach((e) => {
          if (!e.isIntersecting) return;
          linksMenu.forEach((a) => {
            const atual = a.hash === `#${e.target.id}`;
            if (atual) a.setAttribute("aria-current", "true");
            else a.removeAttribute("aria-current");
            a.classList.toggle("text-white", atual);
            a.classList.toggle("text-steel", !atual);
            alternar($("span", a), "opacity-100", atual);
            alternar($("span", a), "opacity-0", !atual);
          });
        }),
      { rootMargin: "-45% 0px -50% 0px" },
    );
    linksMenu.forEach((a) => document.querySelector(a.hash) && espiao.observe(document.querySelector(a.hash)));
  }

  /* ============ MENU DO CELULAR ============ */
  const botaoMenu = $('button[aria-controls="menu-celular"]');
  const menu = $("#menu-celular");
  function abrirMenu(abrir) {
    menuAberto = abrir;
    menu.hidden = !abrir;
    document.documentElement.classList.toggle("menu-open", abrir);
    botaoMenu.setAttribute("aria-expanded", String(abrir));
    botaoMenu.innerHTML = `<span class="sr-only">${abrir ? "Fechar menu" : "Abrir menu"}</span>${icone(abrir ? "x" : "menu", "size-6", 1.75)}`;
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

  /* ============ FOTOS DE FUNDO QUE ACOMPANHAM A ROLAGEM ============ */
  if (!reduzMovimento()) {
    $$(".will-change-transform").forEach((el, i) => {
      const forca = i === 0 ? 0.18 : 0.14; // abertura e seção motivacional
      const pai = el.parentElement;
      let q = 0;
      const mover = () => {
        q = 0;
        const r = pai.getBoundingClientRect();
        if (r.bottom < 0 || r.top > innerHeight) return;
        el.style.transform = `translate3d(0, ${((r.top + r.height / 2 - innerHeight / 2) * -forca).toFixed(1)}px, 0)`;
      };
      addEventListener("scroll", () => (q ||= requestAnimationFrame(mover)), { passive: true });
      mover();
    });
  }

  /* ============ JANELA (política de privacidade) ============ */
  function abrirPrivacidade() {
    const janela = document.createElement("dialog");
    janela.className =
      "pulse-dialog m-0 h-dvh w-full overflow-y-auto overscroll-contain border border-white/10 bg-coal p-0 text-white sm:m-auto sm:h-auto sm:max-h-[min(90dvh,52rem)] sm:w-[min(92vw,44rem)]";
    janela.setAttribute("aria-labelledby", "privacidade-title");
    janela.innerHTML = `<div class="relative p-6 pb-10 sm:p-10">
      <button type="button" data-fechar class="absolute right-3 top-3 inline-flex size-12 items-center justify-center text-white transition-colors hover:text-lime">${icone("x", "size-5")}<span class="sr-only">Fechar</span></button>
      <p class="tag text-lime">Seus dados</p>
      <h2 id="privacidade-title" class="display mt-3 pr-10 text-[2rem]">Política de privacidade</h2>
      ${privacidade.aviso ? `<p class="mt-4 border-l-2 border-lime pl-3 text-sm text-steel">${esc(privacidade.aviso)}</p>` : ""}
      <div class="mt-6 grid gap-5 text-[0.95rem] leading-relaxed text-steel">
        ${privacidade.secoes.map((s) => `<div><h3 class="font-semibold text-white">${esc(s.title)}</h3><p>${esc(s.text)}</p></div>`).join("")}
      </div>
    </div>`;
    janela.addEventListener("click", (e) => e.target === janela && janela.close());
    janela.addEventListener("close", () => janela.remove());
    $("[data-fechar]", janela).addEventListener("click", () => janela.close());
    document.body.append(janela);
    janela.showModal();
  }
  document.addEventListener("click", (e) => {
    const link = e.target.closest('a[href="#privacidade"]');
    if (!link) return;
    e.preventDefault();
    abrirPrivacidade();
  });

  /* ============ FORMULÁRIO DE MATRÍCULA ============ */
  const caixaForm = $("#matricula form").parentElement;
  const form = $("#matricula form");
  const campo = (n) => form.elements[n];
  const status = $("#matricula-status");
  const ordem = ["nome", "telefone", "email", "plano", "objetivo", "horario", "consentimento"];
  const erros = {};
  const opcoes = (n) => [...campo(n).options].map((o) => o.value).filter(Boolean);
  const valores = () => ({
    nome: campo("nome").value,
    telefone: campo("telefone").value,
    email: campo("email").value,
    plano: campo("plano").value,
    objetivo: campo("objetivo").value,
    horario: campo("horario").value,
    consentimento: campo("consentimento").checked,
  });

  function validar(n, v) {
    switch (n) {
      case "nome":
        if (!v.nome.trim()) return "Informe seu nome completo.";
        return v.nome.trim().split(/\s+/).filter((p) => p.length >= 2).length < 2 ? "Informe nome e sobrenome." : "";
      case "telefone": {
        const d = v.telefone.replace(/\D/g, "");
        if (!d) return "Informe um telefone ou WhatsApp.";
        return d.length === 10 || d.length === 11 ? "" : "Digite o número com DDD, por exemplo (11) 91234-5678.";
      }
      case "email":
        if (!v.email.trim()) return "";
        return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(v.email.trim()) ? "" : "Confira o e-mail (exemplo: nome@email.com).";
      case "plano":
        return opcoes("plano").includes(v.plano) ? "" : "Escolha um plano de interesse.";
      case "objetivo":
        return opcoes("objetivo").includes(v.objetivo) ? "" : "Escolha seu objetivo de treinamento.";
      case "horario":
        return opcoes("horario").includes(v.horario) ? "" : "Escolha o melhor horário para contato.";
      case "consentimento":
        return v.consentimento ? "" : "Para continuar, autorize o uso dos dados para contato.";
    }
  }

  function mostrarErro(n, msg) {
    erros[n] = msg;
    const el = campo(n);
    const caixa = $(`label[for="${el.id}"]`).parentElement;
    const idErro = `${el.id}-erro`;
    document.getElementById(idErro)?.remove();
    el.setAttribute("aria-invalid", String(Boolean(msg)));
    if (el.type !== "checkbox") {
      el.classList.toggle("border-danger", Boolean(msg));
      alternar(el, "border-white/15 hover:border-white/35 focus:border-lime", !msg);
    }
    if (msg) {
      el.setAttribute("aria-describedby", idErro);
      caixa.insertAdjacentHTML("beforeend", `<p id="${idErro}" class="mt-2 flex items-center gap-1.5 text-sm text-danger">${icone("circle-alert", "size-4 shrink-0")}${esc(msg)}</p>`);
    } else el.removeAttribute("aria-describedby");
  }
  function aviso(texto, tom) {
    status.textContent = texto;
    status.classList.toggle("text-danger", tom === "erro");
    status.classList.toggle("text-lime", tom !== "erro");
  }
  function corDoSelect(el) {
    el.classList.toggle("text-white", Boolean(el.value));
    el.classList.toggle("text-steel/70", !el.value);
  }

  // telefone: (00) 00000-0000 enquanto digita
  const mascara = (valor) => {
    const d = valor.replace(/\D/g, "").slice(0, 11);
    if (d.length <= 2) return d.length ? `(${d}` : "";
    if (d.length <= 6) return `(${d.slice(0, 2)}) ${d.slice(2)}`;
    if (d.length <= 10) return `(${d.slice(0, 2)}) ${d.slice(2, 6)}-${d.slice(6)}`;
    return `(${d.slice(0, 2)}) ${d.slice(2, 7)}-${d.slice(7)}`;
  };

  ordem.forEach((n) => {
    const el = campo(n);
    const evento = el.tagName === "SELECT" || el.type === "checkbox" ? "change" : "input";
    el.addEventListener(evento, () => {
      if (n === "telefone") el.value = mascara(el.value);
      if (el.tagName === "SELECT") corDoSelect(el);
      if (erros[n]) mostrarErro(n, validar(n, valores()));
    });
    el.addEventListener("blur", () => {
      const v = valores();
      if (!v[n]) return; // não acusa erro em campo que a pessoa só atravessou
      mostrarErro(n, validar(n, v));
    });
  });

  // "Quero conhecer" (modalidades) e "Quero o plano" (planos) preenchem o formulário
  function preencher(nome, valor, texto) {
    campo(nome).value = valor;
    corDoSelect(campo(nome));
    mostrarErro(nome, "");
    aviso(texto, "info");
    if (!form.isConnected) caixaForm.replaceChildren(form);
    setTimeout(() => rolarAte("#matricula"), 60);
  }
  $$('#modalidades a[href="#matricula"]').forEach((a, i) =>
    a.addEventListener("click", (e) => {
      e.preventDefault();
      preencher("objetivo", modalidades[i], `Objetivo escolhido: ${modalidades[i]}.`);
    }),
  );
  $$('#planos a[href="#matricula"]').forEach((a, i) =>
    a.addEventListener("click", (e) => {
      e.preventDefault();
      preencher("plano", planos[i], `Plano escolhido: ${planos[i]}.`);
    }),
  );

  const botaoEnviar = $('button[type="submit"]', form);
  const textoBotao = botaoEnviar.innerHTML;
  let enviando = false;

  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    if (enviando) return;
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
    if (!site.leadEndpoint) return mostrarResultado("local", v); // sem integração configurada: nada é enviado
    enviando = true;
    botaoEnviar.disabled = true;
    botaoEnviar.innerHTML = `Enviando ${icone("loader-circle", "size-4 animate-spin")}`;
    aviso("Enviando seus dados...", "info");
    try {
      const r = await fetch(site.leadEndpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json", Accept: "application/json" },
        body: JSON.stringify({
          nome: v.nome.trim(),
          telefone: v.telefone,
          email: v.email.trim() || null,
          plano: v.plano,
          objetivo: v.objetivo,
          horario: v.horario,
          consentimento: true,
          origem: "site",
          enviadoEm: new Date().toISOString(),
        }),
      });
      if (!r.ok) throw new Error(`HTTP ${r.status}`);
      mostrarResultado("sent", v);
    } catch {
      mostrarResultado("failed", v);
    } finally {
      enviando = false;
      botaoEnviar.disabled = false;
      botaoEnviar.innerHTML = textoBotao;
      aviso("", "info");
    }
  });

  function mensagem(v) {
    return [
      `${site.hello} Quero fazer minha matrícula.`,
      "",
      `*Nome:* ${v.nome.trim()}`,
      `*Telefone:* ${v.telefone}`,
      ...(v.email.trim() ? [`*E-mail:* ${v.email.trim()}`] : []),
      `*Plano de interesse:* ${v.plano}`,
      `*Objetivo:* ${v.objetivo}`,
      `*Melhor horário para contato:* ${v.horario}`,
    ].join("\n");
  }

  function mostrarResultado(tipo, v) {
    const nome = v.nome.trim().split(/\s+/)[0];
    const textos = {
      sent: [
        `Recebemos seus dados, ${nome}!`,
        `A equipe da ${site.brandRef} vai entrar em contato pelo número ${v.telefone}, no período escolhido (${v.horario.toLowerCase()}). Se preferir adiantar a conversa, chame no WhatsApp.`,
      ],
      local: [
        `Tudo certo com seus dados, ${nome}.`,
        "Este site ainda não está ligado a um sistema de recebimento de cadastros, então nada foi enviado a um servidor. Para falar com a equipe agora, continue pelo WhatsApp: a mensagem já vai preenchida com as suas informações.",
      ],
      failed: [
        "Não conseguimos enviar agora.",
        "Pode ser a conexão ou uma instabilidade no sistema de cadastro. Seus dados não se perderam: tente de novo ou continue pelo WhatsApp com a mensagem preenchida.",
      ],
    }[tipo];
    const enviado = tipo === "sent";
    const resultado = document.createElement("div");
    resultado.tabIndex = -1;
    resultado.setAttribute("role", "status");
    resultado.className = "focus:outline-none";
    resultado.innerHTML = `<div class="py-4">
      ${tipo === "failed" ? icone("circle-alert", "size-12 text-danger", 1.5) : icone("circle-check", "size-12 text-lime", 1.5)}
      <h3 class="display mt-6 text-[clamp(1.6rem,4vw,2.25rem)]">${esc(textos[0])}</h3>
      <p class="mt-4 max-w-xl leading-relaxed text-steel">${esc(textos[1])}</p>
      ${tipo === "local" && site.isDemo ? '<p class="tag mt-4 text-lime/80">Demonstração: o WhatsApp abre com a mensagem pronta e você escolhe o contato.</p>' : ""}
      <div class="mt-8 flex flex-col gap-3 sm:flex-row">
        <a href="${whatsapp(mensagem(v))}" target="_blank" rel="noopener noreferrer" class="${botao(enviado ? "ghost" : "lime")}">${icone("message-circle", "size-4")}${enviado ? "Falar no WhatsApp" : "Continuar pelo WhatsApp"}</a>
        <button type="button" data-voltar class="${botao(enviado ? "lime" : "ghost")}">${tipo === "failed" ? "Tentar de novo" : enviado ? "Enviar outro cadastro" : "Editar dados"}</button>
      </div>
    </div>`;
    $("[data-voltar]", resultado).addEventListener("click", () => {
      if (enviado) {
        form.reset();
        $$("select", form).forEach(corDoSelect);
      }
      caixaForm.replaceChildren(form);
    });
    caixaForm.replaceChildren(resultado);
    resultado.focus();
  }

  /* ============ PERGUNTAS FREQUENTES ============ */
  const perguntas = $$("#faq button[aria-expanded]");
  perguntas.forEach((alvo) =>
    alvo.addEventListener("click", () => {
      perguntas.forEach((b) => {
        const aberta = b === alvo && b.getAttribute("aria-expanded") !== "true";
        const painel = document.getElementById(b.getAttribute("aria-controls"));
        const marca = $("button > span:last-child", b.parentElement);
        b.setAttribute("aria-expanded", String(aberta));
        painel.inert = !aberta;
        alternar(painel, "grid-rows-[1fr] opacity-100", aberta);
        alternar(painel, "grid-rows-[0fr] opacity-0", !aberta);
        alternar(marca, "border-lime bg-lime text-ink", aberta);
        alternar(marca, "border-white/20 text-lime group-hover:border-lime", !aberta);
        $("svg", marca).classList.toggle("rotate-45", aberta);
      });
    }),
  );
})();
