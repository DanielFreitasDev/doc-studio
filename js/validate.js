/**
 * Validação de documentos e verificação da marca ("Verificar documento").
 *
 * A normalização (`normalizeDocument`) conserta em silêncio o que vem de fora;
 * esta validação diz *o que* seria consertado ou descartado, com mensagens em
 * português que pessoas e agentes de IA entendem. São três camadas:
 *
 * 1. `validateDocument(raw)` — estrutura: tipos de bloco, campos, valores
 *    permitidos, ids, referências de imagem, HTML/links inseguros no texto.
 * 2. `brandReport(doc)` — conformidade com o MIV: assinatura, cores, fontes,
 *    contraste e resolução das imagens (só o que dá para conferir por código).
 * 3. `contentAdvice(doc)` — recomendações de conteúdo sem IA externa.
 *
 * Sem dependência do DOM: roda no navegador e no Node (ferramenta de linha de comando).
 */
import { BLOCK_TYPES, BLOCK_ID, MAX_TEXT, TABLE_LIMITS, BLOCK_INTENTS, IMAGE_RATIOS, expandIntent } from './schema.js';
import { THEMES, COVERS, BACK_COVERS, DESIGN_OPTIONS, DEFAULT_DESIGN, DEFAULT_META, META_MAX_TEXT, contentWidthMm } from './design.js';
import { MAX_BLOCKS } from './model.js';
import { stripMarkup, linkUrl } from './markup.js';
import { GRAPHIC_PALETTE, SIGNATURE_COLORS, TYPOGRAPHY, contrastRatio, missingGlyphs } from './brand.js';

const MM_PER_INCH = 25.4;
/** Resolução mínima no tamanho impresso: abaixo de 150 ppi a imagem pixela; 300 ppi é o ideal. */
export const IMAGE_PPI = Object.freeze({ minimum: 150, ideal: 300 });

const DESIGN_VALUES = {
  theme: THEMES.map((t) => t.id),
  cover: COVERS.map((c) => c.id),
  backCover: BACK_COVERS.map((c) => c.id),
  ...Object.fromEntries(Object.entries(DESIGN_OPTIONS).map(([key, options]) => [key, options.map((o) => o.value)])),
};
const DESIGN_BOOLEANS = ['numberSections', 'countCover'];
const DESIGN_ASSETS = ['customLogo', 'coverImage'];
const HTML_TAG = /<\/?[a-z][\w-]*(\s[^<>]*)?>/i;
const LINK = /\[([^\]\n]+)\]\(([^)\s]+)\)/g;
const HEX = /#[0-9a-f]{6}\b|#[0-9a-f]{3}\b|rgba?\(/i;

const typeLabel = (type) => BLOCK_TYPES[type]?.label ?? type;
const list = (values) => values.map((v) => `“${v}”`).join(', ');

/** Nome do bloco nas mensagens: "Bloco 12 · Destaque (b_k3x)". */
function where(index, block) {
  const id = typeof block?.id === 'string' ? ` (${block.id})` : '';
  return `Bloco ${index + 1} · ${typeLabel(block?.type)}${id}`;
}

/** Sugere o valor permitido mais parecido (erros de digitação de agentes e pessoas). */
function closest(value, allowed) {
  const text = String(value).toLowerCase();
  let best = null;
  let bestScore = Infinity;
  for (const option of allowed) {
    const score = distance(text, String(option).toLowerCase());
    if (score < bestScore) { best = option; bestScore = score; }
  }
  return bestScore <= Math.max(2, Math.floor(text.length / 3)) ? best : null;
}

function distance(a, b) {
  const row = Array.from({ length: b.length + 1 }, (_, i) => i);
  for (let i = 1; i <= a.length; i += 1) {
    let previous = row[0];
    row[0] = i;
    for (let j = 1; j <= b.length; j += 1) {
      const current = row[j];
      row[j] = Math.min(row[j] + 1, row[j - 1] + 1, previous + (a[i - 1] === b[j - 1] ? 0 : 1));
      previous = current;
    }
  }
  return row[b.length];
}

function createReport() {
  const issues = [];
  const add = (level, code, message, extra = {}) => issues.push({ level, code, message, ...extra });
  return {
    issues,
    error: (code, message, extra) => add('error', code, message, extra),
    warning: (code, message, extra) => add('warning', code, message, extra),
    info: (code, message, extra) => add('info', code, message, extra),
  };
}

/**
 * Problemas de um texto do documento: HTML (aparece como texto), links que não
 * funcionarão e tamanho acima do que a normalização guarda (`max`: 20 mil nos
 * blocos, 600 nos textos fixos, 500/4 mil nas células); sem isso, o excesso
 * seria cortado em silêncio.
 */
function checkText(report, value, label, extra, max = MAX_TEXT) {
  if (HTML_TAG.test(value)) {
    report.warning('html-in-text', `${label}: contém HTML (${value.match(HTML_TAG)[0].slice(0, 40)}). O HTML não é interpretado e aparecerá como texto; use a formatação do editor (**negrito**, *itálico*, [link](https://…)).`, extra);
  }
  for (const [, , url] of value.matchAll(LINK)) {
    if (!linkUrl(url.replaceAll('&amp;', '&'))) {
      report.error('unsafe-link', `${label}: o link “${url.slice(0, 60)}” não é aceito. Só https://, http://, mailto: e tel:.`, extra);
    }
  }
  if (value.length > max) report.error('text-too-long', `${label}: texto com ${value.length} caracteres (máximo ${max}). ${max === MAX_TEXT ? 'Divida em mais blocos.' : 'Encurte o texto.'}`, extra);
}

function checkEnum(report, value, allowed, label, extra, { colorHint = false } = {}) {
  if (allowed.includes(String(value))) return;
  const suggestion = closest(value, allowed);
  const color = colorHint && typeof value === 'string' && HEX.test(value)
    ? ' Cores não são aceitas por código: escolha um dos tons nomeados do sistema.'
    : '';
  report.error('invalid-value', `${label}: valor “${String(value).slice(0, 40)}” não existe.${color} Use ${list(allowed)}${suggestion ? ` (talvez “${suggestion}”?)` : ''}.`, extra);
}

function validateField(report, field, value, label, extra, assetIds) {
  const name = `${label} · ${field.key}`;
  switch (field.kind) {
    case 'toggle':
      if (typeof value !== 'boolean') report.error('invalid-type', `${name}: use true ou false.`, extra);
      break;
    case 'number':
    case 'range': {
      const number = Number(value);
      if (typeof value !== 'number' || !Number.isFinite(number)) report.error('invalid-type', `${name}: use um número.`, extra);
      else if ((field.min != null && number < field.min) || (field.max != null && number > field.max)) {
        report.warning('out-of-range', `${name}: ${number} fora do intervalo ${field.min}–${field.max}; será ajustado.`, extra);
      }
      break;
    }
    case 'segmented':
    case 'swatches':
      checkEnum(report, value, field.options.map((o) => o.value), name, extra, { colorHint: field.kind === 'swatches' || field.key === 'tone' });
      break;
    case 'image':
      if (typeof value !== 'string') report.error('invalid-type', `${name}: use o id de uma imagem (texto).`, extra);
      else if (value && assetIds && !assetIds.has(value)) {
        report.error('missing-asset', `${name}: a imagem “${value}” não existe nas imagens do arquivo (assets).`, extra);
      }
      break;
    case 'items': {
      if (!Array.isArray(value)) {
        report.error('invalid-type', `${name}: use uma lista de itens.`, extra);
        break;
      }
      if (value.length > (field.max ?? 100)) report.warning('too-many-items', `${name}: ${value.length} itens (máximo ${field.max}); os excedentes serão descartados.`, extra);
      const keys = field.fields.map((sub) => sub.key);
      value.forEach((item, i) => {
        const itemLabel = `${name} · item ${i + 1}`;
        if (!item || typeof item !== 'object' || Array.isArray(item)) {
          report.error('invalid-type', `${itemLabel}: cada item é um objeto com ${list(keys)}.`, extra);
          return;
        }
        for (const key of Object.keys(item)) {
          if (!keys.includes(key)) report.warning('unknown-field', `${itemLabel}: o campo “${key}” não existe; será ignorado. Campos: ${list(keys)}.`, extra);
        }
        for (const sub of field.fields) {
          const text = item[sub.key];
          if (text == null) continue;
          if (typeof text !== 'string' && typeof text !== 'number') report.error('invalid-type', `${itemLabel} · ${sub.key}: use texto.`, extra);
          else checkText(report, String(text), `${itemLabel} · ${sub.key}`, extra);
        }
      });
      break;
    }
    default:
      if (typeof value !== 'string' && typeof value !== 'number') report.error('invalid-type', `${name}: use texto.`, extra);
      else checkText(report, String(value), name, extra);
  }
}

function validateTable(report, raw, label, extra) {
  const header = raw.header;
  if (!Array.isArray(header) || !header.length) {
    report.error('invalid-table', `${label}: “header” precisa ser uma lista com os títulos das colunas.`, extra);
    return;
  }
  if (header.length > TABLE_LIMITS.columns) report.error('invalid-table', `${label}: ${header.length} colunas (máximo ${TABLE_LIMITS.columns}).`, extra);
  if (!Array.isArray(raw.rows)) {
    report.error('invalid-table', `${label}: “rows” precisa ser uma lista de linhas (cada linha, uma lista de células).`, extra);
    return;
  }
  if (raw.rows.length > TABLE_LIMITS.rows) report.warning('too-many-items', `${label}: ${raw.rows.length} linhas (máximo ${TABLE_LIMITS.rows}).`, extra);
  raw.rows.forEach((row, i) => {
    if (!Array.isArray(row)) report.error('invalid-table', `${label} · linha ${i + 1}: use uma lista de células.`, extra);
    else if (row.length !== header.length) report.warning('table-shape', `${label} · linha ${i + 1}: ${row.length} células para ${header.length} colunas; faltas ficam vazias e sobras são descartadas.`, extra);
  });
  header.forEach((cell) => {
    if (typeof cell === 'string') checkText(report, cell, `${label} · cabeçalho`, extra, TABLE_LIMITS.headerCell);
  });
  raw.rows.filter(Array.isArray).flat().forEach((cell) => {
    if (typeof cell === 'string') checkText(report, cell, `${label} · célula`, extra, TABLE_LIMITS.cell);
  });
}

/**
 * Valida um documento cru (como veio do arquivo ou do agente), antes da
 * normalização. `assetIds`: ids de imagem disponíveis (quando conhecidos).
 */
export function validateDocument(raw, { assetIds = null } = {}) {
  const report = createReport();
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) {
    report.error('invalid-document', 'O documento precisa ser um objeto com “name”, “meta”, “design” e “blocks”.');
    return finish(report);
  }
  const known = ['schema', 'id', 'name', 'createdAt', 'updatedAt', 'meta', 'design', 'blocks'];
  for (const key of Object.keys(raw)) {
    if (!known.includes(key)) report.warning('unknown-field', `Documento: o campo “${key}” não existe; será ignorado. Campos: ${list(known)}.`);
  }
  if (raw.name != null && typeof raw.name !== 'string') report.error('invalid-type', 'Documento · name: use texto.');

  if (raw.meta != null) {
    if (typeof raw.meta !== 'object' || Array.isArray(raw.meta)) report.error('invalid-type', 'meta: use um objeto com os textos da capa, cabeçalho e contracapa.');
    else {
      for (const [key, value] of Object.entries(raw.meta)) {
        if (!(key in DEFAULT_META)) report.warning('unknown-field', `meta: o campo “${key}” não existe; será ignorado. Campos: ${list(Object.keys(DEFAULT_META))}.`);
        else if (typeof value !== 'string') report.error('invalid-type', `meta · ${key}: use texto.`);
        else checkText(report, value, `meta · ${key}`, { field: `meta.${key}` }, META_MAX_TEXT);
      }
    }
  }

  if (raw.design != null) {
    if (typeof raw.design !== 'object' || Array.isArray(raw.design)) report.error('invalid-type', 'design: use um objeto com as opções de aparência.');
    else validateDesign(report, raw.design, assetIds);
  }

  if (!Array.isArray(raw.blocks)) {
    report.error('invalid-document', '“blocks” precisa ser uma lista de blocos (pode ser vazia).');
    return finish(report);
  }
  if (raw.blocks.length > MAX_BLOCKS) report.error('too-many-blocks', `${raw.blocks.length} blocos (máximo ${MAX_BLOCKS}).`);

  const seen = new Set();
  raw.blocks.forEach((input, index) => {
    const block = expandIntent(input);
    const extra = { blockId: typeof block?.id === 'string' ? block.id : undefined, index };
    if (block?.intent != null) {
      const suggestion = closest(block.intent, Object.keys(BLOCK_INTENTS));
      report.error('unknown-intent', `Bloco ${index + 1}: a intenção “${String(block.intent).slice(0, 40)}” não existe${suggestion ? ` (talvez “${suggestion}”?)` : ''}. Intenções: ${list(Object.keys(BLOCK_INTENTS))}.`, extra);
      return;
    }
    const label = where(index, block);
    if (!block || typeof block !== 'object' || Array.isArray(block)) {
      report.error('invalid-block', `Bloco ${index + 1}: cada bloco é um objeto com “type”.`, extra);
      return;
    }
    const definition = BLOCK_TYPES[block.type];
    if (!definition) {
      const suggestion = closest(block.type, Object.keys(BLOCK_TYPES));
      report.error('unknown-block-type', `Bloco ${index + 1}: o tipo “${String(block.type).slice(0, 40)}” não existe${suggestion ? ` (talvez “${suggestion}”?)` : ''}. Tipos: ${list(Object.keys(BLOCK_TYPES))}.`, extra);
      return;
    }
    if (block.id != null) {
      if (typeof block.id !== 'string' || !BLOCK_ID.test(block.id)) report.warning('invalid-id', `${label}: id inválido (use até 40 letras, números, _ ou -); um novo id será criado.`, extra);
      else if (seen.has(block.id)) report.error('duplicate-id', `${label}: o id “${block.id}” se repete. Cada bloco precisa de um id único.`, extra);
      else seen.add(block.id);
    }
    const keys = ['id', 'type', ...definition.fields.flatMap((f) => (f.kind === 'table' ? ['header', 'rows'] : [f.key]))];
    for (const key of Object.keys(block)) {
      if (!keys.includes(key)) report.warning('unknown-field', `${label}: o campo “${key}” não existe neste tipo; será ignorado. Campos: ${list(keys.slice(2))}.`, extra);
    }
    for (const field of definition.fields) {
      if (field.kind === 'table') validateTable(report, block, label, extra);
      else if (block[field.key] !== undefined) validateField(report, field, block[field.key], label, extra, assetIds);
    }
  });
  return finish(report);
}

function validateDesign(report, design, assetIds) {
  const known = [...Object.keys(DESIGN_VALUES), ...DESIGN_BOOLEANS, ...DESIGN_ASSETS];
  for (const [key, value] of Object.entries(design)) {
    const extra = { field: `design.${key}` };
    if (!known.includes(key)) {
      const css = /color|font|background|style|css|margin|size/i.test(key) && !(key in DEFAULT_DESIGN);
      report.warning('unknown-field', `design: a opção “${key}” não existe; será ignorada.${css ? ' A aparência vem só das opções registradas (sem CSS livre).' : ''} Opções: ${list(known)}.`, extra);
    } else if (DESIGN_VALUES[key]) {
      checkEnum(report, value, DESIGN_VALUES[key], `design · ${key}`, extra, { colorHint: key === 'theme' });
    } else if (DESIGN_BOOLEANS.includes(key)) {
      if (typeof value !== 'boolean') report.error('invalid-type', `design · ${key}: use true ou false.`, extra);
    } else if (typeof value !== 'string') {
      report.error('invalid-type', `design · ${key}: use o id de uma imagem.`, extra);
    } else if (value && assetIds && !assetIds.has(value)) {
      report.error('missing-asset', `design · ${key}: a imagem “${value}” não existe nas imagens do arquivo (assets).`, extra);
    }
  }
}

function finish(report) {
  const errors = report.issues.filter((i) => i.level === 'error');
  return { ok: errors.length === 0, issues: report.issues };
}

/* ================================================================ marca (MIV) */
const OFFICIAL_HEX = new Set([...GRAPHIC_PALETTE, ...SIGNATURE_COLORS].map((c) => c.hex));

/** Largura impressa de uma imagem (mm) para estimar a resolução. */
// Área da foto na capa "Foto" (js/graphics.js, photoBackground).
const COVER_PHOTO_MM = [210, 150];

function printedWidthMm(block, orientation, margins) {
  return (contentWidthMm(orientation, margins) * block.width) / 100;
}

/** Maior largura do bloco de imagem (%, em passos de 5) que mantém a resolução mínima. */
export function maxImageWidth(pixelWidth, orientation = 'portrait', margins = 'regular') {
  const widthMm = (pixelWidth / IMAGE_PPI.minimum) * MM_PER_INCH;
  const percent = Math.floor(((widthMm / contentWidthMm(orientation, margins)) * 100) / 5) * 5;
  return Math.max(25, Math.min(100, percent));
}

/** Resolução efetiva (ppi) de uma imagem no tamanho impresso. */
export function effectivePpi(pixelWidth, widthMm) {
  return Math.round(pixelWidth / (widthMm / MM_PER_INCH));
}

/**
 * Resolução de uma imagem numa caixa de `boxW` × `boxH` mm: "Preencher" amplia
 * até cobrir a caixa (o recorte desperdiça pixels), "Encaixar" até caber.
 */
function boxPpi(asset, boxW, boxH, fit = 'cover') {
  if (!boxH || !asset.height) return effectivePpi(asset.width, boxW);
  const scales = [boxW / asset.width, boxH / asset.height];
  const mmPerPixel = fit === 'contain' ? Math.min(...scales) : Math.max(...scales);
  return Math.round(MM_PER_INCH / mmPerPixel);
}

/** Resolução de um bloco de imagem, considerando o formato fixo (16:9, quadrado…) e o recorte. */
function blockImagePpi(asset, block, orientation, margins) {
  const width = printedWidthMm(block, orientation, margins);
  const ratio = IMAGE_RATIOS.find((option) => option.value === block.ratio)?.ratio;
  if (!ratio) return effectivePpi(asset.width, width);
  const [w, h] = ratio.split('/').map(Number);
  return boxPpi(asset, width, (width * h) / w, block.fit);
}

/**
 * Conformidade com o MIV de um documento já normalizado. `assets`: mapa
 * id → { width, height } (pode faltar; aí a resolução não é verificada).
 * Cada item: { status: 'ok' | 'info' | 'warning' | 'error', rule, message }.
 */
export function brandReport(doc, assets = null) {
  const items = [];
  const add = (status, rule, message, extra = {}) => items.push({ status, rule, message, ...extra });
  const { design } = doc;

  const signature = DESIGN_OPTIONS.signature.find((o) => o.value === design.signature);
  if (design.signature === 'custom') {
    if (!design.customLogo) add('error', 'signature-official-files', 'Assinatura “Logo próprio + Governo” sem o logo do órgão: envie o arquivo (SVG de preferência) ou escolha outra assinatura.');
    else add('warning', 'signature-official-files', 'Logo próprio: o app aplica as regras do MIV (posição, distância, tamanho mínimo), mas confira se o arquivo é a versão oficial do órgão.');
  } else if (design.signature === 'none') {
    add('warning', 'signature-official-files', 'Documento sem assinatura: materiais institucionais do Governo devem levar a marca (MIV p. 7).');
  } else {
    add('ok', 'signature-official-files', `Assinatura oficial: ${signature.label} (${signature.description}). Arquivos vetoriais do MIV, posição e tamanho mínimo aplicados pelo app.`);
  }

  const theme = THEMES.find((t) => t.id === design.theme);
  const [primary, strong] = theme.colors;
  if (OFFICIAL_HEX.has(primary)) add('ok', 'colors-official', `Tema “${theme.label}”: cor principal ${primary}, da paleta oficial do MIV.`);
  else add('error', 'colors-official', `Tema “${theme.label}”: a cor ${primary} não está na paleta oficial do MIV (p. 11 e 26).`);
  const ratio = contrastRatio(strong, '#ffffff');
  if (ratio >= 4.5) add('ok', 'text-contrast', `Títulos e destaques em ${strong}: contraste ${ratio.toFixed(1).replace('.', ',')}:1 no papel (mínimo 4,5:1).`);
  else add('error', 'text-contrast', `Títulos em ${strong}: contraste ${ratio.toFixed(1).replace('.', ',')}:1, abaixo de 4,5:1.`);

  const body = design.bodyFont === 'kanit' ? 'Kanit' : 'Maitree';
  if (TYPOGRAPHY.allowedFamilies.includes(body)) add('ok', 'typography', `Tipografia do MIV: Kanit nos títulos e ${body} no texto.`);
  // Texto de tela e código usam a monoespaçada do sistema (exceção funcional, fora do MIV).
  const monospace = doc.blocks.some((block) => block.type === 'code' || /`[^`\n]+`/.test(JSON.stringify(block)));
  if (monospace) add('info', 'typography', 'Comandos e textos de tela usam fonte monoespaçada do sistema, fora das fontes do MIV (exceção funcional): use só para textos literais; para destacar palavras comuns, prefira negrito.');
  // Texto (fora de código e texto de tela, que usam a monoespaçada) com caracteres que Kanit e Maitree não têm.
  const prose = JSON.stringify({ meta: doc.meta, blocks: doc.blocks.map((block) => (block.type === 'code' ? { ...block, text: '' } : block)) })
    .replace(/`[^`\n]+`/g, '');
  const missing = missingGlyphs(prose);
  if (missing.length) {
    add('warning', 'typography', `Caracteres fora das fontes do MIV (${missing.slice(0, 8).join(' ')}): o navegador desenha com outra fonte, diferente em cada computador, e ela entra no PDF. Troque por equivalentes (… no lugar de ⋯; o estilo de lista “✓” no lugar do símbolo digitado).`);
  }

  const cover = COVERS.find((c) => c.id === design.cover);
  const back = BACK_COVERS.find((c) => c.id === design.backCover);
  add('ok', 'layout', `Capa “${cover.label}”, contracapa “${back.label}”, cabeçalho e rodapé do catálogo registrado.`);
  if (design.cover === 'photo' && !design.coverImage) add('error', 'layout', 'Capa “Foto” sem foto: escolha a imagem da capa ou outra capa.');
  if (design.colorMode === 'gray') add('ok', 'grayscale', 'Escala de cinza pela tabela de correspondência do MIV (p. 12); o PDF continua vetorial.');

  if (assets) {
    let orientation = 'portrait';
    let checked = 0;
    for (const block of doc.blocks) {
      if (block.type === 'pagebreak') orientation = block.orientation === 'landscape' ? 'landscape' : 'portrait';
      if (block.type !== 'image' || !block.assetId) continue;
      const asset = assets[block.assetId];
      if (!asset) continue;
      checked += 1;
      if (asset.svg) continue;
      const ppi = blockImagePpi(asset, block, orientation, design.margins);
      const label = block.caption ? `“${stripMarkup(block.caption).slice(0, 50)}”` : 'sem legenda';
      if (ppi < IMAGE_PPI.minimum) {
        // A resolução cresce na mesma proporção em que a largura diminui (também com recorte).
        const maxWidth = Math.max(25, Math.min(100, Math.floor((block.width * ppi) / IMAGE_PPI.minimum / 5) * 5));
        add('warning', 'image-resolution', `Imagem ${label}: ${ppi} ppi no tamanho impresso (mínimo ${IMAGE_PPI.minimum}). Pode pixelar no PDF: use um arquivo maior ou diminua a largura para até ${maxWidth}%.`, { blockId: block.id });
      }
    }
    if (design.cover === 'photo' && design.coverImage && assets[design.coverImage] && !assets[design.coverImage].svg) {
      // A foto preenche a área do alto da capa (210 × 150 mm, recortada como no slide da p. 56 do MIV).
      const [areaW, areaH] = COVER_PHOTO_MM;
      const ppi = boxPpi(assets[design.coverImage], areaW, areaH);
      const need = (mm) => Math.ceil((mm / MM_PER_INCH) * IMAGE_PPI.minimum);
      if (ppi < IMAGE_PPI.minimum) add('warning', 'image-resolution', `Foto da capa: ${ppi} ppi na área da foto (mínimo ${IMAGE_PPI.minimum}). Use uma foto com pelo menos ${need(areaW)} × ${need(areaH)} px.`);
      checked += 1;
    }
    if (checked && !items.some((i) => i.rule === 'image-resolution')) add('ok', 'image-resolution', `${checked === 1 ? 'A imagem tem' : `As ${checked} imagens têm`} resolução suficiente para impressão (≥ ${IMAGE_PPI.minimum} ppi).`);
  }
  return items;
}

/* ================================================================ recomendações de conteúdo */
/**
 * Recomendações simples, sem IA externa, para o editor e para agentes:
 * documento vazio, textos de exemplo, seções vazias, páginas monótonas,
 * imagens sem legenda. Cada item: { level: 'warning' | 'info', code, message, blockId? }.
 */
export function contentAdvice(doc) {
  const advice = [];
  const add = (level, code, message, blockId) => advice.push({ level, code, message, blockId });
  const { blocks, meta, design } = doc;

  if (!blocks.length) add('warning', 'empty-document', 'O documento ainda não tem conteúdo.');
  if (design.cover !== 'none' && meta.title.trim() === DEFAULT_META.title) add('warning', 'default-title', 'A capa ainda diz “Título do Documento”.');
  const sample = blocks.find((block) => /\(exemplo\)/i.test(JSON.stringify(block)));
  if (sample) add('warning', 'sample-text', 'O documento ainda tem textos marcados como “(exemplo)”.', sample.id);

  const sections = blocks.filter((b) => b.type === 'section');
  if (blocks.some((b) => b.type === 'toc') && !sections.length) add('warning', 'toc-without-sections', 'Há um sumário, mas nenhum bloco “Seção”: o sumário ficará vazio.', blocks.find((b) => b.type === 'toc').id);
  if (!sections.length && blocks.length > 12) add('info', 'no-sections', 'Documento longo sem seções: use blocos “Seção” para organizar e alimentar o sumário.');

  let run = [];
  const flushRun = () => {
    if (run.length >= 5) add('info', 'monotonous', `${run.length} parágrafos seguidos: considere lista, passo a passo, cartões ou um destaque para facilitar a leitura.`, run[0].id);
    run = [];
  };
  blocks.forEach((block, index) => {
    if (block.type === 'paragraph') run.push(block);
    else flushRun();
    const next = blocks[index + 1];
    if (block.type === 'section' && (!next || ['section', 'pagebreak'].includes(next.type))) {
      add('info', 'empty-section', `A seção “${stripMarkup(block.title)}” não tem conteúdo.`, block.id);
    }
    if (block.type === 'paragraph' && stripMarkup(block.text).length > 1400) {
      add('info', 'long-paragraph', 'Parágrafo muito longo: divida em parágrafos menores ou transforme em lista.', block.id);
    }
    if (block.type === 'paragraph' && !block.text.trim()) add('info', 'empty-paragraph', 'Parágrafo vazio.', block.id);
    if (block.type === 'image' && !block.assetId) add('warning', 'image-missing', 'Bloco de imagem sem imagem.', block.id);
    if (block.type === 'image' && block.assetId && !block.caption.trim()) {
      add('info', 'image-caption', 'Imagem sem legenda: a legenda numera a figura e serve de descrição para leitores de tela.', block.id);
    }
  });
  flushRun();
  return advice;
}
