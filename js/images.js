/**
 * Imagens do documento (prints, fotos, logo próprio).
 *
 * As imagens ficam num registro separado dos blocos: o bloco guarda apenas o
 * id da imagem. Assim o histórico de desfazer não copia megabytes a cada
 * tecla, e a prévia usa URLs curtas (blob:) em vez de repetir o base64 no HTML.
 */
import { uid, dataUrlToBlob } from './utils.js';

const ACCEPTED_TYPES = ['image/png', 'image/jpeg', 'image/webp', 'image/gif', 'image/svg+xml'];
const MAX_INPUT_BYTES = 20 * 1024 * 1024;
const MAX_SVG_BYTES = 4 * 1024 * 1024;
// 3508 px = lado maior de uma folha A4 a 300 dpi: fotos de capa e prints saem nítidos no PDF.
const MAX_DIMENSION = 3508;
const KEEP_ORIGINAL_BYTES = 2.5 * 1024 * 1024;
const DATA_URL_PREFIX = /^data:image\/(png|jpeg|webp|gif|svg\+xml);base64,/;
const BASE64_BODY = /^[A-Za-z0-9+/]+={0,2}$/;

export function isAcceptedImage(file) {
  return Boolean(file) && ACCEPTED_TYPES.includes(file.type);
}

function readAsDataUrl(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(file);
  });
}

/**
 * SVG (logo vetorial): guardado como está e exibido só por <img>/<image>, que
 * nunca executam scripts do arquivo. O tamanho vem dos atributos ou do viewBox.
 */
async function svgToAsset(file) {
  if (file.size > MAX_SVG_BYTES) throw new Error('Arquivo SVG muito grande (máximo de 4 MB).');
  const dataUrl = await readAsDataUrl(file);
  const image = new Image();
  image.src = dataUrl;
  try {
    await image.decode();
  } catch {
    throw new Error('Não foi possível ler o SVG. Confira se o arquivo é uma imagem válida.');
  }
  const width = image.naturalWidth || 1000;
  const height = image.naturalHeight || 1000;
  return { dataUrl, width, height, name: (file.name || 'imagem').slice(0, 120) };
}

/**
 * Valida e prepara um arquivo de imagem. Imagens enormes são reduzidas para
 * no máximo 3508 px no maior lado (A4 a 300 dpi: impressão nítida). SVG
 * continua vetorial.
 */
export async function fileToAsset(file) {
  if (!isAcceptedImage(file)) throw new Error('Formato não suportado. Use PNG, JPG, WEBP, GIF ou SVG.');
  if (file.size > MAX_INPUT_BYTES) throw new Error('Imagem muito grande (máximo de 20 MB).');
  if (file.type === 'image/svg+xml') return svgToAsset(file);

  let bitmap;
  try {
    bitmap = await createImageBitmap(file);
  } catch {
    throw new Error('Não foi possível ler a imagem. O arquivo pode estar corrompido.');
  }

  const { width, height } = bitmap;
  const scale = Math.min(1, MAX_DIMENSION / Math.max(width, height));
  const keepOriginal = file.type === 'image/gif' || (scale === 1 && (file.size <= KEEP_ORIGINAL_BYTES || file.type === 'image/png'));

  let dataUrl;
  let finalWidth = width;
  let finalHeight = height;
  if (keepOriginal) {
    dataUrl = await readAsDataUrl(file);
  } else {
    finalWidth = Math.round(width * scale);
    finalHeight = Math.round(height * scale);
    const canvas = Object.assign(document.createElement('canvas'), { width: finalWidth, height: finalHeight });
    const context = canvas.getContext('2d');
    context.imageSmoothingQuality = 'high';
    context.drawImage(bitmap, 0, 0, finalWidth, finalHeight);
    // PNG e WEBP podem ter transparência (logos): continuam PNG. Fotos viram JPEG de alta qualidade.
    dataUrl = canvas.toDataURL(['image/png', 'image/webp'].includes(file.type) ? 'image/png' : 'image/jpeg', 0.92);
  }
  bitmap.close?.();

  return { dataUrl, width: finalWidth, height: finalHeight, name: (file.name || 'imagem').slice(0, 120) };
}

export function isValidAsset(asset) {
  if (!asset || typeof asset.dataUrl !== 'string' || asset.dataUrl.length > 40 * 1024 * 1024) return false;
  const prefix = DATA_URL_PREFIX.exec(asset.dataUrl);
  return Boolean(prefix) && BASE64_BODY.test(asset.dataUrl.slice(prefix[0].length))
    && Number.isFinite(asset.width) && Number.isFinite(asset.height) && asset.width > 0 && asset.height > 0;
}

export function createAssetRegistry() {
  const assets = new Map();
  const objectUrls = new Map();
  let renderMap = null;

  const invalidate = () => { renderMap = null; };

  return {
    /** Carrega as imagens de um documento salvo, descartando entradas inválidas. */
    load(raw = {}) {
      this.clear();
      for (const [id, asset] of Object.entries(raw ?? {})) {
        if (/^[\w-]{1,64}$/.test(id) && isValidAsset(asset)) {
          assets.set(id, { dataUrl: asset.dataUrl, width: Math.round(asset.width), height: Math.round(asset.height), name: String(asset.name ?? '').slice(0, 120) });
        }
      }
      invalidate();
    },

    /** Acrescenta imagens vindas de fora (blocos colados de outro documento), sem trocar as atuais. */
    merge(raw = {}) {
      for (const [id, asset] of Object.entries(raw ?? {})) {
        if (!assets.has(id) && /^[\w-]{1,64}$/.test(id) && isValidAsset(asset)) {
          assets.set(id, { dataUrl: asset.dataUrl, width: Math.round(asset.width), height: Math.round(asset.height), name: String(asset.name ?? '').slice(0, 120) });
        }
      }
      invalidate();
    },

    add(asset) {
      const id = uid('img');
      assets.set(id, asset);
      invalidate();
      return id;
    },

    get: (id) => assets.get(id),
    has: (id) => assets.has(id),
    ids: () => [...assets.keys()],

    /** Tamanho de cada imagem (para a verificação de resolução), sem os dados. */
    dimensions() {
      return Object.fromEntries([...assets].map(([id, a]) => [id, { width: a.width, height: a.height, svg: a.dataUrl.startsWith('data:image/svg') }]));
    },

    /** Mapa id → { url, width, height } usado pelo renderizador. */
    renderMap() {
      if (renderMap) return renderMap;
      renderMap = {};
      for (const [id, asset] of assets) {
        if (!objectUrls.has(id)) objectUrls.set(id, URL.createObjectURL(dataUrlToBlob(asset.dataUrl)));
        renderMap[id] = { url: objectUrls.get(id), width: asset.width, height: asset.height };
      }
      return renderMap;
    },

    /** Serializa só as imagens ainda usadas pelo documento. */
    serialize(usedIds) {
      const result = {};
      for (const id of usedIds) {
        const asset = assets.get(id);
        if (asset) result[id] = { ...asset };
      }
      return result;
    },

    clear() {
      objectUrls.forEach((url) => URL.revokeObjectURL(url));
      objectUrls.clear();
      assets.clear();
      invalidate();
    },
  };
}

/** Ids de imagem referenciados pelo documento (blocos de imagem e logo próprio). */
export function usedAssetIds(doc) {
  const ids = new Set();
  for (const block of doc.blocks) if (block.type === 'image' && block.assetId) ids.add(block.assetId);
  if (doc.design.customLogo) ids.add(doc.design.customLogo);
  if (doc.design.coverImage) ids.add(doc.design.coverImage);
  return ids;
}
