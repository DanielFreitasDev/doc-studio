---
name: Barra fixa centralizada com left 50% quebrava linha
description: elemento fixed com left 50% e translate só "vê" meia tela de largura; com flex-wrap quebra cedo; use width max-content
type: project
category: bug
date: 2026-10-09
---
Um elemento `position: fixed` centralizado com `left: 50%` + `translateX(-50%)` e largura automática encolhe para caber na largura que sobra à direita de `left`, ou seja, meia tela. Com `flex-wrap`, a barra da seleção quebrava em duas linhas mesmo numa janela de 1440 px.

**Problema/Contexto:** ao incluir o botão "Editar" em `.selection-bar` (css/components.css), a barra passou de ~720 px de conteúdo e quebrou em 1440 px; `max-width: calc(100vw - …)` não ajuda, porque o limite efetivo do encolhimento é `100vw - left`.
**Por que importa:** o sintoma parece falta de espaço, mas a tela tem espaço de sobra; mexer em `max-width` ou esconder rótulos não resolve.
**Como aplicar:** em barras e avisos fixos centralizados assim, declare `width: max-content` (mantendo o `max-width`) para que a largura venha do conteúdo; o `max-width` continua fazendo a barra quebrar linha só no celular. `.toast-region` não tem o problema porque declara `width` explícita.
**Evidência:** Playwright em 2026-10-09: altura da barra de 86 px (duas linhas) em 1440 px antes; 46 px (uma linha) depois de `width: max-content`.
