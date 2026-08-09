# SocialFlow — Frontend

Interface do SocialFlow. Três pessoas diferentes usam a mesma aplicação, e cada
uma enxerga só o que lhe diz respeito.

<p>
  <img alt="React 19" src="https://img.shields.io/badge/React-19-61DAFB?logo=react&logoColor=black">
  <img alt="Vite" src="https://img.shields.io/badge/Vite-7-646CFF?logo=vite&logoColor=white">
  <img alt="Tailwind 4" src="https://img.shields.io/badge/Tailwind-4-06B6D4?logo=tailwindcss&logoColor=white">
  <img alt="TanStack Query 5" src="https://img.shields.io/badge/TanStack_Query-5-FF4154?logo=reactquery&logoColor=white">
  <img alt="72 testes" src="https://img.shields.io/badge/testes-72%20passando-3fb950">
</p>

---

## Os três papéis

| Papel | O que faz | O que **não** vê |
| --- | --- | --- |
| **ADMIN** | Cadastra empresas e usuários, agenda posts, conecta o Instagram | — |
| **DESIGNER** | Envia as artes das empresas em que trabalha | Outras empresas, gestão de equipe |
| **CLIENT** | Aprova a arte ou pede ajuste | Briefing de execução, outras empresas |

O papel não muda só quais botões aparecem: muda o texto das telas. O cliente lê
"aguardando sua aprovação"; o designer lê outra coisa na mesma tela. E o
briefing não é escondido por CSS — a API não o envia para o papel `CLIENT`.

## Stack

React 19 · Vite · TypeScript · Tailwind 4 · TanStack Query 5 ·
React Router 7 · Zustand · Zod + React Hook Form · framer-motion · Recharts

## Estrutura

Organizada por funcionalidade, não por tipo de arquivo:

```
src/
├── features/<área>/
│   ├── api/           Serviços HTTP e tipos daquela área
│   └── components/    Telas e componentes
├── shared/components/ Modal, ConfirmDialog, GlassCard, ícones
├── stores/            Zustand (sessão, toasts)
├── layouts/           Casca do dashboard, sidebar, navegação mobile
└── test/              setup do Vitest
```

**Áreas:** `auth` · `organizations` · `campaigns` · `posts` · `team` ·
`instagram` · `dashboard`

## Como rodar

```bash
npm install
npm run dev
```

Sobe em `http://localhost:5173`. Requer a API em `http://localhost:3000` — o
Vite faz proxy de `/api` para lá, então **não** é preciso configurar CORS em
desenvolvimento.

A única variável é `VITE_API_URL`, que já vem como `/api` no `.env`.

> ⚠️ Tudo que começa com `VITE_` é embutido no bundle e fica visível no
> DevTools. Nunca coloque token da Meta, chave do Cloudinary ou string de banco
> aqui — esses valores vivem só na API.

## Testes

```bash
npm test          # uma passada
npm run test:watch
npm run test:cov
```

72 testes em Vitest + Testing Library, cobrindo as telas onde um erro custa
caro: credencial do Instagram, desativação de organização e de usuário,
exclusão de campanha e o resultado da publicação automática.

O ambiente roda com `TZ=UTC` fixo, igual ao container de produção — sem isso um
teste de data passa na máquina do dev (America/Sao_Paulo) e erra no deploy.

## Detalhes que não são óbvios olhando o código

**O login é por cookie `httpOnly`.** Não há token no `localStorage`. Por isso o
axios usa `withCredentials: true` e, em produção, o `vercel.json` reescreve
`/api` para a Railway: a API responde na mesma origem e o cookie fica
first-party. Apontar `VITE_API_URL` direto para a Railway quebra o login no
Safari, que bloqueia cookies de terceiros.

**Modais rolam por dentro.** O `Modal` compartilhado tem altura máxima, cabeçalho
fixo e corpo rolável. A versão anterior centralizava o painel com `items-center`
e, num formulário mais alto que a tela, o topo ficava inalcançável.

**Estado que precisa resetar usa `key`, não `useEffect`.** É o caso do
`TypeToConfirmDialog`: reabrir para outra campanha herdando o texto anterior
deixaria o botão de excluir liberado para o alvo errado.

## Build e deploy

```bash
npm run build
```

Deploy na Vercel, em **`www.socialflow.app.br`** (a raiz redireciona para o
`www`). O `vercel.json` faz duas coisas: reescreve `/api/*` para o domínio da
API na Railway e devolve `index.html` para qualquer rota — sem isso, recarregar
a página numa rota interna dá 404.

Ao trocar o domínio da API, atualize o `destination` no `vercel.json`. Ele
precisa do esquema `https://` e do sufixo `/:path*`; sem um dos dois, toda
chamada falha.

O domínio próprio não é enfeite: em `*.vercel.app` o antivírus de um dos
usuários bloqueava o site inteiro, incluindo o `/favicon.ico` — bloqueio por
reputação do domínio compartilhado, não pelo conteúdo. Configuração de DNS e as
armadilhas do registro.br estão em
[`../socialflow-api-v2/DEPLOY.md`](../socialflow-api-v2/DEPLOY.md).

## Documentação relacionada

- [`../socialflow-api-v2/README.md`](../socialflow-api-v2/README.md) — a API
- [`../socialflow-api-v2/DEPLOY.md`](../socialflow-api-v2/DEPLOY.md) — infraestrutura
