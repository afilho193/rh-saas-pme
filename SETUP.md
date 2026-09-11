# Setup RH SaaS PME

## Desenvolvimento Local

### Pré-requisitos

- Node.js 20+
- PostgreSQL 16+
- Docker (opcional, para usar docker-compose)

### Opção 1: Docker Compose (Recomendado)

```bash
docker-compose up
```

Isso vai:
- Criar um container Postgres
- Rodar o backend em http://localhost:5000
- Rodar o frontend em http://localhost:3000

### Opção 2: Manual

#### 1. Banco de Dados

```bash
# Criar banco localmente (ou usar um postgres remoto)
createdb rh_saas
```

#### 2. Backend

```bash
cd backend

# Instalar dependências
npm install

# Configurar variáveis de ambiente
cp .env.example .env
# Edite .env com sua DATABASE_URL

# Rodar migrações
npm run migrate

# Iniciar servidor
npm run dev
```

Backend estará em `http://localhost:5000`

#### 3. Frontend

```bash
cd frontend

# Instalar dependências
npm install

# Iniciar desenvolvimento
npm run dev
```

Frontend estará em `http://localhost:3000`

## Testando

1. Va para http://localhost:3000
2. Clique em "Registre-se"
3. Preencha com:
   - Nome da Empresa: "Sua Empresa Teste"
   - Email: `teste@empresa.com`
   - Senha: `senha123`
4. Vai ser redirecionado pro Dashboard

## Deploy

**Produção roda na Vercel, não no Railway** — veja [docs/deployment.md](docs/deployment.md)
para como está configurado de fato (dois projetos Vercel, banco Supabase, upload via
Vercel Blob). As instruções de Railway abaixo continuam corretas (os `Dockerfile`s e o
`railway.json` seguem funcionais) — ficaram como caminho alternativo documentado, não
como o que está no ar.

### Railway (alternativa, não usada em produção)

#### Setup inicial

1. Crie uma conta em [railway.app](https://railway.app)
2. Conecte seu repositório GitHub
3. Railway vai detectar automaticamente os Dockerfiles

### Variáveis de Ambiente

No Railway, crie:

```
PORT=5000
DATABASE_URL=postgresql://user:password@host:5432/rh_saas
JWT_SECRET=gere_uma_senha_super_segura_aqui
NODE_ENV=production
```

E para o frontend:

```
VITE_API_URL=https://seu-backend-railway.up.railway.app/api
```

## Estrutura do Projeto

```
rh-saas-pme/
├── backend/
│   ├── src/
│   │   ├── db/         # Configuração e schema do banco
│   │   ├── routes/     # Rotas da API
│   │   ├── controllers/ # Lógica das endpoints
│   │   ├── middleware/  # Auth e outros middlewares
│   │   └── server.js   # Express server
│   ├── package.json
│   └── Dockerfile
├── frontend/
│   ├── src/
│   │   ├── components/
│   │   ├── pages/      # Login, Dashboard, etc
│   │   ├── hooks/      # useAuth, etc
│   │   ├── utils/      # API client
│   │   └── App.jsx
│   ├── package.json
│   ├── vite.config.js
│   └── Dockerfile
├── docker-compose.yml
└── README.md
```

## Troubleshooting

### Erro de conexão com banco

Verifique se `DATABASE_URL` está correta. Formato:
```
postgresql://usuario:senha@host:porta/database_nome
```

### Frontend não conecta com backend

Verifique se a porta configurada em `PORT` (backend/.env) está disponível e se o backend está rodando, e se `VITE_API_URL` (frontend/.env) aponta para essa mesma porta.

**No macOS**, a porta 5000 é usada pelo AirPlay Receiver (Sistema > Compartilhamento) e o backend falha com `EADDRINUSE`. Rode o backend em outra porta (ex: `PORT=5050`) e atualize `VITE_API_URL` de acordo — veja [docs/local-development.md](docs/local-development.md).

### Precisa resetar o banco

```bash
# Backend
npm run migrate

# Ou manualmente
psql rh_saas < backend/src/db/schema.sql
```

## Próximos Passos (Roadmap)

- [x] Upload real de documentos (Vercel Blob) — set/2026
- [ ] Integração com contabilidade (Domínio, etc)
- [ ] Cálculos automáticos de folha (INSS, IR, etc)
- [ ] Relatórios PDF
- [ ] Múltiplas filiais/departamentos
- [ ] Webhooks para eSocial
- [ ] Mobile app
