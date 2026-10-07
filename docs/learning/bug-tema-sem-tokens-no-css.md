---
name: Tema declarado no JS sem tokens no CSS
description: o tema Azul existia em js/design.js mas não em css/document.css; o documento continuava verde. docstudio check confere agora
type: project
category: bug
date: 2026-10-07
---
Todo tema de `THEMES` (`js/design.js`) precisa do bloco `.doc[data-doc-theme="…"]` em `css/document.css` com as mesmas cores; `node tools/docstudio.mjs check` confere isso e o contraste do tom de texto.

**Problema/Contexto:** o tema "Azul" (`sky`) foi criado só no JS (amostra no painel e estilo pronto "Campanha (totem)"). Sem os tokens no CSS, o documento usava as cores do verde padrão e ninguém percebia, porque a capa Totem é verde de qualquer jeito. A cor `#4ec6e0` também não vinha do MIV. A mesma conferência achou o tom de texto da água-marinha (`#1e8576`) com contraste 4,495:1, abaixo de 4,5:1.

**Por que importa:** cores ficam em dois lugares (JS para a interface e a validação, CSS para o documento); divergência silenciosa engana o usuário e o agente de IA, que confia no catálogo.

**Como aplicar:** ao mudar ou criar um tema ou tom, atualize `js/design.js`, `css/document.css` (inclusive a versão cinza, se for tom fixo) e `js/brand.js` (cor oficial ou derivada documentada) e rode `check`. Azul agora é o azul do mar da assinatura (#56a7b2, Pantone 7709 C, MIV p. 11) com texto #2c6e77 (5,8:1); água-marinha usa #1d8475 (4,56:1).

**Evidência:** `node tools/docstudio.mjs check` em 2026-10-07 apontou "Tema “teal”: #1e8576 tem contraste abaixo de 4,5:1"; depois da correção, "Projeto consistente: 8 temas no CSS…". Renderização com o estilo "Campanha (totem)" mostra números, marcadores e linha do tempo em #56a7b2.
