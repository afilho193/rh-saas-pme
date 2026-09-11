# Banco de Dados

Schema completo em [`backend/src/db/schema.sql`](../backend/src/db/schema.sql), aplicado
via `npm run migrate` (lê o arquivo inteiro e executa como uma única query — não há
sistema de migrations versionadas, cada rodada reaplica o `CREATE TABLE IF NOT EXISTS`
inteiro).

## Tabelas

```
companies
└── users            (company_id, role sempre 'admin' na prática)
└── employees        (company_id)
    ├── documents     (employee_id)
    ├── leave_requests (employee_id)
    └── leave_balance  (employee_id, year)  — UNIQUE(employee_id, year)
└── payroll          (company_id)  — UNIQUE(company_id, month, year)
    └── payroll_items (payroll_id, employee_id)
```

Todas as chaves estrangeiras têm `ON DELETE CASCADE` — apagar uma `company` apaga tudo
abaixo dela; apagar um `employee` apaga seus documentos, solicitações de férias e saldo.
(Na prática, colaboradores nunca são apagados de fato: `deleteEmployee` só marca
`status = 'inativo'`.)

## Pontos de atenção

### ~~`leave_balance` só existia para o ano em que o colaborador foi cadastrado~~ — resolvido em set/2026

`createEmployee` (em `employeeController.js`) cria automaticamente uma linha em
`leave_balance` para o **ano corrente no momento do cadastro**, com `total_days = 20`.
Até set/2026, `approveLeaveRequest` fazia um `UPDATE` puro contra `(employee_id, year)`
do `start_date` da solicitação — se a solicitação caísse num ano sem linha (ex.: férias
de 2028 para um colaborador cadastrado em 2026), o `UPDATE` afetava zero registros e a
dedução era perdida silenciosamente. `getLeaveBalance` mascarava o problema devolvendo um
default (`{ total_days: 20, used_days: 0 }`) quando não achava linha, então o saldo
simplesmente parecia "voltar a zerar" em vez de refletir férias já aprovadas.

**Correção aplicada**: `approveLeaveRequest` agora faz um upsert —

```sql
INSERT INTO leave_balance (employee_id, year, total_days, used_days)
VALUES ($1, $2, 20, $dias)
ON CONFLICT (employee_id, year)
DO UPDATE SET used_days = leave_balance.used_days + $dias
```

— que cria a linha do ano (com o mesmo default de 20 dias usado no cadastro) quando ela
não existe, em vez de assumir que ela sempre foi criada antes. Regressão travada em
`backend/tests/leave.test.js` ("aprovar férias num ano sem linha de leave_balance cria a
linha").

### `documents.file_url` é uma URL colada, não um upload real

Não há integração com storage (S3, Supabase Storage, etc.). `file_url` é uma string
livre digitada no formulário — o "upload" documentado no README é, na prática, "cole o
link de um arquivo que já está hospedado em algum lugar". Ver
[known-limitations.md](known-limitations.md).

### Índices existentes

```sql
idx_users_company, idx_employees_company, idx_documents_employee,
idx_payroll_company, idx_leave_requests_employee
```

Cobrem os filtros por tenant e por dono mais comuns. Não há índice em
`leave_requests.status` nem em `documents.expiration_date` — ambos usados em `WHERE` nas
queries de dashboard e "documentos vencendo"; irrelevante no volume atual, mas a primeira
coisa a olhar se essas queries ficarem lentas com mais dados.
