# APT RSF Online — Relatório Semanal de Fiscalização (ISA / SGS)

Ferramenta web para o fiscal preencher os dados da semana e gerar, com um
clique, o arquivo `.pptx` do Relatório Semanal de Fiscalização já formatado
no padrão oficial (ISA Energia / SGS).

## Arquitetura — 100% client-side, sem backend

Este projeto **não tem servidor, não tem banco de dados e não tem API própria**.
É um site estático: HTML + CSS + JavaScript que roda inteiramente no navegador
de quem está usando.

- Tudo o que o fiscal digita ou envia (fotos, imagens de gráfico/cronograma)
  fica **somente na memória da aba aberta**. Nada é enviado para nenhum servidor.
- O `.pptx` final é montado no próprio navegador (biblioteca `pptxgenjs`,
  incluída localmente no repositório) e baixado direto para o computador do
  fiscal — o mesmo mecanismo de um download comum.
- O preenchimento é salvo automaticamente no `localStorage` do navegador
  (cache local do computador de quem está usando) a cada pausa de digitação.
  Se der um F5 sem querer, ou a aba fechar sozinha, o rascunho volta ao
  reabrir a página. Isso continua sem nenhum tipo de armazenamento em
  nuvem/servidor — o `localStorage` só existe dentro do navegador daquele
  computador, não é sincronizado com nada nem visível para mais ninguém.
- Fotos muito grandes podem eventualmente não caber no limite do
  `localStorage` do navegador (em geral uns 5-10 MB por site). Nesse caso o
  gerador salva os textos normalmente e avisa no rodapé que as fotos
  precisam ser reenviadas depois de um F5 — nada trava nem gera erro.
- Clicar em "🗑️ Limpar todos os dados" apaga tanto a tela quanto esse
  rascunho salvo, de propósito.
- As únicas chamadas de rede da página são para carregar a biblioteca
  `pdf.js` (via CDN pública `cdnjs.cloudflare.com`), usada apenas para
  transformar um PDF enviado pelo fiscal em imagem dentro do próprio
  navegador, e as fontes do visual APT (Google Fonts) — nenhum dado é
  enviado para fora.

Por isso a hospedagem na Vercel é **puramente estática**: nenhuma variável de
ambiente, nenhum banco, nenhuma função serverless é necessária.

## Estrutura do repositório

```
.
├── index.html              # marcação da página (abas, formulário, prévia)
├── css/
│   └── styles.css          # todo o CSS da interface (visual APT, igual ao RNC Online)
├── js/
│   ├── vendor/
│   │   └── pptxgen.bundle.js   # biblioteca pptxgenjs (vendorizada, sem CDN)
│   ├── bg-images.js         # imagens de fundo dos slides, em base64
│   ├── app.js                # toda a lógica do gerador (abas, prévia, export)
│   └── apto.js               # Apto, o mascote: dicas e link para o manual
├── assets/                  # fundo da página, mascote, bandeira e o manual em PDF
├── docs/manual/             # fonte do manual (manual.html) e script que gera o PDF
└── README.md
```

## Rodando localmente

Não precisa de `npm install` nem build. Qualquer servidor estático serve:

```bash
# opção 1: Python
python3 -m http.server 8080

# opção 2: Node
npx serve .
```

Depois é só abrir `http://localhost:8080`.

> Abrir o `index.html` direto com duplo-clique (`file://`) também funciona na
> maioria dos casos, mas alguns navegadores bloqueiam `fetch`/upload de
> arquivo em `file://`. Prefira sempre um servidor local, mesmo que simples.

## Manual de uso

O manual (`assets/manual-rsf-online.pdf`, aberto pelo Apto) é gerado a partir de
`docs/manual/manual.html`, com telas capturadas do próprio sistema. Depois de
mudar a interface, regenere no Windows com o Microsoft Edge:

```bash
python -m http.server 8080
powershell -File docs/manual/gerar-manual.ps1
```

## Publicando no GitHub

Se você recebeu esta pasta com o `.git` já iniciado (com o primeiro commit
pronto), basta criar um repositório vazio no GitHub e apontar para ele:

```bash
git remote add origin https://github.com/SEU_USUARIO/NOME_DO_REPO.git
git branch -M main
git push -u origin main
```

Se preferir começar do zero:

```bash
cd pasta-do-projeto
git init
git add -A
git commit -m "Gerador RSF — versão inicial"
git remote add origin https://github.com/SEU_USUARIO/NOME_DO_REPO.git
git branch -M main
git push -u origin main
```

## Publicando na Vercel

**Pelo painel (mais simples):**

1. Acesse [vercel.com](https://vercel.com) e faça login com a conta GitHub.
2. "Add New… → Project" e selecione o repositório recém-criado.
3. Em "Framework Preset" deixe como **Other** (site estático).
4. Não é preciso configurar "Build Command" nem "Output Directory" — deixe
   em branco/padrão. Não há variáveis de ambiente a configurar.
5. Clique em "Deploy". Em menos de um minuto a Vercel gera uma URL pública
   (algo como `nome-do-repo.vercel.app`).

Qualquer novo `git push` para a branch `main` gera automaticamente um novo
deploy — sem precisar mexer em nada na Vercel depois da primeira vez.

**Pela CLI (alternativa):**

```bash
npm i -g vercel
vercel        # segue o assistente, primeira vez pede login
vercel --prod # publica em produção
```

## Atualizando o site depois de publicado

Basta editar os arquivos, commitar e dar `git push`:

```bash
git add -A
git commit -m "descrição da mudança"
git push
```

A Vercel republica sozinha em segundos.

## Limitações conhecidas (por design)

- Sem login/autenticação — qualquer pessoa com o link acessa e gera relatórios.
  Se precisar restringir o acesso, a Vercel tem opção de proteção por senha
  nos planos pagos (Vercel Authentication / Password Protection); não requer
  mudar nada no código, é configuração do projeto na própria Vercel.
- O rascunho salvo automaticamente é por navegador/computador — se o fiscal
  trocar de computador ou de navegador, não leva o rascunho junto (é
  esperado, já que não existe nenhum servidor guardando isso em nenhum lugar).
