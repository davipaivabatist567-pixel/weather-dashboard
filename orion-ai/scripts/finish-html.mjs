// Copia o arquivo único gerado em dist-html/ para orion.html (arquivo para distribuir)
// e para ../docs/index.html (pasta servida pelo GitHub Pages, que dá um endereço https).
import { copyFileSync, mkdirSync, statSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const built = join(root, "dist-html", "index.html");
const out = join(root, "orion.html");
copyFileSync(built, out);

const docs = join(root, "..", "docs");
mkdirSync(docs, { recursive: true });
copyFileSync(built, join(docs, "index.html"));

console.log(`[orion] versão HTML pronta: orion.html (${(statSync(out).size / 1024).toFixed(0)} KB) e ../docs/index.html`);
