# Limitações conhecidas e próximos passos

Lista viva, priorizada pelo risco de cada item — não pelo esforço de implementar. Cada
item tem o motivo de estar na lista, não só a descrição.

## Segurança e integridade

### ~~`POST /auth/register` cria empresa órfã quando o e-mail já existe~~ — resolvido em set/2026
**Encontrado pela suite de testes** (`backend/tests/`), não por revisão manual. `register`
em `authController.js` fazia dois `INSERT` sequenciais sem transação: primeiro em
`companies`, depois em `users`. Quando o segundo falhava (e-mail duplicado, 409 devolvido
ao cliente), o primeiro já tinha sido commitado — sobrava uma linha em `companies` sem
nenhum `user` associado, para sempre, silenciosamente.

**Correção aplicada**: os dois `INSERT`s agora rodam dentro de uma transação
(`client.query('BEGIN'/'COMMIT'/'ROLLBACK')` via `pool.connect()`) — se o insert do
usuário falhar, o da empresa é desfeito também. Regressão travada em
`backend/tests/auth.test.js` ("email duplicado não deixa empresa órfã"), que assevera
`countCompaniesByName(nomeDaTentativaFalha) === 0` depois de um 409.

### ~~Não existe controle de acesso por papel~~ — resolvido em set/2026
`register` sempre cria `role: 'admin'`, e até essa correção o login nunca lia `role` de
volta nem o incluía no JWT — qualquer usuário autenticado podia aprovar folha, aprovar
férias ou excluir documentos de qualquer colaborador da própria empresa, sem checagem.

**Correção aplicada**: `POST /api/users` (admin-only) convida um segundo usuário com papel
`admin` ou `member`; login/registro agora incluem `role` no JWT e na resposta;
`middleware/auth.js` expõe `requireAdmin`, aplicado a toda rota de escrita
(`POST`/`PUT`/`DELETE`) em `routes/index.js`. `member` = leitura em tudo, escrita em nada.
Ver [architecture.md](architecture.md) para o desenho completo e
[frontend.md](frontend.md) para como a UI esconde os controles de escrita para `member`.

**O que ainda não existe**: papéis mais granulares (ex.: "aprova férias mas não folha"),
convite por e-mail (a senha é definida por quem convida e repassada por fora do sistema),
e qualquer vínculo entre um `user` e um `employee` — um `member` é um espectador da
empresa inteira, não um portal de autoatendimento do colaborador.

### ~~`PUT /payroll/:id/items/:itemId` não filtrava por empresa~~ — resolvido em set/2026
**Encontrado escrevendo o teste de regressão de autorização**, não por revisão manual.
A query de `updatePayrollItem` era `WHERE id = itemId AND payroll_id = id` — sem
`company_id` em lugar nenhum. Qualquer admin autenticado, de qualquer empresa, conseguia
editar o item de folha de outra empresa sabendo (ou adivinhando sequencialmente) os ids.
Nenhum dos testes anteriores cobria `payroll_items` especificamente, por isso passou
despercebido até agora.

**Correção aplicada**: a query passou a buscar o item via `JOIN payroll ... WHERE
p.company_id = $3` antes de aceitar a atualização. De caminho, corrigi também dois outros
problemas na mesma função: (1) o `COALESCE` do SQL nunca funcionava de verdade — os
valores ausentes eram coagidos para `0` em JS antes de chegar na query, então a coluna
nunca via `NULL`, e uma atualização parcial (só `base_salary`, por exemplo) zerava
`deductions`/`additions` em vez de preservá-los; (2) somar um número (do request) com uma
string (`DECIMAL` do Postgres vem como string via `pg`) sem `Number(...)` explícito fazia
o `+` virar concatenação de string — `6000 - "300.00" + "100.00"` resultava em
`"5700100.00"`, não `5800`. Esse segundo bug foi introduzido pela própria correção do
primeiro e só apareceu ao rodar o teste de regressão que eu mesmo escrevi — ver
`backend/tests/payroll.test.js` ("atualização parcial de item preserva os campos não
enviados") e `backend/tests/authorization.test.js` ("empresa B não consegue editar item
de folha da empresa A").

### Multi-tenancy depende de disciplina manual em cada controller
Não há Row Level Security nem um middleware central — cada controller escreve
`WHERE company_id = $1` manualmente. Funciona hoje (auditado em set/2026), mas um
controller novo que esqueça o filtro vaza dados entre empresas sem erro nenhum. Testes de
autorização cross-tenant (usuário da empresa A tentando acessar recurso da empresa B)
são a forma mais barata de blindar isso — ver [local-development.md](local-development.md)
sobre os testes automatizados.

### ~~Sem testes automatizados~~ — resolvido em set/2026
`backend/tests/` cobre os 5 fluxos principais (auth, colaboradores, férias, folha,
documentos) mais um arquivo dedicado a isolamento multi-tenant
(`authorization.test.js`), rodando contra o Postgres real via `npm test`. Ver
[local-development.md](local-development.md). Cobertura ainda ausente: componentes de
frontend, e casos de borda de validação (ver item abaixo).

## Dados

### ~~`leave_balance` não existia para anos além do ano de cadastro~~ — resolvido em set/2026
Detalhado em [database.md](database.md). `approveLeaveRequest` agora faz upsert em vez de
`UPDATE` puro, criando a linha do ano quando necessário. Regressão travada em
`backend/tests/leave.test.js`.

### ~~Sem validação de dados além do HTML `required`~~ — resolvido em set/2026
Nenhum controller validava formato de CPF, e-mail, datas coerentes (fim antes do início),
ou valores negativos (salário, dias de férias). O banco só impedia duplicidade de
CPF/e-mail via `UNIQUE` — o resto passava.

**Correção aplicada**: `backend/src/utils/validation.js` reúne validadores pequenos e
sem dependência (`cpfError`, `positiveNumberError`, `nonNegativeNumberError`, `dateError`,
`dateRangeError`, `emailError`, `passwordError`, `monthError`), aplicados nos pontos de
escrita: CPF (11 dígitos) e salário/data no cadastro de colaborador; tipo de solicitação
e `end_date >= start_date` em férias; mês 1-12 e valores não-negativos em folha; formato
de e-mail e senha mínima (6 caracteres) em registro e convite. Deliberadamente não é uma
lib de schema (Zod/Joi) — são checagens pontuais, do tamanho do problema atual. Se a
lista de regras crescer muito, esse é o sinal para migrar para uma lib de verdade.

## Produto

### ~~`Dashboard.jsx` não tinha sidebar~~ — resolvido em set/2026
Era a única página protegida sem navegação — para chegar em qualquer outra tela a partir
do Dashboard, só pelos atalhos de "Ações Rápidas" ou digitando a URL. Agora usa
`Layout.jsx` como as demais páginas.

### ~~"Abrir Folha" levava a uma rota que não existia~~ — resolvido em set/2026
`Payroll.jsx` navegava para `/payroll/:id`, mas `App.jsx` não tinha essa rota. Agora existe
`PayrollDetail.jsx` (`/payroll/:id`): lista os lançamentos, permite adicionar/editar
lançamentos e aprovar a folha (admin, só enquanto `status = 'draft'`), e mostra tudo em
modo leitura para `member`. `Payroll.jsx` também trocou `window.location.href` por
`navigate()` do react-router (evitava um reload completo da página desnecessário).

### ~~Upload de documento era uma URL colada~~ — resolvido em set/2026
Não havia storage integrado — quem cadastrava precisava já ter o arquivo hospedado em
algum lugar e colar o link.

**Correção aplicada**: `POST /documents/:employeeId` agora aceita `multipart/form-data`
de verdade (`multer`, campo `file`), salva em `backend/uploads/` (nome aleatório de 24
bytes, não sequencial) e devolve `file_url` como uma URL absoluta e baixável
(`http://host/uploads/<nome-aleatório>.ext`). `DELETE /documents/:id` remove o arquivo do
disco junto com a linha do banco. Tipos aceitos: PDF, JPEG, PNG, DOC, DOCX; limite de
10MB; qualquer outro tipo ou arquivo maior retorna `400`.

**Trade-offs deliberados, não escondidos**:
- **Servido sem autenticação.** A app usa Bearer token em `localStorage`, não cookie —
  um `<a href>` clicado pelo navegador não envia esse header, então uma rota de download
  autenticada exigiria um esquema de token por query string (URL assinada de curta
  duração) que não foi construído nesta rodada. Hoje, quem tem a URL exata acessa o
  arquivo sem estar logado — mesma postura de segurança do modelo anterior (URL externa
  colada), só que agora com nome de arquivo aleatório e não-sequencial em vez de
  confiar 100% no host externo.
- **Disco local, não object storage.** Funciona em desenvolvimento e em qualquer deploy
  com disco persistente. No Railway (o alvo de deploy), o filesystem é efêmero por
  padrão — sem um volume anexado, todo arquivo enviado é perdido no próximo redeploy.
  Migrar para S3/Supabase Storage/R2 é a forma correta de resolver isso antes de
  produção real; não foi feito aqui por não haver conta de nenhum provedor configurada
  no projeto.
- **`ON DELETE CASCADE` não limpa arquivos.** Apagar uma `company` ou `employee` remove
  as linhas de `documents` via cascade no banco, mas não chama nenhum código que apague
  o arquivo correspondente em `uploads/` — só `DELETE /documents/:id` faz essa limpeza.
  Arquivos órfãos no disco depois de excluir um colaborador são esperados hoje.

### Notificações existem só na tela, não por e-mail
Documentos vencendo e férias pendentes aparecem no dashboard e na tela de Documentos, mas
não há envio de e-mail/push — se ninguém abrir o app, ninguém é avisado.

### Sem paginação
`GET /employees`, `/leave-requests`, `/payroll` devolvem a lista inteira da empresa.
Sem problema no volume de teste; primeiro lugar a doer quando uma empresa tiver
centenas de colaboradores.

## Growth / não-engenharia

### Sem analytics na landing page
Não há pixel/tracking configurado — não é possível saber hoje o que está convertendo na
landing page criada em set/2026.

### SEO básico ausente
`index.html` ainda usa o favicon padrão do Vite (`vite.svg`), sem `meta description` nem
`og:image` customizados.

### Deploy no Railway nunca foi testado de fato
Existem `railway.json` e `Dockerfile`s prontos, mas nenhum deploy real foi executado —
tudo que foi validado até agora rodou em ambiente local.

## Ordem sugerida daqui para frente

1. ~~Testes automatizados dos 5 fluxos principais~~ — feito em set/2026 (`backend/tests/`).
2. ~~Empresa órfã em `POST /auth/register`~~ — feito em set/2026 (transação + teste de regressão).
3. ~~Gap de `leave_balance` entre anos~~ — feito em set/2026 (upsert + teste de regressão).
4. ~~Convite de usuário + papel real~~ — feito em set/2026 (`POST /users`, `requireAdmin`,
   `Team.jsx`, gates de UI por `isAdmin`).
5. ~~`updatePayrollItem` sem filtro de empresa~~ — feito em set/2026 (achado escrevendo
   testes de autorização; corrigido junto com dois bugs de cálculo na mesma função).
6. ~~Validação de dados nos controllers~~ — feito em set/2026 (`utils/validation.js`).
7. ~~Página de detalhes da folha + sidebar no Dashboard~~ — feito em set/2026.
8. ~~Upload de arquivo real para documentos~~ — feito em set/2026 (`multer`, disco local;
   ver trade-offs de segurança e persistência na seção acima).
9. Notificação por e-mail, paginação, analytics, SEO, deploy real — nessa ordem só
   importa depois que a empresa tiver uso real acontecendo. Migrar upload de disco local
   para object storage (S3/Supabase/R2) deveria acontecer *antes* do primeiro deploy real
   no Railway, já que o filesystem lá é efêmero sem volume — ver acima.
