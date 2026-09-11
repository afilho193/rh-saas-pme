# Documentação Técnica — RH SaaS

Este diretório é a referência técnica da solução: como ela é construída, como os dados
fluem, e o que se sabe estar incompleto ou frágil hoje. O [SETUP.md](../SETUP.md) na raiz
do repositório cobre "como rodar" — este diretório cobre "como funciona por dentro".

## Índice

- [architecture.md](architecture.md) — stack, estrutura de pastas, multi-tenancy, fluxo de uma requisição
- [database.md](database.md) — schema, relacionamentos, e uma inconsistência de dados conhecida
- [api.md](api.md) — referência de todos os endpoints, autenticação, exemplos de payload
- [frontend.md](frontend.md) — rotas, páginas, convenções de UI
- [local-development.md](local-development.md) — passo a passo para rodar localmente, incluindo os problemas reais que apareceram ao configurar num Mac
- [deployment.md](deployment.md) — como o deploy em produção (Vercel + Supabase + Vercel Blob) está montado, e como redeployar/migrar o banco manualmente
- [known-limitations.md](known-limitations.md) — o que falta ou está frágil, priorizado, com o motivo de cada item

## Como manter isto atualizado

Esta documentação foi escrita a partir do código-fonte em setembro de 2026, lendo cada
controller e testando os fluxos manualmente e via navegador (não é um resumo do README —
é uma leitura linha a linha do backend e frontend). Se um endpoint, tabela ou rota mudar,
atualize o arquivo correspondente no mesmo commit. Documentação desatualizada é pior que
nenhuma documentação, porque mente com confiança.
