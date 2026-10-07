---
name: Firefox e WebKit no ambiente de testes
description: o playwright-core do MCP é mais novo que os navegadores em cache; use executablePath e 127.0.0.1
type: project
category: gotcha
date: 2026-10-07
updated: 2026-10-07
---
Dá para validar o app no Firefox e no WebKit (motor do Safari) na máquina do mantenedor, mas com dois ajustes.

**Problema/Contexto:** o `playwright-core` usado pelo Playwright MCP (em `~/.npm/_npx/.../node_modules`) procura `firefox-1553`, enquanto o cache tem `firefox-1543` e `webkit-2359`; `launch()` falha com "Executable doesn't exist". No WebKit, `http://localhost:8080` passa por um proxy (squid) que resolve para `::1` e recusa a conexão.

**Por que importa:** sem isso, a validação fica só no Chromium, e o README exige separar o que foi testado em cada motor.

**Como aplicar:** num script Node, carregue o `playwright-core` desse diretório com `createRequire`, chame `launch({ executablePath: '~/.cache/ms-playwright/firefox-1543/firefox/firefox' })` (WebKit: `webkit-2359/pw_run.sh`) e abra `http://127.0.0.1:8080/`. No Playwright MCP, o envio de arquivos (`browser_file_upload`) só aceita caminhos dentro do projeto (ex.: `.playwright-mcp/`, que está no `.gitignore`).

**Área de transferência e arquivos nos testes:** no Chromium sem interface, o Ctrl+V real não lê o que o evento `copy` do app gravou (o `paste` chega só com `text/uri-list` do sistema); teste copiar/colar disparando `ClipboardEvent('copy')`/`ClipboardEvent('paste')` com um `DataTransfer` e reaproveitando os dados. No Playwright MCP, abrir o seletor de arquivo deixa a página em "modal state": um `browser_run_code` que o dispara termina sem resultado até `browser_file_upload` (sem caminhos cancela).

**Evidência:** em 2026-10-07, Firefox e WebKit abriram o app com esses ajustes, sem erros de console, e paginaram o "Manual operacional" em 7 páginas, como o Chromium.

Em 2026-10-07 (quinta auditoria), Firefox e WebKit repetiram o fluxo de texto visual com o mesmo resultado do Chromium; o colar de blocos foi validado com eventos sintéticos depois de o Ctrl+V real chegar só com `text/uri-list`.
