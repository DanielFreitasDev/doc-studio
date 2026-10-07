# Regras da marca (gerado)

> **Não edite à mão.** Gerado por `node tools/docstudio.mjs generate` a partir de `js/brand.js`. Versão JSON: `schemas/brand.json`.

Fonte: Manual de Identidade Visual do Governo do Estado do Ceará 2023–2026 (MIV). Precedência em caso de dúvida: 1. Manual oficial (PDF do MIV) > 2. js/brand.js (regras derivadas) > 3. tokens do css/document.css > 4. modelos e estilos prontos > 5. escolhas do usuário ou do agente.

## O que um agente pode e não pode fazer

- **Pode** escolher, entre as opções registradas: tema (`design.theme`), capa, contracapa, cabeçalho, rodapé, numeração, assinatura (`design.signature`), estilos prontos e tons dos blocos (por nome).
- **Não pode** informar cores por código, fontes, CSS, HTML, tamanhos ou arquivos de logo: o formato não aceita esses campos (`docstudio validate` recusa) e o app ignora o que não está registrado.
- Logos nunca são editados: o app escolhe a versão certa (cores, negativo sobre fundo escuro, cinza, vertical) a partir de `design.signature`.
- Logo de outro órgão só com `signature: "custom"` e o arquivo oficial do órgão em `assets` (SVG de preferência).

## Regras

| regra | MIV | quem garante | texto |
| --- | --- | --- | --- |
| `signature-official-files` | p. 22 | o app aplica sozinho (não há como errar pelo documento) | Nunca altere, recrie ou distorça a marca: só os SVG oficiais de assets/img/ são usados, sempre com a proporção original. |
| `signature-joint-order` | p. 16 | o app aplica sozinho (não há como errar pelo documento) | Assinatura conjunta: órgão parceiro à esquerda, Governo à direita, sem fio separador, alinhados pelo centro do escudo (sem a coroa). |
| `signature-protection` | p. 15 | o app aplica sozinho (não há como errar pelo documento) | Área de proteção: em cima e embaixo, 2× a distância entre o brasão e o nome CEARÁ; dos lados, a largura do brasão. |
| `signature-minimum` | p. 21 | o app aplica sozinho (não há como errar pelo documento) | Redução mínima: 40 mm de largura com secretaria/órgão; 30 mm sem. Ideal: 50 mm. |
| `signature-background` | p. 14 | o app aplica sozinho (não há como errar pelo documento) | Marca sobre fundo branco; em fundo escuro, a versão em negativo. |
| `signature-horizontal-first` | p. 19 | o app aplica sozinho (não há como errar pelo documento) | A versão horizontal é a preferida; a vertical só quando o layout não comporta a horizontal. |
| `concept-four-lines` | p. 9 | o app aplica sozinho (não há como errar pelo documento) | O conceito “Cuidar das pessoas, avançar o Ceará.” fica sempre ao lado da marca, em quatro linhas, separado por uma linha verde. |
| `colors-official` | p. 26 | conferido por `docstudio validate` e “Verificar documento” | Cores só da paleta do grafismo (p. 26), da assinatura (p. 11) ou dos tons derivados documentados. Documentos escolhem tons por nome (tema, tom do bloco), nunca por código. |
| `typography` | p. 10 | conferido por `docstudio validate` e “Verificar documento” | Somente Kanit (títulos) e Maitree (texto corrido); o corpo pode usar Kanit. |
| `grayscale` | p. 12 | o app aplica sozinho (não há como errar pelo documento) | Para impressão P&B use a escala de cinza do MIV (tabela de correspondência da p. 12), nunca um filtro sobre a página. |
| `monochrome-last-resort` | p. 13 | conferência humana | A versão monocromática é último caso; prefira cores ou escala de cinza. |
| `text-contrast` | — | conferido por `docstudio validate` e “Verificar documento” | Texto em cor sobre o papel precisa de contraste mínimo de 4,5:1 (WCAG AA); por isso os títulos usam os tons escuros. |
| `image-resolution` | — | conferido por `docstudio validate` e “Verificar documento” | Fotos e prints com pelo menos 150 ppi no tamanho impresso (ideal 300 ppi) para não pixelar no PDF. |

## Tipografia

| uso | família | regra |
| --- | --- | --- |
| Títulos e elementos gráficos | Kanit | Kanit (geométrica sem serifa) em títulos, números e elementos gráficos. (MIV p. 10) |
| Texto corrido | Maitree | Maitree no texto corrido, pela legibilidade no digital e no impresso. (MIV p. 10). Opção: `design.bodyFont: "kanit"`. |
| Conceito | Kanit | “Cuidar das pessoas, avançar o Ceará.” em quatro linhas; verbos em Kanit Bold, o resto em Kanit Regular. (MIV p. 9) |

## Paleta do grafismo (MIV p. 26)

| id | nome | hex | CMYK |
| --- | --- | --- | --- |
| `green` | Verde | #26a737 | 80 / 0 / 100 / 0 |
| `lime` | Verde-claro | #5db12f | 67 / 0 / 100 / 0 |
| `green-2` | Verde 2 | #46ac33 | 72 / 0 / 100 / 0 |
| `leaf` | Folha | #45b16e | 71 / 0 / 71 / 0 |
| `teal` | Água-marinha | #2db39e | 72 / 0 / 47 / 0 |
| `orange` | Laranja | #f59c00 | 0 / 45 / 100 / 0 |
| `red` | Urucum | #e94f0e | 0 / 79 / 99 / 0 |
| `dark-orange` | Laranja-escuro | #e06a0c | 8 / 68 / 100 / 0 |
| `gold` | Amarelo-ouro | #e4a500 | 10 / 37 / 98 / 0 |
| `yellow` | Amarelo | #fccf05 | 0 / 18 / 93 / 5 |

## Cores da assinatura (MIV p. 11)

| id | nome | hex | Pantone |
| --- | --- | --- | --- |
| `slate` | Grafite (nome CEARÁ e contornos) | #465564 | 7545 C |
| `flag-green` | Verde do escudo | #008241 | 348 C |
| `sand` | Areia | #e1b77e | 7508 C |
| `ochre` | Ocre | #be9b5f | 7562 C |
| `cream` | Creme | #f1e4b2 | 7499 C |
| `clay` | Argila | #c68b66 | 7515 C |
| `forest` | Verde-escuro | #2a7050 | 555 C |
| `sky` | Azul-claro | #87d1e6 | 636 C |
| `sun` | Amarelo do sol | #ffc805 | 116 C |
| `gray` | Cinza | #dcdcdc | 7541 C |
| `sea` | Azul do mar | #56a7b2 | 7709 C |

## Tons derivados documentados (não estão no MIV)

Versões escuras para texto (contraste AA no papel) e tons de tela das faixas.

| hex | derivado de | uso |
| --- | --- | --- |
| #1d8475 | #2db39e | texto em água-marinha |
| #b4500a | #e06a0c | texto em laranja |
| #b83a0a | #e94f0e | texto em urucum e laranja |
| #8a6400 | #e4a500 | texto em amarelo-ouro |
| #2f3b47 | #465564 | títulos (grafite escuro) |
| #2c6e77 | #56a7b2 | texto em azul do mar |
| #38b53f | #26a737 | faixas do grafismo como a arte CMYK do MIV aparece na tela (C80 Y100) |

## Temas de cor disponíveis

| id | nome | principal | texto | apoio |
| --- | --- | --- | --- | --- |
| `green` | Verde institucional | #26a737 | #008241 | #f59c00 |
| `teal` | Água-marinha | #2db39e | #1d8475 | #f59c00 |
| `orange` | Laranja | #e06a0c | #b4500a | #26a737 |
| `red` | Urucum | #e94f0e | #b83a0a | #2db39e |
| `gold` | Sol | #e4a500 | #8a6400 | #26a737 |
| `leaf` | Folha | #45b16e | #2a7050 | #e94f0e |
| `navy` | Grafite | #465564 | #2f3b47 | #26a737 |
| `sky` | Azul | #56a7b2 | #2c6e77 | #f59c00 |

## Assinaturas

| signature | nome | descrição |
| --- | --- | --- |
| `joint` | DETRAN/CE + Governo | Assinatura conjunta com a Secretaria da Infraestrutura (MIV p. 16) |
| `seinfra` | Governo + Secretaria | Assinatura secundária: Governo do Ceará com a Secretaria da Infraestrutura (MIV p. 8) |
| `state` | Governo do Ceará | Somente a assinatura do Governo (MIV p. 7) |
| `concept` | Governo + conceito | Assinatura com “Cuidar das pessoas, avançar o Ceará.” (MIV p. 9) |
| `custom` | Logo próprio + Governo | Envie o logo do órgão; ele fica à esquerda do Governo (MIV p. 16) |
| `none` | Sem assinatura | Nenhuma marca na capa, contracapa e timbrado |

## Arquivos de logo (SVG vetorial extraído do MIV)

| id | arquivo | versão | MIV | largura mínima |
| --- | --- | --- | --- | --- |
| `ceara` | `assets/img/ceara.svg` | Governo do Ceará + Secretaria da Infraestrutura (horizontal) | p. 50 | 40 mm |
| `ceara-state` | `assets/img/ceara-state.svg` | Governo do Ceará (horizontal) | p. 7 | 30 mm |
| `ceara-vertical` | `assets/img/ceara-vertical.svg` | Governo do Ceará (vertical) | p. 20 | 25 mm |
| `ceara-vertical-secretaria` | `assets/img/ceara-vertical-secretaria.svg` | Governo do Ceará + Secretaria (vertical) | p. 20 | 30 mm |
| `detran` | `assets/img/detran.svg` | DETRAN/CE | p. 16 | — |

Cada logo tem as versões `-negative` (fundos escuros) e `-gray` (escala de cinza, MIV p. 12) quando aplicável.

