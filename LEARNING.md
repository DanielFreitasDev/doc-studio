# LEARNING.md — base de conhecimento do projeto

Leia as entradas relacionadas à tarefa. Os detalhes ficam em `docs/learning/`.

## Bugs e soluções
- [Reset de margens não valia na área de medição](docs/learning/bug-reset-fora-da-area-de-medicao.md) — CSS que muda tamanho de bloco vale em `.page` e na medição; resets com `:where(.doc)`.
- [Paginação recalculada durante a impressão](docs/learning/bug-medicao-escondida-na-impressao.md) — a área de medição não pode sumir no CSS de impressão; senão o PDF junta páginas.

## Pegadinhas de ambiente, dependências e bibliotecas
- [Utilitários de visibilidade perdem para os componentes](docs/learning/gotcha-especificidade-dos-utilitarios-de-visibilidade.md) — `components.css` carrega depois; use `.topbar .hide-compact` e similares.
- [Cache de CSS e módulos no servidor local](docs/learning/gotcha-cache-de-modulos-no-servidor-local.md) — `http.server` permite cache heurístico; recarregue sem cache antes de julgar uma correção.
- [Firefox e WebKit no ambiente de testes](docs/learning/gotcha-navegadores-de-teste-no-ambiente.md) — `executablePath` para os navegadores em cache e `127.0.0.1` em vez de `localhost`.
- [Zoom "ajustar à largura" em laço](docs/learning/gotcha-zoom-em-laco-com-barra-de-rolagem.md) — barra de rolagem clássica muda a largura; `scrollbar-gutter: stable` na área rolável.

## Decisões de arquitetura
- [Paginação por átomos e PDF pela impressão](docs/learning/decision-paginacao-por-atomos.md) — blocos medidos com o CSS real; prévia e PDF são o mesmo DOM; parágrafos divididos por linha; outro átomo maior que a página gera aviso.
- [Assinaturas pelas regras do MIV](docs/learning/decision-assinaturas-pelas-regras-do-miv.md) — órgão à esquerda, Governo à direita, sem fio, tamanhos mínimos, vertical e conceito em 4 linhas; difere dos dois primeiros manuais de propósito.
- [Campos de texto com marcação em vez de contenteditable](docs/learning/decision-texto-com-marcacao-em-vez-de-contenteditable.md) — texto sempre escapado antes de `renderInline()`; nada de HTML livre.

## Abordagens que NÃO funcionaram
- [Filtro CSS de cinza transforma o PDF em imagem](docs/learning/failed-filtro-css-cinza-rasteriza-pdf.md) — `filter` no documento rasteriza a página no Chromium; use cores cinza reais.

## Notas de performance

## Referências externas
- [Fontes do padrão visual](docs/learning/reference-manual-de-identidade-visual.md) — MIV, manuais aprovados, página de origem de cada capa, erratas de cor do MIV e como os logos (inclusive os em cinza) foram gerados.
