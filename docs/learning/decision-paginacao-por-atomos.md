---
name: Paginação por átomos medidos e PDF pela impressão
description: blocos viram átomos medidos com o CSS real; páginas montadas no DOM; PDF pela impressão do navegador
type: project
category: decision
date: 2026-10-07
updated: 2026-10-07
---
A prévia e o PDF são o mesmo DOM: os blocos são medidos com o CSS de impressão e distribuídos em páginas A4 antes de desenhar; o PDF sai de `window.print()` com `@page { size: A4; margin: 0 }`.

**Problema/Contexto:** o pedido era "escrever e ver ao lado como vai ficar", fiel aos manuais oficiais, sem bibliotecas. Gerar PDF em JavaScript puro exigiria reimplementar fontes e layout; deixar o navegador quebrar páginas só na impressão faria a prévia divergir do PDF.

**Por que importa:** mudar para geração de PDF própria ou para quebra automática do navegador desfaz a garantia de fidelidade e as regras de layout (títulos não ficam órfãos; tabelas repetem o cabeçalho).

**Como aplicar:**
- Cada renderizador em `js/render.js` devolve átomos (uma linha de tabela, um passo, uma linha de cartões). `keep` = manter com o próximo; `group` + `repeatHeader` = caixa contínua e cabeçalho repetido.
- Parágrafos (átomos com `splittable`) são divididos na linha exata quando não cabem: `lineStarts()` acha o primeiro caractere de cada linha com `Range.getClientRects()` por busca binária (o topo só cresce ao longo do texto) e `Range.cloneContents()` corta o HTML fechando negritos e destaques partidos. Mínimo de 2 linhas de cada lado; a altura de cada parte é medida de novo e, se não couber, sobe uma linha. As partes recebem `top`/`bottom` compatíveis com as medições originais (topo da primeira = topo do parágrafo; fundo da segunda = fundo dele).
- Outros átomos mais altos que a página não são divididos: a página recebe `is-overflowing` e o editor mostra aviso.
- Larguras de coluna de tabela são medidas com layout automático e fixadas nas linhas, para alinhar mesmo quando a tabela continua em outra página.
- Ids de degradê SVG usam prefixo por página (`p<índice>`): o HTML de uma página não muda se o conteúdo não mudou, e a prévia só troca páginas alteradas.

**Evidência:** em 2026-10-07, `page.pdf()` do Chromium para o modelo "Manual operacional" gerou 7 páginas A4, iguais às 7 da prévia, com Kanit e Maitree embutidas (`pdffonts`) e texto selecionável (`pdftotext`).

Em 2026-10-07 (divisão de parágrafos): o mesmo documento paginou em 9 páginas no Chromium, Firefox e WebKit, com o texto das partes igual ao original; 31 páginas com 25 divisões levam 66 ms (214 ms com uma medição por caractere, antes da busca binária).
