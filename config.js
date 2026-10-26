// =====================================================================
// CONFIGURAÇÃO DO FORMULÁRIO
// Tudo que muda de um cliente para outro fica neste arquivo.
// A chave e os códigos da Bolten NÃO ficam aqui: eles vão nas variáveis
// do EasyPanel (veja COMO-CRIAR-PARA-CLIENTE.md).
// =====================================================================

module.exports = {
  // Nome da empresa (aparece no topo, ao lado da logo)
  empresa: "Assessoria Sales Fuel",

  // Título da aba do navegador. Para usar o nome da empresa, use:  tituloAba: null,
  tituloAba: null,

  // Arquivo da logo, dentro da pasta public/. Sem logo (só o nome no topo), use:  logo: null,
  logo: "logo.png",

  // Cores do formulário (use as cores da logo do cliente)
  cores: {
    principal: "#084bfd", // botões, destaques e opções marcadas
    principalHover: "#0639c4", // botão ao passar o mouse (um tom mais escuro da principal)
    destaque: "#02dceb", // segunda cor: barra de progresso, brilho do fundo e ✓ final
    fundo: "#f3f7ff", // fundo da página
    selecionadaFundo: "#eef3ff", // fundo da opção marcada, dos selos e do botão Voltar
    texto: "#0b1a3a", // títulos e textos
    textoSecundario: "#5b6b8c", // textos de apoio
    borda: "#d5def0", // bordas dos campos e opções
  },

  // Textos da tela de abertura, dos botões e da tela final
  textos: {
    titulo: "Quer mais clientes chegando todos os dias?",
    subtitulo:
      "Responda algumas perguntas rápidas e descubra se podemos ajudar o seu negócio a vender mais com anúncios.",
    selos: ["Leva 2 minutos", "Sem compromisso"], // pode ser [] para não mostrar selos
    botaoComecar: "Quero começar →",
    botaoContinuar: "Continuar →",
    botaoVoltar: "← Voltar",
    avisoMultipla: "Você pode marcar mais de uma opção.",

    // Mensagens finais quando HÁ qualificação
    finalQualificado: "Tudo certo! Recebemos suas respostas e vamos entrar em contato pelo seu WhatsApp em breve.",
    finalNaoQualificado:
      "Obrigado pelas respostas! Pelo que você nos contou, este ainda não é o momento ideal para trabalharmos juntos.",

    // Mensagem final quando NÃO HÁ qualificação (qualificacao: null)
    final: "Tudo certo! Recebemos suas respostas e vamos entrar em contato pelo seu WhatsApp em breve.",
  },

  // Perguntas, na ordem em que aparecem (quantas quiser).
  // - id: um nome curto, sem espaços nem acentos (usado em "contato" e "qualificacao")
  // - tipo: "texto", "whatsapp", "email", "escolha" (uma resposta) ou "multipla" (várias respostas)
  // - pergunta: o texto mostrado na tela
  // - opcoes: só para "escolha" e "multipla"
  perguntas: [
    { id: "nome", tipo: "texto", pergunta: "Qual seu nome?" },
    { id: "whatsapp", tipo: "whatsapp", pergunta: "Qual é o seu WhatsApp?" },
    { id: "email", tipo: "email", pergunta: "Qual é o seu melhor e-mail?" },
    { id: "empresa", tipo: "texto", pergunta: "Qual é o nome da sua empresa e o que ela vende?" },
    {
      id: "faturamento",
      tipo: "escolha",
      pergunta: "Qual a média de faturamento mensal da sua empresa?",
      opcoes: [
        "Menos de R$ 10 mil",
        "De R$ 10 mil a R$ 30 mil",
        "Mais de R$ 30 mil até R$ 60 mil",
        "Mais de R$ 60 mil até R$ 100 mil",
        "Mais de R$ 100 mil",
      ],
    },
    {
      id: "origem_clientes",
      tipo: "multipla",
      pergunta: "Hoje, como os seus clientes chegam até você?",
      opcoes: [
        "Por indicação de outras pessoas",
        "Pelo Instagram, Facebook ou outras redes",
        "Por anúncios pagos",
        "Chegam sozinhos, depende do movimento",
        "De outro jeito",
      ],
    },
    {
      id: "dificuldade",
      tipo: "escolha",
      pergunta: "O que mais atrapalha você a vender mais hoje?",
      opcoes: [
        "Entram poucos clientes",
        "Chegam clientes, mas poucos compram",
        "Uma hora vende bem, outra hora cai",
        "Já tentei anúncios e não deu certo",
        "Quero anunciar, mas não sei por onde começar",
        "Outro motivo",
      ],
    },
    {
      id: "verba",
      tipo: "escolha",
      pergunta: "Qual valor você consegue reservar por mês para marketing?",
      opcoes: [
        "Menos de R$ 1.200",
        "De R$ 1.200 a R$ 2.000",
        "Mais de R$ 2.000 até R$ 3.000",
        "Mais de R$ 3.000 até R$ 4.000",
        "Mais de R$ 4.000",
        "Ainda não sei",
      ],
    },
  ],

  // Quais perguntas vão para o contato na Bolten.
  // À esquerda: nome EXATO do campo do contato na Bolten. À direita: o id da pergunta.
  contato: {
    Nome: "nome",
    Telefone: "whatsapp",
    "E-mail": "email",
  },

  // Qualificação: o lead é NÃO QUALIFICADO se responder alguma das opções listadas.
  // Formato: { id_da_pergunta: ["opção que desqualifica", ...], ... }
  // Para não ter qualificação, use:  qualificacao: null,
  qualificacao: {
    desqualificaSe: {
      faturamento: ["Menos de R$ 10 mil"],
      verba: ["Menos de R$ 1.200"],
    },
  },

  // Código do pixel da Meta. Para não ter pixel, use:  pixelMeta: null,
  pixelMeta: "1334903205155707",

  // Botão de WhatsApp na tela final. Com qualificação, só o qualificado vê o botão.
  // Ao clicar, o pixel registra o evento "Contact" (se houver pixel).
  // Para ter o botão, use:
  //   whatsapp: {
  //     numero: "5511999999999", // com 55 e DDD, só números
  //     mensagem: "Olá! Acabei de preencher o formulário.", // texto que já vem escrito na conversa
  //     textoBotao: "Falar no WhatsApp →",
  //   },
  // Para não ter botão, use:  whatsapp: null,
  whatsapp: null,
};
