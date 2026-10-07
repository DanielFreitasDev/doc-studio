---
name: Filtro CSS de cinza transforma o PDF em imagem
description: filter: grayscale() em elementos do documento faz o Chromium rasterizar a página inteira no PDF (texto não selecionável)
type: project
category: failed
date: 2026-10-07
---
Para a impressão em escala de cinza, use cores cinza reais (tokens CSS, `grayscaleSvg()` e logos `-gray.svg`); nunca `filter` em elementos do documento.

**Problema/Contexto:** a forma mais curta de fazer o modo "Escala de cinza (P&B)" seria `.page { filter: grayscale(1) }`. Testado no Chromium (Playwright MCP, `page.pdf()`): cada página virou uma imagem RGB de 2481 × 3510 px (300 dpi) com máscara, o PDF ficou sem nenhuma fonte (`pdffonts` vazio) e com 4,7 MB.

**Por que importa:** o requisito do projeto é PDF vetorial, com texto selecionável e nenhuma imagem além das fotos do usuário. O defeito não aparece na prévia, só no PDF.

**Como aplicar:** qualquer efeito de cor no documento precisa virar cor sólida (token com versão em cinza em `css/document.css`, cor trocada no SVG gerado). O filtro só é aceitável em fotos e prints do usuário (já são imagens); mesmo assim, a área filtrada é reamostrada a 300 dpi. Também vale para `opacity` em grupos com `mix-blend-mode`, sombras com `filter: drop-shadow` etc. Conferir sempre com `pdfimages -list` e `pdffonts`.

**Evidência:** em 2026-10-07, `.playwright-mcp/a4/gray-filter.pdf` (filtro) teve 9 imagens de página e 0 fontes; com a solução por cores reais, o mesmo documento teve 0 imagens e 7 fontes embutidas (`t-gray.pdf`, 1,9 MB por causa da contracapa Backdrop).
