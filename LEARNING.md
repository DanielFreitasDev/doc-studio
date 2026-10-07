# LEARNING.md — base de conhecimento do projeto

Leia as entradas relacionadas à tarefa. Os detalhes ficam em `docs/learning/`.

## Bugs e soluções
- [Reset de margens não valia na área de medição](docs/learning/bug-reset-fora-da-area-de-medicao.md) — CSS que muda tamanho de bloco vale em `.page` e na medição; resets com `:where(.doc)`.

## Pegadinhas de ambiente, dependências e bibliotecas
- [Utilitários de visibilidade perdem para os componentes](docs/learning/gotcha-especificidade-dos-utilitarios-de-visibilidade.md) — `components.css` carrega depois; use `.topbar .hide-compact` e similares.
- [Cache de CSS e módulos no servidor local](docs/learning/gotcha-cache-de-modulos-no-servidor-local.md) — `http.server` permite cache heurístico; recarregue sem cache antes de julgar uma correção.

## Decisões de arquitetura
- [Paginação por átomos e PDF pela impressão](docs/learning/decision-paginacao-por-atomos.md) — blocos medidos com o CSS real; prévia e PDF são o mesmo DOM; átomo maior que a página gera aviso.
- [Assinaturas pelas regras do MIV](docs/learning/decision-assinaturas-pelas-regras-do-miv.md) — órgão à esquerda, Governo à direita, sem fio, tamanhos mínimos; difere dos dois primeiros manuais de propósito.
- [Campos de texto com marcação em vez de contenteditable](docs/learning/decision-texto-com-marcacao-em-vez-de-contenteditable.md) — texto sempre escapado antes de `renderInline()`; nada de HTML livre.

## Abordagens que NÃO funcionaram

## Notas de performance

## Referências externas
- [Fontes do padrão visual](docs/learning/reference-manual-de-identidade-visual.md) — MIV, manuais aprovados, página de origem de cada capa, erratas de cor do MIV e como os logos foram gerados.
