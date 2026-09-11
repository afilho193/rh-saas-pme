# Frontend

## Rotas (`App.jsx`)

| Rota | Componente | Acesso |
|---|---|---|
| `/` | `Landing` (visitante) ou redirect para `/dashboard` (autenticado) | pública |
| `/login` | `Login` — mesma tela alterna entre login e registro | pública |
| `/dashboard` | `Dashboard` | protegida |
| `/employees` | `Employees` | protegida |
| `/payroll` | `Payroll` | protegida |
| `/leave` | `Leave` | protegida |
| `/documents` | `Documents` | protegida |

"Protegida" = envolvida em `ProtectedRoute`, que redireciona para `/login` se
`useAuth().isAuthenticated` for `false`. Não existe rota 404 dedicada — um caminho que não
bate com nenhuma rota (ex.: digitado errado) renderiza uma página em branco, porque
`react-router-dom` simplesmente não encontra match e não há `<Route path="*">`.

## Padrão de página (Employees, Payroll, Leave, Documents)

As quatro páginas do app logado seguem o mesmo esqueleto, útil de conhecer antes de criar
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

`Documents.jsx` adiciona uma variação: um `<select>` de colaborador no topo, porque
documentos são consultados por colaborador (`GET /documents/:employeeId`), não há um
endpoint "todos os documentos da empresa" (só o de "vencendo em breve").

## `Layout.jsx`

Sidebar fixa usada pelas páginas protegidas (não pela `Landing`, que tem seu próprio
header). A lista de itens do menu é um array hardcoded dentro do componente — adicionar
uma página nova ao menu significa editar esse array manualmente, não é derivado das rotas
de `App.jsx`.

## `useAuth.js`

Não é Context — é um hook chamado independentemente em cada componente que precisa
(`Login`, `Dashboard`, `Layout`, `App`). Cada chamada de `useAuth()` lê `localStorage`
de novo e mantém seu próprio estado React. Funciona porque o hook é simples e todos os
componentes leem o mesmo `localStorage`, mas significa que **não há um único estado de
autenticação compartilhado** — se um dia for preciso reagir instantaneamente a um logout
disparado em outra aba/componente, isso vai exigir migrar para Context ou um store
externo.

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
- Validação de formulário além de `required` do HTML — nada impede, por exemplo, salário
  negativo ou data de fim de férias antes da data de início
- Internacionalização — todo texto é português hardcoded
