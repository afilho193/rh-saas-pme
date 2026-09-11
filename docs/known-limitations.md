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

### Não existe controle de acesso por papel (autorização)
A coluna `role` existe em `users` mas `register` sempre cria `role: 'admin'` e o login
nunca lê `role` de volta nem a inclui no JWT. Qualquer usuário autenticado pode aprovar
folha, aprovar/rejeitar férias ou excluir documentos de qualquer colaborador da própria
empresa — não há hoje um segundo papel para comparar contra.

**Por que não foi corrigido direto**: implementar isso de verdade exige primeiro um
recurso que não existe — convidar/criar um segundo usuário numa empresa já cadastrada.
Adicionar uma checagem de `role` sem esse recurso não teria efeito prático (toda conta
existente já é admin). É maior que "uma coisa"; ver como o próximo item grande depois dos
testes.

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

### `leave_balance` não existe para anos além do ano de cadastro do colaborador
Detalhado em [database.md](database.md). Aprovar férias com `start_date` num ano sem
linha de saldo correspondente não gera erro — só não deduz nada, silenciosamente. Afeta
qualquer colaborador com mais de um ano de casa.

### Sem validação de dados alem do HTML `required`
Nenhum controller valida formato de CPF, e-mail, datas coerentes (fim antes do início),
ou valores negativos (salário, dias de férias). O banco só impede duplicidade de CPF/e-mail
via `UNIQUE` — o resto passa.

## Produto

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
3. Corrigir o gap de `leave_balance` entre anos.
4. Desenhar e implementar convite de usuário + papel real (bloqueia autorização por papel).
5. Validação de dados nos controllers (CPF, datas, valores).
6. Upload de arquivo real para documentos.
7. Paginação, analytics, SEO, deploy real — nessa ordem só importa depois que a empresa
   tiver uso real acontecendo.
