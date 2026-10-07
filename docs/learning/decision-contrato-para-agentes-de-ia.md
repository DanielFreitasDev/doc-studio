---
name: Contrato para agentes de IA
description: agentes usam o modelo do editor, operações por id e renderização pelo próprio app; nada de HTML gerado nem renderizador paralelo
type: project
category: decision
date: 2026-10-07
---
Agentes de IA (Claude Code, Codex…) criam e alteram documentos pelo mesmo modelo do editor: arquivos `.docstudio.json`/`.source.json`, intenções semânticas e lotes `.ops.json` por id, validados por `js/validate.js` e renderizados pelo próprio app (`index.html?render=` + `Page.printToPDF`).

**Problema/Contexto:** o pedido era uma plataforma AI-native sem dependências, sem acoplar a um fornecedor e sem permitir que a IA quebre a identidade visual. Alternativas avaliadas: (1) IA gerando HTML/CSS — sem validação, quebra o MIV; (2) JSON Patch (RFC 6902) — endereça por posição (`/blocks/3`), frágil quando o documento muda; (3) renderizador próprio em Node — divergiria da prévia e do PDF do botão.

**Por que importa:** manter um só modelo, uma só validação e um só caminho de PDF é o que garante que "criado por IA" e "criado à mão" saiam iguais; quebrar isso cria dois sistemas.

**Como aplicar:**
- Operações novas entram em `js/operations.js` (handler + `OPERATIONS` + esquema em `tools/lib/generate.mjs`); o lote é atômico e a interface aplica como um passo de desfazer.
- Fatos da marca só em `js/brand.js`; catálogos e esquemas são gerados (`docstudio generate`) e conferidos (`docstudio check`).
- A CLI precisa de Node 22.4+ (WebSocket nativo para o CDP) e de Chrome/Chromium; sem eles, `build`/`validate`/`apply` funcionam e só `render` falha com mensagem clara.
- O app não chama modelos de IA; `window.docStudio.applyOperations/check/report` é a porta para um assistente futuro.

**Evidência:** em 2026-10-07, um agente sem contexto, num clone limpo, criou um guia de 5 páginas só com README → `docs/ai/` e a CLI; as lacunas que ele relatou (aviso de página quase vazia, fonte monoespaçada fora do MIV sem aviso, largura máxima de imagem, nomes de saída) foram corrigidas — repita esse teste ao mudar o contrato. Fluxos AI-A a AI-D (README → "O que foi verificado", sexta auditoria): manual de 11 páginas criado só pelo contrato, alteração de 4 blocos sem tocar no resto, lote com Ctrl+Z/Ctrl+Shift+Z, entradas maliciosas recusadas; PDFs da CLI com o mesmo número de páginas da prévia e só fotos/prints como imagens.
