# Formato do documento e das alterações

Esquemas legíveis por máquina (JSON Schema 2020-12, gerados das definições do editor): [`schemas/document.schema.json`](../../schemas/document.schema.json) e [`schemas/operations.schema.json`](../../schemas/operations.schema.json). Catálogo completo: [`schemas/catalog.json`](../../schemas/catalog.json).

## 1. Arquivo de documento (`.docstudio.json`)

```json
{
  "format": "doc-studio",
  "version": 1,
  "document": {
    "id": "d_…",
    "name": "Manual da Coleta Externa",
    "meta": { "title": "Manual da\nColeta Externa", "subtitle": "…", "headerTitle": "…" },
    "design": { "theme": "green", "cover": "folder", "footer": "bar", "signature": "joint" },
    "blocks": [
      { "id": "b_resumo", "type": "section", "kicker": "Visão geral", "title": "Em resumo", "intro": "…" },
      { "id": "b_passos", "type": "steps", "items": [{ "title": "Informe o chassi", "text": "…" }] }
    ]
  },
  "assets": {
    "img_tela1": { "dataUrl": "data:image/png;base64,…", "width": 1045, "height": 455, "name": "tela1.png" }
  }
}
```

- `document.blocks` é a lista ordenada de blocos; **as páginas não são guardadas**: a paginação as calcula (relatório em `docstudio render`).
- `meta`: textos fixos da capa, cabeçalho e contracapa (sem formatação; `\n` quebra linha onde o campo aceita).
- `design`: só opções registradas (ver `COMPONENT_CATALOG.md`). Campos desconhecidos são ignorados e reportados.
- `assets`: imagens do documento, referenciadas por id (`image.assetId`, `design.customLogo`, `design.coverImage`).

### Arquivo-fonte (`.source.json`)

Igual ao anterior, mas pensado para agentes: imagens por caminho, relativo à pasta do próprio arquivo-fonte (com o fonte em `saida/` e as imagens em `entrada/`, use `{ "src": "../entrada/tela.png" }`), ids opcionais e `intent` no lugar de `type`. `docstudio build` converte no arquivo final, embutindo as imagens **sem reduzir nem recomprimir**. Também é aceito só o objeto do documento (`{ "name", "meta", "design", "blocks" }`).

## 2. Ids estáveis

- Blocos: `^[\w-]{1,40}$`. Use nomes legíveis (`b_requisitos`). Sem id, o sistema cria um (`b_…`) e o mantém dali em diante: editar, mover, transformar e as operações preservam o id; duplicar e colar criam ids novos.
- Ids repetidos são erro. Imagens: `^[\w-]{1,64}$` (`img_tela-g003`).
- Itens dentro de um bloco (passos, linhas de tabela) são endereçados por posição em caminhos (`items.2.title`, `rows.0.1`).

## 3. Intenções semânticas

Um bloco pode dizer **o que é** em vez de **como parece**: `{ "intent": "warning", "text": "…" }` vira um destaque de atenção; `{ "intent": "procedure", "items": [...] }` vira passo a passo. Campos informados prevalecem sobre os da intenção. Lista completa em `COMPONENT_CATALOG.md` (`important-information`, `warning`, `danger`, `tip`, `success`, `example`, `note`, `procedure`, `requirement`, `comparison`, `screenshot`, `system-message`, `error-message`, `faq`, `schedule`, `process`, `key-figures`, `definitions`, `command`, `chapter`, `landscape-pages`…).

## 4. Formatação no texto

Nos campos marcados com * no catálogo: `**negrito**`, `*itálico*`, `++sublinhado++`, `~~riscado~~`, `==destaque==`, `` `texto de tela` ``, `[link](https://…)`. Escape com `\` (`\*`). HTML **não** é interpretado (aparece como texto e gera aviso). Links só `https://`, `http://`, `mailto:`, `tel:` (outros são recusados). Campos simples (`plain`) e `code` são texto literal.

## 5. Validação

`docstudio validate` (e "Verificar documento" no app) reporta em português, com o bloco e o campo:

- **erro** (impede gravar/renderizar): tipo de bloco ou intenção inexistente, valor fora da lista (inclusive cor por código), tipo errado, id repetido, imagem inexistente, link inseguro, texto acima do limite, capa "Foto" sem foto, "Logo próprio" sem logo;
- **aviso**: campo desconhecido (ignorado), HTML no texto, tabela com linhas de tamanho diferente, imagem com menos de 150 ppi impressa, textos "(exemplo)", capa com título padrão;
- **sugestão**: seções vazias, 5+ parágrafos seguidos, parágrafo muito longo, imagem sem legenda, página densa ou quase vazia (só com a paginação: app ou `render`).

## 6. Arquivo de alterações (`.ops.json`)

```json
{
  "format": "doc-studio-operations",
  "version": 1,
  "documentId": "d_…",
  "description": "Resumo exibido na revisão",
  "assets": { "img_nova": { "src": "entrada/nova.png" } },
  "operations": [
    { "op": "insert", "at": { "after": "b_resumo" }, "blocks": [{ "intent": "warning", "text": "…" }] },
    { "op": "update", "id": "b_passos", "expect": { "type": "steps" }, "set": { "items.1.title": "Confira a NF-e" } },
    { "op": "move", "ids": ["b_duvidas", "b_faq"], "to": "end" },
    { "op": "remove", "id": "b_antigo", "expect": { "text": "texto que deve estar lá" } },
    { "op": "setDesign", "set": { "cover": "identity" } }
  ]
}
```

| op | campos | efeito |
| --- | --- | --- |
| `insert` | `blocks`, `at` | insere (posição padrão: fim) |
| `update` | `id`, `set`, `expect` | altera campos ou caminhos (`items.2.title`, `rows.0.1`); o bloco inteiro é revalidado |
| `replace` | `id`, `block`, `expect` | troca o bloco (pode mudar o tipo), mantendo o id |
| `remove` | `id` ou `ids`, `expect` | exclui |
| `move` | `id` ou `ids`, `to` | move mantendo a ordem relativa |
| `reorder` | `ids` (todos) | reorganiza o documento inteiro |
| `duplicate` | `id`, `newId` | duplica abaixo |
| `transform` | `id`, `to`, `expect` | troca entre tipos de texto mantendo o conteúdo |
| `setDesign` / `applyPreset` | `set` / `preset` | aparência |
| `setMeta` / `rename` | `set` / `name` | textos fixos / nome |

Posições: `"start"`, `"end"`, `{ "index": n }`, `{ "before": "id" }`, `{ "after": "id" }`. O lote é **atômico**: se uma operação falhar, nada muda, e a mensagem diz qual operação e por quê (com ids parecidos quando o alvo não existe). Também é aceito só o array de operações.

## 7. API no navegador

Com o app aberto, `window.docStudio` expõe:

- `applyOperations(operations, { assets })` — aplica um lote como **um** passo de desfazer (Ctrl+Z desfaz tudo) e devolve `{ ok, error, changes }`;
- `check()` — a verificação completa (estrutura, marca, conteúdo e páginas);
- `report()` — páginas como saíram na paginação (`kind`, `orientation`, `blocks`, `fill`, `words`, `overflowing`);
- `store` (documento e histórico) e `ui` (estado da interface), para depuração.

URLs: `index.html?open=caminho.docstudio.json` abre um arquivo do mesmo servidor como novo documento; `index.html?render=caminho` é o modo de renderização da CLI (só a prévia, nada salvo).

## 8. Versões e compatibilidade

`version` é a versão do formato. Arquivos de versões anteriores passam por `migratePayload` (`js/model.js`), que aplica as migrações em sequência; arquivos de versão mais nova são recusados com mensagem clara. Toda entrada (arquivo, colagem, operação, `?open=`) é reconstruída campo a campo: nada vira HTML, CSS ou script.
