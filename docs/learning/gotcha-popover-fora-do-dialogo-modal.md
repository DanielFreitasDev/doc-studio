---
name: Popover fora do diálogo modal fica inerte
description: menu (popover) aberto com um <dialog> modal aberto precisa estar dentro do diálogo; fora dele não recebe clique nem foco
type: project
category: gotcha
date: 2026-10-07
---
Com um `<dialog>` aberto por `showModal()`, um popover que mora fora do diálogo aparece na tela (camada superior), mas fica inerte: não recebe clique nem foco. Menus abertos a partir de algo dentro de um diálogo precisam ser movidos para dentro dele antes de `showPopover()`.

**Problema/Contexto:** o menu de contexto (`js/contextmenu.js`) é um elemento único, normalmente dentro de `#app`. "Escrever texto" e "Meus documentos" são diálogos modais, e o modal torna inerte todo o documento fora dele, inclusive popovers que estão na camada superior.
**Por que importa:** o menu aparece desenhado, mas nenhum item responde. Parece bug de evento ou de `z-index`, e não é.
**Como aplicar:** antes de mostrar o popover, faça `anchor.closest('dialog[open]') ?? host` e `append` o menu ali (com o popover fechado; mover um popover aberto o tira da camada superior). Vale para qualquer novo popover acionado dentro de diálogo. Os menus ⋯ e o seletor de bloco atuais não abrem dentro de diálogos. Variáveis CSS definidas em `#app` (ex.: `--tone-theme`) não chegam ao menu quando ele está no diálogo, porque os diálogos ficam fora de `#app`.
**Evidência:** em 2026-10-07, no Chromium (Playwright), com "Meus documentos" aberto: o botão de um popover anexado a `#app` não recebeu foco e `elementFromPoint` não o encontrou; anexado ao `<dialog>`, recebeu foco e clique. O menu de contexto de "Escrever texto" e de "Meus documentos" funcionou após mover o menu para o diálogo.
