// Delta Experiences — Estrutura canônica de uma proposta editorial
// Cada seção define: id, título, direção editorial, campos de entrada,
// instruções para a IA de design, e um gerador de copy padrão.

export const SECOES = [
  {
    id: "capa",
    titulo: "Capa",
    pagina: 1,
    direcao:
      "Página full-bleed Midnight. Fotografia cinematográfica alinhada ao destino, " +
      "escurecida 35%. Logotipo Delta Experiences no topo em Ouro Antigo. " +
      "Título da experiência em Playfair Display 72pt, centralizado no terço inferior. " +
      "Nome do cliente discreto em Inter caps 10pt, tracking 0.3em.",
    campos: ["titulo", "cliente_nome", "data_envio", "codigo_proposta", "imagem_capa_direcao"],
    conteudo(d) {
      return {
        titulo: d.titulo,
        linha_destaque: d.subtitulo || "Uma experiência Delta",
        cliente_nome: d.cliente?.nome,
        data: d.data_envio,
        codigo: d.codigo_proposta,
      };
    },
  },
  {
    id: "carta",
    titulo: "Carta de Abertura",
    pagina: 2,
    direcao:
      "Página Paper, texto único em Cormorant Garamond 14pt, interlinha 22pt, coluna de 92mm centralizada. " +
      "Assinatura manuscrita digitalizada no final em Charcoal 60%. " +
      "Capitular em Playfair 72pt Ouro Antigo na primeira letra. " +
      "Sem imagens — a tipografia é o personagem.",
    campos: ["cliente_nome", "contexto", "assinante_nome", "assinante_cargo"],
    conteudo(d) {
      const nome = d.cliente?.primeiro_nome || d.cliente?.nome?.split(" ")[0] || "";
      const contexto = d.contexto_abertura ||
        "Esta proposta nasceu de uma conversa — e das camadas que ela deixou entrever.";
      return {
        saudacao: `${nome},`,
        corpo: [
          contexto,
          "O que você verá a seguir não é um pacote. É uma curadoria desenhada a quatro mãos — nossa e sua — que respeita o que você já conhece e abre portas para o que ainda não.",
          "Cada detalhe foi pensado para que o único trabalho seu seja o de estar presente.",
        ],
        despedida: "Com atenção,",
        assinante: {
          nome: d.assinante?.nome || "Direção de Curadoria",
          cargo: d.assinante?.cargo || "Delta Experiences",
        },
      };
    },
  },
  {
    id: "visao",
    titulo: "A Experiência",
    pagina: 3,
    direcao:
      "Spread duplo. Página esquerda: fotografia full-bleed. Página direita: Paper, " +
      "título em Playfair 48pt Midnight no alto, três parágrafos de narrativa editorial " +
      "em Cormorant 13pt. Pull quote centralizada entre o segundo e terceiro parágrafo, " +
      "em Playfair 28pt itálico, Midnight, filetes de 1pt Ouro acima e abaixo.",
    campos: ["destino", "resumo", "pull_quote", "duracao", "convidados"],
    conteudo(d) {
      return {
        titulo: d.destino_titulo || d.destino,
        subtitulo: d.destino_subtitulo || "",
        narrativa: d.narrativa || [],
        pull_quote: d.pull_quote || "",
        meta: {
          duracao: d.duracao,
          convidados: d.convidados,
          epoca: d.epoca,
        },
      };
    },
  },
  {
    id: "programa",
    titulo: "Programa",
    pagina: 5,
    direcao:
      "Uma página por dia. Cabeçalho: 'DIA 01' em Inter caps 10pt Ouro, com filete à direita. " +
      "Título do dia em Playfair 36pt Midnight. Linha do tempo vertical sutil em Mist à esquerda, " +
      "com pequenos marcadores circulares Ouro nos horários-chave. Cada bloco de atividade: " +
      "horário em Inter 10pt tabular, descrição em Cormorant 12pt. Fotografia pequena opcional " +
      "em uma única posição, metade da coluna, com legenda em caps 8pt tracking 0.2em.",
    campos: ["dias"],
    conteudo(d) {
      return { dias: d.programa || [] };
    },
  },
  {
    id: "inclusoes",
    titulo: "Inclusões Exclusivas",
    pagina: 10,
    direcao:
      "Página Bone. Título em Playfair 42pt. Grade de 2 colunas, cada item com ícone de linha " +
      "fina em Ouro (1pt), nome em Inter 11pt caps tracking 0.18em, descrição em Cormorant 12pt. " +
      "Nunca mais do que 12 itens por página — divida se for maior.",
    campos: ["inclusoes"],
    conteudo(d) {
      return { inclusoes: d.inclusoes || [] };
    },
  },
  {
    id: "investimento",
    titulo: "Investimento",
    pagina: 12,
    direcao:
      "Página Paper. Título 'Investimento' discreto no topo em Inter caps 10pt tracking 0.25em. " +
      "Valor principal em Playfair 96pt Midnight, alinhado à direita, com moeda em superscript. " +
      "Linha explicativa abaixo em Cormorant 14pt. Tabela de condições em Inter 10pt tabular-nums, " +
      "sem bordas, apenas filete Ouro 0.5pt entre linhas. Nenhum 'R$' em caixa alta — formatação " +
      "deve respirar.",
    campos: ["valor_total", "moeda", "parcelas", "o_que_esta_incluido", "o_que_nao_esta"],
    conteudo(d) {
      return {
        valor: d.investimento?.valor,
        moeda: d.investimento?.moeda || "BRL",
        por_convidado: d.investimento?.por_convidado,
        parcelas: d.investimento?.parcelas || [],
        inclui: d.investimento?.inclui || [],
        nao_inclui: d.investimento?.nao_inclui || [],
      };
    },
  },
  {
    id: "condicoes",
    titulo: "Condições",
    pagina: 14,
    direcao:
      "Página Bone. Texto de condições em duas colunas, Inter 9.5pt, interlinha 15pt, Charcoal 85%. " +
      "Subtítulos em Inter caps 9pt Ouro, tracking 0.22em. Sem caixas nem fundos cinza — a hierarquia " +
      "é tipográfica. Reservado, legal, mas respirando como um contrato de alfaiataria.",
    campos: ["validade", "politica_cancelamento", "pagamento", "sigilo"],
    conteudo(d) {
      return {
        validade: d.condicoes?.validade,
        pagamento: d.condicoes?.pagamento,
        cancelamento: d.condicoes?.cancelamento,
        sigilo: d.condicoes?.sigilo ||
          "Esta proposta e seu conteúdo são confidenciais. Compartilhamento restrito ao destinatário.",
      };
    },
  },
  {
    id: "proximos",
    titulo: "Próximos Passos",
    pagina: 15,
    direcao:
      "Página Midnight. Três passos numerados em algarismos romanos Ouro 48pt. Título de cada passo " +
      "em Playfair 22pt Bone. Descrição em Cormorant 12pt Bone 85%. Call-to-action discreto no rodapé " +
      "em Inter caps 10pt Ouro, tracking 0.3em, com telefone e email do contato dedicado.",
    campos: ["contato_nome", "contato_email", "contato_telefone", "prazo_resposta"],
    conteudo(d) {
      const prazo = d.condicoes?.validade || "15 dias";
      return {
        passos: [
          { numero: "I",   titulo: "Confirmação", descricao: `Retorne este documento assinado ou envie um aceite por email em até ${prazo}.` },
          { numero: "II",  titulo: "Reserva",     descricao: "Após o aceite, iniciamos imediatamente as reservas em sua rede de parceiros fechados." },
          { numero: "III", titulo: "Produção",    descricao: "Um gerente dedicado acompanha você até o último detalhe, com reuniões quinzenais." },
        ],
        contato: d.contato || {},
      };
    },
  },
  {
    id: "colofao",
    titulo: "Colofão",
    pagina: 16,
    direcao:
      "Última página. Paper. Centralizado verticalmente. Logotipo em Ouro, pequeno. " +
      "Abaixo, em Inter caps 8pt tracking 0.3em Charcoal: código da proposta, data de emissão, " +
      "versão da identidade visual, nome do curador responsável. Nada mais.",
    campos: ["codigo_proposta", "data_envio", "curador"],
    conteudo(d) {
      return {
        codigo: d.codigo_proposta,
        data: d.data_envio,
        curador: d.assinante?.nome,
      };
    },
  },
];

export function montarDocumento(dados) {
  return SECOES.map((s) => ({
    id: s.id,
    titulo: s.titulo,
    pagina_sugerida: s.pagina,
    direcao: s.direcao,
    conteudo: s.conteudo(dados),
  }));
}
