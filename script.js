/**
 * Ponto de entrada (raiz de composição).
 *
 * Cria o estado, o armazenamento e os módulos de interface, e define as
 * "ações" do aplicativo: as operações de alto nível (inserir, mover, abrir
 * documento, exportar...) que os módulos chamam sem depender uns dos outros.
 */
import { $, $$, esc, clamp, debounce, moveItem, slugify, announce, isTypingTarget, downloadBlob, formatTime, formatDateTime } from './js/utils.js';
import { createStore, createUiState } from './js/state.js';
import { createBlock, BLOCK_TYPES, TEXT_BLOCK_TYPES, transformBlock, blockPlainText } from './js/schema.js';
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
import { applyDocAttributes, docAttributesHtml, DEFAULT_META, THEMES, COVERS, BACK_COVERS, DESIGN_OPTIONS } from './js/design.js';
import { setupTooltips } from './js/tooltip.js';
import { setupControls } from './js/controls.js';
import { createContextMenu } from './js/contextmenu.js';
import { textFieldItems, textMenuTitle, keys, writeClipboard } from './js/textmenu.js';

const appEl = $('#app');
const isCompact = () => !matchMedia('(min-width: 760px)').matches;
const isOverlayPanel = () => matchMedia('(min-width: 760px) and (max-width: 1179.98px)').matches;

/** Espera as fontes principais: a paginação depende das medidas reais do texto. */
async function waitForFonts() {
  if (!document.fonts?.load) return;
  const faces = ['300 12px Kanit', '400 12px Kanit', '500 12px Kanit', '600 12px Kanit', '700 12px Kanit', '800 12px Kanit', '900 12px Kanit', '400 12px Maitree', '700 12px Maitree'];
  const timeout = new Promise((resolve) => setTimeout(resolve, 3000));
  await Promise.race([Promise.all(faces.map((face) => document.fonts.load(face))), timeout]);
}

const BLANK_TEMPLATE = TEMPLATES.find((t) => t.id === 'blank');

function documentFromTemplate(template) {
  return createDocument({
    name: template.group === 'blank' ? 'Documento sem título' : template.name,
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
  // Primeira visita: documento em branco atrás da galeria (fechar a galeria = começar do zero).
  return { doc: documentFromTemplate(BLANK_TEMPLATE), firstRun: true };
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
      requestAnimationFrame(() => {
        blocks.forEach((block) => editor.markNew(block.id));
        editor.reveal(blocks[0].id, { focus });
      });
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

    exportPdf: () => exportPdf(),

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

    chooseCoverPhoto() {
      actions.chooseImage({ coverPhoto: true });
    },

    async setCoverPhoto(file) {
      try {
        const id = assets.add(await fileToAsset(file));
        store.update((doc) => { doc.design.coverImage = id; doc.design.cover = 'photo'; }, { kind: 'design' });
        notify('Foto da capa aplicada.');
      } catch (error) {
        notify(error.message, 'error');
      }
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
        notify('Nenhuma imagem compatível (use PNG, JPG, WEBP, GIF ou SVG).', 'error');
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

    /** Muda uma opção de design (painel Design e menu de contexto da prévia usam a mesma regra). */
    setDesign(key, value) {
      if (store.doc.design[key] === value) return;
      store.update((doc) => { doc.design[key] = value; }, { kind: 'design' });
      if (key === 'signature' && value === 'custom' && !store.doc.design.customLogo) actions.chooseLogo();
      if (key === 'cover' && value === 'photo' && !store.doc.design.coverImage) actions.chooseCoverPhoto();
    },

    /** Muda um campo simples do bloco (cor, estilo, interruptor) fora do formulário dele. */
    setBlockField(id, key, value) {
      store.update((doc) => {
        const block = doc.blocks.find((b) => b.id === id);
        if (block) block[key] = value;
      }, { kind: 'block', blockId: id, external: true });
    },

    /** Transforma um bloco de texto em outro tipo, mantendo o texto (ex.: parágrafo → destaque). */
    transformBlock(id, type) {
      const index = actions.indexOf(id);
      const next = index >= 0 ? transformBlock(store.doc.blocks[index], type) : null;
      if (!next) return;
      store.update((doc) => doc.blocks.splice(index, 1, next), { kind: 'structure' });
      notify(`Bloco transformado em ${BLOCK_TYPES[type].label}.`, 'info', { undo: true });
    },

    async copyBlockText(id) {
      const block = store.doc.blocks.find((b) => b.id === id);
      const ok = block ? await writeClipboard(blockPlainText(block)) : false;
      notify(ok ? 'Texto do bloco copiado.' : 'Não foi possível copiar o texto.', ok ? 'info' : 'error');
    },

    /** Mostra o bloco na prévia (abre a prévia se ela estiver escondida). */
    revealInPreview(id) {
      ui.set({ selectedId: id, selectSource: 'menu' });
      if (isCompact()) withTransition(() => ui.set({ pane: 'preview' }));
      else if (ui.get('view') === 'editor') withTransition(() => ui.set({ view: 'split' }));
      requestAnimationFrame(() => preview.revealBlock(id));
    },

    /** Abre o painel Design já na seção pedida (capa, rodapé...). */
    openDesignSection(sectionId) {
      actions.openPanel('design');
      requestAnimationFrame(() => {
        const target = document.getElementById(sectionId);
        if (!target) return;
        if (target.tagName === 'DETAILS') target.open = true;
        target.scrollIntoView({ block: 'start', behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth' });
        target.querySelector('input:checked, input, button')?.focus({ preventScroll: true });
      });
    },

    /**
     * Ações de um bloco para o menu de contexto (editor, prévia e Estrutura).
     * Reúne as do menu ⋯ do cartão e as opções do formulário do bloco; cada
     * item chama a mesma ação dos botões, com as mesmas condições.
     */
    blockMenuItems(id, { anchor, origin }) {
      const index = actions.indexOf(id);
      const block = store.doc.blocks[index];
      if (!block) return [];
      const definition = BLOCK_TYPES[block.type];
      const last = store.doc.blocks.length - 1;
      const collapsed = ui.get('collapsed').has(id);

      const properties = definition.fields.flatMap((field) => {
        if (field.kind === 'toggle') {
          return [{ label: field.label, checked: Boolean(block[field.key]), run: () => actions.setBlockField(id, field.key, !block[field.key]) }];
        }
        if (field.kind !== 'segmented' && field.kind !== 'swatches') return [];
        const current = field.options.find((option) => option.value === block[field.key]);
        return [{
          label: field.label,
          hint: current?.label,
          icon: field.kind === 'swatches' ? 'palette' : 'layout',
          submenu: field.options.map((option) => ({
            label: option.label,
            radio: true,
            checked: option.value === block[field.key],
            swatch: field.kind === 'swatches' ? option.swatch : undefined,
            run: () => actions.setBlockField(id, field.key, option.value),
          })),
        }];
      });

      const transform = TEXT_BLOCK_TYPES.includes(block.type) && {
        label: 'Transformar em',
        icon: 'convert',
        submenu: TEXT_BLOCK_TYPES.filter((type) => type !== block.type).map((type) => ({
          label: BLOCK_TYPES[type].label, icon: BLOCK_TYPES[type].icon, run: () => actions.transformBlock(id, type),
        })),
      };

      const image = block.type === 'image' ? [
        { label: block.assetId ? 'Trocar imagem…' : 'Escolher imagem…', icon: 'upload', run: () => actions.chooseImage({ blockId: id }) },
        block.assetId && { label: 'Remover imagem', icon: 'trash', run: () => actions.setBlockField(id, 'assetId', '') },
      ] : [];

      return [
        origin === 'preview'
          ? { label: 'Editar no editor', icon: 'edit', run: () => actions.select(id, { source: 'preview', revealEditor: true, focus: true }) }
          : { label: 'Mostrar na prévia', icon: 'eye', run: () => actions.revealInPreview(id) },
        { separator: true },
        ...properties,
        transform,
        ...image,
        { separator: true },
        { label: 'Inserir bloco acima', icon: 'row-above', run: () => actions.openPicker(anchor, { index }) },
        { label: 'Inserir bloco abaixo', icon: 'row-below', shortcut: keys('Ctrl+K'), run: () => actions.openPicker(anchor, { index: index + 1 }) },
        { label: 'Mover para cima', icon: 'chevron-up', shortcut: keys('Alt+↑'), disabled: index === 0, run: () => actions.moveBlockBy(id, -1) },
        { label: 'Mover para baixo', icon: 'chevron-down', shortcut: keys('Alt+↓'), disabled: index === last, run: () => actions.moveBlockBy(id, 1) },
        { label: 'Duplicar', icon: 'copy', shortcut: keys('Ctrl+D'), run: () => actions.duplicateBlock(id) },
        { label: 'Copiar texto', icon: 'clipboard', disabled: !blockPlainText(block), run: () => actions.copyBlockText(id) },
        origin !== 'preview' && { label: collapsed ? 'Expandir no editor' : 'Recolher no editor', icon: collapsed ? 'expand' : 'collapse', run: () => editor.toggleCollapse(id) },
        { separator: true },
        { label: 'Excluir bloco', icon: 'trash', danger: true, run: () => actions.removeBlock(id) },
      ];
    },

    /** Menu da capa, contracapa, cabeçalho e rodapé na prévia: as mesmas opções do painel Design. */
    designMenu(region) {
      const { design } = store.doc;
      const valueOf = (option) => option.id ?? option.value;
      const choices = (key, options) => options.map((option) => ({
        label: option.label, radio: true, checked: design[key] === valueOf(option), run: () => actions.setDesign(key, valueOf(option)),
      }));
      const currentLabel = (key, options) => options.find((option) => valueOf(option) === design[key])?.label;
      const choice = (label, icon, key, options) => ({ label, icon, hint: currentLabel(key, options), submenu: choices(key, options) });
      const texts = (label) => ({ label, icon: 'file-text', run: () => actions.openPanel('document') });
      const more = (section) => ({ label: 'Mais opções no painel Design', icon: 'palette', run: () => actions.openDesignSection(section) });
      const theme = {
        label: 'Tema de cores',
        icon: 'palette',
        hint: THEMES.find((t) => t.id === design.theme)?.label,
        submenu: THEMES.map((t) => ({
          label: t.label, radio: true, checked: design.theme === t.id,
          swatch: `linear-gradient(135deg, ${t.colors[0]} 0 50%, ${t.colors[2]} 50%)`,
          run: () => actions.setDesign('theme', t.id),
        })),
      };
      const signature = choice('Assinatura', 'tag', 'signature', DESIGN_OPTIONS.signature);

      switch (region) {
        case 'cover':
          return {
            title: 'Capa',
            icon: 'layout',
            items: [
              texts('Editar textos da capa'),
              { separator: true },
              choice('Estilo da capa', 'layout', 'cover', COVERS),
              design.cover === 'photo' && { label: design.coverImage ? 'Trocar foto da capa…' : 'Escolher foto da capa…', icon: 'image', run: () => actions.chooseCoverPhoto() },
              signature,
              theme,
              { separator: true },
              more('design-cover'),
            ],
          };
        case 'back':
          return {
            title: 'Contracapa',
            icon: 'layout',
            items: [texts('Editar textos da contracapa'), { separator: true }, choice('Estilo da contracapa', 'layout', 'backCover', BACK_COVERS), signature, theme, { separator: true }, more('design-back')],
          };
        case 'header':
          return {
            title: 'Cabeçalho das páginas',
            icon: 'layout',
            items: [texts('Editar textos do cabeçalho'), { separator: true }, choice('Estilo do cabeçalho', 'layout', 'header', DESIGN_OPTIONS.header), { separator: true }, more('design-header')],
          };
        case 'footer':
          return {
            title: 'Rodapé das páginas',
            icon: 'layout',
            items: [choice('Estilo do rodapé', 'layout', 'footer', DESIGN_OPTIONS.footer), choice('Numeração', 'outline', 'pageNumber', DESIGN_OPTIONS.pageNumber), { separator: true }, more('design-footer')],
          };
        default:
          return null;
      }
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
  setupTooltips();
  setupControls();

  // Cores do tema do documento na interface (amostras "Cor do tema" e "Cor de apoio" do editor).
  function syncThemeColors() {
    const theme = THEMES.find((t) => t.id === store.doc.design.theme) ?? THEMES[0];
    appEl.style.setProperty('--tone-theme', theme.colors[0]);
    appEl.style.setProperty('--tone-accent', theme.colors[2]);
  }
  syncThemeColors();
  store.subscribe((doc, change) => { if (change.kind === 'design' || change.kind === 'replace') syncThemeColors(); });

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
    else if (target.coverPhoto) actions.setCoverPhoto(file);
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

  /** Troca de área/modo com transição suave (View Transitions), quando houver suporte. */
  function withTransition(update) {
    if (!document.startViewTransition || matchMedia('(prefers-reduced-motion: reduce)').matches) update();
    else document.startViewTransition(update);
  }

  $$('.view-switch input').forEach((input) => input.addEventListener('change', () => withTransition(() => ui.set({ view: input.value }))));

  $('.bottom-nav').addEventListener('click', (event) => {
    const button = event.target.closest('button[data-pane-target]');
    if (!button) return;
    const patch = { pane: button.dataset.paneTarget };
    if (button.dataset.tabTarget) patch.tab = button.dataset.tabTarget;
    withTransition(() => ui.set(patch));
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
  const saveRescue = $('#save-rescue');
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
      status.textContent = storage.persistent ? `Salvo neste navegador às ${formatTime(Date.now())}` : 'Salvo só nesta aba';
      saveRescue.hidden = true;
      saveErrorShown = false;
      requestPersistence();
    } catch (error) {
      status.dataset.state = 'error';
      status.textContent = 'Falha ao salvar';
      saveRescue.hidden = false;
      if (!saveErrorShown) {
        saveErrorShown = true;
        notify('Não foi possível salvar no navegador (espaço cheio?). Clique em “Baixar cópia” para não perder o trabalho.', 'error');
      }
      console.error(error);
    }
  }
  const saveSoon = debounce(saveNow, 700);

  // Pede ao navegador para não apagar os documentos quando faltar espaço (uma vez por sessão).
  let persistenceRequested = false;
  function requestPersistence() {
    if (persistenceRequested || !storage.persistent) return;
    persistenceRequested = true;
    navigator.storage?.persist?.().catch(() => {});
  }

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

  // Documento de exemplo aberto na primeira visita: se a pessoa escolher outro
  // modelo sem ter editado nada, ele é descartado em vez de poluir "Meus documentos".
  let untouchedFirstDocId = firstRun ? initialDoc.id : null;

  async function newFromTemplate(templateId) {
    const template = TEMPLATES.find((t) => t.id === templateId) ?? BLANK_TEMPLATE;
    const discardId = untouchedFirstDocId === store.doc.id && !store.canUndo ? untouchedFirstDocId : null;
    untouchedFirstDocId = null;
    const message = template.group === 'blank'
      ? 'Documento em branco criado. Escreva no editor ou use “Inserir”.'
      : `Modelo “${template.name}” aberto. Troque os textos de exemplo pelos seus.`;
    await switchTo(documentFromTemplate(template), {}, template.then === 'import' ? '' : message);
    if (discardId) await storage.remove(discardId).catch(() => {});
    if (template.then === 'import') openImportText('replace');
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
        store.replace(documentFromTemplate(BLANK_TEMPLATE));
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
  [templatesDialog, documentsDialog, importDialog, shortcutsDialog, $('#pdf-dialog'), $('#confirm-dialog')].forEach(enableBackdropClose);

  let templateGridReady = false;
  function templateCardHtml(template) {
    const doc = documentFromTemplate(template);
    applyDocAttributes($('#measure-doc'), doc.design);
    const { pagesHtml } = layoutDocument(doc, {}, $('#measure-body'), new Map());
    const thumbs = template.then === 'import'
      ? `<span class="template-card__icon"><svg class="icon icon--xl"><use href="#i-pen"/></svg></span>`
      : pagesHtml.slice(0, 2).map((html) =>
        panels.thumbHtml(html.replaceAll('id="p', `id="tpl-${template.id}-p`).replaceAll('url(#p', `url(#tpl-${template.id}-p`), doc.design, 0.13)).join('');
    const pages = template.group === 'blank' ? '' : `<small>${pagesHtml.length} páginas de exemplo</small>`;
    return `
      <li><button type="button" class="template-card" data-template="${template.id}">
        <span class="template-card__preview" aria-hidden="true">${thumbs}</span>
        <span class="template-card__text"><strong>${esc(template.name)}</strong><small>${esc(template.description)}</small>${pages}</span>
      </button></li>`;
  }

  function renderTemplateGrid() {
    if (templateGridReady) return;
    $$('[data-template-group]').forEach((list) => {
      list.innerHTML = TEMPLATES.filter((t) => (t.group ?? 'model') === list.dataset.templateGroup).map(templateCardHtml).join('');
    });
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

  /** Abre "Escrever texto". Num documento vazio, o texto colado vira o documento inteiro. */
  function openImportText(mode = store.doc.blocks.length ? 'append' : 'replace') {
    $$('input[name="import-mode"]').forEach((input) => { input.checked = input.value === mode; });
    openDialog(importDialog);
    $('#import-text-input').focus();
  }

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
      const wasEmpty = !store.doc.blocks.length;
      store.update((doc) => { doc.blocks = blocks; }, { kind: 'structure' });
      notify(wasEmpty ? `${blocks.length} blocos criados a partir do texto.` : `Documento substituído por ${blocks.length} blocos.`, 'info', { undo: true });
    } else {
      actions.insertBlocks(blocks, mode === 'after' ? actions.insertionIndex() : store.doc.blocks.length, { focus: false });
      notify(`${blocks.length} blocos criados a partir do texto.`, 'info', { undo: true });
    }
    $('#import-text-input').value = '';
  });

  /* ================================================================ arquivos e PDF */
  async function exportJson(id = store.doc.id) {
    const current = id === store.doc.id;
    const record = current ? { doc: store.doc, assets: assets.serialize(usedAssetIds(store.doc)) } : await storage.load(id).catch(() => null);
    if (!record) {
      notify('Documento não encontrado neste navegador.', 'error');
      return;
    }
    const doc = current ? record.doc : normalizeDocument(record.doc);
    const payload = toFilePayload(doc, record.assets);
    downloadBlob(new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' }), `${slugify(doc.name)}.docstudio.json`);
    notify('Cópia de segurança baixada. Para abri-la em outro computador: menu ⋯ → “Abrir cópia de segurança”.');
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

  /** Pontos a revisar antes do PDF: blocos cortados, textos de exemplo e capa sem título. */
  function pdfChecks() {
    const doc = store.doc;
    const checks = [];
    const overflow = [...ui.get('overflowBlocks')];
    if (overflow.length) {
      checks.push({ text: overflow.length === 1 ? 'Um bloco passa do tamanho da página e sairá cortado.' : `${overflow.length} blocos passam do tamanho da página e sairão cortados.`, label: 'Ver bloco', run: () => actions.select(overflow[0], { revealEditor: true }) });
    }
    const sample = doc.blocks.find((block) => /\(exemplo\)/i.test(JSON.stringify(block)));
    if (sample) checks.push({ text: 'O documento ainda tem textos marcados como “(exemplo)”.', label: 'Ver', run: () => actions.select(sample.id, { revealEditor: true }) });
    if (doc.design.cover !== 'none' && doc.meta.title.trim() === DEFAULT_META.title) {
      checks.push({ text: 'A capa ainda diz “Título do Documento”.', label: 'Editar capa', run: () => actions.openPanel('document') });
    }
    if (!doc.blocks.length) checks.push({ text: 'O documento ainda não tem conteúdo: só a capa e páginas em branco.', label: 'Escrever', run: () => openImportText() });
    return checks;
  }

  const pdfDialog = $('#pdf-dialog');
  function exportPdf() {
    const checks = pdfChecks();
    if (!checks.length && preferences.get('pdf-skip-help', false)) {
      preview.print();
      return;
    }
    $('#pdf-checks').innerHTML = checks.map((check, i) => `
      <li><svg class="icon" aria-hidden="true"><use href="#i-warning"/></svg><span>${esc(check.text)}</span>
      <button type="button" class="btn btn--soft btn--small" data-check="${i}">${esc(check.label)}</button></li>`).join('');
    $('#pdf-checks').hidden = !checks.length;
    $('#pdf-skip-help').checked = preferences.get('pdf-skip-help', false);
    $('#pdf-checks').onclick = (event) => {
      const button = event.target.closest('[data-check]');
      if (!button) return;
      pdfDialog.close('review');
      checks[Number(button.dataset.check)].run();
    };
    openDialog(pdfDialog, {
      onClose(value) {
        preferences.set('pdf-skip-help', $('#pdf-skip-help').checked);
        // Espera o diálogo sumir para ele não aparecer na impressão.
        if (value === 'confirm') requestAnimationFrame(() => preview.print());
      },
    });
  }

  /* ================================================================ tema do app */
  // O claro é o padrão; "automático" segue o tema do sistema operacional.
  const THEME_ORDER = ['light', 'dark', 'auto'];
  const THEME_LABELS = { light: 'claro', dark: 'escuro', auto: 'automático (sistema)' };
  const savedAppTheme = () => {
    const theme = preferences.get('app-theme', 'light');
    return THEME_ORDER.includes(theme) ? theme : 'light';
  };
  function applyAppTheme(theme) {
    if (theme === 'auto') delete document.documentElement.dataset.theme;
    else document.documentElement.dataset.theme = theme;
    $('[data-theme-label]').textContent = `Tema do app: ${THEME_LABELS[theme]}`;
    const dark = theme === 'dark' || (theme === 'auto' && matchMedia('(prefers-color-scheme: dark)').matches);
    $('meta[name="theme-color"]')?.setAttribute('content', dark ? '#0f1417' : '#f3f5f4');
  }
  applyAppTheme(savedAppTheme());

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
    'open-import-text': () => openImportText(),
    'export-json': () => exportJson(),
    'import-json': () => $('#json-file-input').click(),
    'cycle-app-theme': () => {
      const next = THEME_ORDER[(THEME_ORDER.indexOf(savedAppTheme()) + 1) % THEME_ORDER.length];
      preferences.set('app-theme', next);
      applyAppTheme(next);
      notify(`Tema do app: ${THEME_LABELS[next]}. O documento continua em papel branco.`);
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

  /* ================================================================ menu de contexto (botão direito) */
  // Ordem: o primeiro provedor que reconhecer o elemento monta o menu. Onde
  // nenhum reconhece, fica o menu do navegador (e Shift + botão direito sempre o abre).
  const contextMenu = createContextMenu({ isBusy: () => drag.dragging });
  contextMenu.register((target) => editor.contextMenu(target));
  contextMenu.register((target) => preview.contextMenu(target));
  contextMenu.register((target, context) => panels.contextMenu(target, context));

  // "Escrever texto": formatação e as marcações de linha que viram blocos (# seção, - lista, > destaque...).
  contextMenu.register((target) => {
    if (target.id !== 'import-text-input') return null;
    return {
      title: textMenuTitle(target),
      icon: 'pen',
      items: textFieldItems(target, { formats: true, markdown: true, notify }),
      footer: 'Shift + botão direito abre o menu do navegador',
    };
  });

  // "Meus documentos": as ações da linha (as mesmas dos botões, com a mesma confirmação ao excluir).
  contextMenu.register((target) => {
    const row = target.closest('#document-list .document-row');
    if (!row) return null;
    const id = row.dataset.id;
    const name = row.querySelector('strong').textContent;
    const current = id === store.doc.id;
    return {
      title: name,
      icon: 'file-text',
      items: [
        !current && { label: 'Abrir', icon: 'folder', run: async () => { documentsDialog.close('open'); await openDocument(id); } },
        current && { label: 'Renomear', icon: 'edit', run: () => { documentsDialog.close(); nameInput.focus(); nameInput.select(); } },
        { label: 'Duplicar', icon: 'copy', run: async () => { await duplicateDocument(id); renderDocumentList(); } },
        { label: 'Baixar cópia de segurança', icon: 'download', run: () => exportJson(id) },
        { separator: true },
        { label: 'Excluir…', icon: 'trash', danger: true, run: async () => { if (await deleteDocument(id, name)) renderDocumentList(); } },
      ],
    };
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
      withTransition(() => ui.set({ view: ['editor', 'split', 'preview'][Number(event.key) - 1] }));
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
    notify('Este navegador não permite salvar localmente. Use “Baixar cópia de segurança” (menu ⋯) para guardar seu trabalho.', 'error');
  }
  if (firstRun) {
    renderTemplateGrid();
    openDialog(templatesDialog);
  }

  // Some a tela de abertura e as páginas entram em sequência (só na primeira exibição).
  const pagesEl = $('#pages');
  pagesEl.classList.add('is-intro');
  setTimeout(() => pagesEl.classList.remove('is-intro'), 1200);
  $('#boot').classList.add('is-done');

  // Exposto só para depuração no console do navegador.
  Object.defineProperty(window, 'docStudio', { value: { store, ui, preview }, configurable: true });
}

main().catch((error) => {
  console.error(error);
  document.getElementById('boot')?.classList.add('is-done');
  const warning = document.getElementById('file-warning');
  warning.hidden = false;
  warning.textContent = `Não foi possível iniciar o Estúdio de Documentos: ${error.message}`;
});
