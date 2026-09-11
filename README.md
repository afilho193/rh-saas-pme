# RH SaaS PME

SaaS horizontal para gestão de RH em pequenas e médias empresas. Sai das planilhas, centraliza tudo num lugar só.

## Features MVP

- **Cadastro de Colaboradores** — dados básicos, upload de documentos
- **Folha de Pagamento** — visualização centralizada, geração de contracheques
- **Férias e Ausências** — solicitação, aprovação, saldo de dias
- **Gestão de Documentos** — upload, vencimento, alertas
- **Dashboard** — visibilidade de headcount, folhas abertas, docs vencendo

## Stack

- **Backend:** Node.js + Express + Postgres
- **Frontend:** React + Vite + Tailwind
- **Deploy:** Railway

## Quick Start

### Backend

```bash
cd backend
npm install
cp .env.example .env
npm run dev
```

### Frontend

```bash
cd frontend
npm install
npm run dev
```

## Variáveis de Ambiente

Veja `.env.example` em cada pasta.

## Documentação Técnica

Guia completo de arquitetura, banco de dados, API e limitações conhecidas em
[docs/](docs/README.md). Para rodar localmente sem Docker (incluindo os problemas reais
que aparecem num Mac), veja [docs/local-development.md](docs/local-development.md).

## Testes

```bash
cd backend
npm test
```

## Deploy

Estrutura pronta para Railway. Veja `railway.json` na raiz.
