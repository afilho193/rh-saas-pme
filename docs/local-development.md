# Rodando localmente (sem Docker)

O [SETUP.md](../SETUP.md) na raiz cobre o caminho "feliz" com `docker-compose up`. Este
guia cobre o caminho manual — útil quando Docker não está disponível — incluindo os dois
problemas reais que apareceram ao configurar isso num Mac em setembro/2026.

## 1. Banco de dados

Se já tiver Postgres via Homebrew (`brew services list | grep postgres`), reaproveite-o —
não precisa ser a versão exata do `docker-compose.yml` (Postgres 16), qualquer 13+ serve.

```bash
createdb rh_saas
psql rh_saas -c "CREATE USER rh_user WITH PASSWORD 'rh_password';"
psql rh_saas -c "GRANT ALL ON SCHEMA public TO rh_user; ALTER SCHEMA public OWNER TO rh_user;"
```

**Por que o `GRANT`/`ALTER SCHEMA`**: Postgres 15+ revoga por padrão a permissão de
`CREATE` no schema `public` para quem não é o owner. Sem isso, `npm run migrate` falha com
`permission denied for schema public` — não é um problema do projeto, é o comportamento
padrão do Postgres 15+ pegando qualquer setup manual (não acontece dentro do
`docker-compose`, porque lá o usuário do container já é owner do banco que ele mesmo cria).

## 2. Backend

```bash
cd backend
npm install
cp .env.example .env
```

Edite `.env`:
```
PORT=5050
DATABASE_URL=postgresql://rh_user:rh_password@localhost:5432/rh_saas
JWT_SECRET=qualquer_coisa_para_dev
NODE_ENV=development
```

**Por que `PORT=5050` e não `5000`** (o valor em `.env.example`): no macOS, a porta 5000 é
usada pelo AirPlay Receiver (Sistema > Geral > Compartilhamento). O backend falha com
`EADDRINUSE` ao tentar subir na 5000. Isso é específico do macOS — em Linux `PORT=5000`
funciona normalmente. Não afeta produção (a função serverless na Vercel nem usa `PORT`).

**Upload de documento precisa de `BLOB_READ_WRITE_TOKEN`** — desde que o storage migrou
de disco local para Vercel Blob (ver [deployment.md](deployment.md)), mesmo em dev local
o upload sobe para o Blob de verdade, não para uma pasta local. Pegue o token com:

```bash
cd backend && vercel env pull .env.vercel.local
grep BLOB_READ_WRITE_TOKEN .env.vercel.local >> .env
```

Sem isso, `POST /documents/:employeeId` falha localmente (não há fallback para disco).
Requer estar logado no Vercel CLI (`vercel login`) e o projeto `backend` já linkado
(`vercel link`).

```bash
npm run migrate   # aplica backend/src/db/schema.sql
npm run dev       # node --watch src/server.js
```

## 3. Frontend

```bash
cd frontend
npm install
```

Edite `frontend/.env` (criar se não existir):
```
VITE_API_URL=http://localhost:5050/api
```

Essa URL **precisa bater com o `PORT` do backend** — se um dos dois mudar, o outro
precisa mudar também. Há três lugares com essa porta hardcoded como fallback caso a env
var não esteja definida: `frontend/src/utils/api.js`, `frontend/vite.config.js` (proxy do
Vite) e `frontend/.env`. Mudar só um deles é a causa mais provável de "funciona no
`curl` mas não no navegador".

```bash
npm run dev
```

Se a porta 3000 (e as seguintes, 3001-3004) estiverem ocupadas, o Vite sobe
automaticamente na primeira porta livre (ex.: 3005) e avisa no terminal — não é erro.

## 4. Conferindo que subiu

```bash
curl http://localhost:5050/health          # { "status": "ok" }
curl -o /dev/null -w "%{http_code}\n" http://localhost:3005/   # 200
```

## Resetando o banco do zero

```bash
psql rh_saas -c "DROP SCHEMA public CASCADE; CREATE SCHEMA public;"
psql rh_saas -c "GRANT ALL ON SCHEMA public TO rh_user; ALTER SCHEMA public OWNER TO rh_user;"
cd backend && npm run migrate
```

## Rodando os testes automatizados

```bash
cd backend && npm test
```

Roda `backend/tests/*.test.js` com o test runner nativo do Node (`node --test`, sem
dependência extra). Cada arquivo:

- sobe uma instância do Express (`src/app.js`) numa porta efêmera (`app.listen(0)`);
- registra sua própria empresa de teste (e-mail único por execução, via `Date.now()` +
  aleatório) contra o **mesmo Postgres** da `DATABASE_URL` do `.env` — não sobe um banco
  isolado nem usa mocks;
- apaga a empresa que criou no `after()` (o `ON DELETE CASCADE` do schema cuida do resto).

Isso significa que os testes exigem Postgres rodando e migrado (veja a seção 1 acima) e
podem ser rodados em paralelo com o `npm run dev` sem conflito, já que cada teste usa sua
própria porta e seus próprios dados. `authorization.test.js` é o mais importante de ler
antes de mexer em qualquer controller: ele trava o isolamento entre empresas
(`company_id`), que hoje depende de cada query lembrar de filtrar — ver
[architecture.md](architecture.md).
