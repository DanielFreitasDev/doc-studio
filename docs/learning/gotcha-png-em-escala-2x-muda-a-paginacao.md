---
name: PNG em escala 2× muda a paginação
description: docstudio render --png (escala 2× padrão) pagina de novo e pode sair com páginas diferentes do PDF quando uma página está quase cheia
type: project
category: gotcha
date: 2026-10-08
updated: 2026-10-08
---
Ao inspecionar um documento pelos PNG, confira se o número de PNG é igual ao de páginas do PDF; se não for, gere os PNG com `--scale 1`.

**Problema/Contexto:** `render` mede e pagina com `deviceScaleFactor: 1` para o PDF e, para os PNG, troca para `deviceScaleFactor` = `--scale` (padrão 2) e largura 1200, o que repagina a prévia. Com a escala 2×, as medidas de texto (principalmente a fonte monoespaçada dos textos de tela) mudam alguns décimos de milímetro; uma página a ~97% pode transbordar uma linha de tabela para uma página nova só nos PNG. O rodapé "Página X de N" dos PNG passa a dizer N+1, enquanto o PDF tem N.

**Por que importa:** o agente corrige uma "página quase vazia" que não existe no PDF (ou deixa de ver a real), e o relatório da CLI (feito na escala 1×) não acusa a diferença. A prévia do editor numa tela HiDPI (escala 2) provavelmente pagina como os PNG 2×.

**Como aplicar:** compare `ls pasta-paginas | wc -l` com o "PDF: … N página(s)". Para inspeção fiel ao PDF, use `render … --png pasta/ --scale 1` ou rasterize o próprio PDF (`pdftoppm`). Ao montar o documento, deixe folga nas páginas com tabelas de texto de tela (evite ficar acima de ~95%). Corrigir na CLI (paginar uma vez só e capturar todas as escalas com o mesmo layout) é tarefa para o mantenedor.

**Evidência:** em 2026-10-08, no manual técnico da PoC (tabelas de endpoints em paisagem, 96–97% de ocupação), `render --png` padrão gerou 37 PNG ("de 37") para um PDF de 36 páginas; com `--scale 1`, 36 e 36. Código: `tools/docstudio.mjs`, `Emulation.setDeviceMetricsOverride` com `deviceScaleFactor: scale` antes da captura.
