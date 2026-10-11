// Leitura de arquivos enviados pelo usuário para análise (no navegador).
import type { ChatAttachment } from "../../shared/types";

const IMAGE = ["image/png", "image/jpeg", "image/gif", "image/webp"];
const TEXT_EXT = /\.(txt|md|markdown|csv|tsv|json|js|jsx|ts|tsx|py|java|c|cpp|h|cs|go|rs|rb|php|html|css|scss|xml|yml|yaml|toml|ini|sql|sh|log)$/i;

export const ACCEPT = [...IMAGE, "application/pdf", ".txt,.md,.csv,.tsv,.json,.js,.jsx,.ts,.tsx,.py,.java,.c,.cpp,.h,.cs,.go,.rs,.rb,.php,.html,.css,.scss,.xml,.yml,.yaml,.toml,.ini,.sql,.sh,.log"].join(",");

const toBase64 = (file: Blob) =>
  new Promise<string>((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => resolve(String(r.result).split(",")[1] ?? "");
    r.onerror = () => reject(r.error);
    r.readAsDataURL(file);
  });

export async function readAttachment(file: File): Promise<ChatAttachment> {
  if (IMAGE.includes(file.type)) {
    if (file.size > 5 * 1024 * 1024) throw new Error(`${file.name}: imagem maior que 5 MB.`);
    return { name: file.name, kind: "image", mediaType: file.type, data: await toBase64(file) };
  }
  if (file.type === "application/pdf" || /\.pdf$/i.test(file.name)) {
    if (file.size > 15 * 1024 * 1024) throw new Error(`${file.name}: PDF maior que 15 MB.`);
    return { name: file.name, kind: "pdf", mediaType: "application/pdf", data: await toBase64(file) };
  }
  if (file.type.startsWith("text/") || TEXT_EXT.test(file.name) || file.type === "application/json") {
    if (file.size > 800 * 1024) throw new Error(`${file.name}: arquivo de texto maior que 800 KB.`);
    return { name: file.name, kind: "text", mediaType: file.type || "text/plain", data: await file.text() };
  }
  throw new Error(`${file.name}: tipo de arquivo não suportado (use imagem, PDF ou texto/código).`);
}

export function dataUrlToAttachment(dataUrl: string, name: string): ChatAttachment {
  const [head, data] = dataUrl.split(",");
  const mediaType = /data:([^;]+)/.exec(head)?.[1] ?? "image/jpeg";
  return { name, kind: "image", mediaType, data };
}
