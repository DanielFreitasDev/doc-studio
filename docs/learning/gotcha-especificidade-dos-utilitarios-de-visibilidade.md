---
name: Utilitários de visibilidade perdem para os componentes
description: classes como .hide-compact em style.css perdem para .btn/.icon-btn de components.css, que carrega depois
type: project
category: gotcha
date: 2026-10-07
---
Regras de esconder/mostrar em `style.css` precisam de especificidade maior que as dos componentes, porque `css/components.css` é carregado depois e declara `display` em `.btn`, `.icon-btn`, `.segmented` e nos itens de menu.

**Problema/Contexto:** `.hide-compact { display: none }` e `.rail__toggle { display: none }` tinham a mesma especificidade de `.btn { display: inline-flex }`. Como o componente vem depois na cascata, os botões "Modelos" e "Meus documentos", o seletor de visualização e o botão de recolher painel apareciam no celular e estouravam a barra superior.

**Por que importa:** o defeito só aparece em telas estreitas e parece um problema de media query, mas a media query estava certa.

**Como aplicar:** escreva esses utilitários com o contexto do componente (`.topbar .hide-compact`, `.rail .rail__toggle`, `.menu .show-compact`), tanto na regra que esconde quanto na que mostra. Ao adicionar um utilitário novo, teste em 375 px e 1280 px.

**Evidência:** em 2026-10-07, capturas a 375 px mostravam a barra superior com os botões de desktop; após subir a especificidade em `style.css`, a varredura de 320 a 1920 px ficou sem rolagem horizontal (commit ca189d9).
