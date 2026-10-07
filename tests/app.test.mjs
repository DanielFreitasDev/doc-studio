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

test('campo visual guarda "+", "=" e "~" na ponta de um trecho formatado', { skip }, async () => {
  const result = await chrome.evaluate(`(async () => {
    const { richMarkup } = await import('/js/richtext.js');
    const { renderInline } = await import('/js/markup.js');
    const field = document.createElement('div');
    field.innerHTML = '<u>C+</u> e <mark>a=</mark> e <s>~b~</s> e <u>C++</u>';
    const markup = richMarkup(field);
    return { markup, html: renderInline(markup) };
  })()`);
  assert.equal(result.html, '<u>C+</u> e <mark>a=</mark> e <s>~b~</s> e <u>C++</u>', result.markup);
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
