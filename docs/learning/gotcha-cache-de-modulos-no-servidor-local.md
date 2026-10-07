---
name: Cache de CSS e módulos no servidor local
description: python3 -m http.server permite cache heurístico; o navegador pode servir CSS/JS antigos após uma edição
type: project
category: gotcha
date: 2026-10-07
---
Depois de editar CSS ou JS, recarregue sem cache antes de concluir que uma correção não funcionou.

**Problema/Contexto:** `python3 -m http.server` não envia `Cache-Control`, então o Chromium reaproveita `style.css`, `css/*.css` e módulos ES por cache heurístico. Um recarregamento comum pode manter a versão antiga.

**Por que importa:** dá a falsa impressão de que a correção falhou (ou de que um bug sumiu) e leva a mudanças desnecessárias.

**Como aplicar:** no navegador, use recarregamento forçado (Ctrl+Shift+R) ou DevTools com "Disable cache". Em testes automatizados, limpe o cache antes de recarregar (no Playwright/Chromium: CDP `Network.clearBrowserCache`) ou sirva os arquivos com `Cache-Control: no-store`. Confira com `getComputedStyle` ou procurando a regra nova em `document.styleSheets`.

**Evidência:** em 2026-10-07, após editar `css/document.css`, a regra `:where(.doc)` não aparecia em `document.styleSheets` até limpar o cache pelo CDP. O mesmo comportamento já tinha sido registrado no projeto `scribble`.
