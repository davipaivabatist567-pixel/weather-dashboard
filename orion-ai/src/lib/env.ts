/** true na versão HTML independente (arquivo único, sem servidor). */
export const STANDALONE = import.meta.env.VITE_STANDALONE === "1";

/** Como conectar a IA, conforme a versão. */
export const HOW_TO_CONNECT = STANDALONE
  ? "informe sua chave da API em Configurações → Conexão com a IA"
  : "defina ANTHROPIC_API_KEY no arquivo .env do servidor e reinicie o Orion";

/** Onde ficam memória, projetos, tarefas e lembretes. */
export const DATA_LOCATION = STANDALONE ? "neste navegador" : "no servidor";

/** true dentro do app Android (WebView): o app serve o MediaPipe e os modelos de dentro do APK. */
export const IN_ANDROID_APP = typeof navigator !== "undefined" && /OrionApp\//.test(navigator.userAgent);
