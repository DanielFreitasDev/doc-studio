/**
 * Menu de contexto próprio (botão direito, tecla Menu ou Shift+F10).
 *
 * Arquitetura: elemento → contexto → ações → menu.
 * Cada módulo registra um "provedor" com `register(provider)`. No clique com
 * o botão direito, os provedores são consultados em ordem; o primeiro que
 * reconhecer o elemento devolve `{ title, icon, items }` e o menu abre. Se
 * nenhum reconhecer, o menu do navegador continua normal (nada é bloqueado
 * à toa). Shift + botão direito sempre abre o menu do navegador.
 *
 * Formato de um item:
 *   { label, icon, shortcut, mark, run, disabled, danger, checked, radio, swatch, hint, submenu }
 *   (`shortcut` = atalho de teclado; `mark` = marcação equivalente, ex.: "##")
 *   { separator: true }        separador
 *   { heading: 'Texto' }       rótulo de grupo
 *   { row: [itens], label }    fila de botões só com ícone (ex.: formatação)
 *
 * As ações dos itens chamam as mesmas funções dos botões e menus existentes;
 * o menu não tem regra de negócio própria.
 *
 * Interação: setas, Home/End, Enter/Espaço, → abre submenu, ← volta, Esc
 * fecha e devolve o foco, letra inicial pula para o item. Em telas estreitas
 * ou por toque longo, o menu vira uma folha inferior ("bottom sheet") e os
 * submenus abrem dentro dela, com "Voltar".
 */
import { esc, icon } from './utils.js';

const supportsPopover = typeof HTMLElement !== 'undefined' && 'showPopover' in HTMLElement.prototype;
const MARGIN = 8;
const SUBMENU_DELAY = 140;
const SHEET_QUERY = '(max-width: 559.98px)';

/** Campos onde se digita texto (onde o toque longo deve manter a seleção nativa do sistema). */
export function isTextField(element) {
  if (element instanceof HTMLTextAreaElement) return !element.readOnly && !element.disabled;
  return element instanceof HTMLInputElement && !element.readOnly && !element.disabled &&
    ['text', 'search', 'url', 'email', 'tel', ''].includes(element.type);
}

function createSurface(id, label) {
  const element = document.createElement('div');
  element.className = 'menu context-menu';
  element.id = id;
  element.setAttribute('role', 'menu');
  element.setAttribute('aria-label', label);
  element.tabIndex = -1;
  if (supportsPopover) element.popover = 'manual';
  else element.hidden = true;
  return element;
}

const show = (element) => {
  if (supportsPopover) { if (!element.matches(':popover-open')) element.showPopover(); } else element.hidden = false;
};
const hide = (element) => {
  if (supportsPopover) { if (element.matches(':popover-open')) element.hidePopover(); } else element.hidden = true;
};
const isShown = (element) => (supportsPopover ? element.matches(':popover-open') : !element.hidden);

export function createContextMenu({ isBusy = () => false } = {}) {
  const host = document.getElementById('app') ?? document.body;
  const menu = createSurface('context-menu', 'Ações');
  const submenu = createSurface('context-submenu', 'Mais ações');
  menu.append(submenu); // dentro do menu: o clique no submenu conta como clique "dentro"
  host.append(menu);

  const providers = [];
  let session = null; // { returnFocus, sheet, stack: [{ title, items }] }
  let lastPointer = { type: 'mouse', at: 0 };
  let hoverTimer = 0;
  let typeahead = { text: '', at: 0 };

  /* ---------------------------------------------------------------- renderização */
  function itemHtml(item, key, inRow = false) {
    const role = item.radio ? 'menuitemradio' : item.checked !== undefined ? 'menuitemcheckbox' : 'menuitem';
    const attrs = [
      `type="button"`, `role="${role}"`, `tabindex="-1"`, `data-key="${key}"`,
      item.checked !== undefined ? `aria-checked="${Boolean(item.checked)}"` : '',
      item.disabled ? 'aria-disabled="true"' : '',
      item.submenu ? 'aria-haspopup="menu" aria-expanded="false"' : '',
      item.danger ? 'data-danger' : '',
    ].filter(Boolean);
    const shortcut = item.shortcut ? ` (${item.shortcut})` : '';
    if (inRow) {
      return `<button ${attrs.join(' ')} class="context-menu__tool" aria-label="${esc(item.label)}${esc(shortcut)}" title="${esc(item.label)}${esc(shortcut)}">${icon(item.icon)}</button>`;
    }
    // Marca de escolhido: à esquerda quando o item não tem ícone; senão, à direita.
    const checkable = item.checked !== undefined;
    const mark = `<span class="context-menu__check" aria-hidden="true">${icon('check', 'icon--sm')}</span>`;
    const lead = item.swatch
      ? `<span class="context-menu__swatch" style="--swatch:${esc(item.swatch)}" aria-hidden="true"></span>`
      : item.icon ? icon(item.icon) : checkable ? mark : '<span class="context-menu__blank" aria-hidden="true"></span>';
    const check = checkable && (item.swatch || item.icon) ? mark : '';
    const tail = item.submenu
      ? icon('chevron-right', 'icon--sm context-menu__chevron')
      : item.shortcut ? `<kbd class="context-menu__key">${esc(item.shortcut)}</kbd>`
        : item.mark ? `<code class="context-menu__mark">${esc(item.mark)}</code>` : '';
    return `<button ${attrs.join(' ')} class="context-menu__item">${lead}<span class="context-menu__label">${esc(item.label)}${item.hint ? `<small>${esc(item.hint)}</small>` : ''}</span>${check}${tail}</button>`;
  }

  /** Monta a lista; `registry` guarda os itens por chave para o clique. */
  function listHtml(items, registry, prefix) {
    const clean = tidy(items);
    return clean.map((item, index) => {
      const key = `${prefix}${index}`;
      if (item.separator) return '<hr role="separator">';
      if (item.heading) return `<p class="context-menu__heading" role="presentation">${esc(item.heading)}</p>`;
      if (item.row) {
        const tools = item.row.map((tool, i) => {
          registry.set(`${key}-${i}`, tool);
          return itemHtml(tool, `${key}-${i}`, true);
        }).join('');
        return `<div class="context-menu__row" role="group" aria-label="${esc(item.label ?? '')}">${tools}</div>`;
      }
      registry.set(key, item);
      return itemHtml(item, key);
    }).join('');
  }

  /** Remove separadores duplicados, no início ou no fim (itens condicionais deixam "buracos"). */
  function tidy(items) {
    const list = items.filter(Boolean);
    return list.filter((item, index) => {
      if (!item.separator) return true;
      const prev = list.slice(0, index).reverse().find((i) => !i.heading);
      const next = list.slice(index + 1).find(Boolean);
      return prev && !prev.separator && next && !next.separator;
    });
  }

  function headerHtml(spec, { back = false } = {}) {
    if (!spec.title && !back) return '';
    const lead = back
      ? `<button type="button" role="menuitem" tabindex="-1" class="context-menu__back" data-key="back">${icon('chevron-left', 'icon--sm')}<span>Voltar</span></button>`
      : '';
    const title = spec.title ? `<p class="context-menu__title" role="presentation">${spec.icon ? icon(spec.icon, 'icon--sm') : ''}<span>${esc(spec.title)}</span></p>` : '';
    return `<div class="context-menu__header">${lead}${title}</div>`;
  }

  function fill(surface, spec, options = {}) {
    const registry = new Map();
    const footer = spec.footer ? `<p class="context-menu__footer" role="presentation">${esc(spec.footer)}</p>` : '';
    surface.querySelectorAll(':scope > :not(.context-menu)').forEach((node) => node.remove());
    surface.insertAdjacentHTML('afterbegin', `${headerHtml(spec, options)}<div class="context-menu__list">${listHtml(spec.items, registry, options.prefix ?? 'm')}</div>${footer}`);
    surface.setAttribute('aria-label', spec.title ? `Ações: ${spec.title}` : 'Ações');
    surface.registry = registry;
  }

  /* ---------------------------------------------------------------- posição */
  function placeAtPoint(surface, x, y) {
    const width = surface.offsetWidth;
    const height = surface.offsetHeight;
    let left = x + 2;
    let top = y + 2;
    let originX = 'left';
    let originY = 'top';
    if (left + width > window.innerWidth - MARGIN) { left = x - width - 2; originX = 'right'; }
    if (top + height > window.innerHeight - MARGIN) { top = y - height - 2; originY = 'bottom'; }
    left = Math.min(Math.max(MARGIN, left), window.innerWidth - width - MARGIN);
    top = Math.min(Math.max(MARGIN, top), window.innerHeight - height - MARGIN);
    surface.style.left = `${Math.round(left)}px`;
    surface.style.top = `${Math.round(top)}px`;
    surface.style.setProperty('--menu-origin', `${originY} ${originX}`);
  }

  function placeBeside(surface, anchor) {
    const rect = anchor.getBoundingClientRect();
    const width = surface.offsetWidth;
    const height = surface.offsetHeight;
    let left = rect.right + 2;
    let originX = 'left';
    if (left + width > window.innerWidth - MARGIN) { left = rect.left - width - 2; originX = 'right'; }
    left = Math.min(Math.max(MARGIN, left), window.innerWidth - width - MARGIN);
    const top = Math.min(Math.max(MARGIN, rect.top - 6), window.innerHeight - height - MARGIN);
    surface.style.left = `${Math.round(left)}px`;
    surface.style.top = `${Math.round(top)}px`;
    surface.style.setProperty('--menu-origin', `top ${originX}`);
  }

  /* ---------------------------------------------------------------- foco e navegação */
  const focusables = (surface) => [...surface.querySelectorAll(':scope > .context-menu__header [data-key], :scope > .context-menu__list [data-key]')];
  const activeSurface = () => (isShown(submenu) && submenu.contains(document.activeElement) ? submenu : menu);

  function focusItem(surface, target) {
    const list = focusables(surface);
    const element = typeof target === 'number' ? list[(target + list.length) % list.length] : target;
    element?.focus({ preventScroll: false });
  }

  /** Primeiro item utilizável (pula "Voltar" e itens desabilitados). */
  function focusFirst(surface) {
    const list = focusables(surface);
    focusItem(surface, list.find((el) => el.dataset.key !== 'back' && el.getAttribute('aria-disabled') !== 'true') ?? list[0]);
  }

  /* ---------------------------------------------------------------- abrir e fechar */
  function open(spec, { x, y, anchor, returnFocus, sheet, keyboard = true }) {
    close({ restoreFocus: false });
    // Com um diálogo modal aberto, tudo fora dele fica inerte: o menu precisa morar dentro do diálogo.
    const container = anchor?.closest?.('dialog[open]') ?? host;
    if (menu.parentElement !== container) container.append(menu);
    session = { returnFocus, sheet, root: spec, stack: [] };
    menu.classList.toggle('context-menu--sheet', sheet);
    fill(menu, spec);
    show(menu);
    if (sheet) {
      menu.style.left = '';
      menu.style.top = '';
    } else if (x != null) {
      placeAtPoint(menu, x, y);
    } else {
      const rect = anchor.getBoundingClientRect();
      placeAtPoint(menu, rect.left + Math.min(24, rect.width / 2), rect.top + Math.min(rect.height, 32));
    }
    // Pelo teclado, o primeiro item já vem focado; pelo mouse, nada fica realçado
    // até o ponteiro passar por um item (as setas também começam do primeiro).
    if (keyboard) focusFirst(menu);
    else menu.focus({ preventScroll: true });
  }

  function close({ restoreFocus = true } = {}) {
    if (!session) return;
    clearTimeout(hoverTimer);
    const { returnFocus } = session;
    session = null;
    closeSubmenu();
    hide(menu);
    if (restoreFocus && returnFocus?.isConnected && (menu.contains(document.activeElement) || document.activeElement === document.body)) {
      returnFocus.focus({ preventScroll: true });
    }
  }

  function openSubmenu(trigger, item, { focus }) {
    clearTimeout(hoverTimer);
    if (session.sheet) {
      // Folha inferior: o submenu substitui o conteúdo, com "Voltar".
      session.stack.push(trigger.dataset.key);
      fill(menu, { title: item.label, items: item.submenu }, { back: true, prefix: `s${session.stack.length}-` });
      focusFirst(menu);
      return;
    }
    if (submenu.dataset.parent === trigger.dataset.key && isShown(submenu)) {
      if (focus) focusFirst(submenu);
      return;
    }
    closeSubmenu();
    menu.querySelectorAll('[aria-expanded="true"]').forEach((el) => el.setAttribute('aria-expanded', 'false'));
    fill(submenu, { items: item.submenu }, { prefix: 's' });
    submenu.setAttribute('aria-label', item.label);
    submenu.dataset.parent = trigger.dataset.key;
    trigger.setAttribute('aria-expanded', 'true');
    show(submenu);
    placeBeside(submenu, trigger);
    if (focus) focusFirst(submenu);
  }

  function closeSubmenu() {
    if (!isShown(submenu)) return;
    hide(submenu);
    menu.querySelector(`[data-key="${submenu.dataset.parent}"]`)?.setAttribute('aria-expanded', 'false');
    delete submenu.dataset.parent;
  }

  function goBack() {
    session.stack.pop();
    fill(menu, session.root);
    focusFirst(menu);
  }

  function activate(element) {
    if (!session || !element) return;
    if (element.dataset.key === 'back') return goBack();
    const surface = element.closest('.context-menu');
    const item = surface.registry?.get(element.dataset.key);
    if (!item || element.getAttribute('aria-disabled') === 'true') return;
    if (item.submenu) return openSubmenu(element, item, { focus: true });
    // Fecha primeiro (devolvendo o foco ao campo de origem) e só então executa:
    // a ação pode abrir outro menu, um diálogo ou mover o foco.
    close();
    item.run?.();
  }

  /* ---------------------------------------------------------------- eventos do menu */
  menu.addEventListener('click', (event) => {
    const element = event.target.closest('[data-key]');
    if (element) activate(element);
  });
  menu.addEventListener('contextmenu', (event) => event.preventDefault());

  menu.addEventListener('pointerover', (event) => {
    if (event.pointerType === 'touch' || !session || session.sheet) return;
    const element = event.target.closest('[data-key]');
    if (!element) return;
    const surface = element.closest('.context-menu');
    element.focus({ preventScroll: true });
    if (surface !== menu) { clearTimeout(hoverTimer); return; }
    clearTimeout(hoverTimer);
    const item = menu.registry.get(element.dataset.key);
    hoverTimer = setTimeout(() => {
      if (!session) return;
      if (item?.submenu && element.getAttribute('aria-disabled') !== 'true') openSubmenu(element, item, { focus: false });
      else closeSubmenu();
    }, SUBMENU_DELAY);
  });

  menu.addEventListener('keydown', (event) => {
    if (!session) return;
    const surface = activeSurface();
    const list = focusables(surface);
    const index = list.indexOf(document.activeElement);
    const current = list[index];
    const row = current?.closest('.context-menu__row');
    const item = current ? surface.registry?.get(current.dataset.key) : null;

    switch (event.key) {
      case 'ArrowDown':
      case 'ArrowUp': {
        event.preventDefault();
        const step = event.key === 'ArrowDown' ? 1 : -1;
        let next = index + step;
        // Numa fila de ícones, ↑/↓ saem da fila inteira.
        while (row && list[(next + list.length) % list.length]?.closest('.context-menu__row') === row && next !== index) next += step;
        focusItem(surface, index < 0 ? (step > 0 ? 0 : -1) : next);
        break;
      }
      case 'ArrowRight':
        event.preventDefault();
        if (row) focusItem(surface, index + 1);
        else if (item?.submenu && current.getAttribute('aria-disabled') !== 'true') openSubmenu(current, item, { focus: true });
        break;
      case 'ArrowLeft':
        event.preventDefault();
        if (row) focusItem(surface, index - 1);
        else if (surface === submenu) {
          const parent = menu.querySelector(`[data-key="${submenu.dataset.parent}"]`);
          closeSubmenu();
          parent?.focus();
        } else if (session.sheet && session.stack.length) goBack();
        break;
      case 'Home':
      case 'End':
        event.preventDefault();
        focusItem(surface, event.key === 'Home' ? 0 : -1);
        break;
      case 'Enter':
      case ' ':
        event.preventDefault();
        activate(current);
        break;
      case 'Escape':
        event.preventDefault();
        event.stopPropagation();
        if (surface === submenu) {
          const parent = menu.querySelector(`[data-key="${submenu.dataset.parent}"]`);
          closeSubmenu();
          parent?.focus();
        } else if (session.sheet && session.stack.length) goBack();
        else close();
        break;
      case 'Tab':
        event.preventDefault();
        close();
        break;
      default:
        // Letra inicial pula para o próximo item que começa com ela.
        if (event.key.length === 1 && !event.ctrlKey && !event.metaKey && !event.altKey) {
          const now = Date.now();
          typeahead = { text: (now - typeahead.at < 600 ? typeahead.text : '') + event.key.toLowerCase(), at: now };
          const labels = list.map((el) => (el.getAttribute('aria-label') || el.textContent).trim().toLowerCase());
          const order = [...list.keys()].map((i) => (index + 1 + i) % list.length);
          const match = order.find((i) => labels[i].startsWith(typeahead.text));
          if (match !== undefined) focusItem(surface, match);
        }
    }
  });

  /* ---------------------------------------------------------------- fechar por fora */
  document.addEventListener('pointerdown', (event) => {
    lastPointer = { type: event.pointerType || 'mouse', at: Date.now() };
    if (!session) return;
    // Pelo retângulo, não pelo alvo: o fundo escurecido da folha inferior (::backdrop)
    // entrega o evento ao próprio menu.
    const inside = [menu, submenu].some((surface) => {
      if (!isShown(surface)) return false;
      const rect = surface.getBoundingClientRect();
      return event.clientX >= rect.left && event.clientX <= rect.right && event.clientY >= rect.top && event.clientY <= rect.bottom;
    });
    if (!inside) {
      close({ restoreFocus: false });
      // Toque no fundo da folha só fecha; não aciona o que estiver por baixo.
      if (event.target === menu) event.preventDefault();
    }
  }, true);
  window.addEventListener('blur', () => close({ restoreFocus: false }));
  window.addEventListener('resize', () => close({ restoreFocus: false }));
  // Só a rolagem feita pelo usuário fecha (uma rolagem suave em andamento não pode fechar o menu recém-aberto).
  const closeOnUserScroll = (event) => {
    if (session && !menu.contains(event.target)) close({ restoreFocus: false });
  };
  document.addEventListener('wheel', closeOnUserScroll, { capture: true, passive: true });
  document.addEventListener('touchmove', closeOnUserScroll, { capture: true, passive: true });

  /* ---------------------------------------------------------------- botão direito */
  document.addEventListener('contextmenu', (event) => {
    const target = event.target instanceof Element ? event.target : event.target?.parentElement;
    if (!target || event.defaultPrevented) return;
    if (menu.contains(target)) { event.preventDefault(); return; }
    // Arrastando algo: nem menu do app, nem do navegador.
    if (isBusy()) { event.preventDefault(); return; }
    // Saída para o menu do navegador (corretor ortográfico, inspecionar...).
    if (event.shiftKey) return;

    const touch = lastPointer.type === 'touch' && Date.now() - lastPointer.at < 2000;
    // Toque longo num campo de texto: mantém a seleção e o menu do sistema (copiar/colar do celular).
    if (touch && isTextField(target)) return;

    const context = { event, touch };
    let spec = null;
    for (const provider of providers) {
      spec = provider(target, context);
      if (spec) break;
    }
    if (!spec || !spec.items?.some((item) => item && !item.separator && !item.heading)) return;

    event.preventDefault();
    const point = event.clientX || event.clientY ? { x: event.clientX, y: event.clientY } : {};
    open(spec, {
      ...point,
      anchor: target,
      returnFocus: document.activeElement instanceof HTMLElement && document.activeElement !== document.body ? document.activeElement : null,
      sheet: touch || matchMedia(SHEET_QUERY).matches,
      keyboard: !touch && event.button !== 2,
    });
  });

  return {
    /** Registra um provedor: `(elemento, { event, touch }) => ({ title, icon, items, footer }) | null`. */
    register(provider) {
      providers.push(provider);
    },
    /** Abre o menu junto a um elemento (atalho de teclado ou botão). */
    openFor(target, spec) {
      open(spec, { anchor: target, returnFocus: document.activeElement, sheet: matchMedia(SHEET_QUERY).matches });
    },
    close,
    get isOpen() { return Boolean(session); },
  };
}
