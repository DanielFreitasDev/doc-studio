---
name: Formatação pendente com o cursor parado
description: Ctrl+B sem seleção fora de palavra guarda o formato para o próximo texto digitado; composição (IME) recebe o formato no compositionend
type: project
category: decision
date: 2026-10-07
---
Sem seleção e fora de uma palavra, a formatação fica pendente (como os *stored marks* de editores de texto) e o texto digitado em seguida entra pelo modelo de trechos, não pela inserção nativa do navegador.

**Problema/Contexto:** a marcação (`**negrito**`) não representa "negrito vazio". A solução anterior inseria a palavra "negrito" selecionada; o segundo Ctrl+B inseria outra ("abnegrito") e não havia como sair do negrito. Deixar o navegador digitar não resolve: no limite entre `<b>ab</b>` e o texto seguinte, cada motor decide sozinho se a letra cai dentro do `<b>`.

**Por que importa:** é o gesto mais comum de quem vem do Word; a implementação ingênua só funciona no Chromium.

**Como aplicar:** `pendingFormats` em `js/richtext.js` guarda `{ at, f }`; `beforeinput` `insertText` com pendência é cancelado e o trecho entra com `f`; espaços seguem nativos (no Firefox um espaço no fim redesenhado some) e só avançam `at`. Setas, Home/End, clique ou outro `selectionchange` descartam a pendência. O Firefox (e teclados com tecla morta) entrega "ç"/"ã" como `insertCompositionText`, que não pode ser cancelado: a pendência é marcada no `compositionstart` e aplicada ao trecho composto no `compositionend`.

**Evidência:** em 2026-10-07, "Texto **ab** cd *çã*" no Chromium, Firefox 1543 e WebKit 2359 (Playwright com `executablePath`, ver o aprendizado dos navegadores de teste); teste "Ctrl+B com o cursor parado…" em `tests/app.test.mjs` com teclas reais pelo CDP.
