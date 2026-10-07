---
name: Campos visuais sobre a marcação segura
description: o usuário edita em campos contenteditable (WYSIWYG), mas o documento guarda **marcação** escapada por renderInline(); formatar não usa execCommand
type: project
category: decision
date: 2026-10-07
updated: 2026-10-07
---
O texto com formatação é editado em campos visuais (`contenteditable`, `js/richtext.js`), mas o valor guardado, desfeito e exportado continua sendo a marcação simples de `js/markup.js` (`**negrito**`, `*itálico*`, `++sublinhado++`, `` `código` ``, `==destaque==`, `~~riscado~~`, `[link](https://…)`), sempre escapada por `renderInline()`.

**Problema/Contexto:** a decisão original (commit ca189d9) era `input`/`textarea` com a marcação visível, para evitar HTML imprevisível do Word, cursor pulando e injeção de marcação. Na quinta auditoria (2026-10-07) o usuário pediu explicitamente que o leigo não precise conhecer `#`, `*` e `**`: precisa haver edição visual.

**Por que importa:** os três riscos originais continuam reais. Voltar a guardar HTML do campo, ou formatar com `document.execCommand`, reabre todos eles.

**Como aplicar:**
- Fluxo: marcação → `richHtml()` (renderInline com `<b>/<i>`) → DOM editável → `richMarkup()` lê o DOM como "trechos" `{ text, f }` → marcação. O documento nunca guarda HTML.
- Formatar, link e colar operam no modelo de trechos (seleção em caracteres) e redesenham o campo; `execCommand` gera HTML diferente em cada navegador e não é usado.
- Colar e soltar: `pastedHtmlToMarkup()` lê o HTML colado num `DOMParser` (não executa nada) e mantém só negrito, itálico, sublinhado, riscado e links `http(s)/mailto/tel`; o resto vira texto.
- Aninhamento: a marcação é emitida na ordem link → itálico → sublinhado → riscado → destaque → negrito → código, a única que as regras de `renderInline()` sabem ler de volta (negrito não pode conter itálico, por exemplo). Caracteres de marcação digitados viram escapes (`\*`).
- Campos `plain` (textos fixos, rótulos) e o código continuam `input`/`textarea`: são exibidos com `esc()`.
- Mudanças pontuais (formatar, colar) quebram a "rajada" de digitação: viram um passo próprio de desfazer (`isDiscreteEdit`).

**Evidência:** em 2026-10-07, Playwright no Chromium, Firefox 1543 e WebKit 2359: digitar "Olá ação mundo", Ctrl+B na última palavra, Enter e "2*3" gerou `Olá ação **mundo**\nsegunda linha 2\*3` nos três; HTML do Word com `<img onerror>` e `href="javascript:"` virou `**Negrito** e *itálico* **forte** mau`, sem imagem nem link.

Decisão anterior (mantida como restrição): edição rica livre com `contenteditable` guardando HTML exigiria um sanitizador próprio, já que o projeto não usa bibliotecas.
