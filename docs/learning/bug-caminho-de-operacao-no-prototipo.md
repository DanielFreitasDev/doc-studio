---
name: Caminho de operação chegava ao protótipo
description: update com "__proto__.x" gravava em Object.prototype antes da validação; setByPath e update só aceitam chaves seguras
type: project
category: bug
date: 2026-10-07
---
Caminhos vindos de fora (operações de IA, arquivos) não podem ser usados direto em `setByPath`: `"__proto__.icon"` contaminava todos os objetos do app, e a validação que recusava o lote vinha depois da gravação.

**Problema/Contexto:** `update` montava o rascunho com `setByPath(draft, path, valor)` e só então revalidava o bloco. O lote voltava `ok:false`, mas `Object.prototype.icon` ficava definido; itens de menu sem ícone herdavam a propriedade e `icon()` montava o SVG sem escape. A revisão do diálogo "Aplicar alterações de IA" roda a cada digitação, então colar o arquivo bastava. Caminhos como `"title.x"` (descer por um texto) lançavam `TypeError` fora do `try` do lote.

**Por que importa:** o contrato trata conteúdo de IA como entrada não confiável; "nada aplicado" precisa valer também para efeitos colaterais.

**Como aplicar:** todo caminho externo passa por `isSafeKey` (`js/utils.js`: recusa `__proto__`, `prototype`, `constructor` e segmentos vazios); `getByPath` só lê propriedades próprias; `update` recusa descer por valores simples; `applyOperations` converte qualquer erro inesperado em recusa do lote. O `index.html` tem CSP `script-src 'self'` como segunda barreira.

**Evidência:** reproduzido em Node e corrigido em 2026-10-07 (commit "fix(seguranca): impede que arquivos de IA alcancem o protótipo"); regressão em `tests/contract.test.mjs` ("caminhos de update não alcançam o protótipo…").
