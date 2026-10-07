# Catálogo de componentes (gerado)

> **Não edite à mão.** Gerado por `node tools/docstudio.mjs generate` a partir de `js/schema.js`, `js/design.js`, `js/templates.js`, `js/operations.js` e `js/catalog.js` — as mesmas definições que o editor usa. Versão JSON: `schemas/catalog.json`.

Campos marcados com * aceitam formatação: bold `**texto**`, italic `*texto*`, underline `++texto++`, strike `~~texto~~`, highlight `==texto==`, code ``texto``, link `[texto](https://…)`. Só nos campos com "formatting": true. HTML não é interpretado (aparece como texto). Links: https://, http://, mailto: e tel:. Escape um marcador com \ (ex.: \*).

## Intenções semânticas

Em vez de `type`, um bloco pode trazer `"intent"`: o sistema escolhe o tipo e as opções. Campos explícitos prevalecem.

| intent | quando usar | vira |
| --- | --- | --- |
| `important-information` | Informação que o leitor não pode perder | `{"type":"callout","tone":"info","title":"Importante"}` |
| `warning` | Cuidado, condição ou exceção que pode causar erro | `{"type":"callout","tone":"warning","title":"Atenção"}` |
| `danger` | Risco, bloqueio, penalidade ou ação irreversível | `{"type":"callout","tone":"danger","title":"Alerta"}` |
| `tip` | Atalho, boa prática ou sugestão opcional | `{"type":"callout","tone":"tip","title":"Dica"}` |
| `success` | Confirmação de que deu certo / resultado esperado | `{"type":"callout","tone":"success","title":"Pronto"}` |
| `example` | Exemplo concreto que ilustra a regra | `{"type":"callout","tone":"tip","title":"Exemplo"}` |
| `note` | Observação secundária, em letra menor | `{"type":"paragraph","style":"note"}` |
| `lead` | Parágrafo de abertura, maior, que resume a seção | `{"type":"paragraph","style":"lead"}` |
| `procedure` | Sequência de ações numeradas que o leitor executa | `{"type":"steps"}` |
| `requirement` | Requisitos, documentos exigidos, condições (checklist) | `{"type":"list","style":"check"}` |
| `comparison` | Antes × depois, opção A × opção B | `{"type":"cards","columns":"2","marker":"none","tone":"alternate"}` |
| `screenshot` | Print de tela com legenda (vira "Figura N") | `{"type":"image","frame":true,"ratio":"original","width":100}` |
| `photo` | Foto ilustrativa, sem moldura | `{"type":"image","frame":false}` |
| `system-message` | Texto exato exibido por um sistema | `{"type":"message","tone":"info"}` |
| `error-message` | Mensagem de erro exata exibida por um sistema | `{"type":"message","tone":"danger","label":"Mensagem de erro"}` |
| `faq` | Dúvidas frequentes com resposta | `{"type":"faq"}` |
| `schedule` | Datas, prazos, marcos de implantação | `{"type":"timeline"}` |
| `process` | Visão geral de um fluxo em poucas etapas, lado a lado | `{"type":"flow"}` |
| `key-figures` | Números que resumem o assunto | `{"type":"stats","style":"kpi"}` |
| `definitions` | Termos, siglas e definições | `{"type":"glossary"}` |
| `signature` | Fecho com nome e cargo de quem assina (ofício, comunicado, ata) | `{"type":"signature"}` |
| `command` | Comandos, códigos, configurações, texto de tela literal | `{"type":"code"}` |
| `chapter` | Início de um novo assunto (título numerado em nova página) | `{"type":"section","newPage":true}` |
| `chapter-opener` | Página inteira de abertura de capítulo (use com moderação) | `{"type":"section","newPage":true,"opener":true}` |
| `table-of-contents` | Sumário automático com páginas | `{"type":"toc"}` |
| `new-page` | Força o próximo conteúdo em nova página | `{"type":"pagebreak"}` |
| `landscape-pages` | Páginas seguintes deitadas (tabelas largas, prints largos) | `{"type":"pagebreak","orientation":"landscape"}` |

## Componentes (blocos)

### Texto

#### `section` — Seção

Título numerado com chamada e linha colorida.

- **Use para:** Abrir cada assunto principal (capítulo). Alimenta o sumário e recebe número automático.
- **Evite:** Subdivisões dentro de um assunto (use Subtítulo). Seções sem conteúdo.
- **No PDF:** Nunca fica sozinha no pé da página. "newPage" começa em folha nova; "opener" cria uma página inteira de abertura.

| campo | rótulo | valores |
| --- | --- | --- |
| `title` | Título da seção | texto com formatação* |
| `kicker` | Chamada acima do título (opcional) | texto |
| `intro` | Introdução (opcional) | texto com formatação* |
| `newPage` | Começar em nova página | `true` / `false` |
| `opener` | Página inteira de abertura de capítulo | `true` / `false` |

Padrão:

```json
{"type":"section","title":"Nova seção","kicker":"","intro":"","newPage":false,"opener":false}
```

#### `heading` — Subtítulo

Título menor dentro de uma seção.

- **Use para:** Subdividir uma seção ("Quem participa", "Documentos exigidos").
- **Evite:** Títulos de capítulo (use Seção) ou frases longas.
- **No PDF:** Fica sempre junto do bloco seguinte.

| campo | rótulo | valores |
| --- | --- | --- |
| `text` | Texto | texto com formatação* |
| `level` | Nível | `2` Subtítulo · `3` Título menor |

Padrão:

```json
{"type":"heading","text":"Subtítulo","level":"2"}
```

#### `paragraph` — Parágrafo

Texto corrido com formatação.

- **Use para:** Texto corrido explicativo, curto (3 a 6 linhas). Estilo "lead" abre a seção; "note" é observação menor. Alinhamento "right" para local e data de ofícios e comunicados.
- **Evite:** Sequências de ações (Passo a passo), requisitos (Lista ✓), avisos (Destaque), comparações (Cartões/Tabela).
- **No PDF:** Linhas em branco separam parágrafos; um parágrafo longo continua na página seguinte, linha a linha (mínimo 2 linhas de cada lado).

| campo | rótulo | valores |
| --- | --- | --- |
| `text` | Texto | texto com formatação* |
| `style` | Estilo | `normal` Normal · `lead` Abertura · `note` Nota |
| `align` | Alinhamento | `left` À esquerda · `justify` Justificado · `center` Centralizado · `right` À direita |

Padrão:

```json
{"type":"paragraph","text":"","style":"normal","align":"left"}
```

#### `list` — Lista

Marcadores, números ou checklist.

- **Use para:** Itens curtos e paralelos: marcadores, números ou checklist (style "check" para requisitos e documentos exigidos).
- **Evite:** Ações com explicação (Passo a passo) e itens com título + texto (Cartões).
- **No PDF:** Cada item é uma unidade; a lista pode continuar na página seguinte entre itens.

| campo | rótulo | valores |
| --- | --- | --- |
| `items` | Itens | texto com formatação* (um item por linha (\n)) |
| `style` | Marcador | `bullet` • · `ordered` 1. · `check` ✓ |

Padrão:

```json
{"type":"list","items":"Primeiro item\nSegundo item","style":"bullet"}
```

#### `quote` — Citação

Frase em destaque com autoria.

- **Use para:** Frase de efeito, depoimento ou citação de norma com autoria.
- **Evite:** Avisos (Destaque) ou texto comum.
- **No PDF:** Não se divide entre páginas.

| campo | rótulo | valores |
| --- | --- | --- |
| `text` | Frase | texto com formatação* |
| `author` | Autoria (opcional) | texto |

Padrão:

```json
{"type":"quote","text":"Uma frase curta que resume a ideia principal.","author":""}
```

#### `code` — Código ou texto de tela

Comandos, mensagens e configurações em fonte de máquina.

- **Use para:** Comandos, códigos, configurações, caminhos de menu e texto de tela literal (fonte de máquina, espaços preservados).
- **Evite:** Mensagens curtas exibidas ao usuário (use Mensagem do sistema).
- **No PDF:** Cada linha é uma unidade; continua na página seguinte entre linhas.

| campo | rótulo | valores |
| --- | --- | --- |
| `title` | Título (opcional) | texto |
| `text` | Conteúdo | texto (texto literal, sem formatação; linhas com \n) |
| `numbers` | Numerar as linhas | `true` / `false` |

Padrão:

```json
{"type":"code","title":"","text":"Primeira linha\nSegunda linha","numbers":false}
```

#### `signature` — Assinatura

Linha para assinar com nome e cargo (ofício, comunicado, ata).

- **Use para:** Fecho de ofício, comunicado, ata ou parecer: nome e cargo de quem assina (até 3 lado a lado), com linha para a assinatura à mão.
- **Evite:** Listar a equipe ou os autores (use Cartões ou Lista); repetir a assinatura do Governo (ela já está no cabeçalho e na capa).
- **No PDF:** Não se divide; com a linha, reserva cerca de 12 mm para a assinatura à mão.

| campo | rótulo | valores |
| --- | --- | --- |
| `items` | Quem assina | lista (máx. 3) de { `name`, `role` } |
| `align` | Posição | `left` À esquerda · `center` Centralizada · `right` À direita |
| `line` | Linha para assinar à mão | `true` / `false` |

Padrão:

```json
{"type":"signature","items":[{"name":"Nome do signatário","role":"Cargo · Órgão"}],"align":"center","line":true}
```

### Organização

#### `steps` — Passo a passo

Etapas numeradas ligadas por linha.

- **Use para:** Procedimentos: ações numeradas que o leitor executa, cada uma com título curto (verbo no imperativo) e explicação.
- **Evite:** Itens sem ordem (Lista ou Cartões) e visão geral de fluxo (Fluxo).
- **No PDF:** Cada passo é uma unidade; o passo a passo continua na página seguinte entre passos. Use "start" para continuar a numeração.

| campo | rótulo | valores |
| --- | --- | --- |
| `title` | Título do grupo (opcional) | texto com formatação* |
| `start` | Começar a numeração em | número 1–999 |
| `tone` | Cor | `theme` Cor do tema · `accent` Cor de apoio do tema · `green` Verde · `teal` Água-marinha · `orange` Laranja · `red` Vermelho · `gold` Amarelo-ouro · `navy` Grafite |
| `items` | Passos | lista (máx. 60) de { `title`*, `text`* } |

Padrão:

```json
{"type":"steps","title":"","start":1,"tone":"theme","items":[{"title":"Primeiro passo","text":"Explique o que deve ser feito."},{"title":"Segundo passo","text":"Indique o resultado esperado."}]}
```

#### `cards` — Cartões

Grade de 1 a 3 colunas com marcador.

- **Use para:** Grupos de 2 a 6 itens com título e texto: papéis ("Quem participa"), opções, comparação antes × depois.
- **Evite:** Sequências (Passo a passo) ou dados tabulares (Tabela).
- **No PDF:** Cada linha da grade é uma unidade.

| campo | rótulo | valores |
| --- | --- | --- |
| `columns` | Colunas | `1` 1 · `2` 2 · `3` 3 |
| `marker` | Marcador | `number` 1 · `letter` A · `check` ✓ · `none` Nenhum |
| `tone` | Cor | `alternate` Alternar cores · `theme` Cor do tema · `accent` Cor de apoio do tema · `green` Verde · `teal` Água-marinha · `orange` Laranja · `red` Vermelho · `gold` Amarelo-ouro · `navy` Grafite |
| `items` | Cartões | lista (máx. 30) de { `title`*, `text`* } |

Padrão:

```json
{"type":"cards","columns":"2","marker":"number","tone":"theme","items":[{"title":"Primeiro ponto","text":"Descrição curta do ponto."},{"title":"Segundo ponto","text":"Descrição curta do ponto."}]}
```

#### `flow` — Fluxo

Etapas lado a lado com setas.

- **Use para:** Visão geral de um processo em 3 a 5 etapas lado a lado, com setas.
- **Evite:** Instruções detalhadas (Passo a passo) ou mais de 6 etapas.
- **No PDF:** Cada linha de etapas é uma unidade.

| campo | rótulo | valores |
| --- | --- | --- |
| `label` | Rótulo das etapas | texto |
| `tone` | Cor | `alternate` Alternar cores · `theme` Cor do tema · `accent` Cor de apoio do tema · `green` Verde · `teal` Água-marinha · `orange` Laranja · `red` Vermelho · `gold` Amarelo-ouro · `navy` Grafite |
| `items` | Etapas | lista (máx. 16) de { `title`*, `text`* } |

Padrão:

```json
{"type":"flow","label":"Etapa","tone":"alternate","items":[{"title":"Solicitação","text":"Quem inicia e onde."},{"title":"Análise","text":"O que é conferido."},{"title":"Conclusão","text":"Resultado entregue."}]}
```

#### `timeline` — Linha do tempo

Marcos com data, em sequência.

- **Use para:** Datas, prazos e marcos de implantação.
- **Evite:** Sequências sem data.
- **No PDF:** Cada linha de marcos é uma unidade.

| campo | rótulo | valores |
| --- | --- | --- |
| `title` | Título (opcional) | texto com formatação* |
| `tone` | Cor | `alternate` Alternar cores · `theme` Cor do tema · `accent` Cor de apoio do tema · `green` Verde · `teal` Água-marinha · `orange` Laranja · `red` Vermelho · `gold` Amarelo-ouro · `navy` Grafite |
| `items` | Marcos | lista (máx. 24) de { `date`, `title`*, `text`* } |

Padrão:

```json
{"type":"timeline","title":"","tone":"alternate","items":[{"date":"06/10","title":"Início","text":"O que acontece nesta data."},{"date":"19/10","title":"Transição","text":"O que muda."},{"date":"26/10","title":"Implantação plena","text":"Regra definitiva."}]}
```

#### `toc` — Sumário

Lista automática das seções com página.

- **Use para:** Sumário automático em documentos com 3 ou mais seções; normalmente logo após a apresentação.
- **Evite:** Documentos curtos ou sem blocos Seção.
- **No PDF:** Não se divide; os números de página são preenchidos na paginação.

| campo | rótulo | valores |
| --- | --- | --- |
| `title` | Título | texto |
| `columns` | Colunas | `1` 1 · `2` 2 |
| `style` | Estilo | `lines` Linhas · `dots` Pontilhado (MIV) |

Padrão:

```json
{"type":"toc","title":"Neste documento","columns":"2","style":"lines"}
```

### Destaques

#### `callout` — Destaque

Caixa de atenção, dica ou alerta.

- **Use para:** Avisos com intenção: info (importante), warning (atenção), danger (alerta/risco), tip (dica), success (confirmação). Use poucos por página.
- **Evite:** Destacar texto comum; vários destaques seguidos perdem o efeito.
- **No PDF:** Não se divide entre páginas; mantenha o texto curto.

| campo | rótulo | valores |
| --- | --- | --- |
| `tone` | Tipo | `info` Informação · `success` Sucesso · `warning` Atenção · `danger` Alerta · `tip` Dica |
| `title` | Título (opcional) | texto com formatação* |
| `text` | Texto | texto com formatação* |

Padrão:

```json
{"type":"callout","tone":"warning","title":"Atenção","text":"Explique o ponto que merece cuidado."}
```

#### `message` — Mensagem do sistema

Texto exato exibido na tela, entre aspas.

- **Use para:** Texto exato que um sistema mostra na tela (erros, confirmações), entre aspas.
- **Evite:** Avisos do próprio manual (Destaque).
- **No PDF:** Não se divide entre páginas.

| campo | rótulo | valores |
| --- | --- | --- |
| `label` | Rótulo | texto |
| `text` | Mensagem | texto com formatação* |
| `tone` | Tipo | `info` Informação · `success` Sucesso · `warning` Atenção · `danger` Alerta · `tip` Dica |

Padrão:

```json
{"type":"message","label":"Mensagem do sistema","text":"Texto exatamente como aparece na tela.","tone":"info"}
```

#### `faq` — Pergunta e resposta

Dúvidas comuns em duas colunas.

- **Use para:** Dúvidas comuns e situações frequentes com resposta direta.
- **Evite:** Conteúdo principal do procedimento.
- **No PDF:** Cada pergunta é uma unidade.

| campo | rótulo | valores |
| --- | --- | --- |
| `questionLabel` | Rótulo da pergunta | texto |
| `answerLabel` | Rótulo da resposta | texto |
| `tone` | Cor | `theme` Cor do tema · `accent` Cor de apoio do tema · `green` Verde · `teal` Água-marinha · `orange` Laranja · `red` Vermelho · `gold` Amarelo-ouro · `navy` Grafite |
| `items` | Perguntas | lista (máx. 40) de { `question`*, `answer`* } |

Padrão:

```json
{"type":"faq","questionLabel":"Dúvida comum","answerLabel":"Resposta","tone":"teal","items":[{"question":"Qual é a dúvida mais frequente?","answer":"Responda de forma direta, indicando onde conferir."}]}
```

#### `chips` — Etiquetas

Palavras-chave em pílulas.

- **Use para:** Etiquetas curtas: categorias, opções disponíveis, status; ~~risque~~ o que não se aplica.
- **Evite:** Frases longas.
- **No PDF:** Não se divide entre páginas.

| campo | rótulo | valores |
| --- | --- | --- |
| `label` | Título (opcional) | texto com formatação* |
| `items` | Etiquetas | texto com formatação* (um item por linha (\n)) |
| `tone` | Cor | `theme` Cor do tema · `accent` Cor de apoio do tema · `green` Verde · `teal` Água-marinha · `orange` Laranja · `red` Vermelho · `gold` Amarelo-ouro · `navy` Grafite |

Padrão:

```json
{"type":"chips","label":"","items":"Opção A\nOpção B\n~~Não se aplica~~","tone":"theme"}
```

### Dados

#### `table` — Tabela

Linhas e colunas; aceita colar do Excel.

- **Use para:** Dados comparáveis em linhas e colunas (normas, prazos, campos e valores). Até 12 colunas; tabelas largas ficam melhores em páginas paisagem.
- **Evite:** Texto longo em células e listas simples.
- **No PDF:** Cada linha é uma unidade; a tabela continua na página seguinte repetindo o cabeçalho.

| campo | rótulo | valores |
| --- | --- | --- |
| `header/rows` | Conteúdo | header: lista de títulos; rows: lista de linhas (listas de células). Até 12 colunas e 400 linhas; células aceitam formatação. |
| `tone` | Cabeçalho | `navy` Grafite (padrão) · `theme` Cor do tema · `accent` Cor de apoio · `teal` Água-marinha · `minimal` Minimalista (só linhas) |
| `zebra` | Linhas alternadas | `true` / `false` |
| `keyColumn` | Primeira coluna em destaque | `true` / `false` |
| `note` | Nota abaixo da tabela (opcional) | texto com formatação* |

Padrão:

```json
{"type":"table","header":["Item","Descrição"],"rows":[["Primeiro","Detalhe do primeiro item"],["Segundo","Detalhe do segundo item"]],"tone":"navy","zebra":true,"keyColumn":true,"note":""}
```

#### `stats` — Indicadores

Números em destaque ou fichas.

- **Use para:** Até 4 números que resumem o assunto (kpi) ou fichas com valor e rótulo (sheet).
- **Evite:** Números sem contexto.
- **No PDF:** Cada linha de indicadores é uma unidade.

| campo | rótulo | valores |
| --- | --- | --- |
| `style` | Estilo | `kpi` Números grandes · `sheet` Fichas |
| `tone` | Cor | `alternate` Alternar cores · `theme` Cor do tema · `accent` Cor de apoio do tema · `green` Verde · `teal` Água-marinha · `orange` Laranja · `red` Vermelho · `gold` Amarelo-ouro · `navy` Grafite |
| `items` | Indicadores | lista (máx. 16) de { `value`*, `label`*, `sub`* } |

Padrão:

```json
{"type":"stats","style":"kpi","tone":"alternate","items":[{"value":"5","label":"Evidências","sub":"chassi e 4 fotos"},{"value":"4","label":"Condições","sub":"para a coleta reduzida"},{"value":"26/10","label":"Implantação","sub":"regra obrigatória"}]}
```

#### `glossary` — Glossário

Termos e definições numa caixa.

- **Use para:** Termos, siglas e definições.
- **Evite:** Explicações longas.
- **No PDF:** Cada termo é uma unidade; a caixa continua na página seguinte.

| campo | rótulo | valores |
| --- | --- | --- |
| `title` | Título | texto |
| `tone` | Cor | `theme` Cor do tema · `accent` Cor de apoio do tema · `green` Verde · `teal` Água-marinha · `orange` Laranja · `red` Vermelho · `gold` Amarelo-ouro · `navy` Grafite |
| `items` | Termos | lista (máx. 80) de { `term`, `definition`* } |

Padrão:

```json
{"type":"glossary","title":"Glossário rápido","tone":"navy","items":[{"term":"Termo","definition":"Definição curta e objetiva."}]}
```

### Mídia

#### `image` — Imagem

Print ou foto com legenda numerada.

- **Use para:** Prints de tela e fotos. Com legenda vira "Figura N" e a legenda é o texto alternativo. Prints: moldura e largura 100% (ou 60–80% para prints de celular).
- **Evite:** Imagens decorativas sem função; imagens com menos de 150 ppi no tamanho impresso.
- **No PDF:** Não se divide; a imagem mantém a resolução original (até 3508 px) e o PDF a embute sem perda.

| campo | rótulo | valores |
| --- | --- | --- |
| `assetId` | Imagem | id de imagem em `assets` |
| `caption` | Legenda | texto com formatação* |
| `width` | Largura | número 25–100 % |
| `align` | Alinhamento | `left` Esquerda · `center` Centro · `right` Direita |
| `ratio` | Formato | `original` Original · `wide` 16:9 · `standard` 4:3 · `square` Quadrado · `portrait` Retrato |
| `fit` | No formato escolhido | `cover` Preencher (corta as bordas) · `contain` Encaixar (imagem inteira) |
| `focus` | Parte que aparece ao cortar | `top` Topo · `center` Centro · `bottom` Base |
| `frame` | Moldura fina | `true` / `false` |

Padrão:

```json
{"type":"image","assetId":"","caption":"","width":100,"align":"center","ratio":"original","fit":"cover","focus":"center","frame":true}
```

### Página

#### `divider` — Divisor

Linha, faixa colorida, grafismo do MIV ou espaço.

- **Use para:** Separar visualmente partes de uma seção ("wedge" = grafismo do MIV; "space" = respiro).
- **Evite:** Separar capítulos (use Seção).
- **No PDF:** Não se divide.

| campo | rótulo | valores |
| --- | --- | --- |
| `style` | Estilo | `line` Linha · `accent` Traço colorido · `brand` Faixa · `wedge` Grafismo · `space` Espaço |

Padrão:

```json
{"type":"divider","style":"line"}
```

#### `pagebreak` — Quebra de página

O próximo bloco começa em nova página, em pé ou deitada.

- **Use para:** Forçar nova página; "orientation": "landscape" deixa as páginas seguintes deitadas (tabelas largas), outra quebra em "portrait" volta.
- **Evite:** Ajustar espaçamento: a paginação já evita títulos órfãos e buracos.
- **No PDF:** A capa, a contracapa e as aberturas são sempre em retrato.

| campo | rótulo | valores |
| --- | --- | --- |
| `orientation` | Páginas seguintes | `portrait` Retrato (em pé) · `landscape` Paisagem (deitada) |

Padrão:

```json
{"type":"pagebreak","orientation":"portrait"}
```

## Aparência (`design`)

Escolha sempre entre as opções registradas; não existe CSS, cor ou fonte livre.

| opção | valores |
| --- | --- |
| `theme` | `green` Verde institucional (#26a737) · `teal` Água-marinha (#2db39e) · `orange` Laranja (#e06a0c) · `red` Urucum (#e94f0e) · `gold` Sol (#e4a500) · `leaf` Folha (#45b16e) · `navy` Grafite (#465564) · `sky` Azul (#56a7b2) |
| `cover` | `folder` Pasta · `official` Pasta oficial · `identity` Arcos · `panel` Painel verde · `invite` Convite · `envelope` Envelope · `fan` Leque · `solid` Verde pleno · `minimal` Minimalista · `photo` Foto · `totem` Totem · `sign` Placa · `stage` Palco · `certificate` Certificado · `none` Sem capa |
| `backCover` | `folder` Pasta (verso) · `concept` Conceito · `solid` Verde pleno · `fan` Leque · `minimal` Minimalista · `vignette` Vinheta · `identity` Arcos · `stage` Palco · `certificate` Certificado · `backdrop` Backdrop · `none` Sem contracapa |
| `header` | `classic` Texto · `rule` Texto e linha · `logo` Texto e assinatura · `letterhead` Timbrado · `band` Faixa no topo · `none` Nenhum |
| `footer` | `bar` Faixa · `address` Faixa e endereço · `half` Meia faixa · `stripe` Linha fina · `layers` Camadas · `none` Nenhum |
| `pageNumber` | `circle` Círculo · `text` Página X de Y · `none` Sem número |
| `sectionStyle` | `kicker` Chamada e linha · `number` Número grande · `band` Faixa |
| `cardStyle` | `soft` Preenchido · `outline` Contorno · `top` Barra superior |
| `bodyFont` | `maitree` Maitree (serifada) · `kanit` Kanit (sem serifa) |
| `headingWeight` | `regular` Padrão (manuais aprovados) · `strong` Extra forte (como o MIV) |
| `density` | `compact` Compacta · `regular` Padrão · `airy` Arejada |
| `margins` | `narrow` Estreita · `regular` Padrão · `wide` Larga |
| `signature` | `joint` DETRAN/CE + Governo · `seinfra` Governo + Secretaria · `state` Governo do Ceará · `concept` Governo + conceito · `custom` Logo próprio + Governo · `none` Sem assinatura |
| `colorMode` | `color` Colorida · `gray` Escala de cinza (P&B) |
| `chapterStyle` | `folder` Faixas (pasta) · `solid` Verde pleno (MIV) · `stage` Palco · `arcs` Arcos |
| `numberSections` | numera as seções (01, 02…) |
| `countCover` | a capa conta como página 1 |
| `customLogo` / `coverImage` | ids de imagem em `assets` |

### Capas

| id | nome | descrição |
| --- | --- | --- |
| `folder` | Pasta | Faixas diagonais nos cantos, como a pasta do MIV (p. 44) e os manuais aprovados |
| `official` | Pasta oficial | Pasta do MIV com a assinatura vertical centralizada e o título embaixo |
| `identity` | Arcos | Arcos do grafismo, como a capa do próprio Manual de Identidade Visual |
| `panel` | Painel verde | Título em painel verde e faixas diagonais (apresentação, MIV p. 57) |
| `invite` | Convite | Faixa vertical verde com bloco laranja à esquerda (convite, MIV p. 55) |
| `envelope` | Envelope | Faixa inclinada com pé laranja (verso do envelope, MIV p. 38) |
| `fan` | Leque | Elemento base do grafismo: raios em leque (MIV p. 26) |
| `solid` | Verde pleno | Degradê verde → água-marinha com assinatura em negativo (MIV p. 117) |
| `minimal` | Minimalista | Branco, com a faixa do papel timbrado no pé |
| `photo` | Foto | Sua foto no alto, recortada pelas faixas (slide com foto, MIV p. 56) |
| `totem` | Totem | Degradê verde em arco, assinatura vertical e raios no pé (totem, MIV p. 115) |
| `sign` | Placa | Painel verde à direita com o título em branco (placa de obra, MIV p. 76) |
| `stage` | Palco | Título centralizado e faixas em camadas no pé (fundo de palco, MIV p. 104) |
| `certificate` | Certificado | Clássica e centralizada, com faixa fina no alto (certificado, MIV p. 52) |
| `none` | Sem capa | O documento começa direto no conteúdo |

### Contracapas

| id | nome | descrição |
| --- | --- | --- |
| `folder` | Pasta (verso) | Faixa diagonal, endereço no rodapé (verso da pasta, MIV p. 44) |
| `concept` | Conceito | Degradê verde com assinatura e slogan do Governo (contracapa do MIV, p. 117) |
| `solid` | Verde pleno | Fundo verde com assinatura e endereço centralizados |
| `fan` | Leque | Grafismo em leque e endereço |
| `minimal` | Minimalista | Assinatura e endereço centralizados, faixa no pé |
| `vignette` | Vinheta | Fundo branco com assinatura e conceito em cores (vinheta, MIV p. 62) |
| `identity` | Arcos | Arcos do grafismo da capa do MIV, com assinatura e endereço |
| `stage` | Palco | Faixas em camadas no pé, assinatura centralizada (fundo de palco, MIV p. 104) |
| `certificate` | Certificado | Faixa fina no alto e faixa do timbrado no pé (MIV p. 52) |
| `backdrop` | Backdrop | Quadros verdes e brancos com as assinaturas alternadas (backdrop de eventos, MIV p. 116) |
| `none` | Sem contracapa | Termina na última página de conteúdo |

### Assinaturas

| id | nome | descrição |
| --- | --- | --- |
| `joint` | DETRAN/CE + Governo | Assinatura conjunta com a Secretaria da Infraestrutura (MIV p. 16) |
| `seinfra` | Governo + Secretaria | Assinatura secundária: Governo do Ceará com a Secretaria da Infraestrutura (MIV p. 8) |
| `state` | Governo do Ceará | Somente a assinatura do Governo (MIV p. 7) |
| `concept` | Governo + conceito | Assinatura com “Cuidar das pessoas, avançar o Ceará.” (MIV p. 9) |
| `custom` | Logo próprio + Governo | Envie o logo do órgão; ele fica à esquerda do Governo (MIV p. 16) |
| `none` | Sem assinatura | Nenhuma marca na capa, contracapa e timbrado |

## Estilos prontos (`applyPreset`)

Mudam só a aparência, nunca o conteúdo.

| id | nome | descrição | design |
| --- | --- | --- | --- |
| `manual` | Manual institucional | O visual dos manuais oficiais | `{"theme":"green","cover":"folder","backCover":"folder","header":"classic","footer":"bar","pageNumber":"circle","sectionStyle":"kicker","cardStyle":"soft","chapterStyle":"folder","headingWeight":"regular"}` |
| `guide` | Guia rápido | Leve, direto e arejado | `{"theme":"teal","cover":"envelope","backCover":"minimal","header":"rule","footer":"stripe","pageNumber":"circle","sectionStyle":"band","cardStyle":"top","chapterStyle":"folder","headingWeight":"regular"}` |
| `report` | Relatório executivo | Sóbrio, com números em evidência | `{"theme":"navy","cover":"identity","backCover":"solid","header":"logo","footer":"bar","pageNumber":"text","sectionStyle":"number","cardStyle":"outline","chapterStyle":"folder","headingWeight":"regular"}` |
| `campaign` | Campanha | Cores fortes e capa de impacto | `{"theme":"orange","cover":"solid","backCover":"fan","header":"rule","footer":"half","pageNumber":"circle","sectionStyle":"band","cardStyle":"soft","chapterStyle":"solid","headingWeight":"regular"}` |
| `notice` | Papel timbrado | Assinatura centralizada, endereço e faixa no pé (MIV p. 34) | `{"theme":"green","cover":"none","backCover":"none","header":"letterhead","footer":"address","pageNumber":"text","sectionStyle":"kicker","cardStyle":"outline","chapterStyle":"folder","headingWeight":"regular"}` |
| `miv` | Identidade do MIV | Capa em arcos e meia faixa, como o próprio manual | `{"theme":"green","cover":"identity","backCover":"concept","header":"rule","footer":"half","pageNumber":"circle","sectionStyle":"kicker","cardStyle":"soft","chapterStyle":"solid","headingWeight":"regular"}` |
| `panel` | Apresentação | Painel verde na capa, ideal para projetos | `{"theme":"green","cover":"panel","backCover":"concept","header":"rule","footer":"half","pageNumber":"circle","sectionStyle":"band","cardStyle":"top","chapterStyle":"solid","headingWeight":"regular"}` |
| `event` | Evento | Capa de convite, leve e direta | `{"theme":"teal","cover":"invite","backCover":"minimal","header":"classic","footer":"bar","pageNumber":"circle","sectionStyle":"number","cardStyle":"outline","chapterStyle":"folder","headingWeight":"regular"}` |
| `sertao` | Sol do sertão | Amarelo-ouro com leque | `{"theme":"gold","cover":"fan","backCover":"fan","header":"classic","footer":"bar","pageNumber":"circle","sectionStyle":"number","cardStyle":"top","chapterStyle":"folder","headingWeight":"regular"}` |
| `stage` | Evento (palco) | Capa de fundo de palco, centralizada, com faixas em camadas | `{"theme":"green","cover":"stage","backCover":"vignette","header":"band","footer":"layers","pageNumber":"circle","sectionStyle":"kicker","cardStyle":"soft","chapterStyle":"stage","headingWeight":"regular"}` |
| `works` | Obras e projetos | Capa de placa de obra, títulos fortes como no MIV | `{"theme":"green","cover":"sign","backCover":"stage","header":"rule","footer":"bar","pageNumber":"circle","sectionStyle":"number","cardStyle":"top","chapterStyle":"solid","headingWeight":"strong"}` |
| `photo` | Com foto | Sua foto na capa, recortada pelas faixas do MIV | `{"theme":"teal","cover":"photo","backCover":"vignette","header":"rule","footer":"layers","pageNumber":"circle","sectionStyle":"band","cardStyle":"soft","chapterStyle":"arcs","headingWeight":"regular"}` |
| `certificate` | Clássico | Centralizado e sóbrio, como o certificado do MIV | `{"theme":"navy","cover":"certificate","backCover":"certificate","header":"band","footer":"bar","pageNumber":"text","sectionStyle":"kicker","cardStyle":"outline","chapterStyle":"folder","headingWeight":"regular"}` |
| `totem` | Campanha (totem) | Degradê verde em arco e raios coloridos | `{"theme":"sky","cover":"totem","backCover":"concept","header":"classic","footer":"half","pageNumber":"circle","sectionStyle":"band","cardStyle":"soft","chapterStyle":"solid","headingWeight":"strong"}` |

## Modelos de documento (`docstudio new --template`)

| id | nome | tipo | blocos | descrição |
| --- | --- | --- | --- | --- |
| `manual` | Manual operacional | Manuais e guias | 24 | Manual completo com sumário, cronograma, passo a passo, tabelas e dúvidas comuns. É a estrutura dos manuais oficiais. |
| `guide` | Guia rápido | Manuais e guias | 9 | Poucas páginas, direto ao ponto: o que muda, como fazer e o que observar. Ideal para comunicar uma regra nova. |
| `pop` | Procedimento (POP) | Procedimentos e técnicos | 12 | Procedimento Operacional Padrão: objetivo, responsáveis, materiais, execução, riscos, registros e controle de versões. |
| `report` | Relatório de resultados | Gestão e projetos | 9 | Indicadores em destaque, linha do tempo, comparativos e conclusões. Visual sóbrio para a gestão. |
| `notice` | Comunicado | Comunicação oficial | 7 | Comunicado ou nota técnica em papel timbrado: título, contexto, orientação e assinatura. |
| `project` | Apresentação de projeto | Gestão e projetos | 8 | Contexto, objetivos, etapas, investimento e equipe, com capa de placa de obra do MIV. Ideal para projetos e obras. |
| `citizen` | Cartilha para o cidadão | Manuais e guias | 7 | Linguagem simples, passo a passo, documentos necessários e dúvidas comuns, com capa de totem do MIV. |
| `letter` | Ofício | Comunicação oficial | 8 | Ofício em papel timbrado do MIV: número, destinatário, assunto, texto e assinatura, em uma página. |
| `technical` | Nota técnica | Procedimentos e técnicos | 13 | Documento técnico de sistema: requisitos, configuração com comandos, procedimento, mensagens de erro e links de referência. |
| `blank` | Documento em branco | começar do zero | 0 | Capa, contracapa e páginas com a identidade visual, sem nenhum texto de exemplo. |
| `letterhead` | Papel timbrado | começar do zero | 0 | O papel timbrado do MIV: assinatura centralizada no alto, endereço e faixa no pé. Para ofício, memorando ou nota. |
| `plain` | Folha simples | começar do zero | 0 | Só as páginas, sem capa e sem contracapa: cabeçalho, faixa do MIV no pé e número da página. |
| `from-text` | Já tenho o texto | começar do zero | 0 | Cole o texto do Word ou do e-mail: títulos, listas e tabelas viram blocos formatados. |

## Textos fixos (`meta`)

Textos fixos sem formatação; \n quebra a linha onde o campo aceita várias linhas.

| campo | grupo | rótulo | várias linhas |
| --- | --- | --- | --- |
| `kicker` | Capa | Chamada (acima do título) | não |
| `title` | Capa | Título | sim |
| `subtitle` | Capa | Subtítulo | não |
| `description` | Capa | Linha de apoio | não |
| `audienceLabel` | Capa | Rótulo do público | não |
| `audience` | Capa | Público | sim |
| `version` | Capa | Versão e data | não |
| `headerTitle` | Cabeçalho das páginas | Título (em destaque) | não |
| `headerSubtitle` | Cabeçalho das páginas | Complemento (em cor) | não |
| `headerRight` | Cabeçalho das páginas | Texto à direita | não |
| `backTitle` | Contracapa | Nome do órgão | não |
| `backText` | Contracapa | Endereço e contatos | sim |
| `backWeb` | Contracapa | Site e redes sociais | não |

## Operações (arquivo `.ops.json`)

Posições: "start", "end", { "index": n }, { "before": "id" }, { "after": "id" }.

| op | o que faz | campos |
| --- | --- | --- |
| `insert` | Insere blocos novos. | `blocks`: lista de blocos ({ type, ...campos }; "id" opcional e único); `at`: posição (opcional, padrão "end") |
| `update` | Altera campos de um bloco; caminhos com ponto valem para itens e células ("items.2.title", "rows.0.1"). | `id`: id do bloco; `set`: objeto { campo ou caminho: valor }; `expect`: guarda opcional |
| `replace` | Troca um bloco inteiro (pode mudar o tipo), mantendo o id. | `id`: id do bloco; `block`: bloco novo ({ type, ...campos }); `expect`: guarda opcional |
| `remove` | Exclui blocos. | `id`: id do bloco (ou "ids": lista); `expect`: guarda opcional |
| `move` | Move blocos (mantendo a ordem entre eles) para outra posição. | `id`: id do bloco (ou "ids": lista); `to`: posição |
| `reorder` | Reorganiza o documento inteiro: "ids" com todos os ids na nova ordem. | `ids`: todos os ids do documento, cada um uma vez |
| `duplicate` | Duplica um bloco logo abaixo dele. | `id`: id do bloco; `newId`: id da cópia (opcional) |
| `transform` | Transforma um bloco de texto em outro tipo de texto mantendo o conteúdo (paragraph, heading, section, list, quote, callout, message). | `id`: id do bloco; `to`: tipo de destino |
| `setDesign` | Muda opções de aparência registradas (capa, rodapé, tema...). | `set`: objeto { opção: valor } |
| `applyPreset` | Aplica um estilo pronto (só a aparência). | `preset`: id do estilo pronto |
| `setMeta` | Muda textos fixos (capa, cabeçalho, contracapa). | `set`: objeto { campo: texto } |
| `rename` | Renomeia o documento. | `name`: novo nome |

## Combinações prontas (snippets)

| id | nome | blocos |
| --- | --- | --- |
| `section-steps` | Seção com passo a passo | section, steps |
| `who` | Quem participa | heading, cards |
| `numbers` | Resumo em números | stats |
| `faq` | Dúvidas comuns | section, faq |
| `rules` | Normas de referência | heading, table, callout |
| `before-after` | Como era × como fica | heading, cards |
| `rollout` | Cronograma de implantação | heading, timeline |
| `alert` | Aviso com mensagem da tela | callout, message |

## Página e imagens

A4 com margens laterais de 20 mm (padrão): área útil 170 × 252 mm em retrato e 257 × 165 mm em paisagem. A opção `margins` muda só a largura: `narrow` (15 mm, 180 mm úteis em retrato) para tabelas largas e `wide` (25 mm, 160 mm). Imagens: png, jpeg, webp, gif, svg; resolução mínima 150 ppi no tamanho impresso (ideal 300).

