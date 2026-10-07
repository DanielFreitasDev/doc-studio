/**
 * Catálogo do sistema para agentes de IA e ferramentas: tudo o que um
 * documento pode usar, montado a partir das mesmas definições do editor
 * (tipos de bloco, opções de design, modelos, estilos, operações e regras da
 * marca). A ferramenta `tools/docstudio.mjs` gera daqui os esquemas JSON e o
 * `docs/ai/COMPONENT_CATALOG.md`, então a documentação nunca diverge do app.
 *
 * `COMPONENT_GUIDE` acrescenta o que o catálogo do editor não diz: a
 * finalidade de cada bloco, quando usar, quando evitar e como ele se divide
 * entre páginas no PDF.
 */
import { BLOCK_TYPES, BLOCK_GROUPS, BLOCK_INTENTS, CALLOUT_TONES, TONE_OPTIONS, MAX_TEXT, TABLE_LIMITS } from './schema.js';
import { THEMES, COVERS, BACK_COVERS, DESIGN_OPTIONS, DESIGN_PRESETS, DEFAULT_DESIGN, DEFAULT_META, META_GROUPS, PAGE_GEOMETRY } from './design.js';
import { TEMPLATES, TEMPLATE_CATEGORIES, SNIPPETS } from './templates.js';
import { OPERATIONS, POSITION_FORMS, OPERATIONS_FORMAT, OPERATIONS_VERSION } from './operations.js';
import { FILE_FORMAT, FILE_VERSION, MAX_BLOCKS } from './model.js';
import { BRAND_SOURCE, GRAPHIC_PALETTE, SIGNATURE_COLORS, DERIVED_COLORS, TYPOGRAPHY, LOGOS, BRAND_RULES } from './brand.js';
import { IMAGE_PPI } from './validate.js';

export const COMPONENT_GUIDE = {
  section: {
    use: 'Abrir cada assunto principal (capítulo). Alimenta o sumário e recebe número automático.',
    avoid: 'Subdivisões dentro de um assunto (use Subtítulo). Seções sem conteúdo.',
    pdf: 'Nunca fica sozinha no pé da página. "newPage" começa em folha nova; "opener" cria uma página inteira de abertura.',
  },
  heading: {
    use: 'Subdividir uma seção ("Quem participa", "Documentos exigidos").',
    avoid: 'Títulos de capítulo (use Seção) ou frases longas.',
    pdf: 'Fica sempre junto do bloco seguinte.',
  },
  paragraph: {
    use: 'Texto corrido explicativo, curto (3 a 6 linhas). Estilo "lead" abre a seção; "note" é observação menor.',
    avoid: 'Sequências de ações (Passo a passo), requisitos (Lista ✓), avisos (Destaque), comparações (Cartões/Tabela).',
    pdf: 'Linhas em branco separam parágrafos; um parágrafo longo continua na página seguinte, linha a linha (mínimo 2 linhas de cada lado).',
  },
  list: {
    use: 'Itens curtos e paralelos: marcadores, números ou checklist (style "check" para requisitos e documentos exigidos).',
    avoid: 'Ações com explicação (Passo a passo) e itens com título + texto (Cartões).',
    pdf: 'Cada item é uma unidade; a lista pode continuar na página seguinte entre itens.',
  },
  quote: {
    use: 'Frase de efeito, depoimento ou citação de norma com autoria.',
    avoid: 'Avisos (Destaque) ou texto comum.',
    pdf: 'Não se divide entre páginas.',
  },
  code: {
    use: 'Comandos, códigos, configurações, caminhos de menu e texto de tela literal (fonte de máquina, espaços preservados).',
    avoid: 'Mensagens curtas exibidas ao usuário (use Mensagem do sistema).',
    pdf: 'Cada linha é uma unidade; continua na página seguinte entre linhas.',
  },
  steps: {
    use: 'Procedimentos: ações numeradas que o leitor executa, cada uma com título curto (verbo no imperativo) e explicação.',
    avoid: 'Itens sem ordem (Lista ou Cartões) e visão geral de fluxo (Fluxo).',
    pdf: 'Cada passo é uma unidade; o passo a passo continua na página seguinte entre passos. Use "start" para continuar a numeração.',
  },
  cards: {
    use: 'Grupos de 2 a 6 itens com título e texto: papéis ("Quem participa"), opções, comparação antes × depois.',
    avoid: 'Sequências (Passo a passo) ou dados tabulares (Tabela).',
    pdf: 'Cada linha da grade é uma unidade.',
  },
  flow: {
    use: 'Visão geral de um processo em 3 a 5 etapas lado a lado, com setas.',
    avoid: 'Instruções detalhadas (Passo a passo) ou mais de 6 etapas.',
    pdf: 'Cada linha de etapas é uma unidade.',
  },
  timeline: {
    use: 'Datas, prazos e marcos de implantação.',
    avoid: 'Sequências sem data.',
    pdf: 'Cada linha de marcos é uma unidade.',
  },
  toc: {
    use: 'Sumário automático em documentos com 3 ou mais seções; normalmente logo após a apresentação.',
    avoid: 'Documentos curtos ou sem blocos Seção.',
    pdf: 'Não se divide; os números de página são preenchidos na paginação.',
  },
  callout: {
    use: 'Avisos com intenção: info (importante), warning (atenção), danger (alerta/risco), tip (dica), success (confirmação). Use poucos por página.',
    avoid: 'Destacar texto comum; vários destaques seguidos perdem o efeito.',
    pdf: 'Não se divide entre páginas; mantenha o texto curto.',
  },
  message: {
    use: 'Texto exato que um sistema mostra na tela (erros, confirmações), entre aspas.',
    avoid: 'Avisos do próprio manual (Destaque).',
    pdf: 'Não se divide entre páginas.',
  },
  faq: {
    use: 'Dúvidas comuns e situações frequentes com resposta direta.',
    avoid: 'Conteúdo principal do procedimento.',
    pdf: 'Cada pergunta é uma unidade.',
  },
  chips: {
    use: 'Etiquetas curtas: categorias, opções disponíveis, status; ~~risque~~ o que não se aplica.',
    avoid: 'Frases longas.',
    pdf: 'Não se divide entre páginas.',
  },
  table: {
    use: 'Dados comparáveis em linhas e colunas (normas, prazos, campos e valores). Até 12 colunas; tabelas largas ficam melhores em páginas paisagem.',
    avoid: 'Texto longo em células e listas simples.',
    pdf: 'Cada linha é uma unidade; a tabela continua na página seguinte repetindo o cabeçalho.',
  },
  stats: {
    use: 'Até 4 números que resumem o assunto (kpi) ou fichas com valor e rótulo (sheet).',
    avoid: 'Números sem contexto.',
    pdf: 'Cada linha de indicadores é uma unidade.',
  },
  glossary: {
    use: 'Termos, siglas e definições.',
    avoid: 'Explicações longas.',
    pdf: 'Cada termo é uma unidade; a caixa continua na página seguinte.',
  },
  image: {
    use: 'Prints de tela e fotos. Com legenda vira "Figura N" e a legenda é o texto alternativo. Prints: moldura e largura 100% (ou 60–80% para prints de celular).',
    avoid: 'Imagens decorativas sem função; imagens com menos de 150 ppi no tamanho impresso.',
    pdf: 'Não se divide; a imagem mantém a resolução original (até 3508 px) e o PDF a embute sem perda.',
  },
  divider: {
    use: 'Separar visualmente partes de uma seção ("wedge" = grafismo do MIV; "space" = respiro).',
    avoid: 'Separar capítulos (use Seção).',
    pdf: 'Não se divide.',
  },
  pagebreak: {
    use: 'Forçar nova página; "orientation": "landscape" deixa as páginas seguintes deitadas (tabelas largas), outra quebra em "portrait" volta.',
    avoid: 'Ajustar espaçamento: a paginação já evita títulos órfãos e buracos.',
    pdf: 'A capa, a contracapa e as aberturas são sempre em retrato.',
  },
};

/** Descrição de cada campo para agentes: tipo JSON, valores e limites. */
function describeField(field) {
  const base = { key: field.key, label: field.label };
  switch (field.kind) {
    case 'toggle': return { ...base, type: 'boolean' };
    case 'number':
    case 'range': return { ...base, type: 'number', min: field.min, max: field.max, ...(field.unit ? { unit: field.unit } : {}) };
    case 'segmented':
    case 'swatches': return { ...base, type: 'enum', values: field.options.map(({ value, label }) => ({ value, label })) };
    case 'image': return { ...base, type: 'asset-id', note: 'id de uma imagem em "assets" do arquivo' };
    case 'items': return {
      ...base, type: 'items', max: field.max,
      itemFields: field.fields.map((sub) => ({ key: sub.key, label: sub.label, type: 'string', formatting: sub.kind === 'rich' || (sub.kind === 'text' && !sub.plain) })),
    };
    case 'table': return { key: 'header/rows', label: field.label, type: 'table', note: `header: lista de títulos; rows: lista de linhas (listas de células). Até ${TABLE_LIMITS.columns} colunas e ${TABLE_LIMITS.rows} linhas; células aceitam formatação.` };
    case 'lines': return { ...base, type: 'string', note: 'um item por linha (\\n)', formatting: !field.plain };
    case 'code': return { ...base, type: 'string', note: 'texto literal, sem formatação; linhas com \\n' };
    default: return { ...base, type: 'string', formatting: field.kind === 'rich' || !field.plain, maxLength: MAX_TEXT };
  }
}

const optionList = (options) => options.map((o) => ({ id: o.id ?? o.value, label: o.label, ...(o.description ? { description: o.description } : {}) }));

/** Catálogo completo (objeto JSON), fonte de `schemas/catalog.json` e do COMPONENT_CATALOG.md. */
export function buildCatalog() {
  return {
    generatedFrom: 'js/catalog.js (mesmas definições do editor)',
    file: { format: FILE_FORMAT, version: FILE_VERSION, maxBlocks: MAX_BLOCKS },
    operations: { format: OPERATIONS_FORMAT, version: OPERATIONS_VERSION, positions: POSITION_FORMS, list: OPERATIONS },
    formatting: {
      markers: { bold: '**texto**', italic: '*texto*', underline: '++texto++', strike: '~~texto~~', highlight: '==texto==', code: '`texto`', link: '[texto](https://…)' },
      note: 'Só nos campos com "formatting": true. HTML não é interpretado (aparece como texto). Links: https://, http://, mailto: e tel:. Escape um marcador com \\ (ex.: \\*).',
    },
    page: PAGE_GEOMETRY,
    groups: BLOCK_GROUPS,
    components: Object.entries(BLOCK_TYPES).map(([type, def]) => ({
      type,
      label: def.label,
      description: def.description,
      group: def.group,
      ...COMPONENT_GUIDE[type],
      fields: def.fields.map(describeField),
      defaults: def.defaults(),
    })),
    intents: Object.entries(BLOCK_INTENTS).map(([id, intent]) => ({ id, description: intent.description, becomes: intent.block })),
    calloutTones: CALLOUT_TONES.map(({ value, label }) => ({ value, label })),
    tones: TONE_OPTIONS.map(({ value, label }) => ({ value, label })),
    design: {
      defaults: DEFAULT_DESIGN,
      themes: THEMES.map(({ id, label, colors }) => ({ id, label, colors })),
      covers: optionList(COVERS),
      backCovers: optionList(BACK_COVERS),
      ...Object.fromEntries(Object.entries(DESIGN_OPTIONS).map(([key, options]) => [key, optionList(options)])),
      booleans: { numberSections: 'numera as seções (01, 02…)', countCover: 'a capa conta como página 1' },
      assets: { customLogo: 'id da imagem do logo (com signature "custom")', coverImage: 'id da foto (com cover "photo")' },
    },
    presets: DESIGN_PRESETS.map(({ id, label, description, design }) => ({ id, label, description, design })),
    meta: {
      // A versão padrão traz o mês corrente; no catálogo fica um marcador para o arquivo não mudar todo mês.
      defaults: { ...DEFAULT_META, version: 'Versão 1.0 · <mês e ano de criação>' },
      fields: META_GROUPS.flatMap((group) => group.fields.map((f) => ({ key: f.key, group: group.title, label: f.label, multiline: f.kind === 'lines' }))),
      note: 'Textos fixos sem formatação; \\n quebra a linha onde o campo aceita várias linhas.',
    },
    templateCategories: TEMPLATE_CATEGORIES.map(({ id, label, description }) => ({ id, label, description })),
    templates: TEMPLATES.map((t) => ({
      id: t.id, name: t.name, description: t.description, kind: t.group === 'blank' ? 'start' : 'model',
      ...(t.category ? { category: t.category } : {}),
      blocks: t.blocks.length, design: t.design,
    })),
    snippets: SNIPPETS.map(({ id, name, description, blocks }) => ({ id, name, description, blocks })),
    images: { minimumPpi: IMAGE_PPI.minimum, idealPpi: IMAGE_PPI.ideal, maxPixels: 3508, types: ['png', 'jpeg', 'webp', 'gif', 'svg'] },
  };
}

/** Regras da marca (objeto JSON), fonte de `schemas/brand.json`. */
export function buildBrand() {
  return {
    source: BRAND_SOURCE,
    typography: TYPOGRAPHY,
    graphicPalette: GRAPHIC_PALETTE,
    signatureColors: SIGNATURE_COLORS,
    derivedColors: DERIVED_COLORS,
    logos: LOGOS,
    signatures: optionList(DESIGN_OPTIONS.signature),
    rules: BRAND_RULES,
  };
}
