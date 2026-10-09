---
name: Edição em conjunto agrupada por tipo de bloco
description: a mesma opção em vários blocos selecionados: grupos por tipo (não a interseção), só campos de opção, um passo de desfazer
type: project
category: decision
date: 2026-10-09
---
A edição em conjunto (`js/bulkedit.js`) mostra as opções da seleção agrupadas por tipo de bloco ("Parágrafo · 12 blocos → Alinhamento") e aplica cada escolha a todos os blocos daquele tipo, num único `store.update` (um Ctrl+Z).

**Problema/Contexto:** o usuário precisou justificar todos os parágrafos de um texto grande e teve de abrir um por um; pediu algo que servisse também para outras edições em vários blocos.
**Por que importa:**
- só as opções em comum (interseção) seria vazio no caso típico (Ctrl+A com seções, títulos, tabelas e parágrafos); agrupando por tipo, "justificar os parágrafos" funciona com qualquer seleção;
- campos com o mesmo nome em tipos diferentes têm opções diferentes (`align` do parágrafo tem "Justificado", o da imagem e o da assinatura não), então juntá-los pelo nome erraria;
- textos ficam de fora (`BULK_KINDS`: segmented, swatches, toggle, number, range): sobrescrever o conteúdo de vários blocos de uma vez seria perda de dados fácil.
**Como aplicar:** um tipo de campo novo que seja "opção" entra em `BULK_KINDS`; o valor passa por `normalizeField` (schema.js) antes de gravar. A mudança sai como `kind: 'block'` com `blockIds` e `external: true`, e o editor redesenha só esses cartões; o painel não redesenha durante as próprias mudanças (o controle deslizante perderia o arraste), só depois de desfazer ou de editar em outro lugar. Com a seleção de um tipo só, o menu do botão direito mostra as mesmas opções (`fieldMenuItems`, também usado no menu de um bloco). Enquanto o painel está aberto, as mudanças são anunciadas ao leitor de tela, sem toast (o aviso cobriria o painel); pelo menu, sai o aviso com "Desfazer".
**Alternativa adiada:** alinhamento padrão no Design (vale também para parágrafos novos), registrada em README → Possíveis melhorias.
**Evidência:** teste "edição em conjunto" em `tests/app.test.mjs` (`node --test`, 45 passando em 2026-10-09); manual de exemplo com 47 blocos de 15 tipos testado no Chromium em 1440, 768 e 390 px; axe-core sem violações no painel.
