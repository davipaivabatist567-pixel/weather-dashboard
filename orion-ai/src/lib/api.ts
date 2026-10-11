// Ponto único de acesso ao backend. "@backend" aponta para o servidor HTTP (padrão)
// ou para o backend local no navegador (versão HTML), conforme o build.
import { backend } from "@backend";

export { ApiError } from "./backend/errors";
export const api = backend;
export const streamChat = backend.streamChat;
