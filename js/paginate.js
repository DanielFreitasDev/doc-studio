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
 *      linhas de cada lado (controle de linhas viúvas e órfãs); itens de
 *      lista, passos, destaques, citações e perguntas maiores que a página
 *      também são divididos, em vez de cortados.
 * 3. Gera o HTML final de cada página (capa, conteúdo, capítulo, contracapa).
 *
 * Nas apresentações (formato "slides") todas as páginas são telas 16:9
 * (orientação "slide", 191 × 83 mm úteis), cada seção começa uma tela e a
 * tela que continua uma seção repete o título dela com "(continuação)".
 *
 * Como a medição usa o mesmo CSS da página, prévia e PDF ficam idênticos.
 */
import { createRenderContext, renderBlock, renderCover, renderBackCover, renderContentPage } from './render.js';
import { renderInline } from './markup.js';
import { PAGE_GEOMETRY, isSlides } from './design.js';

const PX_PER_MM = 96 / 25.4;
// Altura útil do corpo da página: A4 em pé e deitado (uma quebra de página escolhe a orientação das seguintes).
const CONTENT_HEIGHT = {
  portrait: PAGE_GEOMETRY.contentHeightMm.portrait * PX_PER_MM,
  landscape: PAGE_GEOMETRY.contentHeightMm.landscape * PX_PER_MM,
  slide: PAGE_GEOMETRY.slide.contentHeightMm * PX_PER_MM,
};
const ORIENTATIONS = Object.keys(CONTENT_HEIGHT);
// Cabeçalho "timbrado" (assinatura centralizada do MIV) ocupa o topo da primeira página.
const LETTERHEAD_OFFSET = PAGE_GEOMETRY.letterheadOffsetMm * PX_PER_MM;
const TOLERANCE = 0.75;
// Palavra mais longa que uma coluna de tabela garante sem partir (ver measureTableColumns).
const MAX_WORD_MM = 40;
// Controle de linhas viúvas e órfãs: um parágrafo dividido deixa ao menos 2 linhas em cada página.
const MIN_LINES = 2;

/** A coluna de medição tem a largura útil da orientação do átomo (170 ou 257 mm com a margem padrão; 191 mm na tela). */
const setOrientation = (measureBody, orientation) => {
  measureBody.classList.toggle('measure-body--landscape', orientation === 'landscape');
  measureBody.classList.toggle('measure-body--slide', orientation === 'slide');
};

/* ------------------------------------------------------------------ larguras de tabela */
/**
 * Mede a tabela inteira com layout automático e devolve a largura de cada
 * coluna em %. As linhas são depois renderizadas como tabelas separadas
 * (uma por átomo) com essas larguras fixas, para continuarem alinhadas
 * mesmo quando a tabela é dividida entre páginas.
 */
function measureTableColumns(block, measureBody, cache, orientation) {
  // As larguras mudam com a margem, a fonte do texto e outras opções do design (atributos data-* do .doc da medição).
  const key = JSON.stringify([block.header, block.rows, block.keyColumn, orientation, { ...measureBody.closest('.doc')?.dataset }]);
  if (cache.has(key)) return cache.get(key);
  setOrientation(measureBody, orientation);

  const head = block.header.map((cell) => `<th>${renderInline(cell)}</th>`).join('');
  const body = block.rows
    .map((row) => `<tr>${row.map((cell, i) => `<td${i === 0 && block.keyColumn ? ' class="is-key"' : ''}>${renderInline(cell)}</td>`).join('')}</tr>`)
    .join('');
  measureBody.innerHTML = `<table class="b-table b-table--auto tone-navy"><thead><tr>${head}</tr></thead><tbody>${body}</tbody></table>`;
  const table = measureBody.firstElementChild;
  const total = table.getBoundingClientRect().width || 1;
  const columnWidths = () => [...table.querySelectorAll('th')].map((th) => th.getBoundingClientRect().width);
  const proportional = columnWidths();
  // Largura mínima de cada coluna: a maior palavra sem partir (tabela com largura zero = largura mínima),
  // com 1 mm de folga para as bordas e o arredondamento em %. Palavras acima de 40 mm (endereços,
  // códigos) podem quebrar: reservar a largura delas espremeria as outras colunas.
  table.classList.add('b-table--min');
  table.style.width = '0';
  const minimums = columnWidths().map((width) => Math.min(width + PX_PER_MM, MAX_WORD_MM * PX_PER_MM, total / 3));
  const widths = withMinimums(proportional, minimums, total).map((width) => Math.round((width / total) * 10000) / 100);

  setOrientation(measureBody, 'portrait');
  if (cache.size > 200) cache.clear();
  cache.set(key, widths);
  return widths;
}

/**
 * Garante a cada coluna a sua largura mínima, tirando a diferença das colunas
 * que têm folga, na proporção da folga. A medição automática distribui a
 * largura pelo tamanho do conteúdo e podia deixar uma coluna curta mais
 * estreita que a sua maior palavra ("Atendiment|o").
 */
function withMinimums(widths, minimums, total) {
  const sumMin = minimums.reduce((sum, width) => sum + width, 0);
  if (sumMin >= total) return minimums.map((width) => (width / sumMin) * total);
  const raised = widths.map((width, i) => Math.max(width, minimums[i]));
  const deficit = raised.reduce((sum, width) => sum + width, 0) - total;
  if (deficit <= 0.5) return raised;
  const slack = raised.map((width, i) => width - minimums[i]);
  const totalSlack = slack.reduce((sum, value) => sum + value, 0);
  return raised.map((width, i) => width - (slack[i] / totalSlack) * deficit);
}

/* ------------------------------------------------------------------ textos divididos */
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

/** Caminho de um nó a partir da raiz (índices dos filhos), para achar o mesmo ponto numa cópia. */
function nodePath(root, node) {
  const path = [];
  for (let current = node; current !== root; current = current.parentNode) path.unshift([...current.parentNode.childNodes].indexOf(current));
  return path;
}
const resolvePath = (root, path) => path.reduce((node, index) => node.childNodes[index], root);

/**
 * Copia o átomo com só uma parte do texto: do início até a linha (`head`) ou
 * dela até o fim (`tail`). O que fica do outro lado do corte é apagado com
 * `Range.deleteContents()`, que mantém abertos os elementos partidos (negrito,
 * caixa do destaque, item da lista), então a marcação continua válida.
 */
function cutAtom(box, start, part) {
  const copy = box.cloneNode(true);
  const node = resolvePath(copy, nodePath(box, start.node));
  const range = document.createRange();
  if (part === 'head') {
    range.setStart(node, start.offset);
    range.setEnd(copy, copy.childNodes.length);
  } else {
    range.setStart(copy, 0);
    range.setEnd(node, start.offset);
  }
  range.deleteContents();
  copy.classList.add(part === 'head' ? 'is-split-head' : 'is-split-tail');
  return copy;
}

/**
 * Textos do átomo que podem ser divididos: os campos editáveis (`data-edit`)
 * mais internos, fora de tabelas (uma célula partida desalinharia as colunas).
 */
const textFields = (box) => [...box.querySelectorAll('[data-edit]')]
  .filter((el) => !el.closest('table') && !el.querySelector('[data-edit]') && el.textContent.trim());

/**
 * Divide um átomo de texto que não cabe no espaço restante (`available`, em px)
 * na linha do texto que atravessa o limite: parágrafos sempre; itens de lista,
 * passos, destaques, citações e perguntas só quando são maiores que a página
 * (senão iriam inteiros para a próxima). Retorna [parte que fica, parte que
 * continua na próxima página] já medidas, ou null se não der para deixar ao
 * menos MIN_LINES linhas daquele texto de cada lado. As partes recebem posições
 * compatíveis com as medições originais: o topo da primeira coincide com o do
 * átomo e o fundo da segunda, com o dele.
 */
function splitAtom(atom, available, measureBody) {
  setOrientation(measureBody, atom.orientation);
  measureBody.innerHTML = atom.html;
  const box = measureBody.firstElementChild;
  const result = box ? splitBox(atom, box, available, measureBody) : null;
  measureBody.innerHTML = '';
  setOrientation(measureBody, 'portrait');
  return result;
}

function splitBox(atom, box, available, measureBody) {
  const boxTop = box.getBoundingClientRect().top;
  const field = textFields(box).find((el) => el.getBoundingClientRect().bottom - boxTop > available);
  const starts = field ? lineStarts(field) : [];
  if (starts.length < MIN_LINES * 2) return null;
  // Distância entre o topo do texto e o topo do primeiro caractere (meia entrelinha).
  const glyphOffset = starts[0].top - field.getBoundingClientRect().top;
  let lines = starts.length - MIN_LINES;
  while (lines >= MIN_LINES && starts[lines].top - glyphOffset - boxTop > available) lines -= 1;

  for (; lines >= MIN_LINES; lines -= 1) {
    const head = cutAtom(box, starts[lines], 'head');
    const tail = cutAtom(box, starts[lines], 'tail');
    const holder = document.createElement('div');
    holder.append(head, tail);
    measureBody.append(holder);
    const headHeight = head.getBoundingClientRect().height;
    const tailHeight = tail.getBoundingClientRect().height;
    holder.remove();
    if (headHeight > available) continue;
    return [
      { ...atom, html: head.outerHTML, top: atom.top, bottom: atom.top + headHeight },
      { ...atom, html: tail.outerHTML, top: atom.bottom - tailHeight, bottom: atom.bottom },
    ];
  }
  return null;
}

/* ------------------------------------------------------------------ distribuição */
function measureAtoms(atoms, measureBody) {
  // Cada orientação é medida na sua largura; uma página nunca mistura as duas (a quebra separa).
  for (const orientation of ORIENTATIONS) {
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

/**
 * Altura de cada título repetido nas telas que continuam uma seção (com a
 * margem até o próximo átomo, como nas medições do fluxo).
 */
function measureLeads(atoms, measureBody) {
  const heights = new Map();
  const leads = [...new Set(atoms.map((a) => a.lead).filter(Boolean))];
  if (!leads.length) return heights;
  setOrientation(measureBody, 'slide');
  measureBody.innerHTML = leads.map((html) => `${html}<div></div>`).join('');
  const elements = measureBody.children;
  leads.forEach((html, i) => heights.set(html, elements[i * 2 + 1].getBoundingClientRect().top - elements[i * 2].getBoundingClientRect().top));
  measureBody.innerHTML = '';
  setOrientation(measureBody, 'portrait');
  return heights;
}

function distribute(entries, headerHeights, capacityOf, splitText, leadHeights = new Map()) {
  const pages = [];
  let current = null;
  let contentPages = 0;
  // Título da seção em andamento (só nas apresentações): repetido na tela que a continua.
  let lead = null;

  const openPage = (orientation = 'portrait', continued = false) => {
    current = { kind: 'content', atoms: [], orientation, capacity: capacityOf(contentPages, orientation), lead: continued ? lead : null };
    contentPages += 1;
    pages.push(current);
  };
  // Parágrafos dividem-se sempre; os demais textos só quando nem uma página inteira os comporta.
  const canSplit = (a) => a.splittable || (a.splitIfOversized && a.bottom - a.top > current.capacity + TOLERANCE);
  const usedHeight = (page, next) => {
    const first = page.atoms[0] ?? next;
    const repeated = first.repeatHeader ? headerHeights.get(first.group) ?? 0 : 0;
    const leadHeight = page.lead && !first.lead ? leadHeights.get(page.lead) ?? 0 : 0;
    return next.bottom - first.top + repeated + leadHeight;
  };

  for (const entry of entries) {
    if (entry.kind === 'chapter') {
      pages.push({ kind: 'chapter', entry });
      current = null;
      lead = null;
      continue;
    }
    if (entry.kind === 'break') {
      current = null;
      continue;
    }
    if (entry.lead) lead = entry.lead;
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
      // Texto longo: as linhas que couberem ficam nesta página.
      const available = current.capacity + TOLERANCE - (used - (pending.bottom - pending.top));
      const parts = canSplit(pending) ? splitText(pending, available) : null;
      if (parts) {
        current.atoms.push(parts[0]);
        openPage(current.orientation, true);
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
      openPage(current.orientation, true);
      current.atoms.push(...carried);
      // O título da seção foi junto para a tela nova: não precisa da repetição.
      if (carried[0]?.lead) current.lead = null;
      // Na página nova o texto ainda pode ser dividido; os demais átomos entram direto.
      if (!canSplit(pending) || carriedOnce) {
        current.atoms.push(pending);
        break;
      }
      carriedOnce = true;
    }
  }

  for (const page of pages) {
    if (page.kind !== 'content' || !page.atoms.length) continue;
    const used = usedHeight(page, page.atoms.at(-1));
    page.overflowing = used > page.capacity + 2;
    page.fill = Math.round((used / page.capacity) * 100) / 100;
  }
  return pages.filter((page) => page.kind !== 'content' || page.atoms.length);
}

/* ------------------------------------------------------------------ aberturas de capítulo */
// Margem inferior da abertura: o texto não pode descer além disso (a página não continua).
const CHAPTER_BOTTOM_MM = 20;

/** A introdução da abertura passa do pé da página? (A abertura é uma página só: o excesso seria cortado.) */
function chapterOverflows(html, measureBody) {
  measureBody.innerHTML = html;
  const page = measureBody.querySelector('.page--chapter');
  const content = page?.querySelector('.chapter__content');
  const limit = page ? page.getBoundingClientRect().bottom - CHAPTER_BOTTOM_MM * PX_PER_MM : 0;
  const overflow = Boolean(content) && content.getBoundingClientRect().bottom > limit + TOLERANCE;
  measureBody.innerHTML = '';
  return overflow;
}

/* ------------------------------------------------------------------ montagem final */
const withClass = (html, className) => html.replace('class="atom ', `class="atom ${className} `);

function pageBodyHtml(atoms, lead = null) {
  const parts = [];
  if (lead && !atoms[0]?.lead) parts.push(lead);
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
  // A quebra de página define a orientação das páginas seguintes (retrato ou paisagem); a apresentação só tem telas.
  const slides = isSlides(doc.design);
  let orientation = slides ? 'slide' : 'portrait';
  const ctx = createRenderContext(doc, assets, (block) => measureTableColumns(block, measureBody, columnCache, orientation));
  const entries = [];
  for (const block of doc.blocks) {
    const rendered = renderBlock(block, ctx);
    rendered.forEach((entry) => { if (entry.kind === 'atom') entry.orientation = orientation; });
    entries.push(...rendered);
    if (block.type === 'pagebreak' && !slides) orientation = block.orientation === 'landscape' ? 'landscape' : 'portrait';
  }
  const atoms = entries.filter((e) => e.kind === 'atom');
  const headerHeights = measureAtoms(atoms, measureBody);
  const leadHeights = measureLeads(atoms, measureBody);
  const letterhead = doc.design.header === 'letterhead' && !slides;
  const capacityOf = (index, pageOrientation) => CONTENT_HEIGHT[pageOrientation] - (letterhead && index === 0 ? LETTERHEAD_OFFSET : 0);
  const splitText = (atom, available) => splitAtom(atom, available, measureBody);
  const bodyPages = distribute(entries, headerHeights, capacityOf, splitText, leadHeights);
  // Documento sem conteúdo: mostra uma página timbrada vazia, pronta para receber o texto.
  if (!bodyPages.length) bodyPages.push({ kind: 'content', atoms: [], orientation, capacity: capacityOf(0, orientation) });

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
    if (page.kind === 'chapter') {
      const html = page.entry.build(idPrefix);
      if (chapterOverflows(html, measureBody)) overflowBlocks.add(page.entry.blockId);
      return html;
    }
    return renderContentPage(doc, assets, {
      bodyHtml: fillToc(pageBodyHtml(page.atoms, page.lead)),
      first: contentIndex++ === 0,
      number: pageNumber(index),
      total,
      idPrefix,
      overflowing: page.overflowing,
      orientation: page.orientation,
    });
  });

  // Ocupação de cada página de conteúdo (0–1), pelas medidas da paginação: vale mesmo com a prévia escondida.
  const fills = sequence.map((page) => (page.kind === 'content' ? page.fill ?? 0 : null));
  return { pagesHtml, sectionPages, firstPageOfBlock, overflowBlocks, fills };
}
