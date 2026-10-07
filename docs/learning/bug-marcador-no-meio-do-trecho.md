---
name: "+", "=" e "~" no meio de um trecho formatado quebravam a marcação
description: sublinhar "Ligue +55" gravava ++Ligue +55++, que o renderizador não lê; escape do caractere do marcador em qualquer posição
type: project
category: bug
date: 2026-10-07
---
Ao gerar a marcação de um trecho sublinhado, destacado ou riscado (`emit()` em `js/richtext.js`), o caractere do próprio marcador recebe barra invertida em qualquer posição (`guardMarker`), não só nas pontas.

**Problema/Contexto:** as regras de `renderInline()` proíbem o caractere do marcador dentro do trecho (`++[^+]…++`, `==[^=]…==`, `~~[^~]…~~`). O escape existia só nas pontas ("C+"); "Ligue +55 85" sublinhado virava `++Ligue +55 85++`, a página e o PDF mostravam os sinais e a edição seguinte os transformava em texto definitivo.

**Por que importa:** telefones (+55), fórmulas (a = b) e aproximações (~ 10 min) são comuns nos manuais; o defeito corrompe o texto sem aviso.

**Como aplicar:** qualquer novo formato com marcador de um caractere repetido precisa do mesmo escape no `emit()`. O teste do app "campo visual guarda…" cobre ponta e meio; um fuzz de ida e volta (marcação → HTML → marcação) só falhava nesses três caracteres.

**Evidência:** reproduzido em 2026-10-07 com Ctrl+U real no app (revisor de código) e coberto pelo teste `tests/app.test.mjs`.
