---
name: Zoom "ajustar à largura" em laço por causa da barra de rolagem
description: barra de rolagem que ocupa espaço muda a largura da prévia e o zoom oscila sem parar
type: project
category: gotcha
date: 2026-10-07
---
Toda área rolável cujo conteúdo é dimensionado pela própria largura (a prévia com "Ajustar à largura") precisa de `scrollbar-gutter: stable`.

**Problema/Contexto:** com barras de rolagem que ocupam espaço (as barras próprias do projeto têm 12 px), um documento de uma página ficava no limite: com zoom maior a página passava da altura, a barra aparecia, a largura útil caía, o zoom diminuía, a barra sumia e o ciclo recomeçava. O `ResizeObserver` em `js/preview.js` refazia o zoom a cada volta e a prévia "tremia"; o Playwright acusava "element is not stable".

**Por que importa:** o defeito depende da altura da janela e da quantidade de páginas, então aparece só às vezes.

**Como aplicar:** mantenha `scrollbar-gutter: stable` em `.preview-scroll` (também em `.editor-pane` e `.panel__body`). Para detectar, leia `--zoom` de `#pages` duas vezes com 400 ms de intervalo: os valores devem ser iguais.

**Evidência:** em 2026-10-07, o modelo "Ofício" alternava `--zoom` entre 0,619 e 0,634 (largura 535/523 px); com o `scrollbar-gutter`, os 11 modelos ficaram estáveis.
