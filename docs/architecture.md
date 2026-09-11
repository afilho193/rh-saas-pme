# Arquitetura

## Stack

| Camada | Tecnologia |
|---|---|
| Backend | Node.js (ESM) + Express 4 |
| Banco de dados | PostgreSQL 16 (driver `pg`, sem ORM) |
| Autenticação | JWT (`jsonwebtoken`) + `bcryptjs` para hash de senha |
| Frontend | React 18 + Vite 5 + Tailwind 3 |
| Roteamento frontend | `react-router-dom` v6 |
| Ícones | `lucide-react` |
| Deploy alvo | Railway (Dockerfiles prontos para backend e frontend) |

Não há ORM, fila de jobs, cache, ou serviço de e-mail. Toda a lógica de negócio vive nos
controllers do Express, com SQL escrito à mão via `pg`.

## Estrutura de pastas

```
backend/src/
├── server.js         # entrypoint: cria o app Express e chama listen()
├── routes/index.js   # todas as rotas da API, num único arquivo
├── controllers/       # um arquivo por recurso (employee, payroll, leave, document, dashboard, auth)
├── middleware/auth.js # valida o JWT e injeta req.userId / req.companyId
└── db/
    ├── config.js      # pool de conexão pg
    ├── schema.sql      # DDL completo, aplicado via `npm run migrate`
    └── migrate.js      # lê schema.sql e executa contra o banco

frontend/src/
├── App.jsx            # define todas as rotas (públicas e protegidas)
├── pages/             # uma página por rota (Landing, Login, Dashboard, Employees, Payroll, Leave, Documents)
├── components/         # Layout (sidebar do app logado) e BrowserFrame (moldura de screenshot na landing)
├── hooks/useAuth.js    # login/logout/register, token e usuário em localStorage
└── utils/api.js        # instância axios com baseURL e injeção do Bearer token
```

## Multi-tenancy

O isolamento entre empresas é feito por uma coluna `company_id` em cada tabela relevante,
filtrada manualmente em cada query do controller — não há Row Level Security no Postgres
nem um middleware central que garanta o filtro. Isso significa que **a segurança
multi-tenant depende de cada controller lembrar de incluir `WHERE company_id = $1`**. Uma
revisão rápida (setembro/2026) mostra que todos os controllers atuais fazem isso
corretamente, mas é um padrão frágil: um novo endpoint que esqueça o filtro expõe dados
de uma empresa para outra. Ver [known-limitations.md](known-limitations.md).

## Autenticação e autorização

- `POST /api/auth/register` cria uma `company` nova e um `user` com `role = 'admin'`
  fixo — **não existe hoje nenhum fluxo para convidar ou criar um segundo usuário** numa
  empresa já existente. A coluna `role` existe na tabela `users` mas nunca é lida de volta
  no login nem incluída no JWT.
- `POST /api/auth/login` retorna um JWT (`{ id, companyId }`, expira em 7 dias) que o
  frontend guarda em `localStorage` e envia como `Authorization: Bearer <token>`.
- `middleware/auth.js` valida o JWT e injeta `req.userId` e `req.companyId` — usado por
  toda rota abaixo de `router.use(authMiddleware)` em `routes/index.js`.
- **Não há verificação de papel/permissão em nenhuma rota.** Qualquer usuário autenticado
  pode aprovar folha, aprovar férias ou excluir documentos de qualquer colaborador da
  própria empresa. Como só existe o papel `admin` na prática, isso hoje não é explorável
  de forma diferente — mas é a lacuna que mais importa resolver antes de a plataforma
  suportar mais de um usuário por empresa.

## Fluxo de uma requisição autenticada

1. Frontend chama `api.<verbo>(caminho)` (axios, `utils/api.js`), que injeta o token salvo.
2. Express recebe em `routes/index.js`, passa por `authMiddleware`, chega ao controller.
3. Controller valida o corpo da requisição "à mão" (sem schema/validator), monta SQL com
   `company_id` do token, executa via `pool.query`, devolve JSON.
4. Não há camada de serviço/repositório — controller fala direto com `pg`.

## Frontend: público vs. autenticado

`App.jsx` define uma rota raiz (`/`) que decide entre `Landing` (visitante) e um redirect
para `/dashboard` (usuário já autenticado), com base em `useAuth().isAuthenticated`
(derivado da presença de `token` no `localStorage`, não de uma validação real do JWT no
backend — um token expirado só é percebido quando uma chamada à API retorna 401).
