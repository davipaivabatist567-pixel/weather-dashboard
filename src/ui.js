// Interface em DOM: telas de menu, seleção de personagens, opções,
// remapeamento de controles, lista de golpes, pausa e resultados.
(function () {
  const PF = globalThis.PF;
  const $ = (s) => document.querySelector(s);

  const STAT_MAX = { hp: 1250, power: 1.2, walk: 215, reach: 88, defense: 1.15 };

  const UI = {
    game: null, current: 'loading', backStack: [], sel: null, cursor: 0, movesChar: 'pingui',
    ready: false,

    init(game) {
      this.game = game;
      document.getElementById('screens').addEventListener('click', (e) => this.onClick(e));
      window.addEventListener('keydown', (e) => this.onKey(e));
      // opções de arena e boneco
      const st = $('#opt-stage');
      st.innerHTML = '<option value="auto">Automática</option>' + PF.STAGE_ORDER.map((id) => `<option value="${id}">${PF.STAGES[id].name}</option>`).join('');
      const dm = Object.entries(PF.DUMMY_MODES).map(([k, v]) => `<option value="${k}">${v}</option>`).join('');
      $('#opt-dummy').innerHTML = dm;
      $('#pause-dummy').innerHTML = dm;
      $('#pause-dummy').addEventListener('change', (e) => game.setDummy(e.target.value));
      $('#opt-diff').value = PF.Settings.difficulty;
      this.bindOptions();
    },

    loading(p) { $('#load-bar').style.width = Math.round(p * 100) + '%'; },
    loaded(failed) {
      this.ready = true;
      if (failed && failed.length) $('#load-text').textContent = 'Alguns recursos falharam: ' + failed.join(', ');
      const tc = $('#title-chars');
      tc.innerHTML = PF.CHARACTER_ORDER.map((id) => {
        const c = PF.ATLAS.characters[id];
        return c && c.portrait && PF.Assets.get('portrait:' + id) ? `<img src="${c.portrait}" alt="${PF.CHARACTERS[id].name}">` : '';
      }).join('');
      this.show('title');
    },

    show(name, push = true) {
      if (push && this.current && name && this.current !== name && !['pause', 'results', 'loading', 'title'].includes(this.current)) this.backStack.push(this.current);
      document.querySelectorAll('.screen').forEach((s) => s.classList.remove('active'));
      this.current = name;
      if (name) {
        const el = document.getElementById('scr-' + name);
        el.classList.add('active');
        const first = el.querySelector('button:not([disabled]), select');
        if (first && !(window.matchMedia && window.matchMedia('(pointer: coarse)').matches)) setTimeout(() => first.focus(), 30);
      }
      if (this.game) this.game.updateTouchVisibility();
    },
    back() {
      PF.Audio.play('back');
      if (this.current === 'select' && this.sel && this.sel.turn === 2) { this.sel.turn = 1; this.sel.p1 = null; this.renderSelect(); return; }
      if (this.current === 'moves' && this.fromPause) { this.fromPause = false; this.showPause(this.game.session.mode === 'training'); return; }
      const prev = this.backStack.pop() || 'modes';
      this.show(prev, false);
    },

    onClick(e) {
      const b = e.target.closest('button');
      if (!b) return;
      PF.Audio.unlock();
      if (b.dataset.mode) { PF.Audio.play('confirm'); this.openSelect(b.dataset.mode); return; }
      const a = b.dataset.action;
      if (!a) return;
      PF.Audio.play('select');
      switch (a) {
        case 'start': this.backStack = []; this.show('modes'); PF.Audio.play('confirm'); break;
        case 'back': this.back(); break;
        case 'options': this.show('options'); break;
        case 'controls': this.renderControls(); this.show('controls'); break;
        case 'moves': this.fromPause = this.current === 'pause'; this.renderMoves(); this.show('moves', !this.fromPause); break;
        case 'fight': this.confirmFight(); break;
        case 'random': this.pickRandom(); break;
        case 'reset-keys': PF.Keyboard.resetMap(); this.renderControls(); break;
        case 'resume': this.game.pause(false); break;
        case 'restart': this.game.match.setPaused(false); this.show(null); this.game.restart(); break;
        case 'training-reset': this.game.match.resetPositions(); this.game.pause(false); break;
        case 'menu': this.backStack = []; this.game.toMenu(); break;
      }
    },

    onKey(e) {
      if (!this.current) return;
      if (PF.Keyboard.captureCallback) return;
      const k = e.code;
      if (this.current === 'title' && (k === 'Enter' || k === 'Space' || k === 'KeyJ')) {
        e.preventDefault(); PF.Audio.unlock(); this.backStack = []; this.show('modes'); PF.Audio.play('confirm'); return;
      }
      if (this.current === 'select') { this.selectKey(e); return; }
      if (k === 'Escape' || k === 'Backspace') {
        if (this.current === 'pause') return; // a pausa é tratada pelo jogo
        if (['modes'].includes(this.current)) return;
        if (this.current === 'results') return;
        e.preventDefault(); this.back(); return;
      }
      const scr = document.getElementById('scr-' + this.current);
      if (!scr) return;
      const items = [...scr.querySelectorAll('button:not([disabled]), select, input')].filter((x) => x.offsetParent !== null);
      if (!items.length) return;
      const idx = items.indexOf(document.activeElement);
      const isSelect = document.activeElement && document.activeElement.tagName === 'SELECT';
      if (k === 'ArrowDown' || k === 'KeyS' || (!isSelect && k === 'ArrowRight')) { e.preventDefault(); items[(idx + 1) % items.length].focus(); PF.Audio.play('select'); }
      if (k === 'ArrowUp' || k === 'KeyW' || (!isSelect && k === 'ArrowLeft')) { e.preventDefault(); items[(idx - 1 + items.length) % items.length].focus(); PF.Audio.play('select'); }
      if (k === 'KeyJ' && document.activeElement && document.activeElement.tagName === 'BUTTON') { e.preventDefault(); document.activeElement.click(); }
    },

    // ----------------------------------------------------------
    // Seleção de personagens
    // ----------------------------------------------------------
    openSelect(mode) {
      const prev = this.sel && this.sel.mode === mode ? this.sel : null;
      this.sel = { mode, turn: 1, p1: null, p2: null };
      this.cursor = prev ? Math.max(0, PF.CHARACTER_ORDER.indexOf(prev.p1)) : 0;
      const titles = { arcade: 'ARCADE', cpu: 'JOGADOR x CPU', versus: '2 JOGADORES', training: 'TREINAMENTO', survival: 'SOBREVIVÊNCIA' };
      this.modeTitle = titles[mode];
      $('#opt-diff-wrap').classList.toggle('hidden', !['cpu', 'arcade', 'survival'].includes(mode));
      $('#opt-stage-wrap').classList.toggle('hidden', !['cpu', 'versus', 'training'].includes(mode));
      $('#opt-dummy-wrap').classList.toggle('hidden', mode !== 'training');
      const grid = $('#char-grid');
      grid.innerHTML = PF.CHARACTER_ORDER.map((id, i) => {
        const c = PF.ATLAS.characters[id];
        const src = c && c.portrait ? c.portrait : '';
        return `<button class="char-cell" data-char="${id}" data-i="${i}" aria-label="${PF.CHARACTERS[id].name}">${src ? `<img src="${src}" alt="">` : ''}</button>`;
      }).join('');
      grid.querySelectorAll('.char-cell').forEach((cell) => {
        cell.addEventListener('click', (e) => { e.stopPropagation(); this.cursor = +cell.dataset.i; this.pick(cell.dataset.char); });
        cell.addEventListener('mouseenter', () => { this.cursor = +cell.dataset.i; this.renderSelect(); });
      });
      if (this.current !== 'select') this.show('select');
      this.renderSelect();
    },

    needsSecond() { return ['cpu', 'versus', 'training'].includes(this.sel.mode); },

    pick(id) {
      const s = this.sel;
      PF.Audio.play('confirm');
      if (s.turn === 1) {
        s.p1 = id;
        if (this.needsSecond()) { s.turn = 2; }
        else s.turn = 3;
      } else if (s.turn === 2) {
        s.p2 = id; s.turn = 3;
      }
      this.renderSelect();
      if (s.turn === 3) setTimeout(() => $('#btn-fight').focus(), 30);
    },
    pickRandom() {
      const ids = PF.CHARACTER_ORDER;
      if (this.sel.turn === 3) return;
      this.cursor = (Math.random() * ids.length) | 0;
      this.pick(ids[this.cursor]);
    },

    selectKey(e) {
      const k = e.code, s = this.sel;
      const ids = PF.CHARACTER_ORDER;
      if (document.activeElement && document.activeElement.tagName === 'SELECT' && !['Escape', 'Enter'].includes(k)) return;
      const left = ['ArrowLeft', 'KeyA'], right = ['ArrowRight', 'KeyD'];
      const confirm = ['Enter', 'Space', 'KeyJ', 'Numpad1', 'Comma'];
      if (left.includes(k)) { e.preventDefault(); this.cursor = (this.cursor - 1 + ids.length) % ids.length; PF.Audio.play('select'); this.renderSelect(); }
      else if (right.includes(k)) { e.preventDefault(); this.cursor = (this.cursor + 1) % ids.length; PF.Audio.play('select'); this.renderSelect(); }
      else if (confirm.includes(k)) {
        e.preventDefault();
        if (s.turn === 3) this.confirmFight();
        else this.pick(ids[this.cursor]);
      } else if (k === 'Escape' || k === 'Backspace') {
        e.preventDefault();
        if (s.turn === 3) { s.turn = this.needsSecond() ? 2 : 1; if (s.turn === 2) s.p2 = null; else s.p1 = null; this.renderSelect(); PF.Audio.play('back'); }
        else this.back();
      }
    },

    renderSelect() {
      const s = this.sel, ids = PF.CHARACTER_ORDER;
      const hover = ids[this.cursor];
      const who2 = s.mode === 'versus' ? 'JOGADOR 2' : s.mode === 'training' ? 'BONECO' : 'CPU';
      $('#select-title').textContent = this.modeTitle + ' · ' + (s.turn === 1 ? 'ESCOLHA SEU LUTADOR' : s.turn === 2 ? (s.mode === 'versus' ? 'JOGADOR 2: ESCOLHA' : 'ESCOLHA O OPONENTE') : 'PRONTO!');
      document.querySelectorAll('.char-cell').forEach((cell) => {
        const id = cell.dataset.char;
        cell.classList.toggle('p1', s.p1 === id);
        cell.classList.toggle('p2', s.p2 === id);
        cell.classList.toggle('cursor', id === hover && s.turn !== 3);
        cell.querySelectorAll('.tag').forEach((t) => t.remove());
        if (s.p1 === id) cell.insertAdjacentHTML('beforeend', '<span class="tag p1">J1</span>');
        if (s.p2 === id) cell.insertAdjacentHTML('beforeend', `<span class="tag p2">${s.mode === 'versus' ? 'J2' : 'CPU'}</span>`);
      });
      $('#card-p1').innerHTML = this.card(s.p1 || (s.turn === 1 ? hover : null), 'JOGADOR 1');
      const show2 = this.needsSecond();
      $('#card-p2').style.visibility = show2 ? 'visible' : 'hidden';
      $('#card-p2').innerHTML = show2 ? this.card(s.p2 || (s.turn === 2 ? hover : null), who2) : '';
      $('#btn-fight').disabled = s.turn !== 3;
      $('#btn-random').disabled = s.turn === 3;
    },

    card(id, who) {
      if (!id) return `<div class="who">${who}</div><div class="name">?</div>`;
      const c = PF.CHARACTERS[id], a = PF.ATLAS.characters[id];
      const stat = (label, v, max) => `<div class="stat"><span>${label}</span><span class="bar"><i style="width:${Math.round(Math.min(1, v / max) * 100)}%"></i></span></div>`;
      return `<div class="who">${who}</div>
        ${a && a.portrait ? `<img src="${a.portrait}" alt="">` : ''}
        <div class="name" style="color:${c.color}">${c.name.toUpperCase()}</div>
        <div class="title">${c.title}</div>
        <div class="desc">${c.desc}</div>
        ${stat('Vida', c.hp, STAT_MAX.hp)}${stat('Força', c.power, STAT_MAX.power)}${stat('Velocidade', c.walk, STAT_MAX.walk)}
        ${stat('Alcance', c.reach, STAT_MAX.reach)}${stat('Defesa', c.defense, STAT_MAX.defense)}`;
    },

    confirmFight() {
      const s = this.sel;
      if (!s || s.turn !== 3) return;
      let stage = $('#opt-stage').value;
      const opp = s.p2 || s.p1;
      if (stage === 'auto') stage = { rei: 'trono', capitao: 'navio', bruxa: 'aurora' }[opp] || 'gelo';
      const sel = { p1: s.p1, p2: s.p2 || 'rei', stage, difficulty: $('#opt-diff').value, dummy: $('#opt-dummy').value };
      PF.Audio.play('confirm');
      this.backStack = ['modes'];
      this.game.begin(s.mode, sel);
    },

    // ----------------------------------------------------------
    // Pausa e resultados
    // ----------------------------------------------------------
    showPause(training) {
      document.querySelectorAll('#scr-pause .only-training').forEach((el) => el.classList.toggle('hidden', !training));
      $('#pause-dummy').value = this.game.dummyMode;
      this.show('pause', false);
    },

    results(cfg) {
      $('#res-title').textContent = cfg.title;
      const art = cfg.art && PF.Assets.get(cfg.art);
      $('#res-art').innerHTML = art ? `<img src="${art.src}" alt="">` : '';
      $('#res-text').textContent = cfg.text || '';
      const box = $('#res-buttons');
      box.innerHTML = '';
      for (const [label, fn] of cfg.buttons) {
        const b = document.createElement('button');
        b.textContent = label;
        b.addEventListener('click', () => { PF.Audio.play('confirm'); fn(); });
        box.appendChild(b);
      }
      this.show('results', false);
      this.game.updateTouchVisibility();
    },

    // ----------------------------------------------------------
    // Opções e controles
    // ----------------------------------------------------------
    bindOptions() {
      const S = PF.Settings, A = PF.Audio;
      const vol = $('#o-volume'), snd = $('#o-sound'), mus = $('#o-music');
      vol.value = A.volume; snd.checked = A.enabled; mus.checked = A.musicOn;
      vol.addEventListener('input', () => { A.volume = +vol.value; A.applyVolume(); A.save(); });
      snd.addEventListener('change', () => { A.enabled = snd.checked; A.applyVolume(); A.save(); });
      mus.addEventListener('change', () => { A.musicOn = mus.checked; A.applyVolume(); A.save(); });
      const rounds = $('#o-rounds'), time = $('#o-time'), touch = $('#o-touch'), dbg = $('#o-debug');
      rounds.value = S.roundsToWin; time.value = S.roundTime; touch.value = S.touch; dbg.checked = S.debug;
      rounds.addEventListener('change', () => { S.roundsToWin = +rounds.value; S.save(); });
      time.addEventListener('change', () => { S.roundTime = +time.value; S.save(); });
      touch.addEventListener('change', () => { S.touch = touch.value; S.save(); });
      dbg.addEventListener('change', () => { S.debug = dbg.checked; this.game.renderer.debug = dbg.checked; S.save(); });
    },

    renderControls() {
      const g = $('#controls-grid');
      let html = '<div class="head">AÇÃO</div><div class="head">JOGADOR 1</div><div class="head">JOGADOR 2</div>';
      for (const a of PF.ACTIONS) {
        html += `<div>${PF.ACTION_NAMES[a]}</div>`;
        for (const p of [1, 2]) html += `<button data-p="${p}" data-a="${a}">${PF.Keyboard.map[p][a].map(PF.keyLabel).join(' / ')}</button>`;
      }
      g.innerHTML = html;
      g.querySelectorAll('button[data-a]').forEach((b) => b.addEventListener('click', (e) => {
        e.stopPropagation();
        b.classList.add('wait'); b.textContent = 'aperte…';
        PF.Keyboard.capture((code) => {
          if (code !== 'Escape') PF.Keyboard.setKey(+b.dataset.p, b.dataset.a, code);
          this.renderControls();
        });
      }));
    },

    renderMoves() {
      const tabs = $('#moves-tabs');
      tabs.innerHTML = PF.CHARACTER_ORDER.map((id) => `<button data-mc="${id}" class="${id === this.movesChar ? 'on' : ''}">${PF.CHARACTERS[id].name}</button>`).join('');
      tabs.querySelectorAll('button').forEach((b) => b.addEventListener('click', (e) => { e.stopPropagation(); this.movesChar = b.dataset.mc; this.renderMoves(); }));
      const c = PF.CHARACTERS[this.movesChar];
      const N = [
        ['Soco fraco', 'J'], ['Soco médio (combo)', 'J, J'], ['Soco forte', '→ + J'], ['Chute fraco', 'K'],
        ['Chute médio', '→ + K'], ['Combo básico: soco + soco + chute', 'J, J, K'], ['Soco agachado', '↓ + J'],
        ['Rasteira (golpe baixo)', '↓ + K'], ['Ataques aéreos', 'no ar: J ou K'], ['Agarrão (perto)', 'J + K'],
        ['Investida / corrida', '→ →'], ['Recuo rápido', '← ←'], ['Defesa (baixa: segure ↓)', 'L'],
        ['Defesa perfeita', 'L no instante do golpe'],
      ];
      const sp = PF.SPECIAL_COMMANDS.map((cmd) => {
        const m = c.specials[cmd.key];
        return [m.name + (m.cost ? ` (${m.cost === 100 ? 'barra cheia' : m.cost + ' energia'})` : ''), cmd.text];
      });
      const table = (rows) => '<table>' + rows.map(([a, b]) => `<tr><td>${a}</td><td>${b}</td></tr>`).join('') + '</table>';
      $('#moves-list').innerHTML = `<h3 style="color:${c.color}">${c.name} — ${c.title}</h3><p>${c.desc}</p>
        <h3>ESPECIAIS</h3>${table(sp)}<h3>GOLPES BÁSICOS</h3>${table(N)}
        <p class="hint">Especiais custam energia e têm recarga. Golpes repetidos no mesmo combo causam menos dano.</p>`;
    },
  };

  PF.UI = UI;
})();
