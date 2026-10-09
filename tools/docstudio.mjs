#!/usr/bin/env node
/**
 * docstudio — ferramenta de linha de comando do Estúdio de Documentos para
 * agentes de IA (Claude Code, Codex...) e automação local. Sem dependências:
 * Node 22.4+ e, para PDF/PNG, um Chrome ou Chromium instalado.
 *
 * Usa os mesmos módulos do app (js/schema.js, js/model.js, js/validate.js,
 * js/operations.js...), então criar, validar e alterar por aqui produz
 * exatamente o que o editor produziria. Rode `node tools/docstudio.mjs help`.
 */
import { readFile, writeFile, mkdir } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createDocument, normalizeDocument, toFilePayload } from '../js/model.js';
import { BLOCK_TYPES, blockSummary } from '../js/schema.js';
import { THEMES, DESIGN_PRESETS, contentWidthMm, isSlides, coverUsesPhoto } from '../js/design.js';
import { TEMPLATES } from '../js/templates.js';
import { validateDocument, brandReport, contentAdvice, effectivePpi, maxImageWidth } from '../js/validate.js';
import { applyOperations, diffDocuments, parseOperationsPayload, assetConflicts, assetConflictMessage } from '../js/operations.js';
import { buildCatalog, COMPONENT_GUIDE } from '../js/catalog.js';
import { GRAPHIC_PALETTE, SIGNATURE_COLORS, DERIVED_COLORS, TYPOGRAPHY, contrastRatio } from '../js/brand.js';
import { TONE_OPTIONS } from '../js/schema.js';
import { loadDocumentFile, readText, resolveAssets, writeJson, assetDimensions } from './lib/files.mjs';
import { startServer, launchChrome, waitFor, DOC_ROUTE } from './lib/chrome.mjs';
import { generatedFiles } from './lib/generate.mjs';
import { commonGlyphRanges } from './lib/fonts.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

const HELP = `docstudio — Estúdio de Documentos para agentes e automação

Uso: node tools/docstudio.mjs <comando> [opções]

  catalog [--json]                     Componentes, intenções, opções de design, modelos e operações.
  new <saida.json> [--template id] [--name "Nome"] [--preset id]
                                       Cria um documento (padrão: em branco) a partir de um modelo.
  build <fonte.json> [-o saida.docstudio.json]
                                       Monta o arquivo final: imagens { "src": "caminho" } viram dados,
                                       ids são atribuídos e tudo é validado.
  validate <arquivo> [--json]          Estrutura + marca (MIV) + recomendações. Sai com código 1 se houver erro.
  inspect <arquivo> [--json]           Lista os blocos com id, tipo e resumo (para mirar alterações).
  apply <arquivo> <alteracoes.ops.json> [-o saida] [--dry-run]
                                       Aplica um lote de operações (atômico) e mostra o que mudou.
  render <arquivo> [--pdf saida.pdf] [--png pasta] [--report saida.json] [--scale 2]
                                       Pagina no próprio app (Chrome sem interface), gera PDF e/ou PNG
                                       de cada página e um relatório (blocos por página, ocupação, estouros).
  serve [arquivo] [--port 8080]        Servidor local do app; com arquivo, imprime o link que o abre no editor.
  generate [--check]                   Regera schemas/ e docs/ai/COMPONENT_CATALOG.md (--check só confere).
  check                                Confere a consistência do projeto (tokens CSS × temas, catálogo, gerados).

Documentação: docs/ai/AI_GUIDE.md`;

/* ------------------------------------------------------------------ argumentos */
function parseArgs(argv) {
  const positional = [];
  const options = {};
  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    if (arg === '-o') options.out = argv[++i];
    else if (arg.startsWith('--')) {
      const [key, inline] = arg.slice(2).split('=');
      const next = argv[i + 1];
      if (inline != null) options[key] = inline;
      else if (next != null && !next.startsWith('-') && !['json', 'check', 'dry-run'].includes(key)) { options[key] = next; i += 1; }
      else options[key] = true;
    } else positional.push(arg);
  }
  return { positional, options };
}

class UsageError extends Error {}
const need = (value, message) => { if (!value) throw new UsageError(message); return value; };

/* ------------------------------------------------------------------ saída */
const MARK = { error: '✖', warning: '⚠', info: '•', ok: '✓' };

function printIssues(title, items, levelOf = (i) => i.level) {
  if (!items.length) return;
  console.log(`\n${title}`);
  for (const item of items) console.log(`  ${MARK[levelOf(item)] ?? '•'} ${item.message}${item.blockId ? `  [${item.blockId}]` : ''}`);
}

/** Validação completa de um documento + imagens: { structure, brand, advice, doc, errors }. */
function fullCheck(rawDocument, assets) {
  const structure = validateDocument(rawDocument, { assetIds: new Set(Object.keys(assets)) }).issues;
  const doc = normalizeDocument(rawDocument);
  const brand = brandReport(doc, assetDimensions(assets));
  const advice = contentAdvice(doc);
  const errors = structure.filter((i) => i.level === 'error').length + brand.filter((b) => b.status === 'error').length;
  return { structure, brand, advice, doc, errors };
}

function printCheck({ structure, brand, advice }) {
  printIssues('Estrutura', structure);
  printIssues('Identidade visual (MIV)', brand, (b) => b.status);
  printIssues('Recomendações', advice);
}

/* ------------------------------------------------------------------ comandos */
const commands = {
  help() {
    console.log(HELP);
  },

  catalog({ options }) {
    const catalog = buildCatalog();
    if (options.json) {
      console.log(JSON.stringify(catalog, null, 2));
      return;
    }
    console.log('Componentes (type):');
    for (const c of catalog.components) console.log(`  ${c.type.padEnd(10)} ${c.label} — ${c.use}`);
    console.log('\nIntenções (intent):');
    for (const i of catalog.intents) console.log(`  ${i.id.padEnd(22)} ${i.description} → ${i.becomes.type}`);
    console.log(`\nCapas: ${catalog.design.covers.map((c) => c.id).join(', ')}`);
    console.log(`Contracapas: ${catalog.design.backCovers.map((c) => c.id).join(', ')}`);
    console.log(`Cabeçalhos: ${catalog.design.header.map((c) => c.id).join(', ')} · Rodapés: ${catalog.design.footer.map((c) => c.id).join(', ')}`);
    console.log(`Temas: ${catalog.design.themes.map((t) => t.id).join(', ')} · Assinaturas: ${catalog.design.signature.map((s) => s.id).join(', ')}`);
    console.log(`Estilos prontos: ${catalog.presets.map((p) => p.id).join(', ')}`);
    console.log(`Modelos: ${catalog.templates.map((t) => t.id).join(', ')}`);
    console.log(`Operações: ${Object.keys(catalog.operations.list).join(', ')}`);
    console.log('\nDetalhes: docs/ai/COMPONENT_CATALOG.md ou --json');
  },

  async new({ positional, options }) {
    const out = need(positional[0], 'Informe o arquivo de saída: new <saida.json> [--template id]');
    const template = TEMPLATES.find((t) => t.id === (options.template ?? 'blank'));
    if (!template) throw new UsageError(`Modelo “${options.template}” não existe. Use: ${TEMPLATES.map((t) => t.id).join(', ')}.`);
    const preset = options.preset ? DESIGN_PRESETS.find((p) => p.id === options.preset) : null;
    if (options.preset && !preset) throw new UsageError(`Estilo pronto “${options.preset}” não existe. Use: ${DESIGN_PRESETS.map((p) => p.id).join(', ')}.`);
    const doc = createDocument({
      name: typeof options.name === 'string' ? options.name : template.group === 'blank' ? 'Documento sem título' : template.name,
      meta: template.meta,
      design: { ...template.design, ...preset?.design },
      blocks: template.blocks,
    });
    await writeJson(out, toFilePayload(doc, {}));
    console.log(`Criado ${out} (${template.name}, ${doc.blocks.length} blocos).`);
  },

  async build({ positional, options }) {
    const source = need(positional[0], 'Informe o arquivo-fonte: build <fonte.json> [-o saida.docstudio.json]');
    const out = options.out ?? source.replace(/(\.source)?\.json$/i, '.docstudio.json');
    if (path.resolve(out) === path.resolve(source)) throw new UsageError('Use -o para não sobrescrever o arquivo-fonte.');
    const { document, assets } = await loadDocumentFile(source);
    const check = fullCheck(document, assets);
    printCheck(check);
    if (check.errors) {
      console.error(`\n✖ ${check.errors} erro(s): nada foi gravado. Corrija o arquivo-fonte e rode de novo.`);
      process.exitCode = 1;
      return;
    }
    await writeJson(out, toFilePayload(check.doc, assets));
    console.log(`\n✓ ${out}: ${check.doc.blocks.length} blocos, ${Object.keys(assets).length} imagem(ns).`);
  },

  async validate({ positional, options }) {
    const file = need(positional[0], 'Informe o arquivo: validate <arquivo>');
    const { document, assets } = await loadDocumentFile(file);
    const check = fullCheck(document, assets);
    if (options.json) console.log(JSON.stringify({ errors: check.errors, structure: check.structure, brand: check.brand, advice: check.advice }, null, 2));
    else {
      printCheck(check);
      console.log(check.errors ? `\n✖ ${check.errors} erro(s).` : '\n✓ Documento válido.');
    }
    if (check.errors) process.exitCode = 1;
  },

  async inspect({ positional, options }) {
    const file = need(positional[0], 'Informe o arquivo: inspect <arquivo>');
    const { document, assets } = await loadDocumentFile(file);
    const doc = normalizeDocument(document);
    const dims = assetDimensions(assets);
    // Imagens: tamanho do arquivo, resolução impressa e a maior largura que mantém 150 ppi.
    const imageInfo = (block) => {
      const asset = dims[block.assetId];
      if (block.type !== 'image' || !asset) return '';
      if (asset.svg) return ' [SVG vetorial]';
      const orientation = isSlides(doc.design) ? 'slide' : 'portrait';
      return ` [${asset.width} px · ${effectivePpi(asset.width, (contentWidthMm(orientation, doc.design.margins) * block.width) / 100)} ppi a ${block.width}% · máx. ${maxImageWidth(asset.width, orientation, doc.design.margins)}%]`;
    };
    const rows = doc.blocks.map((block, index) => ({ index, id: block.id, type: block.type, label: BLOCK_TYPES[block.type].label, summary: blockSummary(block), image: imageInfo(block) }));
    if (options.json) {
      console.log(JSON.stringify({ id: doc.id, name: doc.name, design: doc.design, meta: doc.meta, assets: Object.keys(assets), blocks: rows }, null, 2));
      return;
    }
    console.log(`${doc.name}  (id ${doc.id})`);
    console.log(`Design: ${Object.entries(doc.design).filter(([, v]) => v !== '').map(([k, v]) => `${k}=${v}`).join(' ')}`);
    console.log(`Imagens: ${Object.keys(assets).join(', ') || 'nenhuma'}\n`);
    let section = 0;
    for (const row of rows) {
      if (row.type === 'section') section += 1;
      const indent = row.type === 'section' ? '' : '   ';
      console.log(`${String(row.index + 1).padStart(3)} ${indent}${row.id.padEnd(18)} ${row.type.padEnd(10)} ${row.type === 'section' ? `${String(section).padStart(2, '0')} ` : ''}${row.summary.slice(0, 80)}${row.image}`);
    }
  },

  async apply({ positional, options }) {
    const file = need(positional[0], 'Uso: apply <arquivo> <alteracoes.ops.json> [-o saida]');
    const opsFile = need(positional[1], 'Uso: apply <arquivo> <alteracoes.ops.json> [-o saida]');
    const { document, assets } = await loadDocumentFile(file);
    const payload = parseOperationsPayload(await readText(opsFile));
    const incoming = await resolveAssets(payload.assets, path.dirname(path.resolve(opsFile)));
    const conflicts = assetConflicts(assets, incoming);
    if (conflicts.length) {
      console.error(`✖ ${assetConflictMessage(conflicts)}`);
      process.exitCode = 1;
      return;
    }
    const allAssets = { ...assets, ...incoming };
    const before = normalizeDocument(document);
    if (payload.documentId && payload.documentId !== before.id) console.warn(`⚠ As alterações foram preparadas para o documento ${payload.documentId}; este é ${before.id}.`);
    const result = applyOperations(before, payload.operations, { assetIds: new Set(Object.keys(allAssets)) });
    if (!result.ok) {
      console.error(`✖ ${result.error}`);
      process.exitCode = 1;
      return;
    }
    if (payload.description) console.log(payload.description);
    result.changes.forEach((change) => console.log(`  • ${change}`));
    result.warnings.forEach((warning) => console.log(`  ⚠ ${warning}`));
    const diff = diffDocuments(before, result.doc);
    console.log(`\nResumo: ${diff.added.length} novo(s), ${diff.removed.length} excluído(s), ${diff.changed.length} alterado(s), ${diff.moved.length} movido(s)${diff.design.length ? `, aparência: ${diff.design.join(', ')}` : ''}${diff.meta.length ? `, textos fixos: ${diff.meta.join(', ')}` : ''}.`);
    const check = fullCheck(result.doc, allAssets);
    printCheck(check);
    if (options['dry-run']) {
      console.log('\n(--dry-run: nada foi gravado)');
      return;
    }
    if (check.errors) {
      console.error(`\n✖ ${check.errors} erro(s) depois das alterações: nada foi gravado.`);
      process.exitCode = 1;
      return;
    }
    const out = options.out ?? file;
    const used = new Set(JSON.stringify(result.doc).match(/"(?:assetId|customLogo|coverImage)":"([\w-]+)"/g)?.map((m) => m.split(':')[1].replaceAll('"', '')) ?? []);
    const keptAssets = Object.fromEntries(Object.entries(allAssets).filter(([id]) => used.has(id)));
    await writeJson(out, toFilePayload(result.doc, keptAssets));
    console.log(`\n✓ Gravado ${out}.`);
  },

  async render({ positional, options }) {
    const file = need(positional[0], 'Uso: render <arquivo> [--pdf saida.pdf] [--png pasta] [--report saida.json]');
    if (!options.pdf && !options.png && !options.report) options.report = true;
    const { document, assets } = await loadDocumentFile(file);
    const check = fullCheck(document, assets);
    if (check.errors) {
      printCheck(check);
      console.error(`\n✖ ${check.errors} erro(s): corrija antes de renderizar.`);
      process.exitCode = 1;
      return;
    }
    const documentText = JSON.stringify(toFilePayload(check.doc, assets));
    const { server, port } = await startServer(ROOT, { documentText });
    const chrome = await launchChrome();
    try {
      await chrome.page('Emulation.setDeviceMetricsOverride', { width: 1280, height: 1600, deviceScaleFactor: 1, mobile: false });
      await chrome.page('Page.navigate', { url: `http://127.0.0.1:${port}/index.html?render=${DOC_ROUTE}` });
      const state = await waitFor(chrome, `document.documentElement.dataset.renderState`);
      if (state !== 'ready') throw new Error(`O app não conseguiu abrir o documento: ${await chrome.evaluate('document.documentElement.dataset.renderError')}`);
      const report = await chrome.evaluate('window.docStudio.report()');
      const appCheck = await chrome.evaluate('window.docStudio.check()');

      console.log(`${report.name}: ${report.pageCount} página(s)`);
      for (const page of report.pages) {
        const fill = page.fill == null ? '' : ` ${String(Math.round(page.fill * 100)).padStart(3)}% ocupada`;
        const contentPages = report.pages.filter((p) => p.kind === 'content').length;
        const flag = page.overflowing ? '  ✖ ESTOURA'
          : page.fill > 1.005 ? '  ⚠ passa da área útil'
            // Telas de apresentação costumam ter pouco texto: "quase vazia" só vale para a folha.
            : page.kind === 'content' && contentPages > 1 && page.fill != null && page.fill < 0.2 && page.orientation !== 'slide' ? '  ⚠ quase vazia'
              : page.words > (page.orientation === 'slide' ? 90 : 700) ? '  ⚠ densa' : '';
        console.log(`  p. ${String(page.number).padStart(2)} ${page.kind.padEnd(7)} ${{ landscape: 'paisagem', slide: 'tela 16:9' }[page.orientation] ?? 'retrato '}${fill} ${String(page.words).padStart(4)} palavras${flag}  ${page.blocks.join(' ')}`);
      }
      const layoutIssues = appCheck.issues.filter((i) => /Página \d+|passa do tamanho/.test(i.message));
      printIssues('Paginação', layoutIssues);

      if (options.pdf) {
        const out = typeof options.pdf === 'string' ? options.pdf : file.replace(/(\.docstudio)?\.json$/i, '.pdf');
        const { data } = await chrome.page('Page.printToPDF', { printBackground: true, preferCSSPageSize: true, generateTaggedPDF: true, generateDocumentOutline: true });
        const pdf = Buffer.from(data, 'base64');
        await mkdir(path.dirname(path.resolve(out)), { recursive: true });
        await writeFile(out, pdf);
        const text = pdf.toString('latin1');
        const pdfPages = (text.match(/\/Type\s*\/Page\b(?!s)/g) ?? []).length;
        const rasters = (text.match(/\/Subtype\s*\/Image/g) ?? []).length;
        const userImages = check.doc.blocks.filter((b) => b.type === 'image' && b.assetId && !assetDimensions(assets)[b.assetId]?.svg).length + (coverUsesPhoto(check.doc.design.cover) && check.doc.design.coverImage ? 1 : 0);
        console.log(`\nPDF: ${out} (${(pdf.length / 1024).toFixed(0)} KB, ${pdfPages || '?'} página(s)${pdfPages && pdfPages !== report.pageCount ? ` ✖ a prévia tem ${report.pageCount}` : ''}, ${rasters} imagem(ns) rasterizada(s) para ${userImages} foto(s)/print(s) do documento${rasters > userImages ? ' ⚠ confira com pdfimages -list' : ''}).`);
        // Fontes embutidas fora do MIV (e da monoespaçada do código): sinal de caractere que Kanit e Maitree não têm.
        const fonts = new Set([...text.matchAll(/\/FontName\s*\/(?:[A-Z]{6}\+)?([\w-]+)/g)].map((match) => match[1]));
        const foreign = [...fonts].filter((font) => !/^(Kanit|Maitree|DejaVuSansMono)/.test(font));
        console.log(`Fontes no PDF: ${[...fonts].sort().join(', ') || '—'}${foreign.length ? `  ⚠ fora do MIV: ${foreign.join(', ')} (caracteres que Kanit e Maitree não têm; veja a verificação da marca)` : ''}.`);
      }

      if (options.png) {
        const dir = typeof options.png === 'string' ? options.png : `${file.replace(/(\.docstudio)?\.json$/i, '')}-paginas`;
        const scale = Number(options.scale) || 2;
        await mkdir(dir, { recursive: true });
        await chrome.page('Emulation.setEmulatedMedia', { media: 'print' });
        await chrome.page('Emulation.setDeviceMetricsOverride', { width: 1200, height: 1600, deviceScaleFactor: scale, mobile: false });
        await new Promise((resolve) => setTimeout(resolve, 300));
        const rects = await chrome.evaluate(`[...document.querySelectorAll('#pages > .page')].map((p) => { const r = p.getBoundingClientRect(); const top = Math.ceil(r.top + scrollY); return { x: Math.ceil(r.left + scrollX), y: top, width: Math.floor(r.width), height: Math.floor(r.bottom + scrollY - top) }; })`);
        for (const [index, clip] of rects.entries()) {
          const { data } = await chrome.page('Page.captureScreenshot', { format: 'png', clip: { ...clip, scale: 1 }, captureBeyondViewport: true });
          await writeFile(path.join(dir, `pagina-${String(index + 1).padStart(2, '0')}.png`), Buffer.from(data, 'base64'));
        }
        console.log(`PNG: ${rects.length} página(s) em ${dir}/ (escala ${scale}×).`);
      }

      const consoleErrors = chrome.consoleMessages.filter((m) => m.level === 'error');
      if (chrome.consoleMessages.length) printIssues('Console do navegador', chrome.consoleMessages.map((m) => ({ level: m.level === 'error' ? 'error' : 'warning', message: m.text })));
      if (options.report) {
        const out = typeof options.report === 'string' ? options.report : null;
        const data = { ...report, check: appCheck, console: chrome.consoleMessages };
        if (out) {
          await writeJson(out, data);
          console.log(`Relatório: ${out}`);
        }
      }
      if (consoleErrors.length || report.overflowBlocks.length) process.exitCode = 1;
    } finally {
      await chrome.close();
      server.close();
    }
  },

  async serve({ positional, options }) {
    const file = positional[0];
    let documentText = null;
    if (file) {
      const { document, assets } = await loadDocumentFile(file);
      documentText = JSON.stringify(toFilePayload(normalizeDocument(document), assets));
    }
    const { port } = await startServer(ROOT, { documentText, port: Number(options.port) || 8080 });
    console.log(`Estúdio em http://127.0.0.1:${port}/`);
    if (file) console.log(`Abrir ${file} no editor: http://127.0.0.1:${port}/?open=${DOC_ROUTE}`);
    console.log('Ctrl+C para encerrar.');
  },

  async generate({ options }) {
    const stale = [];
    for (const [relative, content] of Object.entries(generatedFiles())) {
      const target = path.join(ROOT, relative);
      const current = await readFile(target, 'utf8').catch(() => null);
      if (current === content) continue;
      stale.push(relative);
      if (!options.check) {
        await mkdir(path.dirname(target), { recursive: true });
        await writeFile(target, content, 'utf8');
      }
    }
    if (options.check) {
      if (stale.length) {
        console.error(`✖ Desatualizados (rode \`node tools/docstudio.mjs generate\`): ${stale.join(', ')}`);
        process.exitCode = 1;
      } else console.log('✓ Arquivos gerados em dia.');
    } else console.log(stale.length ? `✓ Atualizados: ${stale.join(', ')}` : '✓ Nada mudou.');
  },

  async check() {
    const problems = [];
    // 1. Cada tema existe no CSS do documento com as mesmas cores.
    const css = await readFile(path.join(ROOT, 'css/document.css'), 'utf8');
    for (const theme of THEMES) {
      const block = theme.id === 'green'
        ? /\.doc \{([\s\S]*?)\n\}/.exec(css)?.[1]
        : new RegExp(`\\.doc\\[data-doc-theme="${theme.id}"\\] \\{([\\s\\S]*?)\\}`).exec(css)?.[1];
      if (!block) { problems.push(`Tema “${theme.id}” não tem cores em css/document.css.`); continue; }
      const value = (name) => new RegExp(`--doc-${name}:\\s*(#[0-9a-f]{6})`, 'i').exec(block)?.[1]?.toLowerCase();
      const [primary, strong, accent] = theme.colors;
      if (value('primary') !== primary) problems.push(`Tema “${theme.id}”: --doc-primary no CSS é ${value('primary')}, em js/design.js é ${primary}.`);
      if (value('primary-strong') !== strong) problems.push(`Tema “${theme.id}”: --doc-primary-strong no CSS é ${value('primary-strong')}, em js/design.js é ${strong}.`);
      if (value('accent') !== accent) problems.push(`Tema “${theme.id}”: --doc-accent no CSS é ${value('accent')}, em js/design.js é ${accent}.`);
      if (contrastRatio(strong, '#ffffff') < 4.5) problems.push(`Tema “${theme.id}”: ${strong} tem contraste abaixo de 4,5:1.`);
    }
    // 2. Amostras de cor dos blocos são cores oficiais ou derivadas documentadas.
    const allowed = new Set([...GRAPHIC_PALETTE, ...SIGNATURE_COLORS, ...DERIVED_COLORS].map((c) => c.hex));
    for (const tone of TONE_OPTIONS) {
      if (tone.swatch.startsWith('#') && !allowed.has(tone.swatch)) problems.push(`Tom “${tone.value}” usa ${tone.swatch}, fora da paleta do MIV (js/brand.js).`);
    }
    for (const theme of THEMES) if (!allowed.has(theme.colors[0])) problems.push(`Tema “${theme.id}”: ${theme.colors[0]} fora da paleta do MIV (js/brand.js).`);
    // 3. Todo tipo de bloco tem orientação para agentes e um renderizador.
    const render = await readFile(path.join(ROOT, 'js/render.js'), 'utf8');
    for (const type of Object.keys(BLOCK_TYPES)) {
      if (!COMPONENT_GUIDE[type]) problems.push(`Bloco “${type}” sem entrada em COMPONENT_GUIDE (js/catalog.js).`);
      if (!new RegExp(`\\n  ${type}\\(block`).test(render)) problems.push(`Bloco “${type}” sem renderizador em js/render.js.`);
    }
    // 4. Arquivos gerados em dia.
    for (const [relative, content] of Object.entries(generatedFiles())) {
      if ((await readFile(path.join(ROOT, relative), 'utf8').catch(() => null)) !== content) problems.push(`${relative} desatualizado: rode \`node tools/docstudio.mjs generate\`.`);
    }
    // 5. Caracteres das fontes conferem com TYPOGRAPHY.glyphRanges (js/brand.js).
    const fontDir = path.join(ROOT, 'assets/fonts');
    const { readdirSync: listFonts } = await import('node:fs');
    const fontFiles = listFonts(fontDir).filter((f) => f.endsWith('.woff')).map((f) => path.join(fontDir, f));
    const ranges = await commonGlyphRanges(fontFiles);
    if (JSON.stringify(ranges) !== JSON.stringify(TYPOGRAPHY.glyphRanges)) problems.push(`TYPOGRAPHY.glyphRanges (js/brand.js) não confere com as fontes: ${JSON.stringify(ranges.map(([a, b]) => [a.toString(16), b.toString(16)]))}.`);
    // 6. Exemplos continuam válidos.
    const { existsSync, readdirSync } = await import('node:fs');
    const examplesDir = path.join(ROOT, 'examples');
    const examples = existsSync(examplesDir) ? readdirSync(examplesDir).filter((f) => f.endsWith('.json') && !f.endsWith('.ops.json')) : [];
    for (const example of examples) {
      const { document, assets } = await loadDocumentFile(path.join(examplesDir, example));
      const result = fullCheck(document, assets);
      if (result.errors) problems.push(`examples/${example}: ${result.errors} erro(s) de validação.`);
    }
    if (problems.length) {
      problems.forEach((p) => console.error(`✖ ${p}`));
      process.exitCode = 1;
    } else console.log(`✓ Projeto consistente: ${THEMES.length} temas no CSS, ${TONE_OPTIONS.length} tons, ${Object.keys(BLOCK_TYPES).length} blocos com guia e renderizador, gerados em dia, ${examples.length} exemplo(s) válido(s).`);
  },
};

const [name = 'help', ...rest] = process.argv.slice(2);
const command = commands[name] ?? commands[{ '-h': 'help', '--help': 'help' }[name]];
if (!command) {
  console.error(`Comando “${name}” não existe.\n\n${HELP}`);
  process.exit(2);
}
try {
  await command(parseArgs(rest));
} catch (error) {
  console.error(error instanceof UsageError ? error.message : `✖ ${error.message}`);
  process.exitCode = error instanceof UsageError ? 2 : 1;
}
