const express = require("express");
const fs = require("fs");
const path = require("path");
const config = require("./config");

const app = express();
const PORTA = process.env.PORT || 3000;

const BOLTEN_URL = "https://app.bolten.io";
const { BOLTEN_API_KEY, BOLTEN_FUNIL_ID, BOLTEN_CONTATOS_ID, BOLTEN_ETAPA } = process.env;

if (!BOLTEN_API_KEY || !BOLTEN_FUNIL_ID || !BOLTEN_CONTATOS_ID || !BOLTEN_ETAPA) {
  console.error("Faltam variáveis da Bolten (no arquivo .env ou no painel do EasyPanel).");
  process.exit(1);
}

// Coluna dos não qualificados. Se faltar, eles vão para BOLTEN_ETAPA (o formulário continua funcionando).
const BOLTEN_ETAPA_DESQUALIFICADO = process.env.BOLTEN_ETAPA_DESQUALIFICADO || BOLTEN_ETAPA;
if (config.qualificacao && !process.env.BOLTEN_ETAPA_DESQUALIFICADO) {
  console.warn(`Aviso: BOLTEN_ETAPA_DESQUALIFICADO não definida. Não qualificados irão para "${BOLTEN_ETAPA}".`);
}

// Avisa no terminal sobre erros de digitação no config.js (ids ou opções que não existem)
const perguntaPorId = Object.fromEntries(config.perguntas.map((p) => [p.id, p]));
for (const [campo, id] of Object.entries(config.contato)) {
  if (!perguntaPorId[id]) console.warn(`Aviso (config.js): contato "${campo}" aponta para a pergunta "${id}", que não existe.`);
}
for (const [id, opcoes] of Object.entries(config.qualificacao?.desqualificaSe || {})) {
  if (!perguntaPorId[id]) {
    console.warn(`Aviso (config.js): a qualificação usa a pergunta "${id}", que não existe.`);
    continue;
  }
  for (const opcao of opcoes) {
    if (!(perguntaPorId[id].opcoes || []).includes(opcao)) {
      console.warn(`Aviso (config.js): a opção "${opcao}" não existe na pergunta "${id}".`);
    }
  }
}

// ----- Página -----
// O index.html é um molde: o servidor coloca nele o nome, a logo, as cores, o pixel e as configurações.
const escaparHtml = (texto) =>
  String(texto).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]);

function montarPagina() {
  const cores = Object.entries(config.cores)
    .map(([nome, valor]) => `--cor-${nome.replace(/[A-Z]/g, (m) => "-" + m.toLowerCase())}: ${valor};`)
    .join(" ");

  const pixel = config.pixelMeta
    ? `<script>
    !function(f,b,e,v,n,t,s)
    {if(f.fbq)return;n=f.fbq=function(){n.callMethod?
    n.callMethod.apply(n,arguments):n.queue.push(arguments)};
    if(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version='2.0';
    n.queue=[];t=b.createElement(e);t.async=!0;
    t.src=v;s=b.getElementsByTagName(e)[0];
    s.parentNode.insertBefore(t,s)}(window, document,'script',
    'https://connect.facebook.net/en_US/fbevents.js');
    fbq('init', '${escaparHtml(config.pixelMeta)}');
    fbq('track', 'PageView');
  </script>
  <noscript><img height="1" width="1" style="display:none"
    src="https://www.facebook.com/tr?id=${escaparHtml(config.pixelMeta)}&ev=PageView&noscript=1"
  /></noscript>`
    : "";

  // Só o que a página precisa (a regra de qualificação fica no servidor)
  const paraPagina = {
    textos: config.textos,
    perguntas: config.perguntas,
    contato: config.contato,
    pixelMeta: config.pixelMeta,
    temQualificacao: Boolean(config.qualificacao),
  };

  // Funções na troca para que "$" nos textos (ex.: "R$") não tenha efeito especial
  return fs
    .readFileSync(path.join(__dirname, "public", "index.html"), "utf8")
    .replaceAll("{{EMPRESA}}", () => escaparHtml(config.empresa))
    .replaceAll("{{LOGO}}", () => escaparHtml(config.logo))
    .replace("{{CORES}}", () => `<style>:root { ${cores} }</style>`)
    .replace("{{PIXEL}}", () => pixel)
    .replace("{{CONFIG}}", () => `<script>window.CONFIG = ${JSON.stringify(paraPagina).replace(/</g, "\\u003c")};</script>`);
}

const PAGINA = montarPagina();

app.use(express.json());
app.get(["/", "/index.html"], (req, res) => res.type("html").send(PAGINA));
app.use(express.static(path.join(__dirname, "public"), { index: false }));

// A Bolten aceita 1 requisição por segundo. Esta fila espaça todas as chamadas.
const INTERVALO_MS = 1100;
let fila = Promise.resolve();

function chamarBolten(metodo, caminho, corpo) {
  const chamada = fila.then(async () => {
    const resposta = await fetch(BOLTEN_URL + caminho, {
      method: metodo,
      headers: {
        Authorization: `Bearer ${BOLTEN_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(corpo),
    });
    const dados = await resposta.json().catch(() => null);
    if (!resposta.ok) {
      throw new Error(`Bolten ${metodo} ${caminho} -> ${resposta.status} ${JSON.stringify(dados)}`);
    }
    return dados;
  });
  fila = chamada.catch(() => {}).then(() => new Promise((r) => setTimeout(r, INTERVALO_MS)));
  return chamada;
}

// Se a Bolten der erro, cada etapa é tentada de novo depois destas esperas (5 tentativas no total).
const ESPERAS_MS = [5000, 30000, 120000, 300000];

async function comTentativas(descricao, funcao) {
  for (let tentativa = 1; ; tentativa++) {
    try {
      return await funcao();
    } catch (erro) {
      const total = ESPERAS_MS.length + 1;
      console.error(`Falha ao ${descricao} (tentativa ${tentativa} de ${total}): ${erro.message}`);
      if (tentativa === total) throw erro;
      await new Promise((r) => setTimeout(r, ESPERAS_MS[tentativa - 1]));
    }
  }
}

// Cria contato + oportunidade na Bolten e associa os dois.
// O contato recebe os campos definidos em config.contato. A oportunidade entra na etapa
// recebida em "etapa", com a qualificação e todas as respostas na Observação.
// Cada etapa tem suas próprias tentativas, então nada é criado em dobro.
// "progresso" guarda o que já foi criado, para o aviso de erro.
async function salvarNaBolten(atributosContato, observacao, etapa, progresso) {
  const contato = await comTentativas("criar o contato", () =>
    chamarBolten("POST", `/contact/api/v1/${BOLTEN_CONTATOS_ID}/contacts`, { attributes: atributosContato })
  );
  progresso.contato = contato.id;
  const oportunidade = await comTentativas("criar a oportunidade", () =>
    chamarBolten("POST", `/kanban/api/v1/${BOLTEN_FUNIL_ID}/opportunities`, {
      attributes: { Status: etapa, Observação: observacao },
    })
  );
  progresso.oportunidade = oportunidade.id;
  await comTentativas("associar o contato à oportunidade", () =>
    chamarBolten("POST", `/kanban/api/v1/${BOLTEN_FUNIL_ID}/opportunities/${oportunidade.id}/contact`, {
      id: contato.id,
    })
  );
  console.log(`Lead salvo na Bolten. Contato: ${contato.id} | Oportunidade: ${oportunidade.id}`);
}

// Qualificação pela regra do config.js. Sem regra (qualificacao: null), devolve null.
function qualificar(respostas) {
  if (!config.qualificacao) return null;
  return !Object.entries(config.qualificacao.desqualificaSe).some(([id, opcoes]) =>
    [].concat(respostas[id] ?? []).some((valor) => opcoes.includes(valor))
  );
}

// Recebe o lead, responde na hora com a qualificação e salva na Bolten por trás.
app.post("/api/lead", (req, res) => {
  const respostas = req.body.respostas;
  if (!respostas || typeof respostas !== "object" || Array.isArray(respostas)) {
    return res.status(400).json({ ok: false });
  }
  console.log("Novo lead recebido:", respostas);

  // Respostas de várias opções viram texto separado por vírgula
  const texto = (id) => [].concat(respostas[id] ?? "").join(", ");

  const qualificado = qualificar(respostas);
  const observacao = [
    ...(qualificado === null ? [] : [qualificado ? "QUALIFICADO" : "NÃO QUALIFICADO"]),
    ...config.perguntas.map((p) => `${p.pergunta}: ${texto(p.id)}`),
  ].join("\n");

  const atributosContato = Object.fromEntries(
    Object.entries(config.contato).map(([campo, id]) => [campo, texto(id)])
  );

  res.json({ ok: true, qualificado });

  const progresso = {};
  const etapa = qualificado === false ? BOLTEN_ETAPA_DESQUALIFICADO : BOLTEN_ETAPA;
  salvarNaBolten(atributosContato, observacao, etapa, progresso).catch(() => {
    // Esgotou as tentativas: deixa tudo no terminal para cadastrar à mão
    const jaCriado = [
      progresso.contato && `contato ${progresso.contato}`,
      progresso.oportunidade && `oportunidade ${progresso.oportunidade}`,
    ].filter(Boolean);
    const aviso = jaCriado.length ? ` (já criado na Bolten: ${jaCriado.join(", ")})` : "";
    console.error(`LEAD NÃO SALVO NA BOLTEN${aviso}. Cadastre à mão:\n${observacao}`);
  });
});

app.listen(PORTA, () => {
  console.log(`${config.empresa} — formulário rodando em http://localhost:${PORTA}`);
});
