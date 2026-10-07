/**
 * Seletor de tipo de bloco (botão "+", Ctrl+K e comando "/").
 * Padrão "combobox + listbox": o foco fica na busca e as setas movem a
 * opção ativa (aria-activedescendant), Enter escolhe, Esc fecha.
 */
import { $, esc, icon, normalizeSearch } from './utils.js';
import { BLOCK_TYPES, BLOCK_GROUPS } from './schema.js';
import { showPopover, hidePopover, positionPopover, preparePopover } from './dialogs.js';

export function createBlockPicker({ onChoose }) {
  const popover = $('#block-picker');
  const search = $('#block-picker-search');
  const list = $('#block-picker-list');
  let context = null;
  let anchor = null;
  let options = [];
  let active = 0;

  preparePopover(popover);
  search.setAttribute('role', 'combobox');
  search.setAttribute('aria-autocomplete', 'list');
  search.setAttribute('aria-expanded', 'false');

  /** Relevância na busca: nome que começa com o texto, nome que contém, palavra-chave, descrição. */
  function score(type, def, query) {
    const label = normalizeSearch(def.label);
    if (label.startsWith(query)) return 0;
    if (label.includes(query)) return 1;
    if (normalizeSearch(`${def.keywords} ${type}`).includes(query)) return 2;
    if (normalizeSearch(def.description).includes(query)) return 3;
    return -1;
  }

  const optionHtml = ([type, def]) => `
    <li class="picker-option" role="option" id="picker-${type}" data-type="${type}" aria-selected="${options.indexOf(type) === active}">
      <span class="type-icon" data-group="${def.group}">${icon(def.icon)}</span>
      <span><strong>${esc(def.label)}</strong><small>${esc(def.description)}</small></span>
    </li>`;

  function render() {
    const query = normalizeSearch(search.value);
    // Sem busca: por grupo. Com busca: os mais relevantes primeiro (Enter escolhe o primeiro mostrado).
    const entries = query
      ? Object.entries(BLOCK_TYPES)
        .map((entry) => ({ entry, rank: score(entry[0], entry[1], query) }))
        .filter(({ rank }) => rank >= 0)
        .sort((a, b) => a.rank - b.rank)
        .map(({ entry }) => entry)
      : BLOCK_GROUPS.flatMap((group) => Object.entries(BLOCK_TYPES).filter(([, def]) => def.group === group.id));
    options = entries.map(([type]) => type);
    active = Math.min(active, Math.max(options.length - 1, 0));

    if (!entries.length) {
      list.innerHTML = '<li class="picker-empty" role="presentation">Nenhum bloco encontrado.</li>';
      search.removeAttribute('aria-activedescendant');
      return;
    }
    list.innerHTML = query
      ? entries.map(optionHtml).join('')
      : BLOCK_GROUPS.map((group) => {
        const groupEntries = entries.filter(([, def]) => def.group === group.id);
        return groupEntries.length ? `<li class="block-picker__group" role="presentation">${esc(group.label)}</li>${groupEntries.map(optionHtml).join('')}` : '';
      }).join('');
    search.setAttribute('aria-activedescendant', `picker-${options[active]}`);
  }

  function setActive(index) {
    active = (index + options.length) % options.length;
    list.querySelectorAll('.picker-option').forEach((option) => option.setAttribute('aria-selected', String(option.dataset.type === options[active])));
    const current = list.querySelector(`#picker-${options[active]}`);
    current?.scrollIntoView({ block: 'nearest' });
    search.setAttribute('aria-activedescendant', `picker-${options[active]}`);
  }

  function choose(type) {
    const chosen = context;
    close(false);
    onChoose(type, chosen);
  }

  function close(returnFocus = true) {
    hidePopover(popover);
    if (returnFocus && anchor?.isConnected) anchor.focus();
  }

  search.addEventListener('input', () => { active = 0; render(); });
  search.addEventListener('keydown', (event) => {
    if (event.key === 'ArrowDown') { event.preventDefault(); setActive(active + 1); }
    else if (event.key === 'ArrowUp') { event.preventDefault(); setActive(active - 1); }
    else if (event.key === 'Enter') {
      event.preventDefault();
      if (options[active]) choose(options[active]);
    } else if (event.key === 'Escape') {
      event.preventDefault();
      close();
    } else if (event.key === 'Tab') {
      close(false);
    }
  });

  list.addEventListener('pointermove', (event) => {
    const option = event.target.closest('.picker-option');
    if (option && options[active] !== option.dataset.type) setActive(options.indexOf(option.dataset.type));
  });
  list.addEventListener('click', (event) => {
    const option = event.target.closest('.picker-option');
    if (option) choose(option.dataset.type);
  });

  popover.addEventListener('toggle', (event) => {
    search.setAttribute('aria-expanded', String(event.newState === 'open'));
  });

  return {
    /** context: { index } para inserir, ou { convertId } para transformar um parágrafo. */
    open(trigger, nextContext) {
      anchor = trigger;
      context = nextContext;
      search.value = '';
      popover.querySelector('[data-search-clear]').hidden = true;
      active = 0;
      render();
      showPopover(popover);
      positionPopover(popover, trigger, { align: 'start' });
      search.focus({ preventScroll: true });
    },
    close,
  };
}
