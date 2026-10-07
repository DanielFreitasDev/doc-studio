---
name: Fontes do padrão visual
description: onde estão o MIV e os manuais de referência, de que página vem cada capa/rodapé e as armadilhas de cor e de logo do manual
type: reference
category: reference
date: 2026-10-07
updated: 2026-10-07
---
O padrão visual do app vem do Manual de Identidade Visual do Governo do Ceará e de dois manuais já aprovados pela chefia. Cada arte em `js/graphics.js` cita a página do MIV em que se baseia.

**Problema/Contexto:** capas, rodapé, cores, tipografia e assinaturas precisam continuar fiéis a essas referências em qualquer evolução.

**Por que importa:** sem a referência, ajustes "a olho" afastam o resultado do padrão oficial; e o MIV tem erros de digitação que enganam quem copia os números.

**Como aplicar:**
- MIV: `/home/daniel/desenvolvimento/documentacao/manuais/MANUAL DE IDENTIDADE VISUAL 2023.pdf` (117 páginas em paisagem, máquina do mantenedor). Páginas mais usadas: 11 (cores da assinatura), 15–22 (área de proteção, assinaturas conjuntas, reduções, usos proibidos), 26 (elemento base e paleta do grafismo), 34–36 (papel timbrado), 38 e 44 (envelope e pasta), 55 (convite), 57 (slide), 1 e 117 (capa e contracapa do próprio MIV).
- Manuais de referência aprovados: `manual-despachante-emplacamento-externo-g003.pdf` e `manual-coleta-externa-primeiro-emplacamento-2026-10-06.pdf` (pasta `Downloads` do mantenedor, outubro de 2026).
- Medidas: capa e contracapa "Pasta", rodapé "Faixa" e "Meia faixa" foram medidos no MIV (a meia faixa a 300 dpi na p. 21, paisagem, estreitada para 210 mm). Arcos, Painel verde, Convite e Pasta oficial adaptam para A4 retrato as p. 1, 57, 55 e 44.
- Cores: as faixas usam o tom com que a arte CMYK do MIV aparece na tela (ex.: #38B53F para C80 Y100, vermelho #ED2225 que a paleta não declara), iguais aos manuais aprovados; peças novas usam os hex declarados na p. 26. Erratas do MIV: o texto de #26a737 diz G 187 (o hex é 167) e o de #46ac33 diz B 71 (o hex é 51) — vale o hex.
- Logos em `assets/img/`: `ceara` (com "Secretaria da Infraestrutura"), `ceara-state` (sem secretaria, recortado de `ceara.png` apagando a 3ª linha), `ceara-vertical` (escudo centralizado sobre o nome, montado a partir de `ceara.png`), `detran`; `-negative` = textos em branco. O `detran-negative.png` original tinha a base do anel preto pintada de branco (conversão feita por faixa de linhas); foi refeito a partir do positivo, trocando para branco só o que fica fora do disco (centro 183,5/177,5 px, raio 176,5 px).

**Evidência:** arquivos presentes nos caminhos acima em 2026-10-07; auditoria das 117 páginas do MIV e comparação das páginas geradas (prévia e `page.pdf()` do Chromium) com os PDFs de referência na mesma data.
