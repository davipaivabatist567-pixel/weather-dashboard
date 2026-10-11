// Copia o arquivo único gerado em dist-html/ para orion.html (o arquivo para distribuir).
import { copyFileSync, statSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const out = join(root, "orion.html");
copyFileSync(join(root, "dist-html", "index.html"), out);
console.log(`[orion] versão HTML pronta: orion.html (${(statSync(out).size / 1024).toFixed(0)} KB)`);
