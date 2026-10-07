/**
 * Editor de blocos (coluna central).
 *
 * Cada bloco vira um cartão com formulário gerado a partir do catálogo.
 * Digitar NÃO redesenha o editor (o foco e o cursor ficam intactos): só o
 * documento é atualizado e a prévia se refaz. O editor só é redesenhado
 * quando a estrutura muda (inclusão, remoção, reordenação, desfazer).
 */
import { $, $$, esc, icon, getByPath, setByPath, moveItem, clamp } from './utils.js';
import { BLOCK_TYPES, blockSummary } from './schema.js';
import { fieldHtml, readControlValue } from './fields.js';
import { toggleFormat, FORMATS } from './markup.js';
import { setupMenu } from './dialogs.js';
import { isAcceptedImage } from './images.js';
import { isTextField } from './contextmenu.js';
import { textFieldItems, textMenuTitle } from './textmenu.js';

export function createEditor({ store, ui, assets, actions, drag }) {
  const list = $('#editor-list');
  const empty = $('#editor-empty');
  const counter = $('#block-count');
  const addEnd = $('.add-block-end');
  const blockMenu = setupMenu($('#block-menu'), { onSelect: handleMenuAction });

  const findBlock = (doc, id) => doc.blocks.find((block) => block.id === id);
  const cardOf = (id) => list.querySelector(`.block-card[data-block-id="${CSS.escape(id)}"]`);

  /* ---------------------------------------------------------------- renderização */
  function cardHtml(block) {
    const definition = BLOCK_TYPES[block.type];
    const collapsed = ui.get('collapsed').has(block.id);
    const selected = ui.get('selectedId') === block.id;
    const overflow = ui.get('overflowBlocks').has(block.id);
    const context = { block, assets: assets.renderMap() };
    const fields = definition.fields.map((field) =>
      fieldHtml(field, block[field.key], { idBase: `f-${block.id}`, context })).join('');
    const bodyId = `body-${block.id}`;

    return `
      <li class="block-card${selected ? ' is-selected' : ''}${collapsed ? ' is-collapsed' : ''}" data-block-id="${esc(block.id)}" data-type="${block.type}">
        <div class="block-card__head">
          <button type="button" class="icon-btn drag-handle" data-drag-handle aria-label="Mover bloco ${esc(definition.label)}: arraste ou use as setas" title="Arraste para mover (ou setas ↑ ↓)">${icon('grip')}</button>
          <button type="button" class="block-card__type" data-action="toggle-collapse" aria-expanded="${!collapsed}" aria-controls="${bodyId}" title="Recolher ou expandir">
            <span class="type-icon" data-group="${definition.group}">${icon(definition.icon)}</span>
            <span class="block-card__label"><strong>${esc(definition.label)}</strong><span class="block-card__summary">${esc(blockSummary(block))}</span></span>
          </button>
          <div class="block-card__actions">
            <button type="button" class="icon-btn hide-narrow" data-action="duplicate" aria-label="Duplicar bloco" title="Duplicar (Ctrl+D)">${icon('copy')}</button>
            <button type="button" class="icon-btn icon-btn--danger" data-action="delete" aria-label="Excluir bloco" title="Excluir">${icon('trash')}</button>
            <button type="button" class="icon-btn" data-action="menu" aria-haspopup="menu" aria-expanded="false" aria-controls="block-menu" aria-label="Mais ações do bloco" title="Mais ações">${icon('more')}</button>
          </div>
        </div>
        ${overflow ? warningHtml() : ''}
        ${fields
          ? `<div class="block-card__body" id="${bodyId}">${fields}</div>`
          : `<p class="pagebreak-note" id="${bodyId}">${icon('pagebreak', 'icon--sm')}O conteúdo seguinte começa numa nova página.</p>`}
        <button type="button" class="block-card__insert" data-action="insert-after" aria-label="Inserir bloco abaixo" title="Inserir bloco abaixo">${icon('plus')}</button>
      </li>`;
  }

  const warningHtml = () =>
    `<p class="block-card__warning" role="note">${icon('warning', 'icon--sm')}Este bloco é maior que a área da página e será cortado. Divida-o em partes menores.</p>`;

  /** Guarda qual controle estava focado para devolver o foco após redesenhar. */
  function captureFocus() {
    const active = document.activeElement;
    const card = active?.closest?.('.block-card');
    if (!card || !list.contains(card)) return null;
    return {
      id: card.dataset.blockId,
      path: active.dataset.path,
      action: active.dataset.action ?? (active.matches('[data-drag-handle]') ? 'drag' : null),
      selection: 'selectionStart' in active && active.type !== 'number' ? [active.selectionStart, active.selectionEnd] : null,
    };
  }

  function restoreFocus(snapshot) {
    if (!snapshot) return;
    const card = cardOf(snapshot.id);
    if (!card) return;
    let target = null;
    if (snapshot.path) target = card.querySelector(`[data-path="${CSS.escape(snapshot.path)}"]`);
    else if (snapshot.action === 'drag') target = card.querySelector('[data-drag-handle]');
    else if (snapshot.action) target = card.querySelector(`[data-action="${snapshot.action}"]`);
    if (!target) return;
    target.focus({ preventScroll: true });
    if (snapshot.selection && 'setSelectionRange' in target) {
      try { target.setSelectionRange(...snapshot.selection); } catch { /* campo sem seleção de texto */ }
    }
  }

  function render() {
    const focus = captureFocus();
    const { blocks } = store.doc;
    list.innerHTML = blocks.map(cardHtml).join('');
    empty.hidden = blocks.length > 0;
    addEnd.hidden = blocks.length === 0;
    counter.textContent = blocks.length;
    autosizeAll();
    restoreFocus(focus);
  }

  function renderCard(id, focusPath) {
    const block = findBlock(store.doc, id);
    const card = cardOf(id);
    if (!block || !card) return;
    const focus = captureFocus();
    card.outerHTML = cardHtml(block);
    autosizeAll(cardOf(id));
    if (focusPath) cardOf(id)?.querySelector(focusPath)?.focus();
    else restoreFocus(focus);
  }

  /* Campos de texto que crescem com o conteúdo (fallback para navegadores sem field-sizing). */
  const supportsFieldSizing = CSS.supports?.('field-sizing', 'content');
  function autosize(textarea) {
    if (supportsFieldSizing) return;
    textarea.style.height = 'auto';
    textarea.style.height = `${Math.min(textarea.scrollHeight + 2, window.innerHeight * 0.6)}px`;
  }
  function autosizeAll(root = list) {
    if (!supportsFieldSizing) $$('textarea', root).forEach(autosize);
  }

  /* ---------------------------------------------------------------- edição de valores */
  function coerce(block, path, control) {
    const value = readControlValue(control);
    const [key] = path.split('.');
    const field = BLOCK_TYPES[block.type].fields.find((f) => f.key === key);
    if (field?.kind === 'number') return clamp(Math.round(value) || field.min || 0, field.min ?? 0, field.max ?? 9999);
    if (field?.kind === 'range') return clamp(value, field.min, field.max);
    return value;
  }

  list.addEventListener('input', (event) => {
    const control = event.target.closest('[data-path]');
    if (!control || control.matches('[data-image-drop], [data-image-action]')) return;
    if (control.type === 'radio' && !control.checked) return;
    const card = control.closest('.block-card');
    const id = card.dataset.blockId;
    const path = control.dataset.path;

    if (control.type === 'range') {
      const output = control.parentElement.querySelector('output');
      if (output) output.textContent = `${control.value}%`;
    }
    if (control.tagName === 'TEXTAREA') autosize(control);

    const block = findBlock(store.doc, id);
    const value = coerce(block, path, control);
    store.update((doc) => setByPath(findBlock(doc, id), path, value), {
      kind: 'content',
      blockId: id,
      coalesce: control.type === 'text' || control.tagName === 'TEXTAREA' ? `${id}:${path}` : null,
    });
    card.querySelector('.block-card__summary').textContent = blockSummary(findBlock(store.doc, id));

    // "/" num parágrafo vazio abre o seletor para transformar o bloco.
    if (block.type === 'paragraph' && path === 'text' && control.value === '/') {
      actions.openPicker(control, { convertId: id });
    }
  });

  // Ao sair de um campo, a próxima digitação vira um novo passo de "desfazer".
  list.addEventListener('focusout', () => store.breakCoalescing());

  /* ---------------------------------------------------------------- itens e tabela */
  function itemFieldDefinition(block, key) {
    return BLOCK_TYPES[block.type].fields.find((field) => field.key === key);
  }

  /** Ações dos itens (passos, cartões…): botões do cartão e menu de contexto usam a mesma função. */
  function itemAction(id, key, action, index) {
    const block = findBlock(store.doc, id);
    const items = getByPath(block, key);
    const max = itemFieldDefinition(block, key).max ?? 100;
    if ((action === 'add' || action === 'insert-below') && items.length >= max) return;
    let focusSelector = null;

    store.update((doc) => {
      const target = findBlock(doc, id);
      const list = getByPath(target, key);
      if (action === 'add') {
        list.push(itemFieldDefinition(target, key).newItem());
        focusSelector = `.item[data-index="${list.length - 1}"] [data-path]`;
      } else if (action === 'insert-below') {
        list.splice(index + 1, 0, itemFieldDefinition(target, key).newItem());
        focusSelector = `.item[data-index="${index + 1}"] [data-path]`;
      } else if (action === 'remove') {
        list.splice(index, 1);
        focusSelector = list.length ? `.item[data-index="${Math.min(index, list.length - 1)}"] [data-path]` : '[data-item-action="add"]';
      } else {
        const to = action === 'up' ? index - 1 : index + 1;
        moveItem(list, index, to);
        focusSelector = `[data-item-action="${action}"][data-index="${to}"]:not(:disabled)`;
      }
    }, { kind: 'block', blockId: id });
    renderCard(id, focusSelector);
  }

  const handleItemAction = (button, id) =>
    itemAction(id, button.dataset.itemsKey, button.dataset.itemAction, Number(button.dataset.index));

  /**
   * Ações da tabela. `index` é a linha ou a coluna; `column` é a coluna a
   * focar depois (para o cursor continuar na mesma coluna ao inserir linhas).
   */
  function tableAction(id, action, index, column = 0) {
    let focusSelector = null;
    store.update((doc) => {
      const block = findBlock(doc, id);
      const columns = block.header.length;
      if (action === 'add-row') {
        block.rows.push(Array(columns).fill(''));
        focusSelector = `[data-path="rows.${block.rows.length - 1}.0"]`;
      } else if (action === 'insert-row' && block.rows.length < 400) {
        block.rows.splice(index, 0, Array(columns).fill(''));
        focusSelector = `[data-path="rows.${index}.${column}"]`;
      } else if (action === 'add-col' && columns < 12) {
        block.header.push(`Coluna ${columns + 1}`);
        block.rows.forEach((row) => row.push(''));
        focusSelector = `[data-path="header.${columns}"]`;
      } else if (action === 'insert-col' && columns < 12) {
        block.header.splice(index, 0, `Coluna ${index + 1}`);
        block.rows.forEach((row) => row.splice(index, 0, ''));
        focusSelector = `[data-path="header.${index}"]`;
      } else if (action === 'remove-row' && block.rows.length > 1) {
        block.rows.splice(index, 1);
        focusSelector = column === null ? '[data-table-action="add-row"]' : `[data-path="rows.${Math.min(index, block.rows.length - 1)}.${column}"]`;
      } else if (action === 'remove-col' && columns > 1) {
        block.header.splice(index, 1);
        block.rows.forEach((row) => row.splice(index, 1));
        focusSelector = column === null ? '[data-table-action="add-col"]' : `[data-path="header.${Math.min(index, columns - 2)}"]`;
      }
    }, { kind: 'block', blockId: id });
    renderCard(id, focusSelector);
  }

  const handleTableAction = (button, id) =>
    tableAction(id, button.dataset.tableAction, Number(button.dataset.index), null);

  /** Colar várias células (Excel, Word, Planilhas) preenche a tabela a partir da célula atual. */
  list.addEventListener('paste', (event) => {
    const input = event.target.closest('.table-editor input[data-path]');
    if (!input) return;
    const text = event.clipboardData?.getData('text/plain') ?? '';
    if (!/[\t\n]/.test(text.trim())) return;
    event.preventDefault();

    const grid = text.replace(/\r\n?/g, '\n').replace(/\n+$/, '').split('\n').map((line) => line.split('\t'));
    const id = input.closest('.block-card').dataset.blockId;
    const [area, first, second] = input.dataset.path.split('.');
    const startRow = area === 'header' ? -1 : Number(first);
    const startCol = Number(area === 'header' ? first : second);

    store.update((doc) => {
      const block = findBlock(doc, id);
      const neededColumns = Math.min(12, startCol + Math.max(...grid.map((row) => row.length)));
      while (block.header.length < neededColumns) {
        block.header.push(`Coluna ${block.header.length + 1}`);
        block.rows.forEach((row) => row.push(''));
      }
      grid.forEach((cells, r) => {
        const rowIndex = startRow + r;
        if (rowIndex >= 400) return;
        while (rowIndex >= block.rows.length) block.rows.push(Array(block.header.length).fill(''));
        const target = rowIndex === -1 ? block.header : block.rows[rowIndex];
        cells.forEach((cell, c) => {
          if (startCol + c < block.header.length) target[startCol + c] = cell.trim();
        });
      });
    }, { kind: 'block', blockId: id });
    renderCard(id, `[data-path="${input.dataset.path}"]`);
    actions.announce(`${grid.length} linhas coladas na tabela.`);
  });

  /* ---------------------------------------------------------------- cliques */
  list.addEventListener('click', (event) => {
    const button = event.target.closest('button');
    const card = event.target.closest('.block-card');
    if (!button || !card) return;
    const id = card.dataset.blockId;

    if (button.dataset.format) {
      toggleFormat(document.getElementById(button.dataset.target), button.dataset.format);
      return;
    }
    if (button.dataset.itemAction) return handleItemAction(button, id);
    if (button.dataset.tableAction) return handleTableAction(button, id);
    if (button.dataset.imageAction === 'choose') return actions.chooseImage({ blockId: id });
    if (button.dataset.imageAction === 'remove') {
      store.update((doc) => { findBlock(doc, id).assetId = ''; }, { kind: 'block', blockId: id });
      return renderCard(id, '[data-image-action="choose"]');
    }

    switch (button.dataset.action) {
      case 'toggle-collapse': return toggleCollapse(id);
      case 'duplicate': return actions.duplicateBlock(id);
      case 'delete': return actions.removeBlock(id);
      case 'insert-after': return actions.openPicker(button, { index: actions.indexOf(id) + 1 });
      case 'menu':
        ui.set({ selectedId: id });
        return blockMenu.toggle(button);
      default:
    }
  });

  function handleMenuAction(item, anchor) {
    const id = anchor?.closest('.block-card')?.dataset.blockId;
    if (!id) return;
    const index = actions.indexOf(id);
    switch (item.dataset.blockAction) {
      case 'move-up': return actions.moveBlockBy(id, -1);
      case 'move-down': return actions.moveBlockBy(id, 1);
      case 'insert-above': return actions.openPicker(anchor, { index });
      case 'insert-below': return actions.openPicker(anchor, { index: index + 1 });
      case 'duplicate': return actions.duplicateBlock(id);
      case 'delete': return actions.removeBlock(id);
      default:
    }
  }

  function toggleCollapse(id) {
    const collapsed = new Set(ui.get('collapsed'));
    if (collapsed.has(id)) collapsed.delete(id);
    else collapsed.add(id);
    ui.set({ collapsed });
  }

  /* ---------------------------------------------------------------- teclado */
  list.addEventListener('keydown', (event) => {
    const card = event.target.closest('.block-card');
    if (!card) return;
    const id = card.dataset.blockId;

    // Alça de arraste: setas movem o bloco.
    if (event.target.matches('[data-drag-handle]') && (event.key === 'ArrowUp' || event.key === 'ArrowDown')) {
      event.preventDefault();
      actions.moveBlockBy(id, event.key === 'ArrowUp' ? -1 : 1);
      return;
    }

    // Barra de formatação: setas trocam de botão (tabindex móvel).
    const toolbar = event.target.closest('.rich__toolbar');
    if (toolbar && (event.key === 'ArrowRight' || event.key === 'ArrowLeft')) {
      const buttons = $$('button', toolbar);
      const index = buttons.indexOf(event.target);
      const next = buttons[(index + (event.key === 'ArrowRight' ? 1 : -1) + buttons.length) % buttons.length];
      buttons.forEach((button) => { button.tabIndex = button === next ? 0 : -1; });
      next.focus();
      event.preventDefault();
      return;
    }

    // Ctrl+B / Ctrl+I nos campos que aceitam formatação (os "data-plain" mostrariam os asteriscos).
    if ((event.ctrlKey || event.metaKey) && !event.altKey && isTextField(event.target) && !event.target.matches('[data-plain]')) {
      const format = Object.entries(FORMATS).find(([, f]) => f.key === event.key.toLowerCase());
      if (format) {
        event.preventDefault();
        toggleFormat(event.target, format[0]);
      }
    }
  });

  /* ---------------------------------------------------------------- seleção */
  list.addEventListener('focusin', (event) => {
    const card = event.target.closest('.block-card');
    if (card && ui.get('selectedId') !== card.dataset.blockId) {
      ui.set({ selectedId: card.dataset.blockId, selectSource: 'editor' });
    }
  });
  list.addEventListener('pointerdown', (event) => {
    const card = event.target.closest('.block-card');
    if (card && ui.get('selectedId') !== card.dataset.blockId) {
      ui.set({ selectedId: card.dataset.blockId, selectSource: 'editor' });
    }
    const handle = event.target.closest('[data-drag-handle]');
    if (handle && card) {
      const definition = BLOCK_TYPES[card.dataset.type];
      drag.begin(event, { payload: { type: 'move', blockId: card.dataset.blockId }, label: definition.label, icon: definition.icon, source: card });
    }
  });

  /* ---------------------------------------------------------------- imagens (arrastar arquivo) */
  list.addEventListener('dragover', (event) => {
    const zone = event.target.closest('[data-image-drop]');
    if (!zone || !event.dataTransfer?.types.includes('Files')) return;
    event.preventDefault();
    event.stopPropagation();
    zone.classList.add('is-over');
  });
  list.addEventListener('dragleave', (event) => {
    event.target.closest?.('[data-image-drop]')?.classList.remove('is-over');
  });
  list.addEventListener('drop', (event) => {
    const zone = event.target.closest('[data-image-drop]');
    if (!zone) return;
    event.preventDefault();
    event.stopPropagation();
    zone.classList.remove('is-over');
    const file = [...(event.dataTransfer?.files ?? [])].find(isAcceptedImage);
    if (file) actions.setBlockImage(zone.closest('.block-card').dataset.blockId, file);
    else actions.notify('Solte um arquivo PNG, JPG, WEBP, GIF ou SVG.', 'error');
  });

  /* ---------------------------------------------------------------- menu de contexto */
  /** Itens da linha/coluna da célula de tabela. */
  function tableItems(id, cell) {
    const block = findBlock(store.doc, id);
    const [area, first, second] = cell.dataset.path.split('.');
    const isHeader = area === 'header';
    const row = isHeader ? -1 : Number(first);
    const col = Number(isHeader ? first : second);
    const columns = block.header.length;
    return [
      {
        label: isHeader ? 'Linha do cabeçalho' : `Linha ${row + 1}`,
        icon: 'row-below',
        submenu: [
          { label: 'Inserir linha acima', icon: 'row-above', disabled: isHeader || block.rows.length >= 400, run: () => tableAction(id, 'insert-row', row, col) },
          { label: 'Inserir linha abaixo', icon: 'row-below', disabled: block.rows.length >= 400, run: () => tableAction(id, 'insert-row', row + 1, col) },
          { separator: true },
          { label: 'Excluir linha', icon: 'row-remove', danger: true, disabled: isHeader || block.rows.length <= 1, run: () => tableAction(id, 'remove-row', row, col) },
        ],
      },
      {
        label: `Coluna ${col + 1}`,
        icon: 'col-right',
        submenu: [
          { label: 'Inserir coluna à esquerda', icon: 'col-left', disabled: columns >= 12, run: () => tableAction(id, 'insert-col', col) },
          { label: 'Inserir coluna à direita', icon: 'col-right', disabled: columns >= 12, run: () => tableAction(id, 'insert-col', col + 1) },
          { separator: true },
          { label: 'Excluir coluna', icon: 'col-remove', danger: true, disabled: columns <= 1, run: () => tableAction(id, 'remove-col', col, col) },
        ],
      },
    ];
  }

  /** Itens de um item da lista (passo, cartão, pergunta…): os mesmos botões do cabeçalho do item. */
  function itemItems(id, itemEl) {
    const button = itemEl.querySelector('[data-items-key]');
    const key = button.dataset.itemsKey;
    const index = Number(itemEl.dataset.index);
    const block = findBlock(store.doc, id);
    const count = getByPath(block, key).length;
    const max = itemFieldDefinition(block, key).max ?? 100;
    const name = itemEl.querySelector('.item__title')?.textContent ?? 'Item';
    const singular = (itemFieldDefinition(block, key).itemLabel ?? 'item').toLowerCase();
    return {
      name,
      items: [
        { label: `Inserir ${singular} abaixo`, icon: 'plus', disabled: count >= max, run: () => itemAction(id, key, 'insert-below', index) },
        { label: 'Mover para cima', icon: 'chevron-up', disabled: index === 0, run: () => itemAction(id, key, 'up', index) },
        { label: 'Mover para baixo', icon: 'chevron-down', disabled: index >= count - 1, run: () => itemAction(id, key, 'down', index) },
        { separator: true },
        { label: `Remover ${name.toLowerCase()}`, icon: 'trash', danger: true, run: () => itemAction(id, key, 'remove', index) },
      ],
    };
  }

  /**
   * Provedor do menu de contexto do editor: texto do campo, item da lista,
   * célula da tabela e o próprio bloco, conforme onde foi o clique.
   */
  function contextMenu(target) {
    const card = target.closest('.block-card');
    if (!card || !list.contains(card)) return null;
    const id = card.dataset.blockId;
    const block = findBlock(store.doc, id);
    if (!block) return null;
    const definition = BLOCK_TYPES[block.type];
    const field = isTextField(target) && target.matches('[data-path]') ? target : null;
    const cell = target.closest('.table-editor td, .table-editor th')?.querySelector('input[data-path]') ?? null;
    const itemEl = target.closest('.item');
    const blockItems = actions.blockMenuItems(id, { anchor: card.querySelector('.block-card__head'), origin: 'editor' });
    const items = [];

    if (field) items.push(...textFieldItems(field, { formats: !field.matches('[data-plain]'), notify: actions.notify }));
    if (cell) items.push({ separator: true }, ...tableItems(id, cell));
    if (itemEl) {
      const item = itemItems(id, itemEl);
      if (field) items.push({ separator: true }, { label: item.name, icon: 'blocks', submenu: item.items });
      else items.push(...item.items);
    }
    // Dentro de um campo, célula ou item, as ações do bloco ficam num submenu (menu curto).
    if (field || cell || itemEl) items.push({ separator: true }, { label: `Bloco: ${definition.label}`, icon: definition.icon, submenu: blockItems });
    else items.push(...blockItems);

    return {
      title: field ? textMenuTitle(field) : itemEl ? itemEl.querySelector('.item__title')?.textContent : definition.label,
      icon: field ? 'pen' : definition.icon,
      items,
      footer: field ? 'Shift + botão direito abre o menu do navegador' : '',
    };
  }

  /* ---------------------------------------------------------------- reações ao estado */
  store.subscribe((doc, change) => {
    if (change.kind === 'replace' || change.kind === 'structure') render();
    else if (change.kind === 'block') {
      // renderCard é chamado por quem originou a mudança (com o foco certo);
      // aqui só garante consistência se a mudança veio de outro lugar.
      if (change.external) renderCard(change.blockId);
    }
    counter.textContent = doc.blocks.length;
  });

  ui.subscribe((state, changed) => {
    if (changed.includes('selectedId')) {
      $$('.block-card.is-selected', list).forEach((card) => card.classList.remove('is-selected'));
      if (state.selectedId) cardOf(state.selectedId)?.classList.add('is-selected');
    }
    if (changed.includes('collapsed')) {
      $$('.block-card', list).forEach((card) => {
        const collapsed = state.collapsed.has(card.dataset.blockId);
        card.classList.toggle('is-collapsed', collapsed);
        card.querySelector('[data-action="toggle-collapse"]').setAttribute('aria-expanded', String(!collapsed));
      });
    }
    if (changed.includes('overflowBlocks')) {
      $$('.block-card', list).forEach((card) => {
        const existing = card.querySelector('.block-card__warning');
        const overflow = state.overflowBlocks.has(card.dataset.blockId);
        if (overflow && !existing) card.querySelector('.block-card__head').insertAdjacentHTML('afterend', warningHtml());
        if (!overflow && existing) existing.remove();
      });
    }
  });

  render();

  return {
    render,
    renderCard,
    /** Rola até o cartão e (opcionalmente) foca o primeiro campo. */
    reveal(id, { focus = false } = {}) {
      const card = cardOf(id);
      if (!card) return;
      if (ui.get('collapsed').has(id) && focus) toggleCollapse(id);
      card.scrollIntoView({ block: 'center', behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth' });
      card.classList.remove('is-flash');
      void card.offsetWidth;
      card.classList.add('is-flash');
      if (focus) (card.querySelector('.block-card__body [data-path]') ?? card.querySelector('[data-drag-handle]'))?.focus({ preventScroll: true });
    },
    /** Animação de entrada de um cartão recém-inserido. */
    markNew(id) {
      const card = cardOf(id);
      if (!card) return;
      card.classList.add('is-entering');
      card.addEventListener('animationend', () => card.classList.remove('is-entering'), { once: true });
    },
    toggleCollapse,
    contextMenu,
    collapseAll(collapse) {
      ui.set({ collapsed: collapse ? new Set(store.doc.blocks.map((b) => b.id)) : new Set() });
    },
  };
}
