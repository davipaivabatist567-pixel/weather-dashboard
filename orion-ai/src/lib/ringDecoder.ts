// Decodifica um único botão físico (o do Orion Ring) em clique, duplo clique e pressão longa.
// O anel só precisa enviar "tecla pressionada / tecla solta" (um teclado Bluetooth de uma tecla):
// a interpretação do tempo é feita aqui, então dá para testar com qualquer teclado.
export type RingEvent = "clique" | "duplo" | "longo";

export const RING_TIMINGS = {
  /** segurar por mais que isso = pressão longa (disparada ainda com o botão apertado) */
  longMs: 600,
  /** janela para um segundo toque virar duplo clique */
  doubleMs: 350,
};

type Timer = ReturnType<typeof setTimeout>;

export class RingDecoder {
  private isDown = false;
  private longFired = false;
  private taps = 0;
  private longTimer: Timer | null = null;
  private clickTimer: Timer | null = null;

  constructor(
    private readonly emit: (e: RingEvent) => void,
    private readonly timings = RING_TIMINGS,
  ) {}

  /** Chame quando a tecla for pressionada (ignore repetições automáticas do teclado). */
  down() {
    if (this.isDown) return;
    this.isDown = true;
    this.longFired = false;
    this.longTimer = setTimeout(() => {
      this.longFired = true;
      this.clearClick();
      this.taps = 0;
      this.emit("longo");
    }, this.timings.longMs);
  }

  /** Chame quando a tecla for solta. */
  up() {
    if (!this.isDown) return;
    this.isDown = false;
    if (this.longTimer) clearTimeout(this.longTimer);
    this.longTimer = null;
    if (this.longFired) return;
    this.taps++;
    if (this.taps >= 2) {
      this.clearClick();
      this.taps = 0;
      this.emit("duplo");
      return;
    }
    this.clickTimer = setTimeout(() => {
      this.clickTimer = null;
      this.taps = 0;
      this.emit("clique");
    }, this.timings.doubleMs);
  }

  reset() {
    if (this.longTimer) clearTimeout(this.longTimer);
    this.longTimer = null;
    this.clearClick();
    this.isDown = false;
    this.longFired = false;
    this.taps = 0;
  }

  private clearClick() {
    if (this.clickTimer) clearTimeout(this.clickTimer);
    this.clickTimer = null;
  }
}
