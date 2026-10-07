# Exemplos

Todos em [`examples/`](../../examples/), no formato oficial. O `*.source.json` é o que um agente escreve; o `*.docstudio.json` é o resultado de `docstudio build` (abre no editor por **⋯ → Abrir cópia de segurança** ou por `index.html?open=examples/<arquivo>.docstudio.json`). `node tools/docstudio.mjs check` confere que todos continuam válidos.

| arquivo | finalidade | o que mostra |
| --- | --- | --- |
| `manual-coleta-externa.source.json` | Manual institucional (11 páginas) | Criado por agente a partir do manual de referência da coleta externa: indicadores, cartões, sumário, linha do tempo, tabelas, fluxo, dois passo a passo com numeração contínua, alertas, mensagens de sistema, pergunta e resposta e glossário. Estilo "Manual institucional". |
| `procedimento-vistoria-g003.source.json` | Procedimento (5 páginas) | Manual do despachante (G003) com fichas, requisitos em checklist, alerta, dúvida comum e passos. Capa "Envelope", títulos em faixa, tema água-marinha. |
| `guia-rapido-estudio.source.json` | Guia rápido com prints (4 páginas) | Imagens por caminho (`examples/assets/`), cartões em 3 colunas, dica e informação importante. Capa "Arcos" e contracapa "Conceito" do MIV. |
| `manual-coleta-externa.alteracoes.ops.json` | Alteração pontual | Lote sobre o manual: insere requisitos, ajusta um destaque com `expect`, move a seção de dúvidas, transforma um parágrafo e troca a capa. Teste com `apply … --dry-run`. |

## Como foram validados

```bash
node tools/docstudio.mjs build examples/manual-coleta-externa.source.json
node tools/docstudio.mjs render examples/manual-coleta-externa.docstudio.json --pdf /tmp/manual.pdf --png /tmp/manual-png
node tools/docstudio.mjs apply examples/manual-coleta-externa.docstudio.json examples/manual-coleta-externa.alteracoes.ops.json --dry-run
```

Os PDFs saem vetoriais (só os prints são imagens, na resolução original), com Kanit e Maitree embutidas e o mesmo número de páginas da prévia.
