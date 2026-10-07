/**
 * Formatação inline simples (subconjunto de Markdown) usada em todos os textos.
 *
 * Por que não usar contenteditable/HTML livre: o usuário escreve em campos de
 * texto comuns e marca trechos com **negrito**, *itálico*, `código`,
 * ==destaque== e ~~riscado~~. O texto é sempre escapado ANTES de virar HTML,
 * então nenhum conteúdo digitado ou importado consegue injetar marcação.
 */
import { esc } from './utils.js';

const RULES = [
  [/`([^`\n]+)`/g, '<code>$1</code>'],
  [/\*\*([^*\n]+?)\*\*/g, '<strong>$1</strong>'],
  [/==([^=\n]+?)==/g, '<mark>$1</mark>'],
  [/~~([^~\n]+?)~~/g, '<s>$1</s>'],
  [/(^|[^*\w])\*([^*\s][^*\n]*?)\*(?!\w)/g, '$1<em>$2</em>'],
  [/(^|[^_\w])_([^_\s][^_\n]*?)_(?!\w)/g, '$1<em>$2</em>'],
];

/** Converte o texto do usuário em HTML seguro com formatação inline e quebras de linha. */
export function renderInline(text) {
  let html = esc(text ?? '');
  for (const [pattern, replacement] of RULES) html = html.replace(pattern, replacement);
  return html.replace(/\n/g, '<br>');
}

/** Texto sem marcações (para resumos, títulos de arquivo e sumário). */
export function stripMarkup(text) {
  return String(text ?? '')
    .replace(/\*\*|==|~~|`/g, '')
    .replace(/(^|\s)[*_]([^*_]+)[*_]/g, '$1$2')
    .replace(/\s+/g, ' ')
    .trim();
}

export const FORMATS = {
  bold: { marker: '**', label: 'Negrito', icon: 'bold', key: 'b' },
  italic: { marker: '*', label: 'Itálico', icon: 'italic', key: 'i' },
  code: { marker: '`', label: 'Código', icon: 'code' },
  highlight: { marker: '==', label: 'Destaque', icon: 'highlight' },
  strike: { marker: '~~', label: 'Riscado', icon: 'strike' },
};

/**
 * Aplica/remove um marcador em volta da seleção de um <textarea>/<input>.
 * Usa setRangeText para manter o histórico nativo de edição o mais intacto possível.
 */
export function toggleFormat(field, formatName) {
  const { marker } = FORMATS[formatName];
  const { selectionStart: start, selectionEnd: end, value } = field;
  const selected = value.slice(start, end);
  const before = value.slice(Math.max(0, start - marker.length), start);
  const after = value.slice(end, end + marker.length);

  if (before === marker && after === marker) {
    field.setRangeText(selected, start - marker.length, end + marker.length, 'select');
  } else if (selected.startsWith(marker) && selected.endsWith(marker) && selected.length >= marker.length * 2) {
    field.setRangeText(selected.slice(marker.length, -marker.length), start, end, 'select');
  } else {
    const content = selected || FORMATS[formatName].label.toLowerCase();
    field.setRangeText(`${marker}${content}${marker}`, start, end, 'end');
    field.setSelectionRange(start + marker.length, start + marker.length + content.length);
  }
  field.dispatchEvent(new Event('input', { bubbles: true }));
  field.focus();
}
