/**
 * Formatação inline simples (subconjunto de Markdown) usada em todos os textos.
 *
 * O documento guarda o texto com marcações (**negrito**, *itálico*,
 * ++sublinhado++, `código`, ==destaque==, ~~riscado~~ e [link](https://…)).
 * O usuário não precisa conhecê-las: os campos do editor são visuais
 * (js/richtext.js) e convertem o que se vê nessas marcações. O texto é sempre
 * escapado ANTES de virar HTML, então nenhum conteúdo digitado, colado ou
 * importado consegue injetar marcação. Uma barra invertida mantém o caractere
 * literal (\* mostra um asterisco).
 */
import { esc } from './utils.js';

/** Caracteres que uma barra invertida torna literais. */
const ESCAPABLE = /\\([\\*_`=~+[\]])/g;
// Marcadores internos (área de uso privado do Unicode) para trechos já prontos.
const SLOT = /\uE000(\d+)\uE001/g;
const HAS_SLOT = /\uE000\d+\uE001/;

const RULES = [
  [/\*\*([^*\n]+?)\*\*/g, '<strong>$1</strong>'],
  [/==([^=\n]+?)==/g, '<mark>$1</mark>'],
  [/~~([^~\n]+?)~~/g, '<s>$1</s>'],
  [/\+\+(?=\S)([^+\n]*?\S)\+\+/g, '<u>$1</u>'],
  [/\*([^\s*](?:[^*\n]*?[^\s*])?)\*/g, '<em>$1</em>'],
  [/(^|[^_\w])_([^_\s][^_\n]*?)_(?!\w)/g, '$1<em>$2</em>'],
];

/** Endereço aceito em links: só web, e-mail e telefone (nada de javascript: ou data:). */
export function safeUrl(url) {
  const value = String(url ?? '').trim();
  if (/^(https?:\/\/|mailto:|tel:)[^\s"'<>]+$/i.test(value)) return value;
  if (/^www\.[^\s"'<>]+$/i.test(value)) return `https://${value}`;
  return '';
}

/** Converte o texto do usuário em HTML seguro com formatação inline e quebras de linha. */
export function renderInline(text) {
  const slots = [];
  const keep = (html) => `\uE000${slots.push(html) - 1}\uE001`;
  let html = String(text ?? '').replace(/[\uE000\uE001]/g, '').replace(ESCAPABLE, (_, char) => keep(esc(char)));
  html = esc(html);
  html = html.replace(/`([^`\n]+)`/g, (_, code) => keep(`<code>${code}</code>`));
  // Link: a URL fica guardada (as regras seguintes não podem mexer nela) e o texto do link continua formatável.
  html = html.replace(/\[([^\]\n]+)\]\(([^)\s]+)\)/g, (match, label, url) => {
    const href = safeUrl(url.replaceAll('&amp;', '&'));
    return href ? `${keep(`<a href="${esc(href)}">`)}${label}${keep('</a>')}` : match;
  });
  for (const [pattern, replacement] of RULES) html = html.replace(pattern, replacement);
  while (HAS_SLOT.test(html)) html = html.replace(SLOT, (_, index) => slots[Number(index)]);
  return html.replace(/\n/g, '<br>');
}

const ENTITIES = { '&amp;': '&', '&lt;': '<', '&gt;': '>', '&quot;': '"', '&#39;': "'" };

/** Texto sem marcações (para resumos, títulos de arquivo e sumário). */
export function stripMarkup(text) {
  return renderInline(text)
    .replace(/<br>/g, ' ')
    .replace(/<[^>]+>/g, '')
    .replace(/&(?:amp|lt|gt|quot|#39);/g, (entity) => ENTITIES[entity])
    .replace(/\s+/g, ' ')
    .trim();
}

export const FORMATS = {
  bold: { marker: '**', label: 'Negrito', icon: 'bold', key: 'b' },
  italic: { marker: '*', label: 'Itálico', icon: 'italic', key: 'i' },
  underline: { marker: '++', label: 'Sublinhado', icon: 'underline', key: 'u' },
  strike: { marker: '~~', label: 'Riscado', icon: 'strike' },
  highlight: { marker: '==', label: 'Destaque', icon: 'highlight' },
  code: { marker: '`', label: 'Texto de tela', icon: 'code' },
};

const WORD_CHAR = /[\p{L}\p{N}_-]/u;

/**
 * Troca o trecho [start, end) de um <textarea>/<input> por `text`.
 * Usa execCommand('insertText') quando disponível: assim o Ctrl+Z nativo do
 * campo (usado no diálogo "Escrever texto") continua funcionando. Sem ele,
 * cai para setRangeText e avisa o app com um evento "input".
 */
export function replaceText(field, start, end, text) {
  field.focus({ preventScroll: true });
  field.setSelectionRange(start, end);
  let done = false;
  try {
    done = text ? document.execCommand('insertText', false, text) : document.execCommand('delete', false);
  } catch { done = false; }
  if (!done || field.value.slice(start, start + text.length) !== text) {
    field.setRangeText(text, start, end, 'end');
    field.dispatchEvent(new Event('input', { bubbles: true }));
  }
}

/** Quantos caracteres `char` seguidos existem a partir de `index`, andando em `step` (−1 ou +1). */
function runLength(value, index, step, char) {
  let count = 0;
  for (let i = index; i >= 0 && i < value.length && value[i] === char; i += step) count += 1;
  return count;
}

/**
 * Diz se o trecho [start, end) já tem a formatação: "outside" quando os
 * marcadores estão colados por fora da seleção (**|texto|**), "inside" quando
 * a seleção os inclui (|**texto**|) e null quando não está formatado.
 * O itálico (*) é distinguido do negrito (**) pela contagem de asteriscos.
 */
export function formatState(value, start, end, formatName) {
  const { marker } = FORMATS[formatName];
  const selected = value.slice(start, end);
  if (marker === '*' || marker === '**') {
    const odd = marker === '*';
    const matches = (left, right) => (odd ? left % 2 === 1 && right % 2 === 1 : left >= 2 && right >= 2);
    if (matches(runLength(value, start - 1, -1, '*'), runLength(value, end, 1, '*'))) return 'outside';
    const lead = runLength(selected, 0, 1, '*');
    const trail = runLength(selected, selected.length - 1, -1, '*');
    if (lead < selected.length && matches(lead, trail)) return 'inside';
    return null;
  }
  const size = marker.length;
  if (value.slice(start - size, start) === marker && value.slice(end, end + size) === marker) return 'outside';
  if (selected.length > size * 2 && selected.startsWith(marker) && selected.endsWith(marker)) return 'inside';
  return null;
}

/** Palavra em volta do cursor, quando ele está no meio dela (Ctrl+B sem seleção formata a palavra). */
export function wordRangeAt(value, position) {
  if (!WORD_CHAR.test(value[position - 1] ?? '') || !WORD_CHAR.test(value[position] ?? '')) return null;
  let start = position;
  let end = position;
  while (start > 0 && WORD_CHAR.test(value[start - 1])) start -= 1;
  while (end < value.length && WORD_CHAR.test(value[end])) end += 1;
  return [start, end];
}

/** Seleção atual do campo; sem seleção e com o cursor dentro de uma palavra, a palavra. */
export function effectiveRange(field) {
  const { selectionStart: start, selectionEnd: end, value } = field;
  return start === end ? wordRangeAt(value, start) ?? [start, end] : [start, end];
}

/**
 * Aplica/remove um marcador em volta da seleção de um <textarea>/<input>.
 * Sem seleção: formata a palavra sob o cursor ou insere um texto de exemplo selecionado.
 */
export function toggleFormat(field, formatName) {
  const { marker, label } = FORMATS[formatName];
  const [start, end] = effectiveRange(field);
  const { value } = field;
  const state = formatState(value, start, end, formatName);
  const size = marker.length;

  if (state === 'outside') {
    replaceText(field, start - size, end + size, value.slice(start, end));
    field.setSelectionRange(start - size, end - size);
  } else if (state === 'inside') {
    replaceText(field, start, end, value.slice(start + size, end - size));
    field.setSelectionRange(start, end - size * 2);
  } else {
    const content = value.slice(start, end) || label.toLowerCase();
    replaceText(field, start, end, `${marker}${content}${marker}`);
    field.setSelectionRange(start + size, start + size + content.length);
  }
}

/** Marcações completas (pares) — usadas para remover a formatação de um trecho. */
const PAIRS = [
  [/`([^`\n]+)`/g, '$1'],
  [/\+\+(?=\S)([^+\n]*?\S)\+\+/g, '$1'],
  [/\*\*([^*\n]+?)\*\*/g, '$1'],
  [/==([^=\n]+?)==/g, '$1'],
  [/~~([^~\n]+?)~~/g, '$1'],
  [/(^|[^*\w])\*([^*\s][^*\n]*?)\*(?!\w)/g, '$1$2'],
  [/(^|[^_\w])_([^_\s][^_\n]*?)_(?!\w)/g, '$1$2'],
];

function unwrapAll(text) {
  let previous;
  let current = text;
  do {
    previous = current;
    for (const [pattern, replacement] of PAIRS) current = current.replace(pattern, replacement);
  } while (current !== previous);
  return current;
}

/** O trecho tem alguma formatação (dentro dele ou colada por fora)? */
export function hasFormatting(field) {
  const [start, end] = effectiveRange(field);
  const { value } = field;
  return Object.keys(FORMATS).some((name) => formatState(value, start, end, name)) || unwrapAll(value.slice(start, end)) !== value.slice(start, end);
}

/** Remove toda a formatação do trecho selecionado (ou da palavra sob o cursor). */
export function clearFormat(field) {
  let [start, end] = effectiveRange(field);
  const { value } = field;
  // Marcadores colados por fora: alarga o trecho enquanto houver pares em volta.
  let grew = true;
  while (grew) {
    grew = false;
    for (const name of Object.keys(FORMATS)) {
      if (formatState(value, start, end, name) === 'outside') {
        const size = FORMATS[name].marker.length;
        start -= size;
        end += size;
        grew = true;
      }
    }
  }
  const original = value.slice(start, end);
  let text = unwrapAll(original);
  // Seleção que é um único trecho formatado (|**texto**|) sem par interno reconhecido.
  for (const name of Object.keys(FORMATS)) {
    if (formatState(text, 0, text.length, name) === 'inside') {
      const size = FORMATS[name].marker.length;
      text = text.slice(size, -size);
    }
  }
  if (text === original) return;
  replaceText(field, start, end, text);
  field.setSelectionRange(start, start + text.length);
}
