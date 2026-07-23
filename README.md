# Gerador RSF — Relatório Semanal de Fiscalização (ISA / SGS)

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
- Se a página for recarregada ou fechada, os dados preenchidos se perdem
  (não há salvamento automático hoje). Isso é intencional nesta versão: não
  existe nenhum tipo de armazenamento em nuvem/servidor.
- A única chamada de rede que a página faz é para carregar a biblioteca
  `pdf.js` (via CDN pública `cdnjs.cloudflare.com`), usada apenas para
  transformar um PDF enviado pelo fiscal em imagem dentro do próprio
  navegador — nenhum dado é enviado para fora.

Por isso a hospedagem na Vercel é **puramente estática**: nenhuma variável de
ambiente, nenhum banco, nenhuma função serverless é necessária.

## Estrutura do repositório

```
.
├── index.html              # marcação da página (abas, formulário, prévia)
├── css/
│   └── styles.css          # todo o CSS da interface
├── js/
│   ├── vendor/
│   │   └── pptxgen.bundle.js   # biblioteca pptxgenjs (vendorizada, sem CDN)
│   ├── bg-images.js         # imagens de fundo dos slides, em base64
│   └── app.js                # toda a lógica do gerador (abas, prévia, export)
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
- Sem salvamento automático — se quiser que o preenchimento sobreviva a um
  fechamento acidental da aba, dá para adicionar um autosave em
  `localStorage` (ainda 100% local, sem servidor). É uma mudança pequena e
  isolada; avise se quiser que eu inclua.
