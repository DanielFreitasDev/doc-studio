# LEARNING.md — base de conhecimento do projeto

Leia as entradas relacionadas à tarefa. Os detalhes ficam em `docs/learning/`.

## Bugs e soluções
- [Reset de margens não valia na área de medição](docs/learning/bug-reset-fora-da-area-de-medicao.md) — CSS que muda tamanho de bloco vale em `.page` e na medição; resets com `:where(.doc)`.
- [Respiro de segmento fora da medição](docs/learning/bug-respiro-de-segmento-fora-da-medicao.md) — `seg-start/seg-end` entram depois da paginação; só cantos, respiro em `is-first/is-last`.
- [Tema declarado no JS sem tokens no CSS](docs/learning/bug-tema-sem-tokens-no-css.md) — tema Azul existia só em `design.js`; `docstudio check` confere temas, paleta e contraste.
- [Paginação recalculada durante a impressão](docs/learning/bug-medicao-escondida-na-impressao.md) — a área de medição não pode sumir no CSS de impressão; senão o PDF junta páginas.

## Pegadinhas de ambiente, dependências e bibliotecas
- [Utilitários de visibilidade perdem para os componentes](docs/learning/gotcha-especificidade-dos-utilitarios-de-visibilidade.md) — `components.css` carrega depois; use `.topbar .hide-compact` e similares.
- [Cache de CSS e módulos no servidor local](docs/learning/gotcha-cache-de-modulos-no-servidor-local.md) — `http.server` permite cache heurístico; recarregue sem cache ou use `docstudio serve` (no-store).
- [Firefox e WebKit no ambiente de testes](docs/learning/gotcha-navegadores-de-teste-no-ambiente.md) — `executablePath` e `127.0.0.1`; colar testado com `ClipboardEvent` sintético; seletor de arquivo trava o MCP.
- [Popover fora do diálogo modal fica inerte](docs/learning/gotcha-popover-fora-do-dialogo-modal.md) — menu aberto com `<dialog>` modal precisa morar dentro do diálogo; fora dele não recebe clique nem foco.
- [Zoom "ajustar à largura" em laço](docs/learning/gotcha-zoom-em-laco-com-barra-de-rolagem.md) — barra de rolagem clássica muda a largura; `scrollbar-gutter: stable` na área rolável.
- [display próprio anula o popover fechado](docs/learning/gotcha-display-de-popover-fechado.md) — declare `display` só em `:popover-open`; no seletor base o popover fechado fica na tela.

## Decisões de arquitetura
- [Paginação por átomos e PDF pela impressão](docs/learning/decision-paginacao-por-atomos.md) — blocos medidos com o CSS real; prévia e PDF são o mesmo DOM; parágrafos divididos por linha; outro átomo maior que a página gera aviso.
- [Assinaturas pelas regras do MIV](docs/learning/decision-assinaturas-pelas-regras-do-miv.md) — órgão à esquerda, Governo à direita, sem fio, tamanhos mínimos, vertical e conceito em 4 linhas; difere dos dois primeiros manuais de propósito.
- [Menu de contexto por provedores](docs/learning/decision-menu-de-contexto-por-provedores.md) — botão direito só onde um provedor reconhece o elemento; ações dos botões, Shift = menu do navegador, toque em campo = nativo.
- [Campos visuais sobre a marcação segura](docs/learning/decision-texto-com-marcacao-em-vez-de-contenteditable.md) — edição WYSIWYG, mas o documento guarda marcação escapada; formatação por trechos, sem `execCommand`.
- [Edição na página por campo flutuante](docs/learning/decision-edicao-na-pagina-por-campo-flutuante.md) — duplo clique abre campo sobre o trecho (`data-edit`); as páginas não ficam editáveis.
- [Contrato para agentes de IA](docs/learning/decision-contrato-para-agentes-de-ia.md) — mesmo modelo do editor, operações por id, PDF pelo próprio app; nada de HTML gerado nem renderizador paralelo.
- [Paisagem pela quebra de página](docs/learning/decision-paisagem-por-quebra-de-pagina.md) — A4 deitado só no conteúdo, a partir de uma quebra; capas do MIV ficam em retrato.

## Abordagens que NÃO funcionaram
- [Filtro CSS de cinza transforma o PDF em imagem](docs/learning/failed-filtro-css-cinza-rasteriza-pdf.md) — `filter` no documento rasteriza a página no Chromium; use cores cinza reais.

## Notas de performance

## Referências externas
- [Fontes do padrão visual](docs/learning/reference-manual-de-identidade-visual.md) — MIV, manuais aprovados, página de origem de cada capa, erratas de cor do MIV e como os logos (inclusive os em cinza) foram gerados.
