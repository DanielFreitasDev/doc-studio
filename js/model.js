/**
 * Modelo do documento: criação, validação (normalização) e formato de arquivo.
 *
 * Tudo que vem de fora (arquivo .json importado ou banco local) passa por
 * `normalizeDocument`, que reconstrói o documento campo a campo a partir do
 * catálogo de blocos e das opções de design. Campos desconhecidos são
 * descartados e tipos errados voltam ao valor padrão.
 */
import { uid } from './utils.js';
import { normalizeBlock, createBlock } from './schema.js';
import { normalizeDesign, normalizeMeta } from './design.js';

export const FILE_FORMAT = 'doc-studio';
export const FILE_VERSION = 1;
export const MAX_BLOCKS = 2000;

export function createDocument({ name = 'Documento sem título', meta = {}, design = {}, blocks = [] } = {}) {
  const now = Date.now();
  return {
    schema: FILE_VERSION,
    id: uid('d'),
    name,
    createdAt: now,
    updatedAt: now,
    meta: normalizeMeta(meta),
    design: normalizeDesign(design),
    blocks: blocks.map(({ type, ...props }) => createBlock(type, props)),
  };
}

export function normalizeDocument(raw, { keepId = true } = {}) {
  if (!raw || typeof raw !== 'object' || !Array.isArray(raw.blocks)) {
    throw new Error('O arquivo não contém um documento válido.');
  }
  const seenIds = new Set();
  const blocks = raw.blocks.slice(0, MAX_BLOCKS).map(normalizeBlock).filter(Boolean).map((block) => {
    if (seenIds.has(block.id)) block.id = uid('b');
    seenIds.add(block.id);
    return block;
  });
  return {
    schema: FILE_VERSION,
    id: keepId && typeof raw.id === 'string' && /^[\w-]{1,40}$/.test(raw.id) ? raw.id : uid('d'),
    name: typeof raw.name === 'string' && raw.name.trim() ? raw.name.slice(0, 120) : 'Documento importado',
    createdAt: Number.isFinite(raw.createdAt) ? raw.createdAt : Date.now(),
    updatedAt: Number.isFinite(raw.updatedAt) ? raw.updatedAt : Date.now(),
    meta: normalizeMeta(raw.meta),
    design: normalizeDesign(raw.design),
    blocks,
  };
}

/** Conteúdo do arquivo .json exportado (documento + imagens usadas). */
export function toFilePayload(doc, assets) {
  return {
    format: FILE_FORMAT,
    version: FILE_VERSION,
    exportedAt: new Date().toISOString(),
    document: doc,
    assets,
  };
}

/**
 * Migrações do formato: `MIGRATIONS[n]` recebe um arquivo da versão n e
 * devolve o equivalente na versão n + 1. Ao mudar a estrutura de forma
 * incompatível, suba FILE_VERSION e acrescente a migração aqui; arquivos
 * antigos continuam abrindo (no app e em tools/docstudio.mjs).
 */
const MIGRATIONS = {};

/** Leva um arquivo de qualquer versão anterior até a atual. */
export function migratePayload(data) {
  let version = Number.isInteger(data.version) && data.version > 0 ? data.version : 1;
  if (version > FILE_VERSION) throw new Error('Arquivo criado por uma versão mais nova do Estúdio. Atualize o app para abri-lo.');
  let result = data;
  while (version < FILE_VERSION) {
    result = MIGRATIONS[version](result);
    version += 1;
  }
  return { ...result, version: FILE_VERSION };
}

/** Lê o texto de um .json exportado. Lança erro com mensagem amigável se for inválido. */
export function parseFilePayload(text) {
  let data;
  try {
    data = JSON.parse(text);
  } catch {
    throw new Error('O arquivo não é um JSON válido.');
  }
  if (data?.format !== FILE_FORMAT) throw new Error('Este arquivo não foi gerado pelo Estúdio de Documentos.');
  data = migratePayload(data);
  return {
    doc: normalizeDocument(data.document, { keepId: false }),
    assets: data.assets && typeof data.assets === 'object' ? data.assets : {},
  };
}

/** Cópia de um bloco com novo id (para duplicar). */
export function cloneBlock(block) {
  return { ...structuredClone(block), id: uid('b') };
}
