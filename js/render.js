/**
 * Renderização do documento em HTML (string), independente do DOM.
 *
 * Cada bloco vira um ou mais "átomos": as menores partes que podem ir para
 * páginas diferentes (uma linha de tabela, um passo, uma linha de cartões...).
 * O paginador mede esses átomos e decide onde quebrar as páginas.
 *
 * Segurança: todo texto do usuário passa por esc() ou renderInline(), que
 * escapam o conteúdo antes de qualquer marcação ser aplicada.
 */
import { esc, pad2 } from './utils.js';
import { renderInline, stripMarkup } from './markup.js';
import { ALTERNATE_TONES, CALLOUT_TONES, IMAGE_RATIOS, hasSideText, sideImageWidth } from './schema.js';
import { COVERS, BACK_COVERS, isSlides } from './design.js';
import { coverArt, backArt, chapterArt, footerArt, headerArt, dividerArt, slideArt, slideFooterArt, grayscaleSvg, CHECK_SVG } from './graphics.js';

/* ------------------------------------------------------------------ auxiliares */
const toneClass = (tone, index = 0) => `tone-${tone === 'alternate' ? ALTERNATE_TONES[index % ALTERNATE_TONES.length] : tone}`;
const calloutTone = (value) => CALLOUT_TONES.find((t) => t.value === value)?.tone ?? 'navy';
const nonEmptyLines = (text) => String(text ?? '').split('\n').map((line) => line.trim()).filter(Boolean);
const paragraphs = (text) => String(text ?? '').split(/\n\s*\n/).map((p) => p.trim()).filter(Boolean);
/** Campo de origem de um trecho: permite editar o texto direto na página (js/quickedit.js). */
const ed = (path) => ` data-edit="${path}"`;
const edMeta = (key) => ` data-edit-meta="${key}"`;

/** Escala de cinza (MIV p. 12): sufixo dos arquivos de assinatura e cores do grafismo. */
const isGray = (design) => design.colorMode === 'gray';
const graySuffix = (design) => (isGray(design) ? '-gray' : '');
const paint = (design, html) => (isGray(design) ? grayscaleSvg(html) : html);

function chunk(list, size) {
  const rows = [];
  for (let i = 0; i < list.length; i += size) rows.push(list.slice(i, i + size));
  return rows;
}

/** Quantas colunas usar para N itens lado a lado sem que fiquem estreitos demais. */
function gridColumns(count, max = 4) {
  if (count <= max) return Math.max(count, 1);
  return count % max === 0 ? max : max - 1;
}

const letterFor = (index) => {
  let n = index;
  let label = '';
  do {
    label = String.fromCharCode(65 + (n % 26)) + label;
    n = Math.floor(n / 26) - 1;
  } while (n >= 0);
  return label;
};

/**
 * Cria um átomo. `keep` = manter junto do próximo (títulos não ficam sozinhos
 * no pé da página); `group` = átomos do mesmo bloco que formam uma caixa contínua.
 */
function atom(block, className, inner, options = {}) {
  const attributes = [`data-block-id="${esc(block.id)}"`];
  if (options.group) attributes.push(`data-group="${esc(block.id)}"`);
  return {
    kind: 'atom',
    blockId: block.id,
    html: `<div class="atom ${className}" ${attributes.join(' ')}>${inner}</div>`,
    keep: Boolean(options.keep),
    group: options.group ? block.id : null,
    repeatHeader: options.repeatHeader ?? null,
    // Texto maior que uma página inteira é dividido por linha em vez de cortado (js/paginate.js).
    splitIfOversized: Boolean(options.text),
  };
}

/** Tamanho da maior palavra (o espaço não separável de "R$ 120,00" mantém a palavra inteira). */
const longestWord = (text) => Math.max(1, ...stripMarkup(text).replace(/(R\$|[Nn][º°])\s+(?=\d)/g, '$1\u00A0')
  .split(/[ \t\n]+/).map((word) => [...word].length));

/** Célula numérica: algarismos com moeda, %, sinais e separadores ("R$ 1.200,00", "96%", "−3,5", "8 420"). */
const NUMERIC_CELL = /^(?=.*\d)[\s\d.,%+\-−–()R$€º°/]+$/;

/* ------------------------------------------------------------------ blocos */
const RENDERERS = {
  section(block, ctx) {
    if (isSlides(ctx.design)) return slideSection(block, ctx);
    const number = ctx.sectionNumbers.get(block.id);
    const num = number ? pad2(number) : '';
    const showKicker = block.kicker || (num && ctx.design.sectionStyle !== 'number');
    const kicker = showKicker
      ? `<p class="b-section__kicker">${num ? `<span class="b-section__num">${num}</span><span class="b-section__dot"> . </span>` : ''}<span${ed('kicker')}>${esc(block.kicker)}</span></p>`
      : '';
    const intro = paragraphs(block.intro).map((text) => `<p class="b-p b-p--lead b-section__intro"${ed('intro')}>${renderInline(text)}</p>`).join('');

    if (block.opener) {
      // Página inteira de abertura: o título não se repete na página de conteúdo.
      // "Verde pleno" reproduz as páginas de abertura do MIV (p. 2–3): degradê e texto em branco.
      const style = ctx.design.chapterStyle;
      const dark = style === 'solid';
      return [{
        kind: 'chapter',
        blockId: block.id,
        build: (idPrefix) => paint(ctx.design, `
          <section class="page page--chapter chapter--${style}${dark ? ' page--dark' : ''}" aria-label="Abertura: ${esc(block.title)}">
            ${chapterArt(idPrefix, style)}
            <div class="chapter__content atom" data-block-id="${esc(block.id)}">
              ${num ? `<p class="chapter__num">${num}</p>` : ''}
              ${block.kicker ? `<p class="chapter__kicker"${ed('kicker')}>${esc(block.kicker)}</p>` : ''}
              <h2 class="chapter__title"${ed('title')}>${renderInline(block.title)}</h2>
              <span class="chapter__rule"></span>
              ${intro.replaceAll('b-section__intro', 'chapter__intro')}
            </div>
          </section>`),
      }];
    }

    const html = `
      <div class="b-section">
        ${num ? `<span class="b-section__bignum">${num}</span>` : ''}
        ${kicker}
        <h2 class="b-section__title"${ed('title')}>${renderInline(block.title)}</h2>
        <span class="b-section__rule"></span>
        ${intro}
      </div>`;
    const result = atom(block, 'atom--section', html, { keep: true });
    result.breakBefore = block.newPage;
    result.sectionId = block.id;
    return [result];
  },

  heading(block) {
    // h2 = título de seção; subtítulos ficam abaixo dele na hierarquia.
    const level = block.level === '3' ? 3 : 2;
    const tag = level === 3 ? 'h4' : 'h3';
    return [atom(block, `atom--h${level}`, `<${tag} class="b-h${level}"${ed('text')}>${renderInline(block.text)}</${tag}>`, { keep: true })];
  },

  paragraph(block) {
    // Parágrafos podem ser divididos por linha entre páginas (ver js/paginate.js).
    return paragraphs(block.text).map((text) => ({
      ...atom(block, `atom--p atom--p-${block.style}`, `<p class="b-p b-p--${block.style}${block.align !== 'left' ? ` b-p--${block.align}` : ''}"${ed('text')}>${renderInline(text)}</p>`),
      splittable: true,
    }));
  },

  list(block) {
    const items = nonEmptyLines(block.items);
    return items.map((text, index) => {
      const mark = block.style === 'ordered' ? `${index + 1}.` : block.style === 'check' ? CHECK_SVG : '•';
      const last = index === items.length - 1 ? ' is-last' : '';
      return atom(block, `atom--li${last}`,
        `<div class="b-li b-li--${block.style}"><span class="b-li__mark" aria-hidden="true">${mark}</span><span${ed('items')}>${renderInline(text)}</span></div>`, { text: true });
    });
  },

  quote(block) {
    const author = block.author ? `<p class="b-quote__author"${ed('author')}>${esc(block.author)}</p>` : '';
    return [atom(block, 'atom--quote', `<blockquote class="b-quote"><p class="b-quote__text"${ed('text')}>${renderInline(block.text)}</p>${author}</blockquote>`, { text: true })];
  },

  code(block) {
    // Uma linha por átomo (caixa contínua): um código longo continua na página seguinte.
    const lines = String(block.text ?? '').replace(/\r/g, '').replace(/\t/g, '    ').split('\n');
    while (lines.length > 1 && !lines.at(-1).trim()) lines.pop();
    const atoms = [];
    if (block.title) {
      atoms.push(atom(block, 'atom--code atom--code-title', `<p class="b-code__title"${ed('title')}>${esc(block.title)}</p>`, { keep: true, group: true }));
    }
    lines.forEach((line, index) => {
      const classes = ['atom--code', index === 0 && !block.title ? 'is-first' : '', index === lines.length - 1 ? 'is-last' : ''].filter(Boolean).join(' ');
      const number = block.numbers ? `<span class="b-code__n" aria-hidden="true">${index + 1}</span>` : '';
      atoms.push(atom(block, classes, `<div class="b-code__line">${number}<code${ed('text')}>${esc(line) || ' '}</code></div>`, { group: true }));
    });
    return atoms;
  },

  signature(block) {
    // Até três signatários lado a lado; a linha deixa o espaço da assinatura à mão (como nos ofícios).
    const items = block.items.map((item, index) => `
      <div class="b-sign__item">
        ${block.line ? '<span class="b-sign__line" aria-hidden="true"></span>' : ''}
        ${item.name ? `<p class="b-sign__name"${ed(`items.${index}.name`)}>${esc(item.name)}</p>` : ''}
        ${item.role ? `<p class="b-sign__role"${ed(`items.${index}.role`)}>${esc(item.role)}</p>` : ''}
      </div>`).join('');
    return [atom(block, 'atom--sign', `<div class="b-sign b-sign--${block.align}${block.line ? ' has-line' : ''}" style="--cols:${Math.max(1, block.items.length)}">${items}</div>`)];
  },

  steps(block) {
    const atoms = [];
    if (block.title) atoms.push(atom(block, 'atom--h3 atom--steps-title', `<h3 class="b-h3"${ed('title')}>${renderInline(block.title)}</h3>`, { keep: true }));
    const tone = toneClass(block.tone);
    block.items.forEach((item, index) => {
      const last = index === block.items.length - 1 ? ' is-last' : '';
      atoms.push(atom(block, `atom--step${last}`, `
        <div class="b-step ${tone}${last}">
          <span class="b-step__n">${block.start + index}</span>
          <div>
            ${item.title ? `<p class="b-step__t"${ed(`items.${index}.title`)}>${renderInline(item.title)}</p>` : ''}
            ${item.text ? `<p class="b-step__b"${ed(`items.${index}.text`)}>${renderInline(item.text)}</p>` : ''}
          </div>
        </div>`, { text: true }));
    });
    return atoms;
  },

  cards(block) {
    const columns = Number(block.columns);
    return chunk(block.items, columns).map((row, rowIndex) => {
      const cards = row.map((item, i) => {
        const index = rowIndex * columns + i;
        const marker = { number: String(index + 1), letter: letterFor(index), check: CHECK_SVG }[block.marker];
        const badge = marker ? `<span class="b-badge">${marker}</span>` : '';
        return `
          <div class="b-card ${toneClass(block.tone, index)}${marker ? '' : ' b-card--plain'}">
            ${badge}
            <div>
              ${item.title ? `<p class="b-card__t"${ed(`items.${index}.title`)}>${renderInline(item.title)}</p>` : ''}
              ${item.text ? `<p class="b-card__b"${ed(`items.${index}.text`)}>${renderInline(item.text)}</p>` : ''}
            </div>
          </div>`;
      }).join('');
      return atom(block, 'atom--cards', `<div class="b-cards" style="--cols:${columns}">${cards}</div>`);
    });
  },

  flow(block) {
    const columns = gridColumns(block.items.length);
    const rows = chunk(block.items, columns);
    return rows.map((row, rowIndex) => {
      const items = row.map((item, i) => {
        const index = rowIndex * columns + i;
        const hasNext = i < row.length - 1 ? ' has-next' : '';
        return `
          <div class="b-flow__item ${toneClass(block.tone, index)}${hasNext}">
            <p class="b-flow__n">${esc(block.label)} ${index + 1}</p>
            ${item.title ? `<p class="b-flow__t"${ed(`items.${index}.title`)}>${renderInline(item.title)}</p>` : ''}
            ${item.text ? `<p class="b-flow__b"${ed(`items.${index}.text`)}>${renderInline(item.text)}</p>` : ''}
          </div>`;
      }).join('');
      const last = rowIndex === rows.length - 1 ? ' is-last' : '';
      return atom(block, `atom--flow${last}`, `<div class="b-flow" style="--cols:${columns}">${items}</div>`);
    });
  },

  timeline(block) {
    const atoms = [];
    if (block.title) atoms.push(atom(block, 'atom--h3', `<h3 class="b-h3"${ed('title')}>${renderInline(block.title)}</h3>`, { keep: true }));
    const columns = gridColumns(block.items.length, 5);
    chunk(block.items, columns).forEach((row, rowIndex) => {
      const items = row.map((item, i) => {
        const index = rowIndex * columns + i;
        return `
        <div class="b-tl__item ${toneClass(block.tone, index)}">
          <span class="b-tl__dot"></span>
          ${item.date ? `<p class="b-tl__date"${ed(`items.${index}.date`)}>${esc(item.date)}</p>` : ''}
          ${item.title ? `<p class="b-tl__t"${ed(`items.${index}.title`)}>${renderInline(item.title)}</p>` : ''}
          ${item.text ? `<p class="b-tl__b"${ed(`items.${index}.text`)}>${renderInline(item.text)}</p>` : ''}
        </div>`;
      }).join('');
      atoms.push(atom(block, 'atom--timeline', `<div class="b-tl" style="--cols:${columns}">${items}</div>`));
    });
    return atoms;
  },

  toc(block, ctx) {
    const items = ctx.sections.map((section) => `
      <li class="b-toc__item">
        <span class="b-toc__n">${section.number ? pad2(section.number) : '•'}</span>
        <span class="b-toc__t">${esc(section.title)}</span>
        <span class="b-toc__dots" aria-hidden="true"></span>
        <span class="b-toc__p" data-toc-page="${esc(section.id)}">00</span>
      </li>`).join('');
    const list = items
      // Em colunas, a leitura desce cada coluna (01–05 | 06–10), como no sumário dos manuais aprovados.
      ? `<ol class="b-toc__list b-toc__list--${block.style}" style="--cols:${block.columns};--rows:${Math.ceil(ctx.sections.length / Number(block.columns))}">${items}</ol>`
      : '<p class="b-toc__empty">Adicione blocos do tipo “Seção” para montar o sumário.</p>';
    return [atom(block, 'atom--toc', `<nav class="b-toc" aria-label="${esc(block.title)}"><h3 class="b-toc__title"${ed('title')}>${esc(block.title)}</h3>${list}</nav>`)];
  },

  callout(block) {
    const title = block.title ? `<p class="b-callout__title"${ed('title')}>${renderInline(block.title)}</p>` : '';
    return [atom(block, 'atom--callout', `<div class="b-callout tone-${calloutTone(block.tone)}">${title}<p class="b-callout__text"${ed('text')}>${renderInline(block.text)}</p></div>`, { text: true })];
  },

  message(block) {
    return [atom(block, 'atom--callout', `
      <div class="b-callout tone-${calloutTone(block.tone)}">
        ${block.label ? `<p class="b-callout__label"${ed('label')}>${esc(block.label)}</p>` : ''}
        <p class="b-callout__quote">“<span${ed('text')}>${renderInline(block.text)}</span>”</p>
      </div>`, { text: true })];
  },

  faq(block) {
    return block.items.map((item, index) => atom(block, 'atom--faq', `
      <div class="b-faq ${toneClass(block.tone)}">
        <div class="b-faq__q">
          ${block.questionLabel ? `<p class="b-faq__label"${ed('questionLabel')}>${esc(block.questionLabel)}</p>` : ''}
          <p class="b-faq__qt"${ed(`items.${index}.question`)}>${renderInline(item.question)}</p>
        </div>
        <div class="b-faq__a">
          ${block.answerLabel ? `<p class="b-faq__label"${ed('answerLabel')}>${esc(block.answerLabel)}</p>` : ''}
          <p class="b-faq__at"${ed(`items.${index}.answer`)}>${renderInline(item.answer)}</p>
        </div>
      </div>`, { text: true }));
  },

  chips(block) {
    const chips = nonEmptyLines(block.items).map((text) => `<span class="b-chip"${ed('items')}>${renderInline(text)}</span>`).join('');
    const label = block.label ? `<p class="b-chips__label"${ed('label')}>${renderInline(block.label)}</p>` : '';
    return [atom(block, 'atom--chips', `<div class="b-chips ${toneClass(block.tone)}">${label}<div class="b-chips__list">${chips}</div></div>`)];
  },

  table(block, ctx) {
    const widths = ctx.tableColumns(block);
    // Colunas só com números (valores, porcentagens, quantidades) alinham à direita, com algarismos de mesma largura.
    const numeric = block.header.map((_, col) => {
      const cells = block.rows.map((row) => stripMarkup(row[col] ?? '').trim()).filter(Boolean);
      return cells.length > 0 && cells.every((cell) => NUMERIC_CELL.test(cell));
    });
    // A coluna-chave (primeira, em destaque) fica sempre à esquerda, no cabeçalho e nas células.
    const numClass = (col) => (numeric[col] && !(col === 0 && block.keyColumn) ? ' class="is-num"' : '');
    const colgroup = widths ? `<colgroup>${widths.map((w) => `<col style="width:${w}%">`).join('')}</colgroup>` : '';
    const tone = `tone-${block.tone}`;
    const headerHtml = `<table class="b-table ${tone}">${colgroup}<thead><tr>${block.header.map((cell, col) => `<th${numClass(col)}${ed(`header.${col}`)}>${renderInline(cell)}</th>`).join('')}</tr></thead></table>`;
    const header = atom(block, 'atom--table', headerHtml, { keep: true, group: true });
    const headerAtomHtml = header.html;

    const rows = block.rows.map((row, index) => {
      const zebra = block.zebra && index % 2 === 1 ? ' b-table--zebra' : '';
      const cells = row.map((cell, col) => `<td${col === 0 && block.keyColumn ? ' class="is-key"' : numClass(col)}${ed(`rows.${index}.${col}`)}>${renderInline(cell)}</td>`).join('');
      const last = index === block.rows.length - 1 ? ' is-last' : '';
      return atom(block, `atom--table${last}`, `<table class="b-table ${tone}${zebra}">${colgroup}<tbody><tr>${cells}</tr></tbody></table>`,
        { group: true, repeatHeader: headerAtomHtml });
    });

    const atoms = [header, ...rows];
    if (block.note) atoms.push(atom(block, 'atom--p', `<p class="b-p b-p--note b-table-note"${ed('note')}>${renderInline(block.note)}</p>`));
    return atoms;
  },

  stats(block) {
    const columns = gridColumns(block.items.length);
    return chunk(block.items, columns).map((row, rowIndex) => {
      const items = row.map((item, i) => {
        const index = rowIndex * columns + i;
        const tone = toneClass(block.tone, index);
        const part = (key) => `${ed(`items.${index}.${key}`)}>${renderInline(item[key])}`;
        return block.style === 'sheet'
          ? `<div class="b-sheet ${tone}"><p class="b-sheet__l"${part('label')}</p><p class="b-sheet__v"${part('value')}</p><p class="b-sheet__s"${part('sub')}</p></div>`
          : `<div class="b-kpi ${tone}"><p class="b-kpi__v" style="--chars:${longestWord(item.value)}"${part('value')}</p><p class="b-kpi__l"${part('label')}</p><p class="b-kpi__s"${part('sub')}</p></div>`;
      }).join('');
      return atom(block, 'atom--stats', `<div class="b-stats" style="--cols:${columns}">${items}</div>`);
    });
  },

  glossary(block) {
    const tone = toneClass(block.tone);
    if (!block.items.length) {
      return [atom(block, 'atom--gloss is-first is-last seg-start seg-end', `<div class="b-gloss ${tone}"><p class="b-gloss__title">${esc(block.title)}</p></div>`)];
    }
    return block.items.map((item, index) => {
      const title = index === 0 && block.title ? `<p class="b-gloss__title"${ed('title')}>${esc(block.title)}</p>` : '';
      // O respiro da caixa fica no primeiro e no último item (medidos na paginação), como no bloco de código.
      const edges = `${index === 0 ? ' is-first' : ''}${index === block.items.length - 1 ? ' is-last' : ''}`;
      return atom(block, `atom--gloss${edges}`,
        `<div class="b-gloss ${tone}">${title}<p><strong${ed(`items.${index}.term`)}>${esc(item.term)}</strong>${item.term && item.definition ? ' — ' : ''}<span${ed(`items.${index}.definition`)}>${renderInline(item.definition)}</span></p></div>`,
        { group: true, text: true });
    });
  },

  image(block, ctx) {
    const asset = ctx.assets[block.assetId];
    const sideHtml = () => {
      const title = block.sideTitle ? `<h3 class="b-fig__title"${ed('sideTitle')}>${renderInline(block.sideTitle)}</h3>` : '';
      const text = paragraphs(block.sideText).map((part) => `<p class="b-p b-fig__text"${ed('sideText')}>${renderInline(part)}</p>`).join('');
      return `<div class="b-fig-side__text">${title}${text}</div>`;
    };
    // Imagem e texto lado a lado (telas com foto e com gráfico do MIV, p. 58): a imagem fica do lado escolhido.
    const sideLayout = (figure) => `<div class="b-fig-side b-fig-side--${block.align === 'right' ? 'right' : 'left'}" style="--fig-w:${sideImageWidth(block)}%">${figure}${sideHtml()}</div>`;
    if (!asset) {
      const empty = '<figure class="b-fig"><div class="b-fig__empty">Escolha uma imagem no editor</div></figure>';
      return [atom(block, 'atom--figure', hasSideText(block) ? sideLayout(empty) : empty)];
    }
    let caption = '';
    if (block.caption) {
      ctx.figureNo += 1;
      caption = `<figcaption><span class="b-fig__n">Figura ${ctx.figureNo}</span> · <span${ed('caption')}>${renderInline(block.caption)}</span></figcaption>`;
    }
    const alt = block.caption ? esc(stripMarkup(block.caption)) : 'Imagem';
    // Formato fixo: a imagem preenche (recorta, mostrando a parte escolhida) ou encaixa na proporção.
    const ratio = IMAGE_RATIOS.find((option) => option.value === block.ratio)?.ratio;
    const shape = ratio ? `;aspect-ratio:${ratio};object-fit:${block.fit === 'contain' ? 'contain' : 'cover'};object-position:50% ${{ top: '0%', bottom: '100%' }[block.focus] ?? '50%'}` : '';
    if (hasSideText(block)) {
      return [atom(block, 'atom--figure', sideLayout(`
        <figure class="b-fig${block.frame ? ' b-fig--frame' : ''}">
          <img src="${esc(asset.url)}" alt="${alt}" width="${asset.width}" height="${asset.height}" style="width:100%${shape}" decoding="async">
          ${caption}
        </figure>`))];
    }
    return [atom(block, 'atom--figure', `
      <figure class="b-fig b-fig--${block.align}${block.frame ? ' b-fig--frame' : ''}">
        <img src="${esc(asset.url)}" alt="${alt}" width="${asset.width}" height="${asset.height}" style="width:${block.width}%${shape}" decoding="async">
        ${caption}
      </figure>`)];
  },

  divider(block) {
    const art = block.style === 'wedge' ? dividerArt(`dv-${block.id}`) : '';
    return [atom(block, 'atom--divider', `<span class="b-div b-div--${block.style}" role="presentation">${art}</span>`)];
  },

  pagebreak(block) {
    return [{ kind: 'break', blockId: block.id, orientation: block.orientation === 'landscape' ? 'landscape' : 'portrait' }];
  },
};

/**
 * Seção numa apresentação (MIV p. 58): cada seção começa uma tela nova, com
 * o título em Kanit Bold e a introdução como subtítulo em Kanit Medium, sem o
 * número nem a linha colorida dos documentos (a numeração fica no sumário e
 * na tela de abertura da seção). Se o conteúdo passar da tela, a seguinte
 * repete o título com "(continuação)" (`lead`, em js/paginate.js).
 */
function slideSection(block, ctx) {
  const number = ctx.sectionNumbers.get(block.id);
  const num = number ? pad2(number) : '';
  const kicker = block.kicker ? `<p class="b-slide-title__kicker"${ed('kicker')}>${esc(block.kicker)}</p>` : '';
  const intro = paragraphs(block.intro).map((text) => `<p class="b-slide-title__sub"${ed('intro')}>${renderInline(text)}</p>`).join('');
  if (block.opener) {
    // Tela inteira de abertura da seção: a composição da tela de abertura do MIV (p. 57), com o número na faixa branca.
    return [{
      kind: 'chapter',
      blockId: block.id,
      build: (idPrefix) => paint(ctx.design, `
        <section class="page page--slide page--chapter chapter--slide" aria-label="Abertura: ${esc(stripMarkup(block.title))}">
          ${slideArt('slide-panel', idPrefix, { className: 'chapter__art' })}
          ${num ? `<p class="chapter__num">${num}</p>` : ''}
          <div class="chapter__content atom" data-block-id="${esc(block.id)}">
            ${block.kicker ? `<p class="chapter__kicker"${ed('kicker')}>${esc(block.kicker)}</p>` : ''}
            <h2 class="chapter__title"${ed('title')}>${renderInline(block.title)}</h2>
            ${intro.replaceAll('b-slide-title__sub', 'chapter__intro')}
          </div>
        </section>`),
    }];
  }
  const html = `<div class="b-slide-title">${kicker}<h2 class="b-slide-title__title"${ed('title')}>${renderInline(block.title)}</h2>${intro}</div>`;
  const result = atom(block, 'atom--section atom--slide-title', html, { keep: true });
  result.breakBefore = true;
  result.sectionId = block.id;
  result.lead = `<div class="atom atom--section atom--slide-title atom--continued" data-block-id="${esc(block.id)}"><div class="b-slide-title"><h2 class="b-slide-title__title">${renderInline(block.title)} <span class="b-slide-title__cont">(continuação)</span></h2></div></div>`;
  return [result];
}

/**
 * Prepara o contexto de renderização: numeração de seções, lista do sumário,
 * contador de figuras e as larguras de coluna de tabelas (medidas no DOM).
 */
export function createRenderContext(doc, assets, tableColumns = () => null) {
  const sections = [];
  const sectionNumbers = new Map();
  let counter = 0;
  for (const block of doc.blocks) {
    if (block.type !== 'section') continue;
    counter += 1;
    const number = doc.design.numberSections ? counter : 0;
    sectionNumbers.set(block.id, number);
    sections.push({ id: block.id, number, title: stripMarkup(block.title) });
  }
  return { design: doc.design, meta: doc.meta, assets, sections, sectionNumbers, figureNo: 0, tableColumns };
}

export function renderBlock(block, ctx) {
  const renderer = RENDERERS[block.type];
  return renderer ? renderer(block, ctx) : [];
}

/* ------------------------------------------------------------------ assinatura */
const STATE_ALT = 'Governo do Estado do Ceará';
const withSecretaria = (design) => design.signature === 'joint' || design.signature === 'seinfra';

/**
 * Imagem da assinatura do Governo. Com "Secretaria da Infraestrutura" só nas
 * opções que pedem a secretaria. A vertical existe só em positivo; com
 * secretaria, o nome dela fica centralizado abaixo do nome (MIV p. 17, 20 e 35).
 */
function stateLogo(design, { negative, vertical }) {
  if (vertical) {
    return withSecretaria(design)
      ? `<img class="brand__state brand__state--vertical brand__state--secretaria" src="assets/img/ceara-vertical-secretaria${graySuffix(design)}.svg" alt="${STATE_ALT}" width="1123" height="1000">`
      : `<img class="brand__state brand__state--vertical" src="assets/img/ceara-vertical${graySuffix(design)}.svg" alt="${STATE_ALT}" width="1251" height="1000">`;
  }
  const suffix = `${negative ? '-negative' : ''}${graySuffix(design)}`;
  const file = withSecretaria(design) ? 'ceara' : 'ceara-state';
  // A classe marca a versão com secretaria, que tem largura mínima maior (40 mm, MIV p. 21).
  return `<img class="brand__state${withSecretaria(design) ? ' brand__state--secretaria-h' : ''}" src="assets/img/${file}${suffix}.svg" alt="${STATE_ALT}" width="1258" height="400">`;
}

/**
 * Conceito do Governo (MIV p. 9): "CUIDAR / DAS PESSOAS, / AVANÇAR / O CEARÁ."
 * sempre em quatro linhas, Kanit, verbos em bold, separado da assinatura por
 * uma linha. Verde sobre fundo claro; branco sobre fundo escuro (p. 117).
 */
export const SLOGAN_HTML = '<p class="slogan"><strong>Cuidar</strong><br>das pessoas,<br><strong>avançar</strong><br>o Ceará.</p>';

function partnerLogo(design, assets, negative) {
  if (design.signature === 'joint') {
    return `<img class="brand__partner" src="assets/img/detran${negative ? '-negative' : ''}${graySuffix(design)}.svg" alt="DETRAN/CE" width="370" height="416">`;
  }
  const logo = design.signature === 'custom' ? assets[design.customLogo] : null;
  return logo ? `<img class="brand__partner" src="${esc(logo.url)}" alt="Logo do órgão" width="${logo.width}" height="${logo.height}">` : '';
}

/**
 * Assinatura conforme o MIV (p. 9 e 15–18): o órgão vem à esquerda e o
 * Governo sempre à direita, sem fio separador, afastados pela largura do
 * escudo. Na horizontal, alinhados pelo centro do escudo (sem a coroa); na
 * vertical (`vertical`), pelo topo do escudo sem a coroa e pela base do nome
 * (p. 17). A vertical só existe em positivo, então sobre fundo escuro a
 * assinatura volta para a horizontal em negativo. Com `layout: 'pair'` o par
 * conjunto fica na horizontal com `pairHorizontal` (papel timbrado vinculado,
 * p. 36). `concept` acrescenta linha + conceito ao lado (p. 9), o que também
 * acontece quando a assinatura escolhida é "Governo + conceito".
 */
export function brandHtml(design, assets, { negative = false, vertical = false, pairHorizontal = false, concept = false } = {}) {
  if (design.signature === 'none') return '';
  const partner = partnerLogo(design, assets, negative);
  const withConcept = concept || design.signature === 'concept';
  // O conceito acompanha a assinatura horizontal (p. 9 e 117).
  const useVertical = vertical && !negative && !withConcept && !(partner && pairHorizontal);
  const layout = useVertical ? (partner ? 'joint-vertical' : 'vertical') : partner ? 'joint' : 'single';
  const conceptHtml = withConcept ? `<span class="brand__rule"></span>${SLOGAN_HTML}` : '';
  const modifier = `${withConcept ? ' brand--concept' : ''}${negative ? ' brand--negative' : ''}`;
  return `<div class="brand brand--${layout}${modifier}">${partner}${stateLogo(design, { negative, vertical: useVertical })}${conceptHtml}</div>`;
}

/* ------------------------------------------------------------------ páginas */
/** Capas com a assinatura vertical (fundo branco atrás da marca, como no MIV). */
const VERTICAL_BRAND_COVERS = new Set(['official', 'totem', 'sign']);

export function renderCover(doc, assets, idPrefix) {
  const { design, meta } = doc;
  const cover = COVERS.find((c) => c.id === design.cover);
  if (!cover || cover.id === 'none') return '';
  if (cover.format === 'slides') return renderSlideCover(doc, assets, cover, idPrefix);
  const audience = meta.audience || meta.version
    ? `<div class="cover__audience">
         ${meta.audienceLabel && meta.audience ? `<p class="cover__aud-label"${edMeta('audienceLabel')}>${esc(meta.audienceLabel)}</p>` : ''}
         ${meta.audience ? `<p class="cover__aud-text"${edMeta('audience')}>${esc(meta.audience)}</p>` : ''}
         ${meta.version ? `<p class="cover__version"${edMeta('version')}>${esc(meta.version)}</p>` : ''}
       </div>`
    : '';
  const photo = cover.id === 'photo' ? assets[design.coverImage] : null;
  // Placa de obra (MIV p. 76): a frase da campanha ("Governo trabalhando, Ceará avançando.") fica no
  // pé da área branca, sob a assinatura; aqui é a descrição da capa. O conceito do Governo não entra
  // solto: o MIV (p. 9) o quer sempre ao lado da marca (assinatura "Governo + conceito").
  const headline = cover.id === 'sign' && meta.description;
  const description = meta.description ? `<p class="cover__${headline ? 'headline' : 'desc'}"${edMeta('description')}>${esc(meta.description)}</p>` : '';
  return paint(design, `
    <section class="page page--cover cover--${cover.id}${cover.dark ? ' page--dark' : ''}" aria-label="Capa" data-target="cover">
      ${coverArt(cover.id, idPrefix, { photoUrl: photo ? esc(photo.url) : '' })}
      <div class="cover__brand">${brandHtml(design, assets, { negative: cover.dark, vertical: VERTICAL_BRAND_COVERS.has(cover.id) })}</div>
      <div class="cover__heading">
        ${meta.kicker ? `<p class="cover__kicker"${edMeta('kicker')}>${esc(meta.kicker)}</p>` : ''}
        <p class="cover__title"${edMeta('title')}>${esc(meta.title)}</p>
        ${meta.subtitle ? `<p class="cover__subtitle"${edMeta('subtitle')}>${esc(meta.subtitle)}</p>` : ''}
        <span class="cover__rule"></span>
        ${headline ? '' : description}
      </div>
      ${audience}
      ${headline ? description : ''}
    </section>`);
}

/**
 * Backdrop de eventos (MIV p. 116): quadros verdes (C80 Y100) com a
 * assinatura do Governo em negativo, alternados com quadros brancos. No
 * backdrop "institucional" os brancos levam o Governo em cores; no de
 * "vinculadas e autarquias", o órgão vinculado (ex.: DETRAN/CE).
 */
const BACKDROP = { columns: 3, rows: 7 };

function backdropHtml(design, assets) {
  const mark = (green) => {
    if (design.signature === 'none') return '';
    if (green) return stateLogo(design, { negative: true });
    return partnerLogo(design, assets, false) || stateLogo(design, { negative: false });
  };
  const tiles = [];
  for (let row = 0; row < BACKDROP.rows; row += 1) {
    for (let column = 0; column < BACKDROP.columns; column += 1) {
      const green = (row + column) % 2 === 0;
      tiles.push(`<span class="backdrop__tile${green ? ' backdrop__tile--green' : ''}">${mark(green)}</span>`);
    }
  }
  return `<div class="backdrop" aria-hidden="true">${tiles.join('')}</div>`;
}

function backBrandHtml(back, design, assets) {
  if (back.id === 'backdrop') return '';
  if (back.id === 'concept' || back.id === 'vignette') return conceptLockup(design, assets, { negative: Boolean(back.dark) });
  return brandHtml(design, assets, { negative: back.dark });
}

export function renderBackCover(doc, assets, idPrefix) {
  const { design, meta } = doc;
  const back = BACK_COVERS.find((c) => c.id === design.backCover);
  if (!back || back.id === 'none') return '';
  if (back.format === 'slides') return renderSlideBack(doc, assets, back, idPrefix);
  return paint(design, `
    <section class="page page--back back--${back.id}${back.dark ? ' page--dark' : ''}" aria-label="Contracapa" data-target="back">
      ${backArt(back.id, idPrefix)}
      ${back.id === 'backdrop' ? backdropHtml(design, assets) : ''}
      <div class="back__info">
        ${backBrandHtml(back, design, assets)}
        ${meta.backTitle ? `<p class="back__title"${edMeta('backTitle')}>${esc(meta.backTitle)}</p>` : ''}
        ${meta.backText ? `<p class="back__text"${edMeta('backText')}>${esc(meta.backText)}</p>` : ''}
        ${meta.backWeb ? `<p class="back__web"${edMeta('backWeb')}>${esc(meta.backWeb)}</p>` : ''}
      </div>
    </section>`);
}

/**
 * Assinatura + conceito do Governo: em negativo na contracapa do MIV (p. 117),
 * em cores na vinheta (p. 62). Se a assinatura escolhida já traz o conceito,
 * não o repete. O MIV (p. 9, 62 e 117) só mostra o conceito ao lado do Governo
 * (com ou sem a secretaria): o órgão parceiro sai desta composição, e sem
 * assinatura o conceito também não aparece (nunca fica solto).
 */
function conceptLockup(design, assets, { negative = true } = {}) {
  if (design.signature === 'none') return '';
  const governo = { ...design, signature: withSecretaria(design) ? 'seinfra' : design.signature === 'concept' ? 'concept' : 'state' };
  return brandHtml(governo, assets, { negative, concept: true });
}

function headerHtml(doc, assets, first, idPrefix) {
  const { design, meta } = doc;
  if (design.header === 'none') return '';
  // Papel timbrado do MIV (p. 34–36): assinatura centralizada só na primeira
  // folha; vertical (com a secretaria embaixo, p. 35) ou par horizontal com o órgão (p. 36).
  if (design.header === 'letterhead') {
    return first ? `<header class="page__letterhead">${brandHtml(design, assets, { vertical: true, pairHorizontal: true })}</header>` : '';
  }
  // Assinatura no cabeçalho: sem secretaria e com 30 mm de largura (mínimo do MIV, p. 21).
  const right = design.header === 'logo'
    ? `<img src="assets/img/ceara-state${graySuffix(design)}.svg" alt="${STATE_ALT}" width="1258" height="400">`
    : `<span${edMeta('headerRight')}>${esc(meta.headerRight)}</span>`;
  return `
    ${design.header === 'band' ? `<div class="page__header-art">${headerArt('band', `${idPrefix}-h`)}</div>` : ''}
    <header class="page__header page__header--${design.header}">
      <span class="page__header-left"><span class="page__header-title"${edMeta('headerTitle')}>${esc(meta.headerTitle)}</span>${meta.headerSubtitle ? `<span class="page__header-sub"${edMeta('headerSubtitle')}>${esc(meta.headerSubtitle)}</span>` : ''}</span>
      <span class="page__header-right">${right}</span>
    </header>`;
}

function pageNumberHtml(design, number, total) {
  if (design.pageNumber === 'circle') return `<span class="page__number">${number}</span>`;
  if (design.pageNumber === 'text') return `<span class="page__number page__number--text">Página <strong>${number}</strong> de ${total}</span>`;
  return '';
}

/** Endereço do papel timbrado: nome do órgão em negrito e contatos separados por "•". */
function addressHtml(meta) {
  const lines = nonEmptyLines(meta.backText);
  const first = [meta.backTitle ? `<strong>${esc(meta.backTitle)}</strong>` : '', lines[0] ? esc(lines[0]) : ''].filter(Boolean).join(' • ');
  const rest = lines.slice(1).map(esc).join(' • ');
  return `<address class="page__address">${first ? `<span>${first}</span>` : ''}${rest ? `<span>${rest}</span>` : ''}</address>`;
}

/* ------------------------------------------------------------------ telas de apresentação */
/**
 * Tela de abertura (MIV p. 56 e 57): chamada, título, subtítulo e linha de
 * apoio; a versão e data ficam no pé. O público da capa do documento não
 * entra (o MIV não o mostra nas telas). "Painel verde" leva a assinatura
 * escolhida na faixa branca (com o órgão parceiro, p. 59); "Foto e arcos", a
 * assinatura do Governo com o conceito no canto branco de baixo (p. 56).
 */
function renderSlideCover(doc, assets, cover, idPrefix) {
  const { design, meta } = doc;
  const photo = cover.photo ? assets[design.coverImage] : null;
  const brand = cover.id === 'slide-photo' ? conceptLockup(design, assets, { negative: false }) : brandHtml(design, assets);
  return paint(design, `
    <section class="page page--slide page--cover cover--${cover.id}" aria-label="Capa" data-target="cover">
      ${slideArt(cover.id, idPrefix, { photoUrl: photo ? esc(photo.url) : '' })}
      ${brand ? `<div class="cover__brand">${brand}</div>` : ''}
      <div class="cover__heading">
        ${meta.kicker ? `<p class="cover__kicker"${edMeta('kicker')}>${esc(meta.kicker)}</p>` : ''}
        <p class="cover__title"${edMeta('title')}>${esc(meta.title)}</p>
        ${meta.subtitle ? `<p class="cover__subtitle"${edMeta('subtitle')}>${esc(meta.subtitle)}</p>` : ''}
        ${meta.description ? `<p class="cover__desc"${edMeta('description')}>${esc(meta.description)}</p>` : ''}
      </div>
      ${meta.version ? `<p class="cover__version"${edMeta('version')}>${esc(meta.version)}</p>` : ''}
    </section>`);
}

/**
 * Tela de encerramento: "Leque" (MIV p. 58 e 60) com a assinatura escolhida
 * na área branca; "Vinheta" (p. 62) e "Verde pleno" (p. 117) com a
 * assinatura do Governo e o conceito. Os contatos da contracapa, quando
 * preenchidos, ficam embaixo da assinatura.
 */
function renderSlideBack(doc, assets, back, idPrefix) {
  const { design, meta } = doc;
  const brand = back.id === 'slide-fan' ? brandHtml(design, assets) : conceptLockup(design, assets, { negative: Boolean(back.dark) });
  return paint(design, `
    <section class="page page--slide page--back back--${back.id}${back.dark ? ' page--dark' : ''}" aria-label="Contracapa" data-target="back">
      ${slideArt(back.id, idPrefix, { className: 'back__art' })}
      <div class="back__info">
        ${brand}
        ${meta.backTitle ? `<p class="back__title"${edMeta('backTitle')}>${esc(meta.backTitle)}</p>` : ''}
        ${meta.backText ? `<p class="back__text"${edMeta('backText')}>${esc(meta.backText)}</p>` : ''}
        ${meta.backWeb ? `<p class="back__web"${edMeta('backWeb')}>${esc(meta.backWeb)}</p>` : ''}
      </div>
    </section>`);
}

/**
 * Tela de conteúdo (MIV p. 58): assinatura horizontal no alto à direita
 * (sem o conceito, que fica na abertura), corpo e a faixa do grafismo no pé.
 * Cabeçalho, rodapé e margens do design valem só para a folha A4.
 */
function renderSlidePage(doc, assets, { bodyHtml, number, total, idPrefix, overflowing }) {
  const { design } = doc;
  const brand = brandHtml(design.signature === 'concept' ? { ...design, signature: 'state' } : design, assets);
  return paint(design, `
    <section class="page page--slide page--content${overflowing ? ' is-overflowing' : ''}" aria-label="Tela ${number}">
      ${brand ? `<div class="slide__brand">${brand}</div>` : ''}
      <div class="page__body">${bodyHtml}</div>
      <div class="page__footer page__footer--slide">${slideFooterArt(idPrefix)}</div>
      ${pageNumberHtml(design, number, total)}
    </section>`);
}

export function renderContentPage(doc, assets, { bodyHtml, first, number, total, idPrefix, overflowing, orientation = 'portrait' }) {
  const { design } = doc;
  if (isSlides(design)) return renderSlidePage(doc, assets, { bodyHtml, number, total, idPrefix, overflowing });
  // A meia faixa fica no lado de fora da folha: direita nas páginas ímpares, esquerda nas pares.
  const side = design.footer === 'half' && number % 2 === 0 ? 'left' : 'right';
  const footer = design.footer === 'none'
    ? ''
    : `<div class="page__footer page__footer--${design.footer}">${footerArt(design.footer, idPrefix, { mirror: side === 'left' })}</div>`;
  const classes = [
    'page', 'page--content',
    `page--footer-${design.footer}`,
    design.footer === 'half' ? `page--outer-${side}` : '',
    design.header === 'letterhead' && first ? 'page--letterhead' : '',
    orientation === 'landscape' ? 'page--landscape' : '',
    overflowing ? 'is-overflowing' : '',
  ].filter(Boolean).join(' ');
  return paint(design, `
    <section class="${classes}" aria-label="Página ${number}">
      ${headerHtml(doc, assets, first, idPrefix)}
      <div class="page__body">${bodyHtml}</div>
      ${design.footer === 'address' ? addressHtml(doc.meta) : ''}
      ${footer}
      ${pageNumberHtml(design, number, total)}
    </section>`);
}
