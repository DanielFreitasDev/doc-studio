---
name: Paginação por átomos medidos e PDF pela impressão
description: blocos viram átomos medidos com o CSS real; páginas montadas no DOM; PDF pela impressão do navegador
type: project
category: decision
date: 2026-10-07
---
A prévia e o PDF são o mesmo DOM: os blocos são medidos com o CSS de impressão e distribuídos em páginas A4 antes de desenhar; o PDF sai de `window.print()` com `@page { size: A4; margin: 0 }`.

**Problema/Contexto:** o pedido era "escrever e ver ao lado como vai ficar", fiel aos manuais oficiais, sem bibliotecas. Gerar PDF em JavaScript puro exigiria reimplementar fontes e layout; deixar o navegador quebrar páginas só na impressão faria a prévia divergir do PDF.

**Por que importa:** mudar para geração de PDF própria ou para quebra automática do navegador desfaz a garantia de fidelidade e as regras de layout (títulos não ficam órfãos; tabelas repetem o cabeçalho).

**Como aplicar:**
- Cada renderizador em `js/render.js` devolve átomos (uma linha de tabela, um passo, uma linha de cartões). `keep` = manter com o próximo; `group` + `repeatHeader` = caixa contínua e cabeçalho repetido.
- Um átomo mais alto que a página não é dividido: a página recebe `is-overflowing` e o editor mostra aviso. Parágrafos longos só se dividem por linhas em branco.
- Larguras de coluna de tabela são medidas com layout automático e fixadas nas linhas, para alinhar mesmo quando a tabela continua em outra página.
- Ids de degradê SVG usam prefixo por página (`p<índice>`): o HTML de uma página não muda se o conteúdo não mudou, e a prévia só troca páginas alteradas.

**Evidência:** em 2026-10-07, `page.pdf()` do Chromium para o modelo "Manual operacional" gerou 7 páginas A4, iguais às 7 da prévia, com Kanit e Maitree embutidas (`pdffonts`) e texto selecionável (`pdftotext`).
