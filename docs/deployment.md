# Deploy (Vercel)

Em produção desde set/2026. Dois projetos Vercel separados, ambos ligados ao mesmo
repositório GitHub (`afilho193/rh-saas-pme`), cada um com "Root Directory" apontando para
sua subpasta — um push em `main` reconstrói os dois automaticamente.

| Projeto Vercel | Root Directory | O que é |
|---|---|---|
| `backend` | `backend/` | API Express rodando como função serverless |
| `frontend` | `frontend/` | build estático do Vite (React) |

## Por que Vercel e não Railway

O projeto foi originalmente desenhado para Railway (`railway.json` + `Dockerfile`s na
raiz de cada pasta — ainda existem, ainda funcionariam). A troca para Vercel em set/2026
foi por causa do tier gratuito: Railway dá US$5 de crédito por 30 dias e depois exige
plano pago; o Hobby da Vercel é US$0/mês sem prazo de expiração. O trade-off foi mais
trabalho de setup agora (backend precisou virar função serverless, upload de arquivo
precisou migrar de disco para object storage) em troca de custo zero indefinido depois.
Ver [architecture.md](architecture.md) para o porquê disso importar tecnicamente.

## Como o backend roda como função serverless

`backend/vercel.json` reescreve **toda** rota (`/(.*) → /api`), então a única função que
existe é `backend/api/index.js`, que faz `export default app` — o `app` do Express
inteiro. A Vercel trata o export default de um arquivo em `/api` como um handler
`(req, res)`, e um app Express já tem exatamente essa assinatura, então não precisou de
nenhum adaptador. O roteamento de verdade (`/api/employees`, `/health`, etc.) continua
sendo feito pelo Express internamente, igual ao ambiente local — só muda *como* a
requisição chega até ele.

`backend/src/server.js` (o `app.listen()`) continua existindo só para rodar localmente
(`npm run dev`) — a Vercel nunca invoca esse arquivo.

## Como o frontend evita 404 em rotas do React Router

`frontend/vercel.json` reescreve toda rota para `/index.html`. Sem isso, acessar
`/login` direto (sem passar pela navegação client-side) bate 404 real no servidor, porque
só existe o arquivo `index.html` — foi exatamente o bug encontrado (e corrigido) no
primeiro deploy desta configuração.

## Banco de dados: Supabase via Vercel Marketplace

Provisionado com `vercel integration add supabase`, depois conectado ao projeto
`backend` com `vercel integration resource connect`. Isso injeta automaticamente (todas
as environments: production, preview, development) uma dezena de variáveis — as que
importam para nós são:

- `POSTGRES_URL` — string de conexão **pooled** (porta 6543, via PgBouncer do Supabase).
  É essa que `backend/src/db/config.js` usa quando `DATABASE_URL` não está definida
  (i.e., em produção). Pooled é obrigatório aqui: cada invocação de função serverless
  pode abrir sua própria conexão, e sem um pooler isso esgota o limite de conexões do
  Postgres rapidinho.
- `POSTGRES_URL_NON_POOLING` — conexão direta (porta 5432). Usada manualmente para rodar
  `npm run migrate` (DDL se comporta melhor fora do modo de transação do pooler).

**Gotcha de SSL que já mordeu uma vez**: `sslmode=require` na connection string do
Supabase é tratado pelo `pg-connection-string` v3+ como alias de `verify-full` — faz
validação completa da cadeia de certificado, que falha (`self-signed certificate in
certificate chain`) contra o cert do pooler da Supabase, **mesmo passando
`ssl: { rejectUnauthorized: false }`** no `Pool`. `db/config.js` contorna isso removendo
a query string da connection string antes de passar pro `pg` e configurando SSL só via o
objeto `ssl` explícito. Se esse erro voltar a aparecer (ex.: depois de atualizar `pg`),
é aqui que mexer primeiro.

## Upload de arquivo: Vercel Blob

Store criado com `vercel blob create-store <nome> --access public`, conectado ao projeto
`backend`. Isso injeta `BLOB_READ_WRITE_TOKEN`. `documentController.uploadDocument` chama
`put()` do pacote `@vercel/blob` com o buffer do arquivo (multer usa `memoryStorage()`
agora, não disco — a Vercel não tem filesystem gravável em runtime). Ver
[known-limitations.md](known-limitations.md) para os trade-offs de segurança
(acesso público, sem autenticação) assumidos aqui.

## Variáveis de ambiente configuradas

| Variável | Onde | Valor |
|---|---|---|
| `JWT_SECRET` | projeto `backend`, production + preview | gerado com `openssl rand -base64 48`, diferente do valor de dev local |
| `POSTGRES_URL`, `POSTGRES_URL_NON_POOLING`, etc. | projeto `backend`, todas as environments | injetadas automaticamente pela integração Supabase |
| `BLOB_READ_WRITE_TOKEN` | projeto `backend`, todas as environments | injetada automaticamente ao conectar o Blob store |
| `VITE_API_URL` | projeto `frontend`, production + preview | URL do backend implantado (`https://backend-rust-alpha-22.vercel.app/api`) |

## Rodando o Blob store localmente

Como o storage é um serviço de rede (não mais disco local), o upload de documento
funciona em desenvolvimento local **também via Vercel Blob**, não um caminho separado —
`backend/.env` tem seu próprio `BLOB_READ_WRITE_TOKEN` (puxado de
`vercel env pull` na pasta `backend/`). Se esse token expirar ou for revogado no
dashboard, o upload local para de funcionar até ele ser renovado — não existe fallback
para disco.

## Redeploy manual

```bash
cd backend && vercel deploy --prod --yes
cd frontend && vercel deploy --prod --yes
```

Normalmente desnecessário — um push em `main` no GitHub já dispara os dois builds
automaticamente pela integração configurada em `vercel link`.

## Migrações contra o banco de produção

Não há automação para isso ainda — rodar manualmente, apontando para a conexão
non-pooling:

```bash
cd backend
POOLING_URL=$(vercel env pull - --environment production 2>/dev/null | grep POSTGRES_URL_NON_POOLING | cut -d= -f2-)
DATABASE_URL="$POOLING_URL" node src/db/migrate.js
```

Ou mais simples: pegar `POSTGRES_URL_NON_POOLING` direto do dashboard da Vercel
(Storage → o recurso Supabase → variáveis) e rodar
`DATABASE_URL="<valor>" node src/db/migrate.js` localmente.
