/**
 * Barra de formatação flutuante: aparece sobre o texto selecionado nos campos
 * visuais de uma linha (títulos, células de tabela…), que não têm a barra fixa
 * dos campos de várias linhas. Os mesmos comandos continuam no botão direito
 * e nos atalhos (Ctrl+B, Ctrl+I, Ctrl+U, Ctrl+K), que são o caminho pelo
 * teclado; por isso os botões daqui não entram na ordem do Tab.
 */
import { icon } from './utils.js';
import { TOOLBAR_FORMATS } from './fields.js';
import { richFieldOf, richFormatState, toggleRichFormat, editRichLink } from './richtext.js';

const supportsPopover = typeof HTMLElement !== 'undefined' && 'showPopover' in HTMLElement.prototype;

export function setupFormatBar() {
  const bar = document.createElement('div');
  bar.className = 'format-bubble';
  bar.setAttribute('role', 'toolbar');
  bar.setAttribute('aria-label', 'Formatar o texto selecionado');
  if (supportsPopover) bar.popover = 'manual';
  else bar.hidden = true;
  bar.innerHTML = TOOLBAR_FORMATS.map((format) => {
    const shortcut = format.key ? ` (Ctrl+${format.key.toUpperCase()})` : '';
    return `<button type="button" class="icon-btn icon-btn--sm" data-format="${format.name}" tabindex="-1" aria-pressed="false" aria-label="${format.label}${shortcut}" title="${format.label}${shortcut}">${icon(format.icon)}</button>`;
  }).join('');
  document.body.append(bar);

  let field = null;
  let frame = 0;

  const isShown = () => (supportsPopover ? bar.matches(':popover-open') : !bar.hidden);
  const hide = () => {
    field = null;
    if (!isShown()) return;
    if (supportsPopover) bar.hidePopover();
    else bar.hidden = true;
  };

  function update() {
    frame = 0;
    const selection = window.getSelection();
    const target = selection?.rangeCount && !selection.isCollapsed ? richFieldOf(selection.anchorNode) : null;
    const hasFixedToolbar = target?.id && document.querySelector(`.rich__toolbar[aria-controls="${CSS.escape(target.id)}"]`);
    if (!target || hasFixedToolbar || document.activeElement !== target || target.closest('dialog:not([open])')) {
      hide();
      return;
    }
    field = target;
    // Mora junto do campo: dentro de um diálogo modal, fora dele ficaria inerte.
    const host = target.closest('dialog[open]') ?? document.body;
    if (bar.parentElement !== host) {
      if (isShown()) { if (supportsPopover) bar.hidePopover(); else bar.hidden = true; }
      host.append(bar);
    }
    if (!isShown()) {
      if (supportsPopover) bar.showPopover();
      else bar.hidden = false;
    }
    const state = richFormatState(target);
    bar.querySelectorAll('[data-format]').forEach((button) => {
      const name = button.dataset.format;
      button.setAttribute('aria-pressed', String(Boolean(state[name])));
    });
    const rect = selection.getRangeAt(0).getBoundingClientRect();
    const width = bar.offsetWidth;
    const height = bar.offsetHeight;
    const left = Math.min(Math.max(8, rect.left + rect.width / 2 - width / 2), window.innerWidth - width - 8);
    const top = rect.top - height - 8 >= 8 ? rect.top - height - 8 : rect.bottom + 8;
    bar.style.left = `${Math.round(left)}px`;
    bar.style.top = `${Math.round(top)}px`;
  }

  const schedule = () => { if (!frame) frame = requestAnimationFrame(update); };
  document.addEventListener('selectionchange', schedule);
  document.addEventListener('focusout', schedule);
  window.addEventListener('resize', hide);
  document.addEventListener('scroll', schedule, { capture: true, passive: true });

  bar.addEventListener('pointerdown', (event) => event.preventDefault());
  bar.addEventListener('click', (event) => {
    const button = event.target.closest('[data-format]');
    if (!button || !field) return;
    const target = field;
    if (button.dataset.format === 'link') {
      hide();
      editRichLink(target);
    } else {
      toggleRichFormat(target, button.dataset.format);
      schedule();
    }
  });
}
