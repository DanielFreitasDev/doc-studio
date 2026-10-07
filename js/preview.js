/**
 * Prévia das páginas A4 (coluna da direita) e exportação para PDF.
 *
 * A cada alteração o layout é recalculado (com um pequeno atraso para não
 * trabalhar a cada tecla) e só as páginas cujo HTML mudou são substituídas,
 * o que mantém a rolagem estável e evita piscar imagens.
 */
import { $, $$, debounce, clamp, prefersReducedMotion } from './utils.js';
import { applyDocAttributes, DESIGN_OPTIONS } from './design.js';
import { layoutDocument } from './paginate.js';
import { BLOCK_TYPES, createBlock } from './schema.js';
import { keys, writeClipboard } from './textmenu.js';

const MM = 96 / 25.4;
const ZOOM_STEPS = [0.25, 0.33, 0.4, 0.5, 0.6, 0.75, 0.9, 1, 1.25, 1.5, 2];

export function createPreview({ store, ui, assets, actions }) {
  const pagesEl = $('#pages');
  const scroller = $('#preview-scroll');
  const measureDoc = $('#measure-doc');
  const measureBody = $('#measure-body');
  const info = $('#page-info');
  const zoomOutput = $('#zoom-value');
  const fitButton = $('[data-action="zoom-fit"]');
  const columnCache = new Map();
  let pageHtml = [];
  let layout = null;
  let currentPage = 1;

  /* ---------------------------------------------------------------- renderização */
  function renderNow() {
    // Sem largura, a área de medição devolveria alturas zero e juntaria páginas: mantém o último layout.
    if (!measureBody.getBoundingClientRect().width) return;
    const doc = store.doc;
    applyDocAttributes(pagesEl, doc.design);
    applyDocAttributes(measureDoc, doc.design);
    layout = layoutDocument(doc, assets.renderMap(), measureBody, columnCache);
    const hadLandscape = Boolean(pagesEl.querySelector('.page--landscape'));
    patchPages(layout.pagesHtml);
    if (ui.get('zoomFit') && hadLandscape !== Boolean(pagesEl.querySelector('.page--landscape'))) applyZoom();
    highlightSelection();

    const overflowKey = [...layout.overflowBlocks].sort().join('|');
    const currentKey = [...ui.get('overflowBlocks')].sort().join('|');
    if (overflowKey !== currentKey) ui.set({ overflowBlocks: new Set(layout.overflowBlocks) });
    ui.set({ pageCount: layout.pagesHtml.length });
    updateInfo();
  }

  const schedule = debounce(renderNow, 140);

  /** Substitui apenas as páginas alteradas. */
  function patchPages(htmlList) {
    const template = document.createElement('template');
    htmlList.forEach((html, index) => {
      if (pageHtml[index] === html && pagesEl.children[index]) return;
      template.innerHTML = html.trim();
      const page = template.content.firstElementChild;
      page.dataset.index = String(index);
      const existing = pagesEl.children[index];
      if (existing) existing.replaceWith(page);
      else pagesEl.append(page);
      observer?.observe(page);
    });
    while (pagesEl.children.length > htmlList.length) pagesEl.lastElementChild.remove();
    pageHtml = htmlList.slice();
  }

  /* ---------------------------------------------------------------- página atual */
  const visibility = new Map();
  const observer = 'IntersectionObserver' in window
    ? new IntersectionObserver((entries) => {
      entries.forEach((entry) => visibility.set(entry.target, entry.intersectionRatio));
      let best = null;
      let bestRatio = 0;
      for (const [page, ratio] of visibility) {
        if (!page.isConnected) { visibility.delete(page); continue; }
        if (ratio > bestRatio) { best = page; bestRatio = ratio; }
      }
      if (best) {
        currentPage = Number(best.dataset.index) + 1;
        updateInfo();
      }
    }, { root: scroller, threshold: [0, 0.25, 0.5, 0.75, 1] })
    : null;

  function updateInfo() {
    const total = pageHtml.length;
    info.textContent = total ? `Página ${Math.min(currentPage, total)} de ${total}` : 'Sem páginas';
  }

  /* ---------------------------------------------------------------- zoom */
  /** "Ajustar à largura" cabe a página mais larga (297 mm se houver páginas em paisagem). */
  function fitZoom() {
    const available = scroller.clientWidth - 32;
    const widest = (pagesEl.querySelector('.page--landscape') ? 297 : 210) * MM;
    return clamp(available / widest, 0.2, 1.25);
  }

  function applyZoom() {
    const zoom = ui.get('zoomFit') ? fitZoom() : ui.get('zoom');
    pagesEl.style.setProperty('--zoom', zoom.toFixed(3));
    zoomOutput.textContent = `${Math.round(zoom * 100)}%`;
    fitButton.setAttribute('aria-pressed', String(ui.get('zoomFit')));
  }

  function stepZoom(direction) {
    const current = ui.get('zoomFit') ? fitZoom() : ui.get('zoom');
    const next = direction > 0
      ? ZOOM_STEPS.find((step) => step > current + 0.01) ?? ZOOM_STEPS.at(-1)
      : [...ZOOM_STEPS].reverse().find((step) => step < current - 0.01) ?? ZOOM_STEPS[0];
    ui.set({ zoom: next, zoomFit: false });
  }

  new ResizeObserver(() => { if (ui.get('zoomFit')) applyZoom(); }).observe(scroller);

  /* ---------------------------------------------------------------- seleção */
  function highlightSelection() {
    const ids = new Set(ui.get('selectedIds'));
    if (ui.get('selectedId')) ids.add(ui.get('selectedId'));
    $$('.atom.is-selected', pagesEl).forEach((el) => el.classList.remove('is-selected'));
    ids.forEach((id) => $$(`.atom[data-block-id="${CSS.escape(id)}"]`, pagesEl).forEach((el) => el.classList.add('is-selected')));
  }

  function revealBlock(id) {
    const target = pagesEl.querySelector(`.atom[data-block-id="${CSS.escape(id)}"]`);
    if (!target || scroller.offsetParent === null) return;
    const box = target.getBoundingClientRect();
    const view = scroller.getBoundingClientRect();
    if (box.top >= view.top + 40 && box.bottom <= view.bottom - 20) return;
    scroller.scrollTo({
      top: scroller.scrollTop + (box.top - view.top) - view.height / 3,
      behavior: prefersReducedMotion() ? 'auto' : 'smooth',
    });
  }

  pagesEl.addEventListener('click', (event) => {
    // Links da página não navegam na prévia (no PDF continuam clicáveis).
    if (event.target.closest('a[href]')) event.preventDefault();
    const atom = event.target.closest('.atom[data-block-id]');
    if (atom && actions.selection?.handleClick(event, atom.dataset.blockId)) return;
    // No celular (uma área por vez), tocar num texto edita ali mesmo, sem trocar para o editor.
    if (matchMedia('(max-width: 759.98px)').matches && actions.editInPage?.(event.target)) return;
    if (atom) {
      actions.select(atom.dataset.blockId, { source: 'preview', revealEditor: true });
      return;
    }
    const page = event.target.closest('.page[data-target]');
    if (page) actions.openPanel('document');
  });

  pagesEl.addEventListener('dblclick', (event) => {
    // Duplo clique num texto: edição direta na página (js/quickedit.js).
    if (actions.editInPage?.(event.target)) {
      event.preventDefault();
      return;
    }
    const atom = event.target.closest('.atom[data-block-id]');
    if (atom) actions.select(atom.dataset.blockId, { source: 'preview', revealEditor: true, focus: true });
  });

  /* ---------------------------------------------------------------- impressão / PDF */
  function print() {
    schedule.cancel();
    renderNow();
    const previousTitle = document.title;
    // O título vira o nome sugerido do PDF: mantém o nome legível, sem os caracteres proibidos em arquivos.
    document.title = store.doc.name.replace(/[\\/:*?"<>|]+/g, ' ').replace(/\s+/g, ' ').trim() || 'documento';
    const restore = () => { document.title = previousTitle; };
    window.addEventListener('afterprint', restore, { once: true });
    window.print();
    setTimeout(restore, 1500);
  }

  // Impressão pelo menu do navegador também recebe a versão mais recente.
  window.addEventListener('beforeprint', () => {
    schedule.cancel();
    renderNow();
  });

  /* ---------------------------------------------------------------- menu de contexto */
  function viewItems() {
    const fit = ui.get('zoomFit');
    return [
      { label: 'Aumentar zoom', icon: 'zoom-in', run: () => stepZoom(1) },
      { label: 'Diminuir zoom', icon: 'zoom-out', run: () => stepZoom(-1) },
      { label: 'Ajustar à largura', icon: 'fit', checked: fit, run: () => ui.set({ zoomFit: !fit }) },
      { separator: true },
      { label: 'Exportar PDF', icon: 'printer', shortcut: keys('Ctrl+P'), run: () => actions.exportPdf() },
    ];
  }

  /** Parte da página que foi clicada: capa, contracapa, cabeçalho ou rodapé. */
  function regionOf(target) {
    if (target.closest('.page--cover')) return 'cover';
    if (target.closest('.page--back')) return 'back';
    if (target.closest('.page__header, .page__header-art')) return 'header';
    if (target.closest('.page__footer, .page__number')) return 'footer';
    return null;
  }

  /**
   * Provedor do menu de contexto da prévia: o bloco clicado (com "Copiar" se
   * houver texto selecionado), as partes fixas da página e o zoom.
   */
  function contextMenu(target) {
    if (!scroller.contains(target)) return null;
    const selection = window.getSelection();
    const selected = selection && !selection.isCollapsed && pagesEl.contains(selection.anchorNode) ? selection.toString().trim() : '';
    const copy = selected
      ? [{ label: 'Copiar', icon: 'copy', shortcut: keys('Ctrl+C'), run: () => writeClipboard(selected) }, { separator: true }]
      : [];

    // Texto da página: edição direta (o mesmo do duplo clique).
    const editable = target.closest('[data-edit], [data-edit-meta]');
    const edit = editable
      ? [{ label: 'Editar este texto aqui', icon: 'pen', shortcut: 'Duplo clique', run: () => actions.editInPage(editable) }, { separator: true }]
      : [];

    const atom = target.closest('.atom[data-block-id]');
    const block = atom && store.doc.blocks.find((b) => b.id === atom.dataset.blockId);
    if (block) {
      const definition = BLOCK_TYPES[block.type];
      actions.select(block.id, { source: 'preview' });
      return { title: definition.label, icon: definition.icon, items: [...copy, ...edit, ...actions.blockMenuItems(block.id, { anchor: atom, origin: 'preview' })] };
    }

    const region = regionOf(target);
    const part = region && actions.designMenu(region);
    if (part) return { ...part, items: [...copy, ...edit, ...part.items] };

    const page = target.closest('.page[data-index]');
    return {
      title: page ? `Página ${Number(page.dataset.index) + 1} de ${pageHtml.length}` : 'Prévia',
      icon: 'eye',
      items: [...copy, ...(page?.classList.contains('page--content') ? pageItems(page) : []), ...viewItems()],
    };
  }

  /**
   * Ações da página de conteúdo. O documento é um fluxo de blocos (as páginas
   * são calculadas), então "a página" é o conjunto de blocos que aparecem
   * nela: dá para selecioná-los (e usar a barra da seleção), duplicá-los ou
   * excluí-los, e criar uma página nova com uma quebra de página.
   */
  function pageItems(page) {
    const blocks = store.doc.blocks;
    const onPage = [...new Set([...page.querySelectorAll('.atom[data-block-id]')].map((atom) => atom.dataset.blockId))];
    // Blocos que estão inteiros nesta página (não continuam em outra).
    const whole = onPage.filter((id) => [...pagesEl.querySelectorAll(`.atom[data-block-id="${CSS.escape(id)}"]`)].every((atom) => atom.closest('.page') === page));
    const lastIndex = Math.max(-1, ...onPage.map((id) => blocks.findIndex((b) => b.id === id)));
    const after = lastIndex >= 0 ? lastIndex + 1 : blocks.length;
    const { design } = store.doc;
    const radio = (key, options) => options.map((option) => ({
      label: option.label, radio: true, checked: design[key] === option.value, run: () => actions.setDesign(key, option.value),
    }));
    const current = (key, options) => options.find((option) => option.value === design[key])?.label;
    return [
      { label: 'Nova página depois desta', icon: 'pagebreak', run: () => actions.insertType('pagebreak', after) },
      page.classList.contains('page--landscape')
        ? { label: 'Voltar a retrato depois desta', icon: 'pagebreak', run: () => actions.insertBlocks([createBlock('pagebreak', { orientation: 'portrait' })], after, { focus: false }) }
        : { label: 'Páginas em paisagem depois desta', icon: 'pagebreak', run: () => actions.insertBlocks([createBlock('pagebreak', { orientation: 'landscape' })], after, { focus: false }) },
      { label: 'Inserir bloco no fim desta página', icon: 'plus', run: () => actions.openPicker(page, { index: after }) },
      { separator: true },
      { label: 'Selecionar os blocos desta página', icon: 'select-all', disabled: !onPage.length, run: () => actions.selection.select(onPage) },
      { label: 'Duplicar o conteúdo da página', icon: 'copy', disabled: !whole.length, run: () => actions.duplicatePage(whole) },
      { label: 'Excluir o conteúdo da página', icon: 'trash', danger: true, disabled: !whole.length, run: () => actions.selection.removeMany(whole) },
      { separator: true },
      { label: 'Cabeçalho das páginas', icon: 'layout', hint: current('header', DESIGN_OPTIONS.header), submenu: radio('header', DESIGN_OPTIONS.header) },
      { label: 'Rodapé das páginas', icon: 'layout', hint: current('footer', DESIGN_OPTIONS.footer), submenu: radio('footer', DESIGN_OPTIONS.footer) },
      { label: 'Numeração', icon: 'outline', hint: current('pageNumber', DESIGN_OPTIONS.pageNumber), submenu: radio('pageNumber', DESIGN_OPTIONS.pageNumber) },
      { separator: true },
    ];
  }

  /* ---------------------------------------------------------------- relatório das páginas */
  /**
   * O que caiu em cada página (para "Verificar documento" e agentes de IA):
   * tipo de página, orientação, ids dos blocos, ocupação da área útil (0–1),
   * estouro e palavras. A ocupação é uma razão, então o zoom não interfere.
   */
  function pageReport() {
    return [...pagesEl.children].map((page, index) => {
      const kind = ['cover', 'back', 'chapter'].find((name) => page.classList.contains(`page--${name}`)) ?? 'content';
      const blocks = [...new Set([...page.querySelectorAll('[data-block-id]')].map((el) => el.dataset.blockId))];
      const body = page.querySelector('.page__body');
      let fill = null;
      if (body) {
        const top = body.getBoundingClientRect().top;
        const height = body.getBoundingClientRect().height || 1;
        const bottom = Math.max(top, ...[...body.children].map((el) => el.getBoundingClientRect().bottom));
        fill = Math.round(((bottom - top) / height) * 100) / 100;
      }
      const words = (page.textContent.match(/[\p{L}\p{N}]+/gu) ?? []).length;
      return {
        number: index + 1,
        kind,
        orientation: page.classList.contains('page--landscape') ? 'landscape' : 'portrait',
        blocks,
        fill,
        words,
        overflowing: page.classList.contains('is-overflowing'),
      };
    });
  }

  /* ---------------------------------------------------------------- assinaturas */
  store.subscribe((doc, change) => {
    if (change.kind === 'name') return;
    if (change.kind === 'replace' || change.kind === 'design') renderNow();
    else schedule();
  });

  ui.subscribe((state, changed) => {
    if (changed.includes('selectedIds') && !changed.includes('selectedId')) highlightSelection();
    if (changed.includes('selectedId')) {
      highlightSelection();
      if (state.selectedId && state.selectSource !== 'preview') revealBlock(state.selectedId);
    }
    if (changed.includes('zoom') || changed.includes('zoomFit')) applyZoom();
    if (changed.includes('view') || changed.includes('pane') || changed.includes('panelOpen')) {
      requestAnimationFrame(() => { applyZoom(); if (state.selectedId) revealBlock(state.selectedId); });
    }
  });

  document.fonts?.addEventListener?.('loadingdone', () => schedule());

  applyZoom();
  renderNow();

  return {
    renderNow,
    print,
    zoomIn: () => stepZoom(1),
    zoomOut: () => stepZoom(-1),
    zoomFit: () => ui.set({ zoomFit: true }),
    revealBlock,
    contextMenu,
    pageReport,
    get layout() { return layout; },
  };
}
