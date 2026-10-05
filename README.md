# Delta Experiences — Estúdio Editorial de Propostas

Sistema completo para gerar propostas comerciais premium da **Delta
Experiences**, pensadas como peças editoriais de alto padrão e
diagramadas por uma **IA especializada em design editorial**.

Tudo está em **um único arquivo: `index.html`**. Não há servidor, build
nem dependências. Dê dois cliques e ele abre no navegador.

---

## Como funciona

```
┌───────────────────────┐    ┌─────────────────────┐    ┌──────────────────────┐
│ 1. Curador preenche   │ →  │ 2. Estúdio monta a  │ →  │ 3. IA editorial      │
│    os dados no        │    │    prévia A4 e o    │    │    diagrama a peça   │
│    formulário         │    │    prompt editorial │    │    inteira em HTML   │
└───────────────────────┘    └─────────────────────┘    └──────────────────────┘
```

O estúdio tem três abas:

| Aba | O que faz |
|---|---|
| **Prévia** | Mostra a proposta em 18 folhas A4 na identidade Delta, em tempo real. Avisa quando alguma folha passa do tamanho da página. |
| **Prompt** | O prompt completo para a IA: persona do diretor de arte, sistema de marca, conteúdo seção por seção, regras e formato de entrega. Versão curta para modelos menores. |
| **Diagramação IA** | Aberto no Claude, a IA diagrama a proposta inteira direto na página, com acompanhamento ao vivo e pedidos de ajuste. Fora do Claude, cole aqui o HTML devolvido por qualquer IA para visualizar. |

---

## Dois jeitos de usar

### Aberto no Claude (diagramação automática)

1. Preencha os dados.
2. Aba **Diagramação IA** → **Diagramar com IA**. Leva de um a três minutos.
3. Peça correções em **Ajustes na diagramação**.
4. **Baixar .html**, abra no navegador e use `Imprimir → Salvar como PDF`.

A chamada usa a conta Claude de quem está usando a página e pede
autorização na primeira vez.

### Arquivo local ou outra IA

1. Abra `index.html` no navegador.
2. Aba **Prompt** → **Copiar prompt** e cole no Claude, ChatGPT ou Gemini.
3. Cole a resposta em **Diagramação IA → Trazer HTML gerado em outra IA**.
4. Imprima ou salve em PDF.

O rascunho fica salvo automaticamente no navegador. Para guardar ou
trocar de computador, use **Salvar .json** e **Abrir .json**.

---

## Estrutura do repositório

```
/
├── index.html                          # ★ o estúdio inteiro (marca, dados, prévia, prompt, IA)
├── prompts/
│   ├── editorial-system-prompt.md      # persona completa, para ferramentas com system prompt
│   └── exemplos-conversa.md            # fluxos de uso recomendados
├── docs/
│   └── brand-guidelines.md             # guia de marca para humanos
├── samples/
│   ├── DX-2026-0147.json               # proposta-exemplo (abra pelo botão Abrir .json)
│   └── DX-2026-0147-prompt.md          # prompt-exemplo gerado
└── README.md
```

Dentro de `index.html`, o `<script>` está dividido em blocos nomeados:
`BRAND` (identidade), `DADOS_EXEMPLO`, `SECOES` (estrutura e direção
editorial por seção), gerador de prompt, prévia A4 e diagramação pela IA.

---

## O que torna o sistema específico à Delta

- **`BRAND` é a lei.** Paleta, tipografia, grid, voz e proibições vivem
  num só objeto. Qualquer mudança gera um novo hash de identidade
  (hoje `DX-DQE5ZF`), carimbado em cada proposta.
- **Voz codificada.** Clichês proibidos e pilares de redação vão para a
  IA em toda diagramação.
- **Grid editorial de verdade.** A4 retrato, margens assimétricas,
  baseline, 12 colunas.
- **Nenhum ícone pictórico.** Hierarquia 100% tipográfica.
- **Fotografia é placeholder.** A foto final é inserida pela direção de
  arte; a IA nunca gera imagens.

---

## Convenções do formulário

- Códigos de proposta no formato `DX-AAAA-NNNN`.
- Narrativa: parágrafos separados por uma linha em branco.
- Programa: uma linha por dia, `Título | destaque | destaque`.
- Inclusões: uma por linha, `Nome — descrição`.
- Parcelas: `Descrição | percentual`. O estúdio avisa se não somarem 100%.

---

## Governança

- `BRAND` só muda por decisão conjunta de direção criativa e direção de curadoria.
- Toda proposta é confidencial. Nunca anexo, sempre link privado.
- A pasta `samples/` é instrucional; propostas reais ficam fora deste repositório.

Uso interno Delta Experiences. Não distribuir.
