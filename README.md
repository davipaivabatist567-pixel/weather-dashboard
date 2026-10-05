# Delta Experiences — Estúdio Editorial de Propostas

Sistema completo para gerar propostas comerciais premium da **Delta
Experiences**, pensadas como peças editoriais de alto padrão e
produzidas em parceria com uma **IA especializada em design editorial**
(Claude, GPT, Gemini).

Não é um gerador de PDF genérico. É um estúdio que respeita uma
identidade visual específica, uma voz, e um ritual de produção.

---

## Como funciona

```
┌───────────────────────┐    ┌─────────────────────┐    ┌──────────────────────┐
│ 1. Curador preenche   │ →  │ 2. Estúdio gera     │ →  │ 3. IA editorial      │
│    os dados no        │    │    o prompt e o     │    │    diagrama em HTML  │
│    formulário         │    │    preview          │    │    A4 fine-art       │
└───────────────────────┘    └─────────────────────┘    └──────────────────────┘
```

1. O curador abre `index.html` em qualquer navegador moderno.
2. Preenche os dados da proposta no formulário à esquerda — cliente,
   experiência, programa, inclusões, investimento, condições.
3. O preview à direita renderiza, em tempo real, uma versão enxuta
   da proposta usando a identidade Delta — para validação de conteúdo.
4. Com o conteúdo aprovado, o curador clica em **Copiar prompt IA**.
5. Cola o prompt em uma IA generalista configurada com
   `prompts/editorial-system-prompt.md`.
6. A IA devolve um **HTML autocontido A4 editorial** + relatório.
7. O curador exporta como PDF e envia por link privado.

---

## Estrutura do repositório

```
/
├── index.html                              # app
├── assets/
│   ├── css/
│   │   ├── app.css                         # UI do estúdio
│   │   └── proposal.css                    # diagramação editorial do preview
│   └── js/
│       ├── app.js                          # orquestração do estúdio
│       ├── brand.js                        # ★ fonte de verdade da identidade
│       ├── sections.js                     # estrutura canônica da proposta
│       ├── data.js                         # dados-exemplo
│       ├── preview.js                      # renderizador do preview
│       └── prompt.js                       # gerador do prompt editorial
├── prompts/
│   ├── editorial-system-prompt.md          # ★ system prompt para a IA
│   └── exemplos-conversa.md                # fluxos de uso recomendados
├── docs/
│   └── brand-guidelines.md                 # guia de marca para humanos
├── samples/
│   ├── DX-2026-0147.json                   # proposta-exemplo (dados)
│   └── DX-2026-0147-prompt.md              # prompt-exemplo gerado
└── README.md
```

Arquivos com ★ são os únicos que a maior parte das equipes precisa
abrir regularmente. Toda a identidade vive em `brand.js`; toda a
pedagogia da IA vive em `editorial-system-prompt.md`.

---

## Como executar

Como é um app HTML + ES modules estáticos, basta servir o diretório
localmente:

```bash
# qualquer servidor estático. ex.:
python3 -m http.server 8080
# ou
npx serve .
```

Abra `http://localhost:8080`. Não há build nem dependências npm.

Também funciona abrindo `index.html` direto no Chrome/Edge/Safari
desde que o navegador permita ES modules via `file://` — se não permitir,
use um dos comandos acima.

---

## Fluxo editorial com a IA

### Caminho A — tudo de uma vez

1. Preencha os dados no estúdio.
2. **Copiar prompt IA** → cole em Claude/GPT/Gemini configurado com o
   `editorial-system-prompt.md` como mensagem de sistema.
3. Receba o HTML + relatório.

### Caminho B — iterativo (recomendado para primeiras propostas)

Siga `prompts/exemplos-conversa.md`: peça o **mapa editorial** antes,
depois a **capa + abertura**, por fim o **documento completo**.
Mais tokens, menos surpresas.

### Caminho C — modelos pequenos

Use **Prompt curto**. Perde-se direção por seção; mantém-se paleta,
tipografia e dados. Bom para rascunhos.

---

## O que torna o sistema específico à Delta

- **`brand.js` é a lei.** Qualquer mudança gera um novo `BRAND_HASH`,
  carimbado em cada proposta — rastreabilidade total.
- **Voz codificada.** Clichês proibidos e pilares de redação ficam
  no mesmo arquivo — a IA os recebe toda vez.
- **Grid editorial de verdade.** A4 retrato, margens assimétricas,
  baseline, 12 colunas — não um template genérico de slide.
- **Nenhum ícone pictórico.** Hierarquia 100% tipográfica, como
  numa revista fine-art.
- **Fotografia é placeholder.** O diretor de arte insere a foto final;
  a IA nunca gera.

---

## Exportações disponíveis

| Botão | O que entrega |
|---|---|
| **Copiar prompt IA** | O prompt completo (markdown), já no clipboard. |
| **Prompt .md** | Mesmo prompt, salvo em arquivo. |
| **Prompt curto** | Variante enxuta para modelos com janela pequena. |
| **Preview .html** | O preview atual como HTML autocontido. |
| **Dados .json** | Fonte da verdade da proposta, para auditoria. |
| **Salvar rascunho** | Salva no `localStorage` do navegador. |
| **Abrir rascunho** | Recarrega o último rascunho. |
| **Exemplo** | Restaura os dados-exemplo. |

---

## Convenções

- Códigos de proposta no formato `DX-AAAA-NNNN`.
- Datas em ISO (`AAAA-MM-DD`).
- Valores sempre em inteiros (sem decimais); formatação é feita no render.
- Programa: uma linha por dia, campos separados por `|`.
- Inclusões: uma por linha, nome e descrição separados por `—`.
- Parcelas: `descrição | %`.

---

## Governança

- `brand.js` só muda por decisão conjunta de direção criativa e
  direção de curadoria.
- Toda proposta é confidencial. Nunca anexo — sempre link privado.
- A pasta `samples/` é instrucional; propostas reais ficam fora
  deste repositório, em cofre.

---

## Licença

Uso interno Delta Experiences. Não distribuir.
