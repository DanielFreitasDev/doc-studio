/**
 * Imagens do documento (prints, fotos, logo próprio).
 *
 * As imagens ficam num registro separado dos blocos: o bloco guarda apenas o
 * id da imagem. Assim o histórico de desfazer não copia megabytes a cada
 * tecla, e a prévia usa URLs curtas (blob:) em vez de repetir o base64 no HTML.
 */
import { uid, dataUrlToBlob } from './utils.js';

const ACCEPTED_TYPES = ['image/png', 'image/jpeg', 'image/webp', 'image/gif'];
const MAX_INPUT_BYTES = 20 * 1024 * 1024;
const MAX_DIMENSION = 2400;
const KEEP_ORIGINAL_BYTES = 1.5 * 1024 * 1024;
const DATA_URL_PREFIX = /^data:image\/(png|jpeg|webp|gif);base64,/;
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
 * Valida e prepara um arquivo de imagem. Imagens enormes são reduzidas para
 * no máximo 2400 px no maior lado (suficiente para impressão A4 nítida).
 */
export async function fileToAsset(file) {
  if (!isAcceptedImage(file)) throw new Error('Formato não suportado. Use PNG, JPG, WEBP ou GIF.');
  if (file.size > MAX_INPUT_BYTES) throw new Error('Imagem muito grande (máximo de 20 MB).');

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
    dataUrl = canvas.toDataURL(file.type === 'image/png' ? 'image/png' : 'image/jpeg', 0.9);
  }
  bitmap.close?.();

  return { dataUrl, width: finalWidth, height: finalHeight, name: (file.name || 'imagem').slice(0, 120) };
}

function isValidAsset(asset) {
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

    add(asset) {
      const id = uid('img');
      assets.set(id, asset);
      invalidate();
      return id;
    },

    get: (id) => assets.get(id),
    has: (id) => assets.has(id),

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
  return ids;
}
