---
name: Reset de margens não valia na área de medição
description: regra de CSS restrita a .page deixava a medição com margens padrão do navegador e quebrava páginas cedo demais
type: project
category: bug
date: 2026-10-07
---
Todo CSS que muda o tamanho de um bloco precisa valer também na área de medição (`#measure-body`, dentro de `.doc`), não só dentro de `.page`.

**Problema/Contexto:** o reset `.page :is(h2, h3, h4, p, …) { margin: 0 }` só se aplicava às páginas. Na coluna invisível onde `js/paginate.js` mede os átomos, `p` e `h2` mantinham as margens padrão do navegador (1em), então os blocos pareciam mais altos e o paginador quebrava a página antes da hora. Além disso, por ter especificidade 0,1,1, o mesmo reset anulava as margens próprias de `.b-section__title` dentro das páginas.

**Por que importa:** a promessa do app é prévia idêntica ao PDF. Uma regra que vale só num dos dois lados gera páginas com sobra no pé ou conteúdo cortado, sem erro no console.

**Como aplicar:** use `:where(.doc) :where(…)` para resets (especificidade zero, vale nas páginas, na medição e nas miniaturas). Ao criar estilos de bloco, prefira classes do bloco (`.b-*`, `.atom--*`) em vez de seletores que dependem de `.page`. Para conferir, compare `getComputedStyle` de um elemento em `#pages` e o tamanho medido.

**Evidência:** em 2026-10-07, `getComputedStyle(.b-section__title).marginTop` era `0px` nas páginas e a tabela da página 4 do modelo "Manual operacional" quebrava com espaço sobrando; corrigido em `css/document.css` (commit ca189d9).
