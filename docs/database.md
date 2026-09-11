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

### `leave_balance` só existe para o ano em que o colaborador foi cadastrado

`createEmployee` (em `employeeController.js`) cria automaticamente uma linha em
`leave_balance` para o **ano corrente no momento do cadastro**, com `total_days = 20`.
`approveLeaveRequest` (em `leaveController.js`) faz:

```sql
UPDATE leave_balance SET used_days = used_days + $dias
WHERE employee_id = $1 AND year = $2  -- ano do start_date da solicitação
```

Se a solicitação de férias tiver `start_date` num ano **diferente** do ano de cadastro do
colaborador — o mais óbvio: um colaborador cadastrado em 2026 solicitando férias que começam
em 2027 — esse `UPDATE` não encontra nenhuma linha, afeta zero registros, e a dedução é
**perdida silenciosamente** (sem erro, sem log). `getLeaveBalance` cobre parte do problema
ao devolver um saldo default (`{ total_days: 20, used_days: 0 }`) quando não existe linha
para o ano consultado, mas isso mascara o problema em vez de resolvê-lo: o saldo mostrado
volta a "20/0" em vez de refletir férias já aprovadas.

**Não corrigido nesta rodada** — documentado aqui porque é o tipo de bug que só aparece na
virada do ano, quando já afeta dados reais. Corrigir exigiria criar a linha de
`leave_balance` sob demanda (on-the-fly) em `approveLeaveRequest`/`getLeaveBalance` quando
ela não existir para o ano solicitado, em vez de assumir que sempre foi criada no cadastro.

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
