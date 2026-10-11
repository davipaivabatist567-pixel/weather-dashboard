# ORION AI

Assistente pessoal multimodal com interface holográfica: conversa com IA (texto e voz), visão computacional real (corpo, mãos e gestos com MediaPipe), projetos, tarefas, lembretes, memória controlada e diagnóstico, tudo em português brasileiro.

> Inspirado em assistentes de laboratório futuristas, com identidade própria. O Orion é um modelo de linguagem com ferramentas, não um ser consciente, e não finge ser.

## Versão HTML (arquivo único, sem instalar nada)

O arquivo **`orion.html`** contém o Orion inteiro. Basta abri-lo no Chrome ou no Edge, com dois cliques ou arrastando para o navegador.

- Funciona sem servidor: memória, projetos, tarefas e lembretes ficam no `localStorage` do navegador.
- Para conversar com a IA, abra **Configurações → Conexão com a IA** e cole sua chave da Anthropic (`sk-ant-…`). Sem a chave, o Orion funciona em modo local limitado.
- Precisa de internet para baixar o MediaPipe (jsDelivr e Google Storage) e para falar com a API.
- **Segurança:** nessa versão, a chave fica guardada no navegador e as chamadas saem dele direto para a API da Anthropic. Use apenas em um dispositivo pessoal e **nunca publique o arquivo em um site com a sua chave**. Para uso compartilhado ou publicado, use a versão com servidor abaixo, em que a chave fica no backend.
- Para gerar o arquivo de novo depois de mudar o código: `npm run build:html`.

## Início rápido (versão com servidor)

Requisitos: Node.js 20+ e um navegador baseado em Chromium (Chrome/Edge) para ter todos os recursos de voz.

```bash
cd orion-ai
npm install                 # também copia o WASM do MediaPipe para public/
cp .env.example .env        # coloque sua ANTHROPIC_API_KEY
npm run setup:models        # opcional: baixa os modelos do MediaPipe para uso local
npm run dev                 # backend em :8787 + frontend em http://localhost:5173
```

Produção (um único servidor entregando API e frontend):

```bash
npm run build && npm start  # http://127.0.0.1:8787
```

Sem `ANTHROPIC_API_KEY`, o Orion avisa claramente e roda em **modo local limitado** (cálculos, data/hora, comandos, memória, projetos, visão, gestos e voz continuam funcionando; conversa livre não).

**HTTPS:** câmera e microfone só funcionam em `https://` ou `http://localhost`. Para acessar de outro dispositivo da rede (celular), publique atrás de um proxy HTTPS. Por segurança, o servidor escuta apenas em `127.0.0.1` por padrão (`ORION_HOST`).

## Arquitetura

```
orion-ai/
├── shared/            tipos e calculadora segura compartilhados
├── server/            backend Express (a chave da API fica só aqui)
│   ├── ai/provider.ts         contrato de provedor (troque de IA sem refazer o projeto)
│   ├── ai/anthropicProvider.ts  Claude: streaming, ciclo de ferramentas, web_search, fallback
│   ├── ai/core.ts             inteligência central: persona, modos, memória, seleção de ferramentas
│   ├── tools/registry.ts      ferramentas com schema, risco, permissão e confirmação
│   ├── storage/store.ts       persistência em JSON (memória, projetos, tarefas, lembretes)
│   └── app.ts                 API HTTP + SSE
└── src/               frontend React + TypeScript
    ├── vision/        câmera, MediaPipe, gestos, suavização One Euro, desenho em Canvas
    ├── lib/           voz, comandos locais, modo local, API, análise de dados
    ├── components/    núcleo holográfico, chat, diagnóstico, visão
    └── pages/         Início, Assistente, Visão, Laboratório, Projetos, Pesquisa, Memória, Configurações
```

Para usar outro provedor de IA, implemente `AIProvider` (`server/ai/provider.ts`) e registre-o em `server/index.ts`.

### Modos inteligentes

Cada modo muda o comportamento real: instruções do sistema, ferramentas liberadas e pesquisa.

| Modo | Pesquisa na internet | Ferramentas de projetos | Contexto extra |
|---|---|---|---|
| Assistente | sim | sim | — |
| Engenheiro | sim | sim | foco em código completo e depuração |
| Estudos | sim | sim | professor: exercícios e correção |
| Criativo | não | sim | ideação → requisitos |
| Produtividade | não | sim | registra projetos/tarefas/lembretes |
| Laboratório | não | não | medições reais da câmera enviadas como contexto |
| Pesquisa | sim | não | cita fontes e indica o grau de confiança |

### Segurança e permissões

- **Baixo risco:** calculadora, data/hora (executam direto).
- **Com autorização:** memória, projetos/tarefas/lembretes e pesquisa, que o usuário liga ou desliga em Configurações. Ferramentas não autorizadas nem são oferecidas ao modelo, e o servidor revalida cada chamada.
- **Confirmação final:** exclusões pedidas pela IA viram uma *ação pendente*; nada é apagado até o usuário clicar em **Confirmar**.
- Conteúdo de arquivos e páginas é tratado como dado, não como instrução.
- A memória recusa senhas, chaves de API e números de cartão.

### Privacidade

- O vídeo é processado localmente (MediaPipe WASM/WebGL). Nenhum quadro é gravado nem enviado. A única exceção é o botão **Analisar quadro com a IA**, que pede confirmação.
- Não há reconhecimento de identidade.
- A interface mostra **Câmera ativa** e **Microfone ativo** com botões para desligar na hora.
- O reconhecimento de fala usa a Web Speech API do navegador. No Chrome e no Edge, o áudio é transcrito pelo serviço do fabricante do navegador, e isso é informado nas Configurações.
- O histórico de conversa fica só no navegador (opcional, sem anexos). A memória e os projetos ficam em `data/orion-db.json` (permissão 600). Configurações → **Apagar todos os meus dados** apaga tudo.

## Testes

```bash
npm test                           # 72 testes unitários e de integração (Vitest)
./tests/e2e/prepare-fixtures.sh    # gera vídeos de câmera falsa a partir de imagens de exemplo do MediaPipe
npm run build:html                 # gera orion.html (testado também via file://)
npx playwright test                # 15 testes ponta a ponta no Chromium (câmera falsa + API Claude simulada)
```

Os testes de ponta a ponta usam um servidor que imita a API de streaming da Anthropic (`tests/e2e/mock-anthropic.mjs`), então nenhuma chamada paga é feita.

## Situação das funcionalidades

Veja a seção “Status” no fim deste arquivo (atualizada a cada entrega).

### Status

| Funcionalidade | Situação |
|---|---|
| Interface holográfica, 8 páginas, layout responsivo | Implementada e testada (desktop e 390 px) |
| Núcleo com estados (repouso, escuta, processamento, fala, gesto, erro, especial) | Implementado |
| Conversa por texto com streaming, Markdown, código, tabelas, interrupção, limpeza | Implementada e testada com API simulada |
| Modelo real (Claude) via backend seguro | Implementado e testado contra API simulada; **requer `ANTHROPIC_API_KEY` para uso real** |
| Modo local limitado sem IA | Implementado e testado |
| Ferramentas: calculadora, data/hora, memória, projetos, etapas, tarefas, lembretes, exclusão com confirmação | Implementadas e testadas |
| Pesquisa na internet (web_search) com fontes | Implementada; **depende da chave e da ferramenta habilitada na conta Anthropic** |
| Análise de imagens, PDFs e arquivos de texto/código | Implementada; requer IA conectada |
| Análise de dados CSV e calculadora locais | Implementadas e testadas |
| Câmera: ativar, pausar, retomar, desligar, trocar de dispositivo, estados e erros | Implementados e testados (câmera falsa do Chromium) |
| Rastreamento corporal e das mãos (MediaPipe) com suavização | Implementados e testados com imagem real |
| Gestos com limiar, confirmação por quadros, intervalo, sem repetição, sensibilidade, calibração, histórico | Implementados; polegar para cima testado com imagem real; demais gestos com testes unitários |
| Voz: reconhecimento pt-BR e síntese com escolha de voz, velocidade, volume, silenciar e parar | Implementados; dependem do navegador (não testáveis no Chromium sem interface) |
| Memória persistente com gerenciamento e desativação | Implementada e testada |
| Projetos, tarefas, lembretes (notificação com o Orion aberto) | Implementados e testados |
| Diagnóstico somente com valores medidos | Implementado e testado |
| Versão HTML em arquivo único (`orion.html`), aberta via file:// | Implementada e testada: conversa, ferramentas, persistência e câmera |
| Lembretes com o navegador fechado (push/e-mail) | **Não implementado**: exige um serviço de push externo |
| Integrações externas (e-mail, calendário, mensagens) | **Não implementadas** |
