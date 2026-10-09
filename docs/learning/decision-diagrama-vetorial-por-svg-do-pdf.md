---
name: Diagrama vetorial por SVG gerado do PDF
description: diagramas feitos em HTML entram no documento como SVG vetorial (HTML → PDF do tamanho do desenho → pdftocairo -svg), com texto em curvas e legível em A4 deitado
type: project
category: decision
date: 2026-10-09
updated: 2026-10-09
---
Quando um diagrama vem em HTML (por exemplo, exportado do Claude Design) e não cabe nos blocos `flow`/`steps`, converta em SVG vetorial e use o bloco `image`. Não use print PNG.

**Problema/Contexto:** o bloco `image` aceita SVG, mas é exibido por `<img>`. Nesse modo o SVG não carrega fontes externas nem roda scripts, então um SVG com `<text>` e Kanit por `@font-face` sairia com a fonte do sistema. Um print PNG perde a nitidez e, num diagrama denso, fica abaixo de 150 ppi no tamanho impresso.

**Por que importa:** com o texto em curvas, o diagrama sai idêntico no editor, no PDF e em qualquer máquina. O PDF continua vetorial: o relatório indicou "0 imagem(ns) rasterizada(s)".

**Como aplicar:**
- **Montar o HTML:** use a Kanit de `assets/fonts` por `file://`. Antes de posicionar, espere `document.fonts.load()`, porque o layout depende da medida do texto.
- **Imprimir:** use `Page.printToPDF` com `paperWidth/paperHeight` iguais ao tamanho medido (px/96) e margens zero. O `launchChrome` de `tools/lib/chrome.mjs` já serve.
- **Converter:** `pdftocairo -svg desenho.pdf desenho.svg`. O `width` sai em `pt`; o `assetDimensions` não lê `pt` e usa o `viewBox`, o que funciona.
- **Página e letras:** coloque o diagrama numa página deitada (`pagebreak` `landscape`), com 100% de largura. Desenhe a cerca de 0,1 mm por px (2570 px ≈ 257 mm). Use letras de pelo menos 19 px (≈ 5,3 pt impressos) e títulos com 25 px.
- **Tamanho do arquivo:** cada SVG fica com cerca de 2 MB, porque os glifos viram curvas. O editor recusa SVG acima de 4 MB (`js/images.js`, `MAX_SVG_BYTES`).

**Evidência:** em 2026-10-09, na versão simples do manual técnico da PoC (`temporarios/saida/versao-simples`), os fluxos 3.1 e 3.2 saíram em SVG de 2,0 e 1,8 MB. Cada um ocupou uma página deitada inteira, e o PDF de 28 páginas teve 0 imagem rasterizada. O gerador e o HTML ficam em `imagens/fonte-diagramas/`.
