// =====================================================================
// Lógica do formulário. NÃO é preciso mexer aqui para um cliente novo:
// perguntas, textos, cores, pixel e qualificação ficam no config.js
// (o servidor coloca essas configurações na página como window.CONFIG).
// =====================================================================

const { perguntas: PERGUNTAS, textos: TEXTOS, contato: CONTATO, pixelMeta: PIXEL_ID, whatsapp: WHATSAPP } = window.CONFIG;

const tela = document.getElementById("tela");
const barra = document.getElementById("progresso-barra");
const respostas = {};
let atual = 0;
let trocando = false; // evita pular telas com clique duplo

function escapar(texto) {
  const div = document.createElement("div");
  div.textContent = texto;
  return div.innerHTML;
}

function atualizarProgresso(fracao) {
  barra.style.width = fracao * 100 + "%";
}

// Troca o conteúdo da tela com uma transição suave
function mostrar(html, aoMostrar) {
  trocando = true;
  tela.classList.add("oculta");
  setTimeout(() => {
    trocando = false;
    tela.innerHTML = html;
    window.scrollTo(0, 0);
    tela.classList.remove("oculta");
    if (aoMostrar) aoMostrar();
  }, 250);
}

// Eventos do pixel só quando há pixel configurado
function pixel(...args) {
  if (PIXEL_ID && window.fbq) fbq(...args);
}

// ----- Abertura -----
function mostrarAbertura() {
  atualizarProgresso(0);
  mostrar(
    `<h1>${escapar(TEXTOS.titulo)}</h1>
     <p class="subtitulo">${escapar(TEXTOS.subtitulo)}</p>
     <div class="selos">${(TEXTOS.selos || []).map((s) => `<span class="selo">${escapar(s)}</span>`).join("")}</div>
     <button class="botao" id="comecar">${escapar(TEXTOS.botaoComecar)}</button>`,
    () => {
      const botao = document.getElementById("comecar");
      botao.addEventListener("click", () => {
        pixel("trackCustom", "IniciouFormulario");
        mostrarPergunta(0);
      });
      botao.focus();
    }
  );
}

// ----- Perguntas -----
function mostrarPergunta(indice) {
  atual = indice;
  const p = PERGUNTAS[indice];
  atualizarProgresso(indice / PERGUNTAS.length);

  const cabecalho = `
    <p class="contador">Pergunta ${indice + 1} de ${PERGUNTAS.length}</p>
    <h2>${escapar(p.pergunta)}</h2>`;
  const voltar = `<button type="button" class="voltar" id="voltar">${escapar(TEXTOS.botaoVoltar)}</button>`;
  const continuar = `<button type="submit" class="botao">${escapar(TEXTOS.botaoContinuar)}</button>`;

  if (p.tipo === "escolha") {
    const opcoes = p.opcoes
      .map((opcao) => {
        const classe = respostas[p.id] === opcao ? "opcao selecionada" : "opcao";
        return `<button type="button" class="${classe}">${escapar(opcao)}</button>`;
      })
      .join("");

    mostrar(`${cabecalho}<div class="opcoes">${opcoes}</div>${voltar}`, () => {
      const botoes = tela.querySelectorAll(".opcao");
      botoes.forEach((botao, i) => {
        botao.addEventListener("click", () => {
          respostas[p.id] = p.opcoes[i];
          avancar();
        });
      });
      // Sem foco automático: nenhuma opção aparece destacada antes do clique
      document.getElementById("voltar").addEventListener("click", voltarTela);
    });
    return;
  }

  if (p.tipo === "multipla") {
    const marcadas = new Set(respostas[p.id] || []);
    const opcoes = p.opcoes
      .map((opcao) => {
        const classe = marcadas.has(opcao) ? "opcao marcavel selecionada" : "opcao marcavel";
        return `<button type="button" class="${classe}">${escapar(opcao)}</button>`;
      })
      .join("");

    mostrar(
      `${cabecalho}
       <p class="aviso">${escapar(TEXTOS.avisoMultipla)}</p>
       <form id="form" novalidate>
         <div class="opcoes">${opcoes}</div>
         <p class="erro" id="erro"></p>
         ${continuar}
       </form>
       ${voltar}`,
      () => {
        const form = document.getElementById("form");
        const erro = document.getElementById("erro");
        const botoes = tela.querySelectorAll(".opcao");

        botoes.forEach((botao, i) => {
          // Clique (ou espaço) marca/desmarca
          botao.addEventListener("click", () => {
            const opcao = p.opcoes[i];
            if (marcadas.has(opcao)) marcadas.delete(opcao);
            else marcadas.add(opcao);
            botao.classList.toggle("selecionada");
            erro.textContent = "";
          });
          // Enter avança
          botao.addEventListener("keydown", (e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              form.requestSubmit();
            }
          });
        });

        form.addEventListener("submit", (e) => {
          e.preventDefault();
          if (marcadas.size === 0) {
            erro.textContent = "Escolha pelo menos uma opção.";
            return;
          }
          // Mantém a ordem da lista de opções
          respostas[p.id] = p.opcoes.filter((opcao) => marcadas.has(opcao));
          avancar();
        });

        document.getElementById("voltar").addEventListener("click", voltarTela);
      }
    );
    return;
  }

  const atributos = {
    texto: p.id === CONTATO.Nome ? 'type="text" autocomplete="name"' : 'type="text"',
    whatsapp: 'type="tel" inputmode="numeric" autocomplete="tel" placeholder="(99) 99999-9999"',
    email: 'type="email" inputmode="email" autocomplete="email" placeholder="nome@exemplo.com"',
  }[p.tipo];

  mostrar(
    `${cabecalho}
     <form id="form" novalidate>
       <input class="campo" id="campo" ${atributos}>
       <p class="erro" id="erro"></p>
       ${continuar}
     </form>
     ${voltar}`,
    () => {
      const campo = document.getElementById("campo");
      campo.value = respostas[p.id] || "";

      if (p.tipo === "whatsapp") {
        campo.addEventListener("input", () => {
          campo.value = mascaraWhatsapp(campo.value);
        });
      }
      campo.addEventListener("input", () => limparErro(campo));

      // Enter dentro do campo envia o form, que avança
      document.getElementById("form").addEventListener("submit", (e) => {
        e.preventDefault();
        const valor = campo.value.trim();
        const erro = validar(p.tipo, valor);
        if (erro) {
          mostrarErro(campo, erro);
          return;
        }
        respostas[p.id] = valor;
        avancar();
      });

      document.getElementById("voltar").addEventListener("click", voltarTela);
      campo.focus();
    }
  );
}

function avancar() {
  if (trocando) return;
  if (atual < PERGUNTAS.length - 1) {
    mostrarPergunta(atual + 1);
  } else {
    enviar();
  }
}

function voltarTela() {
  if (trocando) return;
  if (atual > 0) {
    mostrarPergunta(atual - 1);
  } else {
    mostrarAbertura();
  }
}

// ----- Validação -----
function validar(tipo, valor) {
  if (!valor) return "Por favor, preencha este campo.";
  if (tipo === "email" && !/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(valor)) {
    return "Digite um e-mail válido.";
  }
  if (tipo === "whatsapp" && valor.replace(/\D/g, "").length !== 11) {
    return "Digite um WhatsApp válido com DDD.";
  }
  return "";
}

function mascaraWhatsapp(valor) {
  const d = valor.replace(/\D/g, "").slice(0, 11);
  if (d.length === 0) return "";
  if (d.length <= 2) return `(${d}`;
  if (d.length <= 7) return `(${d.slice(0, 2)}) ${d.slice(2)}`;
  return `(${d.slice(0, 2)}) ${d.slice(2, 7)}-${d.slice(7)}`;
}

function mostrarErro(campo, mensagem) {
  campo.classList.add("invalido");
  document.getElementById("erro").textContent = mensagem;
  campo.focus();
}

function limparErro(campo) {
  campo.classList.remove("invalido");
  document.getElementById("erro").textContent = "";
}

// ----- Pixel da Meta -----
let leadRegistrado = false;

// Dispara "Lead" (e "LeadQualificado") uma vez só por visita, mesmo com clique duplo ou página
// atualizada. Ao fechar e abrir de novo, conta de novo (sessionStorage).
function registrarLeadNoPixel(qualificado) {
  if (!PIXEL_ID) return;
  try {
    if (sessionStorage.getItem("leadRegistrado")) leadRegistrado = true;
  } catch (e) {}
  if (leadRegistrado) return;
  leadRegistrado = true;
  try {
    sessionStorage.setItem("leadRegistrado", "1");
  } catch (e) {}

  // Correspondência avançada manual: o pixel protege (hash) os dados antes de enviar.
  // Os dados vêm das perguntas indicadas em "contato" no config.js.
  const valor = (campo) => String(respostas[CONTATO[campo]] || "").trim();
  const telefone = valor("Telefone").replace(/\D/g, "");
  pixel("init", PIXEL_ID, {
    em: valor("E-mail").toLowerCase(),
    ph: telefone ? "55" + telefone : "",
    fn: valor("Nome").split(/\s+/)[0].toLowerCase(),
  });

  pixel("track", "Lead");
  if (qualificado === true) pixel("trackCustom", "LeadQualificado");
}

// ----- Envio -----
async function enviar() {
  atualizarProgresso(1);
  mostrar(`<h2>Enviando...</h2>`);

  try {
    const resposta = await fetch("/api/lead", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ respostas }),
    });
    if (!resposta.ok) throw new Error("Falha no envio");
    const resultado = await resposta.json();
    registrarLeadNoPixel(resultado.qualificado);
    mostrarFinal(resultado.qualificado);
  } catch (e) {
    mostrarFalha();
  }
}

// qualificado: true, false ou null (sem qualificação no config.js)
function mostrarFinal(qualificado) {
  const texto =
    qualificado === null ? TEXTOS.final : qualificado ? TEXTOS.finalQualificado : TEXTOS.finalNaoQualificado;

  // Botão de WhatsApp: para todos sem qualificação; com qualificação, só para o qualificado
  const linkWhatsapp =
    WHATSAPP && qualificado !== false
      ? `https://wa.me/${String(WHATSAPP.numero).replace(/\D/g, "")}?text=${encodeURIComponent(WHATSAPP.mensagem || "")}`
      : "";
  const botaoWhatsapp = linkWhatsapp
    ? `<a class="botao" id="whatsapp" href="${escapar(linkWhatsapp)}" target="_blank" rel="noopener">${escapar(WHATSAPP.textoBotao)}</a>`
    : "";

  mostrar(
    `<div class="final">
       <svg class="check" viewBox="0 0 72 72" aria-hidden="true">
         <defs>
           <linearGradient id="check-gradiente" x1="0" y1="0" x2="1" y2="1">
             <stop offset="0" stop-color="var(--cor-principal)" />
             <stop offset="1" stop-color="var(--cor-destaque)" />
           </linearGradient>
         </defs>
         <circle class="check-circulo" cx="36" cy="36" r="34" />
         <path class="check-traco" d="M22 37 l9 9 l19 -20" />
       </svg>
       <h2>${escapar(texto)}</h2>
       ${botaoWhatsapp}
     </div>`,
    () => {
      const botao = document.getElementById("whatsapp");
      if (botao) botao.addEventListener("click", () => pixel("track", "Contact"));
    }
  );
}

function mostrarFalha() {
  mostrar(
    `<h2>Ops, não conseguimos enviar agora.</h2>
     <p class="subtitulo">Verifique sua conexão e tente de novo. Suas respostas foram mantidas.</p>
     <button class="botao" id="tentar">Tentar novamente</button>
     <button type="button" class="voltar" id="voltar">${escapar(TEXTOS.botaoVoltar)}</button>`,
    () => {
      const botao = document.getElementById("tentar");
      botao.addEventListener("click", enviar);
      document.getElementById("voltar").addEventListener("click", () => mostrarPergunta(atual));
      botao.focus();
    }
  );
}

// Enter avança mesmo sem nenhum campo ou opção selecionado (ex.: pergunta de várias respostas)
document.addEventListener("keydown", (e) => {
  const form = document.getElementById("form");
  if (e.key === "Enter" && form && document.activeElement === document.body) {
    e.preventDefault();
    form.requestSubmit();
  }
});

mostrarAbertura();
