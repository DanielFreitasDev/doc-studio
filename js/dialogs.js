/**
 * Camada fina sobre recursos nativos de interface:
 * - <dialog> (foco preso, Esc e fundo inerte já vêm do navegador);
 * - Popover API para menus (fecha ao clicar fora e no Esc);
 * - avisos temporários ("toasts") anunciados por aria-live.
 */
import { $, $$ } from './utils.js';

const supportsPopover = typeof HTMLElement !== 'undefined' && 'showPopover' in HTMLElement.prototype;

/* ------------------------------------------------------------------ avisos */
/** Aviso temporário. Com ação (ex.: "Desfazer"), fica 10 s para dar tempo de ler e reagir. */
export function toast(message, { actionLabel, onAction, tone = 'info', duration = actionLabel ? 10000 : 5000 } = {}) {
  const region = $('#toast-region');
  const element = document.createElement('div');
  element.className = 'toast';
  element.dataset.tone = tone;
  element.setAttribute('role', tone === 'error' ? 'alert' : 'status');
  const text = document.createElement('p');
  text.textContent = message;
  element.append(text);

  let timer = 0;
  const close = () => {
    clearTimeout(timer);
    element.remove();
  };
  if (actionLabel && onAction) {
    const button = document.createElement('button');
    button.type = 'button';
    button.textContent = actionLabel;
    button.addEventListener('click', () => {
      onAction();
      close();
    });
    element.append(button);
  }
  region.append(element);
  // Pausa o tempo enquanto o usuário interage com o aviso.
  const start = () => { timer = setTimeout(close, duration); };
  element.addEventListener('pointerenter', () => clearTimeout(timer));
  element.addEventListener('pointerleave', start);
  element.addEventListener('focusin', () => clearTimeout(timer));
  start();
  while (region.children.length > 3) region.firstElementChild.remove();
  return close;
}

/* ------------------------------------------------------------------ diálogos */
export function openDialog(dialog, { onClose } = {}) {
  const returnFocus = document.activeElement;
  dialog.addEventListener('close', () => {
    onClose?.(dialog.returnValue);
    if (returnFocus instanceof HTMLElement && returnFocus.isConnected) returnFocus.focus();
  }, { once: true });
  dialog.returnValue = '';
  dialog.showModal();
}

/** Clique no fundo escurecido fecha o diálogo (além do Esc nativo). */
export function enableBackdropClose(dialog) {
  dialog.addEventListener('click', (event) => {
    if (event.target === dialog) dialog.close('cancel');
  });
}

export function confirmDialog({ title = 'Confirmar', message, confirmLabel = 'Confirmar', danger = true }) {
  const dialog = $('#confirm-dialog');
  $('#confirm-title').textContent = title;
  $('#confirm-message').textContent = message;
  const ok = $('#confirm-ok');
  ok.textContent = confirmLabel;
  ok.className = `btn ${danger ? 'btn--danger' : 'btn--primary'}`;
  return new Promise((resolve) => {
    openDialog(dialog, { onClose: (value) => resolve(value === 'confirm') });
  });
}

/* ------------------------------------------------------------------ popovers */
export function showPopover(element) {
  if (supportsPopover) {
    if (!element.matches(':popover-open')) element.showPopover();
  } else {
    element.hidden = false;
    element.classList.add('is-open');
  }
}

export function hidePopover(element) {
  if (supportsPopover) {
    if (element.matches(':popover-open')) element.hidePopover();
  } else {
    element.hidden = true;
    element.classList.remove('is-open');
    element.dispatchEvent(Object.assign(new Event('toggle'), { newState: 'closed' }));
  }
}

export const isPopoverOpen = (element) => (supportsPopover ? element.matches(':popover-open') : !element.hidden);

export function preparePopover(element) {
  if (!supportsPopover) {
    element.hidden = true;
    element.style.position = 'fixed';
    element.style.zIndex = '80';
    document.addEventListener('pointerdown', (event) => {
      if (!element.hidden && !element.contains(event.target)) hidePopover(element);
    });
    element.addEventListener('keydown', (event) => {
      if (event.key === 'Escape') hidePopover(element);
    });
  }
}

/**
 * Posiciona um popover junto ao elemento âncora, mantendo-o dentro da tela.
 * (Feito em JS porque o posicionamento por âncora em CSS ainda não é universal.)
 */
export function positionPopover(popover, anchor, { align = 'end', gap = 6 } = {}) {
  const anchorRect = anchor.getBoundingClientRect();
  const width = popover.offsetWidth;
  const height = popover.offsetHeight;
  const margin = 8;
  let left = align === 'end' ? anchorRect.right - width : anchorRect.left;
  left = Math.min(Math.max(margin, left), window.innerWidth - width - margin);
  let top = anchorRect.bottom + gap;
  if (top + height > window.innerHeight - margin && anchorRect.top - gap - height > margin) {
    top = anchorRect.top - gap - height;
  }
  top = Math.max(margin, Math.min(top, window.innerHeight - height - margin));
  popover.style.left = `${Math.round(left)}px`;
  popover.style.top = `${Math.round(top)}px`;
}

/**
 * Menu acessível: botão com aria-expanded, setas para navegar, Esc fecha e
 * devolve o foco ao botão. `onSelect(item)` recebe o item escolhido.
 */
export function setupMenu(menu, { onSelect }) {
  preparePopover(menu);
  let anchor = null;
  let closedAt = 0;
  const items = () => $$('[role="menuitem"]', menu).filter((item) => item.offsetParent !== null && !item.disabled);

  menu.addEventListener('toggle', (event) => {
    const open = event.newState === 'open';
    if (!open) closedAt = Date.now();
    anchor?.setAttribute('aria-expanded', String(open));
    if (!open && menu.contains(document.activeElement)) anchor?.focus();
  });

  menu.addEventListener('keydown', (event) => {
    const list = items();
    const index = list.indexOf(document.activeElement);
    const moves = { ArrowDown: index + 1, ArrowUp: index - 1, Home: 0, End: list.length - 1 };
    if (event.key in moves) {
      event.preventDefault();
      list[(moves[event.key] + list.length) % list.length]?.focus();
    } else if (event.key === 'Tab') {
      hidePopover(menu);
    }
  });

  menu.addEventListener('click', (event) => {
    const item = event.target.closest('[role="menuitem"]');
    if (!item) return;
    hidePopover(menu);
    onSelect(item, anchor);
  });

  return {
    open(trigger, { focusFirst = true } = {}) {
      anchor = trigger;
      showPopover(menu);
      positionPopover(menu, trigger);
      trigger.setAttribute('aria-expanded', 'true');
      if (focusFirst) items()[0]?.focus();
    },
    toggle(trigger, options) {
      // O clique no próprio botão já fechou o menu ("light dismiss"): não reabrir.
      const justClosed = anchor === trigger && Date.now() - closedAt < 250;
      if (isPopoverOpen(menu) && anchor === trigger) hidePopover(menu);
      else if (!justClosed) this.open(trigger, options);
    },
    close: () => hidePopover(menu),
    get anchor() { return anchor; },
  };
}
