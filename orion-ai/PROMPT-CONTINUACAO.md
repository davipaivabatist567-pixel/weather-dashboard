# PROMPT DE CONTINUAÇÃO — ORION AI

Você vai continuar o desenvolvimento do **ORION AI**, um assistente pessoal multimodal em português do Brasil, inspirado no JARVIS, mas construído com tecnologias reais. Leia tudo antes de agir.

## Regras de trabalho
- Responda e escreva a interface em português do Brasil. O criador está aprendendo: explique de forma simples, sem esconder detalhes de engenharia importantes.
- Nada simulado: não invente recursos, preços, compatibilidades, medições nem resultados de teste. O diagnóstico mostra só valores medidos; sem dado, mostre "Indisponível".
- Diferencie sempre: **ideia**, **protótipo**, **funcional e testado**, **versão final**.
- Teste antes de entregar (`npm test` e `npx playwright test`) e diga o que não pôde ser testado.
- Privacidade: imagem processada no aparelho, nenhuma gravação silenciosa, sem reconhecimento de identidade. Exclusões pedidas pela IA exigem confirmação na tela.
- Nunca coloque chave de API dentro de arquivos publicados.

## Onde está o código
Repositório `davipaivabatist567-pixel/weather-dashboard`, branch `ccr-9b24e0be-7tarhc`.
- `orion-ai/`: o aplicativo (React 19 + TypeScript + Vite, backend Express 5, zustand, zod, vitest, Playwright).
- `docs/index.html`: cópia do Orion em HTML para o GitHub Pages (preparado, **Pages não ativado**).
- `acessorios/orion-ring/README.md`: ficha do primeiro acessório.

## O que já existe (funcional e testado, salvo indicação)
**Três formas de usar o mesmo Orion:**
1. **Versão com servidor** (`npm run dev` ou `npm run build && npm start`): a chave da Anthropic fica no `.env` do servidor (`ANTHROPIC_API_KEY`; opcionais `ORION_MODEL`, `ORION_EFFORT`, `ORION_WEB_SEARCH`, `ORION_PORT`, `ORION_HOST`, `ORION_DB_PATH`). Dados em `data/orion-db.json`.
2. **`orion.html`** (arquivo único, `npm run build:html`): sem servidor; a pessoa cola a própria chave em Configurações → Conexão com a IA; dados no `localStorage`.
3. **`orion.apk`** v1.2 (`npm run build:apk`, ~18 MB): WebView (`android/src/com/orion/assistente/MainActivity.java`) que serve o HTML, o MediaPipe (WASM) e os modelos de visão de dentro do APK por um endereço https interno (`https://appassets.orion/`), pede câmera/microfone ao Android e abre as configurações do app se a permissão for negada. Gerado sem Gradle, com `aapt`, `dx`, `zipalign` e `apksigner` do Ubuntu; assinatura em `android/orion-debug.keystore`. O APK não é versionado no Git.

**Recursos:**
- Conversa com IA real (Claude via API da Anthropic) com streaming, Markdown, ferramentas, pesquisa na web (`web_search`) e análise de imagens, PDFs e textos. Sem chave: "modo local limitado" honesto (cálculo, data/hora, comandos, memória, projetos).
- 7 modos com comportamento diferente: assistente, engenheiro, estudos, criativo, produtividade, laboratório, pesquisa.
- Ferramentas com risco e permissão: `calcular`, `data_hora_atual`, `memoria_*`, `conhecimento_*`, `aprender_texto`, `projeto_*`, `projetos_listar`, `tarefa_criar`, `lembrete_criar`. Exclusões viram ação pendente que exige Confirmar.
- Aprendizado (sem retreinar o modelo): base de conhecimento com busca BM25 adaptada ao português, extração automática de fatos após cada resposta (memórias 🧠), "aprenda: …" e "o que você sabe sobre …".
- Visão computacional real com MediaPipe (corpo + 2 mãos), suavização One Euro, gestos com confiança, confirmação por quadros, intervalo, sensibilidade, calibração e histórico. Gestos: mão aberta, polegar para cima, mão fechada, mão direita levantada, braços levantados, deslizes, pinça. A câmera liga sozinha se a permissão já estiver guardada.
- **Diagnosticar câmera** (página Visão): lista cada passo (contexto seguro, permissão, abrir câmera, WebAssembly, WebGL2, arquivos do MediaPipe e modelos) com o erro real.
- Voz pela Web Speech API (ditado pt-BR e fala do Orion), interface holográfica com núcleo por estados, 8 páginas, projetos/tarefas/lembretes, diagnóstico real, privacidade e "Apagar todos os meus dados".
- **Orion Ring, lado do software:** um botão físico (qualquer teclado, tecla padrão `F9`, reaprendível) vira clique (liga/desliga ditado), duplo clique (lê a última resposta) e pressão longa (interrompe tudo). Código em `src/lib/ring.ts` e `src/lib/ringDecoder.ts`; configuração em Configurações → Orion Ring. O anel nunca confirma exclusões.

**Testes atuais:** 94 unitários (Vitest) e 21 ponta a ponta (Playwright/Chromium, com câmera falsa a partir de imagens do MediaPipe e API da Anthropic simulada em `tests/e2e/mock-anthropic.mjs`). Todos passando.

## O que NÃO foi testado ou não existe
- Nenhuma chamada a uma API real da Anthropic (só servidor simulado).
- O APK nunca foi executado em celular ou emulador (o código Java não tem teste automático).
- **Problema em aberto:** o criador relatou duas vezes que a câmera não funciona no celular, sem dizer a mensagem. Correções feitas às cegas (aviso de permissão negada, GPU com tempo limite de 25 s e fallback para CPU, MediaPipe dentro do APK). **Próximo passo: pedir o resultado do botão "Diagnosticar câmera"** e se está usando o APK ou o HTML.
- Ditado por voz não existe dentro do APK (WebView não tem Web Speech API). Lembretes só com o app aberto. Sem integrações externas (e-mail, calendário).
- O Ring físico, a ORION CAM e os ORION GLASSES ainda são **ideia**.

## Decisões pendentes do criador
1. Qual "cérebro" usar: Claude com a própria chave (atual), modelo gratuito no navegador, Ollama ou híbrido.
2. Ring: modelo do celular e versão do Android; tem ferro de solda e multímetro; teto de gasto; placa XIAO nRF52840 comum ou Sense.
3. Ativar ou não o GitHub Pages (o endereço fica público).

## Plano dos acessórios (definido pelo criador)
Ordem: **ORION RING → ORION CAM → ORION GLASSES**, cada um em etapas (bancada simples → testes → miniaturização), com ficha de documentação, lista de materiais, esquema, firmware, carcaça 3D e testes. Para o Ring foram propostas: (A, recomendada) Seeed XIAO nRF52840, com Bluetooth de baixo consumo e carregador embutido; (B) ESP32-C3 SuperMini + módulo TP4056 (exige reduzir a corrente de carga). Preços em reais **ainda não confirmados**. Bateria LiPo só com proteção e corrente de carga ≤ 1C. Primeiro protótipo: controle de dedo maior, não um anel final. Integração: primeiro como teclado Bluetooth (já suportado no Orion), depois serviço Bluetooth próprio para comunicação nos dois sentidos. **Aguardar aprovação do criador antes da lista de compras.**

## Como gerar e testar
```bash
cd orion-ai
npm install && npm run setup:models
npm test                         # unitários
./tests/e2e/prepare-fixtures.sh  # vídeos de câmera falsa
npx playwright test              # ponta a ponta
npm run build:html               # orion.html e ../docs/index.html
npm run build:apk                # orion.apk (precisa de: sudo apt install aapt apksigner zipalign dalvik-exchange android-sdk-platform-23)
```
