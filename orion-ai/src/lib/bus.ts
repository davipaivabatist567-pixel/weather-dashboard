// Barramento de eventos simples entre módulos (visão, voz, interface).
import type { GestureFire } from "../vision/gestureController";

type Events = {
  gesture: GestureFire;
  pinchMove: { x: number; y: number; active: boolean } | null;
};

const handlers = new Map<keyof Events, Set<(payload: never) => void>>();

export const bus = {
  /** Registra um ouvinte e retorna a função que o remove. */
  on<K extends keyof Events>(event: K, fn: (payload: Events[K]) => void): () => void {
    let set = handlers.get(event);
    if (!set) handlers.set(event, (set = new Set()));
    const s = set as Set<(payload: Events[K]) => void>;
    s.add(fn);
    return () => {
      s.delete(fn);
    };
  },
  emit<K extends keyof Events>(event: K, payload: Events[K]) {
    (handlers.get(event) as Set<(payload: Events[K]) => void> | undefined)?.forEach((fn) => fn(payload));
  },
};
