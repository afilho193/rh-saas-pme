# API Reference

Base URL local: `http://localhost:5050/api` (a porta é o que estiver em `backend/.env` →
`PORT`; veja a nota sobre a porta 5000 em
[local-development.md](local-development.md)). Todas as rotas devolvem JSON.

Rotas marcadas 🔒 exigem header `Authorization: Bearer <token>` (obtido no login/registro)
e aceitam qualquer papel (`admin` ou `member`). Rotas marcadas 🔒**admin** exigem
adicionalmente que o token seja de um usuário `admin` — um `member` recebe **403**.
Toda rota 🔒 retorna **404** (não 403) se o recurso não pertencer à empresa do token, para
não revelar se o recurso existe em outra empresa.

Toda rota de escrita valida os campos que recebe (`backend/src/utils/validation.js`) e
devolve **400** com `{ error: "<mensagem>" }` quando algo não bate — detalhes por rota
abaixo.

## Autenticação

### `POST /auth/register`
Cria uma `company` nova e o primeiro usuário (sempre `role: admin`).

```json
// body
{ "companyName": "Empresa Teste", "email": "a@b.com", "password": "senha123" }
// 201
{ "token": "...", "userId": 1, "companyId": 1, "role": "admin" }
// 400 se email não for um formato válido ou password tiver menos de 6 caracteres
// 409 se o email já existe
```

### `POST /auth/login`
```json
// body
{ "email": "a@b.com", "password": "senha123" }
// 200
{ "token": "...", "userId": 1, "companyId": 1, "role": "admin" }
// 401 se credenciais inválidas
```

## Equipe

| Método | Rota | Descrição |
|---|---|---|
| GET 🔒 | `/users` | Lista `{ id, email, role, created_at }` de todos os usuários da empresa |
| POST 🔒admin | `/users` | Convida um usuário: `{ email, password, role? }` (`role` default `'member'`, aceita `'admin'`\|`'member'`) |

`POST /users` retorna `400` se `role` não for `admin`/`member`, se `email` não for válido
ou se `password` tiver menos de 6 caracteres; `409` se o e-mail já existir. Não há fluxo
de convite por e-mail — a senha é definida diretamente por quem convida e precisa ser
repassada à pessoa por fora do sistema.

## Colaboradores

| Método | Rota | Descrição |
|---|---|---|
| GET 🔒 | `/employees` | Lista colaboradores da empresa (todos os status) |
| POST 🔒admin | `/employees` | Cria colaborador + linha de `leave_balance` do ano atual (20 dias) |
| PUT 🔒admin | `/employees/:id` | Atualiza nome/cargo/salário/status (campos omitidos são preservados) |
| DELETE 🔒admin | `/employees/:id` | **Soft delete** — marca `status = 'inativo'`, não remove a linha |

`POST /employees` exige `name, cpf, cargo, salary, hire_date` — todos obrigatórios.
Retorna `400` se `cpf` não tiver exatamente 11 dígitos, `salary` não for positivo, ou
`hire_date` não for uma data válida; `409` se o CPF já existir (constraint `UNIQUE` no
banco). `PUT /employees/:id` valida `salary` (se enviado) com a mesma regra.

## Documentos

| Método | Rota | Descrição |
|---|---|---|
| GET 🔒 | `/documents/:employeeId` | Lista documentos de um colaborador |
| POST 🔒admin | `/documents/:employeeId` | Cria documento (`doc_type`, `file_url`, `expiration_date` opcional) |
| DELETE 🔒admin | `/documents/:id` | Remove documento |
| GET 🔒 | `/documents/expiring/list?days=30` | Documentos de **toda a empresa** vencendo nos próximos N dias (default 30) |

`file_url` é uma string livre — não há upload de arquivo binário (ver
[known-limitations.md](known-limitations.md)). `expiration_date`, se enviado, precisa ser
uma data válida (`400` se não for) — mas o formato de `file_url` em si não é validado.

## Folha de Pagamento

| Método | Rota | Descrição |
|---|---|---|
| GET 🔒 | `/payroll?month=&year=` | Lista folhas (filtros opcionais) |
| POST 🔒admin | `/payroll` | Cria folha do mês (`month`, `year` obrigatórios), status inicial `draft` |
| GET 🔒 | `/payroll/:id/details` | Lista os itens (lançamentos por colaborador) da folha |
| POST 🔒admin | `/payroll/:id/items` | Adiciona lançamento: `employee_id`, `base_salary`, `deductions?`, `additions?` |
| PUT 🔒admin | `/payroll/:id/items/:itemId` | Atualiza um lançamento (recalcula `net_salary`) |
| POST 🔒admin | `/payroll/:id/approve` | Muda status da folha para `approved` |

`POST /payroll` retorna `400` se `month` não estiver entre 1 e 12, `409` se já existir
folha para o mesmo `(company_id, month, year)`. `POST/PUT .../items` retornam `400` se
`base_salary` não for positivo ou `deductions`/`additions` forem negativos. `net_salary` é
sempre recalculado como `base_salary - deductions + additions` no servidor — o frontend
não envia esse valor. `PUT .../items/:itemId` faz *merge* parcial: campos omitidos do
body preservam o valor atual da linha (não são zerados).

## Férias e Ausências

| Método | Rota | Descrição |
|---|---|---|
| GET 🔒 | `/leave-requests?employeeId=&status=` | Lista solicitações (filtros opcionais) |
| POST 🔒admin | `/leave-requests` | Cria solicitação, status inicial `pendente` |
| PUT 🔒admin | `/leave-requests/:id/approve` | Aprova; se `type = 'férias'`, upsert em `leave_balance` (cria a linha do ano se faltar) e incrementa `used_days` |
| PUT 🔒admin | `/leave-requests/:id/reject` | Rejeita (não toca no saldo) |
| GET 🔒 | `/leave-balance/:employeeId?year=` | Saldo do ano (default: ano atual). Devolve `{ total_days: 20, used_days: 0 }` se não existir linha para o ano |

`POST /leave-requests` retorna `400` se `type` não for `férias`/`falta`/`abono`, ou se
`end_date` for anterior a `start_date`.

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
