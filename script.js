/**
 * Ponto de entrada (raiz de composição).
 *
 * Cria o estado, o armazenamento e os módulos de interface, e define as
 * "ações" do aplicativo: as operações de alto nível (inserir, mover, abrir
 * documento, exportar...) que os módulos chamam sem depender uns dos outros.
 */
import { $, $$, esc, clamp, debounce, moveItem, slugify, announce, isTypingTarget, downloadBlob, formatTime, formatDateTime } from './js/utils.js';
import { createStore, createUiState } from './js/state.js';
import { createBlock, BLOCK_TYPES } from './js/schema.js';
import { createDocument, normalizeDocument, toFilePayload, parseFilePayload, cloneBlock } from './js/model.js';
import { TEMPLATES, SNIPPETS } from './js/templates.js';
import { createStorage, preferences } from './js/storage.js';
import { createAssetRegistry, fileToAsset, isAcceptedImage, usedAssetIds } from './js/images.js';
import { createDragController, resolveListDrop, resolvePreviewDrop } from './js/dnd.js';
import { createEditor } from './js/editor.js';
import { createPreview } from './js/preview.js';
import { createPanels } from './js/panels.js';
import { createBlockPicker } from './js/picker.js';
import { toast, openDialog, enableBackdropClose, confirmDialog, setupMenu } from './js/dialogs.js';
import { markdownToBlocks } from './js/markdown.js';
import { layoutDocument } from './js/paginate.js';
import { renderCover, renderBackCover } from './js/render.js';
import { applyDocAttributes, docAttributesHtml } from './js/design.js';

const appEl = $('#app');
const isCompact = () => !matchMedia('(min-width: 760px)').matches;
const isOverlayPanel = () => matchMedia('(min-width: 760px) and (max-width: 1179.98px)').matches;

/** Espera as fontes principais: a paginação depende das medidas reais do texto. */
async function waitForFonts() {
  if (!document.fonts?.load) return;
  const faces = ['300 12px Kanit', '400 12px Kanit', '500 12px Kanit', '600 12px Kanit', '700 12px Kanit', '400 12px Maitree', '700 12px Maitree'];
  const timeout = new Promise((resolve) => setTimeout(resolve, 3000));
  await Promise.race([Promise.all(faces.map((face) => document.fonts.load(face))), timeout]);
}

function documentFromTemplate(template) {
  return createDocument({
    name: template.id === 'blank' ? 'Documento sem título' : template.name,
    meta: template.meta,
    design: template.design,
    blocks: template.blocks,
  });
}

async function loadInitialDocument(storage, assets) {
  const fromHash = new URLSearchParams(location.hash.slice(1)).get('doc');
  const candidates = [fromHash, preferences.get('last-doc')].filter(Boolean);
  for (const id of candidates) {
    const record = await storage.load(id).catch(() => null);
    if (record) {
      assets.load(record.assets);
      return { doc: normalizeDocument(record.doc), firstRun: false };
    }
  }
  const saved = await storage.list().catch(() => []);
  if (saved.length) {
    saved.sort((a, b) => b.updatedAt - a.updatedAt);
    const record = await storage.load(saved[0].id).catch(() => null);
    if (record) {
      assets.load(record.assets);
      return { doc: normalizeDocument(record.doc), firstRun: false };
    }
  }
  return { doc: documentFromTemplate(TEMPLATES[0]), firstRun: true };
}

async function main() {
  await waitForFonts();
  const storage = await createStorage();
  const assets = createAssetRegistry();
  const { doc: initialDoc, firstRun } = await loadInitialDocument(storage, assets);

  const store = createStore(initialDoc);
  const ui = createUiState({
    selectedId: null,
    selectSource: null,
    collapsed: new Set(),
    overflowBlocks: new Set(),
    pageCount: 0,
    pane: 'editor',
    view: preferences.get('view', 'split'),
    panelOpen: matchMedia('(min-width: 1180px)').matches ? preferences.get('panel-open', true) : false,
    tab: preferences.get('tab', 'insert'),
    zoom: 1,
    zoomFit: true,
  });

  let editor;
  let preview;
  let picker;
  let pendingImageTarget = null;
  const imageInput = $('#image-file-input');

  /* ================================================================ ações */
  const notify = (message, tone = 'info', { undo = false } = {}) => toast(message, {
    tone,
    actionLabel: undo ? 'Desfazer' : undefined,
    onAction: undo ? () => store.undo() : undefined,
  });

  const actions = {
    notify,
    announce,
    indexOf: (id) => store.doc.blocks.findIndex((block) => block.id === id),

    insertionIndex() {
      const index = actions.indexOf(ui.get('selectedId'));
      return index >= 0 ? index + 1 : store.doc.blocks.length;
    },

    insertBlocks(blocks, index = actions.insertionIndex(), { focus = true } = {}) {
      if (!blocks.length) return;
      store.update((doc) => doc.blocks.splice(clamp(index, 0, doc.blocks.length), 0, ...blocks), { kind: 'structure' });
      ui.set({ selectedId: blocks[0].id, selectSource: 'insert' });
      if (isCompact()) ui.set({ pane: 'editor' });
      requestAnimationFrame(() => editor.reveal(blocks[0].id, { focus }));
      announce(blocks.length === 1 ? `${BLOCK_TYPES[blocks[0].type].label} inserido.` : `${blocks.length} blocos inseridos.`);
    },

    insertType(type, index) {
      const block = createBlock(type);
      actions.insertBlocks([block], index);
      if (type === 'image') actions.chooseImage({ blockId: block.id });
    },

    insertSnippet(id, index) {
      const snippet = SNIPPETS.find((s) => s.id === id);
      if (snippet) actions.insertBlocks(snippet.blocks.map(({ type, ...props }) => createBlock(type, structuredClone(props))), index);
    },

    /** Comando "/": troca um parágrafo vazio por outro tipo de bloco. */
    convertBlock(id, type) {
      const index = actions.indexOf(id);
      if (index < 0) return;
      const block = createBlock(type);
      store.update((doc) => doc.blocks.splice(index, 1, block), { kind: 'structure' });
      ui.set({ selectedId: block.id, selectSource: 'insert' });
      requestAnimationFrame(() => editor.reveal(block.id, { focus: true }));
      if (type === 'image') actions.chooseImage({ blockId: block.id });
    },

    moveBlock(id, insertionIndex) {
      const from = actions.indexOf(id);
      if (from < 0) return;
      const to = insertionIndex > from ? insertionIndex - 1 : insertionIndex;
      if (to === from) return;
      store.update((doc) => moveItem(doc.blocks, from, to), { kind: 'structure' });
      ui.set({ selectedId: id, selectSource: 'move' });
      announce(`Bloco movido para a posição ${to + 1} de ${store.doc.blocks.length}.`);
    },

    moveBlockBy(id, delta) {
      const from = actions.indexOf(id);
      const to = from + delta;
      if (from < 0 || to < 0 || to >= store.doc.blocks.length) return;
      store.update((doc) => moveItem(doc.blocks, from, to), { kind: 'structure' });
      announce(`Bloco movido para a posição ${to + 1} de ${store.doc.blocks.length}.`);
    },

    duplicateBlock(id) {
      const index = actions.indexOf(id);
      if (index < 0) return;
      actions.insertBlocks([cloneBlock(store.doc.blocks[index])], index + 1, { focus: false });
    },

    removeBlock(id) {
      const index = actions.indexOf(id);
      if (index < 0) return;
      const label = BLOCK_TYPES[store.doc.blocks[index].type].label;
      store.update((doc) => doc.blocks.splice(index, 1), { kind: 'structure' });
      const neighbor = store.doc.blocks[Math.min(index, store.doc.blocks.length - 1)];
      ui.set({ selectedId: neighbor?.id ?? null, selectSource: 'remove' });
      const focusTarget = neighbor
        ? $(`.block-card[data-block-id="${CSS.escape(neighbor.id)}"] [data-drag-handle]`)
        : $('[data-action="insert-end"]:not([hidden])');
      focusTarget?.focus({ preventScroll: true });
      notify(`${label} excluído.`, 'info', { undo: true });
    },

    select(id, { source = 'api', revealEditor = false, focus = false } = {}) {
      ui.set({ selectedId: id, selectSource: source });
      if (!revealEditor) return;
      if (isCompact()) ui.set({ pane: 'editor' });
      else if (focus && ui.get('view') === 'preview') ui.set({ view: 'split' });
      requestAnimationFrame(() => editor.reveal(id, { focus }));
    },

    openPicker(anchor, context) {
      picker.open(anchor, context);
    },

    openPanel(tab) {
      ui.set({ tab, panelOpen: true });
      if (isCompact()) ui.set({ pane: 'panel' });
    },

    chooseImage(target) {
      pendingImageTarget = target;
      imageInput.value = '';
      imageInput.click();
    },

    chooseLogo() {
      actions.chooseImage({ logo: true });
    },

    async setBlockImage(blockId, file) {
      try {
        const id = assets.add(await fileToAsset(file));
        store.update((doc) => {
          const block = doc.blocks.find((b) => b.id === blockId);
          if (block) block.assetId = id;
        }, { kind: 'block', blockId });
        editor.renderCard(blockId);
      } catch (error) {
        notify(error.message, 'error');
      }
    },

    async addImageFiles(files, index) {
      const accepted = files.filter(isAcceptedImage);
      if (!accepted.length) {
        notify('Nenhuma imagem compatível (use PNG, JPG, WEBP ou GIF).', 'error');
        return;
      }
      const blocks = [];
      for (const file of accepted) {
        try {
          blocks.push(createBlock('image', { assetId: assets.add(await fileToAsset(file)) }));
        } catch (error) {
          notify(`${file.name}: ${error.message}`, 'error');
        }
      }
      actions.insertBlocks(blocks, index, { focus: false });
      if (blocks.length) notify(blocks.length === 1 ? 'Imagem inserida. Escreva uma legenda para numerá-la.' : `${blocks.length} imagens inseridas.`);
    },

    async setLogo(file) {
      try {
        const id = assets.add(await fileToAsset(file));
        store.update((doc) => { doc.design.customLogo = id; doc.design.signature = 'custom'; }, { kind: 'design' });
      } catch (error) {
        notify(error.message, 'error');
      }
    },
  };

  /* ================================================================ módulos */
  const drag = createDragController({
    resolveDrop(x, y) {
      return resolveListDrop($('#editor-list'), '.block-card', x, y)
        ?? resolvePreviewDrop($('#pages'), store.doc.blocks, x, y)
        ?? resolveListDrop($('#outline-list'), '.outline__item', x, y);
    },
    onDrop(payload, target) {
      if (payload.type === 'move') actions.moveBlock(payload.blockId, target.index);
      else if (payload.type === 'insert') actions.insertType(payload.blockType, target.index);
      else if (payload.type === 'snippet') actions.insertSnippet(payload.snippetId, target.index);
    },
  });

  picker = createBlockPicker({
    onChoose(type, context) {
      if (context?.convertId) actions.convertBlock(context.convertId, type);
      else actions.insertType(type, context?.index);
    },
  });
  editor = createEditor({ store, ui, assets, actions, drag });
  preview = createPreview({ store, ui, assets, actions });
  const panels = createPanels({ store, ui, assets, actions, drag });

  imageInput.addEventListener('change', () => {
    const file = imageInput.files?.[0];
    const target = pendingImageTarget;
    pendingImageTarget = null;
    if (!file || !target) return;
    if (target.logo) actions.setLogo(file);
    else if (target.blockId) actions.setBlockImage(target.blockId, file);
  });

  /* ================================================================ layout e navegação */
  function syncLayout(state, changed) {
    appEl.dataset.pane = state.pane;
    appEl.dataset.view = state.view;
    appEl.dataset.panelOpen = String(state.panelOpen);
    const toggle = $('[data-action="toggle-panel"]');
    toggle.setAttribute('aria-expanded', String(state.panelOpen));
    toggle.setAttribute('aria-label', state.panelOpen ? 'Recolher painel lateral' : 'Expandir painel lateral');
    $$('.view-switch input').forEach((input) => { input.checked = input.value === state.view; });
    $$('.bottom-nav button').forEach((button) => {
      const current = button.dataset.paneTarget === state.pane && (state.pane !== 'panel' || button.dataset.tabTarget === state.tab);
      if (current) button.setAttribute('aria-current', 'page');
      else button.removeAttribute('aria-current');
    });
    if (changed?.includes('view')) preferences.set('view', state.view);
    if (changed?.includes('tab')) preferences.set('tab', state.tab);
    if (changed?.includes('panelOpen') && matchMedia('(min-width: 1180px)').matches) preferences.set('panel-open', state.panelOpen);
  }
  ui.subscribe(syncLayout);
  syncLayout(ui.snapshot());

  $$('.view-switch input').forEach((input) => input.addEventListener('change', () => ui.set({ view: input.value })));

  $('.bottom-nav').addEventListener('click', (event) => {
    const button = event.target.closest('button[data-pane-target]');
    if (!button) return;
    const patch = { pane: button.dataset.paneTarget };
    if (button.dataset.tabTarget) patch.tab = button.dataset.tabTarget;
    ui.set(patch);
    (patch.pane === 'editor' ? $('#editor') : patch.pane === 'preview' ? $('#preview-scroll') : $(`#panel-${ui.get('tab')}`))
      ?.scrollTo?.({ top: 0 });
  });

  // Gaveta do painel (tablet): fecha ao tocar fora dela.
  $('.workspace').addEventListener('pointerdown', (event) => {
    if (isOverlayPanel() && ui.get('panelOpen') && !event.target.closest('.side-panel, .rail')) ui.set({ panelOpen: false });
  });

  /* ================================================================ nome, histórico e salvamento */
  const nameInput = $('#doc-name');
  const status = $('#save-status');
  const undoButton = $('[data-action="undo"]');
  const redoButton = $('[data-action="redo"]');

  function syncChrome() {
    if (document.activeElement !== nameInput) nameInput.value = store.doc.name;
    document.title = `${store.doc.name} · Estúdio de Documentos`;
    undoButton.disabled = !store.canUndo;
    redoButton.disabled = !store.canRedo;
  }

  nameInput.addEventListener('input', () => {
    const name = nameInput.value.slice(0, 120);
    store.update((doc) => { doc.name = name; }, { kind: 'name', coalesce: 'doc-name' });
  });
  nameInput.addEventListener('blur', () => {
    if (!nameInput.value.trim()) store.update((doc) => { doc.name = 'Documento sem título'; }, { kind: 'name' });
    syncChrome();
  });
  nameInput.addEventListener('keydown', (event) => { if (event.key === 'Enter') nameInput.blur(); });

  let saveErrorShown = false;
  async function saveNow() {
    const doc = store.doc;
    status.dataset.state = 'saving';
    status.textContent = 'Salvando…';
    try {
      await storage.save(doc, assets.serialize(usedAssetIds(doc)));
      preferences.set('last-doc', doc.id);
      status.dataset.state = 'saved';
      status.textContent = storage.persistent ? `Salvo às ${formatTime(Date.now())}` : 'Salvo só nesta aba';
      saveErrorShown = false;
    } catch (error) {
      status.dataset.state = 'error';
      status.textContent = 'Falha ao salvar';
      if (!saveErrorShown) {
        saveErrorShown = true;
        notify('Não foi possível salvar no navegador (espaço cheio?). Use “Salvar arquivo (.json)” para não perder o trabalho.', 'error');
      }
      console.error(error);
    }
  }
  const saveSoon = debounce(saveNow, 700);

  store.subscribe((doc, change) => {
    syncChrome();
    saveSoon();
    if (change.kind === 'replace' && change.source === 'load') {
      ui.set({ selectedId: null, collapsed: new Set() });
      setHash(doc.id);
    }
  });
  addEventListener('pagehide', () => saveSoon.flush());
  document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'hidden') saveSoon.flush(); });

  function setHash(id) {
    const url = new URL(location.href);
    url.hash = `doc=${id}`;
    history.replaceState(null, '', url);
  }

  /* ================================================================ documentos */
  async function switchTo(doc, assetData, message) {
    saveSoon.cancel();
    await saveNow();
    assets.load(assetData);
    store.replace(doc);
    setHash(doc.id);
    await saveNow();
    if (isCompact()) ui.set({ pane: 'editor' });
    if (message) notify(message);
  }

  async function newFromTemplate(templateId) {
    const template = TEMPLATES.find((t) => t.id === templateId) ?? TEMPLATES.at(-1);
    await switchTo(documentFromTemplate(template), {}, `Documento “${template.name}” criado. Os anteriores continuam em Meus documentos.`);
  }

  async function openDocument(id) {
    if (id === store.doc.id) return;
    const record = await storage.load(id).catch(() => null);
    if (!record) {
      notify('Documento não encontrado neste navegador.', 'error');
      return;
    }
    await switchTo(normalizeDocument(record.doc), record.assets);
  }

  async function duplicateDocument(id) {
    const record = id === store.doc.id
      ? { doc: structuredClone(store.doc), assets: assets.serialize(usedAssetIds(store.doc)) }
      : await storage.load(id).catch(() => null);
    if (!record) return;
    const copy = normalizeDocument(record.doc, { keepId: false });
    copy.name = `${copy.name} (cópia)`;
    copy.createdAt = Date.now();
    await storage.save(copy, record.assets);
    notify(`Cópia criada: ${copy.name}`);
  }

  async function deleteDocument(id, name) {
    const confirmed = await confirmDialog({
      title: 'Excluir documento?',
      message: `“${name}” será removido deste navegador. Esta ação não pode ser desfeita. Se quiser guardar, salve antes o arquivo .json.`,
      confirmLabel: 'Excluir',
    });
    if (!confirmed) return false;
    await storage.remove(id);
    if (id === store.doc.id) {
      const remaining = (await storage.list()).sort((a, b) => b.updatedAt - a.updatedAt);
      saveSoon.cancel();
      if (remaining.length) {
        const record = await storage.load(remaining[0].id);
        assets.load(record.assets);
        store.replace(normalizeDocument(record.doc));
      } else {
        assets.load({});
        store.replace(documentFromTemplate(TEMPLATES.at(-1)));
        await saveNow();
      }
      setHash(store.doc.id);
    }
    notify('Documento excluído.');
    return true;
  }

  addEventListener('hashchange', () => {
    const id = new URLSearchParams(location.hash.slice(1)).get('doc');
    if (id && id !== store.doc.id) openDocument(id);
  });

  /* ================================================================ diálogos */
  const templatesDialog = $('#templates-dialog');
  const documentsDialog = $('#documents-dialog');
  const importDialog = $('#import-text-dialog');
  const shortcutsDialog = $('#shortcuts-dialog');
  [templatesDialog, documentsDialog, importDialog, shortcutsDialog, $('#confirm-dialog')].forEach(enableBackdropClose);

  let templateGridReady = false;
  function renderTemplateGrid() {
    if (templateGridReady) return;
    const measureDoc = $('#measure-doc');
    const items = TEMPLATES.map((template) => {
      const doc = documentFromTemplate(template);
      applyDocAttributes(measureDoc, doc.design);
      const { pagesHtml } = layoutDocument(doc, {}, $('#measure-body'), new Map());
      const thumbs = pagesHtml.slice(0, 2).map((html, i) =>
        panels.thumbHtml(html.replaceAll('id="p', `id="tpl-${template.id}-p`).replaceAll('url(#p', `url(#tpl-${template.id}-p`), doc.design, 0.13)).join('');
      return `
        <li><button type="button" class="template-card" data-template="${template.id}">
          <span class="template-card__preview" aria-hidden="true">${thumbs}</span>
          <span class="template-card__text"><strong>${esc(template.name)}</strong><small>${esc(template.description)}</small><small>${pagesHtml.length} páginas</small></span>
        </button></li>`;
    }).join('');
    $('#template-grid').innerHTML = items;
    templateGridReady = true;
    preview.renderNow(); // devolve a área de medição ao documento atual
  }

  $('#template-grid').addEventListener('click', (event) => {
    const card = event.target.closest('[data-template]');
    if (!card) return;
    templatesDialog.close('chosen');
    newFromTemplate(card.dataset.template);
  });

  async function renderDocumentList() {
    const list = (await storage.list().catch(() => [])).sort((a, b) => b.updatedAt - a.updatedAt);
    const container = $('#document-list');
    if (!list.length) {
      container.innerHTML = '<li class="document-list__empty">Nenhum documento salvo ainda.</li>';
      return;
    }
    container.innerHTML = list.map((item) => {
      const current = item.id === store.doc.id;
      // Miniatura da capa (o logo próprio não é carregado aqui, então vale a assinatura do Estado).
      const { meta, design } = normalizeDocument({ ...item, blocks: [] });
      if (design.signature === 'custom') design.signature = 'state';
      const html = design.cover !== 'none' ? renderCover({ meta, design }, {}, `doc-${item.id}`) : renderBackCover({ meta, design }, {}, `doc-${item.id}`);
      const thumb = html ? `<div class="doc thumb" ${docAttributesHtml(design)} style="--zoom:0.055">${html}</div>` : '';
      return `
        <li class="document-row${current ? ' is-current' : ''}" data-id="${esc(item.id)}">
          <span class="document-row__thumb" aria-hidden="true">${thumb}</span>
          <span class="document-row__info"><strong>${esc(item.name)}</strong><small>${current ? 'Aberto agora · ' : ''}Editado em ${formatDateTime(item.updatedAt)}</small></span>
          <span class="document-row__actions">
            ${current ? '' : `<button type="button" class="btn btn--soft btn--small" data-doc-action="open">Abrir</button>`}
            <button type="button" class="icon-btn" data-doc-action="duplicate" aria-label="Duplicar ${esc(item.name)}" title="Duplicar">${'<svg class="icon" aria-hidden="true"><use href="#i-copy"/></svg>'}</button>
            <button type="button" class="icon-btn icon-btn--danger" data-doc-action="delete" aria-label="Excluir ${esc(item.name)}" title="Excluir">${'<svg class="icon" aria-hidden="true"><use href="#i-trash"/></svg>'}</button>
          </span>
        </li>`;
    }).join('');
  }

  $('#document-list').addEventListener('click', async (event) => {
    const button = event.target.closest('[data-doc-action]');
    const row = event.target.closest('.document-row');
    if (!button || !row) return;
    const id = row.dataset.id;
    const name = row.querySelector('strong').textContent;
    if (button.dataset.docAction === 'open') {
      documentsDialog.close('open');
      await openDocument(id);
    } else if (button.dataset.docAction === 'duplicate') {
      await duplicateDocument(id);
      renderDocumentList();
    } else if (button.dataset.docAction === 'delete') {
      if (await deleteDocument(id, name)) renderDocumentList();
    }
  });

  importDialog.addEventListener('close', () => {
    if (importDialog.returnValue !== 'confirm') return;
    const text = $('#import-text-input').value;
    const blocks = markdownToBlocks(text);
    if (!blocks.length) {
      notify('Nada para converter: o texto está vazio.', 'error');
      return;
    }
    const mode = new FormData($('#import-text-form')).get('import-mode');
    if (mode === 'replace') {
      store.update((doc) => { doc.blocks = blocks; }, { kind: 'structure' });
      notify(`Documento substituído por ${blocks.length} blocos.`, 'info', { undo: true });
    } else {
      actions.insertBlocks(blocks, mode === 'after' ? actions.insertionIndex() : store.doc.blocks.length, { focus: false });
      notify(`${blocks.length} blocos criados a partir do texto.`, 'info', { undo: true });
    }
    $('#import-text-input').value = '';
  });

  /* ================================================================ arquivos e PDF */
  function exportJson() {
    const doc = store.doc;
    const payload = toFilePayload(doc, assets.serialize(usedAssetIds(doc)));
    downloadBlob(new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' }), `${slugify(doc.name)}.docstudio.json`);
    notify('Arquivo .json salvo. Abra-o em qualquer navegador pelo menu “Abrir arquivo”.');
  }

  $('#json-file-input').addEventListener('change', async (event) => {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;
    if (file.size > 150 * 1024 * 1024) {
      notify('Arquivo grande demais (máximo de 150 MB).', 'error');
      return;
    }
    try {
      const { doc, assets: assetData } = parseFilePayload(await file.text());
      await switchTo(doc, assetData, `“${doc.name}” aberto como um novo documento.`);
    } catch (error) {
      notify(error.message, 'error');
    }
  });

  function exportPdf() {
    if (!preferences.get('pdf-tip-shown', false)) {
      preferences.set('pdf-tip-shown', true);
      notify('Na janela que abrir, escolha “Salvar como PDF”. Tamanho A4 e margens já vêm configurados.');
    }
    preview.print();
  }

  /* ================================================================ tema do app */
  const THEME_LABELS = { auto: 'automático', light: 'claro', dark: 'escuro' };
  function applyAppTheme(theme) {
    if (theme === 'auto') delete document.documentElement.dataset.theme;
    else document.documentElement.dataset.theme = theme;
    $('[data-theme-label]').textContent = `Tema do app: ${THEME_LABELS[theme]}`;
  }
  applyAppTheme(preferences.get('app-theme', 'auto'));

  /* ================================================================ comandos */
  const COMMANDS = {
    'undo': () => store.undo(),
    'redo': () => store.redo(),
    'open-templates': () => { renderTemplateGrid(); openDialog(templatesDialog); },
    'open-documents': async () => { await saveNow(); await renderDocumentList(); openDialog(documentsDialog); },
    'new-document': () => {
      if (documentsDialog.open) documentsDialog.close();
      renderTemplateGrid();
      openDialog(templatesDialog);
    },
    'open-import-text': () => { openDialog(importDialog); $('#import-text-input').focus(); },
    'export-json': exportJson,
    'import-json': () => $('#json-file-input').click(),
    'cycle-app-theme': () => {
      const order = ['auto', 'light', 'dark'];
      const next = order[(order.indexOf(preferences.get('app-theme', 'auto')) + 1) % order.length];
      preferences.set('app-theme', next);
      applyAppTheme(next);
    },
    'open-shortcuts': () => openDialog(shortcutsDialog),
    'export-pdf': exportPdf,
    'collapse-all': () => editor.collapseAll(true),
    'expand-all': () => editor.collapseAll(false),
    'insert-end': (button) => actions.openPicker(button, { index: store.doc.blocks.length }),
    'zoom-in': () => preview.zoomIn(),
    'zoom-out': () => preview.zoomOut(),
    'zoom-fit': () => preview.zoomFit(),
  };

  const moreMenu = setupMenu($('#more-menu'), { onSelect: (item) => COMMANDS[item.dataset.action]?.(item) });
  $('#more-menu-button').addEventListener('click', (event) => moreMenu.toggle(event.currentTarget));

  document.addEventListener('click', (event) => {
    const button = event.target.closest('[data-action]');
    if (!button || button.closest('#editor-list, .rail, #design-controls, .menu')) return;
    const command = COMMANDS[button.dataset.action];
    if (command) {
      event.preventDefault();
      command(button);
    }
  });

  /* ================================================================ atalhos de teclado */
  document.addEventListener('keydown', (event) => {
    const mod = event.ctrlKey || event.metaKey;
    const key = event.key.toLowerCase();
    const inDialog = Boolean(event.target.closest?.('dialog'));
    const selected = ui.get('selectedId');

    if (mod && key === 'z' && !inDialog) {
      event.preventDefault();
      if (event.shiftKey) store.redo();
      else store.undo();
    } else if (mod && key === 'y' && !inDialog) {
      event.preventDefault();
      store.redo();
    } else if (mod && key === 's') {
      event.preventDefault();
      saveSoon.cancel();
      saveNow().then(() => notify('Documento salvo neste navegador.'));
    } else if (mod && key === 'p') {
      event.preventDefault();
      exportPdf();
    } else if (mod && key === 'k' && !inDialog) {
      event.preventDefault();
      const anchor = selected
        ? $(`.block-card[data-block-id="${CSS.escape(selected)}"] [data-action="insert-after"]`)
        : $('[data-action="insert-end"]:not([hidden])');
      actions.openPicker(anchor ?? $('#editor-list'), { index: actions.insertionIndex() });
    } else if (mod && key === 'd' && selected && !inDialog) {
      event.preventDefault();
      actions.duplicateBlock(selected);
    } else if (mod && ['1', '2', '3'].includes(event.key)) {
      event.preventDefault();
      ui.set({ view: ['editor', 'split', 'preview'][Number(event.key) - 1] });
    } else if (event.altKey && (event.key === 'ArrowUp' || event.key === 'ArrowDown') && selected && !inDialog) {
      event.preventDefault();
      actions.moveBlockBy(selected, event.key === 'ArrowUp' ? -1 : 1);
    } else if (event.key === '?' && !isTypingTarget(event.target) && !inDialog) {
      event.preventDefault();
      openDialog(shortcutsDialog);
    } else if (event.key === 'Escape' && isOverlayPanel() && ui.get('panelOpen') && !inDialog) {
      ui.set({ panelOpen: false });
    }
  });

  /* ================================================================ colar e soltar imagens */
  document.addEventListener('paste', (event) => {
    if (event.target.closest?.('dialog')) return;
    const files = [...(event.clipboardData?.files ?? [])].filter(isAcceptedImage);
    if (!files.length) return;
    event.preventDefault();
    const card = event.target.closest?.('.block-card[data-type="image"]');
    if (card && files.length === 1) actions.setBlockImage(card.dataset.blockId, files[0]);
    else actions.addImageFiles(files);
  });

  const hasFiles = (event) => event.dataTransfer?.types?.includes('Files');
  let dragDepth = 0;
  document.addEventListener('dragenter', (event) => {
    if (!hasFiles(event)) return;
    dragDepth += 1;
    appEl.classList.add('is-file-over');
  });
  document.addEventListener('dragleave', (event) => {
    if (!hasFiles(event)) return;
    dragDepth = Math.max(0, dragDepth - 1);
    if (!dragDepth) appEl.classList.remove('is-file-over');
  });
  document.addEventListener('dragover', (event) => {
    if (hasFiles(event)) event.preventDefault();
  });
  document.addEventListener('drop', (event) => {
    if (!hasFiles(event)) return;
    event.preventDefault();
    dragDepth = 0;
    appEl.classList.remove('is-file-over');
    const target = resolveListDrop($('#editor-list'), '.block-card', event.clientX, event.clientY)
      ?? resolvePreviewDrop($('#pages'), store.doc.blocks, event.clientX, event.clientY);
    actions.addImageFiles([...event.dataTransfer.files], target?.index);
  });

  /* ================================================================ início */
  syncChrome();
  setHash(store.doc.id);
  saveNow();
  if (!storage.persistent) {
    notify('Este navegador não permite salvar localmente. Use “Salvar arquivo (.json)” para guardar seu trabalho.', 'error');
  }
  if (firstRun) {
    renderTemplateGrid();
    openDialog(templatesDialog);
  }

  // Exposto só para depuração no console do navegador.
  Object.defineProperty(window, 'docStudio', { value: { store, ui, preview }, configurable: true });
}

main().catch((error) => {
  console.error(error);
  const warning = document.getElementById('file-warning');
  warning.hidden = false;
  warning.textContent = `Não foi possível iniciar o Estúdio de Documentos: ${error.message}`;
});
