/**
 * Operações estruturadas sobre o documento (o "sistema de comandos").
 *
 * Agentes de IA (e scripts) não editam HTML nem posições de tela: enviam uma
 * lista de operações sobre blocos identificados por id estável, por exemplo
 * `{ "op": "update", "id": "b_requisitos", "set": { "title": "Requisitos" } }`.
 * A mesma função é usada pela ferramenta de linha de comando e pela interface
 * ("Aplicar alterações"), onde o lote inteiro vira um único passo de desfazer.
 *
 * Regras de segurança:
 * - o lote é atômico: se uma operação falhar, nada é aplicado;
 * - cada bloco criado ou alterado passa pela mesma validação e normalização
 *   da importação de arquivos (sem HTML, CSS ou cores livres);
 * - `expect` permite ao agente declarar o que espera encontrar no alvo
 *   (tipo, trecho do texto); se não bater, a operação falha em vez de
 *   alterar o bloco errado.
 *
 * Sem dependência do DOM: roda no navegador e no Node.
 */
import { BLOCK_TYPES, BLOCK_ID, normalizeBlock, transformBlock, blockPlainText, TEXT_BLOCK_TYPES, expandIntent } from './schema.js';
import { normalizeDesign, normalizeMeta, DESIGN_PRESETS } from './design.js';
import { validateDocument } from './validate.js';
import { uid, setByPath, getByPath, isSafeKey } from './utils.js';

export const OPERATIONS_FORMAT = 'doc-studio-operations';
export const OPERATIONS_VERSION = 1;
const MAX_OPERATIONS = 2000;

/** Operações aceitas, com a descrição usada na documentação gerada para agentes. */
export const OPERATIONS = {
  insert: { summary: 'Insere blocos novos.', fields: { blocks: 'lista de blocos ({ type, ...campos }; "id" opcional e único)', at: 'posição (opcional, padrão "end")' } },
  update: { summary: 'Altera campos de um bloco; caminhos com ponto valem para itens e células ("items.2.title", "rows.0.1").', fields: { id: 'id do bloco', set: 'objeto { campo ou caminho: valor }', expect: 'guarda opcional' } },
  replace: { summary: 'Troca um bloco inteiro (pode mudar o tipo), mantendo o id.', fields: { id: 'id do bloco', block: 'bloco novo ({ type, ...campos })', expect: 'guarda opcional' } },
  remove: { summary: 'Exclui blocos.', fields: { id: 'id do bloco (ou "ids": lista)', expect: 'guarda opcional' } },
  move: { summary: 'Move blocos (mantendo a ordem entre eles) para outra posição.', fields: { id: 'id do bloco (ou "ids": lista)', to: 'posição' } },
  reorder: { summary: 'Reorganiza o documento inteiro: "ids" com todos os ids na nova ordem.', fields: { ids: 'todos os ids do documento, cada um uma vez' } },
  duplicate: { summary: 'Duplica um bloco logo abaixo dele.', fields: { id: 'id do bloco', newId: 'id da cópia (opcional)' } },
  transform: { summary: `Transforma um bloco de texto em outro tipo de texto mantendo o conteúdo (${TEXT_BLOCK_TYPES.join(', ')}).`, fields: { id: 'id do bloco', to: 'tipo de destino' } },
  setDesign: { summary: 'Muda opções de aparência registradas (capa, rodapé, tema...).', fields: { set: 'objeto { opção: valor }' } },
  applyPreset: { summary: 'Aplica um estilo pronto (só a aparência).', fields: { preset: 'id do estilo pronto' } },
  setMeta: { summary: 'Muda textos fixos (capa, cabeçalho, contracapa).', fields: { set: 'objeto { campo: texto }' } },
  rename: { summary: 'Renomeia o documento.', fields: { name: 'novo nome' } },
};

/** Formas aceitas de posição: "start", "end", { index }, { before: id }, { after: id }. */
export const POSITION_FORMS = ['"start"', '"end"', '{ "index": n }', '{ "before": "id" }', '{ "after": "id" }'];

class OperationError extends Error {}
const fail = (message) => { throw new OperationError(message); };

function closestIds(blocks, id) {
  const text = String(id);
  return blocks.map((b) => b.id).filter((candidate) => candidate.includes(text.slice(0, 4)) || text.includes(candidate.slice(0, 4))).slice(0, 5);
}

function findIndex(doc, id) {
  if (typeof id !== 'string') fail('informe o “id” do bloco (texto).');
  const index = doc.blocks.findIndex((block) => block.id === id);
  if (index < 0) {
    const near = closestIds(doc.blocks, id);
    fail(`o bloco “${id}” não existe no documento.${near.length ? ` Ids parecidos: ${near.join(', ')}.` : ''} Liste os ids com \`node tools/docstudio.mjs inspect <arquivo>\`.`);
  }
  return index;
}

function checkExpect(block, expect) {
  if (!expect) return;
  if (expect.type && block.type !== expect.type) fail(`o bloco “${block.id}” é do tipo “${block.type}”, não “${expect.type}” (guarda "expect").`);
  if (expect.text && !blockPlainText(block).toLowerCase().includes(String(expect.text).toLowerCase())) {
    fail(`o bloco “${block.id}” não contém o texto “${expect.text}” (guarda "expect").`);
  }
}

/** Índice de inserção a partir da posição pedida. `ignore`: ids que vão sair do lugar (mover). */
function resolvePosition(doc, at = 'end') {
  if (at === 'end' || at == null) return doc.blocks.length;
  if (at === 'start') return 0;
  if (typeof at === 'object') {
    if (Number.isInteger(at.index)) return Math.max(0, Math.min(at.index, doc.blocks.length));
    if (at.before) return findIndex(doc, at.before);
    if (at.after) return findIndex(doc, at.after) + 1;
  }
  return fail(`posição inválida. Use ${POSITION_FORMS.join(', ')}.`);
}

/** Valida e normaliza blocos vindos de uma operação; devolve os blocos prontos. */
function prepareBlocks(rawBlocks, context) {
  const { doc, assetIds, keepIds = new Set() } = context;
  if (!Array.isArray(rawBlocks) || !rawBlocks.length) fail('“blocks” precisa ser uma lista com pelo menos um bloco.');
  const result = validateDocument({ blocks: rawBlocks }, { assetIds });
  const errors = result.issues.filter((issue) => issue.level === 'error');
  if (errors.length) fail(errors.map((e) => e.message).join(' '));
  // Avisos (ex.: HTML que aparecerá como texto) não bloqueiam, mas vão para a revisão.
  context.warnings?.push(...result.issues.filter((issue) => issue.level === 'warning').map((issue) => issue.message));
  const existing = new Set(doc.blocks.map((b) => b.id));
  return rawBlocks.map(expandIntent).map((raw) => {
    if (raw.id != null && existing.has(raw.id) && !keepIds.has(raw.id)) fail(`o id “${raw.id}” já existe no documento; use outro ou omita o id.`);
    const block = normalizeBlock(raw);
    if (raw.id == null || !BLOCK_ID.test(raw.id)) block.id = uid('b');
    existing.add(block.id);
    return block;
  });
}

const blockName = (block) => `${BLOCK_TYPES[block.type]?.label ?? block.type} (${block.id})`;
const idsOf = (op) => (Array.isArray(op.ids) ? op.ids : [op.id]);

const HANDLERS = {
  insert(doc, op, context) {
    const blocks = prepareBlocks(op.blocks, context);
    const index = resolvePosition(doc, op.at);
    doc.blocks.splice(index, 0, ...blocks);
    return `${blocks.length === 1 ? 'Inserido' : `Inseridos ${blocks.length} blocos:`} ${blocks.map(blockName).join(', ')} na posição ${index + 1}.`;
  },

  update(doc, op, context) {
    const index = findIndex(doc, op.id);
    const current = doc.blocks[index];
    checkExpect(current, op.expect);
    if (!op.set || typeof op.set !== 'object' || !Object.keys(op.set).length) fail('“set” precisa ser um objeto { campo: valor }.');
    const draft = structuredClone(current);
    for (const [path, value] of Object.entries(op.set)) {
      const keys = path.split('.');
      if (!keys.every(isSafeKey)) fail(`caminho “${path}” inválido: use nomes de campo separados por ponto, como “items.0.title”.`);
      if (['id', 'type'].includes(keys[0])) fail(`“${keys[0]}” não pode ser alterado com update (use "replace" ou "transform").`);
      // Só dá para descer por listas e objetos (não por dentro de um texto: “title.x”).
      for (let depth = 1; depth < keys.length; depth += 1) {
        const node = getByPath(draft, keys.slice(0, depth).join('.'));
        if (node != null && typeof node !== 'object') fail(`caminho “${path}”: “${keys.slice(0, depth).join('.')}” é um valor simples, não uma lista ou um objeto.`);
      }
      // Itens e linhas: o índice pode no máximo acrescentar um item no fim.
      for (let depth = 1; depth < keys.length; depth += 1) {
        if (!/^\d+$/.test(keys[depth])) continue;
        const parent = getByPath(draft, keys.slice(0, depth).join('.'));
        if (!Array.isArray(parent) || Number(keys[depth]) > parent.length) fail(`caminho “${path}”: posição ${keys[depth]} não existe (a lista tem ${Array.isArray(parent) ? parent.length : 0} itens).`);
      }
      setByPath(draft, path, structuredClone(value));
    }
    const [block] = prepareBlocks([draft], { ...context, keepIds: new Set([current.id]) });
    doc.blocks[index] = block;
    return `Alterado ${blockName(block)}: ${Object.keys(op.set).join(', ')}.`;
  },

  replace(doc, op, context) {
    const index = findIndex(doc, op.id);
    checkExpect(doc.blocks[index], op.expect);
    if (!op.block || typeof op.block !== 'object') fail('“block” precisa ser um bloco { type, ...campos }.');
    const [block] = prepareBlocks([{ ...op.block, id: op.id }], { ...context, keepIds: new Set([op.id]) });
    doc.blocks[index] = block;
    return `Substituído ${blockName(block)}.`;
  },

  remove(doc, op) {
    const ids = idsOf(op);
    ids.forEach((id) => checkExpect(doc.blocks[findIndex(doc, id)], op.expect));
    doc.blocks = doc.blocks.filter((block) => !ids.includes(block.id));
    return `Excluído(s): ${ids.join(', ')}.`;
  },

  move(doc, op) {
    const ids = idsOf(op);
    ids.forEach((id) => findIndex(doc, id));
    const moving = doc.blocks.filter((block) => ids.includes(block.id));
    const anchor = op.to?.before ?? op.to?.after;
    if (anchor && ids.includes(anchor)) fail('a posição de destino não pode ser um dos blocos movidos.');
    const rest = { blocks: doc.blocks.filter((block) => !ids.includes(block.id)) };
    const index = resolvePosition(rest, op.to);
    rest.blocks.splice(index, 0, ...moving);
    doc.blocks = rest.blocks;
    return `Movido(s) ${ids.join(', ')} para a posição ${index + 1}.`;
  },

  reorder(doc, op) {
    const current = doc.blocks.map((b) => b.id);
    if (!Array.isArray(op.ids) || op.ids.length !== current.length || new Set(op.ids).size !== current.length || op.ids.some((id) => !current.includes(id))) {
      fail(`“ids” precisa trazer todos os ${current.length} ids do documento, cada um uma vez. Para mudar só alguns, use "move".`);
    }
    const byId = new Map(doc.blocks.map((block) => [block.id, block]));
    doc.blocks = op.ids.map((id) => byId.get(id));
    return 'Documento reorganizado.';
  },

  duplicate(doc, op) {
    const index = findIndex(doc, op.id);
    const copy = { ...structuredClone(doc.blocks[index]), id: uid('b') };
    if (op.newId != null) {
      if (typeof op.newId !== 'string' || !BLOCK_ID.test(op.newId) || doc.blocks.some((b) => b.id === op.newId)) fail(`“newId” inválido ou já usado: ${op.newId}.`);
      copy.id = op.newId;
    }
    doc.blocks.splice(index + 1, 0, copy);
    return `Duplicado ${op.id} → ${copy.id}.`;
  },

  transform(doc, op) {
    const index = findIndex(doc, op.id);
    checkExpect(doc.blocks[index], op.expect);
    if (!TEXT_BLOCK_TYPES.includes(op.to)) fail(`“to” precisa ser um tipo de texto: ${TEXT_BLOCK_TYPES.join(', ')}.`);
    const next = transformBlock(doc.blocks[index], op.to);
    if (!next) fail(`o bloco “${op.id}” (${doc.blocks[index].type}) não pode virar “${op.to}”.`);
    doc.blocks[index] = next;
    return `Transformado ${op.id} em ${BLOCK_TYPES[op.to].label}.`;
  },

  setDesign(doc, op, context) {
    if (!op.set || typeof op.set !== 'object') fail('“set” precisa ser um objeto { opção: valor }.');
    const errors = validateDocument({ design: op.set, blocks: [] }, { assetIds: context.assetIds }).issues.filter((i) => i.level !== 'info');
    if (errors.length) fail(errors.map((e) => e.message).join(' '));
    doc.design = normalizeDesign({ ...doc.design, ...op.set });
    return `Aparência: ${Object.entries(op.set).map(([k, v]) => `${k} = ${v}`).join(', ')}.`;
  },

  applyPreset(doc, op) {
    const preset = DESIGN_PRESETS.find((p) => p.id === op.preset);
    if (!preset) fail(`o estilo pronto “${op.preset}” não existe. Use: ${DESIGN_PRESETS.map((p) => p.id).join(', ')}.`);
    doc.design = normalizeDesign({ ...doc.design, ...preset.design });
    return `Estilo pronto aplicado: ${preset.label}.`;
  },

  setMeta(doc, op) {
    if (!op.set || typeof op.set !== 'object') fail('“set” precisa ser um objeto { campo: texto }.');
    const issues = validateDocument({ meta: op.set, blocks: [] }).issues.filter((i) => i.level !== 'info');
    if (issues.length) fail(issues.map((e) => e.message).join(' '));
    doc.meta = normalizeMeta({ ...doc.meta, ...op.set });
    return `Textos fixos: ${Object.keys(op.set).join(', ')}.`;
  },

  rename(doc, op) {
    if (typeof op.name !== 'string' || !op.name.trim()) fail('“name” precisa ser um texto.');
    doc.name = op.name.trim().slice(0, 120);
    return `Documento renomeado para “${doc.name}”.`;
  },
};

/**
 * Aplica um lote de operações a uma cópia do documento.
 * Retorna { ok, doc, changes, warnings, error } — com erro, `doc` é o original intacto.
 * `assetIds`: ids de imagem disponíveis (do documento e do lote).
 */
export function applyOperations(doc, operations, { assetIds = null } = {}) {
  if (!Array.isArray(operations)) return { ok: false, doc, changes: [], error: '“operations” precisa ser uma lista.' };
  if (operations.length > MAX_OPERATIONS) return { ok: false, doc, changes: [], error: `Lote com mais de ${MAX_OPERATIONS} operações.` };
  const draft = structuredClone(doc);
  const changes = [];
  const warnings = [];
  for (const [index, op] of operations.entries()) {
    const handler = HANDLERS[op?.op];
    try {
      if (!handler) fail(`operação “${op?.op}” não existe. Use: ${Object.keys(HANDLERS).join(', ')}.`);
      changes.push(handler(draft, op, { doc: draft, assetIds, warnings }));
    } catch (error) {
      // Erro inesperado (entrada que nenhuma regra previu) também recusa o lote, sem derrubar quem chamou.
      const message = error instanceof OperationError ? error.message : `não foi possível aplicar (${error.message}).`;
      return { ok: false, doc, changes, warnings, error: `Operação ${index + 1} (${op?.op ?? '?'}): ${message} Nenhuma alteração foi aplicada.` };
    }
  }
  draft.updatedAt = Date.now();
  return { ok: true, doc: draft, changes, warnings };
}

/** Lê o texto de um arquivo de operações. Lança erro com mensagem amigável se for inválido. */
export function parseOperationsPayload(text) {
  let data;
  try {
    data = JSON.parse(text);
  } catch {
    throw new Error('O arquivo de alterações não é um JSON válido.');
  }
  if (Array.isArray(data)) data = { format: OPERATIONS_FORMAT, version: OPERATIONS_VERSION, operations: data };
  if (data?.format !== OPERATIONS_FORMAT) throw new Error(`Este não é um arquivo de alterações (o campo "format" deve ser "${OPERATIONS_FORMAT}").`);
  if (data.version > OPERATIONS_VERSION) throw new Error('Arquivo de alterações criado por uma versão mais nova do Estúdio.');
  if (!Array.isArray(data.operations)) throw new Error('O arquivo de alterações não tem a lista "operations".');
  return {
    description: typeof data.description === 'string' ? data.description.slice(0, 500) : '',
    documentId: typeof data.documentId === 'string' ? data.documentId : '',
    operations: data.operations,
    assets: data.assets && typeof data.assets === 'object' && !Array.isArray(data.assets) ? data.assets : {},
  };
}

/* ------------------------------------------------------------------ diferenças */
/** Posições da maior subsequência crescente (para saber quais blocos de fato mudaram de lugar). */
function longestIncreasing(values) {
  const tails = [];
  const previous = new Array(values.length);
  const tailIndex = [];
  values.forEach((value, i) => {
    let lo = 0;
    let hi = tails.length;
    while (lo < hi) {
      const mid = (lo + hi) >> 1;
      if (tails[mid] < value) lo = mid + 1; else hi = mid;
    }
    tails[lo] = value;
    tailIndex[lo] = i;
    previous[i] = lo > 0 ? tailIndex[lo - 1] : -1;
  });
  const keep = new Set();
  for (let i = tailIndex[tails.length - 1]; i != null && i >= 0; i = previous[i]) keep.add(i);
  return keep;
}

/**
 * Resumo das diferenças entre duas versões (para revisar antes de aplicar):
 * blocos acrescentados, excluídos, alterados e movidos; opções de aparência,
 * textos fixos e nome.
 */
export function diffDocuments(before, after) {
  const beforeById = new Map(before.blocks.map((block) => [block.id, block]));
  const afterIds = new Set(after.blocks.map((block) => block.id));
  const added = after.blocks.filter((block) => !beforeById.has(block.id));
  const removed = before.blocks.filter((block) => !afterIds.has(block.id));
  const changed = after.blocks.filter((block) => beforeById.has(block.id) && JSON.stringify(block) !== JSON.stringify(beforeById.get(block.id)));
  const common = after.blocks.filter((block) => beforeById.has(block.id));
  const order = new Map(before.blocks.map((block, i) => [block.id, i]));
  const stay = longestIncreasing(common.map((block) => order.get(block.id)));
  const moved = common.filter((_, i) => !stay.has(i));
  const keysChanged = (a, b) => Object.keys({ ...a, ...b }).filter((key) => a[key] !== b[key]);
  return {
    added,
    removed,
    changed,
    moved,
    design: keysChanged(before.design, after.design),
    meta: keysChanged(before.meta, after.meta),
    renamed: before.name !== after.name,
    get empty() {
      return !this.added.length && !this.removed.length && !this.changed.length && !this.moved.length && !this.design.length && !this.meta.length && !this.renamed;
    },
  };
}
