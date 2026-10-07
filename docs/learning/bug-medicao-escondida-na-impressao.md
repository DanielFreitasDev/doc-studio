---
name: Paginação recalculada durante a impressão juntava páginas no PDF
description: o CSS de impressão escondia a área de medição; um novo cálculo durante a impressão media tudo como zero
type: project
category: bug
date: 2026-10-07
---
A área de medição (`.measure-host`) precisa continuar com largura também no CSS de impressão, e `renderNow()` em `js/preview.js` ignora o cálculo quando ela não tem largura.

**Problema/Contexto:** `css/print.css` escondia `.measure-host` com `display: none`. Se a paginação rodasse com a mídia de impressão ativa (evento `loadingdone` de uma fonte, `beforeprint` em navegadores que já aplicaram o CSS de impressão, um salvamento atrasado), todos os átomos mediam 0 px e cabiam em menos páginas: o PDF saía com conteúdo invadindo o rodapé e uma página a menos que a prévia.

**Por que importa:** a promessa do app é prévia idêntica ao PDF. O defeito não aparece na tela, só no PDF, e depende de tempo (fonte carregando), então parece aleatório.

**Como aplicar:** não esconda a área de medição na impressão (ela fica `position: fixed`, fora do papel e invisível). Qualquer novo recurso que recalcule o layout deve medir só quando `#measure-body` tiver largura. Para testar: `page.emulateMedia({ media: 'print' })`, chamar `docStudio.preview.renderNow()` e comparar o número de `.page` com o de antes.

**Evidência:** em 2026-10-07, o "Manual operacional" com abertura de capítulo tinha 8 páginas na prévia e 7 no `page.pdf()` do Chromium; após a correção, 8 e 8 em seis estilos prontos, inclusive forçando o recálculo com a mídia de impressão ativa.
