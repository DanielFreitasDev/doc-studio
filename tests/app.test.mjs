/**
 * O app de verdade num Chrome sem interface (mesmo caminho do `docstudio render`):
 * primeira abertura, modelo, alterações de IA com desfazer/refazer, segurança,
 * margens e PDF igual à prévia. Sem Chrome/Chromium, os testes são pulados.
 * Rode com `node --test tests/` na raiz do projeto.
 */
import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';

import { startServer, launchChrome, findChrome, waitFor, DOC_ROUTE } from '../tools/lib/chrome.mjs';

const ROOT = fileURLToPath(new URL('..', import.meta.url));
const EXAMPLE = new URL('../examples/manual-coleta-externa.docstudio.json', import.meta.url);
const chromeAvailable = await findChrome().then(() => true, () => false);
const skip = chromeAvailable ? false : 'Chrome/Chromium não encontrado (defina DOCSTUDIO_CHROME)';

let server;
let port;
let chrome;

before(async () => {
  if (skip) return;
  ({ server, port } = await startServer(ROOT, { documentText: await readFile(EXAMPLE, 'utf8') }));
  chrome = await launchChrome();
  await chrome.page('Emulation.setDeviceMetricsOverride', { width: 1440, height: 900, deviceScaleFactor: 1, mobile: false });
});

after(async () => {
  await chrome?.close();
  server?.close();
});

const open = async (query = '') => {
  await chrome.page('Page.navigate', { url: `http://127.0.0.1:${port}/index.html${query}` });
  await waitFor(chrome, `Boolean(window.docStudio?.store) && document.querySelectorAll('#pages > .page').length > 0`);
};
const settle = () => new Promise((resolve) => setTimeout(resolve, 600));
const errors = () => chrome.consoleMessages.filter((m) => m.level === 'error').map((m) => m.text);

test('primeira abertura: tema claro, galeria de modelos e console limpo', { skip }, async () => {
  await open();
  const state = await chrome.evaluate(`({
    theme: document.documentElement.dataset.theme,
    gallery: document.querySelector('#templates-dialog').open,
    categories: document.querySelectorAll('[name="template-category"]').length,
  })`);
  assert.equal(state.theme, 'light');
  assert.equal(state.gallery, true);
  assert.ok(state.categories >= 4);
  assert.deepEqual(errors(), []);
});

test('filtro da galeria mostra só os modelos da categoria', { skip }, async () => {
  const visible = await chrome.evaluate(`(() => {
    const radio = document.querySelector('[name="template-category"][value="official"]');
    radio.checked = true;
    radio.dispatchEvent(new Event('change', { bubbles: true }));
    return [...document.querySelectorAll('[data-template-group="model"] > li')].filter((li) => !li.hidden).map((li) => li.querySelector('[data-template]').dataset.template);
  })()`);
  assert.deepEqual(visible, ['notice', 'letter']);
});

test('escolher um modelo abre o documento paginado', { skip }, async () => {
  await chrome.evaluate(`document.querySelector('[data-template="guide"]').click()`);
  await settle();
  const state = await chrome.evaluate(`({ name: window.docStudio.store.doc.name, pages: window.docStudio.report().pageCount, gallery: document.querySelector('#templates-dialog').open })`);
  assert.equal(state.name, 'Guia rápido');
  assert.equal(state.gallery, false);
  assert.ok(state.pages >= 3, `páginas: ${state.pages}`);
});

test('alterações de IA entram como um passo de desfazer (fluxo AI-C)', { skip }, async () => {
  const result = await chrome.evaluate(`(async () => {
    const { store, applyOperations } = window.docStudio;
    const before = JSON.stringify({ blocks: store.doc.blocks, design: store.doc.design });
    const ids = store.doc.blocks.map((b) => b.id);
    const applied = applyOperations([
      { op: 'reorder', ids: [...ids].reverse() },
      { op: 'setDesign', set: { theme: 'teal', cover: 'identity' } },
    ]);
    const changed = JSON.stringify({ blocks: store.doc.blocks, design: store.doc.design });
    store.undo();
    const undone = JSON.stringify({ blocks: store.doc.blocks, design: store.doc.design });
    store.redo();
    const redone = JSON.stringify({ blocks: store.doc.blocks, design: store.doc.design });
    store.undo();
    return { ok: applied.ok, error: applied.error, differs: changed !== before, undo: undone === before, redo: redone === changed };
  })()`);
  assert.equal(result.ok, true, result.error);
  assert.ok(result.differs);
  assert.ok(result.undo, 'Ctrl+Z restaura o documento anterior');
  assert.ok(result.redo, 'Ctrl+Shift+Z reaplica o lote');
});

test('HTML num texto aparece como texto e não executa (fluxo AI-D)', { skip }, async () => {
  const result = await chrome.evaluate(`(async () => {
    const r = window.docStudio.applyOperations([{ op: 'insert', at: 'end', blocks: [{ type: 'paragraph', text: '<img src=x onerror="window.__xss = 1"> fim' }] }]);
    await new Promise((resolve) => setTimeout(resolve, 800));
    const pages = document.querySelector('#pages');
    const output = { ok: r.ok, xss: window.__xss ?? null, img: pages.querySelectorAll('img[src="x"]').length, text: pages.textContent.includes('<img src=x') };
    window.docStudio.store.undo();
    return output;
  })()`);
  assert.equal(result.ok, true);
  assert.equal(result.xss, null);
  assert.equal(result.img, 0);
  assert.ok(result.text);
});

test('margem estreita alarga a área útil na prévia e na medição', { skip }, async () => {
  const widths = await chrome.evaluate(`(async () => {
    window.docStudio.applyOperations([{ op: 'setDesign', set: { margins: 'narrow' } }]);
    await new Promise((resolve) => setTimeout(resolve, 800));
    const mm = (px) => Math.round((px * 25.4) / 96);
    const page = [...document.querySelectorAll('#pages > .page')].find((p) => p.querySelector('.page__body'));
    const zoom = page.offsetWidth ? page.getBoundingClientRect().width / page.offsetWidth : 1;
    const out = { measure: mm(document.querySelector('#measure-body').getBoundingClientRect().width), body: mm(page.querySelector('.page__body').getBoundingClientRect().width / zoom) };
    window.docStudio.store.undo();
    return out;
  })()`);
  assert.deepEqual(widths, { measure: 180, body: 180 });
});

test('campo visual guarda "+", "=" e "~" na ponta e no meio de um trecho formatado', { skip }, async () => {
  const html = '<u>C+</u> e <mark>a=</mark> e <s>~b~</s> e <u>C++</u> e <u>Ligue +55 85</u> e <mark>a = b</mark> e <s>x ~ y \\~</s> e <u><b>+1</b> +2</u>';
  const result = await chrome.evaluate(`(async () => {
    const { richMarkup } = await import('/js/richtext.js');
    const { renderInline } = await import('/js/markup.js');
    const field = document.createElement('div');
    field.innerHTML = ${JSON.stringify(html)};
    const markup = richMarkup(field);
    return { markup, html: renderInline(markup) };
  })()`);
  assert.equal(result.html, html.replace('<b>', '<strong>').replace('</b>', '</strong>'), result.markup);
});

test('texto colado além do limite é cortado com aviso, igual ao que a importação aceita', { skip }, async () => {
  const result = await chrome.evaluate(`(async () => {
    const { store } = window.docStudio;
    window.docStudio.applyOperations([{ op: 'insert', at: 'start', blocks: [{ id: 'b_limite', type: 'paragraph', text: 'curto' }] }]);
    await new Promise((resolve) => setTimeout(resolve, 400));
    const field = document.querySelector('[data-block-id="b_limite"] [data-path="text"]');
    field.textContent = 'x'.repeat(20500);
    field.dispatchEvent(new InputEvent('input', { bubbles: true, inputType: 'insertFromPaste' }));
    await new Promise((resolve) => setTimeout(resolve, 300));
    const length = store.doc.blocks.find((b) => b.id === 'b_limite').text.length;
    const toast = [...document.querySelectorAll('.toast')].some((t) => t.textContent.includes('20.000 caracteres'));
    store.undo(); store.undo();
    return { length, toast, found: Boolean(field) };
  })()`);
  assert.ok(result.found, 'campo do parágrafo no editor');
  assert.equal(result.length, 20000);
  assert.ok(result.toast, 'aviso exibido');
});

/** Teclas de verdade pelo CDP (o navegador gera keydown, beforeinput e input). */
const press = (key, { ctrl = false } = {}) => chrome.page('Input.dispatchKeyEvent', {
  type: 'keyDown', key, code: `Key${key.toUpperCase()}`, windowsVirtualKeyCode: key.toUpperCase().charCodeAt(0), modifiers: ctrl ? 2 : 0,
}).then(() => chrome.page('Input.dispatchKeyEvent', { type: 'keyUp', key, code: `Key${key.toUpperCase()}`, modifiers: ctrl ? 2 : 0 }));
const type = async (text) => { for (const char of text) await chrome.page('Input.dispatchKeyEvent', { type: 'char', text: char }); };

test('Ctrl+B com o cursor parado liga e desliga o negrito do que vem a seguir', { skip }, async () => {
  await chrome.evaluate(`(async () => {
    window.docStudio.applyOperations([{ op: 'insert', at: 'start', blocks: [{ id: 'b_pendente', type: 'paragraph', text: 'Texto' }] }]);
    await new Promise((resolve) => setTimeout(resolve, 400));
    const { setRichSelection } = await import('/js/richtext.js');
    const field = document.querySelector('[data-block-id="b_pendente"] [data-path="text"]');
    field.focus();
    setRichSelection(field, [5, 5]);
  })()`);
  await type(' ');
  await press('b', { ctrl: true });
  await type('ab');
  await press('b', { ctrl: true });
  await type(' cd');
  const text = await chrome.evaluate(`window.docStudio.store.doc.blocks.find((b) => b.id === 'b_pendente').text`);
  await chrome.evaluate('window.docStudio.store.undo(); window.docStudio.store.undo();');
  assert.equal(text, 'Texto **ab** cd');
});

test('textos maiores que a página continuam na seguinte, sem cortar nem repetir palavras', { skip }, async () => {
  const result = await chrome.evaluate(`(async () => {
    const words = Array.from({ length: 1200 }, (_, i) => 'w' + i).join(' ');
    const blocks = [
      { id: 'b_big_li', type: 'list', style: 'ordered', items: 'curto\\n' + words },
      { id: 'b_big_quote', type: 'quote', text: words, author: 'Autoria' },
      { id: 'b_big_step', type: 'steps', items: [{ title: 'Um', text: 'x' }, { title: 'Dois', text: words }] },
      { id: 'b_big_callout', type: 'callout', tone: 'warning', title: 'Atenção', text: words },
      { id: 'b_big_faq', type: 'faq', items: [{ question: 'Pergunta?', answer: words }] },
    ];
    window.docStudio.applyOperations([{ op: 'insert', at: 'end', blocks }]);
    await new Promise((resolve) => setTimeout(resolve, 1200));
    const counts = {};
    for (const { id } of blocks) {
      const parts = [...document.querySelectorAll('#pages .atom[data-block-id="' + id + '"]')];
      const found = parts.map((el) => el.textContent).join(' ').match(/w\\d+/g) ?? [];
      counts[id] = { parts: parts.length, words: found.length, unique: new Set(found).size };
    }
    const overflow = [...window.docStudio.ui.get('overflowBlocks')];
    window.docStudio.store.undo();
    return { counts, overflow };
  })()`);
  assert.deepEqual(result.overflow, []);
  for (const [id, count] of Object.entries(result.counts)) {
    assert.ok(count.parts >= 2, `${id} dividido em ${count.parts} parte(s)`);
    assert.deepEqual([count.words, count.unique], [1200, 1200], id);
  }
});

test('bloco inserido recebe o foco no texto principal e aparece na prévia', { skip }, async () => {
  const result = await chrome.evaluate(`(async () => {
    const { store, ui } = window.docStudio;
    const last = store.doc.blocks.at(-1).id;
    ui.set({ selectedId: last });
    document.querySelector('#preview-scroll').scrollTop = 0;
    document.querySelector('[data-insert-type="callout"]').click();
    await new Promise((resolve) => setTimeout(resolve, 900));
    const block = store.doc.blocks.find((b) => b.type === 'callout' && b.id === ui.get('selectedId'));
    const focused = document.activeElement?.dataset?.path ?? null;
    const atom = document.querySelector('#pages .atom[data-block-id="' + block?.id + '"]')?.getBoundingClientRect();
    const view = document.querySelector('#preview-scroll').getBoundingClientRect();
    const visible = Boolean(atom) && atom.bottom > view.top && atom.top < view.bottom;
    store.undo();
    return { inserted: Boolean(block), focused, visible };
  })()`);
  assert.deepEqual(result, { inserted: true, focused: 'text', visible: true });
});

test('edição em conjunto: uma opção muda todos os blocos do tipo num passo de desfazer', { skip }, async () => {
  const result = await chrome.evaluate(`(async () => {
    const { store, ui, applyOperations } = window.docStudio;
    const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
    applyOperations([{ op: 'insert', at: 'end', blocks: [
      { type: 'paragraph', id: 'p_bulk_1', text: 'Primeiro.' },
      { type: 'paragraph', id: 'p_bulk_2', text: 'Segundo.', align: 'center' },
      { type: 'divider', id: 'd_bulk' },
    ] }]);
    const aligns = () => store.doc.blocks.filter((b) => b.id.startsWith('p_bulk')).map((b) => b.align);
    ui.set({ selectedIds: new Set(['p_bulk_1', 'p_bulk_2', 'd_bulk']), selectedId: 'd_bulk', selectSource: 'multi' });
    document.querySelector('[data-selection="edit"]').click();
    await wait(100);
    const panel = document.querySelector('#bulk-edit');
    const groups = [...panel.querySelectorAll('[data-type]')].map((g) => g.dataset.type);
    const mixed = Boolean(panel.querySelector('[data-type="paragraph"] [data-key="align"][data-mixed]'));
    panel.querySelector('[data-type="paragraph"] input[data-path="align"][value="justify"]').click();
    await wait(700);
    const applied = aligns();
    const justified = document.querySelectorAll('#pages [data-block-id^="p_bulk"] .b-p--justify').length;
    const cards = document.querySelectorAll('.block-card[data-block-id^="p_bulk"] input[data-path="align"][value="justify"]:checked').length;
    store.undo();
    await wait(100);
    const undone = aligns();
    const mixedAgain = Boolean(panel.querySelector('[data-type="paragraph"] [data-key="align"][data-mixed]'));
    panel.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
    const closed = !panel.matches(':popover-open');
    store.undo();
    return { groups, mixed, applied, justified, cards, undone, mixedAgain, closed };
  })()`);
  assert.deepEqual(result, {
    groups: ['paragraph', 'divider'],
    mixed: true,
    applied: ['justify', 'justify'],
    justified: 2,
    cards: 2,
    undone: ['left', 'center'],
    mixedAgain: true,
    closed: true,
  });
  assert.deepEqual(errors(), []);
});

test('apresentação: telas 16:9 do MIV na prévia, no painel Design e no PDF', { skip }, async () => {
  const state = await chrome.evaluate(`(async () => {
    const { store, applyOperations } = window.docStudio;
    const sections = store.doc.blocks.filter((b) => b.type === 'section' && !b.opener).map((b) => b.id);
    applyOperations([{ op: 'setDesign', set: { format: 'slides' } }]);
    await new Promise((resolve) => setTimeout(resolve, 900));
    const mm = (px) => Math.round((px * 25.4) / 96);
    const pages = [...document.querySelectorAll('#pages > .page')];
    const content = pages.find((p) => p.classList.contains('page--content'));
    const zoom = content.getBoundingClientRect().width / content.offsetWidth;
    const hidden = (selector) => document.querySelector(selector).hidden;
    return {
      design: { format: store.doc.design.format, cover: store.doc.design.cover, backCover: store.doc.design.backCover },
      allSlides: pages.every((p) => p.classList.contains('page--slide')),
      page: [mm(content.offsetWidth), mm(content.offsetHeight)],
      // A coluna de medição só fica na largura da tela enquanto mede os átomos (js/paginate.js).
      measure: (() => {
        const measureBody = document.querySelector('#measure-body');
        measureBody.classList.add('measure-body--slide');
        const width = mm(measureBody.getBoundingClientRect().width);
        measureBody.classList.remove('measure-body--slide');
        return width;
      })(),
      body: mm(content.querySelector('.page__body').getBoundingClientRect().width / zoom),
      brand: Boolean(content.querySelector('.slide__brand .brand')),
      // Cada seção começa uma tela: o título é o primeiro átomo da página onde aparece.
      sectionsOnTop: sections.every((id) => {
        const title = document.querySelector('.atom--slide-title[data-block-id="' + id + '"]:not(.atom--continued)');
        return title && title.parentElement.firstElementChild === title;
      }),
      formatChecked: document.querySelector('[name="design-format"][value="slides"]').checked,
      headerGroupHidden: hidden('#design-header'),
      a4CoverHidden: document.querySelector('#design-cover input[value="folder"]').closest('li').hidden,
      slideCoverShown: !document.querySelector('#design-cover input[value="slide-panel"]').closest('li').hidden,
    };
  })()`);
  assert.deepEqual(state.design, { format: 'slides', cover: 'slide-panel', backCover: 'slide-fan' });
  assert.equal(state.allSlides, true);
  assert.deepEqual(state.page, [240, 135]);
  assert.equal(state.measure, 191);
  assert.equal(state.body, 191);
  assert.equal(state.brand, true);
  assert.equal(state.sectionsOnTop, true);
  assert.equal(state.formatChecked, true);
  assert.equal(state.headerGroupHidden, true);
  assert.equal(state.a4CoverHidden, true);
  assert.equal(state.slideCoverShown, true);
  const report = await chrome.evaluate('window.docStudio.report()');
  assert.deepEqual(report.overflowBlocks, []);
  assert.ok(report.pages.every((p) => p.orientation === 'slide'));
  const { data } = await chrome.page('Page.printToPDF', { printBackground: true, preferCSSPageSize: true });
  const pdf = Buffer.from(data, 'base64').toString('latin1');
  assert.equal((pdf.match(/\/Type\s*\/Page\b(?!s)/g) ?? []).length, report.pageCount);
  // 240 × 135 mm = 680 × 383 pt; nenhuma imagem rasterizada (o exemplo não tem fotos).
  const box = /\/MediaBox\s*\[\s*0 0 ([\d.]+) ([\d.]+)\s*\]/.exec(pdf);
  assert.deepEqual([Math.round(Number(box[1])), Math.round(Number(box[2]))], [680, 383]);
  assert.equal((pdf.match(/\/Subtype\s*\/Image/g) ?? []).length, 0);
  await chrome.evaluate('window.docStudio.store.undo()');
  await settle();
  assert.equal(await chrome.evaluate('window.docStudio.store.doc.design.format'), 'a4');
  assert.deepEqual(errors(), []);
});

test('PDF tem as mesmas páginas da prévia, sem imagens rasterizadas', { skip }, async () => {
  await chrome.page('Page.navigate', { url: `http://127.0.0.1:${port}/index.html?render=${DOC_ROUTE}` });
  const state = await waitFor(chrome, 'document.documentElement.dataset.renderState');
  assert.equal(state, 'ready');
  const report = await chrome.evaluate('window.docStudio.report()');
  assert.equal(report.pageCount, 11);
  assert.deepEqual(report.overflowBlocks, []);
  assert.ok(report.pages.every((p) => p.fill == null || p.fill <= 1.005), 'nenhuma página passa da área útil');
  const { data } = await chrome.page('Page.printToPDF', { printBackground: true, preferCSSPageSize: true });
  const pdf = Buffer.from(data, 'base64').toString('latin1');
  assert.equal((pdf.match(/\/Type\s*\/Page\b(?!s)/g) ?? []).length, report.pageCount);
  assert.equal((pdf.match(/\/Subtype\s*\/Image/g) ?? []).length, 0);
  assert.deepEqual(errors(), []);
});
