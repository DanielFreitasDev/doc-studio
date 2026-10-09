---
name: Apresentação como formato do documento
description: slides 16:9 do MIV (cap. 14) são `design.format: "slides"` sobre os mesmos blocos e paginação; tela de 240 × 135 mm; capas com formato
type: project
category: decision
date: 2026-10-09
---
A apresentação não é outro editor: é o formato "slides" do mesmo documento. Os blocos, a paginação por átomos, a edição na página, a validação e o PDF são os mesmos; muda a geometria da página (orientação "slide") e o que a seção faz.

**Problema/Contexto:** o mantenedor pediu a opção de fazer apresentações "seguindo fielmente" o MIV. O cap. 14 do MIV (p. 56–60, "Padrão de telas para datashow") mostra: abertura em painel verde (p. 57; com parceiro, p. 59), abertura com foto entre arcos (p. 56), telas de conteúdo brancas com a assinatura horizontal no alto à direita e a faixa do grafismo no pé, tela com foto ao lado do texto, tela com gráfico e encerramento com a assinatura (p. 58 e 60). Corpos: título 19 pt Kanit Bold, subtítulo 11 pt Kanit Medium, texto 7 pt Kanit Regular. As p. 56, 57 e 59 são fotos de um telão em perspectiva; só as telas da p. 58, 60 e a vinheta da p. 62 são planas.

**Por que importa:** um editor de slides à parte duplicaria blocos, validação e PDF. E os corpos do MIV só fazem sentido em proporção à tela: escolhido outro tamanho de página, todo bloco precisaria de uma segunda tabela de tamanhos.

**Como aplicar:**
- Tamanho da tela: as amostras da p. 58 têm ~165 mm de largura reais (título com bbox de 20 pt numa miniatura de 116 mm ⇒ escala 19/13,4). Em 240 × 135 mm o texto do MIV vira 10,2 pt, perto do corpo dos blocos (9,6 pt); título 27,5 pt e subtítulo 16 pt. Posições (assinatura a 12,6 mm do alto e 9,9 mm da direita, texto a 34 mm da esquerda, faixa do pé de 2,3 → 10 mm) foram medidas nas telas planas a 200 dpi com PIL e convertidas.
- `js/paginate.js`: orientação "slide" (191 × 83 mm úteis, `measure-body--slide`); a quebra de página não muda a orientação. Cada seção tem `breakBefore` e um `lead` (título + "(continuação)") que entra na tela aberta por estouro — a altura dele é medida à parte e somada em `usedHeight`.
- Capas e contracapas têm `format` ("slides", "any" ou nenhum = A4). `normalizeDesign` dá prioridade ao `format` explícito; sem ele, a capa decide. `mergeDesign` (painel, menu e operação `setDesign`) troca o formato junto quando a capa escolhida é do outro formato.
- A coluna de medição volta à largura de retrato depois de medir: para conferir a largura da tela num teste, aplique `measure-body--slide` antes de medir.
- Imagens nas telas têm `max-height: 56 mm` (CSS vale na medição e na página): uma foto 4:3 a 50% com texto ao lado passava da área útil e estourava a tela.
- Fora do escopo por ora: gráfico desenhado (a tela com gráfico usa imagem ao lado do texto), notas do apresentador e modo tela cheia no app.

**Evidência:** em 2026-10-09, `node tools/docstudio.mjs render` do modelo "Apresentação em telas" e de documentos com foto, abertura de seção, continuação e escala de cinza gerou PDFs de 679,92 × 383,04 pt (`pdfinfo`) com as mesmas telas da prévia, só Kanit (`pdffonts` no relatório do render) e nenhuma imagem além da foto; `node --test` com 44 testes passando (inclui "apresentação: telas 16:9 do MIV na prévia, no painel Design e no PDF").
