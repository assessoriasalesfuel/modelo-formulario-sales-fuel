# Como criar o formulário para um cliente novo

Tempo estimado: 30 a 60 minutos (mais o tempo do domínio propagar).

---

## 1. Criar o repositório do cliente

1. No GitHub, abra o repositório do molde e clique em **Use this template → Create a new repository**.
   (Se o botão não aparecer: no molde, vá em **Settings** e marque **Template repository**.)
2. Dê um nome como `formulario-NOME-DO-CLIENTE` e marque **Private**.

---

## 2. Preencher o `config.js`

Tudo do cliente fica no arquivo **`config.js`** (dá para editar direto no GitHub, no lápis ✏️):

| Campo | O que colocar |
|---|---|
| `empresa` | Nome do cliente (aparece no topo e na aba do navegador) |
| `logo` | Nome do arquivo da logo dentro de `public/` (ex.: `logo.png`) |
| `cores` | Cores da marca do cliente (principal, destaque, fundo…) |
| `textos` | Título, subtítulo, selos, botões e mensagens finais |
| `perguntas` | As perguntas, na ordem. Quantas quiser |
| `contato` | Qual pergunta vai para **Nome**, **Telefone** e **E-mail** do contato na Bolten |
| `qualificacao` | As respostas que tornam o lead **não qualificado**. Sem qualificação: `qualificacao: null` |
| `pixelMeta` | Código do pixel do cliente. Sem pixel: `pixelMeta: null` |

Cuidados:
- Nas regras de `qualificacao`, escreva as opções **exatamente** como estão em `perguntas` (mesmas letras, acentos e espaços).
- O `id` de cada pergunta: curto, sem espaços e sem acentos (ex.: `faturamento`).
- **Nunca** coloque a chave da Bolten no `config.js` nem em nenhum arquivo do GitHub.

## 3. Trocar a logo e os ícones

Substitua estes arquivos na pasta `public/` (mesmos nomes):

| Arquivo | Para que serve | Tamanho |
|---|---|---|
| `logo.png` | Logo no topo do formulário | fundo transparente, ~360 px de largura |
| `favicon.ico` | Ícone da aba do navegador | 16, 32 e 48 px |
| `icon-192.png` | Ícone ao salvar na tela inicial (Android) | 192 × 192 px |
| `apple-touch-icon.png` | Ícone ao salvar na tela inicial (iPhone) | 180 × 180 px, **fundo branco** |

Dica: peça ao Claude Code "gere o favicon e os ícones a partir da logo".

---

## 4. Preparar a Bolten do cliente

### 4.1 Criar a chave de API

1. Na sua **Área do Parceiro** da Bolten, abra **Chaves de API**.
2. Clique em **+ API Key** e dê o **nome do cliente** (ex.: `Clínica Exemplo`).
3. Clique em **Gerar** e copie a chave na hora (ela não aparece de novo).

> **Crie uma chave por cliente.** Assim, se precisar cancelar a de um cliente, os outros continuam funcionando.

### 4.2 Descobrir os códigos do funil e dos contatos

No Windows, abra o **PowerShell** e rode um comando de cada vez (a Bolten aceita 1 requisição por segundo):

```powershell
$h = @{ Authorization = "Bearer COLE_A_CHAVE_AQUI" }

# 1) Projetos: anote o id do projeto do cliente
(Invoke-RestMethod "https://app.bolten.io/clients/api/v1/projects" -Headers $h).items | Format-Table id, name

# 2) Módulos do projeto: o de categoria opportunity_management é o FUNIL; o de contact_management são os CONTATOS
(Invoke-RestMethod "https://app.bolten.io/clients/api/v1/projects/ID_DO_PROJETO/components" -Headers $h).items | Format-Table id, name, category

# 3) Colunas do funil (os nomes exatos das etapas)
((Invoke-RestMethod "https://app.bolten.io/kanban/api/v1/ID_DO_FUNIL/schema" -Headers $h).attributes | Where-Object name -eq "Status").available_values

# 4) Campos do contato (precisam bater com os nomes em "contato" do config.js)
(Invoke-RestMethod "https://app.bolten.io/contact/api/v1/ID_DOS_CONTATOS/schema" -Headers $h).attributes | Format-Table name
```

Confira:
- o funil tem os campos **Status** e **Observação**;
- os campos do contato têm os mesmos nomes usados em `contato` no `config.js` (ex.: `Nome`, `Telefone`, `E-mail`);
- existem as colunas para os qualificados (ex.: `Novo lead`) e, se tiver qualificação, para os não qualificados (ex.: `Não qualificado`).

---

## 5. Criar o app no EasyPanel

1. No EasyPanel, crie um **App** novo com o nome do cliente.
2. Em **Source / Fonte**, escolha **GitHub** e selecione o repositório do cliente, branch `main`.
3. Em **Build**, use **Dockerfile**.
4. Em **Environment / Ambiente**, cadastre as variáveis:

```
BOLTEN_API_KEY=a chave criada no passo 4.1
BOLTEN_FUNIL_ID=id do módulo do funil
BOLTEN_CONTATOS_ID=id do módulo de contatos
BOLTEN_ETAPA=coluna dos qualificados (ex.: Novo lead)
BOLTEN_ETAPA_DESQUALIFICADO=coluna dos não qualificados (ex.: Não qualificado)
```
   Sem qualificação no `config.js`, a última pode ficar de fora.

5. Clique em **Implantar / Deploy**.
6. Abra os **Logs** e confira:
   - aparece `— formulário rodando em http://localhost:3000`;
   - **não** aparece nenhuma linha `Aviso (config.js)` (se aparecer, corrija o `config.js` como o aviso indica).

---

## 6. Apontar o domínio do cliente para a VPS

1. Escolha o endereço, por exemplo `formulario.clientedominio.com.br`.
2. Descubra o **IP da VPS** no painel da Hostinger (VPS → Visão geral).
3. No painel onde o domínio do cliente está registrado (Registro.br, Hostinger, Cloudflare, GoDaddy…), crie um registro DNS:

| Tipo | Nome | Valor |
|---|---|---|
| **A** | `formulario` | IP da VPS |

   Se o domínio usa **Cloudflare**, deixe a nuvem **cinza** (somente DNS) nesse registro.

4. No EasyPanel, no app do cliente, abra **Domains / Domínios**, adicione `formulario.clientedominio.com.br`, porta **3000**, com **HTTPS** ligado.
5. Aguarde a propagação (de alguns minutos a algumas horas). O cadeado (HTTPS) aparece sozinho quando o domínio passa a apontar para a VPS.

---

## 7. Teste final

1. Abra o endereço do cliente e preencha com o nome **TESTE - apagar**:
   - um lead qualificado e um não qualificado (se houver qualificação).
2. Na Bolten do cliente, confira a coluna de cada um, o contato e a Observação.
3. Se houver pixel: no **Gerenciador de Eventos** da Meta, aba **Testar eventos**, confira `PageView`, `IniciouFormulario`, `Lead` e `LeadQualificado`.
4. Apague os leads de teste na Bolten.

Pronto: o formulário do cliente está no ar. 🎉

---

### Se algo der errado

- **Lead não aparece na Bolten:** veja os Logs do EasyPanel. Procure `Falha ao` ou `LEAD NÃO SALVO NA BOLTEN` (o lead fica escrito ali para cadastrar à mão).
- **Formulário não abre:** veja nos Logs se aparece `Faltam variáveis da Bolten`.
- **Coluna errada:** confira se `BOLTEN_ETAPA` e `BOLTEN_ETAPA_DESQUALIFICADO` estão escritas exatamente como na Bolten.
