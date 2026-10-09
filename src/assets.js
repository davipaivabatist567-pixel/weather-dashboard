// Carregamento de imagens com tratamento de falhas.
// Nenhuma imagem é obrigatória: se algo falhar, o jogo desenha um substituto.
(function () {
  const PF = globalThis.PF;

  const Assets = {
    images: {},
    failed: [],
    loaded: false,

    loadImage(key, src) {
      return new Promise((resolve) => {
        if (typeof Image === 'undefined') { resolve(null); return; }
        const img = new Image();
        let done = false;
        const finish = (ok) => {
          if (done) return;
          done = true;
          if (ok && img.naturalWidth > 0) {
            this.images[key] = img;
          } else {
            this.failed.push(src);
            console.warn('[Pinguim] Falha ao carregar imagem: ' + src + ' (usando substituto)');
          }
          resolve(ok ? img : null);
        };
        img.onload = () => finish(true);
        img.onerror = () => finish(false);
        // não deixar o carregamento travar o jogo
        setTimeout(() => finish(false), 15000);
        img.src = src;
      });
    },

    loadAll(onProgress) {
      const atlas = PF.ATLAS || { characters: {}, effects: {} };
      const jobs = [];
      for (const [id, c] of Object.entries(atlas.characters)) {
        jobs.push(['char:' + id, c.image]);
        if (c.portrait) jobs.push(['portrait:' + id, c.portrait]);
      }
      for (const [id, e] of Object.entries(atlas.effects)) jobs.push(['fx:' + id, e.image]);
      let count = 0;
      return Promise.all(jobs.map(([k, src]) => this.loadImage(k, src).then(() => {
        count++;
        if (onProgress) onProgress(count / jobs.length);
      }))).then(() => {
        this.loaded = true;
        if (this.failed.length) console.warn('[Pinguim] Recursos que não carregaram:', this.failed);
        return this.failed;
      });
    },

    get(key) { return this.images[key] || null; },
  };

  PF.Assets = Assets;
})();
