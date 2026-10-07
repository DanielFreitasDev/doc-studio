---
name: Kanit e Maitree são subconjuntos latinos (345 caracteres)
description: ⋯ ✓ ≤ emoji caem numa fonte do sistema que entra no PDF e muda por máquina; cobertura em TYPOGRAPHY.glyphRanges
type: project
category: gotcha
date: 2026-10-07
---
As fontes em `assets/fonts/*.woff` cobrem só 345 caracteres (latim, pontuação tipográfica, €, ™, setas ← ↑ → ↓, −). Qualquer outro caractere é desenhado com uma fonte do sistema, que o Chrome embute no PDF.

**Problema/Contexto:** o exemplo `guia-rapido-estudio` usava ⋯ e ⋮; o PDF embutia NotoSansMath e NotoSansEthiopic, e numa máquina sem essas fontes o resultado seria outro. Nem a validação nem o `render` avisavam.

**Por que importa:** foge da tipografia do MIV e torna o PDF dependente do computador de quem gera.

**Como aplicar:** a cobertura está em `TYPOGRAPHY.glyphRanges` (`js/brand.js`), extraída da tabela `cmap` dos WOFF por `tools/lib/fonts.mjs`; `docstudio check` falha se as fontes mudarem sem atualizar a lista. `brandReport()` avisa caracteres de fora (código e texto de tela, na monoespaçada, não contam) e o `render` lista as fontes do PDF. Ao trocar ou ampliar as fontes, regenere a lista pelo `check` (ele imprime as faixas).

**Evidência:** `pdffonts` do exemplo em 2026-10-07 mostrava NotoSansMath-Regular e NotoSansEthiopic-Regular; após trocar o texto, só Kanit, Maitree e DejaVuSansMono.
