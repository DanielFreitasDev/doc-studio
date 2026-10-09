---
name: Paisagem pela quebra de página, capas em retrato
description: páginas de conteúdo em A4 deitado a partir de uma quebra de página; capa, contracapa e aberturas continuam em retrato
type: project
category: decision
date: 2026-10-07
updated: 2026-10-09
---
A orientação é escolhida na quebra de página ("Páginas seguintes: retrato ou paisagem"), como a quebra de seção do Word. Não existe documento A4 inteiro em paisagem; apresentações são o formato próprio de telas 16:9 com capas redesenhadas (ver [decision-apresentacao-como-formato.md](decision-apresentacao-como-formato.md)), onde a quebra só abre uma tela nova.

**Problema/Contexto:** o pedido da quinta auditoria incluía avaliar orientação paisagem. As capas, contracapas e aberturas de capítulo são peças do MIV desenhadas para A4 em pé (`js/graphics.js`, coordenadas em 210 × 297 mm com `preserveAspectRatio="none"`): esticá-las deforma arcos, leque e totem.

**Por que importa:** quem tentar um "modo paisagem" global vai precisar redesenhar cada capa a partir das peças horizontais do MIV (p. 1, 56–57, 104, 116–117), com a mesma conferência página a página feita nas auditorias anteriores.

**Como aplicar:**
- `js/paginate.js`: cada átomo recebe a orientação da última quebra; a medição usa `measure-body--landscape` (257 mm) e a altura útil é 165 mm (`CONTENT_HEIGHT.landscape`). Uma página nunca mistura orientações.
- Tabelas medem a largura das colunas na orientação delas (a chave do cache inclui a orientação).
- PDF: `.page--landscape { page: landscape }` + `@page landscape { size: A4 landscape }` em `css/print.css`; o Chromium gera páginas de tamanhos diferentes no mesmo PDF.
- Rodapés e cabeçalho são SVG esticados na largura: as faixas mantêm altura e ângulo aproximado (o próprio rodapé "meia faixa" foi medido numa página deitada do MIV).

**Evidência:** em 2026-10-07, a "Nota técnica" com uma tabela de 9 colunas × 30 linhas entre duas quebras gerou 8 páginas na prévia (P P P L L L P P) e no `page.pdf()`; `pdfinfo` mostrou as páginas 4–6 com 841,92 × 594,96 pt, 0 imagens (`pdfimages`) e cabeçalho da tabela repetido nas três páginas deitadas.
