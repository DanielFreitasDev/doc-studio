/**
 * Campo de texto visual (WYSIWYG): o usuário vê o negrito em negrito, o link
 * sublinhado e assim por diante, sem conhecer a marcação.
 *
 * Como funciona: o campo é um elemento `contenteditable` que só serve de
 * superfície. O valor de verdade continua sendo o texto com marcações de
 * js/markup.js (**negrito**, *itálico*…), que o documento guarda, desfaz e
 * exporta como antes:
 *
 *   marcação ──renderInline()──▶ HTML do campo ──(digitação)──▶ DOM ──richMarkup()──▶ marcação
 *
 * Segurança e previsibilidade:
 *  - o HTML do campo nasce sempre de renderInline() (texto escapado);
 *  - colar e soltar nunca inserem HTML de fora: o conteúdo colado vira
 *    marcação (só negrito, itálico, sublinhado, riscado e links) e é
 *    desenhado de novo por renderInline();
 *  - formatar não usa document.execCommand (cada navegador gera um HTML
 *    diferente): a seleção vira um intervalo de caracteres, a formatação é
 *    aplicada no modelo de "trechos" e o campo é redesenhado.
 *
 * Tipos de campo (atributos no elemento):
 *  - data-rich="single"  uma linha (Enter não quebra);
 *  - data-rich="multi"   várias linhas; linha em branco separa parágrafos;
 *  - data-rich="lines"   uma linha por item (listas e etiquetas).
 */
import { renderInline, safeUrl, FORMATS } from './markup.js';
import { linkDialog } from './dialogs.js';

const FORMAT_TAGS = {
  B: 'bold', STRONG: 'bold', I: 'italic', EM: 'italic', U: 'underline', INS: 'underline',
  S: 'strike', STRIKE: 'strike', DEL: 'strike', MARK: 'highlight', CODE: 'code', KBD: 'code', TT: 'code',
};
const BLOCK_TAGS = new Set(['ADDRESS', 'ARTICLE', 'ASIDE', 'BLOCKQUOTE', 'DD', 'DIV', 'DL', 'DT', 'FIGCAPTION', 'FIGURE', 'FOOTER',
  'H1', 'H2', 'H3', 'H4', 'H5', 'H6', 'HEADER', 'HR', 'LI', 'OL', 'P', 'PRE', 'SECTION', 'TABLE', 'TR', 'UL']);
const SKIP_TAGS = new Set(['SCRIPT', 'STYLE', 'TEMPLATE', 'HEAD', 'META', 'TITLE', 'NOSCRIPT', 'IFRAME', 'OBJECT', 'SVG', 'IMG', 'VIDEO', 'AUDIO', 'CANVAS']);
// Ordem de aninhamento (de fora para dentro) que renderInline() sabe ler de volta.
const NESTING = ['link', 'italic', 'underline', 'strike', 'highlight', 'bold', 'code'];
const WORD_CHAR = /[\p{L}\p{N}_-]/u;

/* ------------------------------------------------------------------ marcação ⇄ HTML */
/** Escapa caracteres que seriam lidos como marcação ("2 * 3", "C++", "a == b"). */
export function escapeMarkup(text) {
  return String(text ?? '')
    .replace(/[\\*_`[\]]/g, '\\$&')
    .replace(/([=~+])\1+/g, (run) => run.replace(/./g, '\\$&'));
}

/** HTML de edição para um valor (negrito e itálico como <b>/<i>). */
export function richHtml(markup) {
  const html = renderInline(markup)
    .replace(/<(\/?)strong>/g, '<$1b>')
    .replace(/<(\/?)em>/g, '<$1i>');
  // Uma linha vazia no fim só aparece com um <br> extra.
  return html.endsWith('<br>') ? `${html}<br>` : html;
}

/** Formatação herdada por um elemento (tags e, em textos colados, estilos inline). */
function formatsOf(element, inherited) {
  const next = { ...inherited };
  const name = FORMAT_TAGS[element.tagName];
  if (name) next[name] = true;
  if (element.tagName === 'A') {
    const href = safeUrl(element.getAttribute('href'));
    if (href) next.link = href;
  }
  const style = element.style;
  if (style?.cssText) {
    const weight = style.fontWeight;
    if (weight === 'bold' || weight === 'bolder' || Number(weight) >= 600) next.bold = true;
    else if (weight === 'normal' || weight === 'lighter' || (Number(weight) > 0 && Number(weight) < 600)) delete next.bold;
    if (style.fontStyle === 'italic' || style.fontStyle === 'oblique') next.italic = true;
    else if (style.fontStyle === 'normal') delete next.italic;
    const decoration = `${style.textDecorationLine} ${style.textDecoration}`;
    if (decoration.includes('underline')) next.underline = true;
    if (decoration.includes('line-through')) next.strike = true;
  }
  return next;
}

const sameFormats = (a, b) => NESTING.every((key) => (a[key] ?? '') === (b[key] ?? ''));

/**
 * Lê o DOM como uma lista de trechos `{ text, f }` (f = formatação). Quebras
 * de linha viram trechos "\n". `paste` trata HTML de fora: espaços colapsados
 * e parágrafos separados por `paragraphBreak`.
 */
function collectRuns(root, { paste = false, paragraphBreak = '\n' } = {}) {
  const runs = [];
  let pendingBreak = false;
  const push = (text, formats) => {
    if (!text) return;
    if (pendingBreak && runs.length) for (const char of paragraphBreak) runs.push({ text: char, f: {} });
    pendingBreak = false;
    const last = runs.at(-1);
    if (text !== '\n' && last && last.text !== '\n' && sameFormats(last.f, formats)) last.text += text;
    else runs.push({ text, f: formats });
  };
  const walk = (node, formats, pre) => {
    for (const child of node.childNodes) {
      if (child.nodeType === Node.TEXT_NODE) {
        let text = child.data.replace(/ /g, ' ').replace(/[​]/g, '');
        if (paste && !pre) text = text.replace(/\s+/g, ' ');
        if (paste && !pre && text === ' ' && (!runs.length || runs.at(-1).text.endsWith(' ') || runs.at(-1).text === '\n')) continue;
        if (pre) text.split(/\r?\n/).forEach((line, i) => { if (i) push('\n', {}); push(line, formats); });
        else push(text, formats);
      } else if (child.nodeType === Node.ELEMENT_NODE) {
        const tag = child.tagName;
        if (SKIP_TAGS.has(tag)) continue;
        if (tag === 'BR') { push('\n', {}); continue; }
        const block = BLOCK_TAGS.has(tag);
        if (block && runs.length) pendingBreak = true;
        walk(child, formatsOf(child, formats), pre || tag === 'PRE');
        if (block) pendingBreak = true;
        if (tag === 'TD' || tag === 'TH') push(' ', formats);
      }
    }
  };
  walk(root, {}, false);
  // Na superfície de edição, o último <br> é só o que mantém a linha vazia visível.
  if (!paste && root.lastChild?.nodeName === 'BR' && runs.at(-1)?.text === '\n') runs.pop();
  return runs;
}

function groupBy(runs, key) {
  const groups = [];
  for (const run of runs) {
    const value = run.f[key] ?? '';
    const last = groups.at(-1);
    if (last && last.value === value) last.runs.push(run);
    else groups.push({ value, runs: [run] });
  }
  return groups;
}

/**
 * Um "+", "=" ou "~" solto na ponta de um trecho formatado encostaria no
 * marcador ("C+" sublinhado viraria "++C+++"): ali ele precisa de escape.
 */
function guardEdges(core, char) {
  if (!'+=~'.includes(char)) return core;
  let text = core;
  if (text.endsWith(char) && !text.endsWith(`\\${char}`)) text = `${text.slice(0, -1)}\\${char}`;
  if (text.startsWith(char)) text = `\\${text}`;
  return text;
}

/** Monta a marcação de uma linha, aninhando na ordem que renderInline() entende. */
function emit(runs, level = 0) {
  if (level >= NESTING.length) return runs.map((run) => escapeMarkup(run.text)).join('');
  const key = NESTING[level];
  return groupBy(runs, key).map(({ value, runs: group }) => {
    const inner = emit(group, level + 1);
    if (!value) return inner;
    // Espaços nas pontas ficam fora das marcas ("** a**" não seria lido como negrito).
    const [, lead, core, trail] = /^(\s*)([\s\S]*?)(\s*)$/.exec(inner);
    if (!core) return inner;
    const marked = key === 'link'
      ? `[${core}](${value.replace(/\)/g, '%29').replace(/\s/g, '%20')})`
      : `${FORMATS[key].marker}${guardEdges(core, FORMATS[key].marker[0])}${FORMATS[key].marker}`;
    return `${lead}${marked}${trail}`;
  }).join('');
}

function runsToMarkup(runs) {
  const lines = [[]];
  for (const run of runs) {
    if (run.text === '\n') lines.push([]);
    else lines.at(-1).push(run);
  }
  return lines.map((line) => emit(line)).join('\n');
}

/** Valor (marcação) de um campo visual. */
export function richMarkup(element) {
  const markup = runsToMarkup(collectRuns(element));
  return element.dataset.rich === 'single' ? markup.replace(/\n/g, ' ') : markup;
}

/** Converte HTML colado (Word, navegador, e-mail) em marcação segura. */
export function pastedHtmlToMarkup(html, { paragraphBreak = '\n\n' } = {}) {
  const parsed = new DOMParser().parseFromString(html, 'text/html');
  return runsToMarkup(collectRuns(parsed.body, { paste: true, paragraphBreak })).replace(/[ \t]+\n/g, '\n').trim();
}

/* ------------------------------------------------------------------ posição do cursor */
/** Nós que contam caracteres: texto (seu tamanho) e <br> (1, a quebra de linha). */
function countedNodes(element) {
  const nodes = [];
  const walker = document.createTreeWalker(element, NodeFilter.SHOW_TEXT | NodeFilter.SHOW_ELEMENT, {
    acceptNode: (node) => (node.nodeType === Node.TEXT_NODE || node.nodeName === 'BR' ? NodeFilter.FILTER_ACCEPT : NodeFilter.FILTER_SKIP),
  });
  for (let node = walker.nextNode(); node; node = walker.nextNode()) nodes.push(node);
  if (nodes.at(-1)?.nodeName === 'BR' && element.lastChild === nodes.at(-1)) nodes.pop();
  return nodes;
}

const nodeLength = (node) => (node.nodeType === Node.TEXT_NODE ? node.data.length : 1);

function offsetOf(element, container, offset) {
  const range = document.createRange();
  range.setStart(element, 0);
  range.setEnd(container, offset);
  let total = 0;
  for (const node of countedNodes(element)) {
    if (node === container) return total + offset;
    if (!range.intersectsNode(node)) break;
    total += nodeLength(node);
  }
  return total;
}

function pointAt(element, offset) {
  let remaining = offset;
  for (const node of countedNodes(element)) {
    const length = nodeLength(node);
    if (node.nodeType === Node.TEXT_NODE && remaining <= length) return [node, remaining];
    if (node.nodeName === 'BR' && remaining === 0) return [node.parentNode, [...node.parentNode.childNodes].indexOf(node)];
    remaining -= length;
  }
  const last = element.lastChild?.nodeName === 'BR' ? element.childNodes.length - 1 : element.childNodes.length;
  return [element, Math.max(0, last)];
}

/** Seleção do campo em caracteres [início, fim], ou null se ela não estiver nele. */
export function getRichSelection(element) {
  const selection = window.getSelection();
  if (!selection?.rangeCount) return null;
  const range = selection.getRangeAt(0);
  if (!element.contains(range.startContainer) || !element.contains(range.endContainer)) return null;
  return [offsetOf(element, range.startContainer, range.startOffset), offsetOf(element, range.endContainer, range.endOffset)];
}

export function setRichSelection(element, [start, end]) {
  const selection = window.getSelection();
  const range = document.createRange();
  range.setStart(...pointAt(element, start));
  range.setEnd(...pointAt(element, end));
  selection.removeAllRanges();
  selection.addRange(range);
}

/** Texto puro do campo (quebras como "\n"), na mesma contagem da seleção. */
function plainText(element) {
  return countedNodes(element).map((node) => (node.nodeType === Node.TEXT_NODE ? node.data : '\n')).join('');
}

/* ------------------------------------------------------------------ memória de seleção */
// A seleção é guardada em caracteres: continua válida depois de o campo ser redesenhado.
const savedSelection = new WeakMap();

export const richFieldOf = (node) => (node instanceof Element ? node : node?.parentElement)?.closest?.('[data-rich]') ?? null;

/** Foca o campo e devolve a última seleção feita nele (o foco pode ter passado por um menu). */
export function restoreRichSelection(element) {
  if (document.activeElement !== element) element.focus({ preventScroll: true });
  const current = getRichSelection(element);
  if (current) return current;
  const saved = savedSelection.get(element) ?? [plainText(element).length, plainText(element).length];
  setRichSelection(element, saved);
  return saved;
}

/** Seleção efetiva: a seleção feita ou, sem seleção, a palavra sob o cursor. */
function effectiveSelection(element, [start, end]) {
  if (start !== end) return [Math.min(start, end), Math.max(start, end)];
  const text = plainText(element);
  if (!WORD_CHAR.test(text[start - 1] ?? '') || !WORD_CHAR.test(text[start] ?? '')) return [start, end];
  let from = start;
  let to = start;
  while (from > 0 && WORD_CHAR.test(text[from - 1])) from -= 1;
  while (to < text.length && WORD_CHAR.test(text[to])) to += 1;
  return [from, to];
}

/* ------------------------------------------------------------------ edição pelo modelo de trechos */
/** Divide os trechos para que [start, end) caia exatamente em fronteiras de trecho. */
function splitRuns(runs, start, end) {
  const result = [];
  let position = 0;
  for (const run of runs) {
    const runStart = position;
    const runEnd = position + run.text.length;
    position = runEnd;
    const cuts = [start, end].filter((cut) => cut > runStart && cut < runEnd).map((cut) => cut - runStart);
    let last = 0;
    for (const cut of [...cuts, run.text.length]) {
      if (cut > last) result.push({ text: run.text.slice(last, cut), f: { ...run.f } });
      last = cut;
    }
  }
  return result;
}

function runsInRange(runs, start, end) {
  const inside = [];
  let position = 0;
  for (const run of runs) {
    if (position >= start && position + run.text.length <= end && run.text !== '\n') inside.push(run);
    position += run.text.length;
  }
  return inside;
}

/**
 * Mudanças pontuais (formatar, link, colar) viram um passo próprio de
 * "desfazer", em vez de se juntarem à digitação em andamento.
 */
export const isDiscreteEdit = (event) => /^(format|insertLink|insertFromPaste|insertFromDrop)/.test(event?.inputType ?? '');

/** Troca o valor do campo (redesenha) e avisa o app com um evento "input". */
function commit(element, markup, selection, inputType) {
  element.innerHTML = richHtml(markup);
  if (selection) setRichSelection(element, selection);
  savedSelection.set(element, selection ?? [0, 0]);
  syncEmptyState(element);
  syncToolbar(element);
  element.dispatchEvent(new InputEvent('input', { bubbles: true, inputType }));
}

/* ------------------------------------------------------------------ formatação pendente */
/**
 * Com o cursor parado fora de uma palavra, Ctrl+B (ou o botão) não tem o que
 * formatar: como no Word, a formatação fica pendente e vale para o que for
 * digitado em seguida, naquele ponto. O texto digitado entra pelo modelo de
 * trechos (o navegador escolheria sozinho se a letra cai dentro ou fora do
 * <b> vizinho). Mover o cursor descarta a pendência.
 */
const pendingFormats = new WeakMap();

/** Formatação do caractere antes da posição (a que a digitação herdaria), sem o link. */
function formatsBefore(runs, position) {
  let offset = 0;
  let found = {};
  for (const run of runs) {
    if (offset >= position) break;
    offset += run.text.length;
    if (run.text !== '\n') found = run.f;
  }
  const { link, ...rest } = found;
  return { ...rest };
}

function pendingAt(element, position) {
  const pending = pendingFormats.get(element);
  return pending && pending.at === position ? pending : null;
}

/** Digitação com formatação pendente: insere o texto como um trecho com essa formatação. */
function typeWithPending(element, text) {
  const selection = getRichSelection(element);
  if (!selection || selection[0] !== selection[1]) return false;
  const pending = pendingAt(element, selection[0]);
  if (!pending) return false;
  const at = selection[0];
  // Espaço não mostra formatação: o navegador o insere (um espaço no fim redesenhado some no Firefox) e a pendência segue.
  if (!text.trim()) {
    pendingFormats.set(element, { at: at + text.length, f: pending.f });
    return false;
  }
  const runs = splitRuns(collectRuns(element), at, at);
  let position = 0;
  let index = runs.findIndex((run) => { const hit = position >= at; position += run.text.length; return hit; });
  if (index < 0) index = runs.length;
  runs.splice(index, 0, { text, f: { ...pending.f } });
  // A pendência acompanha o cursor enquanto a digitação continuar ali.
  pendingFormats.set(element, { at: at + text.length, f: pending.f });
  commit(element, runsToMarkup(runs), [at + text.length, at + text.length], 'insertText');
  return true;
}

/**
 * Composição (acentos por tecla morta, teclados de outros idiomas): o
 * navegador insere o texto e o evento não pode ser cancelado. A pendência é
 * guardada no início e aplicada ao trecho composto quando ela termina.
 */
function startPendingComposition(element) {
  const selection = getRichSelection(element);
  const pending = selection && selection[0] === selection[1] ? pendingAt(element, selection[0]) : null;
  if (pending) pendingFormats.set(element, { ...pending, composingFrom: selection[0] });
}

function finishPendingComposition(element) {
  const pending = pendingFormats.get(element);
  if (pending?.composingFrom == null) return;
  const selection = getRichSelection(element);
  const from = pending.composingFrom;
  const to = selection ? selection[1] : from;
  if (to <= from) {
    pendingFormats.set(element, { at: from, f: pending.f });
    return;
  }
  const runs = splitRuns(collectRuns(element), from, to);
  runsInRange(runs, from, to).forEach((run) => { run.f = { ...pending.f, ...(run.f.link ? { link: run.f.link } : {}) }; });
  pendingFormats.set(element, { at: to, f: pending.f });
  commit(element, runsToMarkup(runs), [to, to], 'insertText');
}

/** Formatação do trecho selecionado: { bold: true, link: 'https://…', … }. */
export function richFormatState(element) {
  const selection = getRichSelection(element) ?? savedSelection.get(element);
  if (!selection) return {};
  const pending = selection[0] === selection[1] ? pendingAt(element, selection[0]) : null;
  if (pending) return Object.fromEntries(NESTING.map((key) => [key, Boolean(pending.f[key])]));
  const [start, end] = effectiveSelection(element, selection);
  const runs = splitRuns(collectRuns(element), start, end);
  let inside = runsInRange(runs, start, end).filter((run) => run.text.trim());
  if (!inside.length) {
    // Cursor parado: vale a formatação do caractere anterior.
    let position = 0;
    for (const run of runs) {
      position += run.text.length;
      if (position >= start && run.text !== '\n') { inside = [run]; break; }
    }
  }
  if (!inside.length) return {};
  return Object.fromEntries(NESTING.map((key) => {
    const values = new Set(inside.map((run) => run.f[key] ?? ''));
    return [key, values.size === 1 ? [...values][0] || false : false];
  }));
}

/**
 * Liga/desliga uma formatação no trecho selecionado (ou na palavra sob o
 * cursor). Com o cursor parado fora de uma palavra, a formatação fica
 * pendente para o próximo texto digitado ali (ver pendingFormats).
 */
export function toggleRichFormat(element, name) {
  const [start, end] = effectiveSelection(element, restoreRichSelection(element));
  let runs = collectRuns(element);
  if (start === end) {
    const f = { ...(pendingAt(element, start)?.f ?? formatsBefore(runs, start)) };
    if (f[name]) delete f[name];
    else f[name] = true;
    pendingFormats.set(element, { at: start, f });
    syncToolbar(element);
    return;
  }
  runs = splitRuns(runs, start, end);
  const inside = runsInRange(runs, start, end);
  const active = inside.filter((run) => run.text.trim()).every((run) => run.f[name]);
  inside.forEach((run) => { if (active) delete run.f[name]; else run.f[name] = true; });
  commit(element, runsToMarkup(runs), [start, end], `format${name}`);
}

/** Remove toda a formatação (inclusive links) do trecho selecionado. */
export function clearRichFormat(element) {
  const [start, end] = effectiveSelection(element, restoreRichSelection(element));
  if (start === end) return;
  const runs = splitRuns(collectRuns(element), start, end);
  runsInRange(runs, start, end).forEach((run) => { run.f = {}; });
  commit(element, runsToMarkup(runs), [start, end], 'formatRemove');
}

/** Cria, troca ou remove (url vazia) o link do trecho selecionado; sem trecho, insere o endereço como link. */
export function setRichLink(element, url, selection) {
  const href = url ? safeUrl(url) : '';
  if (url && !href) return false;
  if (selection) {
    element.focus({ preventScroll: true });
    setRichSelection(element, selection);
  }
  let [start, end] = effectiveSelection(element, restoreRichSelection(element));
  let runs = collectRuns(element);
  if (start === end) {
    // Cursor dentro de um link: age sobre o link inteiro.
    const linked = linkRangeAt(runs, start);
    if (linked) [start, end] = linked;
  }
  if (start === end) {
    if (!href) return true;
    const label = href.replace(/^(https?:\/\/|mailto:|tel:)/, '');
    runs = splitRuns(runs, start, start);
    let position = 0;
    let index = runs.findIndex((run) => { const hit = position >= start; position += run.text.length; return hit; });
    if (index < 0) index = runs.length;
    runs.splice(index, 0, { text: label, f: { link: href } });
    commit(element, runsToMarkup(runs), [start + label.length, start + label.length], 'insertLink');
    return true;
  }
  runs = splitRuns(runs, start, end);
  runsInRange(runs, start, end).forEach((run) => { if (href) run.f.link = href; else delete run.f.link; });
  commit(element, runsToMarkup(runs), [start, end], href ? 'insertLink' : 'formatRemove');
  return true;
}

function linkRangeAt(runs, offset) {
  let position = 0;
  for (let i = 0; i < runs.length; i += 1) {
    const run = runs[i];
    const runEnd = position + run.text.length;
    if (run.f.link && offset >= position && offset <= runEnd) {
      let from = position;
      let to = runEnd;
      for (let j = i - 1, p = position; j >= 0 && runs[j].f.link === run.f.link; j -= 1) { p -= runs[j].text.length; from = p; }
      for (let j = i + 1; j < runs.length && runs[j].f.link === run.f.link; j += 1) to += runs[j].text.length;
      return [from, to];
    }
    position = runEnd;
  }
  return null;
}

/** Pede o endereço e cria/edita/remove o link do trecho selecionado (botão, Ctrl+K e menu). */
export async function editRichLink(element) {
  const selection = restoreRichSelection(element);
  const { link } = richFormatState(element);
  const result = await linkDialog({ url: link || '' });
  if (!element.isConnected) return;
  if (!result) {
    element.focus({ preventScroll: true });
    setRichSelection(element, selection);
    return;
  }
  setRichLink(element, result.remove ? '' : result.url, selection);
}

/** Insere marcação no lugar da seleção (colar, soltar, quebra de linha, menu "Colar"). */
export function insertRichMarkup(element, markup, selection = null) {
  const [start, end] = selection ?? restoreRichSelection(element);
  const value = element.dataset.rich === 'single' ? markup.replace(/\s*\n\s*/g, ' ') : markup;
  const probe = document.createElement('div');
  probe.innerHTML = richHtml(value);
  // Uma quebra de linha sozinha: a leitura descartaria o <br> final como "linha vazia visível".
  const inserted = value === '\n' ? [{ text: '\n', f: {} }] : collectRuns(probe);
  const before = [];
  const after = [];
  let position = 0;
  for (const run of splitRuns(collectRuns(element), start, end)) {
    if (position + run.text.length <= start) before.push(run);
    else if (position >= end) after.push(run);
    position += run.text.length;
  }
  const caret = start + inserted.reduce((sum, run) => sum + run.text.length, 0);
  commit(element, runsToMarkup([...before, ...inserted, ...after]), [caret, caret], 'insertFromPaste');
}

/** Remove o trecho selecionado (menu "Recortar"). */
export function deleteRichSelection(element, [start, end]) {
  insertRichMarkup(element, '', [start, end]);
}

/** Troca o valor exibido (desfazer, edição em outro lugar) mantendo o cursor quando possível. */
export function setRichValue(element, markup) {
  if (richMarkup(element) === markup) return;
  const focused = document.activeElement === element;
  const selection = focused ? getRichSelection(element) : null;
  element.innerHTML = richHtml(markup);
  syncEmptyState(element);
  if (selection) {
    const length = plainText(element).length;
    setRichSelection(element, selection.map((offset) => Math.min(offset, length)));
  }
}

/** Texto selecionado (para copiar). */
export function richSelectedText(element, [start, end]) {
  return plainText(element).slice(start, end);
}

/* ------------------------------------------------------------------ comportamento */
function syncEmptyState(element) {
  const empty = !element.textContent && element.querySelectorAll('br').length <= 1;
  element.classList.toggle('is-empty', empty);
}

/** Quebra de linha no cursor (Enter nos campos de várias linhas). */
function insertLineBreak(element) {
  const selection = getRichSelection(element);
  if (!selection) return;
  insertRichMarkup(element, '\n', selection);
}

const BLOCKED_INPUT = /^(format(?!Bold$|Italic$|Underline$|StrikeThrough$|RemoveFormat$)|insert(OrderedList|UnorderedList|HorizontalRule|Link)$)/;
const FORMAT_INPUT = { formatBold: 'bold', formatItalic: 'italic', formatUnderline: 'underline', formatStrikeThrough: 'strike' };

/**
 * Liga o comportamento de todos os campos visuais da página (delegação de
 * eventos: vale para campos criados depois). `onUndo`/`onRedo` recebem o
 * desfazer do menu Editar do sistema, que no app é o histórico do documento.
 */
export function setupRichText({ onUndo, onRedo } = {}) {
  let draggingFrom = null;

  document.addEventListener('beforeinput', (event) => {
    const element = richFieldOf(event.target);
    if (!element) return;
    const type = event.inputType;
    if (type === 'insertParagraph' || type === 'insertLineBreak') {
      event.preventDefault();
      if (element.dataset.rich !== 'single') insertLineBreak(element);
    } else if (type === 'historyUndo' || type === 'historyRedo') {
      event.preventDefault();
      (type === 'historyUndo' ? onUndo : onRedo)?.();
    } else if (FORMAT_INPUT[type]) {
      // Atalhos nativos (Ctrl+B no Safari, menu Formatar): mesma regra dos botões.
      event.preventDefault();
      toggleRichFormat(element, FORMAT_INPUT[type]);
    } else if (type === 'insertText' && event.data && typeWithPending(element, event.data)) {
      event.preventDefault();
    } else if (type === 'formatRemoveFormat') {
      event.preventDefault();
      clearRichFormat(element);
    } else if (BLOCKED_INPUT.test(type)) {
      event.preventDefault();
    }
  });

  document.addEventListener('input', (event) => {
    const element = richFieldOf(event.target);
    if (!element) return;
    syncEmptyState(element);
    // Enquanto se digita no fim de um link ou destaque, o navegador pode deixar texto solto: a leitura em trechos absorve isso.
  }, true);

  document.addEventListener('paste', (event) => {
    const element = richFieldOf(event.target);
    if (!element || event.defaultPrevented) return;
    const data = event.clipboardData;
    const html = data?.getData('text/html') ?? '';
    const text = data?.getData('text/plain') ?? '';
    // Só imagem: o app cria o bloco de imagem.
    if (!html && !text) return;
    event.preventDefault();
    const paragraphBreak = element.dataset.rich === 'multi' ? '\n\n' : '\n';
    const markup = html ? pastedHtmlToMarkup(html, { paragraphBreak }) : escapeMarkup(text.replace(/\r\n?/g, '\n'));
    insertRichMarkup(element, markup);
  });

  document.addEventListener('dragstart', (event) => { draggingFrom = richFieldOf(event.target); });
  document.addEventListener('dragend', () => { draggingFrom = null; });
  document.addEventListener('drop', (event) => {
    const element = richFieldOf(event.target);
    if (!element || draggingFrom || event.dataTransfer?.types.includes('Files')) return;
    event.preventDefault();
    const html = event.dataTransfer.getData('text/html');
    const text = event.dataTransfer.getData('text/plain');
    const markup = html ? pastedHtmlToMarkup(html) : escapeMarkup(text);
    const caret = document.caretPositionFromPoint?.(event.clientX, event.clientY)
      ?? (() => { const r = document.caretRangeFromPoint?.(event.clientX, event.clientY); return r && { offsetNode: r.startContainer, offset: r.startOffset }; })();
    const at = caret && element.contains(caret.offsetNode) ? offsetOf(element, caret.offsetNode, caret.offset) : plainText(element).length;
    element.focus({ preventScroll: true });
    insertRichMarkup(element, markup, [at, at]);
  });

  // Guarda a seleção de cada campo (em caracteres) e atualiza o estado dos botões de formatação.
  document.addEventListener('selectionchange', () => {
    const selection = window.getSelection();
    const element = selection?.rangeCount ? richFieldOf(selection.anchorNode) : null;
    if (!element) return;
    const offsets = getRichSelection(element);
    if (offsets) savedSelection.set(element, offsets);
    const pending = pendingFormats.get(element);
    if (offsets && pending && pending.composingFrom == null && !(offsets[0] === offsets[1] && pending.at === offsets[0])) pendingFormats.delete(element);
    syncToolbar(element);
  });

  // Ao sair do campo, o HTML volta à forma canônica (sem <span> ou estilos deixados pelo navegador).
  document.addEventListener('focusout', (event) => {
    const element = richFieldOf(event.target);
    if (!element || element.contains(event.relatedTarget)) return;
    const canonical = richHtml(richMarkup(element));
    if (element.innerHTML !== canonical) element.innerHTML = canonical;
    syncEmptyState(element);
  });

  // Mover o cursor pelo teclado ou pelo mouse descarta a formatação pendente (o selectionchange pode juntar dois movimentos).
  document.addEventListener('keydown', (event) => {
    const element = richFieldOf(event.target);
    if (element && /^(Arrow|Home$|End$|Page)/.test(event.key)) pendingFormats.delete(element);
  }, true);
  document.addEventListener('pointerdown', (event) => {
    const element = richFieldOf(event.target);
    if (element) pendingFormats.delete(element);
  }, true);
  document.addEventListener('compositionstart', (event) => {
    const element = richFieldOf(event.target);
    if (element) startPendingComposition(element);
  });
  document.addEventListener('compositionend', (event) => {
    const element = richFieldOf(event.target);
    if (element) finishPendingComposition(element);
  });

  // Barra de formatação: uma só parada de Tab; as setas trocam de botão (tabindex móvel).
  document.addEventListener('keydown', (event) => {
    const toolbar = event.target.closest?.('.rich__toolbar');
    if (!toolbar || !['ArrowRight', 'ArrowLeft', 'Home', 'End'].includes(event.key)) return;
    const buttons = [...toolbar.querySelectorAll('button')];
    const index = buttons.indexOf(event.target);
    const target = { ArrowRight: index + 1, ArrowLeft: index - 1, Home: 0, End: buttons.length - 1 }[event.key];
    const next = buttons[(target + buttons.length) % buttons.length];
    buttons.forEach((button) => { button.tabIndex = button === next ? 0 : -1; });
    next.focus();
    event.preventDefault();
  });

  // Clicar no rótulo foca o campo (um <label for> não funciona com contenteditable).
  document.addEventListener('click', (event) => {
    const label = event.target.closest?.('[data-rich-label]');
    if (!label) return;
    const element = document.getElementById(label.dataset.richLabel);
    if (element) restoreRichSelection(element);
  });
}

/** Marca como pressionados os botões da barra fixa do campo conforme a seleção. */
export function syncToolbar(element) {
  const toolbar = element.id ? document.querySelector(`.rich__toolbar[aria-controls="${CSS.escape(element.id)}"]`) : null;
  if (!toolbar) return;
  const state = richFormatState(element);
  toolbar.querySelectorAll('[data-format]').forEach((button) => {
    const name = button.dataset.format;
    button.setAttribute('aria-pressed', String(Boolean(name === 'link' ? state.link : state[name])));
  });
}

/** Ctrl+B, Ctrl+I, Ctrl+U e Ctrl+K (link) dentro de um campo visual. Retorna true se tratou. */
export function handleRichShortcut(event, { onLink } = {}) {
  const element = richFieldOf(event.target);
  if (!element || !(event.ctrlKey || event.metaKey) || event.altKey) return false;
  const key = event.key.toLowerCase();
  if (key === 'k' && onLink) {
    event.preventDefault();
    onLink(element);
    return true;
  }
  const format = Object.entries(FORMATS).find(([, f]) => f.key === key);
  if (!format || event.shiftKey) return false;
  event.preventDefault();
  toggleRichFormat(element, format[0]);
  return true;
}
