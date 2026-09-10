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

## Deploy no Railway

### Setup inicial

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
REACT_APP_API_URL=https://seu-backend-railway.up.railway.app/api
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

Verifique se a porta 5000 está disponível e se o backend está rodando.

### Precisa resetar o banco

```bash
# Backend
npm run migrate

# Ou manualmente
psql rh_saas < backend/src/db/schema.sql
```

## Próximos Passos (Roadmap)

- [ ] Upload real de documentos (AWS S3 ou similar)
- [ ] Integração com contabilidade (Domínio, etc)
- [ ] Cálculos automáticos de folha (INSS, IR, etc)
- [ ] Relatórios PDF
- [ ] Múltiplas filiais/departamentos
- [ ] Webhooks para eSocial
- [ ] Mobile app
