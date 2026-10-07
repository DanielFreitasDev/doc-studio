/**
 * Arquivos do Estúdio no Node: leitura de documentos (completos ou "fonte",
 * com imagens referenciadas por caminho), tamanho de imagens e gravação.
 *
 * Um agente escreve imagens como `{ "src": "entrada/tela.png" }` em vez de
 * base64; `resolveAssets` lê o arquivo, descobre largura e altura e gera o
 * `dataUrl` que o app espera. A imagem é embutida como está, sem reduzir
 * nem recomprimir (a qualidade original vai para o PDF).
 */
import { readFile, writeFile, mkdir } from 'node:fs/promises';
import path from 'node:path';
import { FILE_FORMAT, migratePayload } from '../../js/model.js';

const MIME = { '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.webp': 'image/webp', '.gif': 'image/gif', '.svg': 'image/svg+xml' };
const ASSET_ID = /^[\w-]{1,64}$/;

/** Largura e altura de PNG, JPEG, GIF, WEBP ou SVG lendo só o cabeçalho. */
export function imageSize(buffer, mime) {
  if (mime === 'image/png' && buffer.toString('ascii', 12, 16) === 'IHDR') {
    return { width: buffer.readUInt32BE(16), height: buffer.readUInt32BE(20) };
  }
  if (mime === 'image/gif') return { width: buffer.readUInt16LE(6), height: buffer.readUInt16LE(8) };
  if (mime === 'image/jpeg') {
    let offset = 2;
    while (offset < buffer.length) {
      if (buffer[offset] !== 0xff) { offset += 1; continue; }
      const marker = buffer[offset + 1];
      const length = buffer.readUInt16BE(offset + 2);
      // SOF0–SOF15, exceto DHT (C4), JPG (C8) e DAC (CC).
      if (marker >= 0xc0 && marker <= 0xcf && ![0xc4, 0xc8, 0xcc].includes(marker)) {
        return { width: buffer.readUInt16BE(offset + 7), height: buffer.readUInt16BE(offset + 5) };
      }
      offset += 2 + length;
    }
  }
  if (mime === 'image/webp' && buffer.toString('ascii', 8, 12) === 'WEBP') {
    const chunk = buffer.toString('ascii', 12, 16);
    if (chunk === 'VP8 ') return { width: buffer.readUInt16LE(26) & 0x3fff, height: buffer.readUInt16LE(28) & 0x3fff };
    if (chunk === 'VP8L') {
      const bits = buffer.readUInt32LE(21);
      return { width: (bits & 0x3fff) + 1, height: ((bits >> 14) & 0x3fff) + 1 };
    }
    if (chunk === 'VP8X') return { width: buffer.readUIntLE(24, 3) + 1, height: buffer.readUIntLE(27, 3) + 1 };
  }
  if (mime === 'image/svg+xml') {
    const head = buffer.toString('utf8', 0, Math.min(buffer.length, 4096));
    const number = (name) => Number.parseFloat(new RegExp(`<svg[^>]*\\s${name}="([\\d.]+)(px)?"`).exec(head)?.[1]);
    const box = /viewBox="[\d.\s-]*?([\d.]+)[\s,]+([\d.]+)"/.exec(head);
    const width = number('width') || Number.parseFloat(box?.[1]);
    const height = number('height') || Number.parseFloat(box?.[2]);
    if (width && height) return { width: Math.round(width), height: Math.round(height) };
    return { width: 1000, height: 1000 };
  }
  throw new Error('não foi possível ler o tamanho da imagem (arquivo corrompido ou formato não suportado).');
}

/** Lê um arquivo de imagem do disco e devolve o asset no formato do app. */
export async function assetFromFile(file) {
  const mime = MIME[path.extname(file).toLowerCase()];
  if (!mime) throw new Error(`${file}: formato não suportado. Use PNG, JPG, WEBP, GIF ou SVG.`);
  const buffer = await readFile(file);
  if (buffer.length > 20 * 1024 * 1024) throw new Error(`${file}: imagem maior que 20 MB.`);
  const { width, height } = imageSize(buffer, mime);
  return { dataUrl: `data:${mime};base64,${buffer.toString('base64')}`, width, height, name: path.basename(file).slice(0, 120) };
}

/**
 * Transforma o JSON lido em { document, assets } no formato do app. Aceita o
 * arquivo completo ({ format, version, document, assets }) ou só o documento
 * ({ name, meta, design, blocks }).
 */
export function unwrap(data) {
  if (data?.format === FILE_FORMAT) {
    const current = migratePayload(data);
    return { document: current.document, assets: current.assets ?? {} };
  }
  if (data && Array.isArray(data.blocks)) return { document: data, assets: data.assets ?? {} };
  throw new Error(`não é um documento do Estúdio ("format": "${FILE_FORMAT}" com "document", ou um objeto com "blocks").`);
}

/** Imagens com `src` viram dataUrl (caminho relativo ao arquivo de origem). */
export async function resolveAssets(assets, baseDir) {
  const result = {};
  for (const [id, asset] of Object.entries(assets ?? {})) {
    if (!ASSET_ID.test(id)) throw new Error(`imagem “${id}”: id inválido (use letras, números, _ ou -).`);
    if (asset && typeof asset.src === 'string') {
      try {
        result[id] = await assetFromFile(path.resolve(baseDir, asset.src));
      } catch (error) {
        throw new Error(`imagem “${id}” (${asset.src}): ${error.code === 'ENOENT' ? 'arquivo não encontrado.' : error.message}`);
      }
    } else {
      result[id] = asset;
    }
  }
  return result;
}

export async function readText(file) {
  try {
    return await readFile(file, 'utf8');
  } catch (error) {
    throw new Error(`${file}: ${error.code === 'ENOENT' ? 'arquivo não encontrado.' : error.message}`);
  }
}

export async function readJson(file) {
  const text = await readText(file);
  try {
    return JSON.parse(text);
  } catch (error) {
    throw new Error(`${file}: JSON inválido (${error.message}).`);
  }
}

/** Lê um documento (completo ou fonte) e resolve as imagens. */
export async function loadDocumentFile(file) {
  const { document, assets } = unwrap(await readJson(file));
  return { document, assets: await resolveAssets(assets, path.dirname(path.resolve(file))) };
}

export async function writeJson(file, data) {
  await mkdir(path.dirname(path.resolve(file)), { recursive: true });
  await writeFile(file, `${JSON.stringify(data, null, 2)}\n`, 'utf8');
}

/** Dimensões das imagens (para a verificação de resolução). */
export function assetDimensions(assets) {
  return Object.fromEntries(Object.entries(assets).filter(([, a]) => a?.dataUrl).map(([id, a]) => [id, { width: a.width, height: a.height, svg: a.dataUrl.startsWith('data:image/svg') }]));
}
