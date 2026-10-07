---
name: Respiro de segmento fora da medição
description: classes seg-start/seg-end entram só depois da paginação; padding nelas faz a caixa (glossário) invadir a margem inferior
type: project
category: bug
date: 2026-10-07
---
Classes que `pageBodyHtml()` acrescenta depois da paginação (`seg-start`, `seg-end`, `is-repeat`) só podem mudar aparência que não ocupa altura (cantos, bordas finas); respiro que ocupa altura vai em classes do próprio átomo (`is-first`, `is-last`), que existem na medição.

**Problema/Contexto:** o glossário recebia 9 pt de `padding` em `.seg-start .b-gloss` e `.seg-end .b-gloss`. Na coluna de medição os átomos não têm essas classes, então a caixa medida era mais baixa que a desenhada; ao continuar na página seguinte ganhava ainda um `seg-end` extra no pé. Resultado: até ~6 mm abaixo da área útil, sem aviso de estouro. O bloco de código já fazia certo (`is-first`/`is-last`).

**Por que importa:** é o mesmo tipo de divergência medição × página da entrada "Reset de margens não valia na área de medição", mas causada por JS e não por seletor; não aparece como erro e só se vê comparando a ocupação.

**Como aplicar:** ao criar um bloco em segmentos (`group: true`), ponha o respiro de abertura/fechamento em classes do renderizador. Para detectar, `node tools/docstudio.mjs render` mostra a ocupação de cada página; acima de 100% aparece "⚠ passa da área útil".

**Evidência:** em 2026-10-07, `render` do manual de exemplo com um print antes do glossário dava 102% na página 11; com o respiro em `.atom--gloss.is-first/.is-last` passou a 98%, sem mudar a contagem de páginas dos 12 modelos.
