/**
 * Catálogo de tipos de bloco.
 *
 * Cada tipo declara rótulo, ícone, grupo, valores padrão e a lista de campos
 * do formulário. O editor monta os formulários a partir daqui (DRY) e a
 * normalização usa os mesmos campos para validar documentos importados.
 */
import { uid, clamp } from './utils.js';
import { stripMarkup } from './markup.js';

export const BLOCK_GROUPS = [
  { id: 'text', label: 'Texto' },
  { id: 'structure', label: 'Organização' },
  { id: 'highlight', label: 'Destaques' },
  { id: 'data', label: 'Dados' },
  { id: 'media', label: 'Mídia' },
  { id: 'page', label: 'Página' },
];

/**
 * Cores dos blocos. `swatch` é o fundo da amostra na paleta do editor: as
 * cores fixas vêm da paleta do grafismo (MIV p. 26); "tema" e "apoio" seguem
 * o tema de cores escolhido em Design (variáveis definidas em script.js).
 */
export const TONE_OPTIONS = [
  { value: 'theme', label: 'Cor do tema', swatch: 'var(--tone-theme)' },
  { value: 'accent', label: 'Cor de apoio do tema', swatch: 'var(--tone-accent)' },
  { value: 'green', label: 'Verde', swatch: '#26a737' },
  { value: 'teal', label: 'Água-marinha', swatch: '#2db39e' },
  { value: 'orange', label: 'Laranja', swatch: '#f59c00' },
  { value: 'red', label: 'Vermelho', swatch: '#e94f0e' },
  { value: 'gold', label: 'Amarelo-ouro', swatch: '#e4a500' },
  { value: 'navy', label: 'Grafite', swatch: '#465564' },
];

const TONE_WITH_ALTERNATE = [
  { value: 'alternate', label: 'Alternar cores', swatch: 'conic-gradient(var(--tone-theme) 0 25%, #2db39e 0 50%, var(--tone-accent) 0 75%, #465564 0)' },
  ...TONE_OPTIONS,
];

export const CALLOUT_TONES = [
  { value: 'info', label: 'Informação', tone: 'navy' },
  { value: 'success', label: 'Sucesso', tone: 'green' },
  { value: 'warning', label: 'Atenção', tone: 'orange' },
  { value: 'danger', label: 'Alerta', tone: 'red' },
  { value: 'tip', label: 'Dica', tone: 'teal' },
];

const TABLE_TONES = [
  { value: 'navy', label: 'Grafite (padrão)', swatch: '#465564' },
  { value: 'theme', label: 'Cor do tema', swatch: 'var(--tone-theme)' },
  { value: 'accent', label: 'Cor de apoio', swatch: 'var(--tone-accent)' },
  { value: 'teal', label: 'Água-marinha', swatch: '#2db39e' },
  { value: 'minimal', label: 'Minimalista (só linhas)', swatch: 'linear-gradient(transparent 46%, #2f3b47 46% 58%, transparent 58%), #fff' },
];

/** Formatos da imagem (proporção largura:altura). */
export const IMAGE_RATIOS = [
  { value: 'original', label: 'Original', ratio: null },
  { value: 'wide', label: '16:9', ratio: '16 / 9' },
  { value: 'standard', label: '4:3', ratio: '4 / 3' },
  { value: 'square', label: 'Quadrado', ratio: '1 / 1' },
  { value: 'portrait', label: 'Retrato', ratio: '3 / 4' },
];

/** Paleta usada quando um bloco está em "Alternar cores". */
export const ALTERNATE_TONES = ['theme', 'teal', 'accent', 'navy'];

export const BLOCK_TYPES = {
  section: {
    label: 'Seção',
    description: 'Título numerado com chamada e linha colorida',
    icon: 'section',
    group: 'text',
    keywords: 'capitulo titulo h1',
    defaults: () => ({ title: 'Nova seção', kicker: '', intro: '', newPage: false, opener: false }),
    fields: [
      { key: 'title', kind: 'text', label: 'Título da seção', big: true, placeholder: 'Ex.: Visão geral' },
      { key: 'kicker', kind: 'text', label: 'Chamada acima do título (opcional)', placeholder: 'Ex.: Contexto', plain: true },
      { key: 'intro', kind: 'rich', label: 'Introdução (opcional)', rows: 2 },
      { key: 'newPage', kind: 'toggle', label: 'Começar em nova página' },
      { key: 'opener', kind: 'toggle', label: 'Página inteira de abertura de capítulo' },
    ],
    summary: (b) => b.title,
  },

  heading: {
    label: 'Subtítulo',
    description: 'Título menor dentro de uma seção',
    icon: 'heading',
    group: 'text',
    keywords: 'titulo h2 h3 intertitulo',
    defaults: () => ({ text: 'Subtítulo', level: '2' }),
    fields: [
      { key: 'text', kind: 'text', label: 'Texto', big: true },
      { key: 'level', kind: 'segmented', label: 'Nível', options: [{ value: '2', label: 'Subtítulo' }, { value: '3', label: 'Título menor' }] },
    ],
    summary: (b) => b.text,
  },

  paragraph: {
    label: 'Parágrafo',
    description: 'Texto corrido com formatação',
    icon: 'paragraph',
    group: 'text',
    keywords: 'texto corpo',
    defaults: () => ({ text: '', style: 'normal', align: 'left' }),
    fields: [
      { key: 'text', kind: 'rich', label: 'Texto', rows: 4, placeholder: 'Escreva aqui. Digite / num parágrafo vazio para trocar o tipo de bloco.' },
      { key: 'style', kind: 'segmented', label: 'Estilo', options: [{ value: 'normal', label: 'Normal' }, { value: 'lead', label: 'Abertura' }, { value: 'note', label: 'Nota' }] },
      { key: 'align', kind: 'segmented', label: 'Alinhamento', options: [{ value: 'left', label: 'À esquerda' }, { value: 'justify', label: 'Justificado' }, { value: 'center', label: 'Centralizado' }] },
    ],
    summary: (b) => b.text,
  },

  list: {
    label: 'Lista',
    description: 'Marcadores, números ou checklist',
    icon: 'list',
    group: 'text',
    keywords: 'itens topicos bullets checklist',
    defaults: () => ({ items: 'Primeiro item\nSegundo item', style: 'bullet' }),
    fields: [
      { key: 'items', kind: 'lines', label: 'Itens', hint: 'Um item por linha.', rows: 4 },
      { key: 'style', kind: 'segmented', label: 'Marcador', options: [{ value: 'bullet', label: '•' }, { value: 'ordered', label: '1.' }, { value: 'check', label: '✓' }] },
    ],
    summary: (b) => b.items.split('\n')[0],
  },

  quote: {
    label: 'Citação',
    description: 'Frase em destaque com autoria',
    icon: 'quote',
    group: 'text',
    keywords: 'frase depoimento',
    defaults: () => ({ text: 'Uma frase curta que resume a ideia principal.', author: '' }),
    fields: [
      { key: 'text', kind: 'rich', label: 'Frase', rows: 2 },
      { key: 'author', kind: 'text', label: 'Autoria (opcional)', plain: true },
    ],
    summary: (b) => b.text,
  },

  code: {
    label: 'Código ou texto de tela',
    description: 'Comandos, mensagens e configurações em fonte de máquina',
    icon: 'code',
    group: 'text',
    keywords: 'codigo comando terminal tela monoespacado script configuracao tecnico log',
    defaults: () => ({ title: '', text: 'Primeira linha\nSegunda linha', numbers: false }),
    fields: [
      { key: 'title', kind: 'text', label: 'Título (opcional)', plain: true, placeholder: 'Ex.: Comando no terminal' },
      { key: 'text', kind: 'code', label: 'Conteúdo', rows: 6, hint: 'Aparece exatamente como digitado, linha a linha.' },
      { key: 'numbers', kind: 'toggle', label: 'Numerar as linhas' },
    ],
    summary: (b) => b.title || b.text.split('\n')[0],
  },

  steps: {
    label: 'Passo a passo',
    description: 'Etapas numeradas ligadas por linha',
    icon: 'steps',
    group: 'structure',
    keywords: 'procedimento etapas tutorial como fazer',
    defaults: () => ({
      title: '',
      start: 1,
      tone: 'theme',
      items: [
        { title: 'Primeiro passo', text: 'Explique o que deve ser feito.' },
        { title: 'Segundo passo', text: 'Indique o resultado esperado.' },
      ],
    }),
    fields: [
      { key: 'title', kind: 'text', label: 'Título do grupo (opcional)', placeholder: 'Ex.: Fase 1 · Coleta no aplicativo' },
      { key: 'start', kind: 'number', label: 'Começar a numeração em', min: 1, max: 999 },
      { key: 'tone', kind: 'swatches', label: 'Cor', options: TONE_OPTIONS },
      {
        key: 'items', kind: 'items', label: 'Passos', itemLabel: 'Passo', max: 60, split: true,
        fields: [{ key: 'title', kind: 'text', label: 'Título' }, { key: 'text', kind: 'rich', label: 'Descrição', rows: 2 }],
        newItem: () => ({ title: '', text: '' }),
      },
    ],
    summary: (b) => b.title || `${b.items.length} passos`,
  },

  cards: {
    label: 'Cartões',
    description: 'Grade de 1 a 3 colunas com marcador',
    icon: 'cards',
    group: 'structure',
    keywords: 'grade colunas grid quem participa',
    defaults: () => ({
      columns: '2',
      marker: 'number',
      tone: 'theme',
      items: [
        { title: 'Primeiro ponto', text: 'Descrição curta do ponto.' },
        { title: 'Segundo ponto', text: 'Descrição curta do ponto.' },
      ],
    }),
    fields: [
      { key: 'columns', kind: 'segmented', label: 'Colunas', options: [{ value: '1', label: '1' }, { value: '2', label: '2' }, { value: '3', label: '3' }] },
      { key: 'marker', kind: 'segmented', label: 'Marcador', options: [{ value: 'number', label: '1' }, { value: 'letter', label: 'A' }, { value: 'check', label: '✓' }, { value: 'none', label: 'Nenhum' }] },
      { key: 'tone', kind: 'swatches', label: 'Cor', options: TONE_WITH_ALTERNATE },
      {
        key: 'items', kind: 'items', label: 'Cartões', itemLabel: 'Cartão', max: 30, split: true,
        fields: [{ key: 'title', kind: 'text', label: 'Título' }, { key: 'text', kind: 'rich', label: 'Texto', rows: 2 }],
        newItem: () => ({ title: '', text: '' }),
      },
    ],
    summary: (b) => b.items.map((i) => i.title).filter(Boolean).join(' · '),
  },

  flow: {
    label: 'Fluxo',
    description: 'Etapas lado a lado com setas',
    icon: 'flow',
    group: 'structure',
    keywords: 'processo fluxograma etapas setas',
    defaults: () => ({
      label: 'Etapa',
      tone: 'alternate',
      items: [
        { title: 'Solicitação', text: 'Quem inicia e onde.' },
        { title: 'Análise', text: 'O que é conferido.' },
        { title: 'Conclusão', text: 'Resultado entregue.' },
      ],
    }),
    fields: [
      { key: 'label', kind: 'text', label: 'Rótulo das etapas', placeholder: 'Ex.: Etapa, Fase', plain: true },
      { key: 'tone', kind: 'swatches', label: 'Cor', options: TONE_WITH_ALTERNATE },
      {
        key: 'items', kind: 'items', label: 'Etapas', itemLabel: 'Etapa', max: 16, split: true,
        fields: [{ key: 'title', kind: 'text', label: 'Título' }, { key: 'text', kind: 'rich', label: 'Texto', rows: 2 }],
        newItem: () => ({ title: '', text: '' }),
      },
    ],
    summary: (b) => b.items.map((i) => i.title).filter(Boolean).join(' → '),
  },

  timeline: {
    label: 'Linha do tempo',
    description: 'Marcos com data, em sequência',
    icon: 'timeline',
    group: 'structure',
    keywords: 'cronograma datas marcos prazos',
    defaults: () => ({
      title: '',
      tone: 'alternate',
      items: [
        { date: '06/10', title: 'Início', text: 'O que acontece nesta data.' },
        { date: '19/10', title: 'Transição', text: 'O que muda.' },
        { date: '26/10', title: 'Implantação plena', text: 'Regra definitiva.' },
      ],
    }),
    fields: [
      { key: 'title', kind: 'text', label: 'Título (opcional)' },
      { key: 'tone', kind: 'swatches', label: 'Cor', options: TONE_WITH_ALTERNATE },
      {
        key: 'items', kind: 'items', label: 'Marcos', itemLabel: 'Marco', max: 24,
        fields: [
          { key: 'date', kind: 'text', label: 'Data', plain: true },
          { key: 'title', kind: 'text', label: 'Título' },
          { key: 'text', kind: 'rich', label: 'Texto', rows: 2 },
        ],
        newItem: () => ({ date: '', title: '', text: '' }),
      },
    ],
    summary: (b) => b.items.map((i) => i.date).filter(Boolean).join(' · '),
  },

  toc: {
    label: 'Sumário',
    description: 'Lista automática das seções com página',
    icon: 'toc',
    group: 'structure',
    keywords: 'indice sumario neste manual',
    defaults: () => ({ title: 'Neste documento', columns: '2', style: 'lines' }),
    fields: [
      { key: 'title', kind: 'text', label: 'Título', plain: true },
      { key: 'columns', kind: 'segmented', label: 'Colunas', options: [{ value: '1', label: '1' }, { value: '2', label: '2' }] },
      // "Pontilhado" reproduz o sumário do próprio MIV (p. 4): título, pontos e número da página.
      { key: 'style', kind: 'segmented', label: 'Estilo', options: [{ value: 'lines', label: 'Linhas' }, { value: 'dots', label: 'Pontilhado (MIV)' }] },
    ],
    summary: (b) => b.title,
  },

  callout: {
    label: 'Destaque',
    description: 'Caixa de atenção, dica ou alerta',
    icon: 'callout',
    group: 'highlight',
    keywords: 'aviso atencao alerta dica nota importante caixa',
    defaults: () => ({ tone: 'warning', title: 'Atenção', text: 'Explique o ponto que merece cuidado.' }),
    fields: [
      { key: 'tone', kind: 'segmented', label: 'Tipo', options: CALLOUT_TONES },
      { key: 'title', kind: 'text', label: 'Título (opcional)' },
      { key: 'text', kind: 'rich', label: 'Texto', rows: 3 },
    ],
    summary: (b) => b.title || b.text,
  },

  message: {
    label: 'Mensagem do sistema',
    description: 'Texto exato exibido na tela, entre aspas',
    icon: 'message',
    group: 'highlight',
    keywords: 'erro tela aviso sistema mensagem',
    defaults: () => ({ label: 'Mensagem do sistema', text: 'Texto exatamente como aparece na tela.', tone: 'info' }),
    fields: [
      { key: 'label', kind: 'text', label: 'Rótulo', placeholder: 'Ex.: Mensagem na tela', plain: true },
      { key: 'text', kind: 'rich', label: 'Mensagem', rows: 2 },
      { key: 'tone', kind: 'segmented', label: 'Tipo', options: CALLOUT_TONES },
    ],
    summary: (b) => b.text,
  },

  faq: {
    label: 'Pergunta e resposta',
    description: 'Dúvidas comuns em duas colunas',
    icon: 'faq',
    group: 'highlight',
    keywords: 'duvida faq pergunta resposta',
    defaults: () => ({
      questionLabel: 'Dúvida comum',
      answerLabel: 'Resposta',
      tone: 'teal',
      items: [{ question: 'Qual é a dúvida mais frequente?', answer: 'Responda de forma direta, indicando onde conferir.' }],
    }),
    fields: [
      { key: 'questionLabel', kind: 'text', label: 'Rótulo da pergunta', plain: true },
      { key: 'answerLabel', kind: 'text', label: 'Rótulo da resposta', plain: true },
      { key: 'tone', kind: 'swatches', label: 'Cor', options: TONE_OPTIONS },
      {
        key: 'items', kind: 'items', label: 'Perguntas', itemLabel: 'Pergunta', max: 40, split: true,
        fields: [{ key: 'question', kind: 'rich', label: 'Pergunta', rows: 2 }, { key: 'answer', kind: 'rich', label: 'Resposta', rows: 2 }],
        newItem: () => ({ question: '', answer: '' }),
      },
    ],
    summary: (b) => b.items[0]?.question ?? '',
  },

  chips: {
    label: 'Etiquetas',
    description: 'Palavras-chave em pílulas',
    icon: 'tag',
    group: 'highlight',
    keywords: 'tags chips categorias',
    defaults: () => ({ label: '', items: 'Opção A\nOpção B\n~~Não se aplica~~', tone: 'theme' }),
    fields: [
      { key: 'label', kind: 'text', label: 'Título (opcional)' },
      { key: 'items', kind: 'lines', label: 'Etiquetas', hint: 'Uma por linha. Use ~~texto~~ para riscar.', rows: 3 },
      { key: 'tone', kind: 'swatches', label: 'Cor', options: TONE_OPTIONS },
    ],
    summary: (b) => b.items.split('\n').join(' · '),
  },

  table: {
    label: 'Tabela',
    description: 'Linhas e colunas; aceita colar do Excel',
    icon: 'table',
    group: 'data',
    keywords: 'planilha grade colunas excel',
    defaults: () => ({
      header: ['Item', 'Descrição'],
      rows: [['Primeiro', 'Detalhe do primeiro item'], ['Segundo', 'Detalhe do segundo item']],
      tone: 'navy',
      zebra: true,
      keyColumn: true,
      note: '',
    }),
    fields: [
      { key: 'table', kind: 'table', label: 'Conteúdo' },
      { key: 'tone', kind: 'swatches', label: 'Cabeçalho', options: TABLE_TONES },
      { key: 'zebra', kind: 'toggle', label: 'Linhas alternadas' },
      { key: 'keyColumn', kind: 'toggle', label: 'Primeira coluna em destaque' },
      { key: 'note', kind: 'text', label: 'Nota abaixo da tabela (opcional)' },
    ],
    summary: (b) => b.header.join(' · '),
  },

  stats: {
    label: 'Indicadores',
    description: 'Números em destaque ou fichas',
    icon: 'stats',
    group: 'data',
    keywords: 'kpi numeros metricas ficha resumo',
    defaults: () => ({
      style: 'kpi',
      tone: 'alternate',
      items: [
        { value: '5', label: 'Evidências', sub: 'chassi e 4 fotos' },
        { value: '4', label: 'Condições', sub: 'para a coleta reduzida' },
        { value: '26/10', label: 'Implantação', sub: 'regra obrigatória' },
      ],
    }),
    fields: [
      { key: 'style', kind: 'segmented', label: 'Estilo', options: [{ value: 'kpi', label: 'Números grandes' }, { value: 'sheet', label: 'Fichas' }] },
      { key: 'tone', kind: 'swatches', label: 'Cor', options: TONE_WITH_ALTERNATE },
      {
        key: 'items', kind: 'items', label: 'Indicadores', itemLabel: 'Indicador', max: 16, inline: true,
        fields: [
          { key: 'value', kind: 'text', label: 'Valor' },
          { key: 'label', kind: 'text', label: 'Rótulo' },
          { key: 'sub', kind: 'text', label: 'Complemento' },
        ],
        newItem: () => ({ value: '', label: '', sub: '' }),
      },
    ],
    summary: (b) => b.items.map((i) => i.value).filter(Boolean).join(' · '),
  },

  glossary: {
    label: 'Glossário',
    description: 'Termos e definições numa caixa',
    icon: 'book',
    group: 'data',
    keywords: 'termos definicoes siglas',
    defaults: () => ({
      title: 'Glossário rápido',
      tone: 'navy',
      items: [{ term: 'Termo', definition: 'Definição curta e objetiva.' }],
    }),
    fields: [
      { key: 'title', kind: 'text', label: 'Título', plain: true },
      { key: 'tone', kind: 'swatches', label: 'Cor', options: TONE_OPTIONS },
      {
        key: 'items', kind: 'items', label: 'Termos', itemLabel: 'Termo', max: 80, split: true,
        fields: [{ key: 'term', kind: 'text', label: 'Termo', plain: true }, { key: 'definition', kind: 'rich', label: 'Definição', rows: 2 }],
        newItem: () => ({ term: '', definition: '' }),
      },
    ],
    summary: (b) => b.items.map((i) => i.term).filter(Boolean).join(' · '),
  },

  image: {
    label: 'Imagem',
    description: 'Print ou foto com legenda numerada',
    icon: 'image',
    group: 'media',
    keywords: 'figura print foto captura tela',
    defaults: () => ({ assetId: '', caption: '', width: 100, align: 'center', ratio: 'original', fit: 'cover', focus: 'center', frame: true }),
    fields: [
      { key: 'assetId', kind: 'image', label: 'Imagem' },
      { key: 'caption', kind: 'text', label: 'Legenda', placeholder: 'Ex.: Tela de confirmação dos dados' },
      { key: 'width', kind: 'range', label: 'Largura', min: 25, max: 100, step: 5, unit: '%' },
      { key: 'align', kind: 'segmented', label: 'Alinhamento', options: [{ value: 'left', label: 'Esquerda' }, { value: 'center', label: 'Centro' }, { value: 'right', label: 'Direita' }] },
      // Formato fixo recorta (preencher) ou encaixa a imagem; "Original" mantém a proporção do arquivo.
      { key: 'ratio', kind: 'segmented', label: 'Formato', options: IMAGE_RATIOS.map(({ value, label }) => ({ value, label })) },
      { key: 'fit', kind: 'segmented', label: 'No formato escolhido', options: [{ value: 'cover', label: 'Preencher (corta as bordas)' }, { value: 'contain', label: 'Encaixar (imagem inteira)' }] },
      { key: 'focus', kind: 'segmented', label: 'Parte que aparece ao cortar', options: [{ value: 'top', label: 'Topo' }, { value: 'center', label: 'Centro' }, { value: 'bottom', label: 'Base' }] },
      { key: 'frame', kind: 'toggle', label: 'Moldura fina' },
    ],
    summary: (b) => b.caption || (b.assetId ? 'Imagem' : 'Sem imagem'),
  },

  divider: {
    label: 'Divisor',
    description: 'Linha, faixa colorida, grafismo do MIV ou espaço',
    icon: 'divider',
    group: 'page',
    keywords: 'separador linha espaco',
    defaults: () => ({ style: 'line' }),
    fields: [
      { key: 'style', kind: 'segmented', label: 'Estilo', options: [{ value: 'line', label: 'Linha' }, { value: 'accent', label: 'Traço colorido' }, { value: 'brand', label: 'Faixa' }, { value: 'wedge', label: 'Grafismo' }, { value: 'space', label: 'Espaço' }] },
    ],
    summary: () => '',
  },

  pagebreak: {
    label: 'Quebra de página',
    description: 'O próximo bloco começa em nova página, em pé ou deitada',
    icon: 'pagebreak',
    group: 'page',
    keywords: 'nova pagina salto paisagem horizontal deitada retrato orientacao tabela larga',
    defaults: () => ({ orientation: 'portrait' }),
    fields: [
      {
        key: 'orientation', kind: 'segmented', label: 'Páginas seguintes',
        hint: 'Paisagem serve para tabelas largas, fluxos e prints. Para voltar a retrato, use outra quebra de página.',
        options: [{ value: 'portrait', label: 'Retrato (em pé)' }, { value: 'landscape', label: 'Paisagem (deitada)' }],
      },
    ],
    summary: (b) => (b.orientation === 'landscape' ? 'Páginas seguintes em paisagem' : 'Páginas seguintes em retrato'),
  },
};

export const blockTypeIds = () => Object.keys(BLOCK_TYPES);

/**
 * Intenções semânticas: o autor (pessoa ou agente de IA) diz *o que* o
 * conteúdo é — "warning", "procedure", "screenshot" — e o sistema decide a
 * aparência. Um bloco `{ "intent": "warning", "text": "…" }` vira o tipo e as
 * opções abaixo; campos informados explicitamente prevalecem.
 */
export const BLOCK_INTENTS = {
  'important-information': { description: 'Informação que o leitor não pode perder', block: { type: 'callout', tone: 'info', title: 'Importante' } },
  warning: { description: 'Cuidado, condição ou exceção que pode causar erro', block: { type: 'callout', tone: 'warning', title: 'Atenção' } },
  danger: { description: 'Risco, bloqueio, penalidade ou ação irreversível', block: { type: 'callout', tone: 'danger', title: 'Alerta' } },
  tip: { description: 'Atalho, boa prática ou sugestão opcional', block: { type: 'callout', tone: 'tip', title: 'Dica' } },
  success: { description: 'Confirmação de que deu certo / resultado esperado', block: { type: 'callout', tone: 'success', title: 'Pronto' } },
  example: { description: 'Exemplo concreto que ilustra a regra', block: { type: 'callout', tone: 'tip', title: 'Exemplo' } },
  note: { description: 'Observação secundária, em letra menor', block: { type: 'paragraph', style: 'note' } },
  lead: { description: 'Parágrafo de abertura, maior, que resume a seção', block: { type: 'paragraph', style: 'lead' } },
  procedure: { description: 'Sequência de ações numeradas que o leitor executa', block: { type: 'steps' } },
  requirement: { description: 'Requisitos, documentos exigidos, condições (checklist)', block: { type: 'list', style: 'check' } },
  comparison: { description: 'Antes × depois, opção A × opção B', block: { type: 'cards', columns: '2', marker: 'none', tone: 'alternate' } },
  screenshot: { description: 'Print de tela com legenda (vira "Figura N")', block: { type: 'image', frame: true, ratio: 'original', width: 100 } },
  photo: { description: 'Foto ilustrativa, sem moldura', block: { type: 'image', frame: false } },
  'system-message': { description: 'Texto exato exibido por um sistema', block: { type: 'message', tone: 'info' } },
  'error-message': { description: 'Mensagem de erro exata exibida por um sistema', block: { type: 'message', tone: 'danger', label: 'Mensagem de erro' } },
  faq: { description: 'Dúvidas frequentes com resposta', block: { type: 'faq' } },
  schedule: { description: 'Datas, prazos, marcos de implantação', block: { type: 'timeline' } },
  process: { description: 'Visão geral de um fluxo em poucas etapas, lado a lado', block: { type: 'flow' } },
  'key-figures': { description: 'Números que resumem o assunto', block: { type: 'stats', style: 'kpi' } },
  definitions: { description: 'Termos, siglas e definições', block: { type: 'glossary' } },
  command: { description: 'Comandos, códigos, configurações, texto de tela literal', block: { type: 'code' } },
  chapter: { description: 'Início de um novo assunto (título numerado em nova página)', block: { type: 'section', newPage: true } },
  'chapter-opener': { description: 'Página inteira de abertura de capítulo (use com moderação)', block: { type: 'section', newPage: true, opener: true } },
  'table-of-contents': { description: 'Sumário automático com páginas', block: { type: 'toc' } },
  'new-page': { description: 'Força o próximo conteúdo em nova página', block: { type: 'pagebreak' } },
  'landscape-pages': { description: 'Páginas seguintes deitadas (tabelas largas, prints largos)', block: { type: 'pagebreak', orientation: 'landscape' } },
};

/** Troca `intent` pelo tipo e opções correspondentes (campos explícitos prevalecem). */
export function expandIntent(raw) {
  if (!raw || typeof raw !== 'object' || raw.intent == null) return raw;
  const { intent, ...rest } = raw;
  if (rest.type) return rest;
  const definition = BLOCK_INTENTS[intent];
  return definition ? { ...definition.block, ...rest } : raw;
}


export function createBlock(type, overrides = {}) {
  const definition = BLOCK_TYPES[type];
  if (!definition) throw new Error(`Tipo de bloco desconhecido: ${type}`);
  return normalizeBlock({ ...definition.defaults(), ...overrides, type, id: uid('b') });
}

export function blockSummary(block) {
  const definition = BLOCK_TYPES[block.type];
  return stripMarkup(definition?.summary(block) ?? '').slice(0, 120);
}

/* ------------------------------------------------------------------ normalização */
export const BLOCK_ID = /^[\w-]{1,40}$/;
const asString = (value, fallback = '') => (typeof value === 'string' ? value : typeof value === 'number' ? String(value) : fallback);
export const MAX_TEXT = 20000;
/** Limites de tabela aplicados na normalização (também lidos pela validação). */
export const TABLE_LIMITS = Object.freeze({ columns: 12, rows: 400, headerCell: 500, cell: 4000 });

/**
 * Tamanho máximo do texto num caminho do bloco ("text", "rows.2.1"…). O
 * editor respeita os mesmos limites da importação: sem isso, um texto maior
 * seria salvo e cortado em silêncio ao reabrir o documento.
 */
export function textLimit(block, path) {
  if (block?.type === 'table') {
    if (path.startsWith('header.')) return TABLE_LIMITS.headerCell;
    if (path.startsWith('rows.')) return TABLE_LIMITS.cell;
  }
  return MAX_TEXT;
}

function normalizeField(field, value, fallback) {
  switch (field.kind) {
    case 'toggle':
      return typeof value === 'boolean' ? value : Boolean(fallback);
    case 'number':
      return Number.isFinite(Number(value)) ? clamp(Math.round(Number(value)), field.min ?? 0, field.max ?? 9999) : fallback;
    case 'range':
      return Number.isFinite(Number(value)) ? clamp(Number(value), field.min, field.max) : fallback;
    case 'swatches':
    case 'segmented':
      return field.options.some((option) => option.value === String(value)) ? String(value) : fallback;
    case 'items': {
      const list = Array.isArray(value) ? value : fallback;
      return list.slice(0, field.max ?? 100).map((item) => {
        const blank = field.newItem();
        const source = item && typeof item === 'object' ? item : {};
        return Object.fromEntries(Object.keys(blank).map((key) => [key, asString(source[key]).slice(0, MAX_TEXT)]));
      });
    }
    case 'image':
      return asString(value, '').slice(0, 64);
    default:
      return asString(value, fallback).slice(0, MAX_TEXT);
  }
}

/** Garante que um bloco (novo ou importado) tenha todos os campos com tipos válidos. */
export function normalizeBlock(input) {
  const raw = expandIntent(input);
  const definition = BLOCK_TYPES[raw?.type];
  if (!definition) return null;
  const defaults = definition.defaults();
  // Ids estáveis vêm de fora (arquivos, agentes de IA): só letras, números, _ e -.
  const block = { id: typeof raw.id === 'string' && BLOCK_ID.test(raw.id) ? raw.id : uid('b'), type: raw.type };

  for (const field of definition.fields) {
    if (field.kind === 'table') continue;
    block[field.key] = normalizeField(field, raw[field.key], defaults[field.key]);
  }

  if (raw.type === 'table') {
    const header = Array.isArray(raw.header) && raw.header.length ? raw.header : defaults.header;
    const columns = clamp(header.length, 1, TABLE_LIMITS.columns);
    block.header = Array.from({ length: columns }, (_, i) => asString(header[i]).slice(0, TABLE_LIMITS.headerCell));
    const rows = Array.isArray(raw.rows) ? raw.rows : defaults.rows;
    block.rows = rows.slice(0, TABLE_LIMITS.rows).map((row) =>
      Array.from({ length: columns }, (_, i) => asString(Array.isArray(row) ? row[i] : '').slice(0, TABLE_LIMITS.cell)));
  }
  return block;
}

/* ------------------------------------------------------------------ transformar e copiar */
/** Tipos de texto entre os quais um bloco pode ser transformado sem perder o conteúdo. */
export const TEXT_BLOCK_TYPES = ['paragraph', 'heading', 'section', 'list', 'quote', 'callout', 'message'];

/** Título e corpo de um bloco de texto, para levá-los a outro tipo. */
function textParts(block) {
  switch (block.type) {
    case 'heading': return { title: block.text, body: '' };
    case 'section': return { title: block.title, body: block.intro };
    case 'list': return { title: '', body: block.items };
    case 'callout': return { title: block.title, body: block.text };
    default: return { title: '', body: block.text ?? '' };
  }
}

/**
 * Transforma um bloco de texto em outro tipo (ex.: parágrafo → destaque),
 * mantendo o texto e o identificador. Retorna null se a troca não se aplica.
 */
export function transformBlock(block, type) {
  if (!TEXT_BLOCK_TYPES.includes(block.type) || !TEXT_BLOCK_TYPES.includes(type) || block.type === type) return null;
  const { title, body } = textParts(block);
  const all = [title, body].filter((part) => part.trim()).join('\n');
  const [first = '', ...rest] = all.split('\n');
  const props = {
    paragraph: () => ({ text: all }),
    heading: () => ({ text: all.replace(/\s*\n\s*/g, ' ') }),
    section: () => (title ? { title, intro: body } : { title: first, intro: rest.join('\n').trim() }),
    list: () => ({ items: all }),
    quote: () => ({ text: all }),
    callout: () => (body.trim() ? { title, text: body } : { title: '', text: title }),
    message: () => ({ text: all }),
  }[type]();
  return { ...createBlock(type, props), id: block.id };
}

/** Texto puro de um bloco (sem marcações), para copiar; tabelas saem com tabulação (colam no Excel). */
export function blockPlainText(block) {
  const definition = BLOCK_TYPES[block.type];
  // Campos simples (`plain`) e código são texto literal; os demais têm marcação a remover.
  const clean = (value, field) => (field.plain || field.kind === 'code'
    ? value
    : value.split('\n').map((line) => stripMarkup(line)).join('\n'));
  const parts = [];
  for (const field of definition?.fields ?? []) {
    const value = block[field.key];
    if (['text', 'rich', 'lines', 'code'].includes(field.kind) && value) parts.push(clean(value, field));
    else if (field.kind === 'items') {
      value.forEach((item) => parts.push(field.fields.map((sub) => item[sub.key] && clean(item[sub.key], sub)).filter(Boolean).join(' — ')));
    } else if (field.kind === 'table') {
      parts.push([block.header, ...block.rows].map((row) => row.map((cell) => stripMarkup(cell)).join('\t')).join('\n'));
    }
  }
  return parts.filter(Boolean).join('\n\n');
}
