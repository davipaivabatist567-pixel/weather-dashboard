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
        img.src = PF.assetUrl(src);
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

    // Cópia ampliada (vizinho mais próximo, fator inteiro) para desenhar com
    // suavização: evita pixels de tamanhos desiguais quando a escala final
    // não é inteira (o que deixava os sprites com aparência deformada).
    UPSCALE: 3,
    sharp(key) {
      const cached = this.sharpCache[key];
      if (cached !== undefined) return cached;
      const img = this.images[key];
      if (!img) return null; // ainda não carregou (ou falhou): não guarda em cache
      let out = null;
      if (typeof document !== 'undefined') {
        try {
          const U = this.UPSCALE;
          const c = document.createElement('canvas');
          c.width = img.naturalWidth * U; c.height = img.naturalHeight * U;
          const g = c.getContext('2d');
          g.imageSmoothingEnabled = false;
          g.drawImage(img, 0, 0, c.width, c.height);
          out = { img: c, f: U };
        } catch (e) {
          console.warn('[Pinguim] Sem cópia ampliada para ' + key, e);
        }
      }
      if (!out) out = { img, f: 1 };
      this.sharpCache[key] = out;
      return out;
    },
    sharpCache: {},
  };

  PF.Assets = Assets;
  // caminho do recurso (no HTML único as imagens vêm embutidas)
  PF.assetUrl = (p) => (p && PF.EMBEDDED && PF.EMBEDDED[p]) || p;
})();
