// Jogo: laço principal (requestAnimationFrame + passo fixo), modos de jogo
// e ligação entre partida, efeitos, som, renderização e interface.
(function () {
  const PF = globalThis.PF;

  const Settings = {
    roundsToWin: 2, roundTime: 99, touch: 'auto', debug: false, difficulty: 'normal',
    load() {
      try { Object.assign(this, JSON.parse(localStorage.getItem('pf_settings') || '{}')); } catch (e) { /* padrão */ }
    },
    save() {
      try {
        const { roundsToWin, roundTime, touch, debug, difficulty } = this;
        localStorage.setItem('pf_settings', JSON.stringify({ roundsToWin, roundTime, touch, debug, difficulty }));
      } catch (e) { /* ignora */ }
    },
  };
  PF.Settings = Settings;

  const STAGE_FOR = { pingui: 'gelo', rei: 'trono', capitao: 'navio', golem: 'gelo', bruxa: 'aurora' };

  const Game = {
    match: null, stage: null, effects: null, renderer: null,
    loopRunning: false, last: 0, acc: 0, frames: 0, steps: 0,
    session: null, modeLabel: '', dummyMode: 'stand', lastCombo: null,

    init() {
      Settings.load();
      PF.Audio.init();
      PF.Keyboard.init();
      PF.Touch.init(document.getElementById('touch'));
      this.renderer = new PF.Renderer(document.getElementById('game'));
      this.renderer.debug = !!Settings.debug;
      this.effects = new PF.Effects();
      window.addEventListener('resize', () => this.renderer.resize());
      window.addEventListener('orientationchange', () => setTimeout(() => this.renderer.resize(), 200));
      document.addEventListener('visibilitychange', () => { if (document.hidden && this.inFight()) this.pause(true); });
      window.addEventListener('keydown', (e) => this.onKey(e));
      // gestos do navegador que atrapalham a luta
      document.addEventListener('gesturestart', (e) => e.preventDefault());
      document.addEventListener('dblclick', (e) => e.preventDefault());
      window.addEventListener('error', (e) => console.error('[Pinguim] Erro:', e.message));
      document.getElementById('pause-btn').addEventListener('click', () => this.pause(!this.match.paused));
      PF.UI.init(this);
      this.startLoop();
      PF.Assets.loadAll((p) => PF.UI.loading(p)).then((failed) => {
        PF.UI.loaded(failed);
        // cenário de fundo do menu: CPU contra CPU
        this.startDemo();
      });
    },

    inFight() { return !!(this.session && this.match && this.session.mode !== 'demo'); },

    // um único laço; reiniciar a luta nunca cria outro
    startLoop() {
      if (this.loopRunning) return;
      this.loopRunning = true;
      const frame = (ts) => {
        try { this.frame(ts); } catch (e) { console.error('[Pinguim] Erro no quadro:', e); }
        requestAnimationFrame(frame);
      };
      requestAnimationFrame(frame);
    },

    frame(ts) {
      this.frames++;
      if (!this.last) this.last = ts;
      let dt = Math.min(ts - this.last, PF.MAX_FRAME_MS);
      this.last = ts;
      if (dt < 0) dt = 0;
      const running = this.match && !this.match.paused;
      if (running) {
        this.acc += dt;
        while (this.acc >= PF.STEP_MS) {
          this.match.step(PF.STEP_MS);
          this.effects.update(PF.STEP_MS);
          this.stage.update(PF.STEP_MS);
          this.renderer.updateCamera(this.match, PF.STEP_MS);
          this.steps++;
          this.acc -= PF.STEP_MS;
        }
        this.updateTouchVisibility();
      } else this.acc = 0;
      if (this.match) this.renderer.draw(this, ts);
    },

    onKey(e) {
      if (!this.inFight()) return;
      if (e.code === 'Escape' || e.code === 'KeyP') { e.preventDefault(); this.pause(!this.match.paused); }
      if (e.code === 'F1') { e.preventDefault(); this.toggleDebug(); }
      if (e.code === 'KeyR' && this.session.mode === 'training' && !this.match.paused) this.match.resetPositions();
    },
    toggleDebug() {
      this.renderer.debug = !this.renderer.debug;
      Settings.debug = this.renderer.debug; Settings.save();
    },

    updateTouchVisibility() {
      const free = this.inFight() && !this.match.paused && !(PF.UI && PF.UI.current);
      document.getElementById('touch').classList.toggle('hidden', !(free && this.touchEnabled()));
      document.getElementById('pause-btn').classList.toggle('hidden', !free);
      document.body.classList.toggle('fighting', this.inFight());
    },
    touchEnabled() {
      if (Settings.touch === 'on') return true;
      if (Settings.touch === 'off') return false;
      return (window.matchMedia && window.matchMedia('(pointer: coarse)').matches) || 'ontouchstart' in window;
    },

    // ------------------------------------------------------------
    // Criação de lutas
    // ------------------------------------------------------------
    startMatch(cfg) {
      // limpa a luta anterior por completo (eventos, efeitos, entrada)
      if (this.match) this.match.events.clear();
      PF.Keyboard.clear();
      PF.Touch.releaseAll();
      this.effects.reset();
      this.stage = new PF.Stage(cfg.stage || 'gelo');
      const m = new PF.Match({
        p1: cfg.p1, p2: cfg.p2, c1: cfg.c1, c2: cfg.c2, stage: cfg.stage,
        roundsToWin: cfg.roundsToWin || Settings.roundsToWin, roundTime: cfg.roundTime || Settings.roundTime,
        training: !!cfg.training, p1Opts: cfg.p1Opts || {}, p2Opts: cfg.p2Opts || {}, keepHp: cfg.keepHp,
      });
      this.match = m;
      this.effects.attach(m);
      if (!this.session || this.session.mode !== 'demo') this.hookAudio(m);
      m.on('matchEnd', (r) => setTimeout(() => this.onMatchEnd(r), 400));
      m.on('hit', (d) => {
        if (d.defender === m.fighters[1]) this.lastCombo = { hits: d.combo, damage: d.defender.comboDamage };
      });
      this.renderer.camX = (PF.STAGE_W - PF.VIEW_W) / 2;
      this.renderer.trails.clear();
      this.renderer.hpAnim.clear();
      this.acc = 0;
      if (this.session && this.session.mode !== 'demo') {
        PF.Audio.startMusic(PF.STAGES[this.stage.id].music);
      }
      this.updateTouchVisibility();
      return m;
    },

    hookAudio(m) {
      const A = PF.Audio;
      m.on('hit', (d) => A.play(d.ko ? 'ko' : d.data.special ? 'special' : d.data.sfx || 'medium'));
      m.on('block', () => A.play('block'));
      m.on('perfect', () => A.play('perfect'));
      m.on('armor', () => A.play('block'));
      m.on('projectile', () => A.play('projectile'));
      m.on('explode', () => A.play('explosion'));
      m.on('clash', () => A.play('explosion'));
      m.on('super', () => A.play('super'));
      m.on('teleport', () => A.play('teleport'));
      m.on('roundStart', () => A.play('round'));
      m.on('fight', () => A.play('fight'));
      m.on('timeover', () => A.play('ko'));
      m.on('fighter:attack', (d) => A.play('whoosh'));
      m.on('fighter:jump', () => A.play('jump'));
      m.on('fighter:land', () => A.play('land'));
      m.on('fighter:dash', () => A.play('dash'));
      m.on('fighter:dizzy', () => A.play('dizzy'));
      m.on('fighter:denied', () => A.play('denied'));
      m.on('roundEnd', (r) => { if (r.winner) A.play('win'); });
    },

    startDemo() {
      const ids = PF.CHARACTER_ORDER;
      const a = ids[(Math.random() * ids.length) | 0];
      let b = ids[(Math.random() * ids.length) | 0];
      if (b === a) b = ids[(ids.indexOf(a) + 1) % ids.length];
      this.session = { mode: 'demo' };
      this.modeLabel = '';
      const m = this.startMatch({ p1: a, p2: b, stage: PF.STAGE_ORDER[(Math.random() * 4) | 0],
        c1: new PF.CPUController('normal'), c2: new PF.CPUController('normal'), roundsToWin: 99, roundTime: 99 });
      m.on('matchEnd', () => {});
      // na demonstração, sempre recomeça
      m.on('roundEnd', () => setTimeout(() => { if (this.session.mode === 'demo' && this.match === m) this.startDemo(); }, 2500));
    },

    // ------------------------------------------------------------
    // Modos
    // ------------------------------------------------------------
    begin(mode, sel) {
      PF.Audio.unlock();
      const humanTouch = { touch: true };
      const c1 = new PF.HumanController(1, humanTouch);
      const diff = sel.difficulty || Settings.difficulty;
      Settings.difficulty = diff; Settings.save();
      this.dummyMode = sel.dummy || 'stand';
      this.lastCombo = null;
      switch (mode) {
        case 'cpu':
          this.session = { mode, sel };
          this.modeLabel = 'JOGADOR x CPU · ' + PF.AI_LEVEL_NAMES[diff];
          this.startMatch({ p1: sel.p1, p2: sel.p2, stage: sel.stage, c1, c2: new PF.CPUController(diff) });
          break;
        case 'versus':
          this.session = { mode, sel };
          this.modeLabel = '2 JOGADORES';
          this.startMatch({ p1: sel.p1, p2: sel.p2, stage: sel.stage, c1, c2: new PF.HumanController(2) });
          break;
        case 'training': {
          this.session = { mode, sel };
          this.modeLabel = '';
          const c2 = this.dummyMode === 'p2' ? new PF.HumanController(2) : new PF.DummyController(this.dummyMode);
          this.startMatch({ p1: sel.p1, p2: sel.p2, stage: sel.stage, c1, c2, training: true });
          this.match.fighters[0].infiniteEnergy = true;
          break;
        }
        case 'arcade': {
          const others = PF.CHARACTER_ORDER.filter((id) => id !== sel.p1);
          const boss = sel.p1 === 'rei' ? 'golem' : 'rei';
          const ladder = others.filter((id) => id !== boss).sort(() => Math.random() - 0.5);
          ladder.push(boss);
          this.session = { mode, sel, ladder, index: 0, diff, continues: 0 };
          this.startArcadeFight();
          break;
        }
        case 'survival':
          this.session = { mode, sel, wave: 0, hp: null, last: null, diff };
          this.nextWave();
          break;
      }
      PF.UI.show(null);
    },

    startArcadeFight() {
      const s = this.session;
      const opp = s.ladder[s.index];
      const isBoss = s.index === s.ladder.length - 1;
      const levels = ['facil', 'normal', 'dificil'];
      const base = levels.indexOf(s.diff);
      const lvl = levels[Math.min(2, base + (s.index >= 2 ? 1 : 0) + (isBoss ? 1 : 0))];
      this.modeLabel = 'ARCADE · LUTA ' + (s.index + 1) + '/' + s.ladder.length + (isBoss ? ' · CHEFE FINAL' : '');
      this.startMatch({ p1: s.sel.p1, p2: opp, stage: isBoss ? 'trono' : STAGE_FOR[opp],
        c1: new PF.HumanController(1, { touch: true }), c2: new PF.CPUController(lvl),
        p2Opts: isBoss ? { hpMult: 1.3, damageMult: 1.1 } : {} });
    },

    nextWave() {
      const s = this.session;
      s.wave++;
      const pool = PF.CHARACTER_ORDER.filter((id) => id !== s.last);
      const opp = pool[(Math.random() * pool.length) | 0];
      s.last = opp;
      const lvl = s.wave <= 2 ? 'facil' : s.wave <= 5 ? 'normal' : 'dificil';
      const hpMult = Math.min(1.6, 0.8 + 0.06 * s.wave);
      this.modeLabel = 'SOBREVIVÊNCIA · ONDA ' + s.wave;
      this.startMatch({ p1: s.sel.p1, p2: opp, stage: STAGE_FOR[opp], roundsToWin: 1,
        c1: new PF.HumanController(1, { touch: true }), c2: new PF.CPUController(lvl),
        p2Opts: { hpMult, damageMult: Math.min(1.3, 0.9 + 0.04 * s.wave) }, keepHp: s.hp });
    },

    onMatchEnd(r) {
      if (!this.session || this.session.mode === 'demo') return;
      const s = this.session, m = this.match;
      const p1 = PF.CHARACTERS[s.sel.p1];
      const won = r.winner === 1;
      PF.Audio.stopMusic();
      switch (s.mode) {
        case 'cpu':
        case 'versus': {
          const w = r.winner ? m.fighters[r.winner - 1].def : null;
          const who = s.mode === 'versus' ? (r.winner ? 'JOGADOR ' + r.winner : '') : (won ? 'VOCÊ' : 'CPU');
          PF.UI.results({
            title: r.winner ? who + ' VENCEU!' : 'EMPATE!', art: w ? 'portrait:' + w.id : null,
            text: `Rounds: ${r.rounds[0]} x ${r.rounds[1]}\nMaior combo: ${Math.max(...m.stats.maxCombo)} golpes`,
            buttons: [['REVANCHE', () => this.begin(s.mode, s.sel)], ['TROCAR LUTADORES', () => PF.UI.openSelect(s.mode)], ['MENU', () => this.toMenu()]],
          });
          break;
        }
        case 'arcade':
          if (won) {
            s.index++;
            if (s.index >= s.ladder.length) {
              PF.UI.results({
                title: 'PINGUINHA RESGATADA!', art: 'fx:pinguinha',
                text: `${p1.name} venceu o Torneio da Aventura do Pinguim!\nContinues usados: ${s.continues}\nObrigado por jogar!`,
                buttons: [['JOGAR DE NOVO', () => PF.UI.openSelect('arcade')], ['MENU', () => this.toMenu()]],
              });
            } else {
              const next = PF.CHARACTERS[s.ladder[s.index]];
              PF.UI.results({
                title: 'VITÓRIA!', art: 'portrait:' + p1.id,
                text: `Próximo desafio: ${next.name}${s.index === s.ladder.length - 1 ? ' (CHEFE FINAL)' : ''}`,
                buttons: [['PRÓXIMA LUTA', () => { PF.UI.show(null); this.startArcadeFight(); }], ['MENU', () => this.toMenu()]],
              });
            }
          } else {
            PF.UI.results({
              title: 'DERROTA…', art: 'portrait:' + m.fighters[1].def.id,
              text: 'Continuar a aventura?',
              buttons: [['CONTINUAR', () => { s.continues++; PF.UI.show(null); this.startArcadeFight(); }], ['MENU', () => this.toMenu()]],
            });
          }
          break;
        case 'survival':
          if (won) {
            const f = m.fighters[0];
            s.hp = Math.min(f.maxHp, f.hp + f.maxHp * 0.25);
            PF.UI.results({
              title: 'ONDA ' + s.wave + ' VENCIDA!', art: 'portrait:' + p1.id,
              text: `Vida recuperada: +25%\nVida atual: ${Math.round(s.hp)} / ${f.maxHp}`,
              buttons: [['PRÓXIMA ONDA', () => { PF.UI.show(null); this.nextWave(); }], ['DESISTIR', () => this.toMenu()]],
            });
          } else {
            const waves = s.wave - 1;
            let best = 0;
            try { best = +localStorage.getItem('pf_best_survival') || 0; if (waves > best) localStorage.setItem('pf_best_survival', waves); } catch (e) { /* ignora */ }
            PF.UI.results({
              title: 'FIM DA SOBREVIVÊNCIA', art: 'portrait:' + p1.id,
              text: `Ondas vencidas: ${waves}\nRecorde: ${Math.max(best, waves)}`,
              buttons: [['TENTAR DE NOVO', () => this.begin('survival', s.sel)], ['MENU', () => this.toMenu()]],
            });
          }
          break;
      }
    },

    pause(p) {
      if (!this.inFight()) return;
      if (this.match.state === 'over') return;
      this.match.setPaused(p);
      PF.Keyboard.clear();
      PF.Touch.releaseAll();
      if (p) PF.UI.showPause(this.session.mode === 'training');
      else PF.UI.show(null);
      this.updateTouchVisibility();
    },

    restart() {
      const s = this.session;
      if (!s) return;
      if (s.mode === 'arcade') { PF.UI.show(null); this.startArcadeFight(); }
      else if (s.mode === 'survival') { s.wave--; PF.UI.show(null); this.nextWave(); }
      else this.begin(s.mode, s.sel);
    },

    setDummy(mode) {
      this.dummyMode = mode;
      if (!this.session || this.session.mode !== 'training') return;
      this.session.sel.dummy = mode;
      this.match.controllers[1] = mode === 'p2' ? new PF.HumanController(2) : new PF.DummyController(mode);
    },

    toMenu() {
      PF.Audio.stopMusic();
      this.startDemo();
      PF.UI.show('modes');
      this.updateTouchVisibility();
    },
  };

  PF.game = Game;
  if (typeof window !== 'undefined') window.addEventListener('DOMContentLoaded', () => Game.init());
})();
