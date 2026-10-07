/**
 * Caracteres que as fontes do projeto desenham (tabela `cmap` dos arquivos
 * WOFF em assets/fonts). Usado pelo `docstudio check` para conferir a lista
 * de `TYPOGRAPHY.glyphRanges` em js/brand.js.
 */
import { readFile } from 'node:fs/promises';
import { inflateSync } from 'node:zlib';

/** Tabela `cmap` de um WOFF 1.0 (tabelas comprimidas com zlib). */
function cmapTable(buffer) {
  const tables = buffer.readUInt16BE(12);
  for (let i = 0; i < tables; i += 1) {
    const entry = 44 + i * 20;
    if (buffer.toString('latin1', entry, entry + 4) !== 'cmap') continue;
    const offset = buffer.readUInt32BE(entry + 4);
    const compressed = buffer.readUInt32BE(entry + 8);
    const original = buffer.readUInt32BE(entry + 12);
    const raw = buffer.subarray(offset, offset + compressed);
    return compressed < original ? inflateSync(raw) : raw;
  }
  throw new Error('fonte sem tabela cmap');
}

/** Códigos Unicode com glifo numa fonte WOFF (subtabelas de formato 4 e 12). */
export async function fontCodepoints(file) {
  const cmap = cmapTable(await readFile(file));
  const codepoints = new Set();
  for (let i = 0; i < cmap.readUInt16BE(2); i += 1) {
    const offset = cmap.readUInt32BE(8 + i * 8);
    const format = cmap.readUInt16BE(offset);
    if (format === 4) {
      const segments2 = cmap.readUInt16BE(offset + 6);
      const ends = offset + 14;
      const starts = ends + segments2 + 2;
      const deltas = starts + segments2;
      const rangeOffsets = deltas + segments2;
      for (let s = 0; s < segments2 / 2; s += 1) {
        const end = cmap.readUInt16BE(ends + s * 2);
        const start = cmap.readUInt16BE(starts + s * 2);
        const delta = cmap.readInt16BE(deltas + s * 2);
        const rangeOffset = cmap.readUInt16BE(rangeOffsets + s * 2);
        for (let code = start; code <= end && code !== 0xffff; code += 1) {
          let glyph = rangeOffset ? cmap.readUInt16BE(rangeOffsets + s * 2 + rangeOffset + (code - start) * 2) : code;
          if (glyph) glyph = (glyph + delta) & 0xffff;
          if (glyph) codepoints.add(code);
        }
      }
    } else if (format === 12) {
      for (let g = 0; g < cmap.readUInt32BE(offset + 12); g += 1) {
        const group = offset + 16 + g * 12;
        for (let code = cmap.readUInt32BE(group); code <= cmap.readUInt32BE(group + 4); code += 1) codepoints.add(code);
      }
    }
  }
  return codepoints;
}

/** Faixas [início, fim] dos caracteres presentes em todas as fontes. */
export async function commonGlyphRanges(files) {
  const sets = await Promise.all(files.map(fontCodepoints));
  const common = [...sets[0]].filter((code) => sets.every((set) => set.has(code))).sort((a, b) => a - b);
  const ranges = [];
  for (const code of common) {
    const last = ranges.at(-1);
    if (last && last[1] === code - 1) last[1] = code;
    else ranges.push([code, code]);
  }
  return ranges;
}
