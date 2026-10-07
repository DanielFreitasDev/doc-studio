/**
 * Edição direta na página da prévia.
 *
 * Clique duas vezes num texto da página (ou use "Editar este texto aqui" no
 * botão direito) e um campo visual abre sobre ele. Cada tecla atualiza o
 * documento e a prévia por baixo, como no editor; Enter (em campos de uma
 * linha), Esc, "Concluir" ou um clique fora fecham.
 *
 * Por que um campo flutuante e não a própria página editável: as páginas são
 * redesenhadas a cada mudança (a paginação pode levar o texto para outra
 * página). O campo fica fora delas, então o cursor nunca se perde, e a página
 * continua sendo exatamente o que vai para o PDF.
 *
 * Os trechos editáveis são marcados em js/render.js com `data-edit` (caminho
 * do campo no bloco, ex.: "items.2.title") ou `data-edit-meta` (textos da
 * capa, contracapa e cabeçalho).
 */
import { esc, getByPath, setByPath, clamp } from './utils.js';
import { BLOCK_TYPES } from './schema.js';
import { META_GROUPS } from './design.js';
import { richArea, richToolbar } from './fields.js';
import { richMarkup, setRichValue, setRichSelection, isDiscreteEdit, editRichLink, toggleRichFormat } from './richtext.js';

const supportsPopover = typeof HTMLElement !== 'undefined' && 'showPopover' in HTMLElement.prototype;
const META_FIELDS = META_GROUPS.flatMap((group) => group.fields.map((field) => ({ ...field, group: group.title })));

/** Definição do campo a partir do caminho: campo do bloco, subcampo de item ou célula de tabela. */
function fieldFor(block, path) {
  const parts = path.split('.');
  const definition = BLOCK_TYPES[block.type];
  if (block.type === 'table' && (parts[0] === 'header' || parts[0] === 'rows')) {
    const label = parts[0] === 'header' ? `Cabeçalho da coluna ${Number(parts[1]) + 1}` : `Linha ${Number(parts[1]) + 1}, coluna ${Number(parts[2]) + 1}`;
    return { kind: 'text', label };
  }
  const field = definition.fields.find((f) => f.key === parts[0]);
  if (!field) return null;
  if (field.kind === 'items' && parts.length === 3) {
    const sub = field.fields.find((f) => f.key === parts[2]);
    return sub && { ...sub, label: `${field.itemLabel ?? 'Item'} ${Number(parts[1]) + 1} · ${sub.label}` };
  }
  if (field.kind === 'code') return { ...field, kind: 'lines', plain: true, mono: true };
  return ['text', 'rich', 'lines'].includes(field.kind) ? field : null;
}

export function createQuickEdit({ store, ui, actions }) {
  const scroller = document.querySelector('#preview-scroll');
  const pages = document.querySelector('#pages');
  const panel = document.createElement('div');
  panel.className = 'quick-edit';
  panel.setAttribute('role', 'dialog');
  panel.setAttribute('aria-label', 'Editar texto na página');
  if (supportsPopover) panel.popover = 'manual';
  else panel.hidden = true;
  document.querySelector('#app').append(panel);

  let session = null; // { target: { blockId, path } | { meta }, control, anchorRect, returnFocus }

  const isOpen = () => Boolean(session);

  /** Valor atual no documento. */
  function currentValue(target) {
    if (target.meta) return store.doc.meta[target.meta] ?? '';
    const block = store.doc.blocks.find((b) => b.id === target.blockId);
    return block ? String(getByPath(block, target.path) ?? '') : null;
  }

  /** Elemento da página que mostra o campo (o mais próximo da posição original, se houver vários). */
  function findAnchor(target, near) {
    const selector = target.meta
      ? `[data-edit-meta="${CSS.escape(target.meta)}"]`
      : `.atom[data-block-id="${CSS.escape(target.blockId)}"] [data-edit="${CSS.escape(target.path)}"], .atom[data-block-id="${CSS.escape(target.blockId)}"][data-edit="${CSS.escape(target.path)}"]`;
    const candidates = [...pages.querySelectorAll(selector)];
    if (!candidates.length) return null;
    if (!near) return candidates[0];
    return candidates.reduce((best, element) => {
      const distance = Math.abs(element.getBoundingClientRect().top - near.top);
      return distance < best.distance ? { element, distance } : best;
    }, { element: candidates[0], distance: Infinity }).element;
  }

  function place() {
    if (!session) return;
    const anchor = findAnchor(session.target, session.anchorRect);
    const rect = anchor?.getBoundingClientRect() ?? session.anchorRect;
    if (anchor) session.anchorRect = rect;
    const margin = 8;
    const width = clamp(Math.max(rect.width + 24, 320), 280, Math.min(560, window.innerWidth - margin * 2));
    panel.style.width = `${width}px`;
    const height = panel.offsetHeight;
    let left = clamp(rect.left - 12, margin, window.innerWidth - width - margin);
    // Abaixo do trecho; se não couber, acima; no limite, dentro da tela.
    let top = rect.bottom + 8;
    if (top + height > window.innerHeight - margin) top = rect.top - height - 8;
    top = clamp(top, margin, Math.max(margin, window.innerHeight - height - margin));
    panel.style.left = `${Math.round(left)}px`;
    panel.style.top = `${Math.round(top)}px`;
    pages.querySelectorAll('.is-quick-editing').forEach((element) => element.classList.remove('is-quick-editing'));
    anchor?.classList.add('is-quick-editing');
  }

  function controlHtml(field, value) {
    const id = 'quick-edit-field';
    if (field.plain) {
      return field.kind === 'lines'
        ? `<textarea class="textarea${field.mono ? ' textarea--mono' : ''}" id="${id}" rows="${field.rows ?? 2}" aria-labelledby="quick-edit-label"${field.mono ? ' spellcheck="false"' : ''}>${esc(value)}</textarea>`
        : `<input class="input" id="${id}" type="text" value="${esc(value)}" aria-labelledby="quick-edit-label" autocomplete="off" enterkeyhint="done">`;
    }
    const mode = field.kind === 'rich' ? 'multi' : field.kind === 'lines' ? 'lines' : 'single';
    const area = richArea(value, { id, path: 'quick', mode, labelledBy: 'quick-edit-label', rows: mode === 'single' ? 0 : Math.min(field.rows ?? 3, 6) });
    return `<div class="rich rich--${mode}">${richToolbar(id, field.label)}${area}</div>`;
  }

  function open(target, anchor) {
    close({ restoreFocus: false });
    let field;
    let title;
    if (target.meta) {
      field = META_FIELDS.find((f) => f.key === target.meta);
      title = field?.group;
    } else {
      const block = store.doc.blocks.find((b) => b.id === target.blockId);
      if (!block) return false;
      field = fieldFor(block, target.path);
      title = BLOCK_TYPES[block.type].label;
      ui.set({ selectedId: block.id, selectSource: 'preview' });
    }
    const value = currentValue(target);
    if (!field || value === null) return false;

    const multiline = field.kind !== 'text';
    panel.innerHTML = `
      <div class="quick-edit__head">
        <span class="quick-edit__title"><strong>${esc(title ?? '')}</strong> · <span id="quick-edit-label">${esc(field.label)}</span></span>
      </div>
      ${controlHtml(field, value)}
      <div class="quick-edit__foot">
        <span class="quick-edit__hint">${multiline ? 'Esc ou clique fora para concluir' : 'Enter para concluir'} · as mudanças já estão na página</span>
        ${target.meta ? '' : '<button type="button" class="btn btn--ghost btn--small" data-quick="editor">Abrir no editor</button>'}
        <button type="button" class="btn btn--primary btn--small" data-quick="done">Concluir</button>
      </div>`;
    const control = panel.querySelector('#quick-edit-field');
    session = { target, control, field, anchorRect: anchor.getBoundingClientRect(), returnFocus: document.activeElement };
    if (supportsPopover) panel.showPopover();
    else panel.hidden = false;
    place();
    if (control.dataset.rich) {
      control.focus({ preventScroll: true });
      const length = control.textContent.length + control.querySelectorAll('br').length;
      setRichSelection(control, [length, length]);
    } else {
      control.focus({ preventScroll: true });
      control.select?.();
    }
    store.breakCoalescing();
    actions.announce(`Editando ${field.label}. Esc conclui.`);
    return true;
  }

  function close({ restoreFocus = true } = {}) {
    if (!session) return;
    const { returnFocus } = session;
    session = null;
    store.breakCoalescing();
    pages.querySelectorAll('.is-quick-editing').forEach((element) => element.classList.remove('is-quick-editing'));
    if (supportsPopover) { if (panel.matches(':popover-open')) panel.hidePopover(); } else panel.hidden = true;
    panel.innerHTML = '';
    if (restoreFocus) (returnFocus?.isConnected && returnFocus !== document.body ? returnFocus : scroller).focus({ preventScroll: true });
  }

  /** Grava o valor digitado no documento (a prévia e o editor se atualizam). */
  function commit(event) {
    if (!session) return;
    const { target, control } = session;
    const value = control.dataset.rich ? richMarkup(control) : control.value;
    if (value === currentValue(target)) return;
    const discrete = isDiscreteEdit(event);
    if (discrete) store.breakCoalescing();
    if (target.meta) {
      store.update((doc) => { doc.meta[target.meta] = value; }, { kind: 'meta', source: 'quick', coalesce: discrete ? null : `meta:${target.meta}` });
    } else {
      store.update((doc) => {
        const block = doc.blocks.find((b) => b.id === target.blockId);
        if (block) setByPath(block, target.path, value);
      }, { kind: 'content', blockId: target.blockId, path: target.path, source: 'quick', coalesce: discrete ? null : `${target.blockId}:${target.path}` });
    }
  }

  panel.addEventListener('input', commit);
  panel.addEventListener('pointerdown', (event) => {
    // Botões da barra não tiram o foco do texto.
    if (event.target.closest('.rich__toolbar button')) event.preventDefault();
  });
  panel.addEventListener('click', (event) => {
    const format = event.target.closest('[data-format]');
    if (format && session?.control.dataset.rich) {
      if (format.dataset.format === 'link') editRichLink(session.control);
      else toggleRichFormat(session.control, format.dataset.format);
      return;
    }
    const action = event.target.closest('[data-quick]')?.dataset.quick;
    if (action === 'done') close();
    if (action === 'editor' && session) {
      const { blockId } = session.target;
      close({ restoreFocus: false });
      actions.select(blockId, { source: 'preview', revealEditor: true, focus: true });
    }
  });
  panel.addEventListener('keydown', (event) => {
    if (event.key === 'Escape') {
      event.preventDefault();
      event.stopPropagation();
      close();
    } else if (event.key === 'Enter' && !event.shiftKey && session?.field.kind === 'text' && event.target === session.control) {
      event.preventDefault();
      close();
    } else if (event.key === 'Tab') {
      // Foco preso no painel enquanto ele está aberto (como num diálogo).
      const focusable = [...panel.querySelectorAll('[contenteditable="true"], input, textarea, button:not([tabindex="-1"])')].filter((el) => el.offsetParent !== null);
      const first = focusable[0];
      const last = focusable.at(-1);
      if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); }
      else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
    }
  });

  // Clique fora conclui (o link e a confirmação abrem diálogos: eles não contam como "fora").
  document.addEventListener('pointerdown', (event) => {
    if (!session || panel.contains(event.target) || event.target.closest?.('dialog[open], .context-menu')) return;
    close({ restoreFocus: false });
  }, true);

  // Desfazer/refazer ou edição no editor: o campo mostra o valor atual.
  store.subscribe((doc, change) => {
    if (!session) return;
    const value = currentValue(session.target);
    if (value === null) { close({ restoreFocus: false }); return; }
    if (change.source !== 'quick') {
      const { control } = session;
      if (control.dataset.rich) setRichValue(control, value);
      else if (control.value !== value) control.value = value;
    }
    requestAnimationFrame(place);
  });

  scroller.addEventListener('scroll', () => requestAnimationFrame(place), { passive: true });
  window.addEventListener('resize', () => requestAnimationFrame(place));
  ui.subscribe((state, changed) => {
    if (session && (changed.includes('zoom') || changed.includes('zoomFit') || changed.includes('view') || changed.includes('pane'))) {
      requestAnimationFrame(place);
    }
  });

  /** Destino de edição de um elemento da página, ou null. */
  function targetOf(element) {
    const meta = element.closest?.('[data-edit-meta]');
    if (meta && pages.contains(meta)) return { target: { meta: meta.dataset.editMeta }, anchor: meta };
    const edit = element.closest?.('[data-edit]');
    const atom = edit?.closest('.atom[data-block-id]');
    if (edit && atom && pages.contains(atom)) return { target: { blockId: atom.dataset.blockId, path: edit.dataset.edit }, anchor: edit };
    return null;
  }

  return {
    isOpen,
    close,
    targetOf,
    /** Abre a edição do trecho (duplo clique na página e menu de contexto). Retorna false se não há texto ali. */
    editAt(element) {
      const found = targetOf(element);
      if (!found) return false;
      window.getSelection()?.removeAllRanges();
      return open(found.target, found.anchor);
    },
    contains: (element) => panel.contains(element),
  };
}
