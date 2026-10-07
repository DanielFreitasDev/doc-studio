---
name: Colunas de tabela partiam palavras ("Atendiment|o")
description: overflow-wrap anywhere reduz a largura mínima da coluna a 1 caractere na medição automática; garantir a maior palavra até 40 mm
type: project
category: bug
date: 2026-10-07
---
Na medição das larguras de coluna (`measureTableColumns` em `js/paginate.js`), cada coluna precisa receber ao menos a largura da sua maior palavra, com teto de 40 mm.

**Problema/Contexto:** `.b-table td` usa `overflow-wrap: anywhere`, que também vale na tabela de medição com `table-layout: auto`. `anywhere` faz a largura mínima (min-content) de cada coluna cair para um caractere, e o layout automático espremia colunas curtas: numa tabela de 7 colunas saíam "Atendiment|o", "Porta|l", "R$ / 120,00".

**Por que importa:** trocar só para `break-word` (que não mexe na largura mínima) **não resolve**: um endereço longo (URL) passa a reservar a própria largura inteira e espreme todas as outras colunas. Testado em 2026-10-07.

**Como aplicar:** a medição faz duas leituras — a proporcional (com `anywhere`) e a mínima (classe `b-table--min` com `overflow-wrap: normal` e largura 0) — e `withMinimums()` eleva cada coluna até `min(maior palavra + 1 mm, 40 mm, 1/3 da tabela)`, tirando a diferença das colunas com folga. Sem o teto de 40 mm, a soma dos mínimos passou da largura e todas encolheram de novo. "R$ 120,00" e "nº 12" levam espaço não separável em `renderInline()`.

**Evidência:** tabela de 7 colunas (Canal, Serviço, Prazo, Taxa, Unidade, Situação, Observação com URL) renderizada por `docstudio render` em 2026-10-07: antes, 6 palavras partidas; depois, nenhuma (só a URL quebra). Commit "fix(tabela): colunas não partem palavras…".
