/**
 * Painel lateral: Inserir (paleta), Estrutura (sumário arrastável),
 * Design (capas, temas, estilos) e Textos (capa, cabeçalho, contracapa).
 */
import { $, $$, esc, icon, debounce } from './utils.js';
import { BLOCK_TYPES, BLOCK_GROUPS, blockSummary } from './schema.js';
import { THEMES, COVERS, BACK_COVERS, DESIGN_OPTIONS, DESIGN_PRESETS, META_GROUPS, docAttributesHtml } from './design.js';
import { SNIPPETS } from './templates.js';
import { renderCover, renderBackCover, renderContentPage, brandHtml } from './render.js';
import { fieldHtml, readControlValue } from './fields.js';
import { preferences } from './storage.js';

const TABS = ['insert', 'outline', 'design', 'document'];

export function createPanels({ store, ui, assets, actions, drag }) {
  const rail = $('.rail');
  const tabs = $$('.rail__tab', rail);
  const palette = $('#insert-palette');
  const outline = $('#outline-list');
  const stats = $('#doc-stats');
  const designRoot = $('#design-controls');
  const documentForm = $('#document-form');

  /* ================================================================ abas */
  function showTab(tab) {
    tabs.forEach((button) => {
      const selected = button.dataset.tab === tab;
      button.setAttribute('aria-selected', String(selected));
      button.tabIndex = selected ? 0 : -1;
    });
    TABS.forEach((id) => { $(`#panel-${id}`).hidden = id !== tab; });
    if (tab === 'design') refreshThumbnails();
    if (tab === 'outline') renderOutline();
  }

  rail.addEventListener('click', (event) => {
    const tab = event.target.closest('.rail__tab');
    if (tab) {
      const wide = matchMedia('(min-width: 760px)').matches;
      // Clicar de novo na aba ativa recolhe o painel (desktop/tablet).
      if (wide && ui.get('tab') === tab.dataset.tab && ui.get('panelOpen')) ui.set({ panelOpen: false });
      else ui.set({ tab: tab.dataset.tab, panelOpen: true });
      return;
    }
    if (event.target.closest('[data-action="toggle-panel"]')) ui.set({ panelOpen: !ui.get('panelOpen') });
  });

  rail.addEventListener('keydown', (event) => {
    const index = tabs.indexOf(document.activeElement);
    if (index < 0) return;
    const keys = { ArrowDown: 1, ArrowRight: 1, ArrowUp: -1, ArrowLeft: -1 };
    if (event.key in keys) {
      event.preventDefault();
      const next = tabs[(index + keys[event.key] + tabs.length) % tabs.length];
      next.focus();
      ui.set({ tab: next.dataset.tab, panelOpen: true });
    }
  });

  /* ================================================================ inserir */
  function renderPalette() {
    const groups = BLOCK_GROUPS.map((group) => {
      const items = Object.entries(BLOCK_TYPES)
        .filter(([, def]) => def.group === group.id)
        .map(([type, def]) => `
          <li><button type="button" class="palette-item" data-insert-type="${type}" title="${esc(def.description)}">
            <span class="type-icon" data-group="${def.group}">${icon(def.icon)}</span><span>${esc(def.label)}</span>
          </button></li>`).join('');
      return `<section class="palette-group"><h3>${esc(group.label)}</h3><ul class="palette-grid">${items}</ul></section>`;
    }).join('');

    const snippets = SNIPPETS.map((snippet) => `
      <li><button type="button" class="snippet-item" data-insert-snippet="${snippet.id}">
        <strong>${esc(snippet.name)}</strong><small>${esc(snippet.description)}</small>
      </button></li>`).join('');

    palette.innerHTML = `
      <button type="button" class="cta-card" data-action="open-import-text">
        <span class="type-icon">${icon('pen')}</span>
        <strong>Escrever com texto livre</strong>
        <small>Cole ou digite; títulos, listas e tabelas viram blocos.</small>
      </button>
      ${groups}
      <section class="palette-group"><h3>Combinações prontas</h3><ul class="snippet-list">${snippets}</ul></section>`;
  }

  palette.addEventListener('click', (event) => {
    const typeButton = event.target.closest('[data-insert-type]');
    if (typeButton) return actions.insertType(typeButton.dataset.insertType);
    const snippetButton = event.target.closest('[data-insert-snippet]');
    if (snippetButton) return actions.insertSnippet(snippetButton.dataset.insertSnippet);
  });

  palette.addEventListener('pointerdown', (event) => {
    const typeButton = event.target.closest('[data-insert-type]');
    const snippetButton = event.target.closest('[data-insert-snippet]');
    if (typeButton) {
      const def = BLOCK_TYPES[typeButton.dataset.insertType];
      drag.begin(event, { payload: { type: 'insert', blockType: typeButton.dataset.insertType }, label: def.label, icon: def.icon, longPressOnTouch: true });
    } else if (snippetButton) {
      const snippet = SNIPPETS.find((s) => s.id === snippetButton.dataset.insertSnippet);
      drag.begin(event, { payload: { type: 'snippet', snippetId: snippet.id }, label: snippet.name, icon: 'blocks', longPressOnTouch: true });
    }
  });
  palette.addEventListener('contextmenu', (event) => {
    if (event.target.closest('[data-insert-type], [data-insert-snippet]') && drag.dragging) event.preventDefault();
  });

  /* ================================================================ estrutura */
  function renderOutline() {
    if ($('#panel-outline').hidden) return;
    const { blocks } = store.doc;
    const selected = ui.get('selectedId');
    outline.innerHTML = blocks.map((block) => {
      const def = BLOCK_TYPES[block.type];
      const summary = blockSummary(block) || def.label;
      return `
        <li class="outline__item${block.id === selected ? ' is-selected' : ''}" data-block-id="${esc(block.id)}" data-type="${block.type}">
          <button type="button" class="icon-btn drag-handle" data-drag-handle aria-label="Mover ${esc(def.label)}: arraste ou use as setas">${icon('grip', 'icon--sm')}</button>
          <button type="button" class="outline__link" data-outline-go title="${esc(def.label)}">${icon(def.icon)}<span>${esc(summary)}</span></button>
        </li>`;
    }).join('') || '<li class="field__hint">Nenhum bloco ainda.</li>';

    const words = blocks.reduce((total, block) => total + JSON.stringify(block).replace(/"[a-zA-Z]+":/g, ' ').split(/\s+/).filter((w) => /[a-zà-ú]{2,}/i.test(w)).length, 0);
    stats.innerHTML = `
      <div><dt>Páginas</dt><dd>${ui.get('pageCount') ?? '—'}</dd></div>
      <div><dt>Blocos</dt><dd>${blocks.length}</dd></div>
      <div><dt>Palavras</dt><dd>${words.toLocaleString('pt-BR')}</dd></div>`;
  }
  const renderOutlineSoon = debounce(renderOutline, 250);

  outline.addEventListener('click', (event) => {
    const item = event.target.closest('.outline__item');
    if (item && event.target.closest('[data-outline-go]')) actions.select(item.dataset.blockId, { source: 'outline', revealEditor: true });
  });
  outline.addEventListener('keydown', (event) => {
    const item = event.target.closest('.outline__item');
    if (item && event.target.matches('[data-drag-handle]') && (event.key === 'ArrowUp' || event.key === 'ArrowDown')) {
      event.preventDefault();
      actions.moveBlockBy(item.dataset.blockId, event.key === 'ArrowUp' ? -1 : 1);
      requestAnimationFrame(() => outline.querySelector(`[data-block-id="${CSS.escape(item.dataset.blockId)}"] [data-drag-handle]`)?.focus());
    }
  });
  outline.addEventListener('pointerdown', (event) => {
    const handle = event.target.closest('[data-drag-handle]');
    const item = event.target.closest('.outline__item');
    if (handle && item) {
      const def = BLOCK_TYPES[item.dataset.type];
      drag.begin(event, { payload: { type: 'move', blockId: item.dataset.blockId }, label: def.label, icon: def.icon, source: item });
    }
  });

  /* ================================================================ design */
  const thumbHtml = (pageHtml, design, zoom = 0.115) =>
    `<div class="doc thumb" ${docAttributesHtml(design)} style="--zoom:${zoom}" aria-hidden="true">${pageHtml}</div>`;

  /**
   * Grupo de escolhas visuais (miniaturas). `variant` define o recorte:
   * "page" = página inteira; "top"/"bottom" = faixa do alto ou do pé de uma
   * página de conteúdo; "brand" = só a assinatura.
   */
  function choiceGroup({ title, name, options, variant = 'page', hint = '', id = '', extra = '' }) {
    const items = options.map((option) => {
      const value = option.id ?? option.value;
      const none = value === 'none';
      return `
      <li><label class="choice choice--${variant}" title="${esc(option.description ?? '')}">
        <input type="radio" name="design-${name}" value="${value}" data-design-key="${name}">
        <span class="choice__thumb choice__thumb--${variant}${none ? ' choice__thumb--none' : ''}" data-thumb="${name}:${value}">${none ? icon('x', 'icon--xl') : ''}</span>
        <span>${esc(option.label)}</span>
      </label></li>`;
    }).join('');
    return `<fieldset class="design-group"${id ? ` id="${id}"` : ''}><legend>${esc(title)}</legend>${hint ? `<p class="design-group__hint">${esc(hint)}</p>` : ''}<ul class="choice-grid choice-grid--${variant}">${items}</ul>${extra}</fieldset>`;
  }

  function segmentedGroup(title, key, options, hint = '') {
    const radios = options.map((o) => `<label><input type="radio" name="design-${key}" value="${o.value}" data-design-key="${key}"><span>${esc(o.label)}</span></label>`).join('');
    return `<fieldset class="design-group"><legend>${esc(title)}</legend>${hint ? `<p class="design-group__hint">${esc(hint)}</p>` : ''}<div class="segmented segmented--block">${radios}</div></fieldset>`;
  }

  // Atalhos do topo do painel: o painel é longo e o leigo procura "capa", "rodapé"...
  const DESIGN_SECTIONS = [
    ['design-presets', 'Estilos'], ['design-cover', 'Capa'], ['design-header', 'Cabeçalho'], ['design-footer', 'Rodapé'],
    ['design-back', 'Contracapa'], ['design-signature', 'Assinatura'], ['design-theme', 'Cores'], ['design-more', 'Mais'],
  ];

  function renderDesign() {
    const presets = DESIGN_PRESETS.map((preset) => {
      const theme = THEMES.find((t) => t.id === preset.design.theme);
      return `<li><button type="button" class="preset-card" data-preset="${preset.id}">
        <span class="preset-card__swatches">${theme.colors.map((c) => `<span style="background:${c}"></span>`).join('')}</span>
        <strong>${esc(preset.label)}</strong><small>${esc(preset.description)}</small>
      </button></li>`;
    }).join('');

    const swatches = THEMES.map((theme) => `
      <li><label class="swatch">
        <input type="radio" name="design-theme" value="${theme.id}" data-design-key="theme">
        <span class="swatch__colors">${theme.colors.map((c) => `<span style="background:${c}"></span>`).join('')}</span>
        <span>${esc(theme.label)}</span>
      </label></li>`).join('');

    const jump = DESIGN_SECTIONS.map(([target, label]) => `<li><a href="#${target}" data-design-jump="${target}">${esc(label)}</a></li>`).join('');

    designRoot.innerHTML = `
      <nav class="design-jump" aria-label="Ir para"><ul>${jump}</ul></nav>
      <section class="design-group" id="design-presets">
        <h3 class="design-group__title">${icon('sparkles', 'icon--sm')}Estilos prontos</h3>
        <p class="design-group__hint">Aplica capa, cores e estilos de uma vez. O conteúdo não muda.</p>
        <ul class="choice-grid choice-grid--wide">${presets}</ul>
      </section>
      ${choiceGroup({ title: 'Capa', name: 'cover', options: COVERS, id: 'design-cover' })}
      <button type="button" class="btn btn--soft btn--small design-texts-link" data-action="edit-texts">${icon('file-text', 'icon--sm')}Editar os textos da capa e da contracapa</button>
      ${choiceGroup({ title: 'Cabeçalho das páginas', name: 'header', options: DESIGN_OPTIONS.header, variant: 'top', id: 'design-header' })}
      ${choiceGroup({ title: 'Rodapé das páginas', name: 'footer', options: DESIGN_OPTIONS.footer, variant: 'bottom', id: 'design-footer', hint: 'A faixa colorida do pé das páginas, como no papel timbrado e nas páginas do MIV.' })}
      ${choiceGroup({ title: 'Contracapa', name: 'backCover', options: BACK_COVERS, id: 'design-back' })}
      ${choiceGroup({ title: 'Assinatura', name: 'signature', options: DESIGN_OPTIONS.signature, variant: 'brand', id: 'design-signature', hint: 'Usada na capa, na contracapa e no timbrado, sempre na ordem do MIV.', extra: '<div class="logo-upload" id="logo-upload"></div>' })}
      <fieldset class="design-group" id="design-theme"><legend>Tema de cores</legend><ul class="swatch-grid">${swatches}</ul></fieldset>
      <details class="design-more" id="design-more"${preferences.get('design-more-open', false) ? ' open' : ''}>
      <summary>Mais ajustes <small>títulos, cartões, numeração, abertura de capítulo, fonte e espaçamento</small></summary>
      ${segmentedGroup('Títulos de seção', 'sectionStyle', DESIGN_OPTIONS.sectionStyle)}
      ${segmentedGroup('Cartões', 'cardStyle', DESIGN_OPTIONS.cardStyle)}
      <fieldset class="design-group"><legend>Numeração</legend>
        <div class="option-list">
          <div class="segmented segmented--block">${DESIGN_OPTIONS.pageNumber.map((o) => `<label><input type="radio" name="design-pageNumber" value="${o.value}" data-design-key="pageNumber"><span>${esc(o.label)}</span></label>`).join('')}</div>
          <label class="switch"><input type="checkbox" role="switch" data-design-key="countCover"><span>Contar a capa como página 1</span></label>
          <label class="switch"><input type="checkbox" role="switch" data-design-key="numberSections"><span>Numerar as seções (01, 02…)</span></label>
        </div>
      </fieldset>
      ${segmentedGroup('Página de abertura de capítulo', 'chapterStyle', DESIGN_OPTIONS.chapterStyle, 'Vale para as seções marcadas com “Página inteira de abertura de capítulo”.')}
      ${segmentedGroup('Fonte do texto corrido', 'bodyFont', DESIGN_OPTIONS.bodyFont, 'O MIV usa Maitree no texto e Kanit nos títulos.')}
      ${segmentedGroup('Espaçamento', 'density', DESIGN_OPTIONS.density)}
      </details>`;
    $('.design-more', designRoot).addEventListener('toggle', (event) => preferences.set('design-more-open', event.target.open));
    syncDesign();
  }

  function syncDesign() {
    const { design } = store.doc;
    $$('[data-design-key]', designRoot).forEach((control) => {
      const value = design[control.dataset.designKey];
      if (control.type === 'radio') control.checked = control.value === value;
      else if (control.type === 'checkbox') control.checked = Boolean(value);
      else control.value = value;
    });
    const logo = $('#logo-upload');
    if (design.signature === 'custom') {
      const asset = assets.renderMap()[design.customLogo];
      logo.innerHTML = `
        ${asset ? `<img src="${esc(asset.url)}" alt="Logo atual" width="${asset.width}" height="${asset.height}">` : ''}
        <button type="button" class="btn btn--soft btn--small" data-action="choose-logo">${icon('upload', 'icon--sm')}${asset ? 'Trocar logo' : 'Enviar logo (PNG)'}</button>`;
    } else {
      logo.innerHTML = '';
    }
  }

  /** Página de conteúdo de amostra para as miniaturas de cabeçalho e rodapé. */
  function sampleContentPage(doc, map, idPrefix) {
    const body = '<div class="thumb-sample"><span></span><span></span><span></span></div>';
    return renderContentPage(doc, map, { bodyHtml: body, first: true, number: 1, total: 8, idPrefix, overflowing: false });
  }

  /** Miniaturas com os textos, as cores e a assinatura atuais do documento. */
  function refreshThumbnails() {
    if ($('#panel-design').hidden) return;
    const doc = store.doc;
    const map = assets.renderMap();
    $$('[data-thumb]', designRoot).forEach((slot) => {
      const [key, id] = slot.dataset.thumb.split(':');
      if (id === 'none') return;
      const preview = { ...doc, design: { ...doc.design, [key]: id } };
      const prefix = `t-${key}-${id}`;
      if (key === 'signature') {
        const placeholder = id === 'custom' && !map[doc.design.customLogo] ? '<span class="thumb-logo" aria-hidden="true">Seu logo</span>' : '';
        slot.innerHTML = `<span class="thumb-brand" aria-hidden="true">${placeholder}${brandHtml(preview.design, map)}</span>`;
        return;
      }
      const html = key === 'cover' ? renderCover(preview, map, prefix)
        : key === 'backCover' ? renderBackCover(preview, map, prefix)
          : sampleContentPage(preview, map, prefix);
      slot.innerHTML = thumbHtml(html, preview.design, key === 'header' || key === 'footer' ? 0.17 : 0.115);
    });
  }
  const refreshThumbnailsSoon = debounce(refreshThumbnails, 300);

  designRoot.addEventListener('input', (event) => {
    const control = event.target.closest('[data-design-key]');
    if (!control || (control.type === 'radio' && !control.checked)) return;
    const key = control.dataset.designKey;
    const value = readControlValue(control);
    store.update((doc) => { doc.design[key] = value; }, { kind: 'design' });
    if (key === 'signature' && value === 'custom' && !store.doc.design.customLogo) actions.chooseLogo();
  });

  designRoot.addEventListener('click', (event) => {
    const preset = event.target.closest('[data-preset]');
    if (preset) {
      const { design, label } = DESIGN_PRESETS.find((p) => p.id === preset.dataset.preset);
      store.update((doc) => Object.assign(doc.design, design), { kind: 'design' });
      actions.notify(`Estilo “${label}” aplicado.`, 'info', { undo: true });
      return;
    }
    const jump = event.target.closest('[data-design-jump]');
    if (jump) {
      event.preventDefault();
      const target = document.getElementById(jump.dataset.designJump);
      if (target.tagName === 'DETAILS') target.open = true;
      target.scrollIntoView({ block: 'start', behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth' });
      target.querySelector('summary, input, button')?.focus({ preventScroll: true });
      return;
    }
    if (event.target.closest('[data-action="choose-logo"]')) actions.chooseLogo();
    if (event.target.closest('[data-action="edit-texts"]')) actions.openPanel('document');
  });

  /* ================================================================ textos fixos */
  function renderDocumentForm() {
    documentForm.innerHTML = META_GROUPS.map((group) => `
      <section class="form-section">
        <h3>${esc(group.title)}</h3>
        ${group.fields.map((field) => fieldHtml(field, store.doc.meta[field.key], { idBase: 'meta' })).join('')}
      </section>`).join('');
  }

  function syncDocumentForm() {
    $$('[data-path]', documentForm).forEach((control) => {
      const value = store.doc.meta[control.dataset.path] ?? '';
      if (control.value !== value) control.value = value;
    });
  }

  documentForm.addEventListener('input', (event) => {
    const control = event.target.closest('[data-path]');
    if (!control) return;
    const key = control.dataset.path;
    store.update((doc) => { doc.meta[key] = control.value; }, { kind: 'meta', coalesce: `meta:${key}` });
  });
  documentForm.addEventListener('submit', (event) => event.preventDefault());
  documentForm.addEventListener('focusout', () => store.breakCoalescing());

  /* ================================================================ reações */
  store.subscribe((doc, change) => {
    if (change.kind === 'replace') {
      syncDesign();
      syncDocumentForm();
      renderOutline();
      refreshThumbnails();
      return;
    }
    if (change.kind === 'design') {
      syncDesign();
      refreshThumbnails();
    }
    if (change.kind === 'meta') refreshThumbnailsSoon();
    if (change.kind === 'structure' || change.kind === 'content' || change.kind === 'block') renderOutlineSoon();
  });

  ui.subscribe((state, changed) => {
    if (changed.includes('tab')) showTab(state.tab);
    if (changed.includes('selectedId')) {
      $$('.outline__item', outline).forEach((item) => item.classList.toggle('is-selected', item.dataset.blockId === state.selectedId));
    }
    if (changed.includes('pageCount')) renderOutlineSoon();
  });

  renderPalette();
  renderDesign();
  renderDocumentForm();
  showTab(ui.get('tab'));

  return { refreshThumbnails, syncDesign, thumbHtml };
}
