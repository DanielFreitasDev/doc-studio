# Guia para agentes de IA (Claude Code, Codex e outros)

Este guia ensina um agente a **criar, alterar, validar e gerar o PDF** de documentos do Estúdio sem editar HTML, CSS ou o código do app. O agente trabalha sobre o mesmo modelo de documento que o editor visual usa; o resultado abre normalmente no editor e sai pelo mesmo caminho de PDF.

```text
Material bruto → agente → arquivo-fonte (.source.json) ou operações (.ops.json)
  → docstudio build / apply  (validação estrutural + marca)
  → docstudio render          (paginação real no app → PDF + PNG + relatório)
  → inspeção → correções → editor visual (pessoa revisa) → PDF final
```

## 1. Leia antes de começar

1. [`BRAND_RULES.md`](BRAND_RULES.md) — o que a identidade visual permite (gerado de `js/brand.js`).
2. [`DOCUMENT_FORMAT.md`](DOCUMENT_FORMAT.md) — o formato do arquivo, ids, intenções semânticas, formatação e operações.
3. [`COMPONENT_CATALOG.md`](COMPONENT_CATALOG.md) — cada bloco: quando usar, quando evitar, campos, valores e como se divide no PDF (gerado das definições do editor).
4. [`EXAMPLES.md`](EXAMPLES.md) — documentos completos de referência.

O Manual de Identidade Visual (PDF oficial) é a autoridade máxima; as regras derivadas estão em `js/brand.js`.

## 2. Ferramenta de linha de comando

Requisitos: Node 22.4+ e, para PDF/PNG, Chrome ou Chromium (ou `DOCSTUDIO_CHROME=/caminho`). Sem dependências.

```bash
node tools/docstudio.mjs catalog                 # o que existe (blocos, intenções, capas, rodapés, modelos…)
node tools/docstudio.mjs new saida.json --template manual --name "Manual X" [--preset guide]
node tools/docstudio.mjs build fonte.source.json -o saida.docstudio.json   # imagens por caminho → arquivo final
node tools/docstudio.mjs validate saida.docstudio.json                    # estrutura + marca + recomendações
node tools/docstudio.mjs inspect saida.docstudio.json                     # ids e resumo de cada bloco
node tools/docstudio.mjs apply saida.docstudio.json mudancas.ops.json [--dry-run]
node tools/docstudio.mjs render saida.docstudio.json --pdf saida.pdf --png paginas/ --report relatorio.json
node tools/docstudio.mjs serve saida.docstudio.json   # imprime o link que abre o arquivo no editor
```

Códigos de saída: `0` ok, `1` erro de validação/renderização (nada é gravado), `2` uso incorreto.

## 3. Criar um documento (modo automático)

1. **Analise o material**: identifique público, objetivo, assuntos (viram seções), procedimentos (passo a passo), requisitos (lista ✓), riscos (destaque `danger`), regras com exceção (`warning`), dados comparáveis (tabela), prazos (linha do tempo), mensagens exatas de sistema (mensagem), dúvidas (pergunta e resposta), termos (glossário) e prints (imagem com legenda).
2. **Escolha a estrutura**: capa → seção de abertura com resumo (indicadores ou cartões) → sumário (se houver 3+ seções) → capítulos → dúvidas → contracapa. Não force essa ordem se o material pedir outra.
3. **Escolha a aparência** só entre opções registradas: um estilo pronto coerente com a finalidade (`manual` institucional, `guide` guia rápido, `report` relatório, `notice` papel timbrado…) ou capa/rodapé/tema específicos. Capas e rodapés estão descritos no catálogo com a página do MIV de origem.
4. **Escreva o arquivo-fonte** (`*.source.json`) com ids legíveis (`b_requisitos`, `b_passos-g003`) e imagens por caminho (`"assets": { "img_tela1": { "src": "entrada/tela1.png" } }`). Prefira `"intent"` quando a intenção for clara (`warning`, `procedure`, `screenshot`…).
5. `docstudio build` → corrija até não haver erros.
6. `docstudio render --pdf --png --report` e **inspecione** (seção 6).
7. Corrija com o arquivo-fonte ou com operações e renderize de novo.
8. **Nomes de saída**: quando o pedido disser "salve como `pasta/nome`", use `nome` como base: `pasta/nome.source.json` (o que você escreveu), `pasta/nome.docstudio.json` (o documento), `pasta/nome.pdf`, `pasta/nome-paginas/` (PNG) e `pasta/nome.relatorio.json`. Sem indicação, use `saida/<slug-do-título>`.
9. Entregue o `.docstudio.json` (abre no editor por *Abrir cópia de segurança* ou pelo link de `docstudio serve`) e o PDF.

## 4. Alterar um documento existente (modo controlado)

- Rode `inspect` e localize os alvos **pelo id**. Nunca recrie o documento inteiro para uma mudança pequena.
- Escreva um `.ops.json` com o mínimo necessário (ver `DOCUMENT_FORMAT.md` §6). Use `expect` para declarar o que espera encontrar no alvo: se o bloco não for o esperado, a operação falha em vez de alterar o bloco errado.
- `apply --dry-run` mostra o que vai mudar; depois `apply` grava. O lote é atômico.
- Respeite restrições do pedido ("não altere a capa" = nenhum `setDesign`/`setMeta` da capa; "mantenha a estrutura" = sem `move`/`reorder`/`remove`).
- Na interface, a pessoa pode colar o mesmo `.ops.json` em **⋯ → Aplicar alterações de IA**: ela vê a revisão (novos, excluídos, alterados, movidos, aparência) e aplica; **Ctrl+Z desfaz o lote inteiro**.
- Pedidos sobre uma seleção: a pessoa usa **Copiar para IA (JSON)** no botão direito; o texto colado traz os blocos com ids e o formato da resposta esperada.

## 5. Bom uso dos componentes

**Material de entrada "sujo"** (texto extraído de PDF, e-mails): descarte números de página, cabeçalhos e rodapés repetidos. Referências a figuras que não vieram ("Figura 7") são removidas — nunca invente a figura; referências a seções de outro documento viram o nome do documento + "(confirmar)". Dados incertos também levam "(confirmar)", e a lista do que ficou para confirmar vai no relatório final.

**Mensagem de sistema × print:** use o bloco `message` (intenção `system-message`/`error-message`) para a frase exata que o sistema exibe; use o print (`screenshot`) quando a pessoa precisa **ver onde clicar**. Com os dois disponíveis para o mesmo erro, prefira o print com a frase exata na legenda, para não repetir o texto.

**Texto de tela** (`` `G003` ``) e o bloco `code` saem em fonte monoespaçada do sistema, fora das fontes do MIV (exceção funcional, ver `BRAND_RULES.md`): use só para comandos, códigos e textos literais. Para destacar um nome de tela ou serviço, prefira **negrito**.

- Varie os componentes quando isso **melhora a compreensão**: sequência de ações → `steps`; requisitos → `list` com `style: "check"`; risco → `callout` `danger`; comparação → `table` ou `cards` (intenção `comparison`); visão geral do processo → `flow`; prazos → `timeline`; números-chave → `stats`.
- Evite páginas que sejam só título + parágrafo + título + parágrafo; 5 parágrafos seguidos geram recomendação.
- Não use destaque para decorar: 1–2 por página, texto curto.
- Títulos de passo: verbo no imperativo ("Informe o chassi"). Parágrafos curtos (3–6 linhas). Linguagem simples para leigos.
- Prints: legenda sempre (vira "Figura N" e texto alternativo); largura 100% para telas de computador, 45–70% para celular; resolução ≥ 150 ppi no tamanho impresso. `inspect` mostra, para cada imagem, os pixels, a resolução na largura atual e a **largura máxima** que mantém 150 ppi (ex.: `[706 px · 105 ppi a 100% · máx. 70%]`); o validador avisa com a mesma sugestão.
- Tabelas: até 12 colunas; tabelas largas (> 5 colunas) em páginas paisagem (`pagebreak` com `orientation: "landscape"` antes e `"portrait"` depois).
- Nova página: `section` com `newPage: true` para capítulos grandes; deixe a paginação cuidar do resto (títulos nunca ficam órfãos, tabelas repetem o cabeçalho, parágrafos se dividem por linha).

## 6. Inspecionar o resultado (obrigatório antes de concluir)

- `render` lista cada página: tipo, ocupação da área útil, palavras e os ids dos blocos. Sinais de problema:
  - `✖ ESTOURA`: um bloco não cabe numa página (divida o conteúdo);
  - `⚠ passa da área útil` ou ocupação > 100%: avise o mantenedor (é defeito do app);
  - `⚠ quase vazia` (< 20% de ocupação, inclusive a última página de conteúdo): quebra forçada desnecessária (`newPage`/`pagebreak`), bloco grande que pulou ou sobra no fim — reorganize, enxugue ou reduza uma imagem;
  - `⚠ densa` (> 700 palavras): divida ou use listas e passo a passo;
  - poucos itens de uma lista/glossário sozinhos no topo da página seguinte: ajuste largura de imagens ou a ordem.
- Abra os PNG (`--png`) e confira visualmente capa, hierarquia, prints legíveis e contracapa.
- No PDF: o relatório compara o número de páginas com a prévia e conta imagens rasterizadas (só fotos/prints devem ser imagens; confira com `pdfimages -list`). `pdffonts` deve listar só Kanit e Maitree — e uma monoespaçada (ex.: DejaVu Sans Mono) apenas se o documento tiver texto de tela ou bloco de código.
- Repita até não haver erros nem avisos relevantes.

## 7. Limites honestos

- O PDF sai pelo Chrome/Chromium (`Page.printToPDF`, o mesmo motor do "Salvar como PDF"); outros navegadores não foram usados pela CLI.
- O validador confere o que é verificável por código (estrutura, opções, cores por nome, contraste dos temas, resolução das imagens, paginação). Qualidade do texto, adequação do conteúdo e escolhas editoriais continuam sendo revisão humana.
- O app não chama nenhum modelo de IA: a integração é por arquivos (`.source.json`, `.docstudio.json`, `.ops.json`) e pela API `window.docStudio` (seção "API no navegador" de `DOCUMENT_FORMAT.md`), pronta para um assistente futuro.
