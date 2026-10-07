---
name: Testes com node --test e scripts sob CSP
description: node --test tests/ falha no Node 24; com a CSP, addScriptTag e eval na página são bloqueados (use evaluate pelo CDP)
type: project
category: gotcha
date: 2026-10-07
---
Rode os testes com `node --test` (descoberta automática de `*.test.mjs`) ou com um padrão entre aspas; e injete ferramentas na página pelo protocolo do navegador, não por `<script>`.

**Problema/Contexto:** no Node 24.20.0, `node --test tests/` trata o diretório como módulo e falha com "Cannot find module …/tests". Depois da CSP `script-src 'self'` no `index.html`, `page.addScriptTag({ content })` do Playwright e `eval()` dentro da página são bloqueados.

**Por que importa:** um comando de teste errado parece "suíte quebrada"; e a varredura de acessibilidade (axe-core) e outros scripts de diagnóstico deixam de carregar sem aviso claro.

**Como aplicar:** `node --test` na raiz ou `node --test 'tests/*.test.mjs'`. Para axe-core e afins, leia o arquivo fora da página (`page.request.get(...)` ou `fs`) e passe o texto a `page.evaluate(texto)` ou ao `Runtime.evaluate` do CDP, que não passam pela CSP. Nos testes do app, `import('/js/…')` dentro de `evaluate` funciona (mesma origem). O axe-core não está no repositório (sem dependências); na máquina do mantenedor há cópias em outros projetos com `node_modules`.

**Evidência:** comandos executados em 2026-10-07 (Node 24.20.0, Google Chrome); varredura axe-core da galeria e do painel Design nos temas claro e escuro sem violações, com o script passado por `evaluate`.
