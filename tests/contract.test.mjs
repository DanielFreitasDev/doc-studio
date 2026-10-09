/**
 * Contrato do documento (módulos sem DOM): formatação segura, importação,
 * operações por id, validação estrutural e da marca.
 * Rode com `node --test tests/` na raiz do projeto.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

import { renderInline, safeUrl, linkUrl, stripMarkup } from '../js/markup.js';
import { normalizeDocument, parseFilePayload, toFilePayload, createDocument } from '../js/model.js';
import { applyOperations, parseOperationsPayload, diffDocuments, assetConflicts } from '../js/operations.js';
import { createStore } from '../js/state.js';
import { validateDocument, brandReport, contentAdvice } from '../js/validate.js';
import { contentWidthMm, normalizeDesign, mergeDesign, DESIGN_OPTIONS, DESIGN_PRESETS } from '../js/design.js';
import { createRenderContext, renderBlock } from '../js/render.js';
import { markdownToBlocks } from '../js/markdown.js';
import { TEMPLATES, TEMPLATE_CATEGORIES } from '../js/templates.js';
import { BLOCK_TYPES, orientationAt } from '../js/schema.js';

const example = async (name) => parseFilePayload(await readFile(new URL(`../examples/${name}`, import.meta.url), 'utf8'));

test('texto do usuário vira HTML escapado, sem tags nem eventos', () => {
  const html = renderInline('<img src=x onerror=alert(1)> **negrito** <script>x</script>');
  assert.ok(!/<img|<script/i.test(html), html);
  assert.match(html, /&lt;img src=x onerror=alert\(1\)&gt;/);
  assert.match(html, /<strong>negrito<\/strong>/);
});

test('links só aceitam http(s), mailto e tel', () => {
  for (const bad of ['javascript:alert(1)', ' JavaScript:alert(1)', 'data:text/html,<b>', 'vbscript:x', 'https://a.b/"onmouseover="x']) {
    assert.equal(safeUrl(bad), '', bad);
  }
  assert.equal(safeUrl('www.detran.ce.gov.br'), 'https://www.detran.ce.gov.br');
  assert.equal(safeUrl('mailto:a@b.c'), 'mailto:a@b.c');
  const html = renderInline('[clique](javascript:alert(1)) e [site](https://detran.ce.gov.br?a=1&b=2)');
  assert.ok(!/href="javascript/i.test(html), html); // continua como texto, nunca como link
  assert.match(html, /<a href="https:\/\/detran\.ce\.gov\.br\?a=1&amp;b=2">site<\/a>/);
});

test('marcação de link não injeta atributos pelo texto', () => {
  const html = renderInline('[x" onclick="y](https://a.b)');
  assert.ok(!/onclick="/.test(html), html);
  assert.equal(stripMarkup('**a** _b_ `c`'), 'a b c');
});

test('importar e exportar preserva o documento (ida e volta)', async () => {
  for (const name of ['manual-coleta-externa.docstudio.json', 'procedimento-vistoria-g003.docstudio.json', 'guia-rapido-estudio.docstudio.json']) {
    const { doc, assets } = await example(name);
    const again = parseFilePayload(JSON.stringify(toFilePayload(doc, assets)));
    assert.deepEqual(again.doc.blocks, doc.blocks, name);
    assert.deepEqual(again.doc.design, doc.design, name);
    assert.deepEqual(again.doc.meta, doc.meta, name);
  }
});

test('importação descarta campos e valores fora do catálogo', () => {
  const doc = normalizeDocument({
    blocks: [
      { type: 'paragraph', id: 'b_1', text: 'ok', style: 'color:red', onclick: 'x' },
      { type: 'nao-existe', id: 'b_2', text: 'some' },
      { type: 'callout', id: 'b_1', tone: '#ff00ff', title: 't', text: 'x' },
    ],
    design: { theme: 'pink', signature: 'logo-modificado', margins: 'enorme', css: 'body{}' },
  });
  assert.equal(doc.blocks.length, 2);
  assert.equal(doc.blocks[0].style, 'normal', 'CSS livre vira o estilo padrão do parágrafo');
  assert.ok(!('onclick' in doc.blocks[0]));
  assert.notEqual(doc.blocks[1].id, 'b_1', 'id repetido é trocado');
  assert.notEqual(doc.blocks[1].tone, '#ff00ff');
  assert.equal(doc.design.theme, 'green');
  assert.equal(doc.design.signature, 'joint');
  assert.equal(doc.design.margins, 'regular');
  assert.ok(!('css' in doc.design));
});

test('lote de operações é atômico: um erro não altera nada', async () => {
  const { doc } = await example('manual-coleta-externa.docstudio.json');
  const before = structuredClone(doc);
  const result = applyOperations(doc, [
    { op: 'update', id: doc.blocks[1].id, set: { text: 'Mudou' } },
    { op: 'remove', id: 'b_nao-existe' },
  ]);
  assert.equal(result.ok, false);
  assert.match(result.error, /Operação 2/);
  assert.deepEqual(doc, before);
});

test('alteração pontual por id muda só o alvo (fluxo AI-B)', async () => {
  const { doc } = await example('manual-coleta-externa.docstudio.json');
  const target = doc.blocks.find((b) => b.type === 'paragraph');
  const result = applyOperations(doc, [{ op: 'update', id: target.id, expect: { type: 'paragraph' }, set: { text: 'Texto novo' } }]);
  assert.equal(result.ok, true, result.error);
  const changed = result.doc.blocks.filter((b, i) => JSON.stringify(b) !== JSON.stringify(doc.blocks[i]));
  assert.deepEqual(changed.map((b) => b.id), [target.id]);
  assert.deepEqual(result.doc.design, doc.design);
  const diff = diffDocuments(doc, result.doc);
  assert.equal(diff.changed.length, 1);
});

test('guarda "expect" impede alterar o bloco errado', async () => {
  const { doc } = await example('manual-coleta-externa.docstudio.json');
  const section = doc.blocks.find((b) => b.type === 'section');
  const result = applyOperations(doc, [{ op: 'update', id: section.id, expect: { type: 'paragraph' }, set: { text: 'x' } }]);
  assert.equal(result.ok, false);
});

test('operações recusam cor por código, logo inválido, CSS e HTML (fluxo AI-D)', async () => {
  const { doc } = await example('manual-coleta-externa.docstudio.json');
  const cases = [
    [{ op: 'insert', at: 'end', blocks: [{ type: 'callout', tone: '#123456', title: 'x', text: 'y' }] }, /Cores não são aceitas por código/],
    [{ op: 'setDesign', set: { signature: 'logo-novo' } }, /logo-novo/],
    [{ op: 'setDesign', set: { css: 'body { color: red }' } }, /css/],
    [{ op: 'setDesign', set: { theme: 'rosa' } }, /rosa/],
    [{ op: 'insert', at: 'end', blocks: [{ type: 'html', html: '<b>x</b>' }] }, /html/],
    [{ op: 'update', id: doc.blocks[1].id, set: { style: 'color: red' } }, /style/],
  ];
  for (const [op, message] of cases) {
    const result = applyOperations(doc, [op]);
    assert.equal(result.ok, false, JSON.stringify(op));
    assert.match(result.error, message);
  }
  const fine = applyOperations(doc, [{ op: 'insert', at: 'end', blocks: [{ type: 'callout', intent: 'warning', title: 'x', text: 'y' }] }]);
  assert.equal(fine.ok, true, fine.error);
  assert.equal(fine.doc.blocks.at(-1).tone, 'warning');
});

test('arquivo de operações exige o formato oficial', () => {
  assert.throws(() => parseOperationsPayload('{"operations":[]}'), /format/);
  assert.equal(parseOperationsPayload('[{"op":"setMeta","set":{"title":"x"}}]').operations.length, 1);
});

test('validação explica componente inexistente, imagem ausente, cor por código e versão nova', () => {
  const { ok, issues } = validateDocument({
    blocks: [
      { type: 'warning-box', text: 'x' },
      { type: 'image', assetId: 'img_x' },
      { type: 'callout', tone: '#ff0000', title: 'a', text: 'b' },
    ],
  }, { assetIds: new Set() });
  assert.equal(ok, false);
  const codes = issues.filter((i) => i.level === 'error').map((i) => i.code);
  assert.deepEqual(codes, ['unknown-block-type', 'missing-asset', 'invalid-value']);
  assert.match(issues.find((i) => i.code === 'missing-asset').message, /img_x/);
  assert.throws(() => parseFilePayload(JSON.stringify({ format: 'doc-studio', version: 99, document: { blocks: [] } })));
});

test('exemplos versionados passam na verificação da marca', async () => {
  for (const name of ['manual-coleta-externa.docstudio.json', 'procedimento-vistoria-g003.docstudio.json', 'guia-rapido-estudio.docstudio.json']) {
    const { doc, assets } = await example(name);
    const report = brandReport(doc, assets);
    assert.ok(!report.some((item) => item.level === 'error'), `${name}: ${JSON.stringify(report.filter((i) => i.level === 'error'))}`);
  }
});

test('margens laterais mudam a largura útil e nada mais', () => {
  assert.equal(contentWidthMm('portrait'), 170);
  assert.equal(contentWidthMm('landscape'), 257);
  assert.equal(contentWidthMm('portrait', 'narrow'), 180);
  assert.equal(contentWidthMm('portrait', 'wide'), 160);
  assert.equal(contentWidthMm('portrait', 'inventada'), 170);
  assert.deepEqual(DESIGN_OPTIONS.margins.map((o) => o.value), ['narrow', 'regular', 'wide']);
  assert.equal(normalizeDesign({ margins: 'narrow' }).margins, 'narrow');
});

test('texto livre vira blocos semânticos', () => {
  const blocks = markdownToBlocks('# Requisitos\n\n1. Abra o sistema\n2. Informe o chassi\n\n> [!ATENÇÃO] Confira o CNPJ.\n\n| A | B |\n|---|---|\n| 1 | 2 |');
  const types = blocks.map((b) => b.type);
  for (const type of ['section', 'steps', 'callout', 'table']) assert.ok(types.includes(type), `${type} em ${types}`);
});

test('modelos usam só blocos registrados e categorias declaradas', () => {
  const categories = new Set(TEMPLATE_CATEGORIES.map((c) => c.id));
  for (const template of TEMPLATES) {
    if (template.group !== 'blank') assert.ok(categories.has(template.category), `${template.id} sem categoria válida`);
    for (const block of template.blocks) assert.ok(BLOCK_TYPES[block.type], `${template.id}: ${block.type}`);
    const doc = createDocument({ meta: template.meta, design: template.design, blocks: template.blocks });
    assert.equal(doc.blocks.length, template.blocks.length);
  }
});

test('caminhos de update não alcançam o protótipo nem descem por textos', async () => {
  const { doc } = await example('manual-coleta-externa.docstudio.json');
  const section = doc.blocks.find((b) => b.type === 'section');
  for (const set of [{ '__proto__.icon': 'x' }, { 'constructor.prototype.icon': 'x' }, { 'title.x': '1' }, { 'title.': 'x' }]) {
    const result = applyOperations(doc, [{ op: 'update', id: section.id, set }]);
    assert.equal(result.ok, false, JSON.stringify(set));
    assert.match(result.error, /caminho/);
  }
  assert.equal({}.icon, undefined, 'Object.prototype intacto');
});

test('design ou meta nulos no arquivo voltam ao padrão', () => {
  const doc = normalizeDocument({ blocks: [], design: null, meta: null });
  assert.equal(doc.design.theme, 'green');
  assert.equal(typeof doc.meta.title, 'string');
});

test('URL com aspas ou apóstrofo vira link codificado, sem escape duplo', () => {
  assert.equal(renderInline("[x](https://a.com/it's)"), '<a href="https://a.com/it%27s">x</a>');
  assert.equal(renderInline('[x](https://a.com/?q="a")'), '<a href="https://a.com/?q=%22a%22">x</a>');
  assert.equal(renderInline('++C\\+++'), '<u>C+</u>');
});

test('lote que troca uma imagem existente por outra é recusado', () => {
  const existing = { img_a: { dataUrl: 'data:image/png;base64,AAA' } };
  assert.deepEqual(assetConflicts(existing, { img_a: { dataUrl: 'data:image/png;base64,AAA' } }), []);
  assert.deepEqual(assetConflicts(existing, { img_a: { dataUrl: 'data:image/png;base64,BBB' }, img_b: { dataUrl: 'x' } }), ['img_a']);
});

test('"Desfazer" do aviso só desfaz a ação anunciada', () => {
  const store = createStore(createDocument({ blocks: [{ type: 'paragraph', text: 'a' }, { type: 'paragraph', text: 'b' }] }));
  store.update((doc) => doc.blocks.pop(), { kind: 'structure' });
  const mark = store.historyMark();
  store.update((doc) => { doc.blocks[0].text = 'digitado depois'; }, { kind: 'content' });
  assert.equal(store.undoIfLast(mark), false, 'há uma edição depois da exclusão');
  assert.equal(store.doc.blocks[0].text, 'digitado depois');
  store.undo();
  assert.equal(store.undoIfLast(mark), true);
  assert.equal(store.doc.blocks.length, 2);
  assert.equal(store.undoIfLast(mark), false, 'não desfaz duas vezes');
});

test('operações com nome de método do JavaScript são recusadas', () => {
  const doc = createDocument({ blocks: [{ type: 'paragraph', text: 'a' }] });
  for (const op of ['toString', 'constructor', 'hasOwnProperty', '__proto__']) {
    const result = applyOperations(doc, [{ op }]);
    assert.equal(result.ok, false, op);
    assert.match(result.error, /não existe/);
  }
});

test('validação acusa textos que a normalização cortaria (tabela e textos fixos)', () => {
  const report = validateDocument({
    meta: { description: 'z'.repeat(700) },
    blocks: [{ type: 'table', header: ['x'.repeat(800)], rows: [['y'.repeat(5000)]] }],
  });
  const tooLong = report.issues.filter((issue) => issue.code === 'text-too-long').map((issue) => issue.message);
  assert.equal(tooLong.length, 3, tooLong.join('\n'));
});

test('link com apóstrofo vale na validação, no texto e no diálogo; aspas continuam fora do safeUrl', () => {
  const report = validateDocument({ blocks: [{ type: 'paragraph', text: "[lei](https://pt.wikipedia.org/wiki/Lei_d'Ávila)" }] });
  assert.equal(report.ok, true, JSON.stringify(report.issues));
  assert.equal(linkUrl("https://a.com/it's"), 'https://a.com/it%27s');
  assert.equal(linkUrl("javascript:alert('x')"), '');
  assert.equal(safeUrl("https://a.com/it's"), '');
});

test('texto livre maior que os limites continua em outros blocos, sem perder conteúdo', () => {
  const lines = Array.from({ length: 300 }, (_, i) => `Linha ${i} ${'texto '.repeat(16)}`);
  const paragraphs = markdownToBlocks(lines.join('\n'));
  assert.ok(paragraphs.length >= 2);
  assert.ok(paragraphs.every((block) => block.text.length <= 20000));
  assert.ok(lines.every((line) => paragraphs.some((block) => block.text.includes(line.trim()))));

  const steps = markdownToBlocks(Array.from({ length: 80 }, (_, i) => `${i + 1}. Passo ${i}`).join('\n'));
  assert.deepEqual(steps.map((block) => [block.items.length, block.start]), [[60, 1], [20, 61]]);
  const faq = markdownToBlocks(Array.from({ length: 50 }, (_, i) => `Pergunta ${i}?\nR: resposta ${i}`).join('\n'));
  assert.deepEqual(faq.map((block) => block.items.length), [40, 10]);
  const header = Array.from({ length: 15 }, (_, i) => `C${i}`);
  const [table] = markdownToBlocks(`| ${header.join(' | ')} |\n|${'---|'.repeat(15)}\n| ${header.map((c) => c.toLowerCase()).join(' | ')} |`);
  assert.equal(table.header.length, 12);
  assert.equal(table.header.at(-1), 'C11 · C12 · C13 · C14');
  assert.equal(markdownToBlocks('> [!ATENÇÃO] Confira o CNPJ.')[0].title, 'Confira o CNPJ.');
});

test('quebra de página nova herda a orientação em vigor na posição', () => {
  const blocks = [{ type: 'paragraph' }, { type: 'pagebreak', orientation: 'landscape' }, { type: 'table' }, { type: 'table' }];
  assert.equal(orientationAt(blocks, 1), 'portrait');
  assert.equal(orientationAt(blocks, 3), 'landscape');
  assert.equal(orientationAt(blocks, 99), 'landscape');
});

test('resolução da imagem considera o recorte do formato fixo e da foto da capa', () => {
  const doc = createDocument({ design: { cover: 'photo', coverImage: 'c' }, blocks: [{ type: 'image', assetId: 'i', width: 100, ratio: 'square', fit: 'cover' }] });
  const messages = brandReport(doc, { i: { width: 1280, height: 400 }, c: { width: 1280, height: 720 } })
    .filter((item) => item.rule === 'image-resolution').map((item) => item.message);
  assert.equal(messages.length, 2, messages.join('\n'));
  assert.match(messages[0], /60 ppi/);
  assert.match(messages[1], /Foto da capa: 122 ppi/);
});

test('caracteres fora das fontes do MIV geram aviso; código e texto de tela não', () => {
  const warn = (blocks) => brandReport(createDocument({ blocks })).filter((item) => item.status === 'warning' && item.rule === 'typography');
  assert.equal(warn([{ type: 'paragraph', text: 'Menu ⋯ e alça ⋮ ✓' }]).length, 1);
  assert.match(warn([{ type: 'paragraph', text: 'Menu ⋯' }])[0].message, /⋯/);
  assert.equal(warn([{ type: 'paragraph', text: 'Acentos, “aspas”, travessão — e R$ 10 → ok…' }]).length, 0);
  assert.equal(warn([{ type: 'code', text: 'a ≤ b ⋯' }, { type: 'paragraph', text: 'use `x ≥ 1`' }]).length, 0);
});

test('apresentação: capa e contracapa acompanham o formato', () => {
  assert.equal(normalizeDesign({}).format, 'a4');
  // Capa de tela sem formato informado: a capa decide.
  assert.deepEqual(pick(normalizeDesign({ cover: 'slide-photo' })), { format: 'slides', cover: 'slide-photo', backCover: 'slide-fan' });
  // Formato explícito vence: capas do outro formato voltam ao padrão dele.
  assert.deepEqual(pick(normalizeDesign({ format: 'slides', cover: 'folder', backCover: 'concept' })), { format: 'slides', cover: 'slide-panel', backCover: 'slide-fan' });
  assert.deepEqual(pick(normalizeDesign({ format: 'a4', cover: 'slide-panel' })), { format: 'a4', cover: 'folder', backCover: 'folder' });
  assert.equal(normalizeDesign({ format: 'slides', cover: 'none', backCover: 'none' }).cover, 'none');
  // Painel, menu e operações: trocar o formato ou escolher uma capa de outro formato.
  const a4 = normalizeDesign({ cover: 'identity', backCover: 'vignette' });
  assert.deepEqual(pick(mergeDesign(a4, { format: 'slides' })), { format: 'slides', cover: 'slide-panel', backCover: 'slide-fan' });
  assert.deepEqual(pick(mergeDesign(a4, { cover: 'slide-photo' })), { format: 'slides', cover: 'slide-photo', backCover: 'slide-fan' });
  assert.deepEqual(pick(mergeDesign(mergeDesign(a4, { format: 'slides' }), { format: 'a4' })), { format: 'a4', cover: 'folder', backCover: 'folder' });
  for (const preset of DESIGN_PRESETS) assert.deepEqual(pick(normalizeDesign(preset.design)), pick(preset.design), preset.id);
  assert.equal(contentWidthMm('slide'), 191);
  assert.equal(contentWidthMm('slide', 'narrow'), 191);
});

const pick = ({ format, cover, backCover }) => ({ format, cover, backCover });

test('apresentação: validação explica capa de outro formato e a operação troca o formato junto', () => {
  const issues = validateDocument({ design: { format: 'a4', cover: 'slide-panel' }, blocks: [] }).issues;
  assert.ok(issues.some((i) => i.code === 'format-mismatch' && /slide-panel/.test(i.message) && /folder/.test(i.message)), JSON.stringify(issues));
  const result = applyOperations(createDocument(), [{ op: 'setDesign', set: { cover: 'slide-photo' } }]);
  assert.equal(result.ok, true);
  assert.equal(result.doc.design.format, 'slides');
  const slides = createDocument({ design: { format: 'slides', cover: 'slide-photo' }, blocks: [{ type: 'paragraph', text: 'Sem título' }, { type: 'section', title: 'A' }] });
  assert.ok(brandReport(slides).some((i) => i.rule === 'layout' && i.status === 'error' && /sem foto/.test(i.message)));
  assert.ok(brandReport(slides).some((i) => i.rule === 'slides-pattern' && i.status === 'ok'));
  assert.ok(contentAdvice(slides).some((i) => i.code === 'slide-without-title'));
});

test('apresentação: cada seção abre uma tela e traz o título repetido para a continuação', () => {
  const doc = createDocument({ design: { format: 'slides' }, blocks: [{ type: 'section', title: 'Resultados **2026**', intro: 'Subtítulo' }] });
  const [atom] = renderBlock(doc.blocks[0], createRenderContext(doc, {}));
  assert.equal(atom.breakBefore, true);
  assert.match(atom.html, /b-slide-title__title/);
  assert.match(atom.html, /b-slide-title__sub/);
  assert.match(atom.lead, /atom--continued/);
  assert.match(atom.lead, /<strong>2026<\/strong> <span class="b-slide-title__cont">\(continuação\)<\/span>/);
  // Na folha A4 a seção continua como antes (sem quebra forçada nem título repetido).
  const a4 = createDocument({ blocks: [{ type: 'section', title: 'A' }] });
  const [plain] = renderBlock(a4.blocks[0], createRenderContext(a4, {}));
  assert.ok(!plain.breakBefore && !plain.lead);
});

test('imagem com texto ao lado: coluna entre 30% e 70% e resolução na largura da coluna', () => {
  const blocks = [{ type: 'image', assetId: 'i', width: 100, sideTitle: 'Título', sideText: 'Texto' }];
  const doc = createDocument({ blocks });
  const [atom] = renderBlock(doc.blocks[0], createRenderContext(doc, { i: { url: 'blob:x', width: 1000, height: 750 } }));
  assert.match(atom.html, /b-fig-side--left/);
  assert.match(atom.html, /--fig-w:50%/);
  assert.match(atom.html, /data-edit="sideText"/);
  // 1000 px em 50% de 170 mm (85 mm) = 299 ppi; sem o texto ao lado seriam 170 mm = 149 ppi.
  const ppi = (b) => brandReport(createDocument({ blocks: b }), { i: { width: 1000, height: 750 } }).filter((item) => item.rule === 'image-resolution' && item.status === 'warning');
  assert.equal(ppi(blocks).length, 0);
  assert.equal(ppi([{ ...blocks[0], sideTitle: '', sideText: '' }]).length, 1);
});
