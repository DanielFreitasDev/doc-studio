---
name: Fontes do padrão visual
description: onde estão o MIV e os manuais de referência, de que página vem cada capa/rodapé e as armadilhas de cor e de logo do manual
type: reference
category: reference
date: 2026-10-07
updated: 2026-10-09
---
O padrão visual do app vem do Manual de Identidade Visual do Governo do Ceará e de dois manuais já aprovados pela chefia. Cada arte em `js/graphics.js` cita a página do MIV em que se baseia.

**Problema/Contexto:** capas, rodapé, cores, tipografia e assinaturas precisam continuar fiéis a essas referências em qualquer evolução.

**Por que importa:** sem a referência, ajustes "a olho" afastam o resultado do padrão oficial; e o MIV tem erros de digitação que enganam quem copia os números.

**Como aplicar:**
- MIV: `/home/daniel/desenvolvimento/documentacao/manuais/MANUAL DE IDENTIDADE VISUAL 2023.pdf` (117 páginas em paisagem, máquina do mantenedor). Páginas mais usadas: 2–3 (aberturas em degradê, #3FB45D → #56C0A3 na tela), 4 (sumário pontilhado), 9 (assinatura com o conceito), 10 (Kanit Light a Black), 11 (cores da assinatura), 14 (controle de fundo), 15–22 (área de proteção, assinaturas conjuntas, reduções, usos proibidos), 26 (elemento base e paleta do grafismo), 34–36 (papel timbrado), 38 e 44 (envelope e pasta), 50 (crachá: assinatura com "Secretaria da Infraestrutura" em vetor), 52 (certificado), 55 (convite), 56–60 (cap. 14, telas para datashow: as p. 56, 57 e 59 são fotos de telão em perspectiva, as p. 58 e 60 são planas e servem para medir), 62 (vinheta, plana), 76 (placa de obra), 98–113 (fundo de palco; o 104 é o mais limpo), 115 (totem), 1 e 117 (capa e contracapa do próprio MIV, com site e redes).
- Os títulos do próprio MIV usam Kanit ExtraBold e Black (`pdffonts` lista as duas); o texto das secretarias na p. 8 é Isidora Sans (fonte comercial, não disponível), por isso a linha da secretaria vem recortada em vetor da p. 50, não digitada.
- Para recortar uma página do MIV por coordenadas em pt, `pdftoppm -x -y -W -H` usa pixels na resolução escolhida (`pt × dpi / 72`); no zsh do mantenedor, a vírgula decimal do locale quebra contas com `printf`/`bc` (use Python).
- Manuais de referência aprovados: `manual-despachante-emplacamento-externo-g003.pdf` e `manual-coleta-externa-primeiro-emplacamento-2026-10-06.pdf` (pasta `Downloads` do mantenedor, outubro de 2026).
- Medidas: capa e contracapa "Pasta", rodapé "Faixa" e "Meia faixa" foram medidos no MIV (a meia faixa a 300 dpi na p. 21, paisagem, estreitada para 210 mm). Arcos, Painel verde, Convite e Pasta oficial adaptam para A4 retrato as p. 1, 57, 55 e 44.
- Cores: as faixas usam o tom com que a arte CMYK do MIV aparece na tela (ex.: #38B53F para C80 Y100, vermelho #ED2225 que a paleta não declara), iguais aos manuais aprovados; peças novas usam os hex declarados na p. 26. Erratas do MIV: o texto de #26a737 diz G 187 (o hex é 167) e o de #46ac33 diz B 71 (o hex é 51) — vale o hex.
- Logos em `assets/img/` são **SVG vetoriais extraídos do próprio MIV** (nítidos em qualquer tamanho no PDF): `ceara` (com "Secretaria da Infraestrutura", recortado da p. 50, crachá, onde o MIV traz essa assinatura em vetor), `ceara-state` (o mesmo arquivo sem a linha da secretaria, com o mesmo viewBox, para a troca não mexer no tamanho), `-negative` (textos em branco, escudo colorido, como na p. 117), `ceara-vertical` (vertical oficial da p. 20) e `ceara-vertical-secretaria` (a vertical + a linha da secretaria da p. 50, centralizada; largura da linha = 0,8923 × largura do nome e vão = 0,0563 × largura do nome, medidos na horizontal da p. 50). Como extrair: `pdftocairo -svg` da página, `inkscape --query-all` para achar o retângulo de cada elemento, apagar o que fica fora da área e `inkscape --vacuum-defs --export-plain-svg`. O DETRAN/CE do MIV (p. 50) é um traçado tosco (anel fino, setas tortas); por isso `detran.svg` foi vetorizado a partir do PNG oficial: disco e anel viram elipses exatas (centro 183,5/175, raios 176,5 × 173, anel de 15,5 em 370 × 416) e setas, ponto e texto vêm do potrace (diferença de 4,6% de pixels de borda em relação ao PNG). No `detran-negative.svg` só o texto fora do disco fica branco.

- Escala de cinza (p. 12): os `*-gray.svg` foram gerados trocando cada cor do SVG pela cor mais próxima da tabela de correspondência da p. 12 (amostras medidas na página renderizada a 140 dpi: #26863e→#818182, #d2b053→#dcdbd9, #b39649→#c6c3c2, #fddcb0→#e6e4e4, #cf8a4d→#979897, #28703a→#696a6b, #8fd6f5→#d1d1cf, #fbca07→#efefee, #5ba7b0→#979897); o nome "CEARÁ"/"GOVERNO DO ESTADO" e a secretaria (#3B5262, #3A3A3C) viram preto (#211d1d), como na p. 12; cores a mais de 70 de distância RGB de qualquer amostra usam a luminância. Ao trocar um logo, gere de novo a versão `-gray`. O backdrop de eventos (p. 116) usa quadros C80 Y100 (#38b53f na tela).

**Evidência:** arquivos presentes nos caminhos acima em 2026-10-07; auditoria das 117 páginas do MIV e comparação das páginas geradas (prévia e `page.pdf()` do Chromium) com os PDFs de referência na mesma data.
