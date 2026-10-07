---
name: display próprio anula o popover fechado
description: um `display: flex/grid` no seletor do popover vence o display:none do navegador e deixa o popover fechado na tela
type: project
category: gotcha
date: 2026-10-07
---
Em elementos com o atributo `popover`, declare `display` só em `:popover-open` (e na alternativa sem Popover API), nunca no seletor base.

**Problema/Contexto:** o navegador esconde o popover fechado com uma regra da folha de estilo padrão (`[popover]:not(:popover-open) { display: none }`). Qualquer `display` do autor no seletor base (`.format-bubble { display: flex }`) tem prioridade e o popover "fechado" continua renderizado, vazio, no canto da tela (`inset: auto` + `position: fixed`).

**Por que importa:** o defeito quase não aparece (caixa pequena, às vezes transparente), mas o elemento fica alcançável por leitor de tela e pode bloquear cliques no canto superior esquerdo.

**Como aplicar:** siga o padrão já usado em `.menu` e `.block-picker` em `css/components.css`: `.x:popover-open { display: flex }` e, para navegadores sem Popover API, `.x:not([popover]):not([hidden]) { display: flex }`. Ao criar um popover, confira com o axe (regra `region`) ou com `getBoundingClientRect()` do popover fechado (deve ser 0 × 0).

**Evidência:** em 2026-10-07 o axe-core acusou `region` em `.format-bubble` com a barra fechada, e `.quick-edit` fechado media 26 × 26 px em (0, 0); corrigido no commit "fix(interface): esconde os popovers fechados e nomeia a barra da seleção".
