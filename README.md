# Estúdio de Documentos (`doc-studio`)

Editor visual de manuais, guias, procedimentos, relatórios e comunicados na **identidade visual do Governo do Ceará (MIV 2023–2026)**, com pré-visualização das páginas A4 em tempo real e exportação para PDF.

## 1. Descrição e objetivo

Os manuais feitos para a Diretoria de Veículos (Manual do Despachante · G003 e Manual da Coleta Externa) seguiram à risca o Manual de Identidade Visual: capas com o grafismo em faixas, Kanit nos títulos, Maitree no texto, rodapé do papel timbrado, número da página no círculo verde. Eles foram gerados por código, um a um.

O Estúdio transforma esse padrão em uma ferramenta: você escreve o conteúdo em blocos (ou cola um texto pronto), escolhe capa, contracapa, cores e estilos, e vê ao lado exatamente como cada página vai sair. Nada de ajustar margens, estilos e quebras de página no Word.

> **Como se chama esse tipo de sistema?** É um **editor por blocos com pré-visualização ao vivo** (*block editor* + *live preview*). "Por blocos" é o modelo do Notion e do Gutenberg do WordPress: cada parte do documento é um bloco que você insere, arrasta e configura. "Pré-visualização ao vivo" é o painel que redesenha o resultado enquanto você digita — o mesmo princípio dos editores **WYSIWYG** (*What You See Is What You Get*, "o que você vê é o que você recebe").

## 2. Funcionalidades

**Escrita**
- 20 tipos de bloco: seção numerada, subtítulo, parágrafo, lista (marcadores, números ou checklist), citação, passo a passo, cartões, fluxo com setas, linha do tempo, sumário automático com página, destaque (informação, sucesso, atenção, alerta, dica), mensagem do sistema, pergunta e resposta, etiquetas, tabela, indicadores (números grandes ou fichas), glossário, imagem com figura numerada, divisor e quebra de página.
- **Escrever com texto livre**: cole ou digite texto (Markdown simples ou texto do Word) e ele vira blocos — `#` vira seção, `1.` vira passo a passo, `> [!ATENÇÃO]` vira destaque, tabelas `| a | b |` viram tabela, "Pergunta?" + "R: resposta" vira pergunta e resposta.
- Formatação no texto: `**negrito**`, `*itálico*`, `` `código` ``, `==destaque==`, `~~riscado~~` (com barra de botões e Ctrl+B / Ctrl+I).
- Comando **`/`** num parágrafo vazio e **Ctrl+K** abrem o seletor de blocos com busca.
- 8 **combinações prontas** (ex.: "Seção com passo a passo", "Dúvidas comuns", "Como era × como fica").
- Tabelas aceitam **colar células do Excel/Word** de uma vez.
- Imagens: **cole um print (Ctrl+V)**, arraste arquivos para o editor ou para a página, ou escolha o arquivo. Com legenda, vira "Figura N".

**Organização**
- **Arrastar e soltar** blocos no editor, no painel Estrutura e **direto na página da prévia** (onde soltar, entra). Também por teclado (setas na alça) e por menu.
- Painel Estrutura com estatísticas (páginas, blocos, palavras).
- Clicar num trecho da prévia leva ao bloco no editor (duplo clique já posiciona o cursor).
- Desfazer/refazer ilimitado (até 150 passos), duplicar, recolher/expandir blocos.

**Design (tudo do MIV)**
- 6 **modelos de documento**: Manual operacional, Guia rápido, Procedimento (POP), Relatório de resultados, Comunicado e Em branco.
- 6 **estilos prontos** que trocam só a aparência: Manual institucional, Guia rápido, Relatório executivo, Campanha, Comunicado, Sol do sertão.
- 6 **capas**: Pasta (a dos manuais oficiais), Identidade, Envelope, Leque (elemento base do grafismo), Verde pleno (assinatura em negativo) e Minimalista — ou sem capa.
- 4 **contracapas**: Pasta (verso), Verde pleno, Leque e Minimalista — ou sem contracapa.
- 7 **temas de cor**, 3 estilos de título de seção, 3 estilos de cartão, 4 cabeçalhos, 3 rodapés, 3 numerações, 2 fontes de texto e 3 espaçamentos.
- **Página de abertura de capítulo** opcional por seção.
- Assinatura: Governo do Ceará + DETRAN/CE, só Governo do Ceará, Governo do Ceará + logo próprio (upload) ou nenhuma.
- Miniaturas das capas mostram seus próprios textos e cores.

**Arquivos**
- Salvamento automático no navegador (IndexedDB), lista "Meus documentos" (abrir, duplicar, excluir).
- **Salvar/abrir arquivo `.json`** para levar o documento a outro computador ou guardar versão.
- **Exportar PDF** pela impressão do navegador: A4, sem margens, fontes embutidas, texto selecionável. A prévia e o PDF são idênticos.

**Interface**
- Celular: uma área por vez com navegação inferior (Editar, Inserir, Design, Prévia).
- Tablet: editor e prévia lado a lado, painel lateral como gaveta.
- Desktop: painel fixo + editor + prévia; modos "só editor", "lado a lado" e "só prévia" (Ctrl+1/2/3).
- Tema claro/escuro/automático para o app (o documento é sempre papel branco).

## 3. Estrutura de arquivos

```
doc-studio/
├── index.html             Estrutura da interface, ícones (sprite SVG) e diálogos
├── style.css              Tokens de design, reset, casca responsiva do app
├── script.js              Ponto de entrada: cria estado e módulos, define as ações
├── README.md
├── css/
│   ├── components.css     Botões, campos, cartões de bloco, painéis, diálogos, avisos
│   ├── document.css       A página A4 na identidade visual (blocos, capas, temas)
│   └── print.css          Impressão/PDF: só as páginas, sem margens, sem zoom
├── js/
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
│   ├── panels.js          Painel lateral: Inserir, Estrutura, Design, Textos
│   ├── picker.js          Seletor de bloco (botão +, Ctrl+K, comando /)
│   ├── dnd.js             Arrastar e soltar com Pointer Events (mouse e toque)
│   ├── dialogs.js         Diálogos nativos, menus (Popover API) e avisos
│   ├── images.js          Imagens: validação, redução e registro
│   ├── storage.js         IndexedDB (documentos) e preferências (localStorage)
│   └── utils.js           Utilitários pequenos e puros
└── assets/
    ├── favicon.svg
    ├── fonts/             Kanit e Maitree (WOFF, subconjunto latino) + LICENSE.md
    └── img/               Assinaturas Governo do Ceará e DETRAN/CE (cor e negativo)
```

**Por que vários arquivos?** O escopo é o de uma aplicação (editor, paginação, design, armazenamento, arrastar e soltar). Um único `script.js` passaria de 4 mil linhas. Cada módulo ES tem uma responsabilidade; o `script.js` é a "raiz de composição": cria as peças e as conecta. O CSS segue a mesma lógica: base do app, componentes, documento A4 e impressão.

## 4. Tecnologias utilizadas

HTML5, CSS3 e JavaScript (ES2023) puros, sem bibliotecas, frameworks ou etapa de build. Recursos nativos usados: módulos ES, `<dialog>`, Popover API, Pointer Events, IndexedDB, `structuredClone`, `ResizeObserver`, `IntersectionObserver`, CSS Grid/Flexbox, Container Queries, `color-mix()`, `:has()`, `zoom`, `field-sizing` (com alternativa em JS), `@page`.

## 5. Como executar

Os módulos ES não carregam a partir de `file://` (bloqueio de segurança dos navegadores), então é preciso um servidor local simples. Na pasta do projeto:

```bash
python3 -m http.server 8080
```

Acesse `http://localhost:8080`. Se você abrir o `index.html` direto do disco, a página mostra um aviso com essa instrução.

Para publicar, basta copiar a pasta para qualquer servidor de arquivos estáticos (Apache, Nginx, IIS, GitHub Pages, Firebase Hosting). Não há back-end: os documentos ficam no navegador de cada usuário.

Navegadores recomendados: Chrome/Edge 120+, Firefox 126+ e Safari 17+.

## 6. Como usar

1. Na primeira abertura, escolha um **modelo** (ou feche para começar pelo Manual operacional).
2. Em **Textos** (painel lateral), preencha capa, cabeçalho e contracapa.
3. No editor, edite os blocos. Para adicionar: painel **Inserir** (clique ou arraste), botão **+** entre blocos, **Ctrl+K**, ou `/` num parágrafo vazio. Para escrever de uma vez: **Escrever texto**.
4. Em **Design**, troque capa, contracapa, cores e estilos — a prévia muda na hora.
5. Clique em **Exportar PDF** e escolha "Salvar como PDF" na janela de impressão.
6. Para levar o trabalho a outro computador: menu **⋯ → Salvar arquivo (.json)**; no outro, **Abrir arquivo (.json)**.

Atalhos: `Ctrl+Z`/`Ctrl+Shift+Z` desfazer/refazer · `Ctrl+K` inserir bloco · `Alt+↑/↓` mover bloco · `Ctrl+D` duplicar · `Ctrl+B`/`Ctrl+I` negrito/itálico · `Ctrl+1/2/3` modos de visualização · `Ctrl+S` salvar · `Ctrl+P` PDF · `?` ajuda.

## 7. Validação e testes

### Roteiro manual

| # | Ação | Resultado esperado | Sinal de falha |
|---|------|--------------------|----------------|
| 1 | Abrir `http://localhost:8080` pela primeira vez | Galeria de modelos aparece; ao fundo, o Manual operacional com 7 páginas | Página em branco ou erro no console (F12) |
| 2 | Escolher "Guia rápido" | Novo documento de 4 páginas; o anterior continua em "Meus documentos" | Documento anterior some da lista |
| 3 | Digitar no título de uma seção | A prévia muda em ~0,1 s; o cursor não pula | Cursor perde a posição ou a prévia não atualiza |
| 4 | Num parágrafo vazio, digitar `/`, depois "tabela" e Enter | O parágrafo vira uma tabela | Seletor não abre |
| 5 | Copiar 3×3 células do Excel e colar na primeira célula da tabela | Tabela com 3 colunas e as linhas preenchidas | Tudo cai numa célula só |
| 6 | Arrastar "Destaque" do painel Inserir até o meio de uma página da prévia | Linha verde indica a posição; ao soltar, o bloco entra ali | Bloco vai para o fim ou nada acontece |
| 7 | Focar a alça ⋮⋮ de um bloco e apertar ↑ | O bloco sobe uma posição e o foco continua na alça | Foco se perde |
| 8 | Excluir um bloco e clicar "Desfazer" no aviso | O bloco volta no mesmo lugar | Bloco não volta |
| 9 | Colar um print (Ctrl+V) com um bloco selecionado | Bloco de imagem após o selecionado; com legenda vira "Figura N" | Nada acontece |
| 10 | Design → capa "Verde pleno" | Capa verde com textos e assinatura em branco | Logo colorido sobre o verde |
| 11 | Criar uma tabela com 80 linhas | A tabela continua nas páginas seguintes repetindo o cabeçalho | Linhas cortadas no pé da página |
| 12 | Colar um parágrafo enorme (sem linhas em branco) | Aviso laranja no bloco ("maior que a área da página") e contorno vermelho na página | Texto cortado sem aviso |
| 13 | Exportar PDF → Salvar como PDF | Mesmo número de páginas da prévia, A4, sem margens brancas, cores do fundo presentes | Páginas extras em branco ou margens (veja "Edge cases") |
| 14 | Recarregar a página (F5) | O mesmo documento reabre, com as imagens | Documento volta ao modelo |
| 15 | Salvar `.json`, abrir em outra aba com "Abrir arquivo" | Abre como novo documento idêntico | Mensagem de arquivo inválido |
| 16 | Redimensionar a janela até 320 px de largura | Navegação inferior; nenhuma barra de rolagem horizontal na página | Conteúdo cortado ou rolagem lateral |
| 17 | Navegar só com Tab/Shift+Tab/Enter/Esc/setas | Todos os controles alcançáveis, foco visível, menus fecham com Esc | Foco preso ou invisível |

### Edge cases

- **Arquivo `.json` de outro sistema** → aviso "Este arquivo não foi gerado pelo Estúdio de Documentos" e nada é alterado.
- **Imagem em formato não suportado (ex.: .bmp)** → aviso pedindo PNG, JPG, WEBP ou GIF. Imagens acima de 2400 px são reduzidas automaticamente.
- **Navegador sem IndexedDB** (alguns modos privados) → aviso de que é preciso salvar o `.json`; o app continua funcionando na aba.
- **Espaço do navegador cheio** → status "Falha ao salvar" e aviso para salvar o `.json`.
- **PDF com fundo branco nas capas** → na janela de impressão, marque "Gráficos de plano de fundo" (o CSS já pede `print-color-adjust: exact`; alguns navegadores ignoram).
- **Seção sem blocos "Seção"** → o sumário mostra a orientação para adicioná-las.

### Ferramentas úteis

- Validador W3C (https://validator.w3.org/nu/) para o `index.html`.
- Lighthouse (Chrome DevTools) para desempenho e acessibilidade.
- axe DevTools para varredura de acessibilidade WCAG 2.2.

### O que foi verificado no desenvolvimento

Executado com Playwright (Chromium): os fluxos do roteiro acima (exceto teste de toque real), PDF gerado pelo Chromium com 7 páginas idênticas à prévia e fontes Kanit/Maitree embutidas, larguras 320, 375, 390, 759/760, 900, 1179/1180, 1280 e 1600 px sem rolagem horizontal, e varredura axe-core (WCAG 2.0/2.1/2.2 A/AA + boas práticas) sem violações na tela principal, painéis, diálogos, tema escuro e celular. **Não validados neste ambiente:** Firefox, Safari/WebKit, arraste por toque em aparelho real e impressão pelo diálogo do Firefox/Safari.

## 8. Decisões técnicas principais

- **Paginação real em A4 (prévia = PDF).** Cada bloco vira "átomos" (uma linha de tabela, um passo, uma linha de cartões). O app mede cada átomo numa coluna invisível com a largura útil da página (170 mm), distribui-os em páginas de 252 mm de altura útil e só então desenha as páginas. Títulos nunca ficam sozinhos no pé da página e tabelas repetem o cabeçalho. Como a medição usa o mesmo CSS da impressão, o PDF sai igual à prévia. *Impacto:* precisão; o custo é recalcular o layout a cada mudança (com atraso de 140 ms e troca só das páginas alteradas).
- **PDF pela impressão do navegador.** Gerar PDF em JavaScript puro exigiria reimplementar fontes e layout; a impressão nativa com `@page { size: A4; margin: 0 }` produz PDF vetorial, com texto selecionável e fontes embutidas.
- **Grafismo em SVG com coordenadas medidas no MIV.** As faixas da capa "Pasta" e do rodapé foram medidas no manual oficial e redesenhadas como polígonos com degradê. Sai nítido em qualquer zoom e na impressão.
- **Campos de texto comuns + marcação simples, em vez de `contenteditable`.** Edição rica com `contenteditable` é frágil (HTML imprevisível colado do Word, cursor pulando). Com `textarea` e `**negrito**`, o texto é sempre escapado antes de virar HTML — nenhum conteúdo colado ou importado consegue injetar código.
- **Formulários gerados a partir de um catálogo.** Cada tipo de bloco declara seus campos uma vez (`schema.js`); o editor monta os formulários e a importação valida arquivos com essa mesma definição. Novo tipo de bloco = uma entrada no catálogo + um renderizador.
- **Estado com histórico e "rajadas" de digitação.** Toda mudança passa pelo `store`; digitação contínua no mesmo campo vira um único passo de desfazer. O editor não se redesenha enquanto você digita (o cursor fica intacto); só a prévia.
- **Imagens fora do histórico.** O bloco guarda só o id da imagem; o registro converte para URLs `blob:` curtas. Desfazer não copia megabytes e a prévia não repete base64 no HTML.
- **IndexedDB em vez de localStorage.** Documentos com prints passam facilmente dos ~5 MB do localStorage.
- **Arrastar com Pointer Events.** O drag-and-drop nativo do HTML não funciona com toque na maioria dos celulares. No toque, itens da paleta exigem toque longo (para não brigar com a rolagem); sempre há alternativa por clique e teclado.
- **Sem PWA/instalação.** Não foi pedido; marcado como *não aplicável*. O app já funciona sem internet depois de carregado, porque não depende de rede.

## 9. Boas práticas adotadas

- Separação de responsabilidades por módulo, funções pequenas, nada global (exceto `window.docStudio`, exposto só para depuração no console).
- Identificadores em inglês; interface e comentários em português.
- HTML semântico (`header`, `nav`, `main`, `aside`, `section`, `dialog`, `fieldset/legend`, `label`), ARIA só onde a semântica nativa não basta (abas, combobox do seletor, `aria-live` para avisos).
- Navegação completa por teclado, foco visível, alvos de toque ≥ 44 px, `prefers-reduced-motion`, `prefers-color-scheme`, zoom do navegador liberado.
- Mobile-first, sem rolagem horizontal acidental, áreas seguras (`env(safe-area-inset-*)`), `100dvh`, container queries nos cartões de bloco.
- Toda entrada externa validada: arquivos `.json` reconstruídos campo a campo, imagens com tipo/tamanho verificados, texto sempre escapado.
- Tokens de design (cores, espaçamentos, raios, movimento) em variáveis CSS; o documento usa os tokens do MIV.

## 10. Possíveis melhorias futuras

- Exportar `.docx` para quem precisa editar no Word.
- Biblioteca compartilhada de modelos e blocos da equipe (exigiria um back-end).
- Dividir parágrafos muito longos entre páginas por linha (hoje o app avisa para dividir).
- Mais variações de grafismo (ex.: capas em paisagem para apresentações).
- Comentários e revisão entre colegas.
- Testes automatizados versionados (Playwright) no repositório.
- PWA instalável com funcionamento offline garantido por service worker, se houver demanda.

## 11. Licenças de terceiros

Fontes Kanit e Maitree sob SIL Open Font License 1.1 (ver `assets/fonts/LICENSE.md`). Assinaturas do Governo do Ceará e do DETRAN/CE são marcas institucionais: use conforme o Manual de Identidade Visual.
