/**
 * Paginação A4.
 *
 * 1. Renderiza todos os átomos numa coluna invisível com a largura útil da
 *    página (170 mm) e mede a posição real de cada um no navegador.
 * 2. Distribui os átomos em páginas de 252 mm de altura útil (221 mm na
 *    primeira folha com cabeçalho timbrado), respeitando:
 *    - quebras forçadas (seção em nova página, quebra de página, capítulo);
 *    - "manter com o próximo" (títulos nunca ficam sozinhos no pé da página);
 *    - repetição do cabeçalho de tabelas que continuam na página seguinte.
 * 3. Gera o HTML final de cada página (capa, conteúdo, capítulo, contracapa).
 *
 * Como a medição usa o mesmo CSS da página, prévia e PDF ficam idênticos.
 */
import { createRenderContext, renderBlock, renderCover, renderBackCover, renderContentPage } from './render.js';
import { renderInline } from './markup.js';

const PX_PER_MM = 96 / 25.4;
const CONTENT_HEIGHT = 252 * PX_PER_MM;
// Cabeçalho "timbrado" (assinatura centralizada do MIV) ocupa o topo da primeira página.
const LETTERHEAD_OFFSET = 31 * PX_PER_MM;
const TOLERANCE = 0.75;

/* ------------------------------------------------------------------ larguras de tabela */
/**
 * Mede a tabela inteira com layout automático e devolve a largura de cada
 * coluna em %. As linhas são depois renderizadas como tabelas separadas
 * (uma por átomo) com essas larguras fixas, para continuarem alinhadas
 * mesmo quando a tabela é dividida entre páginas.
 */
function measureTableColumns(block, measureBody, cache) {
  const key = JSON.stringify([block.header, block.rows, block.keyColumn]);
  if (cache.has(key)) return cache.get(key);

  const head = block.header.map((cell) => `<th>${renderInline(cell)}</th>`).join('');
  const body = block.rows
    .map((row) => `<tr>${row.map((cell, i) => `<td${i === 0 && block.keyColumn ? ' class="is-key"' : ''}>${renderInline(cell)}</td>`).join('')}</tr>`)
    .join('');
  measureBody.innerHTML = `<table class="b-table b-table--auto tone-navy"><thead><tr>${head}</tr></thead><tbody>${body}</tbody></table>`;
  const table = measureBody.firstElementChild;
  const total = table.getBoundingClientRect().width || 1;
  const widths = [...table.querySelectorAll('th')].map((th) => Math.round((th.getBoundingClientRect().width / total) * 10000) / 100);

  if (cache.size > 200) cache.clear();
  cache.set(key, widths);
  return widths;
}

/* ------------------------------------------------------------------ distribuição */
function measureAtoms(atoms, measureBody) {
  measureBody.innerHTML = atoms.map((a) => a.html).join('');
  const origin = measureBody.getBoundingClientRect().top;
  const elements = measureBody.children;
  atoms.forEach((a, i) => {
    const rect = elements[i].getBoundingClientRect();
    a.top = rect.top - origin;
    a.bottom = rect.bottom - origin;
  });
  // Altura do cabeçalho de cada tabela (para quando ele é repetido).
  const headerHeights = new Map();
  for (const a of atoms) {
    if (a.group && !a.repeatHeader && !headerHeights.has(a.group)) headerHeights.set(a.group, a.bottom - a.top);
  }
  measureBody.innerHTML = '';
  return headerHeights;
}

function distribute(entries, headerHeights, capacityOf) {
  const pages = [];
  let current = null;
  let contentPages = 0;

  const openPage = () => {
    current = { kind: 'content', atoms: [], capacity: capacityOf(contentPages) };
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
    if (!current) openPage();
    if (entry.breakBefore && current.atoms.length) openPage();

    if (current.atoms.length && usedHeight(current, entry) > current.capacity + TOLERANCE) {
      // Leva junto os títulos que ficariam órfãos no pé da página.
      const carried = [];
      while (current.atoms.length > 1 && current.atoms.at(-1).keep) carried.unshift(current.atoms.pop());
      openPage();
      current.atoms.push(...carried);
    }
    current.atoms.push(entry);
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
  const ctx = createRenderContext(doc, assets, (block) => measureTableColumns(block, measureBody, columnCache));
  const entries = doc.blocks.flatMap((block) => renderBlock(block, ctx));
  const atoms = entries.filter((e) => e.kind === 'atom');
  const headerHeights = measureAtoms(atoms, measureBody);
  const letterhead = doc.design.header === 'letterhead';
  const capacityOf = (index) => CONTENT_HEIGHT - (letterhead && index === 0 ? LETTERHEAD_OFFSET : 0);
  const bodyPages = distribute(entries, headerHeights, capacityOf);
  // Documento sem conteúdo: mostra uma página timbrada vazia, pronta para receber o texto.
  if (!bodyPages.length) bodyPages.push({ kind: 'content', atoms: [], capacity: capacityOf(0) });

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
    });
  });

  return { pagesHtml, sectionPages, firstPageOfBlock, overflowBlocks };
}
