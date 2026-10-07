# Estúdio de Documentos (`doc-studio`)

Editor visual de manuais, guias, procedimentos, relatórios e comunicados na **identidade visual do Governo do Ceará (MIV 2023–2026)**, com pré-visualização das páginas A4 em tempo real e exportação para PDF.

## 1. Descrição e objetivo

Os manuais feitos para a Diretoria de Veículos (Manual do Despachante · G003 e Manual da Coleta Externa) seguiram à risca o Manual de Identidade Visual: capas com o grafismo em faixas, Kanit nos títulos, Maitree no texto, rodapé do papel timbrado, número da página no círculo verde. Eles foram gerados por código, um a um.

O Estúdio transforma esse padrão em uma ferramenta: você escreve o conteúdo em blocos (ou cola um texto pronto), escolhe capa, contracapa, cores e estilos, e vê ao lado exatamente como cada página vai sair — e pode editar o texto direto na página. Nada de ajustar margens, estilos e quebras de página no Word, nem de decorar marcações.

> **Agentes de IA (Claude Code, Codex e outros):** comecem por [`docs/ai/AI_GUIDE.md`](docs/ai/AI_GUIDE.md). O contrato está em [`docs/ai/DOCUMENT_FORMAT.md`](docs/ai/DOCUMENT_FORMAT.md), [`docs/ai/COMPONENT_CATALOG.md`](docs/ai/COMPONENT_CATALOG.md) e [`docs/ai/BRAND_RULES.md`](docs/ai/BRAND_RULES.md); o prompt pronto, em [`docs/ai/AGENT_PROMPT.md`](docs/ai/AGENT_PROMPT.md).

> **Como se chama esse tipo de sistema?** É um **editor por blocos com pré-visualização ao vivo** (*block editor* + *live preview*). "Por blocos" é o modelo do Notion e do Gutenberg do WordPress: cada parte do documento é um bloco que você insere, arrasta e configura. "Pré-visualização ao vivo" é o painel que redesenha o resultado enquanto você digita — o mesmo princípio dos editores **WYSIWYG** (*What You See Is What You Get*, "o que você vê é o que você recebe").

## 2. Funcionalidades

**Escrita**
- 21 tipos de bloco: seção numerada, subtítulo, parágrafo (à esquerda, justificado ou centralizado), lista (marcadores, números ou checklist), citação, **código ou texto de tela** (comandos e configurações em fonte de máquina, com numeração opcional), passo a passo, cartões, fluxo com setas, linha do tempo, sumário automático com página (em linhas ou pontilhado como o do MIV, p. 4), destaque (informação, sucesso, atenção, alerta, dica), mensagem do sistema, pergunta e resposta, etiquetas, tabela, indicadores (números grandes ou fichas), glossário, imagem com figura numerada, divisor e quebra de página (em retrato ou **paisagem**).
- **Texto visual, sem marcação**: o negrito aparece em negrito, o link sublinhado. Selecione o texto e use a barra (fixa nos textos longos, flutuante sobre a seleção nos de uma linha), o botão direito ou Ctrl+B / I / U / K: negrito, itálico, sublinhado, riscado, destaque, texto de tela e **link** (clicável no PDF). Colar do Word ou do navegador mantém negrito, itálico, sublinhado, riscado e links; o resto vira texto limpo.
- **Edição direto na página**: clique duas vezes num texto da prévia (capa, contracapa, cabeçalho, títulos, passos, células de tabela, legendas…) e digite ali mesmo; a página se atualiza por baixo. No celular, basta um toque.
- **Escrever com texto livre** (recurso avançado): cole ou digite texto (Markdown simples ou texto do Word) e ele vira blocos — `#` vira seção, `1.` vira passo a passo, `> [!ATENÇÃO]` vira destaque, tabelas `| a | b |` viram tabela, "Pergunta?" + "R: resposta" vira pergunta e resposta, um trecho entre ``` vira bloco de código.
- **Parágrafos longos continuam na página seguinte**, linha a linha, como no Word: o que couber fica na página e o resto segue na próxima, sempre com pelo menos duas linhas de cada lado (controle de linhas viúvas e órfãs). Nada de buraco no pé da página nem parágrafo cortado.
- Sem seleção, a formatação vale para a palavra sob o cursor; com o cursor fora de uma palavra, ela vale para o que você digitar em seguida (Ctrl+B, digita, Ctrl+B de novo e continua sem negrito, como no Word — também com acentos por tecla morta). Por baixo, o documento guarda uma marcação simples (`**negrito**`, `++sublinhado++`, `[link](https://…)`…) que só aparece no "Escrever texto".
- Comando **`/`** num parágrafo vazio e **Ctrl+K** abrem o seletor de blocos com busca.
- 8 **combinações prontas** (ex.: "Seção com passo a passo", "Dúvidas comuns", "Como era × como fica").
- Tabelas aceitam **colar células do Excel/Word** de uma vez.
- Imagens: **cole um print (Ctrl+V)**, arraste arquivos para o editor ou para a página, ou escolha o arquivo (PNG, JPG, WEBP, GIF ou **SVG vetorial**). Com legenda, vira "Figura N". Largura, **alinhamento** (esquerda, centro, direita), **formato** (original, 16:9, 4:3, quadrado, retrato), **preencher ou encaixar** e a parte que aparece ao cortar (topo, centro, base). Fotos são mantidas até 3508 px (A4 a 300 dpi).
- Cores dos blocos escolhidas numa **paleta de amostras** (com o nome da cor), não numa lista.

**Organização**
- **Arrastar e soltar** blocos no editor, no painel Estrutura e **direto na página da prévia** (onde soltar, entra). Também por teclado (setas na alça) e por menu.
- **Seleção de vários blocos**: Ctrl + clique e Shift + clique no editor, na Estrutura ou na prévia; Ctrl+A na lista seleciona todos. Uma barra mostra duplicar, copiar, recortar, mover e excluir; Delete exclui (com "Desfazer"), Esc desfaz a seleção.
- **Copiar, recortar e colar blocos** (Ctrl+C / X / V fora de um texto, ou botão direito): leva os blocos com as imagens, inclusive para outro documento ou aba. Texto comum colado fora de um campo vira blocos.
- **Páginas em paisagem**: numa quebra de página, "Páginas seguintes: Paisagem" deixa as folhas seguintes deitadas (tabelas largas, fluxos, prints); outra quebra volta ao retrato. Capa, contracapa e aberturas continuam em retrato.
- Painel Estrutura com estatísticas (páginas, blocos, palavras).
- Clicar num trecho da prévia leva ao bloco no editor (duplo clique já posiciona o cursor).
- Desfazer/refazer ilimitado (até 150 passos), duplicar, recolher/expandir blocos.

**Menu do botão direito (menu de contexto)**
- Clique com o botão direito (ou tecla Menu / Shift+F10) e aparecem as ações **daquilo que está sob o cursor**, em vez do menu do navegador:
  - **texto selecionado**: negrito, itálico, sublinhado, riscado, destaque e texto de tela (com o estado atual marcado), inserir/editar/abrir/remover link, remover formatação, recortar, copiar, colar e selecionar tudo — a formatação só aparece nos campos em que ela sai no documento;
  - **"Escrever texto"**: "Transformar a linha em" seção (`#`), subtítulo (`##`), lista (`-`), passo a passo (`1.`), destaque (`>`), atenção, dica, alerta ou sucesso, e "Inserir" tabela, pergunta e resposta, divisor ou quebra de página — sem decorar a marcação;
  - **bloco** (no editor, na prévia ou na Estrutura): editar ou mostrar na prévia, opções do bloco (cor, tipo, estilo, alinhamento, formato da imagem, interruptores), **transformar em** outro tipo de texto sem perder o conteúdo (parágrafo → destaque, lista, citação…), inserir acima/abaixo, mover, duplicar, copiar, recortar e colar o bloco, copiar só o texto (tabelas saem prontas para colar no Excel), recolher e excluir (com "Desfazer");
  - **célula de tabela**: inserir linha acima/abaixo, coluna à esquerda/direita, excluir linha ou coluna;
  - **item** (passo, cartão, pergunta…): inserir abaixo, mover, remover;
  - **capa, contracapa, cabeçalho e rodapé na prévia**: editar os textos e trocar estilo, assinatura, tema de cores e numeração ali mesmo;
  - **texto da página**: "Editar este texto aqui" (o mesmo do duplo clique);
  - **página da prévia**: nova página, páginas em paisagem depois desta, inserir bloco no fim, selecionar, duplicar ou excluir o conteúdo da página, cabeçalho, rodapé e numeração;
  - **vários blocos selecionados**: duplicar, copiar, recortar, mover e excluir o grupo;
  - **paleta Inserir**: inserir no início, no fim ou acima/abaixo do bloco selecionado; **Meus documentos**: abrir, renomear, duplicar, baixar cópia e excluir (com confirmação); **fundo da prévia**: zoom e PDF.
- Onde o app não tem ação útil (botões, nome do documento, painel Textos), o menu do navegador continua. **Shift + botão direito** sempre abre o menu do navegador (corretor ortográfico, por exemplo).
- No celular, segurar o dedo sobre um bloco ou sobre a capa abre o menu como folha inferior; nos campos de texto fica o menu do próprio sistema (copiar/colar).

**Começar**
- **Começar do zero**: Documento em branco (capa, contracapa e páginas, sem texto de exemplo), Papel timbrado (o do MIV, sem capa), Folha simples (sem capa nem contracapa) ou "Já tenho o texto" (cola o texto e ele vira o documento).
- 9 **modelos prontos** com textos de exemplo, organizados **por finalidade** (filtro no topo da galeria: Manuais e guias, Procedimentos e técnicos, Gestão e projetos, Comunicação oficial): Manual operacional, Guia rápido, Procedimento (POP), Relatório de resultados, Comunicado, Apresentação de projeto (capa de placa de obra), Cartilha para o cidadão (capa de totem), Ofício (papel timbrado) e **Nota técnica** (requisitos, comandos, mensagens de erro e links).
- **"Ver páginas"** em cada modelo mostra todas as páginas em tamanho legível antes de escolher.
- Na primeira visita, fechar a galeria deixa um documento em branco; escolher um modelo descarta esse documento se ele não foi editado.

**Design (tudo do MIV)**
- 14 **estilos prontos**, com miniatura da capa, que trocam só a aparência: Manual institucional, Guia rápido, Relatório executivo, Campanha, Papel timbrado, Identidade do MIV, Apresentação, Evento, Sol do sertão, Evento (palco), Obras e projetos, Com foto, Clássico e Campanha (totem).
- 14 **capas**, cada uma baseada numa peça do MIV: Pasta (a dos manuais aprovados), Pasta oficial (assinatura vertical centralizada), Arcos (capa do próprio MIV), Painel verde (slide de abertura), Convite, Envelope (verso), Leque (elemento base), Verde pleno (contracapa do MIV), Minimalista, **Foto** (sua foto recortada pelas faixas, como o slide da p. 56), **Totem** (p. 115), **Placa** (placa de obra, p. 76, com o conceito do Governo), **Palco** (fundo de palco, p. 104) e **Certificado** (p. 52) — ou sem capa.
- 10 **contracapas**: Pasta (verso), Conceito (assinatura em negativo + slogan, como a contracapa do MIV), Verde pleno, Leque, Minimalista, **Vinheta** (assinatura e conceito em cores, p. 62), **Arcos**, **Palco**, **Certificado** e **Backdrop** (quadros verdes e brancos com as assinaturas alternadas, como o backdrop de eventos da p. 116: com o DETRAN/CE, a versão "vinculadas e autarquias"; só com o Governo, a "institucional") — ou sem contracapa. Todas mostram site e redes sociais, como a p. 117.
- **Cabeçalhos**: texto, texto e linha, texto e assinatura (30 mm, mínimo do MIV), **timbrado** (assinatura centralizada no alto da primeira folha, como o papel timbrado do MIV: vertical, com a secretaria embaixo quando houver, p. 34–35; com órgão parceiro, o par horizontal da p. 36), **faixa no topo** (certificado, p. 52) ou nenhum.
- **Rodapés**: faixa do papel timbrado, faixa com endereço (papel timbrado completo), **meia faixa** (o rodapé das páginas do próprio MIV, espelhado nas páginas pares), linha fina, **camadas** (fundo de palco e vinheta) ou nenhum.
- **Assinaturas** na ordem do MIV (órgão à esquerda, Governo à direita, sem fio separador, afastados pela largura do escudo): DETRAN/CE + Governo (Infraestrutura), Governo + Secretaria da Infraestrutura, somente Governo do Ceará, **Governo + conceito** "Cuidar das pessoas, avançar o Ceará." (p. 9), logo próprio + Governo, ou nenhuma. Na capa "Pasta oficial" a assinatura vira **vertical** — com órgão parceiro, a conjunta vertical lado a lado da p. 17.
- **Página de abertura de capítulo** opcional por seção, em quatro estilos: faixas da pasta, **verde pleno** (degradê e texto em branco, como as p. 2–3 do MIV), palco e arcos.
- **Impressão em escala de cinza** (MIV p. 12), para impressora preto e branco: assinaturas com a tabela de correspondência de cores do MIV, faixas, capas e textos em cinza, e o PDF continua vetorial.
- 8 **temas de cor** da paleta do grafismo e das cores da assinatura do MIV (o Azul é o azul do mar, Pantone 7709 C), 3 estilos de título de seção, 3 estilos de cartão, 3 numerações, **peso dos títulos** (padrão dos manuais aprovados ou Kanit ExtraBold/Black como o MIV), 2 fontes de texto, 3 espaçamentos e **3 margens laterais** (estreita 15 mm, padrão 20 mm, larga 25 mm; também pelo botão direito na página) — em "Mais ajustes", para não sobrecarregar o painel. O MIV fixa o formato A4, não a margem do texto; capas e faixas não mudam.
- **Assinaturas em vetor (SVG) extraídas do próprio MIV**: nítidas em qualquer tamanho; o PDF não tem nenhuma imagem rasterizada (exceto fotos e prints do usuário).
- Divisor com o **grafismo** do MIV.
- Painel Design pensado para leigos: **atalhos no topo** (Estilos, Capa, Cabeçalho, Rodapé, Contracapa, Assinatura, Cores) e **miniaturas** para capa, cabeçalho, rodapé, contracapa e assinatura, todas com os textos, cores e marcas do próprio documento.

**Criar com IA (AI-native)**
- Três formas de criar chegam ao **mesmo documento**: no editor, por um modelo ou pedindo a um agente de IA. O agente não escreve HTML: produz um arquivo no formato oficial (blocos, intenções semânticas como `"warning"` ou `"procedure"`, opções de design registradas), que passa pela mesma validação, pela mesma paginação e pelo mesmo PDF.
- **`tools/docstudio.mjs`** (linha de comando, sem dependências): `catalog`, `new`, `build` (imagens por caminho viram dados, sem perda de qualidade), `validate`, `inspect`, `apply` (alterações pontuais por id), `render` (PDF, PNG de cada página e relatório de paginação no próprio app, via Chrome sem interface), `serve`, `generate` e `check`.
- **Verificar documento** (menu ⋯): erros, avisos e sugestões em português — estrutura, identidade visual do MIV (assinatura, cores, contraste, fontes, resolução das imagens), textos de exemplo, seções vazias, páginas densas ou quase vazias, blocos cortados — com botão "Ver" que leva ao bloco. O diálogo do PDF usa a mesma verificação.
- **Aplicar alterações de IA** (menu ⋯): cole ou abra o `.ops.json` do agente, revise o que entra, sai, muda e muda de lugar (com nomes legíveis) e aplique; o lote inteiro é **um passo de desfazer**. Cor por código, logo inválido, componente inexistente, CSS ou link `javascript:` são recusados com a explicação.
- **Copiar para IA (JSON)** no botão direito de um bloco ou de uma seleção: leva os blocos com ids e o formato de resposta esperado para colar no agente.
- Regras da marca, catálogo e esquemas JSON **gerados das mesmas definições do editor** (`schemas/`, `docs/ai/`), então a documentação dos agentes não fica desatualizada.

**Arquivos**
- Salvamento automático no navegador (IndexedDB), lista "Meus documentos" (abrir, duplicar, excluir).
- **Salvar/abrir arquivo `.json`** para levar o documento a outro computador ou guardar versão.
- **Exportar PDF** pela impressão do navegador: A4, sem margens, fontes embutidas, texto selecionável. A prévia e o PDF são idênticos.

**Interface**
- Celular: uma área por vez com navegação inferior (Editar, Inserir, Design, Prévia).
- Tablet: editor e prévia lado a lado, painel lateral como gaveta.
- Desktop: painel fixo + editor + prévia; modos "só editor", "lado a lado" e "só prévia" (Ctrl+1/2/3).
- Tema do app **claro por padrão**; escuro ou automático (segue o sistema) no menu ⋯. O documento é sempre papel branco.
- **Nenhum controle com a aparência padrão do navegador**: barras de rolagem, paleta de cores, contador numérico com − e +, controle deslizante, interruptores, campo de busca e dicas de ferramenta (pelo mouse e pelo teclado) são componentes próprios do projeto.
- Efeitos visuais discretos: tela de abertura com a marca, menus e diálogos que entram com suavidade, cartão novo deslizando para o lugar, páginas que entram em sequência, transição ao trocar o modo de visualização. Tudo desligado com "reduzir movimento" no sistema.
- **Gerar o PDF** abre um passo a passo e avisa antes de imprimir se há bloco cortado, texto marcado como "(exemplo)", capa com o título padrão ou documento vazio.
- Status de salvamento sempre visível (no celular, um ponto colorido); se o salvamento falhar, aparece o botão "Baixar cópia".
- Botão de **Ajuda** com primeiros passos; avisos com "Desfazer" ficam 10 s na tela.

## 3. Estrutura de arquivos

```
doc-studio/
├── index.html             Estrutura da interface, ícones (sprite SVG), diálogos e a política de segurança (CSP)
├── style.css              Tokens de design, reset, casca responsiva do app
├── script.js              Ponto de entrada: cria estado e módulos, define as ações
├── README.md
├── css/
│   ├── components.css     Botões, campos, cartões de bloco, painéis, diálogos, avisos
│   ├── document.css       A página A4 na identidade visual (blocos, capas, temas)
│   └── print.css          Impressão/PDF: só as páginas, sem margens, sem zoom
├── js/
│   ├── boot.js            Script clássico do <head>: tema antes da primeira pintura e aviso de file://
│   ├── state.js           Estado do documento (com desfazer/refazer) e da interface
│   ├── schema.js          Catálogo dos tipos de bloco: campos, padrões, validação
│   ├── design.js          Temas, capas, opções de design, estilos prontos, textos fixos
│   ├── model.js           Criação/validação do documento e formato do arquivo .json
│   ├── templates.js       Modelos de documento e combinações prontas
│   ├── markup.js          Formatação inline segura (**negrito** etc.)
│   ├── markdown.js        Texto livre → blocos
│   ├── graphics.js        Grafismo do MIV em SVG (capas, rodapé, leque)
│   ├── render.js          Blocos → HTML das páginas (capa, conteúdo, capítulo, contracapa)
│   ├── paginate.js        Medição e quebra em páginas A4
│   ├── preview.js         Prévia, zoom, sincronia com o editor e impressão
│   ├── editor.js          Cartões de bloco, edição, itens, tabela, teclado
│   ├── fields.js          Geração dos campos de formulário a partir do catálogo
│   ├── richtext.js        Campo de texto visual (WYSIWYG) ⇄ marcação segura; colar do Word
│   ├── formatbar.js       Barra de formatação flutuante sobre a seleção
│   ├── quickedit.js       Edição direta na página da prévia (campo flutuante)
│   ├── selection.js       Seleção de vários blocos, copiar/recortar/colar blocos
│   ├── panels.js          Painel lateral: Inserir, Estrutura, Design, Textos
│   ├── picker.js          Seletor de bloco (botão +, Ctrl+K, comando /)
│   ├── dnd.js             Arrastar e soltar com Pointer Events (mouse e toque)
│   ├── dialogs.js         Diálogos nativos, menus (Popover API) e avisos
│   ├── contextmenu.js     Menu do botão direito: provedores por elemento, teclado, submenus, folha inferior
│   ├── textmenu.js        Ações de texto do menu: formatação, área de transferência, marcações de linha
│   ├── controls.js        Comportamento dos controles próprios (−/+, deslizante, paleta, busca)
│   ├── tooltip.js         Dica de ferramenta própria (substitui o title nativo)
│   ├── images.js          Imagens: validação, redução e registro
│   ├── storage.js         IndexedDB (documentos) e preferências (localStorage)
│   ├── brand.js           Regras do MIV legíveis por máquina (paleta, assinaturas, logos, regras)
│   ├── validate.js        Validação, verificação da marca e recomendações (app e linha de comando)
│   ├── operations.js      Operações por id (inserir, alterar, mover…), lote atômico, diferenças
│   ├── catalog.js         Guia de uso de cada bloco e catálogo completo para agentes
│   └── utils.js           Utilitários pequenos e puros
├── tools/
│   ├── docstudio.mjs      Linha de comando para agentes e automação (Node 22.4+, sem dependências)
│   └── lib/               Arquivos e imagens, Chrome via CDP, geração de esquemas e catálogos
├── tests/                 Testes automáticos (node --test): contrato sem navegador e o app no Chrome sem interface
├── schemas/               JSON Schema do documento e das operações, catálogo e marca (gerados)
├── docs/ai/               Guia, formato, catálogo (gerado), regras da marca (gerado), prompt e exemplos
├── examples/              Documentos escritos como um agente faria (.source.json) e montados (.docstudio.json)
└── assets/
    ├── favicon.svg
    ├── fonts/             Kanit (Light a Black) e Maitree (WOFF, subconjunto latino) + LICENSE.md
    └── img/               Assinaturas em SVG vetorial: Governo com Secretaria da
                           Infraestrutura (ceara), Governo sem secretaria (ceara-state),
                           vertical sem e com secretaria (ceara-vertical,
                           ceara-vertical-secretaria) e DETRAN/CE; -negative para
                           fundos coloridos; -gray para a escala de cinza (MIV p. 12)
```

**Por que vários arquivos?** O escopo é o de uma aplicação (editor, paginação, design, armazenamento, arrastar e soltar). Um único `script.js` passaria de 4 mil linhas. Cada módulo ES tem uma responsabilidade; o `script.js` é a "raiz de composição": cria as peças e as conecta. O CSS segue a mesma lógica: base do app, componentes, documento A4 e impressão.

## 4. Tecnologias utilizadas

HTML5, CSS3 e JavaScript (ES2023) puros, sem bibliotecas, frameworks ou etapa de build. A ferramenta de linha de comando usa só o Node (módulos `http`, `fs`, `child_process` e o `WebSocket` nativo) e o Chrome/Chromium já instalado, pelo Chrome DevTools Protocol (`Page.printToPDF`, `Page.captureScreenshot`). Recursos nativos usados: módulos ES, `<dialog>`, Popover API (menus, menu de contexto, edição na página, barra flutuante), `contenteditable` com eventos `beforeinput` (Input Events), `DOMParser` (limpeza do que é colado), eventos `copy`/`cut`/`paste` e Clipboard API, páginas nomeadas do CSS (`@page landscape`), Pointer Events, IndexedDB, `structuredClone`, `ResizeObserver`, `IntersectionObserver`, View Transitions (quando há suporte), CSS Grid/Flexbox, Container Queries, `color-mix()`, `:has()`, `zoom`, `scrollbar-gutter`, `::-webkit-scrollbar`/`scrollbar-color`, `field-sizing` (com alternativa em JS), `@page`, SVG (grafismo, assinaturas e capa com foto).

## 5. Como executar

Os módulos ES não carregam a partir de `file://` (bloqueio de segurança dos navegadores), então é preciso um servidor local simples. Na pasta do projeto:

```bash
python3 -m http.server 8080
```

Acesse `http://localhost:8080`. Se você abrir o `index.html` direto do disco, a página mostra um aviso com essa instrução.

Para publicar, basta copiar a pasta para qualquer servidor de arquivos estáticos (Apache, Nginx, IIS, GitHub Pages, Firebase Hosting). Não há back-end: os documentos ficam no navegador de cada usuário.

Navegadores recomendados: Chrome/Edge 120+, Firefox 126+ e Safari 17+.

**Linha de comando (agentes e automação).** Com Node 22.4+ (e Chrome ou Chromium para PDF/PNG):

```bash
node tools/docstudio.mjs help                       # todos os comandos
node tools/docstudio.mjs serve                      # o app em http://127.0.0.1:8080, sem cache
node tools/docstudio.mjs render examples/manual-coleta-externa.docstudio.json --pdf manual.pdf --png paginas/
node tools/docstudio.mjs check                      # consistência do projeto (rode antes de cada commit)
node --test                                         # testes automáticos (sem Chrome, os do app são pulados)
```

## 6. Como usar

1. Na primeira abertura, escolha como começar: **em branco**, **papel timbrado**, **colando um texto** ou por um **modelo pronto** (fechar a galeria = documento em branco).
2. Troque os textos da capa clicando duas vezes neles, na prévia (ou em **Textos**, no painel lateral).
3. No editor, edite os blocos — ou clique duas vezes em qualquer texto da prévia. Para formatar, selecione e use a barra. Para adicionar: painel **Inserir** (clique ou arraste), botão **+** entre blocos, **Ctrl+K**, ou `/` num parágrafo vazio. Para escrever de uma vez: **Escrever texto**.
4. Em **Design**, troque capa, contracapa, cores e estilos — a prévia muda na hora. Na capa **Foto**, o app pede a imagem (depois, "Trocar foto da capa").
5. Clique em **Exportar PDF**: revise os avisos (se houver), clique em "Abrir janela de impressão" e escolha "Salvar como PDF".
6. Para levar o trabalho a outro computador: menu **⋯ → Baixar cópia de segurança** (arquivo `.docstudio.json`); no outro, **Abrir cópia de segurança**.

Botão direito em qualquer texto, bloco, célula, item, capa ou rodapé mostra as ações daquele objeto (Shift + botão direito: menu do navegador).

**Com um agente de IA:** peça ao Claude Code ou ao Codex, nesta pasta, algo como "Crie um manual com os arquivos de `entrada/` seguindo `docs/ai/AGENT_PROMPT.md`". Ele entrega um `.docstudio.json` (abra em ⋯ → Abrir cópia de segurança, ou pelo link de `node tools/docstudio.mjs serve arquivo`) e o PDF. Para ajustes, selecione blocos → botão direito → **Copiar para IA (JSON)**, cole no agente e traga a resposta em ⋯ → **Aplicar alterações de IA**. Antes do PDF, ⋯ → **Verificar documento**.

Atalhos: `Ctrl+Z`/`Ctrl+Shift+Z` desfazer/refazer · `Ctrl+K` inserir bloco (dentro de um texto: link) · `Alt+↑/↓` mover bloco(s) · `Ctrl+D` duplicar · `Ctrl+B`/`Ctrl+I`/`Ctrl+U` negrito/itálico/sublinhado · Ctrl/Shift + clique selecionar vários · `Ctrl+C`/`X`/`V` fora de um texto copiar/recortar/colar blocos · `Delete` excluir os selecionados · duplo clique na prévia editar ali · `Ctrl+1/2/3` modos de visualização · `Ctrl+S` salvar · `Ctrl+P` PDF · tecla `Menu` ou `Shift+F10` menu de contexto · `?` ajuda.

## 7. Validação e testes

### Roteiro manual

| # | Ação | Resultado esperado | Sinal de falha |
|---|------|--------------------|----------------|
| 1 | Abrir `http://localhost:8080` pela primeira vez (ou numa janela anônima) | Tema claro; galeria "Como você quer começar?" com "Começar do zero" no topo; ao fundo, documento em branco (capa, página timbrada vazia e contracapa) | Página em branco, tema escuro ou erro no console (F12) |
| 2 | Escolher "Guia rápido" sem ter editado nada | Novo documento de 4 páginas; "Meus documentos" mostra só o Guia rápido (o documento em branco intocado foi descartado) | Aparece um "Documento sem título" sobrando |
| 2a | Novo documento → "Já tenho o texto", colar um texto com `# Título` e `1. passo` | Abre "Escreva ou cole seu texto" já em "Substituir tudo"; ao inserir, vira seção e passo a passo | O texto vai para o fim de um documento de exemplo |
| 2b | Novo documento → "Papel timbrado" | Uma página com a assinatura centralizada no alto, endereço do órgão e faixa do MIV no pé | Capa aparece ou o endereço some |
| 3 | Digitar no título de uma seção | A prévia muda em ~0,1 s; o cursor não pula | Cursor perde a posição ou a prévia não atualiza |
| 4 | Num parágrafo vazio, digitar `/`, depois "tabela" e Enter | O parágrafo vira uma tabela | Seletor não abre |
| 5 | Copiar 3×3 células do Excel e colar na primeira célula da tabela | Tabela com 3 colunas e as linhas preenchidas | Tudo cai numa célula só |
| 6 | Arrastar "Destaque" do painel Inserir até o meio de uma página da prévia | Linha verde indica a posição; ao soltar, o bloco entra ali | Bloco vai para o fim ou nada acontece |
| 7 | Focar a alça ⋮⋮ de um bloco e apertar ↑ | O bloco sobe uma posição e o foco continua na alça | Foco se perde |
| 8 | Excluir um bloco e clicar "Desfazer" no aviso | O bloco volta no mesmo lugar | Bloco não volta |
| 9 | Colar um print (Ctrl+V) com um bloco selecionado | Bloco de imagem após o selecionado; com legenda vira "Figura N" | Nada acontece |
| 10 | Design → capa "Verde pleno" e contracapa "Conceito" | Fundo em degradê verde → água-marinha; textos, assinatura e slogan em branco | Logo colorido sobre o verde |
| 10a | Design → Assinatura "DETRAN/CE + Governo" | DETRAN à esquerda, Governo à direita, sem fio entre eles | Ordem invertida ou fio separador |
| 10b | Design → Rodapé "Meia faixa" | Faixa à direita nas páginas ímpares e à esquerda nas pares, número no lado de fora | Faixa sempre do mesmo lado |
| 10c | Design → Assinatura "Governo + conceito"; contracapa "Conceito" | Ao lado da marca, linha e o conceito em **quatro linhas** (CUIDAR / DAS PESSOAS, / AVANÇAR / O CEARÁ.), do topo de "CEARÁ" à base de "GOVERNO DO ESTADO"; verde no papel branco, branco no verde | Conceito em duas ou três linhas quebradas no meio |
| 10d | Capa "Pasta oficial" com "DETRAN/CE + Governo"; depois "Governo + Secretaria" | DETRAN à esquerda da assinatura vertical, do topo do escudo (sem a coroa) à base do nome; com secretaria, o nome dela centralizado embaixo | Par horizontal pequeno ou secretaria alinhada à esquerda |
| 10e | Numa seção, ligar "Página inteira de abertura"; Design → Mais ajustes → Abertura "Verde pleno" | Página inteira em degradê verde → água-marinha com número, título e introdução em branco | Página branca ou texto ilegível |
| 10f | Bloco Sumário → Estilo "Pontilhado (MIV)" | Número, título, pontos até o número da página | Pontos sobre o texto ou página errada |
| 10g | Design → atalho "Rodapé" (no celular, deslize a fila de atalhos) | O painel rola até as miniaturas de rodapé, que mostram o pé de uma página | Atalho não rola ou miniatura mostra o topo da página |
| 11 | Criar uma tabela com 80 linhas | A tabela continua nas páginas seguintes repetindo o cabeçalho | Linhas cortadas no pé da página |
| 12 | Colar um parágrafo enorme (sem linhas em branco) | O parágrafo continua na página seguinte, linha a linha, sem aviso; nenhuma página termina ou começa com uma linha só do parágrafo | Parágrafo inteiro pula de página (buraco no pé), texto cortado ou palavra repetida/perdida na divisão |
| 12a | Criar uma tabela cuja célula tenha um texto maior que uma página | Aviso laranja no bloco ("maior que a área da página") e contorno vermelho na página | Texto cortado sem aviso |
| 13 | Exportar PDF | Caixa "Gerar o PDF" com os passos (e avisos, se houver); "Abrir janela de impressão" → Salvar como PDF: mesmo número de páginas da prévia, A4, sem margens brancas, cores do fundo presentes | Páginas extras em branco, margens, ou a caixa aparece no PDF |
| 13a | Num modelo pronto, Exportar PDF | Aviso "O documento ainda tem textos marcados como “(exemplo)”" com botão "Ver" | Nenhum aviso |
| 14 | Recarregar a página (F5) | O mesmo documento reabre, com as imagens | Documento volta ao modelo |
| 15 | Salvar `.json`, abrir em outra aba com "Abrir arquivo" | Abre como novo documento idêntico | Mensagem de arquivo inválido |
| 16 | Redimensionar a janela até 320 px de largura | Navegação inferior; nenhuma barra de rolagem horizontal na página | Conteúdo cortado ou rolagem lateral |
| 17 | Navegar só com Tab/Shift+Tab/Enter/Esc/setas | Todos os controles alcançáveis, foco visível, menus fecham com Esc; ao focar um botão de ícone, aparece a dica própria | Foco preso ou invisível |
| 18 | Design → capa **Foto** e escolher uma imagem | A foto aparece no alto da capa, recortada pela diagonal, com as faixas verde, água-marinha e laranja por cima | Foto distorcida ou fora do recorte |
| 19 | Design → capas Totem, Placa, Palco e Certificado; contracapa Vinheta | Cada uma igual à peça citada do MIV (p. 115, 76, 104, 52 e 62); na Placa, o conceito em quatro linhas na área branca | Texto sobre faixa ilegível ou cortado |
| 20 | Num bloco Passo a passo, clicar numa cor da paleta e no + de "Começar a numeração em" | O nome da cor aparece na legenda; o número sobe e a prévia muda | Lista suspensa ou setas nativas |
| 21 | Passar o mouse sobre Desfazer e rolar painéis | Dica escura própria (sem a amarela do sistema); barras de rolagem finas e arredondadas | Dica ou barra com a aparência do navegador |
| 22 | Documento de uma página (modelo Ofício) com "Ajustar à largura" | O zoom fica parado | O zoom fica oscilando e a prévia "treme" |
| 23 | Exportar o PDF de um manual com abertura de capítulo | Mesmo número de páginas da prévia, sem conteúdo invadindo o rodapé | Uma página a menos e texto sobre a faixa |
| 24 | Design → Contracapa "Backdrop" com "DETRAN/CE + Governo"; depois "Governo do Ceará" | Quadros verdes com o Governo em negativo alternados com quadros brancos com o DETRAN/CE (depois, com o Governo em cores), como a p. 116; endereço centralizado abaixo | Assinatura cortada ou quadros desalinhados |
| 25 | Design → Impressão "Escala de cinza (P&B)" e exportar o PDF | Capa, faixas, assinaturas (brasão em tons de cinza, nome em preto, como a p. 12) e textos em cinza; `pdfimages -list` sem imagens (exceto fotos) e texto selecionável | Algo colorido sobrando ou o PDF virou imagem |
| 26 | Selecionar uma palavra num parágrafo, botão direito → **B** | Menu próprio (não o do navegador) com a fila de formatação; a palavra fica em negrito no próprio campo (sem asteriscos) e na prévia; reabrindo o menu, o **B** aparece marcado | Menu do navegador ou asteriscos na prévia |
| 27 | Botão direito no título de um bloco de Destaque → Tipo → Atenção; depois Transformar em → Parágrafo; clicar "Desfazer" no aviso | O destaque fica laranja; vira parágrafo com o mesmo texto; "Desfazer" devolve o destaque | Texto perdido ou o editor não atualiza |
| 28 | Botão direito numa célula de tabela → Linha 1 → Inserir linha abaixo; Coluna 2 → Inserir coluna à esquerda | Linha vazia logo abaixo, com o cursor nela; coluna nova no lugar certo; Ctrl+Z desfaz | Linha no fim da tabela |
| 29 | "Escrever texto": selecionar duas linhas, botão direito → Transformar as linhas em → Passo a passo | As linhas ganham `1.` e `2.`; Ctrl+Z dentro do campo desfaz; ao inserir, vira um passo a passo | Menu atrás do diálogo ou sem efeito |
| 30 | Botão direito na capa da prévia → Estilo da capa → Arcos | A capa troca na hora; o menu mostra o estilo atual marcado | Painel Design abre em vez de trocar |
| 31 | Botão direito num botão da barra superior; Shift + botão direito num bloco; tecla Menu com a alça ⋮⋮ focada | Menu do navegador nos dois primeiros; menu do bloco no terceiro, com o primeiro item focado; setas, Enter e Esc funcionam e Esc devolve o foco à alça | Menu do app bloqueando o do navegador ou foco perdido |
| 32 | Janela com 390 px: botão direito (ou toque longo) num bloco → Tipo | Folha inferior com fundo escurecido; "Tipo" abre dentro dela com "Voltar"; tocar fora fecha | Menu cortado fora da tela |
| 33 | Meus documentos → botão direito num documento → Excluir… | Aparece a mesma confirmação do botão de lixeira; "Cancelar" mantém o documento | Exclusão sem confirmação |
| 34 | Num parágrafo, selecionar uma palavra e clicar **B**, depois **U** e o link (endereço `www.detran.ce.gov.br`) | A palavra aparece em negrito e sublinhada no próprio campo, sem asteriscos; a prévia mostra o link; o botão B fica marcado | Asteriscos visíveis ou cursor pulando |
| 34a | No link, digitar `javascript:alert(1)` e Aplicar | Mensagem "Use um endereço que comece com https://…" e o diálogo continua aberto | Link aceito |
| 34b | Copiar um trecho do Word (com negrito e imagem) e colar num parágrafo | Negrito mantido, imagem e estilos descartados | Imagem ou cores coladas no campo |
| 35 | Clicar duas vezes no título da capa, na prévia, digitar e apertar Esc | Campo flutuante sobre o título; a capa muda enquanto digita; Esc fecha; Textos mostra o novo título | Nada abre ou o cursor some ao digitar |
| 35a | Janela de 390 px → Prévia → tocar num título de passo | O campo abre na própria prévia (sem trocar para Editar) | Vai para o editor |
| 36 | Ctrl + clique em dois blocos; Ctrl+C; selecionar o último bloco; Ctrl+V | Barra "2 blocos selecionados"; os dois blocos colados no fim, selecionados, com "Desfazer" | Nada colado ou um bloco só |
| 36a | Com os blocos colados selecionados, apertar Delete e depois Ctrl+Z | Os dois somem com aviso "2 blocos excluídos. Desfazer"; Ctrl+Z os traz de volta | Bloco errado excluído |
| 37 | Inserir Quebra de página → "Paisagem (deitada)", uma tabela de 9 colunas e outra quebra em "Retrato" | As páginas da tabela ficam deitadas, com o cabeçalho repetido; o PDF tem essas folhas em paisagem e as demais em pé | Tabela cortada ou PDF todo em pé |
| 38 | Imagem → Formato "Quadrado" e "Topo" | A imagem vira quadrada, mostrando a parte de cima | Imagem distorcida |
| 39 | Inserir "Código ou texto de tela" com 3 linhas e "Numerar as linhas" | Caixa cinza com fonte de máquina, linhas numeradas e espaços preservados | Linhas juntas ou numeração ausente |
| 40 | Modelos → "Ver páginas" na Nota técnica → "Usar este modelo" | Todas as páginas aparecem grandes; o documento é criado com elas | Só miniaturas ou modelo errado |
| 41 | Colar um texto com uma palavra de 400 letras sem espaços | A palavra quebra dentro da coluna, sem vazar da página | Texto saindo da folha |
| 42 | Clicar em Inserir → Seção e digitar logo em seguida | O texto digitado substitui "Nova seção" | Texto junto de "Nova seção" |
| 43 | ⋯ → Verificar documento num modelo pronto | "1 aviso" (textos de exemplo), regras do MIV com ✓, botão "Ver" leva ao bloco | Diálogo vazio ou "Ver" sem efeito |
| 44 | ⋯ → Aplicar alterações de IA, colar `examples/manual-coleta-externa.alteracoes.ops.json` com o exemplo aberto (`?open=examples/manual-coleta-externa.docstudio.json`) → Aplicar → Ctrl+Z → Ctrl+Shift+Z | Revisão com "Novo", "Alterado", "Mudou de lugar", "Capa: Arcos"; tudo aplicado; Ctrl+Z desfaz o lote inteiro; Ctrl+Shift+Z refaz | Aplicação parcial ou várias etapas de desfazer |
| 45 | No mesmo diálogo, colar `[{"op":"insert","blocks":[{"type":"callout","tone":"#ff0000","text":"x"}]}]` | Mensagem "Cores não são aceitas por código…" e Aplicar desativado | Bloco inserido |
| 46 | Botão direito num bloco → Copiar para IA (JSON) e colar num editor de texto | JSON com `documentId`, instruções e o bloco com id | Nada copiado |
| 47 | Design → tema Azul | Faixas, títulos e destaques em azul do mar (#56a7b2) | Documento continua verde |
| 48 | `node tools/docstudio.mjs check` e `render` de um exemplo | "Projeto consistente"; PDF com o mesmo número de páginas, ocupação ≤ 100% | Erro ou página "passa da área útil" |
| 49 | Modelos → filtro "Comunicação oficial"; fechar e abrir a galeria de novo | Só Comunicado e Ofício, com a finalidade ao lado; ao reabrir, "Todos" | Filtro sem efeito ou galeria reaberta filtrada |
| 50 | Design → Mais ajustes → Margens laterais "Estreita"; exportar o PDF | Texto e cabeçalho a 15 mm das bordas (180 mm úteis); capa igual; PDF com o mesmo número de páginas da prévia | Texto sobre o número da página ou páginas a mais no PDF |
| 51 | No fim de um parágrafo: Ctrl+B, digitar "ab", Ctrl+B, digitar " cd" | "ab" em negrito e " cd" normal; o botão **B** acompanha | Palavra "negrito" inserida ou tudo em negrito |
| 52 | Excluir um bloco, digitar em outro campo e clicar "Desfazer" no aviso | Aviso explicando que há edições depois; a digitação continua lá (use Ctrl+Z) | A digitação some e o bloco continua excluído |
| 53 | `node --test` | 30 testes passando (com Chrome instalado) | Falha ou teste pulado sem motivo |

### Edge cases

- **Arquivo `.json` de outro sistema** → aviso "Este arquivo não foi gerado pelo Estúdio de Documentos" e nada é alterado.
- **Imagem em formato não suportado (ex.: .bmp)** → aviso pedindo PNG, JPG, WEBP, GIF ou SVG. Imagens acima de 3508 px no maior lado (A4 a 300 dpi) são reduzidas automaticamente.
- **Texto colado maior que o limite do campo** (20 mil caracteres por texto, 600 nos textos fixos, 4 mil por célula) → o excesso é cortado com aviso, em vez de sumir ao reabrir.
- **Arquivo de alterações com `__proto__` ou caminho por dentro de um texto** → recusado com a explicação; nada é aplicado.
- **Navegador sem IndexedDB** (alguns modos privados) → aviso de que é preciso salvar o `.json`; o app continua funcionando na aba.
- **Espaço do navegador cheio** → status "Falha ao salvar" e botão "Baixar cópia" na barra superior (em qualquer largura).
- **PDF com fundo branco nas capas** → na janela de impressão, marque "Gráficos de plano de fundo" (o CSS já pede `print-color-adjust: exact`; alguns navegadores ignoram).
- **Seção sem blocos "Seção"** → o sumário mostra a orientação para adicioná-las.

### Ferramentas úteis

- Validador W3C (https://validator.w3.org/nu/) para o `index.html`.
- Lighthouse (Chrome DevTools) para desempenho e acessibilidade.
- axe DevTools para varredura de acessibilidade WCAG 2.2.

### O que foi verificado no desenvolvimento

Sétima auditoria (07/10/2026), revisão de código e testes automáticos:
- **Revisão de código** por um agente independente (só leitura, reproduzindo em Node): 8 defeitos, todos corrigidos — o mais grave, um `.ops.json` com `"__proto__.icon"` contaminava objetos do app e injetava HTML num menu (agora recusado, com CSP como segunda barreira); "Desfazer" do aviso desfazendo outra edição; textos acima do limite cortados em silêncio ao reabrir; imagem reenviada com o mesmo id tratada de um jeito no app e de outro na CLI; erro técnico escapando do lote; `design: null` derrubando a importação; link com apóstrofo quebrado; "C+" sublinhado perdendo a formatação;
- **Nos fluxos pela interface**: Ctrl+B sem seleção inseria a palavra "negrito" e não havia como sair do negrito (agora a formatação fica pendente, testada no Chromium, Firefox e WebKit, inclusive com acentos por composição); filtro da galeria lembrado entre aberturas; rótulos das margens quebrando linha no painel;
- **Fluxo A** (Procedimento → arrastar um bloco pela alça → estilo "Relatório executivo" → Ctrl+Z/Ctrl+Shift+Z → PDF) e **fluxo B** (em branco → seção, parágrafo com acentos e cedilha, destaque, print colado, rodapé "Meia faixa", contracapa "Conceito", margem larga → PDF): PDFs com as páginas da prévia, só Kanit e Maitree, nenhuma imagem rasterizada;
- `render` dos 12 modelos e começos do zero com margem padrão e estreita (24 PDFs): sem estouro, nenhuma página acima da área útil, zero imagens rasterizadas, console limpo; largura útil medida de 180/170/160 mm na prévia, na medição e no Firefox/WebKit;
- larguras 320, 390, 768, 910 × 512, 1093 × 614 (1366 × 768 a 125%), 1280 × 600 e 1440 px: sem rolagem horizontal; axe-core (WCAG 2.0/2.1/2.2 A/AA + boas práticas) na galeria com filtro e no painel Design, temas claro e escuro: sem violações;
- **30 testes automáticos** (`node --test`) passando, 9 deles no app real em Chrome sem interface.

Sexta auditoria (07/10/2026), integração AI-native:
- **Fluxo AI-A** (criar do zero): o manual da coleta externa foi reescrito por agente a partir do PDF de referência só com o contrato (`examples/manual-coleta-externa.source.json`), validado, paginado em 11 páginas e conferido página a página em PNG; com dois prints reais extraídos da referência (fora do repositório), as imagens entraram no PDF com o tamanho original (1045 e 706 px, 157 e 178 ppi impressos) e só elas como imagens (`pdfimages -list`);
- **AI-B** (alteração pontual): 4 operações por id alteraram exatamente os 4 blocos-alvo; ordem, design e textos fixos do resto idênticos (comparação JSON);
- **AI-C** (reorganização): `reorder` + tema pela interface; Ctrl+Z restaurou ordem e tema num passo e Ctrl+Shift+Z reaplicou;
- **AI-D** (proteção): cor por código, assinatura inválida, componente inexistente, opção de CSS, link `javascript:` e campo `style` livre recusados com mensagem; HTML num texto aplicado pela API apareceu como texto, sem executar (`onerror` não disparou);
- `render` dos 12 modelos e dos 14 estilos prontos (um em escala de cinza): sem estouro, nenhuma página acima de 100% da área útil, PDF sem imagens rasterizadas; o estilo "Com foto" sem foto é recusado pela verificação da marca;
- Fluxos A e B pela interface (modelo pronto; documento em branco com seção, parágrafo com acentos e cedilha, destaque, print colado, rodapé "Meia faixa" e contracapa "Conceito"), diálogos novos em 1440 e 390 px, axe-core (WCAG 2.0/2.1/2.2 A/AA + boas práticas) nos diálogos novos nos temas claro e escuro: sem violações; console sem erros;
- Defeitos encontrados e corrigidos: tema Azul sem cores no CSS (o documento continuava verde; agora usa o azul do mar da assinatura, Pantone 7709 C); tom de texto da água-marinha com contraste 4,49:1 (agora 4,56:1); glossário com respiro fora da medição (a caixa invadia a margem inferior em até ~6 mm ao continuar na página seguinte); texto digitado logo após inserir um bloco se juntava ao texto padrão; fechar o menu ⋯ disparava um erro de popover no console (a dica de ferramenta abria durante o fechamento do menu; acontecia no Chromium e no WebKit).
- **Teste de usabilidade com um agente novo**: um agente sem nenhum contexto desta auditoria, num clone limpo, recebeu só o pedido em linguagem natural e o material bruto (texto extraído de PDF e dois prints) e entregou um guia de 5 páginas válido, encontrando o caminho pelo README → `docs/ai/`, inspecionando os PNG e corrigindo sozinho uma página quase vazia e o uso de fonte monoespaçada. As falhas que ele relatou foram corrigidas: aviso de página quase vazia (também a última), aviso da fonte monoespaçada como exceção do MIV, largura máxima das imagens no `inspect`, convenção de nomes de saída, imagens em pasta irmã e orientação para material com figuras ausentes;
- **Firefox e WebKit**: abrir pelo link `?open=`, aplicar alterações pela API, desfazer, "Verificar documento" e a revisão de alterações: mesma paginação do Chromium (11 páginas, ocupação ≤ 100%) e console sem erros (o WebKit só avisa que ignora `interactive-widget`).

Quinta auditoria (07/10/2026), com Playwright:
- **Chromium** (1440, 1366, 1024, 768, 390 e 320 px; janelas de 1800, 1152 e 960 px equivalentes ao zoom de 80%, 125% e 150%): texto visual (digitação com acentos e cedilha, Enter, negrito, sublinhado, destaque, link com validação, Ctrl+Z, escape de `*`, `C++` e `==`), colagem do Word (HTML com `<img onerror>` e `href="javascript:"` reduzido a negrito e itálico) e do Excel numa célula, barra flutuante, barra de formatação só pelo teclado (Tab, setas, Enter), edição na página (capa, célula, passo; no celular por toque), seleção múltipla com Ctrl/Shift, copiar/colar blocos e texto (eventos de área de transferência sintéticos: no Chromium sem interface o Ctrl+V real não lê o que o app copia), Delete + desfazer, menu da página, imagem quadrada recortada pelo topo, parágrafo justificado, bloco de código, páginas em paisagem, galeria com "Ver páginas" e arrastar pela alça; sem rolagem horizontal em nenhuma largura e sem erros no console;
- **PDF** (`page.pdf()` do Chromium) nos 12 modelos e começos do zero: mesmo número de páginas da prévia, **nenhuma imagem rasterizada**, fontes embutidas, texto selecionável (`pdftotext`) e link clicável (`/URI`); documento com páginas em paisagem: 8 páginas, as deitadas com 841,92 × 594,96 pt;
- **Firefox e WebKit**: o mesmo fluxo de texto visual (negrito, itálico pela barra, Enter, escape) e a edição na página, com resultado idêntico ao do Chromium e sem erros;
- **axe-core** (WCAG 2.0/2.1/2.2 A/AA + boas práticas) na tela principal, com a seleção de vários blocos, a edição na página, o diálogo de link, a barra flutuante e a galeria: sem violações na interface depois de corrigir os popovers fechados (estavam na tela, vazios) e nomear a barra da seleção. O único contraste acusado continua sendo o das cores do MIV dentro das páginas (miniaturas da galeria).

Menu do botão direito (07/10/2026), com Playwright:
- **Chromium** (1440, 1280 e 390 px, temas claro e escuro): menus de texto, bloco (editor, prévia e Estrutura), célula, item, capa, rodapé, paleta, "Escrever texto" e Meus documentos; cada ação conferida no documento (formatação e prévia, recortar/copiar/colar com a área de transferência real, tipo do destaque, transformar + "Desfazer", linha e coluna da tabela + Ctrl+Z, linhas viram passo a passo + Ctrl+Z nativo do campo, confirmação ao excluir documento, download da cópia); menu e submenu dentro da tela nas bordas; teclado (Shift+F10, setas, Esc devolvendo o foco); folha inferior com "Voltar"; Shift + botão direito, botões da barra e nome do documento mantêm o menu do navegador; toque longo simulado: campo de texto mantém o menu do sistema e bloco abre a folha;
- **Firefox e WebKit**: menu de texto (seleção preservada e itálico aplicado), menu do bloco com submenu e menu da capa, todos dentro da tela, fechando ao clicar fora, sem erros;
- **axe-core** (WCAG 2.0/2.1/2.2 A/AA + boas práticas) nos menus abertos (texto, bloco e submenu), temas claro e escuro: sem violações;
- regressões: barra de formatação, Ctrl+B (agora também nas células de tabela e sem efeito nos campos que não aceitam formatação) e painel Design.

Rodada anterior em 07/10/2026 (quarta auditoria), com Playwright:
- **Chromium**: os 11 modelos e "começar do zero" e o "Manual operacional" com os 14 estilos prontos, mais escala de cinza com Backdrop (26 combinações): sem páginas cortadas, sem imagens quebradas e sem erros no console; todas as capas, contracapas, cabeçalhos, rodapés e aberturas conferidos lado a lado com as páginas citadas do MIV;
- **PDF** (`page.pdf()` do Chromium) nas 26 combinações: A4, mesmo número de páginas da prévia, **nenhuma imagem rasterizada** (`pdfimages`), fontes Kanit e Maitree embutidas (`pdffonts`); recorte a 600 dpi do Backdrop com o brasão nítido. Com foto na capa em escala de cinza, só a foto vira imagem (300 dpi);
- **parágrafo dividido entre páginas** em Chromium, Firefox e WebKit: mesma paginação nos três (9 páginas), texto íntegro (as partes juntas são iguais ao original) e o PDF com o mesmo número de páginas da prévia, inclusive com o cabeçalho timbrado e forçando o recálculo com a mídia de impressão ativa. Custo medido: 66 ms para paginar 31 páginas com 25 divisões;
- larguras 320, 390 e 1440 px nas telas alteradas (painel Design), sem rolagem horizontal; a varredura completa de 320 a 1920 px é da terceira auditoria;
- axe-core (WCAG 2.0/2.1/2.2 A/AA + boas práticas) no painel Design, editor, galeria de modelos e tema escuro (terceira auditoria): sem violações na interface. A única ocorrência é o contraste da "chamada" verde (#26a737) dentro das páginas do documento, cor prescrita pelo MIV e mantida;
- **Firefox e WebKit** (motor do Safari), pelo Playwright: abertura, modelo "Manual operacional" com parágrafo dividido, contracapa Backdrop e escala de cinza, nenhuma imagem quebrada, sem erros (o WebKit só avisa que ignora `interactive-widget` da meta viewport).

**Não validados neste ambiente:** Safari e Chrome em aparelhos reais (iOS/Android), arraste por toque, toque longo e edição por toque com teclado virtual em aparelho real, Ctrl+V real de blocos entre abas (no Chromium sem interface a área de transferência do sistema não recebe o que o app copia; a lógica foi validada com eventos sintéticos), "Colar" pelo menu no Firefox e Safari (pedem confirmação própria do navegador), corretor ortográfico e IME (teclados de outros idiomas) no campo visual e a janela de impressão do Firefox/Safari (o PDF foi conferido pelo Chromium).

## 8. Decisões técnicas principais

- **Paginação real em A4 (prévia = PDF).** Cada bloco vira "átomos" (uma linha de tabela, um passo, uma linha de cartões). O app mede cada átomo numa coluna invisível com a largura útil da página (170 mm), distribui-os em páginas de 252 mm de altura útil e só então desenha as páginas. Títulos nunca ficam sozinhos no pé da página, tabelas repetem o cabeçalho e parágrafos que não cabem são divididos na linha exata (o app acha o início de cada linha com `Range.getClientRects()` por busca binária e corta o HTML com `Range.cloneContents()`, que fecha corretamente negritos e destaques partidos), deixando ao menos duas linhas em cada página. Como a medição usa o mesmo CSS da impressão, o PDF sai igual à prévia. *Impacto:* precisão; o custo é recalcular o layout a cada mudança (com atraso de 140 ms e troca só das páginas alteradas).
- **PDF pela impressão do navegador.** Gerar PDF em JavaScript puro exigiria reimplementar fontes e layout; a impressão nativa com `@page { size: A4; margin: 0 }` produz PDF vetorial, com texto selecionável e fontes embutidas.
- **Grafismo em SVG com coordenadas medidas no MIV.** As faixas da capa "Pasta", do rodapé e da meia faixa foram medidas no manual oficial e redesenhadas como polígonos com degradê; a capa Arcos e o leque usam setores de anel (arcos SVG), como o elemento base. Sai nítido em qualquer zoom e na impressão.
- **Assinaturas pelas regras do MIV (p. 15–22).** Órgão à esquerda e Governo à direita, sem fio separador, afastados pela largura do escudo e alinhados pelo centro do escudo; tamanhos mínimos respeitados (com secretaria ≥ 40 mm de largura; sem secretaria ≥ 30 mm). *Impacto:* a ordem das marcas mudou em relação aos dois primeiros manuais (que tinham o Governo à esquerda e um fio entre as marcas). As assinaturas são **SVG vetoriais extraídos do próprio MIV** (p. 20, 50 e 117): saem nítidas em qualquer tamanho e no PDF. A vertical com secretaria junta a vertical oficial (p. 20) e a linha da secretaria da p. 50, na proporção medida no MIV, centralizada como nas p. 17, 20 e 35; nada foi redesenhado. O conceito "Cuidar das pessoas, avançar o Ceará." tem quebras de linha fixas, porque o MIV (p. 9) define as quatro linhas.
- **Cores oficiais primeiro.** Cores principais vêm da paleta do grafismo (p. 26) e os tons escuros de texto usam os verdes oficiais da assinatura (#008241, #2a7050) quando existem; os demais tons escuros e os fundos claros são derivados para garantir contraste e estão documentados em `css/document.css`.
- **Tema claro por padrão.** O `<html>` já nasce com `data-theme="light"`; o escuro e o automático são escolhas explícitas do usuário (pedido do responsável pelo projeto).
- **Campo visual por cima de uma marcação segura.** O usuário edita num campo `contenteditable` e vê a formatação, mas o documento guarda só a marcação simples (`**negrito**`, `[link](https://…)`), sempre escapada antes de virar HTML. *Por quê:* guardar o HTML do campo traria código colado do Word e risco de injeção; deixar a marcação visível obrigava o leigo a decorá-la. Formatar não usa `document.execCommand` (cada navegador gera um HTML diferente): a seleção vira um intervalo de caracteres, a formatação é aplicada num modelo de "trechos" e o campo é redesenhado. O que é colado passa por um `DOMParser` e só mantém negrito, itálico, sublinhado, riscado e links `http(s)`, `mailto:` e `tel:`. *Impacto:* nenhum conteúdo colado ou importado injeta código, e o comportamento é igual no Chromium, Firefox e WebKit (testado).
- **Edição na página por um campo flutuante.** As páginas são redesenhadas a cada mudança (e a paginação pode levar o texto para outra página); por isso o duplo clique abre um campo sobre o trecho, e a página continua sendo exatamente o que vai para o PDF. Cada texto renderizado leva o caminho do seu campo (`data-edit`).
- **Blocos na área de transferência pelos eventos nativos.** `copy`/`cut`/`paste` não pedem permissão ao navegador. O texto vai legível (cola no Word) e o HTML carrega os blocos e as imagens em JSON; ao colar, cada bloco é reconstruído campo a campo, como na importação de arquivo.
- **Paisagem pela quebra de página.** As capas do MIV são peças em pé; esticá-las deformaria arcos e leque. Por isso a orientação deitada vale para as páginas de conteúdo a partir de uma quebra de página, e o PDF sai com folhas de tamanhos diferentes (`@page landscape`).
- **Formulários gerados a partir de um catálogo.** Cada tipo de bloco declara seus campos uma vez (`schema.js`); o editor monta os formulários e a importação valida arquivos com essa mesma definição. Novo tipo de bloco = uma entrada no catálogo + um renderizador.
- **Estado com histórico e "rajadas" de digitação.** Toda mudança passa pelo `store`; digitação contínua no mesmo campo vira um único passo de desfazer. O editor não se redesenha enquanto você digita (o cursor fica intacto); só a prévia.
- **Imagens fora do histórico.** O bloco guarda só o id da imagem; o registro converte para URLs `blob:` curtas. Desfazer não copia megabytes e a prévia não repete base64 no HTML.
- **IndexedDB em vez de localStorage.** Documentos com prints passam facilmente dos ~5 MB do localStorage.
- **Arrastar com Pointer Events.** O drag-and-drop nativo do HTML não funciona com toque na maioria dos celulares. No toque, itens da paleta exigem toque longo (para não brigar com a rolagem); sempre há alternativa por clique e teclado.
- **Controles próprios em vez dos nativos.** Pedido explícito: nada com a aparência padrão do navegador. Os controles continuam sendo `<input>` reais (rádios, número, deslizante, interruptor) com a aparência redesenhada em CSS, então teclado e leitores de tela funcionam como antes; só a lista suspensa de cores foi trocada por uma paleta de rádios, mais fácil para leigos. A dica de ferramenta própria lê os atributos `title` existentes, então não há duas fontes de texto. *Impacto:* nenhum controle novo exige JavaScript para funcionar com o teclado.
- **Escala de cinza com cores reais, não com filtro.** `filter: grayscale(1)` no CSS faria o Chromium transformar cada página do PDF em imagem de 300 dpi (testado: texto deixa de ser selecionável e as fontes somem do PDF). Por isso as cores do documento viram tokens CSS com versão em cinza, o grafismo SVG troca cada cor pelo cinza de mesma luminância e as assinaturas usam arquivos `-gray.svg` gerados com a tabela de correspondência da p. 12 do MIV (o nome "CEARÁ" em preto, o brasão nos cinzas da tabela). *Impacto:* o PDF continua vetorial; fotos do usuário (que já são imagens) recebem o filtro.
- **Medição sempre válida na impressão.** A área invisível de medição continua com largura no CSS de impressão e a paginação ignora medições com largura zero; antes, um recálculo durante a impressão juntava páginas no PDF.
- **Menu de contexto por provedores, sem bloquear o do navegador.** Cada módulo registra uma função que reconhece "seus" elementos e devolve as ações (editor: texto, item, célula, bloco; prévia: bloco, capa, rodapé; painel: Estrutura e paleta). O primeiro que reconhecer monta o menu; se nenhum reconhecer, o menu do navegador fica. As ações chamam as mesmas funções dos botões (mesmas condições, "Desfazer" e confirmações). Shift + botão direito é a saída para o menu do navegador (corretor ortográfico). No toque longo em campo de texto o app não intervém, para não quebrar copiar/colar do celular. O texto é alterado com `execCommand('insertText')`, que mantém o Ctrl+Z nativo do campo (com `setRangeText` como alternativa). *Impacto:* um novo componente ganha menu registrando um provedor; o menu mora dentro do diálogo aberto, porque um diálogo modal deixa inerte tudo o que está fora dele.
- **Contrato para agentes em vez de HTML gerado por IA.** A IA usa o mesmo modelo de documento do editor (blocos com id estável, intenções semânticas, opções registradas) e operações por id (`insert`, `update`, `move`, `reorder`…) com guarda `expect`. *Por quê:* HTML livre destruiria a identidade visual e não teria validação; operações por posição (como o JSON Patch, RFC 6902) quebram quando o documento muda; por id, a mudança é auditável e mira o bloco certo. *Impacto:* o lote é atômico e entra como um passo de desfazer; o que não está no catálogo é recusado com a explicação.
- **Renderização para agentes pelo próprio app.** A CLI abre `index.html?render=` num Chrome sem interface e usa `Page.printToPDF` — o mesmo DOM, CSS de impressão e paginação do botão "Exportar PDF". *Alternativa descartada:* um renderizador próprio em Node, que divergiria da prévia. *Impacto:* precisa de Chrome/Chromium instalado; o PDF sai marcado (acessível) e com marcadores.
- **Uma fonte para regras e documentação.** `js/brand.js` (fatos do MIV) e as definições do editor geram `schemas/` e os catálogos de `docs/ai/`; `check` confere tokens CSS × temas, paleta, guia e renderizador de cada bloco e exemplos. Foi essa conferência que achou o tema Azul sem CSS e o contraste da água-marinha.
- **Política de segurança (CSP) no `index.html`.** Documentos e alterações chegam de fora (arquivos, agentes de IA, colagens); mesmo que um defeito deixasse passar HTML, o navegador só executa scripts dos arquivos do próprio app. Por isso não há script embutido na página (o do tema foi para `js/boot.js`). *Impacto:* depuração com scripts injetados precisa do console ou do `evaluate` do Playwright, não de `<script>` inline.
- **Formatação pendente com o cursor parado.** O documento guarda marcação (`**negrito**`), que não representa "negrito vazio"; antes, Ctrl+B sem seleção inseria a palavra "negrito". Agora a formatação fica pendente e o texto digitado em seguida entra pelo modelo de trechos (como os *stored marks* dos editores de texto): o navegador não decide se a letra cai dentro ou fora do `<b>` vizinho. Acentos por tecla morta chegam como composição (IME), que não pode ser cancelada; a formatação é aplicada quando ela termina.
- **Margem lateral como opção de design.** O MIV fixa o A4, não a margem do texto; a margem vive num token CSS (`--doc-margin-x`) usado pela página e pela área de medição, então a paginação continua idêntica ao PDF. A altura útil não muda (depende do cabeçalho e da faixa do rodapé).
- **Testes com o executor nativo do Node.** `node --test` não precisa de pacote: os testes do contrato rodam sem navegador e os do app usam o mesmo Chrome via CDP do `docstudio render`.
- **Sem PWA/instalação.** Não foi pedido; marcado como *não aplicável*. O app já funciona sem internet depois de carregado, porque não depende de rede.

## 9. Boas práticas adotadas

- Separação de responsabilidades por módulo, funções pequenas, nada global (exceto `window.docStudio`, exposto só para depuração no console).
- Identificadores em inglês; interface e comentários em português.
- HTML semântico (`header`, `nav`, `main`, `aside`, `section`, `dialog`, `fieldset/legend`, `label`), ARIA só onde a semântica nativa não basta (abas, combobox do seletor, `aria-live` para avisos).
- Navegação completa por teclado, foco visível, alvos de toque ≥ 44 px, `prefers-reduced-motion`, `prefers-color-scheme`, zoom do navegador liberado.
- Mobile-first, sem rolagem horizontal acidental, áreas seguras (`env(safe-area-inset-*)`), `100dvh`, container queries nos cartões de bloco.
- Toda entrada externa validada: arquivos `.json` reconstruídos campo a campo, imagens com tipo/tamanho verificados, texto sempre escapado.
- Tokens de design (cores, espaçamentos, raios, movimento) em variáveis CSS; o documento usa os tokens do MIV.
- Controles com aparência própria, mas semântica nativa (`input` real por trás de cada um), e efeitos só com `transform`/`opacity`, desligados em `prefers-reduced-motion`.

## 10. Possíveis melhorias futuras

- Exportar `.docx` para quem precisa editar no Word.
- Biblioteca compartilhada de modelos e blocos da equipe (exigiria um back-end).
- Dividir também citações, itens de lista e células de tabela muito longos por linha (hoje parágrafos e o bloco de código são divididos; os demais geram aviso).
- Reduzir o tamanho dos SVG das assinaturas (160–220 KB cada): a contracapa Backdrop repete 21 assinaturas e acrescenta cerca de 1,5 MB ao PDF.
- Documento inteiro em paisagem (apresentações e fundos de palco no formato original do MIV), com capas redesenhadas a partir das peças horizontais do MIV (p. 1, 56–57, 104, 116–117); hoje a paisagem vale para as páginas de conteúdo.
- Margens superior e inferior configuráveis (hoje só a lateral; as de cima e de baixo dependem do cabeçalho e da faixa do rodapé).
- Comentários e revisão entre colegas.
- Ampliar os testes automáticos para arrastar e soltar, menus de contexto e seleção múltipla (hoje validados à mão e por scripts do Playwright fora do repositório).
- Assistente de IA dentro do app (painel "Criar com IA"): a arquitetura já tem a API (`window.docStudio.applyOperations`, `check`, `report`) e a revisão de alterações; falta a conexão com um modelo, que exige escolher fornecedor e um back-end para a chave de acesso.
- Importar PDF e `.docx` como material para agentes direto na interface (hoje o agente lê esses arquivos por conta própria).
- Versão monocromática da assinatura (MIV p. 13, brasão em traço), que o MIV reserva para "último caso"; hoje a impressão em uma cor usa a escala de cinza da p. 12.
- PWA instalável com funcionamento offline garantido por service worker, se houver demanda.

## 11. Licenças de terceiros

Fontes Kanit e Maitree sob SIL Open Font License 1.1 (ver `assets/fonts/LICENSE.md`). Assinaturas do Governo do Ceará e do DETRAN/CE são marcas institucionais: use conforme o Manual de Identidade Visual.
