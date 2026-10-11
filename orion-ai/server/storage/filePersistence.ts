// Persistência do Store em arquivo JSON (servidor Node), com gravação atômica.
import { chmodSync, existsSync, mkdirSync, readFileSync, renameSync, writeFileSync } from "node:fs";
import { dirname } from "node:path";
import { Store, type Persistence } from "./store";

export function filePersistence(path: string): Persistence {
  return {
    label: path,
    load() {
      if (!existsSync(path)) return null;
      try {
        return JSON.parse(readFileSync(path, "utf8"));
      } catch (err) {
        // Arquivo corrompido: preserva uma cópia e recomeça, em vez de travar o servidor.
        const backup = `${path}.corrompido-${Date.now()}`;
        renameSync(path, backup);
        console.error(`[orion] Banco de dados ilegível, cópia salva em ${backup}:`, err);
        return null;
      }
    },
    save(json) {
      mkdirSync(dirname(path), { recursive: true });
      const tmp = `${path}.tmp`;
      writeFileSync(tmp, json, { mode: 0o600 });
      renameSync(tmp, path);
      try {
        chmodSync(path, 0o600);
      } catch {
        /* sistemas sem suporte a chmod */
      }
    },
  };
}

export const createFileStore = (path: string) => new Store(filePersistence(path));
