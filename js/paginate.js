/**
 * Paginação A4.
 *
 * 1. Renderiza todos os átomos numa coluna invisível com a largura útil da
 *    página (170 mm; 257 mm nas páginas em paisagem) e mede a posição real
 *    de cada um no navegador.
 * 2. Distribui os átomos em páginas de 252 mm de altura útil (165 mm em
 *    paisagem; 31 mm a menos na primeira folha com cabeçalho timbrado),
 *    respeitando:
 *    - quebras forçadas (seção em nova página, quebra de página, capítulo);
 *    - "manter com o próximo" (títulos nunca ficam sozinhos no pé da página);
 *    - repetição do cabeçalho de tabelas que continuam na página seguinte;
 *    - parágrafos divididos por linha entre páginas, com pelo menos duas
 *      linhas de cada lado (controle de linhas viúvas e órfãs).
 * 3. Gera o HTML final de cada página (capa, conteúdo, capítulo, contracapa).
 *
 * Como a medição usa o mesmo CSS da página, prévia e PDF ficam idênticos.
 */
import { createRenderContext, renderBlock, renderCover, renderBackCover, renderContentPage } from './render.js';
import { renderInline } from './markup.js';
import { PAGE_GEOMETRY } from './design.js';

const PX_PER_MM = 96 / 25.4;
// Altura útil do corpo da página: A4 em pé e deitado (uma quebra de página escolhe a orientação das seguintes).
const CONTENT_HEIGHT = {
  portrait: PAGE_GEOMETRY.contentHeightMm.portrait * PX_PER_MM,
  landscape: PAGE_GEOMETRY.contentHeightMm.landscape * PX_PER_MM,
};
// Cabeçalho "timbrado" (assinatura centralizada do MIV) ocupa o topo da primeira página.
const LETTERHEAD_OFFSET = PAGE_GEOMETRY.letterheadOffsetMm * PX_PER_MM;
const TOLERANCE = 0.75;
// Controle de linhas viúvas e órfãs: um parágrafo dividido deixa ao menos 2 linhas em cada página.
const MIN_LINES = 2;

/** A coluna de medição tem a largura útil da orientação do átomo (170 ou 257 mm). */
const setOrientation = (measureBody, orientation) => measureBody.classList.toggle('measure-body--landscape', orientation === 'landscape');

/* ------------------------------------------------------------------ larguras de tabela */
/**
 * Mede a tabela inteira com layout automático e devolve a largura de cada
 * coluna em %. As linhas são depois renderizadas como tabelas separadas
 * (uma por átomo) com essas larguras fixas, para continuarem alinhadas
 * mesmo quando a tabela é dividida entre páginas.
 */
function measureTableColumns(block, measureBody, cache, orientation) {
  const key = JSON.stringify([block.header, block.rows, block.keyColumn, orientation]);
  if (cache.has(key)) return cache.get(key);
  setOrientation(measureBody, orientation);

  const head = block.header.map((cell) => `<th>${renderInline(cell)}</th>`).join('');
  const body = block.rows
    .map((row) => `<tr>${row.map((cell, i) => `<td${i === 0 && block.keyColumn ? ' class="is-key"' : ''}>${renderInline(cell)}</td>`).join('')}</tr>`)
    .join('');
  measureBody.innerHTML = `<table class="b-table b-table--auto tone-navy"><thead><tr>${head}</tr></thead><tbody>${body}</tbody></table>`;
  const table = measureBody.firstElementChild;
  const total = table.getBoundingClientRect().width || 1;
  const widths = [...table.querySelectorAll('th')].map((th) => Math.round((th.getBoundingClientRect().width / total) * 10000) / 100);

  setOrientation(measureBody, 'portrait');
  if (cache.size > 200) cache.clear();
  cache.set(key, widths);
  return widths;
}

/* ------------------------------------------------------------------ parágrafos divididos */
/**
 * Onde começa cada linha visual do parágrafo: o primeiro caractere de cada
 * linha (nó de texto + posição) e o topo dele na tela. Mede caracteres com
 * Range, então funciona com negrito, código e destaques no meio da linha.
 * Como o topo só cresce ao longo do texto, a busca é binária: só divide um
 * trecho quando o primeiro e o último caractere estão em linhas diferentes
 * (dezenas de medições por parágrafo, em vez de uma por caractere).
 */
function lineStarts(paragraph) {
  const lineHeight = parseFloat(getComputedStyle(paragraph).lineHeight) || 12;
  const sameLine = (a, b) => a != null && b != null && Math.abs(a - b) < lineHeight / 2;
  const range = document.createRange();
  const starts = [];
  let lineTop = -Infinity;
  const record = (node, offset, top) => {
    if (top == null || top < lineTop + lineHeight / 2) return;
    lineTop = top;
    starts.push({ node, offset, top });
  };

  const walker = document.createTreeWalker(paragraph, NodeFilter.SHOW_TEXT);
  for (let node = walker.nextNode(); node; node = walker.nextNode()) {
    const offsets = [];
    for (let i = 0; i < node.data.length; i += 1) if (!/\s/.test(node.data[i])) offsets.push(i);
    if (!offsets.length) continue;
    const tops = new Map();
    const topAt = (k) => {
      if (!tops.has(k)) {
        range.setStart(node, offsets[k]);
        range.setEnd(node, offsets[k] + 1);
        tops.set(k, range.getClientRects()[0]?.top ?? null);
      }
      return tops.get(k);
    };
    const visit = (lo, hi) => {
      if (hi - lo <= 1) return record(node, offsets[hi], topAt(hi));
      if (sameLine(topAt(lo), topAt(hi))) return;
      const mid = (lo + hi) >> 1;
      visit(lo, mid);
      visit(mid, hi);
    };
    record(node, offsets[0], topAt(0));
    if (offsets.length > 1) visit(0, offsets.length - 1);
  }
  return starts;
}

/** Copia o átomo com só uma parte do parágrafo (do início ou até o fim). */
function cutParagraph(box, paragraph, start, part) {
  const range = document.createRange();
  if (part === 'head') {
    range.setStart(paragraph, 0);
    range.setEnd(start.node, start.offset);
  } else {
    range.setStart(start.node, start.offset);
    range.setEnd(paragraph, paragraph.childNodes.length);
  }
  const copy = box.cloneNode(true);
  copy.classList.add(part === 'head' ? 'is-split-head' : 'is-split-tail');
  copy.querySelector('p').replaceChildren(range.cloneContents());
  return copy;
}

/**
 * Divide um parágrafo que não cabe no espaço restante (`available`, em px).
 * Retorna [parte que fica, parte que continua na próxima página] já medidas,
 * ou null se não der para deixar ao menos MIN_LINES linhas de cada lado.
 * As partes recebem posições compatíveis com as medições originais: o topo
 * da primeira coincide com o do parágrafo e o fundo da segunda, com o dele.
 */
function splitParagraphAtom(atom, available, measureBody) {
  setOrientation(measureBody, atom.orientation);
  measureBody.innerHTML = atom.html;
  const box = measureBody.firstElementChild;
  const paragraph = box?.querySelector('p');
  const starts = paragraph ? lineStarts(paragraph) : [];
  if (starts.length < MIN_LINES * 2) {
    measureBody.innerHTML = '';
    setOrientation(measureBody, 'portrait');
    return null;
  }
  // Distância entre o topo do átomo e o topo do primeiro caractere (meia entrelinha).
  const boxTop = box.getBoundingClientRect().top;
  const glyphOffset = starts[0].top - boxTop;
  let lines = starts.length - MIN_LINES;
  while (lines >= MIN_LINES && starts[lines].top - glyphOffset - boxTop > available) lines -= 1;

  let result = null;
  for (; lines >= MIN_LINES && !result; lines -= 1) {
    const head = cutParagraph(box, paragraph, starts[lines], 'head');
    const tail = cutParagraph(box, paragraph, starts[lines], 'tail');
    const holder = document.createElement('div');
    holder.append(head, tail);
    measureBody.append(holder);
    const headHeight = head.getBoundingClientRect().height;
    const tailHeight = tail.getBoundingClientRect().height;
    holder.remove();
    if (headHeight > available) continue;
    result = [
      { ...atom, html: head.outerHTML, top: atom.top, bottom: atom.top + headHeight },
      { ...atom, html: tail.outerHTML, top: atom.bottom - tailHeight, bottom: atom.bottom },
    ];
  }
  measureBody.innerHTML = '';
  setOrientation(measureBody, 'portrait');
  return result;
}

/* ------------------------------------------------------------------ distribuição */
function measureAtoms(atoms, measureBody) {
  // Cada orientação é medida na sua largura; uma página nunca mistura as duas (a quebra separa).
  for (const orientation of ['portrait', 'landscape']) {
    const group = atoms.filter((a) => a.orientation === orientation);
    if (!group.length) continue;
    setOrientation(measureBody, orientation);
    measureBody.innerHTML = group.map((a) => a.html).join('');
    const origin = measureBody.getBoundingClientRect().top;
    const elements = measureBody.children;
    group.forEach((a, i) => {
      const rect = elements[i].getBoundingClientRect();
      a.top = rect.top - origin;
      a.bottom = rect.bottom - origin;
    });
  }
  setOrientation(measureBody, 'portrait');
  // Altura do cabeçalho de cada tabela (para quando ele é repetido).
  const headerHeights = new Map();
  for (const a of atoms) {
    if (a.group && !a.repeatHeader && !headerHeights.has(a.group)) headerHeights.set(a.group, a.bottom - a.top);
  }
  measureBody.innerHTML = '';
  return headerHeights;
}

function distribute(entries, headerHeights, capacityOf, splitParagraph) {
  const pages = [];
  let current = null;
  let contentPages = 0;

  const openPage = (orientation = 'portrait') => {
    current = { kind: 'content', atoms: [], orientation, capacity: capacityOf(contentPages, orientation) };
    contentPages += 1;
    pages.push(current);
  };
  const usedHeight = (page, next) => {
    const first = page.atoms[0] ?? next;
    const repeated = first.repeatHeader ? headerHeights.get(first.group) ?? 0 : 0;
    return next.bottom - first.top + repeated;
  };

  for (const entry of entries) {
    if (entry.kind === 'chapter') {
      pages.push({ kind: 'chapter', entry });
      current = null;
      continue;
    }
    if (entry.kind === 'break') {
      current = null;
      continue;
    }
    if (!current) openPage(entry.orientation);
    if (entry.breakBefore && current.atoms.length) openPage(entry.orientation);

    let pending = entry;
    let carriedOnce = false;
    while (pending) {
      const used = usedHeight(current, pending);
      if (used <= current.capacity + TOLERANCE) {
        current.atoms.push(pending);
        break;
      }
      // Parágrafo longo: as linhas que couberem ficam nesta página.
      const available = current.capacity + TOLERANCE - (used - (pending.bottom - pending.top));
      const parts = pending.splittable ? splitParagraph(pending, available) : null;
      if (parts) {
        current.atoms.push(parts[0]);
        openPage(current.orientation);
        pending = parts[1];
        continue;
      }
      // Átomo maior que uma página inteira: fica sozinho e a página é marcada (aviso no editor).
      if (!current.atoms.length) {
        current.atoms.push(pending);
        break;
      }
      // Leva junto os títulos que ficariam órfãos no pé da página.
      const carried = [];
      while (current.atoms.length > 1 && current.atoms.at(-1).keep) carried.unshift(current.atoms.pop());
      openPage(current.orientation);
      current.atoms.push(...carried);
      // Na página nova o parágrafo ainda pode ser dividido; os demais átomos entram direto.
      if (!pending.splittable || carriedOnce) {
        current.atoms.push(pending);
        break;
      }
      carriedOnce = true;
    }
  }

  for (const page of pages) {
    if (page.kind !== 'content' || !page.atoms.length) continue;
    page.overflowing = usedHeight({ atoms: page.atoms }, page.atoms.at(-1)) > page.capacity + 2;
  }
  return pages.filter((page) => page.kind !== 'content' || page.atoms.length);
}

/* ------------------------------------------------------------------ montagem final */
const withClass = (html, className) => html.replace('class="atom ', `class="atom ${className} `);

function pageBodyHtml(atoms) {
  const parts = [];
  if (atoms[0]?.repeatHeader) parts.push(withClass(atoms[0].repeatHeader, 'seg-start is-repeat'));
  atoms.forEach((a, i) => {
    if (!a.group) {
      parts.push(a.html);
      return;
    }
    const previous = i === 0 ? (a.repeatHeader ? a.group : null) : atoms[i - 1].group;
    const next = atoms[i + 1]?.group;
    const classes = [];
    if (previous !== a.group) classes.push('seg-start');
    if (next !== a.group) classes.push('seg-end');
    parts.push(classes.length ? withClass(a.html, classes.join(' ')) : a.html);
  });
  return parts.join('');
}

/**
 * Calcula o layout completo. Retorna as páginas em HTML e mapas auxiliares
 * (página de cada seção, blocos que estouram a página, primeira página de cada bloco).
 */
export function layoutDocument(doc, assets, measureBody, columnCache) {
  // A quebra de página define a orientação das páginas seguintes (retrato ou paisagem).
  let orientation = 'portrait';
  const ctx = createRenderContext(doc, assets, (block) => measureTableColumns(block, measureBody, columnCache, orientation));
  const entries = [];
  for (const block of doc.blocks) {
    const rendered = renderBlock(block, ctx);
    rendered.forEach((entry) => { if (entry.kind === 'atom') entry.orientation = orientation; });
    entries.push(...rendered);
    if (block.type === 'pagebreak') orientation = block.orientation === 'landscape' ? 'landscape' : 'portrait';
  }
  const atoms = entries.filter((e) => e.kind === 'atom');
  const headerHeights = measureAtoms(atoms, measureBody);
  const letterhead = doc.design.header === 'letterhead';
  const capacityOf = (index, pageOrientation) => CONTENT_HEIGHT[pageOrientation] - (letterhead && index === 0 ? LETTERHEAD_OFFSET : 0);
  const splitParagraph = (atom, available) => splitParagraphAtom(atom, available, measureBody);
  const bodyPages = distribute(entries, headerHeights, capacityOf, splitParagraph);
  // Documento sem conteúdo: mostra uma página timbrada vazia, pronta para receber o texto.
  if (!bodyPages.length) bodyPages.push({ kind: 'content', atoms: [], orientation: 'portrait', capacity: capacityOf(0, 'portrait') });

  const hasCover = doc.design.cover !== 'none';
  const hasBack = doc.design.backCover !== 'none';
  const sequence = [
    ...(hasCover ? [{ kind: 'cover' }] : []),
    ...bodyPages,
    ...(hasBack ? [{ kind: 'back' }] : []),
  ];

  // Quando a capa não conta, a primeira página de conteúdo é a número 1.
  const skipped = hasCover && !doc.design.countCover ? 1 : 0;
  const pageNumber = (index) => index + 1 - skipped;
  const total = sequence.length - skipped;

  const sectionPages = new Map();
  const firstPageOfBlock = new Map();
  const overflowBlocks = new Set();
  sequence.forEach((page, index) => {
    const remember = (blockId) => { if (!firstPageOfBlock.has(blockId)) firstPageOfBlock.set(blockId, index); };
    if (page.kind === 'chapter') {
      sectionPages.set(page.entry.blockId, pageNumber(index));
      remember(page.entry.blockId);
    }
    if (page.kind === 'content') {
      for (const a of page.atoms) {
        remember(a.blockId);
        if (a.sectionId) sectionPages.set(a.sectionId, pageNumber(index));
      }
      if (page.overflowing) overflowBlocks.add(page.atoms.at(-1).blockId);
    }
  });

  const fillToc = (html) => html.replace(/data-toc-page="([^"]+)">[^<]*</g,
    (_, id) => `data-toc-page="${id}">${sectionPages.get(id) ?? '–'}<`);

  let contentIndex = 0;
  const pagesHtml = sequence.map((page, index) => {
    const idPrefix = `p${index}`;
    if (page.kind === 'cover') return renderCover(doc, assets, idPrefix);
    if (page.kind === 'back') return renderBackCover(doc, assets, idPrefix);
    if (page.kind === 'chapter') return page.entry.build(idPrefix);
    return renderContentPage(doc, assets, {
      bodyHtml: fillToc(pageBodyHtml(page.atoms)),
      first: contentIndex++ === 0,
      number: pageNumber(index),
      total,
      idPrefix,
      overflowing: page.overflowing,
      orientation: page.orientation,
    });
  });

  return { pagesHtml, sectionPages, firstPageOfBlock, overflowBlocks };
}
