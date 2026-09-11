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

### Sem validação de dados alem do HTML `required`
Nenhum controller valida formato de CPF, e-mail, datas coerentes (fim antes do início),
ou valores negativos (salário, dias de férias). O banco só impede duplicidade de CPF/e-mail
via `UNIQUE` — o resto passa.

## Produto

### `Dashboard.jsx` não tem sidebar — é a única página protegida sem navegação
Detalhado em [frontend.md](frontend.md). Achado ao testar a tela de Equipe pelo
navegador: a partir do Dashboard não dá pra navegar pela sidebar (ela não existe ali),
só pelos atalhos de "Ações Rápidas" ou digitando a URL. Não corrigido — é inconsistência
de UI, não bug funcional, e mexer no Dashboard não era o escopo da vez.

### "Abrir Folha" leva a uma rota que não existe
`Payroll.jsx` navega para `/payroll/:id` ao clicar em "Abrir Folha", mas `App.jsx` não
tem essa rota — a página de detalhes de uma folha (que consumiria
`GET /payroll/:id/details`, já pronto no backend) nunca foi construída no frontend.
Achado incidentalmente, não corrigido nesta rodada.

### Upload de documento é uma URL colada, não um arquivo de verdade
`file_url` é texto livre — não há storage (S3, Supabase, etc.) integrado. Quem cadastra
precisa já ter o arquivo hospedado em algum lugar e colar o link.

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
5. Validação de dados nos controllers (CPF, datas, valores).
6. Construir a página de detalhes da folha (`/payroll/:id`, hoje um link morto) e colocar
   `Dashboard.jsx` dentro de `Layout.jsx` (única página protegida sem sidebar).
7. Upload de arquivo real para documentos.
8. Paginação, analytics, SEO, deploy real — nessa ordem só importa depois que a empresa
   tiver uso real acontecendo.
