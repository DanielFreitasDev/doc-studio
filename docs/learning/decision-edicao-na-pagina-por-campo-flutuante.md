---
name: Edição na página por campo flutuante
description: duplo clique num texto da prévia abre um campo sobre ele; as páginas não ficam editáveis porque são redesenhadas a cada mudança
type: project
category: decision
date: 2026-10-07
---
A edição "direto na página" (`js/quickedit.js`) abre um campo flutuante (popover manual) sobre o trecho clicado; a página continua sendo só o resultado.

**Problema/Contexto:** o pedido era editar → ver na hora, como num editor visual. As páginas da prévia são recalculadas e trocadas (`patchPages`) a cada alteração, e a paginação pode levar o trecho para outra página.

**Por que importa:** tornar o próprio texto da página `contenteditable` perderia o cursor a cada redesenho e misturaria a interface com o DOM que vira PDF.

**Como aplicar:**
- `js/render.js` marca cada trecho com `data-edit="caminho.no.bloco"` (ex.: `items.2.title`, `rows.0.1`) ou `data-edit-meta="title"`. Um campo novo num bloco precisa dessa marca para ser editável na página.
- O campo grava com `source: 'quick'`; o editor (`syncControl`) e o painel Textos atualizam só o controle afetado.
- O popover é `manual` (um `showModal()` do diálogo de link fecharia um popover `auto`) e fecha por Esc, Enter (uma linha), "Concluir" ou clique fora.
- Em telas estreitas um toque no texto já abre o campo (o primeiro toque levava ao editor e o duplo toque nunca chegava).

**Evidência:** em 2026-10-07, Playwright: título da capa, célula de tabela (com Ctrl+B), título de passo no celular (390 px) e parágrafo no Firefox e WebKit editados pela página, com o editor e o painel Textos sincronizados e Ctrl+Z desfazendo.
