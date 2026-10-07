/**
 * Ações de texto do menu de contexto: formatação, área de transferência e,
 * no "Escrever texto", as marcações de linha (# título, - lista, > destaque…).
 *
 * Só oferece o que o campo realmente suporta: a formatação aparece apenas em
 * campos cujo texto passa por renderInline() (os marcados com `data-plain`
 * são escapados e mostrariam os asteriscos); as marcações de linha, só onde
 * o texto é convertido por markdownToBlocks().
 */
import { FORMATS, formatState, effectiveRange, toggleFormat, clearFormat, hasFormatting, replaceText } from './markup.js';

const isMac = typeof navigator !== 'undefined' && /Mac|iPhone|iPad/.test(navigator.platform ?? '');

/** Atalho legível na plataforma ("Ctrl+B" ou "⌘B"). */
export function keys(combo) {
  return isMac ? combo.replace(/Ctrl\+/g, '⌘').replace(/Alt\+/g, '⌥').replace(/Shift\+/g, '⇧') : combo;
}

/* ------------------------------------------------------------------ área de transferência */
export async function writeClipboard(text) {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    // Alternativa antiga: copia por um campo temporário.
    const helper = Object.assign(document.createElement('textarea'), { value: text });
    helper.setAttribute('readonly', '');
    helper.style.cssText = 'position:fixed;opacity:0;pointer-events:none';
    document.body.append(helper);
    helper.select();
    let ok = false;
    try { ok = document.execCommand('copy'); } catch { ok = false; }
    helper.remove();
    return ok;
  }
}

const canReadClipboard = () => Boolean(navigator.clipboard?.readText);

/**
 * Cola o texto da área de transferência como se fosse um Ctrl+V: dispara um
 * evento "paste" (a tabela, por exemplo, distribui células do Excel) e, se
 * ninguém tratar, insere o texto no lugar da seleção.
 */
async function pasteInto(field, [start, end], notify) {
  let text;
  try {
    text = await navigator.clipboard.readText();
  } catch {
    notify?.(`O navegador não liberou a área de transferência para o menu. Use ${keys('Ctrl+V')}.`, 'error');
    return;
  }
  field.focus({ preventScroll: true });
  field.setSelectionRange(start, end);
  let handled = false;
  try {
    const data = new DataTransfer();
    data.setData('text/plain', text);
    handled = !field.dispatchEvent(new ClipboardEvent('paste', { clipboardData: data, bubbles: true, cancelable: true }));
  } catch { handled = false; }
  if (!handled && field.isConnected) {
    const clean = field instanceof HTMLInputElement ? text.replace(/\r?\n/g, ' ') : text;
    replaceText(field, start, end, clean);
  }
}

/* ------------------------------------------------------------------ marcações de linha (Markdown) */
const PREFIX = /^\s*(?:#{1,4}\s+|>\s?(?:\[![^\]]*\]\s*)?|[-*+•▪◦‣–]\s+|\d+[.)]\s+)/;
const ALERT_HEADER = /^\s*>\s*\[!\s*([^\]]+)\]\s*$/;

export const LINE_KINDS = [
  { id: 'paragraph', label: 'Parágrafo', icon: 'paragraph', mark: '' },
  { id: 'section', label: 'Seção numerada', icon: 'section', mark: '#', prefix: '# ' },
  { id: 'heading', label: 'Subtítulo', icon: 'heading', mark: '##', prefix: '## ' },
  { id: 'heading3', label: 'Título menor', icon: 'heading', mark: '###', prefix: '### ' },
  { id: 'bullet', label: 'Lista com marcadores', icon: 'list', mark: '-', prefix: '- ' },
  { id: 'ordered', label: 'Passo a passo', icon: 'steps', mark: '1.' },
  { id: 'callout', label: 'Destaque informativo', icon: 'callout', mark: '>', alert: '' },
  { id: 'warning', label: 'Destaque de atenção', icon: 'warning', mark: '[!ATENÇÃO]', alert: 'ATENÇÃO' },
  { id: 'tip', label: 'Dica', icon: 'sparkles', mark: '[!DICA]', alert: 'DICA' },
  { id: 'danger', label: 'Alerta', icon: 'warning', mark: '[!ALERTA]', alert: 'ALERTA' },
  { id: 'success', label: 'Sucesso', icon: 'check', mark: '[!SUCESSO]', alert: 'SUCESSO' },
];

const SNIPPETS = [
  { label: 'Tabela', icon: 'table', mark: '| a | b |', text: '| Coluna 1 | Coluna 2 |\n| --- | --- |\n| Texto | Texto |' },
  { label: 'Pergunta e resposta', icon: 'faq', mark: 'R:', text: 'Qual é a dúvida?\nR: Resposta direta.' },
  { label: 'Divisor', icon: 'divider', mark: '---', text: '---' },
  { label: 'Quebra de página', icon: 'pagebreak', mark: '/quebra', text: '/quebra' },
];

/** Linhas cobertas pela seleção: [início da primeira, fim da última]. */
function lineSpan(value, start, end) {
  const from = value.lastIndexOf('\n', start - 1) + 1;
  const last = end > start && value[end - 1] === '\n' ? end - 1 : end;
  const newline = value.indexOf('\n', last);
  return [from, newline < 0 ? value.length : newline];
}

/** Tipo atual da primeira linha selecionada (para marcar a opção no menu). */
function currentKind(lines) {
  const header = lines.map((line) => ALERT_HEADER.exec(line)).find(Boolean);
  if (header) {
    const name = header[1].trim().toUpperCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
    return LINE_KINDS.find((kind) => kind.alert && kind.alert.normalize('NFD').replace(/[\u0300-\u036f]/g, '') === name)?.id ?? 'callout';
  }
  const first = lines.find((line) => line.trim()) ?? '';
  if (/^\s*###\s/.test(first)) return 'heading3';
  if (/^\s*##\s/.test(first)) return 'heading';
  if (/^\s*#\s/.test(first)) return 'section';
  if (/^\s*>/.test(first)) return 'callout';
  if (/^\s*[-*+•▪◦‣–]\s/.test(first)) return 'bullet';
  if (/^\s*\d+[.)]\s/.test(first)) return 'ordered';
  return 'paragraph';
}

function transformLines(field, [start, end], kind) {
  const { value } = field;
  const [from, to] = lineSpan(value, start, end);
  const lines = value.slice(from, to).split('\n')
    .filter((line) => !ALERT_HEADER.test(line))
    .map((line) => line.replace(PREFIX, ''));
  let number = 1;
  let output;
  if (kind.id === 'ordered') output = lines.map((line) => (line.trim() ? `${number++}. ${line}` : line));
  else if (kind.alert !== undefined) output = [...(kind.alert ? [`> [!${kind.alert}]`] : []), ...lines.map((line) => (line.trim() ? `> ${line}` : '>'))];
  else output = lines.map((line) => (line.trim() && kind.prefix ? `${kind.prefix}${line}` : line));
  const text = output.join('\n');
  replaceText(field, from, to, text);
  field.setSelectionRange(from, from + text.length);
}

/** Insere um trecho pronto numa linha própria, depois das linhas selecionadas. */
function insertSnippet(field, [start, end], snippet) {
  const { value } = field;
  const [, to] = lineSpan(value, start, end);
  const before = value.slice(0, to);
  const lead = !before.trim() ? '' : before.endsWith('\n\n') ? '' : before.endsWith('\n') ? '\n' : '\n\n';
  const after = value.slice(to);
  const trail = after.startsWith('\n\n') || !after.trim() ? '' : after.startsWith('\n') ? '\n' : '\n\n';
  replaceText(field, to, to, `${lead}${snippet.text}${trail}`);
  const at = to + lead.length;
  field.setSelectionRange(at, at + snippet.text.length);
}

/* ------------------------------------------------------------------ itens do menu */
/**
 * Itens de texto para um campo. Opções:
 *  - formats:  oferece negrito, itálico… (o campo usa renderInline)
 *  - markdown: oferece as marcações de linha (o campo vira blocos)
 *  - notify:   aviso do app (para quando a colagem for bloqueada)
 */
export function textFieldItems(field, { formats = false, markdown = false, notify } = {}) {
  const range = [field.selectionStart ?? 0, field.selectionEnd ?? 0];
  const hasSelection = range[0] !== range[1];
  const selected = field.value.slice(...range);
  // Recoloca a seleção feita antes de abrir o menu (o foco passou pelo menu).
  const restore = () => {
    field.focus({ preventScroll: true });
    field.setSelectionRange(...range);
  };
  const items = [];

  if (formats) {
    const target = effectiveRange(field);
    const tools = Object.entries(FORMATS).map(([name, format]) => ({
      label: format.label,
      icon: format.icon,
      shortcut: format.key ? keys(`Ctrl+${format.key.toUpperCase()}`) : '',
      checked: Boolean(formatState(field.value, target[0], target[1], name)),
      run: () => { restore(); toggleFormat(field, name); },
    }));
    items.push({ row: tools, label: 'Formatação' });
    items.push({ label: 'Remover formatação', icon: 'eraser', disabled: !hasFormatting(field), run: () => { restore(); clearFormat(field); } });
  }

  if (markdown) {
    const [from, to] = lineSpan(field.value, ...range);
    const current = currentKind(field.value.slice(from, to).split('\n'));
    const many = field.value.slice(from, to).includes('\n');
    items.push({ separator: true });
    items.push({
      label: many ? 'Transformar as linhas em' : 'Transformar a linha em',
      icon: 'convert',
      submenu: LINE_KINDS.map((kind) => ({
        label: kind.label,
        icon: kind.icon,
        mark: kind.mark,
        radio: true,
        checked: kind.id === current,
        run: () => transformLines(field, range, kind),
      })),
    });
    items.push({
      label: 'Inserir',
      icon: 'plus',
      submenu: SNIPPETS.map((snippet) => ({ label: snippet.label, icon: snippet.icon, mark: snippet.mark, run: () => insertSnippet(field, range, snippet) })),
    });
  }

  items.push({ separator: true });
  items.push({
    label: 'Recortar', icon: 'scissors', shortcut: keys('Ctrl+X'), disabled: !hasSelection,
    run: async () => { if (await writeClipboard(selected)) replaceText(field, range[0], range[1], ''); },
  });
  items.push({
    label: 'Copiar', icon: 'copy', shortcut: keys('Ctrl+C'), disabled: !hasSelection,
    run: async () => { await writeClipboard(selected); restore(); },
  });
  if (canReadClipboard()) {
    items.push({ label: 'Colar', icon: 'clipboard', shortcut: keys('Ctrl+V'), run: () => pasteInto(field, range, notify) });
  }
  items.push({ label: 'Selecionar tudo', icon: 'select-all', shortcut: keys('Ctrl+A'), disabled: !field.value, run: () => { field.focus(); field.select(); } });
  return items;
}

/** Rótulo curto do campo, para o título do menu ("Texto", "Linha 2, coluna 1"…). */
export function fieldName(field) {
  return (field.labels?.[0]?.textContent || field.getAttribute('aria-label') || 'Texto').trim();
}

/** Título do menu de texto: o que está selecionado ou o nome do campo. */
export function textMenuTitle(field) {
  const length = Math.abs((field.selectionEnd ?? 0) - (field.selectionStart ?? 0));
  return length ? `Texto selecionado · ${length} ${length === 1 ? 'caractere' : 'caracteres'}` : fieldName(field);
}
