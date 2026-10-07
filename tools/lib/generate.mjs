/**
 * Gera os artefatos legíveis por máquina e por agentes a partir das mesmas
 * definições do editor (nunca à mão):
 *
 * - schemas/document.schema.json   — JSON Schema (2020-12) do arquivo .docstudio.json
 * - schemas/operations.schema.json — JSON Schema do arquivo de alterações (.ops.json)
 * - schemas/catalog.json           — componentes, intenções, opções de design, modelos...
 * - schemas/brand.json             — regras da marca derivadas do MIV
 * - docs/ai/COMPONENT_CATALOG.md   — o catálogo em texto, para leitura por agentes
 */
import { BLOCK_TYPES, BLOCK_INTENTS, MAX_TEXT, TABLE_LIMITS } from '../../js/schema.js';
import { THEMES, COVERS, BACK_COVERS, DESIGN_OPTIONS, DEFAULT_META, DESIGN_PRESETS } from '../../js/design.js';
import { FILE_FORMAT, FILE_VERSION, MAX_BLOCKS } from '../../js/model.js';
import { OPERATIONS, OPERATIONS_FORMAT, OPERATIONS_VERSION } from '../../js/operations.js';
import { buildCatalog, buildBrand } from '../../js/catalog.js';

const SCHEMA = 'https://json-schema.org/draft/2020-12/schema';
const ID_PATTERN = '^[\\w-]{1,40}$';
const ASSET_PATTERN = '^[\\w-]{0,64}$';
const text = { type: 'string', maxLength: MAX_TEXT };

function fieldSchema(field) {
  switch (field.kind) {
    case 'toggle': return { type: 'boolean', description: field.label };
    case 'number': return { type: 'integer', minimum: field.min, maximum: field.max, description: field.label };
    case 'range': return { type: 'number', minimum: field.min, maximum: field.max, description: field.label };
    case 'segmented':
    case 'swatches': return { enum: field.options.map((o) => o.value), description: `${field.label}: ${field.options.map((o) => `${o.value} = ${o.label}`).join('; ')}` };
    case 'image': return { type: 'string', pattern: ASSET_PATTERN, description: 'id de uma imagem em "assets" ("" = sem imagem)' };
    case 'items': return {
      type: 'array',
      maxItems: field.max,
      description: field.label,
      items: {
        type: 'object',
        additionalProperties: false,
        properties: Object.fromEntries(field.fields.map((sub) => [sub.key, { ...text, description: sub.label }])),
      },
    };
    default: return { ...text, description: field.label };
  }
}

function blockSchema(type, definition) {
  const properties = { id: { type: 'string', pattern: ID_PATTERN, description: 'id estável (opcional; criado se faltar)' }, type: { const: type } };
  for (const field of definition.fields) {
    if (field.kind === 'table') {
      properties.header = { type: 'array', minItems: 1, maxItems: TABLE_LIMITS.columns, items: { type: 'string', maxLength: TABLE_LIMITS.headerCell }, description: 'títulos das colunas' };
      properties.rows = { type: 'array', maxItems: TABLE_LIMITS.rows, items: { type: 'array', items: { type: 'string', maxLength: TABLE_LIMITS.cell } }, description: 'linhas (listas de células, mesmo número de colunas do cabeçalho)' };
    } else {
      properties[field.key] = fieldSchema(field);
    }
  }
  return { title: `${definition.label} — ${definition.description}`, type: 'object', required: ['type'], additionalProperties: false, properties };
}

export function documentSchema() {
  const blocks = Object.entries(BLOCK_TYPES).map(([type, def]) => ({ $ref: `#/$defs/block-${type}` }));
  const intentBlock = {
    title: 'Bloco por intenção semântica (o sistema escolhe o tipo e as opções)',
    type: 'object',
    required: ['intent'],
    not: { required: ['type'] },
    properties: { intent: { enum: Object.keys(BLOCK_INTENTS) }, id: { type: 'string', pattern: ID_PATTERN } },
  };
  const designProperties = {
    theme: { enum: THEMES.map((t) => t.id) },
    cover: { enum: COVERS.map((c) => c.id) },
    backCover: { enum: BACK_COVERS.map((c) => c.id) },
    ...Object.fromEntries(Object.entries(DESIGN_OPTIONS).map(([key, options]) => [key, { enum: options.map((o) => o.value) }])),
    numberSections: { type: 'boolean' },
    countCover: { type: 'boolean' },
    customLogo: { type: 'string', pattern: ASSET_PATTERN },
    coverImage: { type: 'string', pattern: ASSET_PATTERN },
  };
  return {
    $schema: SCHEMA,
    $id: 'https://doc-studio.local/schemas/document.schema.json',
    title: 'Arquivo de documento do Estúdio de Documentos (.docstudio.json)',
    description: `Gerado por tools/docstudio.mjs a partir de js/schema.js e js/design.js. Formato "${FILE_FORMAT}", versão ${FILE_VERSION}. O app normaliza tudo o que importa; este esquema descreve o que é aceito sem correções.`,
    type: 'object',
    required: ['format', 'version', 'document'],
    properties: {
      format: { const: FILE_FORMAT },
      version: { type: 'integer', minimum: 1, maximum: FILE_VERSION },
      exportedAt: { type: 'string' },
      document: { $ref: '#/$defs/document' },
      assets: {
        type: 'object',
        propertyNames: { pattern: '^[\\w-]{1,64}$' },
        additionalProperties: {
          oneOf: [
            { type: 'object', required: ['dataUrl', 'width', 'height'], properties: { dataUrl: { type: 'string', pattern: '^data:image/(png|jpeg|webp|gif|svg\\+xml);base64,' }, width: { type: 'number' }, height: { type: 'number' }, name: { type: 'string' } } },
            { type: 'object', required: ['src'], additionalProperties: false, properties: { src: { type: 'string', description: 'caminho do arquivo de imagem (só em arquivos-fonte; `docstudio build` converte em dataUrl)' } } },
          ],
        },
      },
    },
    $defs: {
      document: {
        type: 'object',
        required: ['blocks'],
        properties: {
          schema: { type: 'integer' },
          id: { type: 'string', pattern: ID_PATTERN },
          name: { type: 'string', maxLength: 120 },
          createdAt: { type: 'number' },
          updatedAt: { type: 'number' },
          meta: { type: 'object', additionalProperties: false, properties: Object.fromEntries(Object.keys(DEFAULT_META).map((key) => [key, { type: 'string', maxLength: 600 }])) },
          design: { type: 'object', additionalProperties: false, properties: designProperties },
          blocks: { type: 'array', maxItems: MAX_BLOCKS, items: { anyOf: [...blocks, intentBlock] } },
        },
      },
      ...Object.fromEntries(Object.entries(BLOCK_TYPES).map(([type, def]) => [`block-${type}`, blockSchema(type, def)])),
    },
  };
}

export function operationsSchema() {
  const position = {
    anyOf: [
      { enum: ['start', 'end'] },
      { type: 'object', required: ['index'], properties: { index: { type: 'integer', minimum: 0 } } },
      { type: 'object', required: ['before'], properties: { before: { type: 'string' } } },
      { type: 'object', required: ['after'], properties: { after: { type: 'string' } } },
    ],
  };
  const expect = { type: 'object', description: 'guarda: a operação falha se o alvo não for deste tipo ou não contiver este texto', properties: { type: { enum: Object.keys(BLOCK_TYPES) }, text: { type: 'string' } } };
  const target = { id: { type: 'string' }, ids: { type: 'array', items: { type: 'string' }, minItems: 1 } };
  const blockRef = { $ref: 'document.schema.json#/$defs/document/properties/blocks/items' };
  const op = (name, properties, required = []) => ({
    title: OPERATIONS[name].summary,
    type: 'object',
    required: ['op', ...required],
    additionalProperties: false,
    properties: { op: { const: name }, ...properties },
  });
  return {
    $schema: SCHEMA,
    $id: 'https://doc-studio.local/schemas/operations.schema.json',
    title: 'Arquivo de alterações do Estúdio de Documentos (.ops.json)',
    description: `Gerado por tools/docstudio.mjs a partir de js/operations.js. Lote atômico: se uma operação falhar, nada é aplicado. Formato "${OPERATIONS_FORMAT}", versão ${OPERATIONS_VERSION}.`,
    type: 'object',
    required: ['format', 'version', 'operations'],
    properties: {
      format: { const: OPERATIONS_FORMAT },
      version: { type: 'integer', minimum: 1, maximum: OPERATIONS_VERSION },
      documentId: { type: 'string', description: 'id do documento alvo (o app avisa se for outro)' },
      description: { type: 'string', maxLength: 500, description: 'resumo da alteração, exibido na revisão' },
      assets: { $ref: 'document.schema.json#/properties/assets' },
      operations: {
        type: 'array',
        items: {
          oneOf: [
            op('insert', { blocks: { type: 'array', minItems: 1, items: blockRef }, at: position }, ['blocks']),
            op('update', { id: { type: 'string' }, set: { type: 'object', minProperties: 1 }, expect }, ['id', 'set']),
            op('replace', { id: { type: 'string' }, block: blockRef, expect }, ['id', 'block']),
            { ...op('remove', { ...target, expect }), anyOf: [{ required: ['id'] }, { required: ['ids'] }] },
            { ...op('move', { ...target, to: position }, ['to']), anyOf: [{ required: ['id'] }, { required: ['ids'] }] },
            op('reorder', { ids: { type: 'array', items: { type: 'string' } } }, ['ids']),
            op('duplicate', { id: { type: 'string' }, newId: { type: 'string', pattern: ID_PATTERN } }, ['id']),
            op('transform', { id: { type: 'string' }, to: { enum: ['paragraph', 'heading', 'section', 'list', 'quote', 'callout', 'message'] }, expect }, ['id', 'to']),
            op('setDesign', { set: { $ref: 'document.schema.json#/$defs/document/properties/design' } }, ['set']),
            op('applyPreset', { preset: { enum: DESIGN_PRESETS.map((p) => p.id) } }, ['preset']),
            op('setMeta', { set: { $ref: 'document.schema.json#/$defs/document/properties/meta' } }, ['set']),
            op('rename', { name: { type: 'string', minLength: 1, maxLength: 120 } }, ['name']),
          ],
        },
      },
    },
  };
}

/* ------------------------------------------------------------------ catálogo em Markdown */
const cell = (value) => String(value ?? '').replaceAll('|', '\\|').replaceAll('\n', ' ');
const table = (head, rows) => [`| ${head.join(' | ')} |`, `| ${head.map(() => '---').join(' | ')} |`, ...rows.map((row) => `| ${row.map(cell).join(' | ')} |`)].join('\n');

function fieldLine(field) {
  if (field.type === 'enum') return field.values.map((v) => `\`${v.value}\` ${v.label}`).join(' · ');
  if (field.type === 'items') return `lista (máx. ${field.max}) de { ${field.itemFields.map((f) => `\`${f.key}\`${f.formatting ? '*' : ''}`).join(', ')} }`;
  if (field.type === 'number') return `número ${field.min}–${field.max}${field.unit ? ` ${field.unit}` : ''}`;
  if (field.type === 'boolean') return '`true` / `false`';
  if (field.type === 'asset-id') return 'id de imagem em `assets`';
  if (field.type === 'table') return field.note;
  return `texto${field.formatting ? ' com formatação*' : ''}${field.note ? ` (${field.note})` : ''}`;
}

export function catalogMarkdown() {
  const catalog = buildCatalog();
  const lines = [
    '# Catálogo de componentes (gerado)',
    '',
    '> **Não edite à mão.** Gerado por `node tools/docstudio.mjs generate` a partir de `js/schema.js`, `js/design.js`, `js/templates.js`, `js/operations.js` e `js/catalog.js` — as mesmas definições que o editor usa. Versão JSON: `schemas/catalog.json`.',
    '',
    `Campos marcados com * aceitam formatação: ${Object.entries(catalog.formatting.markers).map(([k, v]) => `${k} \`${v}\``).join(', ')}. ${catalog.formatting.note}`,
    '',
    '## Intenções semânticas',
    '',
    'Em vez de `type`, um bloco pode trazer `"intent"`: o sistema escolhe o tipo e as opções. Campos explícitos prevalecem.',
    '',
    table(['intent', 'quando usar', 'vira'], catalog.intents.map((i) => [`\`${i.id}\``, i.description, `\`${JSON.stringify(i.becomes)}\``])),
    '',
    '## Componentes (blocos)',
    '',
  ];
  for (const group of catalog.groups) {
    lines.push(`### ${group.label}`, '');
    for (const component of catalog.components.filter((c) => c.group === group.id)) {
      lines.push(`#### \`${component.type}\` — ${component.label}`, '', `${component.description}.`, '');
      lines.push(`- **Use para:** ${component.use}`, `- **Evite:** ${component.avoid}`, `- **No PDF:** ${component.pdf}`, '');
      lines.push(table(['campo', 'rótulo', 'valores'], component.fields.map((f) => [`\`${f.key}\``, f.label, fieldLine(f)])), '');
      lines.push('Padrão:', '', '```json', JSON.stringify({ type: component.type, ...component.defaults }), '```', '');
    }
  }
  lines.push('## Aparência (`design`)', '', 'Escolha sempre entre as opções registradas; não existe CSS, cor ou fonte livre.', '');
  lines.push(table(['opção', 'valores'], [
    ['`theme`', catalog.design.themes.map((t) => `\`${t.id}\` ${t.label} (${t.colors[0]})`).join(' · ')],
    ['`cover`', catalog.design.covers.map((c) => `\`${c.id}\` ${c.label}`).join(' · ')],
    ['`backCover`', catalog.design.backCovers.map((c) => `\`${c.id}\` ${c.label}`).join(' · ')],
    ...Object.keys(DESIGN_OPTIONS).map((key) => [`\`${key}\``, catalog.design[key].map((o) => `\`${o.id}\` ${o.label}`).join(' · ')]),
    ['`numberSections`', catalog.design.booleans.numberSections],
    ['`countCover`', catalog.design.booleans.countCover],
    ['`customLogo` / `coverImage`', 'ids de imagem em `assets`'],
  ]), '');
  lines.push('### Capas', '', table(['id', 'nome', 'descrição'], catalog.design.covers.map((c) => [`\`${c.id}\``, c.label, c.description])), '');
  lines.push('### Contracapas', '', table(['id', 'nome', 'descrição'], catalog.design.backCovers.map((c) => [`\`${c.id}\``, c.label, c.description])), '');
  lines.push('### Assinaturas', '', table(['id', 'nome', 'descrição'], catalog.design.signature.map((c) => [`\`${c.id}\``, c.label, c.description ?? ''])), '');
  lines.push('## Estilos prontos (`applyPreset`)', '', 'Mudam só a aparência, nunca o conteúdo.', '', table(['id', 'nome', 'descrição', 'design'], catalog.presets.map((p) => [`\`${p.id}\``, p.label, p.description, `\`${JSON.stringify(p.design)}\``])), '');
  lines.push('## Modelos de documento (`docstudio new --template`)', '', table(['id', 'nome', 'tipo', 'blocos', 'descrição'], catalog.templates.map((t) => [`\`${t.id}\``, t.name, t.kind === 'start' ? 'começar do zero' : (catalog.templateCategories.find((c) => c.id === t.category)?.label ?? 'modelo com exemplo'), t.blocks, t.description])), '');
  lines.push('## Textos fixos (`meta`)', '', catalog.meta.note, '', table(['campo', 'grupo', 'rótulo', 'várias linhas'], catalog.meta.fields.map((f) => [`\`${f.key}\``, f.group, f.label, f.multiline ? 'sim' : 'não'])), '');
  lines.push('## Operações (arquivo `.ops.json`)', '', `Posições: ${catalog.operations.positions.join(', ')}.`, '', table(['op', 'o que faz', 'campos'], Object.entries(catalog.operations.list).map(([name, o]) => [`\`${name}\``, o.summary, Object.entries(o.fields).map(([k, v]) => `\`${k}\`: ${v}`).join('; ')])), '');
  lines.push('## Combinações prontas (snippets)', '', table(['id', 'nome', 'blocos'], catalog.snippets.map((s) => [`\`${s.id}\``, s.name, s.blocks.map((b) => b.type).join(', ')])), '');
  lines.push('## Página e imagens', '', `A4 com margens de 20 mm: área útil ${catalog.page.contentWidthMm.portrait} × ${catalog.page.contentHeightMm.portrait} mm em retrato e ${catalog.page.contentWidthMm.landscape} × ${catalog.page.contentHeightMm.landscape} mm em paisagem. Imagens: ${catalog.images.types.join(', ')}; resolução mínima ${catalog.images.minimumPpi} ppi no tamanho impresso (ideal ${catalog.images.idealPpi}).`, '');
  return `${lines.join('\n')}\n`;
}

/* ------------------------------------------------------------------ regras da marca em Markdown */
const ENFORCED = {
  renderer: 'o app aplica sozinho (não há como errar pelo documento)',
  validator: 'conferido por `docstudio validate` e “Verificar documento”',
  manual: 'conferência humana',
};

export function brandMarkdown() {
  const brand = buildBrand();
  const catalog = buildCatalog();
  const lines = [
    '# Regras da marca (gerado)',
    '',
    '> **Não edite à mão.** Gerado por `node tools/docstudio.mjs generate` a partir de `js/brand.js`. Versão JSON: `schemas/brand.json`.',
    '',
    `Fonte: ${brand.source.title}. Precedência em caso de dúvida: ${brand.source.precedence.map((p, i) => `${i + 1}. ${p}`).join(' > ')}.`,
    '',
    '## O que um agente pode e não pode fazer',
    '',
    '- **Pode** escolher, entre as opções registradas: tema (`design.theme`), capa, contracapa, cabeçalho, rodapé, numeração, assinatura (`design.signature`), estilos prontos e tons dos blocos (por nome).',
    '- **Não pode** informar cores por código, fontes, CSS, HTML, tamanhos ou arquivos de logo: o formato não aceita esses campos (`docstudio validate` recusa) e o app ignora o que não está registrado.',
    '- Logos nunca são editados: o app escolhe a versão certa (cores, negativo sobre fundo escuro, cinza, vertical) a partir de `design.signature`.',
    '- Logo de outro órgão só com `signature: "custom"` e o arquivo oficial do órgão em `assets` (SVG de preferência).',
    '',
    '## Regras',
    '',
    table(['regra', 'MIV', 'quem garante', 'texto'], brand.rules.map((r) => [`\`${r.id}\``, r.page ? `p. ${r.page}` : '—', ENFORCED[r.enforcedBy], r.text])),
    '',
    '## Tipografia',
    '',
    table(['uso', 'família', 'regra'], [
      ['Títulos e elementos gráficos', brand.typography.headings.family, `${brand.typography.headings.rule} (MIV p. ${brand.typography.headings.page})`],
      ['Texto corrido', brand.typography.body.family, `${brand.typography.body.rule} (MIV p. ${brand.typography.body.page}). Opção: \`design.bodyFont: "kanit"\`.`],
      ['Comandos e textos de tela', brand.typography.monospace.family, brand.typography.monospace.rule],
      ['Conceito', brand.typography.concept.family, `${brand.typography.concept.rule} (MIV p. ${brand.typography.concept.page})`],
    ]),
    '',
    '## Paleta do grafismo (MIV p. 26)',
    '',
    table(['id', 'nome', 'hex', 'CMYK'], brand.graphicPalette.map((c) => [`\`${c.id}\``, c.name, c.hex, c.cmyk.join(' / ')])),
    '',
    '## Cores da assinatura (MIV p. 11)',
    '',
    table(['id', 'nome', 'hex', 'Pantone'], brand.signatureColors.map((c) => [`\`${c.id}\``, c.name, c.hex, c.pantone])),
    '',
    '## Tons derivados documentados (não estão no MIV)',
    '',
    'Versões escuras para texto (contraste AA no papel) e tons de tela das faixas.',
    '',
    table(['hex', 'derivado de', 'uso'], brand.derivedColors.map((c) => [c.hex, c.from, c.use])),
    '',
    '## Temas de cor disponíveis',
    '',
    table(['id', 'nome', 'principal', 'texto', 'apoio'], catalog.design.themes.map((t) => [`\`${t.id}\``, t.label, ...t.colors])),
    '',
    '## Assinaturas',
    '',
    table(['signature', 'nome', 'descrição'], brand.signatures.map((s) => [`\`${s.id}\``, s.label, s.description ?? ''])),
    '',
    '## Arquivos de logo (SVG vetorial extraído do MIV)',
    '',
    table(['id', 'arquivo', 'versão', 'MIV', 'largura mínima'], brand.logos.map((l) => [`\`${l.id}\``, `\`${l.file}\``, l.label, `p. ${l.page}`, l.minWidthMm ? `${l.minWidthMm} mm` : '—'])),
    '',
    'Cada logo tem as versões `-negative` (fundos escuros) e `-gray` (escala de cinza, MIV p. 12) quando aplicável.',
    '',
  ];
  return `${lines.join('\n')}\n`;
}

/** Todos os arquivos gerados: caminho relativo → conteúdo. */
export function generatedFiles() {
  const json = (data) => `${JSON.stringify(data, null, 2)}\n`;
  return {
    'schemas/document.schema.json': json(documentSchema()),
    'schemas/operations.schema.json': json(operationsSchema()),
    'schemas/catalog.json': json(buildCatalog()),
    'schemas/brand.json': json(buildBrand()),
    'docs/ai/COMPONENT_CATALOG.md': catalogMarkdown(),
    'docs/ai/BRAND_RULES.md': brandMarkdown(),
  };
}
