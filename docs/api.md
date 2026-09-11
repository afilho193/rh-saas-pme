# API Reference

Base URL local: `http://localhost:5050/api` (a porta é o que estiver em `backend/.env` →
`PORT`; veja a nota sobre a porta 5000 em
[local-development.md](local-development.md)). Todas as rotas devolvem JSON.

Rotas marcadas 🔒 exigem header `Authorization: Bearer <token>` (obtido no login/registro).
Todas retornam **404** se o recurso não pertencer à empresa do token — não 403 — para não
revelar se o recurso existe em outra empresa.

## Autenticação

### `POST /auth/register`
Cria uma `company` nova e o primeiro usuário (sempre `role: admin`).

```json
// body
{ "companyName": "Empresa Teste", "email": "a@b.com", "password": "senha123" }
// 201
{ "token": "...", "userId": 1, "companyId": 1 }
// 409 se o email já existe
```

### `POST /auth/login`
```json
// body
{ "email": "a@b.com", "password": "senha123" }
// 200
{ "token": "...", "userId": 1, "companyId": 1 }
// 401 se credenciais inválidas
```

## Colaboradores 🔒

| Método | Rota | Descrição |
|---|---|---|
| GET | `/employees` | Lista colaboradores da empresa (todos os status) |
| POST | `/employees` | Cria colaborador + linha de `leave_balance` do ano atual (20 dias) |
| PUT | `/employees/:id` | Atualiza nome/cargo/salário/status (campos omitidos são preservados) |
| DELETE | `/employees/:id` | **Soft delete** — marca `status = 'inativo'`, não remove a linha |

`POST /employees` exige `name, cpf, cargo, salary, hire_date` — todos obrigatórios.
Retorna `409` se o CPF já existir (constraint `UNIQUE` no banco).

## Documentos 🔒

| Método | Rota | Descrição |
|---|---|---|
| GET | `/documents/:employeeId` | Lista documentos de um colaborador |
| POST | `/documents/:employeeId` | Cria documento (`doc_type`, `file_url`, `expiration_date` opcional) |
| DELETE | `/documents/:id` | Remove documento |
| GET | `/documents/expiring/list?days=30` | Documentos de **toda a empresa** vencendo nos próximos N dias (default 30) |

`file_url` é uma string livre — não há upload de arquivo binário (ver
[known-limitations.md](known-limitations.md)).

## Folha de Pagamento 🔒

| Método | Rota | Descrição |
|---|---|---|
| GET | `/payroll?month=&year=` | Lista folhas (filtros opcionais) |
| POST | `/payroll` | Cria folha do mês (`month`, `year` obrigatórios), status inicial `draft` |
| GET | `/payroll/:id/details` | Lista os itens (lançamentos por colaborador) da folha |
| POST | `/payroll/:id/items` | Adiciona lançamento: `employee_id`, `base_salary`, `deductions?`, `additions?` |
| PUT | `/payroll/:id/items/:itemId` | Atualiza um lançamento (recalcula `net_salary`) |
| POST | `/payroll/:id/approve` | Muda status da folha para `approved` |

`POST /payroll` retorna `409` se já existir folha para o mesmo `(company_id, month, year)`.
`net_salary` é sempre recalculado como `base_salary - deductions + additions` no servidor —
o frontend não envia esse valor.

## Férias e Ausências 🔒

| Método | Rota | Descrição |
|---|---|---|
| GET | `/leave-requests?employeeId=&status=` | Lista solicitações (filtros opcionais) |
| POST | `/leave-requests` | Cria solicitação, status inicial `pendente` |
| PUT | `/leave-requests/:id/approve` | Aprova; se `type = 'férias'`, incrementa `used_days` do saldo do ano de `start_date` |
| PUT | `/leave-requests/:id/reject` | Rejeita (não toca no saldo) |
| GET | `/leave-balance/:employeeId?year=` | Saldo do ano (default: ano atual). Devolve `{ total_days: 20, used_days: 0 }` se não existir linha para o ano |

⚠️ Ver a nota sobre `leave_balance` em [database.md](database.md) — aprovar férias que
começam num ano sem linha de saldo correspondente não gera erro, mas também não deduz nada.

## Dashboard 🔒

### `GET /dashboard/summary`
```json
{
  "headcount": 6,       // employees com status = 'ativo'
  "openPayrolls": 1,    // payroll do mês/ano atual com status = 'draft'
  "pendingLeaves": 1,   // leave_requests com status = 'pendente' (todas, não só do mês)
  "expiringDocs": 2,    // documents vencendo nos próximos 30 dias (fixo, sem parâmetro)
  "currentMonth": 9,
  "currentYear": 2026
}
```

Note que `openPayrolls` só conta o mês/ano **atual do servidor** — uma folha `draft` de
um mês passado não aparece aqui (mas aparece em `GET /payroll`).
