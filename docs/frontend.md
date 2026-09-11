# Frontend

## Rotas (`App.jsx`)

| Rota | Componente | Acesso |
|---|---|---|
| `/` | `Landing` (visitante) ou redirect para `/dashboard` (autenticado) | pública |
| `/login` | `Login` — mesma tela alterna entre login e registro | pública |
| `/dashboard` | `Dashboard` | protegida |
| `/employees` | `Employees` | protegida |
| `/payroll` | `Payroll` | protegida |
| `/payroll/:id` | `PayrollDetail` | protegida |
| `/leave` | `Leave` | protegida |
| `/documents` | `Documents` | protegida |
| `/team` | `Team` | protegida |

"Protegida" = envolvida em `ProtectedRoute`, que redireciona para `/login` se
`useAuth().isAuthenticated` for `false`. Não existe rota 404 dedicada — um caminho que não
bate com nenhuma rota (ex.: digitado errado) renderiza uma página em branco, porque
`react-router-dom` simplesmente não encontra match e não há `<Route path="*">`.

Todas as páginas protegidas usam `Layout.jsx` (sidebar), `Dashboard.jsx` incluído — até
set/2026 o Dashboard tinha um header próprio e nenhuma sidebar, a única página protegida
sem navegação lateral.

## Padrão de página (Employees, Payroll, Leave, Documents, Team)

As cinco páginas do app logado seguem o mesmo esqueleto, útil de conhecer antes de criar
uma nova:

1. `useEffect` dispara um fetch inicial para `GET` a lista do recurso.
2. Estado local (`useState`) guarda a lista, um `showForm` booleano, e os campos do
   formulário.
3. O "formulário de criação" é a mesma seção que aparece/desaparece (`showForm`) — não é
   um modal, é inline, acima da tabela.
4. Toda mutação (`POST`/`PUT`/`DELETE`) é seguida por um refetch da lista inteira — não há
   atualização otimista nem cache (sem React Query/SWR).
5. Erros de mutação caem em `alert()` do browser (ex.: `Employees.jsx`, `Leave.jsx`) — não
   há sistema de toast/notificação.
6. **Controles de escrita são condicionados a `useAuth().isAdmin`** (botões "Novo X",
   "Editar", "Excluir", "Aprovar"/"Rejeitar", coluna "Ações"): `member` só vê a leitura.
   Isso é só UX — a autorização de verdade é o backend recusando com 403 (ver
   [architecture.md](architecture.md)). **Importante para quem adicionar uma rota nova**:
   o gate de `isAdmin` no frontend e o `requireAdmin` na rota do backend são duas fontes
   de verdade separadas e não sincronizadas automaticamente — esquecer um dos dois lados
   não quebra testes, só produz uma UX inconsistente (botão visível que sempre falha) ou
   uma lacuna de segurança (ação exposta que o backend não bloqueia).

`Documents.jsx` adiciona uma variação: um `<select>` de colaborador no topo, porque
documentos são consultados por colaborador (`GET /documents/:employeeId`), não há um
endpoint "todos os documentos da empresa" (só o de "vencendo em breve").

`Team.jsx` é a única página onde `member` também não vê o botão de ação ("Convidar
Usuário"), mas continua vendo a tabela inteira — listar a equipe é uma rota `GET`
aberta a qualquer papel.

`PayrollDetail.jsx` (`/payroll/:id`) foge um pouco do esqueleto acima: não existe um
endpoint que devolva os dados da folha (mês/ano/status) junto com os itens —
`GET /payroll/:id/details` só devolve os itens — então a página busca `GET /payroll`
inteiro e faz `.find()` pelo id para montar o cabeçalho, em paralelo com a busca dos
itens e da lista de colaboradores. Também introduz uma regra de negócio própria: os
controles de escrita (novo lançamento, editar, aprovar) somem não só para `member`, mas
também para `admin` assim que `payroll.status === 'approved'` — uma folha aprovada é
somente leitura para todo mundo.

## `Layout.jsx`

Sidebar fixa usada por todas as páginas protegidas (não pela `Landing`, que tem seu
próprio header). A lista de itens do menu é um array hardcoded dentro do componente —
adicionar uma página nova ao menu significa editar esse array manualmente, não é derivado
das rotas de `App.jsx`. O item "Equipe" aparece para todos os papéis (member incluído),
já que a leitura da equipe é permitida a todos. `/payroll/:id` não tem item próprio no
menu — é alcançada a partir de "Folha de Pagamento", como uma sub-página de detalhe.

## `useAuth.js`

Não é Context — é um hook chamado independentemente em cada componente que precisa
(`Login`, `Dashboard`, `Layout`, `App`, e as páginas que gateiam por papel). Cada chamada
de `useAuth()` lê `localStorage` de novo e mantém seu próprio estado React. Funciona
porque o hook é simples e todos os componentes leem o mesmo `localStorage`, mas significa
que **não há um único estado de autenticação compartilhado** — se um dia for preciso
reagir instantaneamente a um logout disparado em outra aba/componente, isso vai exigir
migrar para Context ou um store externo.

Expõe `isAdmin` (derivado de `user.role !== 'member'`) além de `isAuthenticated`/`user`/
`login`/`register`/`logout`. Sessões de antes de set/2026 não têm `role` salvo no
`localStorage` — `isAdmin` trata a ausência do campo como admin, espelhando o mesmo
fallback do backend (`middleware/auth.js`) para tokens antigos.

## `Landing.jsx`

Única página com identidade visual própria (fonte serifada "Fraunces" + paleta
`ink`/`cream`/`accent` definida em `tailwind.config.js`), deliberadamente diferente do
app logado (que usa a paleta azul padrão do Tailwind). Os screenshots usados nos blocos de
funcionalidades (`src/assets/screenshots/*.png`) são capturas reais do app rodando
localmente, não mockups desenhados — se a UI de alguma tela mudar de forma visível,
essas imagens ficam desatualizadas e vale recapturá-las.

## O que não existe

- Testes de componente (nenhum arquivo `*.test.jsx`)
- Gerenciamento de estado global (Redux/Zustand/Context) — tudo é `useState` local + refetch
- Validação de formulário no cliente além de `required` do HTML — o backend valida de
  verdade desde set/2026 (`utils/validation.js`, ver [api.md](api.md)), mas o frontend não
  reflete essas regras antes de enviar; ele só mostra a mensagem de erro do backend num
  `alert()` depois de um 400 vir de volta.
- Internacionalização — todo texto é português hardcoded
