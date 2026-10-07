---
name: Campos de texto com marcação em vez de contenteditable
description: textos são editados em input/textarea com **negrito** etc. e sempre escapados antes de virar HTML
type: project
category: decision
date: 2026-10-07
---
O conteúdo é editado em `input`/`textarea` comuns, com marcação simples (`**negrito**`, `*itálico*`, `` `código` ``, `==destaque==`, `~~riscado~~`), convertida por `renderInline()` em `js/markup.js` depois de escapar o texto.

**Problema/Contexto:** edição rica com `contenteditable` traz HTML imprevisível colado do Word, cursor que pula ao redesenhar e risco de injeção de marcação vinda de arquivos `.json` importados.

**Por que importa:** trocar por `contenteditable` ou aceitar HTML livre reabre esses três problemas e exige um sanitizador próprio, já que não há bibliotecas.

**Como aplicar:** novos campos de texto passam por `esc()` ou `renderInline()`; nunca interpolar texto do usuário cru no HTML. Para novas formatações, acrescente uma regra em `RULES` de `js/markup.js` que produza só tags fixas. A importação de texto livre (`js/markdown.js`) gera blocos, não HTML.

**Evidência:** implementado em `js/markup.js`, `js/render.js` e `js/model.js` (commit ca189d9); em 2026-10-07, o fluxo de Ctrl+B gerou `texto **importante** aqui` no modelo e `<strong>importante</strong>` na prévia, sem perder o cursor.
