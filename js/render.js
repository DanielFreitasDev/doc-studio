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
import { renderInline } from './markup.js';
import { ALTERNATE_TONES, CALLOUT_TONES } from './schema.js';
import { COVERS, BACK_COVERS } from './design.js';
import { coverArt, backArt, chapterArt, footerArt, dividerArt, CHECK_SVG } from './graphics.js';

/* ------------------------------------------------------------------ auxiliares */
const toneClass = (tone, index = 0) => `tone-${tone === 'alternate' ? ALTERNATE_TONES[index % ALTERNATE_TONES.length] : tone}`;
const calloutTone = (value) => CALLOUT_TONES.find((t) => t.value === value)?.tone ?? 'navy';
const nonEmptyLines = (text) => String(text ?? '').split('\n').map((line) => line.trim()).filter(Boolean);
const paragraphs = (text) => String(text ?? '').split(/\n\s*\n/).map((p) => p.trim()).filter(Boolean);

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
  };
}

/* ------------------------------------------------------------------ blocos */
const RENDERERS = {
  section(block, ctx) {
    const number = ctx.sectionNumbers.get(block.id);
    const num = number ? pad2(number) : '';
    const showKicker = block.kicker || (num && ctx.design.sectionStyle !== 'number');
    const kicker = showKicker
      ? `<p class="b-section__kicker">${num ? `<span class="b-section__num">${num}</span><span class="b-section__dot"> . </span>` : ''}<span>${esc(block.kicker)}</span></p>`
      : '';
    const intro = paragraphs(block.intro).map((text) => `<p class="b-p b-p--lead b-section__intro">${renderInline(text)}</p>`).join('');

    if (block.opener) {
      // Página inteira de abertura: o título não se repete na página de conteúdo.
      return [{
        kind: 'chapter',
        blockId: block.id,
        build: (idPrefix) => `
          <section class="page page--chapter" aria-label="Abertura: ${esc(block.title)}">
            ${chapterArt(idPrefix)}
            <div class="chapter__content atom" data-block-id="${esc(block.id)}">
              ${num ? `<p class="chapter__num">${num}</p>` : ''}
              ${block.kicker ? `<p class="chapter__kicker">${esc(block.kicker)}</p>` : ''}
              <h2 class="chapter__title">${renderInline(block.title)}</h2>
              <span class="chapter__rule"></span>
              ${intro.replaceAll('b-section__intro', 'chapter__intro')}
            </div>
          </section>`,
      }];
    }

    const html = `
      <div class="b-section">
        ${num ? `<span class="b-section__bignum">${num}</span>` : ''}
        ${kicker}
        <h2 class="b-section__title">${renderInline(block.title)}</h2>
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
    return [atom(block, `atom--h${level}`, `<${tag} class="b-h${level}">${renderInline(block.text)}</${tag}>`, { keep: true })];
  },

  paragraph(block) {
    return paragraphs(block.text).map((text) =>
      atom(block, `atom--p atom--p-${block.style}`, `<p class="b-p b-p--${block.style}">${renderInline(text)}</p>`));
  },

  list(block) {
    const items = nonEmptyLines(block.items);
    return items.map((text, index) => {
      const mark = block.style === 'ordered' ? `${index + 1}.` : block.style === 'check' ? CHECK_SVG : '•';
      const last = index === items.length - 1 ? ' is-last' : '';
      return atom(block, `atom--li${last}`,
        `<div class="b-li b-li--${block.style}"><span class="b-li__mark" aria-hidden="true">${mark}</span><span>${renderInline(text)}</span></div>`);
    });
  },

  quote(block) {
    const author = block.author ? `<p class="b-quote__author">${esc(block.author)}</p>` : '';
    return [atom(block, 'atom--quote', `<blockquote class="b-quote"><p class="b-quote__text">${renderInline(block.text)}</p>${author}</blockquote>`)];
  },

  steps(block) {
    const atoms = [];
    if (block.title) atoms.push(atom(block, 'atom--h3 atom--steps-title', `<h3 class="b-h3">${renderInline(block.title)}</h3>`, { keep: true }));
    const tone = toneClass(block.tone);
    block.items.forEach((item, index) => {
      const last = index === block.items.length - 1 ? ' is-last' : '';
      atoms.push(atom(block, `atom--step${last}`, `
        <div class="b-step ${tone}${last}">
          <span class="b-step__n">${block.start + index}</span>
          <div>
            ${item.title ? `<p class="b-step__t">${renderInline(item.title)}</p>` : ''}
            ${item.text ? `<p class="b-step__b">${renderInline(item.text)}</p>` : ''}
          </div>
        </div>`));
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
              ${item.title ? `<p class="b-card__t">${renderInline(item.title)}</p>` : ''}
              ${item.text ? `<p class="b-card__b">${renderInline(item.text)}</p>` : ''}
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
            ${item.title ? `<p class="b-flow__t">${renderInline(item.title)}</p>` : ''}
            ${item.text ? `<p class="b-flow__b">${renderInline(item.text)}</p>` : ''}
          </div>`;
      }).join('');
      const last = rowIndex === rows.length - 1 ? ' is-last' : '';
      return atom(block, `atom--flow${last}`, `<div class="b-flow" style="--cols:${columns}">${items}</div>`);
    });
  },

  timeline(block) {
    const atoms = [];
    if (block.title) atoms.push(atom(block, 'atom--h3', `<h3 class="b-h3">${renderInline(block.title)}</h3>`, { keep: true }));
    const columns = gridColumns(block.items.length, 5);
    chunk(block.items, columns).forEach((row, rowIndex) => {
      const items = row.map((item, i) => `
        <div class="b-tl__item ${toneClass(block.tone, rowIndex * columns + i)}">
          <span class="b-tl__dot"></span>
          ${item.date ? `<p class="b-tl__date">${esc(item.date)}</p>` : ''}
          ${item.title ? `<p class="b-tl__t">${renderInline(item.title)}</p>` : ''}
          ${item.text ? `<p class="b-tl__b">${renderInline(item.text)}</p>` : ''}
        </div>`).join('');
      atoms.push(atom(block, 'atom--timeline', `<div class="b-tl" style="--cols:${columns}">${items}</div>`));
    });
    return atoms;
  },

  toc(block, ctx) {
    const items = ctx.sections.map((section) => `
      <li class="b-toc__item">
        <span class="b-toc__n">${section.number ? pad2(section.number) : '•'}</span>
        <span class="b-toc__t">${esc(section.title)}</span>
        <span class="b-toc__p" data-toc-page="${esc(section.id)}">00</span>
      </li>`).join('');
    const list = items
      ? `<ol class="b-toc__list" style="--cols:${block.columns}">${items}</ol>`
      : '<p class="b-toc__empty">Adicione blocos do tipo “Seção” para montar o sumário.</p>';
    return [atom(block, 'atom--toc', `<nav class="b-toc" aria-label="${esc(block.title)}"><h3 class="b-toc__title">${esc(block.title)}</h3>${list}</nav>`)];
  },

  callout(block) {
    const title = block.title ? `<p class="b-callout__title">${renderInline(block.title)}</p>` : '';
    return [atom(block, 'atom--callout', `<div class="b-callout tone-${calloutTone(block.tone)}">${title}<p class="b-callout__text">${renderInline(block.text)}</p></div>`)];
  },

  message(block) {
    return [atom(block, 'atom--callout', `
      <div class="b-callout tone-${calloutTone(block.tone)}">
        ${block.label ? `<p class="b-callout__label">${esc(block.label)}</p>` : ''}
        <p class="b-callout__quote">“${renderInline(block.text)}”</p>
      </div>`)];
  },

  faq(block) {
    return block.items.map((item) => atom(block, 'atom--faq', `
      <div class="b-faq ${toneClass(block.tone)}">
        <div class="b-faq__q">
          ${block.questionLabel ? `<p class="b-faq__label">${esc(block.questionLabel)}</p>` : ''}
          <p class="b-faq__qt">${renderInline(item.question)}</p>
        </div>
        <div class="b-faq__a">
          ${block.answerLabel ? `<p class="b-faq__label">${esc(block.answerLabel)}</p>` : ''}
          <p class="b-faq__at">${renderInline(item.answer)}</p>
        </div>
      </div>`));
  },

  chips(block) {
    const chips = nonEmptyLines(block.items).map((text) => `<span class="b-chip">${renderInline(text)}</span>`).join('');
    const label = block.label ? `<p class="b-chips__label">${renderInline(block.label)}</p>` : '';
    return [atom(block, 'atom--chips', `<div class="b-chips ${toneClass(block.tone)}">${label}<div class="b-chips__list">${chips}</div></div>`)];
  },

  table(block, ctx) {
    const widths = ctx.tableColumns(block);
    const colgroup = widths ? `<colgroup>${widths.map((w) => `<col style="width:${w}%">`).join('')}</colgroup>` : '';
    const tone = `tone-${block.tone}`;
    const headerHtml = `<table class="b-table ${tone}">${colgroup}<thead><tr>${block.header.map((cell) => `<th>${renderInline(cell)}</th>`).join('')}</tr></thead></table>`;
    const header = atom(block, 'atom--table', headerHtml, { keep: true, group: true });
    const headerAtomHtml = header.html;

    const rows = block.rows.map((row, index) => {
      const zebra = block.zebra && index % 2 === 1 ? ' b-table--zebra' : '';
      const cells = row.map((cell, col) => `<td${col === 0 && block.keyColumn ? ' class="is-key"' : ''}>${renderInline(cell)}</td>`).join('');
      const last = index === block.rows.length - 1 ? ' is-last' : '';
      return atom(block, `atom--table${last}`, `<table class="b-table ${tone}${zebra}">${colgroup}<tbody><tr>${cells}</tr></tbody></table>`,
        { group: true, repeatHeader: headerAtomHtml });
    });

    const atoms = [header, ...rows];
    if (block.note) atoms.push(atom(block, 'atom--p', `<p class="b-p b-p--note b-table-note">${renderInline(block.note)}</p>`));
    return atoms;
  },

  stats(block) {
    const columns = gridColumns(block.items.length);
    return chunk(block.items, columns).map((row, rowIndex) => {
      const items = row.map((item, i) => {
        const tone = toneClass(block.tone, rowIndex * columns + i);
        return block.style === 'sheet'
          ? `<div class="b-sheet ${tone}"><p class="b-sheet__l">${esc(item.label)}</p><p class="b-sheet__v">${renderInline(item.value)}</p><p class="b-sheet__s">${renderInline(item.sub)}</p></div>`
          : `<div class="b-kpi ${tone}"><p class="b-kpi__v">${esc(item.value)}</p><p class="b-kpi__l">${renderInline(item.label)}</p><p class="b-kpi__s">${renderInline(item.sub)}</p></div>`;
      }).join('');
      return atom(block, 'atom--stats', `<div class="b-stats" style="--cols:${columns}">${items}</div>`);
    });
  },

  glossary(block) {
    const tone = toneClass(block.tone);
    if (!block.items.length) {
      return [atom(block, 'atom--gloss is-last seg-start seg-end', `<div class="b-gloss ${tone}"><p class="b-gloss__title">${esc(block.title)}</p></div>`)];
    }
    return block.items.map((item, index) => {
      const title = index === 0 && block.title ? `<p class="b-gloss__title">${esc(block.title)}</p>` : '';
      const last = index === block.items.length - 1 ? ' is-last' : '';
      return atom(block, `atom--gloss${last}`,
        `<div class="b-gloss ${tone}">${title}<p><strong>${esc(item.term)}</strong>${item.term && item.definition ? ' — ' : ''}${renderInline(item.definition)}</p></div>`,
        { group: true });
    });
  },

  image(block, ctx) {
    const asset = ctx.assets[block.assetId];
    if (!asset) {
      return [atom(block, 'atom--figure', '<figure class="b-fig"><div class="b-fig__empty">Escolha uma imagem no editor</div></figure>')];
    }
    let caption = '';
    if (block.caption) {
      ctx.figureNo += 1;
      caption = `<figcaption><span class="b-fig__n">Figura ${ctx.figureNo}</span> · ${renderInline(block.caption)}</figcaption>`;
    }
    const alt = block.caption ? esc(block.caption) : 'Imagem';
    return [atom(block, 'atom--figure', `
      <figure class="b-fig${block.frame ? ' b-fig--frame' : ''}">
        <img src="${esc(asset.url)}" alt="${alt}" width="${asset.width}" height="${asset.height}" style="width:${block.width}%" decoding="async">
        ${caption}
      </figure>`)];
  },

  divider(block) {
    const art = block.style === 'wedge' ? dividerArt(`dv-${block.id}`) : '';
    return [atom(block, 'atom--divider', `<span class="b-div b-div--${block.style}" role="presentation">${art}</span>`)];
  },

  pagebreak(block) {
    return [{ kind: 'break', blockId: block.id }];
  },
};

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
    sections.push({ id: block.id, number, title: block.title.replace(/\*\*|==|~~|`/g, '') });
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
 * opções que pedem a secretaria; a versão vertical existe sem secretaria e
 * só em positivo.
 */
function stateLogo(design, { negative, vertical }) {
  if (vertical) {
    return `<img class="brand__state brand__state--vertical" src="assets/img/ceara-vertical.png" alt="${STATE_ALT}" width="853" height="735">`;
  }
  const suffix = negative ? '-negative' : '';
  const file = withSecretaria(design) ? 'ceara' : 'ceara-state';
  return `<img class="brand__state" src="assets/img/${file}${suffix}.png" alt="${STATE_ALT}" width="1200" height="382">`;
}

function partnerLogo(design, assets, negative) {
  if (design.signature === 'joint') {
    return `<img class="brand__partner" src="assets/img/detran${negative ? '-negative' : ''}.png" alt="DETRAN/CE" width="370" height="416">`;
  }
  const logo = design.signature === 'custom' ? assets[design.customLogo] : null;
  return logo ? `<img class="brand__partner" src="${esc(logo.url)}" alt="Logo do órgão" width="${logo.width}" height="${logo.height}">` : '';
}

/**
 * Assinatura conforme o MIV (p. 15–18): o órgão vem à esquerda e o Governo
 * sempre à direita, sem fio separador, afastados pela largura do escudo e
 * alinhados pelo centro do escudo (sem a coroa). `vertical` usa a assinatura
 * vertical quando não há órgão parceiro (papel timbrado, pasta oficial).
 */
export function brandHtml(design, assets, { negative = false, vertical = false } = {}) {
  if (design.signature === 'none') return '';
  const partner = partnerLogo(design, assets, negative);
  // A vertical só existe sem secretaria e em positivo (fundo branco).
  const useVertical = vertical && !partner && !negative && !withSecretaria(design);
  const layout = partner ? 'joint' : useVertical ? 'vertical' : 'single';
  return `<div class="brand brand--${layout}">${partner}${stateLogo(design, { negative, vertical: useVertical })}</div>`;
}

/* ------------------------------------------------------------------ páginas */
export function renderCover(doc, assets, idPrefix) {
  const { design, meta } = doc;
  const cover = COVERS.find((c) => c.id === design.cover);
  if (!cover || cover.id === 'none') return '';
  const audience = meta.audience || meta.version
    ? `<div class="cover__audience">
         ${meta.audienceLabel && meta.audience ? `<p class="cover__aud-label">${esc(meta.audienceLabel)}</p>` : ''}
         ${meta.audience ? `<p class="cover__aud-text">${esc(meta.audience)}</p>` : ''}
         ${meta.version ? `<p class="cover__version">${esc(meta.version)}</p>` : ''}
       </div>`
    : '';
  return `
    <section class="page page--cover cover--${cover.id}${cover.dark ? ' page--dark' : ''}" aria-label="Capa" data-target="cover">
      ${coverArt(cover.id, idPrefix)}
      <div class="cover__brand">${brandHtml(design, assets, { negative: cover.dark, vertical: cover.id === 'official' })}</div>
      <div class="cover__heading">
        ${meta.kicker ? `<p class="cover__kicker">${esc(meta.kicker)}</p>` : ''}
        <p class="cover__title">${esc(meta.title)}</p>
        ${meta.subtitle ? `<p class="cover__subtitle">${esc(meta.subtitle)}</p>` : ''}
        <span class="cover__rule"></span>
        ${meta.description ? `<p class="cover__desc">${esc(meta.description)}</p>` : ''}
      </div>
      ${audience}
    </section>`;
}

export function renderBackCover(doc, assets, idPrefix) {
  const { design, meta } = doc;
  const back = BACK_COVERS.find((c) => c.id === design.backCover);
  if (!back || back.id === 'none') return '';
  return `
    <section class="page page--back back--${back.id}${back.dark ? ' page--dark' : ''}" aria-label="Contracapa" data-target="back">
      ${backArt(back.id, idPrefix)}
      <div class="back__info">
        ${back.id === 'concept' ? conceptLockup(design, assets) : brandHtml(design, assets, { negative: back.dark })}
        ${meta.backTitle ? `<p class="back__title">${esc(meta.backTitle)}</p>` : ''}
        ${meta.backText ? `<p class="back__text">${esc(meta.backText)}</p>` : ''}
      </div>
    </section>`;
}

/** Assinatura + slogan do Governo, como na contracapa do MIV (p. 9 e 117). */
function conceptLockup(design, assets) {
  const brand = brandHtml(design, assets, { negative: true });
  const slogan = '<p class="slogan"><strong>Cuidar</strong> das pessoas, <strong>avançar</strong> o Ceará.</p>';
  return `<div class="concept">${brand}${brand ? '<span class="concept__rule"></span>' : ''}${slogan}</div>`;
}

function headerHtml(doc, first) {
  const { design, meta } = doc;
  if (design.header === 'none') return '';
  // Papel timbrado do MIV (p. 34–36): assinatura centralizada só na primeira folha.
  if (design.header === 'letterhead') {
    return first ? `<header class="page__letterhead">${brandHtml(design, {}, { vertical: true })}</header>` : '';
  }
  // Assinatura no cabeçalho: sem secretaria e com 30 mm de largura (mínimo do MIV, p. 21).
  const right = design.header === 'logo'
    ? `<img src="assets/img/ceara-state.png" alt="${STATE_ALT}" width="1200" height="382">`
    : esc(meta.headerRight);
  return `
    <header class="page__header page__header--${design.header}">
      <span class="page__header-left"><span class="page__header-title">${esc(meta.headerTitle)}</span>${meta.headerSubtitle ? `<span class="page__header-sub">${esc(meta.headerSubtitle)}</span>` : ''}</span>
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

export function renderContentPage(doc, { bodyHtml, first, number, total, idPrefix, overflowing }) {
  const { design } = doc;
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
    overflowing ? 'is-overflowing' : '',
  ].filter(Boolean).join(' ');
  return `
    <section class="${classes}" aria-label="Página ${number}">
      ${headerHtml(doc, first)}
      <div class="page__body">${bodyHtml}</div>
      ${design.footer === 'address' ? addressHtml(doc.meta) : ''}
      ${footer}
      ${pageNumberHtml(design, number, total)}
    </section>`;
}
