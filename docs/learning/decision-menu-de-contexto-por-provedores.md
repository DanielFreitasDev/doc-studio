---
name: Menu de contexto por provedores, sem bloquear o do navegador
description: o botão direito abre o menu do app só onde um provedor reconhece o elemento; Shift e o toque longo em campos mantêm o nativo
type: project
category: decision
date: 2026-10-07
---
O menu do botão direito é um motor único (`js/contextmenu.js`) alimentado por provedores registrados em `script.js`. Ele só intercepta `contextmenu` quando algum provedor reconhece o elemento; no resto, o menu do navegador continua.

**Problema/Contexto:** o usuário pediu ações de texto (negrito, itálico, marcações `#`, `-`, `>`) e ações de objeto (bloco, célula, item, capa) pelo botão direito, sem bloquear o menu do navegador sem motivo, sem duplicar regra de negócio e sem contornar confirmações.
**Por que importa:**
- substituir o menu em todo o app tiraria o corretor ortográfico e o "Inspecionar";
- ações próprias do menu divergiriam dos botões (limites como 12 colunas, "Desfazer", confirmação ao excluir documento).
**Como aplicar:**
- **Novo componente com ações:** registre um provedor `(elemento) => ({ title, items }) | null` e chame as mesmas funções dos botões.
- **Ações com efeito no documento:** passam por `actions.*` (`blockMenuItems`, `setDesign`, `setBlockField`, `transformBlock`).
- **Saída para o menu nativo:** Shift + botão direito sempre abre o menu do navegador.
- **Toque longo em campo de texto:** é ignorado, para manter o copiar/colar do sistema.
- **Folha inferior:** em telas < 560 px e no toque, o menu vira folha inferior e os submenus abrem dentro dela.
- **Texto alterado pelo menu:** usa `execCommand('insertText')`, que preserva o Ctrl+Z nativo do campo (relevante no diálogo "Escrever texto", onde o Ctrl+Z do app não age); `setRangeText` é a alternativa.
- **Fechar por rolagem:** só `wheel`/`touchmove` do usuário fecham o menu. Fechar no evento `scroll` fazia uma rolagem suave em andamento (`scrollIntoView` do editor) fechar o menu recém-aberto.

**Evidência:** implementado em 2026-10-07. Em Playwright:
- **Chromium:** todos os menus e ações conferidos no documento, incluindo "Desfazer", Ctrl+Z e a confirmação ao excluir documento.
- **Firefox e WebKit:** fluxos principais sem erros.
- **axe-core:** sem violações com o menu aberto.

O primeiro teste mostrou o menu fechando sozinho por causa do evento `scroll`; com `wheel`/`touchmove` não fechou mais. Checklist manual: README, itens 26–33.
