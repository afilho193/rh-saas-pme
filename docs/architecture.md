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
| Upload de arquivo | `multer`, disco local (`backend/uploads/`, gitignored) |
| Deploy alvo | Railway (Dockerfiles prontos para backend e frontend) |

Não há ORM, fila de jobs, cache, ou serviço de e-mail. Toda a lógica de negócio vive nos
controllers do Express, com SQL escrito à mão via `pg`. Uploads vão para disco local, não
para um object storage (S3/Supabase/R2) — ver a nota sobre filesystem efêmero do Railway
em [known-limitations.md](known-limitations.md).

## Estrutura de pastas

```
backend/src/
├── server.js         # entrypoint: cria o app Express e chama listen()
├── routes/index.js   # todas as rotas da API, num único arquivo
├── controllers/       # um arquivo por recurso (employee, payroll, leave, document, dashboard, auth, users)
├── middleware/auth.js # valida o JWT (injeta req.userId/companyId/role) + requireAdmin
├── middleware/upload.js # config do multer: destino, nome aleatório do arquivo, tipos/tamanho aceitos
├── utils/validation.js # validadores pequenos e sem dependência (CPF, datas, e-mail, números)
├── uploads/            # arquivos enviados (gitignored) — criado em runtime, não versionado
└── db/
    ├── config.js      # pool de conexão pg
    ├── schema.sql      # DDL completo, aplicado via `npm run migrate`
    └── migrate.js      # lê schema.sql e executa contra o banco

frontend/src/
├── App.jsx            # define todas as rotas (públicas e protegidas)
├── pages/             # uma página por rota (Landing, Login, Dashboard, Employees, Payroll, PayrollDetail, Leave, Documents, Team)
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

- `POST /api/auth/register` cria uma `company` nova e o primeiro `user`, sempre com
  `role = 'admin'` (dentro de uma transação — ver [database.md](database.md) sobre o bug
  de empresa órfã que isso corrigiu).
- `POST /api/auth/login` retorna um JWT (`{ id, companyId, role }`, expira em 7 dias) que
  o frontend guarda em `localStorage` (via `useAuth`) e envia como
  `Authorization: Bearer <token>`.
- `middleware/auth.js` valida o JWT e injeta `req.userId`, `req.companyId` e `req.role`
  (tokens emitidos antes de set/2026 não carregam `role` — tratados como `'admin'`, já
  que todo usuário criado antes disso era admin). O mesmo arquivo exporta `requireAdmin`,
  usado em toda rota de escrita (`POST`/`PUT`/`DELETE`) em `routes/index.js`; rotas `GET`
  ficam abertas a qualquer usuário autenticado da empresa.
- **Dois papéis, dois níveis de acesso**: `admin` (acesso completo) e `member`
  (somente leitura — vê tudo, não cria/edita/exclui/aprova nada). Não há permissões mais
  granulares (ex.: "member pode aprovar férias mas não folha") — é uma escolha
  deliberada de manter simples até haver um caso de uso real pedindo granularidade.
- **Convite de usuário**: `POST /api/users` (admin-only) cria um novo `user` na mesma
  `company_id` do token, com `role` `admin` ou `member`. `GET /api/users` lista a equipe
  (qualquer usuário autenticado pode ver quem tem acesso). Ver
  [frontend.md](frontend.md) sobre a página `Team.jsx` que consome isso.
- Como `users` e `employees` são tabelas sem nenhum vínculo entre si, um `member` não
  representa um colaborador específico — é um espectador da empresa inteira, não um
  "colaborador logando para ver os próprios dados". Um portal de autoatendimento do
  colaborador seria uma feature diferente, não coberta por este modelo de papéis.

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
