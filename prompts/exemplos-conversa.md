# Delta Experiences — Exemplos de uso com IAs

Três cenários prontos para colar no chat da sua IA favorita.

---

## 1. Conversa básica (Claude / GPT / Gemini)

**Mensagem única:** no estúdio (`index.html`), aba **Prompt** → **Copiar
prompt**. O texto já inclui a persona do diretor de arte, a identidade, o
conteúdo e o formato de entrega. Cole numa conversa nova.

**Alternativa com system prompt:** se a ferramenta permitir, use
`prompts/editorial-system-prompt.md` como mensagem de sistema.

**Atalho no Claude:** aberto no Claude, o estúdio diagrama sozinho pela aba
**Diagramação IA**, sem copiar nada.

**Resultado esperado:** HTML autocontido A4 + relatório em markdown.

---

## 2. Geração iterativa (recomendado para primeiras propostas)

Quebre em três passos:

### Passo 1 — Arquitetura

> Antes de diagramar, me devolva apenas o **mapa editorial** da proposta:
> uma tabela com `página | seção | intensidade (1-5) | sugestão de foto`.
> Nenhum HTML ainda.

### Passo 2 — Capa e abertura

> Diagrame **apenas as páginas I, II e III** (capa, carta, abertura).
> Autocontido em HTML.

### Passo 3 — Resto do documento

> Perfeito. Diagrame o restante do documento no mesmo estilo. Devolva
> um HTML único que contenha **todas** as páginas (I ao final), mantendo
> as decisões já tomadas.

Vantagem: você valida ritmo e tom antes de deixar o modelo gastar
tokens com páginas densas.

---

## 3. Correção pós-geração

Depois de abrir o HTML no navegador, se algo não ficou editorial:

> A página VII (programa, dia 03) ficou com densidade alta — divida em
> duas páginas. A pull quote da página III ficou pequena — leve a 32pt
> e centralize entre o parágrafo 2 e 3. Mantenha o resto.

A IA deve devolver o HTML **completo** novamente, não apenas o trecho.

---

## 4. Prompt curto (para modelos com janela pequena)

Na aba **Prompt**, escolha **Curto**. É uma versão enxuta (≈ 1.5k tokens)
com paleta, tipografia e dados em JSON. Perde-se a direção por seção —
funciona para rascunhos e refinamentos.

---

## 5. Dica de fluxo de trabalho

1. Preencha os dados no estúdio (`index.html`).
2. Confira a aba **Prévia**: ela avisa se alguma folha passou do tamanho da página.
3. No Claude: aba **Diagramação IA** → **Diagramar com IA**.
   Em outra IA: aba **Prompt** → **Copiar prompt**, cole, e traga a resposta
   de volta em **Trazer HTML gerado em outra IA**.
4. Peça correções em **Ajustes na diagramação** até a peça ficar pronta.
5. **Baixar .html**, abra no Chrome/Safari → `Imprimir` → `Salvar como PDF`.
6. Envie o PDF por link privado ao cliente (nunca por anexo).

Guarde o `.json` original junto — ele é a fonte da verdade para
auditoria e para repetir a diagramação em uma nova versão da identidade.
