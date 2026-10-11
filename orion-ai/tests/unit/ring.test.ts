import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { RingDecoder, RING_TIMINGS, type RingEvent } from "../../src/lib/ringDecoder";

describe("RingDecoder (um botão → clique, duplo, longo)", () => {
  let events: RingEvent[];
  let d: RingDecoder;
  beforeEach(() => {
    vi.useFakeTimers();
    events = [];
    d = new RingDecoder((e) => events.push(e));
  });
  afterEach(() => vi.useRealTimers());

  const tap = (holdMs = 80) => {
    d.down();
    vi.advanceTimersByTime(holdMs);
    d.up();
  };

  it("um toque vira clique só depois da janela do duplo clique", () => {
    tap();
    vi.advanceTimersByTime(RING_TIMINGS.doubleMs - 1);
    expect(events).toEqual([]);
    vi.advanceTimersByTime(2);
    expect(events).toEqual(["clique"]);
  });

  it("dois toques rápidos viram um único duplo clique (sem clique extra)", () => {
    tap();
    vi.advanceTimersByTime(150);
    tap();
    vi.advanceTimersByTime(2000);
    expect(events).toEqual(["duplo"]);
  });

  it("dois toques separados por mais que a janela são dois cliques", () => {
    tap();
    vi.advanceTimersByTime(RING_TIMINGS.doubleMs + 50);
    tap();
    vi.advanceTimersByTime(RING_TIMINGS.doubleMs + 50);
    expect(events).toEqual(["clique", "clique"]);
  });

  it("segurar dispara pressão longa com o botão ainda apertado, uma única vez", () => {
    d.down();
    vi.advanceTimersByTime(RING_TIMINGS.longMs + 10);
    expect(events).toEqual(["longo"]);
    vi.advanceTimersByTime(3000);
    d.up();
    vi.advanceTimersByTime(2000);
    expect(events).toEqual(["longo"]);
  });

  it("repetição automática de tecla (down repetido) não dispara nada extra", () => {
    d.down();
    d.down();
    d.down();
    vi.advanceTimersByTime(100);
    d.up();
    vi.advanceTimersByTime(1000);
    expect(events).toEqual(["clique"]);
  });

  it("toque seguido de pressão longa: o toque vira clique e depois vem o longo", () => {
    tap();
    vi.advanceTimersByTime(100);
    d.down();
    vi.advanceTimersByTime(RING_TIMINGS.longMs + 10);
    d.up();
    vi.advanceTimersByTime(2000);
    expect(events).toEqual(["clique", "longo"]);
  });

  it("reset cancela o que estava pendente", () => {
    tap();
    d.reset();
    vi.advanceTimersByTime(2000);
    expect(events).toEqual([]);
  });

  it("up sem down é ignorado", () => {
    d.up();
    vi.advanceTimersByTime(2000);
    expect(events).toEqual([]);
  });
});
