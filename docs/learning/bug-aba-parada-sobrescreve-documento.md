---
name: Aba parada sobrescrevia o documento salvo em outra aba
description: flush() do debounce salvava mesmo sem nada pendente no pagehide; com duas abas, a última a fechar apagava as edições da outra
type: project
category: bug
date: 2026-10-07
---
`debounce().flush()` (`js/utils.js`) só executa quando há chamada pendente, e cada aba avisa (BroadcastChannel `doc-studio`) quando salva; a outra aba com o mesmo documento oferece "Recarregar" em vez de sobrescrever.

**Problema/Contexto:** `pagehide` e `visibilitychange` chamavam `saveSoon.flush()`, que gravava o documento inteiro mesmo sem alteração. Abas A e B com o mesmo documento: A edita e salva; fechar B (parada) por último regravava a versão antiga por cima. O armazenamento (IndexedDB) guarda o documento inteiro por id, sem mesclagem.

**Por que importa:** perda de trabalho silenciosa, dependente da ordem de fechar as abas — difícil de reproduzir e de explicar ao usuário.

**Como aplicar:** não chame `flush()` esperando que ele "force" um salvamento: para salvar já, use `saveNow()`. Recarregar a partir do banco não pode passar por `switchTo()` (ele salva o documento atual antes). O aviso compara `updatedAt` para não ecoar entre abas. Duas abas editando ao mesmo tempo continuam sem mesclagem: o aviso é a proteção.

**Evidência:** reproduzido pelo revisor de código em 2026-10-07 com duas abas reais no Chrome; após a correção, o Playwright com duas páginas no mesmo contexto confirmou o aviso na aba B, a edição da aba A preservada ao fechar B e "Recarregar" trazendo a versão nova sem eco.
