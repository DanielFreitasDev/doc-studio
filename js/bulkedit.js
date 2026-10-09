/**
 * Edição em conjunto: a mesma opção aplicada a vários blocos selecionados.
 *
 * Com vários blocos selecionados, o botão "Editar" da barra da seleção (ou
 * "Editar em conjunto…" no botão direito) abre um painel com as opções dos
 * blocos, agrupadas por tipo: "Parágrafo · 12 blocos → Alinhamento",
 * "Imagem · 3 blocos → Largura". Escolher uma opção muda todos os blocos
 * daquele tipo na seleção, num único passo de desfazer.
 *
 * Por que por tipo e não só as opções em comum: o caso típico é Ctrl+A e
 * "justificar todos os parágrafos". Com títulos, listas e imagens na seleção,
 * a interseção das opções seria vazia; agrupando por tipo, cada opção vale
 * só para os blocos que a têm. Entram só as opções (interruptores, escolhas,
 * cores, números): os textos de cada bloco nunca são sobrescritos em massa.
 */
import { esc, icon, clamp } from './utils.js';
import { BLOCK_TYPES } from './schema.js';
import { fieldHtml, readControlValue } from './fields.js';

const supportsPopover = typeof HTMLElement !== 'undefined' && 'showPopover' in HTMLElement.prototype;

/** Tipos de campo editáveis em conjunto: opções do bloco, nunca o conteúdo. */
export const BULK_KINDS = new Set(['segmented', 'swatches', 'toggle', 'number', 'range']);

export const bulkField = (type, key) => BLOCK_TYPES[type]?.fields.find((f) => f.key === key && BULK_KINDS.has(f.kind)) ?? null;

const countLabel = (n) => `${n} ${n === 1 ? 'bloco' : 'blocos'}`;

/**
 * Blocos agrupados por tipo, na ordem do documento, com as opções editáveis
 * de cada tipo e o valor delas: `value` quando todos os blocos concordam,
 * `mixed` quando não (`sample` é o valor do primeiro, para controles que
 * precisam mostrar algum número).
 */
export function bulkGroups(blocks) {
  const byType = new Map();
  for (const block of blocks) {
    if (!BLOCK_TYPES[block.type]) continue;
    if (!byType.has(block.type)) byType.set(block.type, []);
    byType.get(block.type).push(block);
  }
  return [...byType].map(([type, list]) => ({
    type,
    label: BLOCK_TYPES[type].label,
    icon: BLOCK_TYPES[type].icon,
    ids: list.map((block) => block.id),
    fields: BLOCK_TYPES[type].fields.filter((field) => BULK_KINDS.has(field.kind)).map((field) => {
      const mixed = new Set(list.map((block) => block[field.key])).size > 1;
      return { field, mixed, value: mixed ? null : list[0][field.key], sample: list[0][field.key] };
    }),
  }));
}

/** Texto de um valor para avisos e menus ("Justificado", "60%", "ligado"). */
export function valueLabel(field, value) {
  if (field.kind === 'toggle') return value ? 'ligado' : 'desligado';
  if (field.kind === 'number' || field.kind === 'range') return `${value}${field.unit ?? ''}`;
  return field.options?.find((option) => option.value === value)?.label ?? String(value);
}

/**
 * Itens de menu de contexto para as opções de um bloco ou de um grupo de
 * blocos do mesmo tipo. `apply(key, value)` grava; o menu de um bloco e o da
 * seleção usam a mesma montagem.
 */
export function fieldMenuItems(fields, apply) {
  return fields.flatMap(({ field, mixed, value }) => {
    if (field.kind === 'toggle') {
      // Valores diferentes: o clique liga em todos.
      return [{ label: field.label, checked: !mixed && Boolean(value), hint: mixed ? 'Vários' : undefined, run: () => apply(field.key, mixed ? true : !value) }];
    }
    if (field.kind === 'range' && field.presets) {
      return [{
        label: field.label,
        hint: mixed ? 'Vários' : valueLabel(field, value),
        icon: 'fit',
        submenu: field.presets.map((preset) => ({
          label: `${preset.label} (${preset.value}${field.unit ?? ''})`,
          radio: true,
          checked: !mixed && preset.value === value,
          run: () => apply(field.key, preset.value),
        })),
      }];
    }
    if (field.kind !== 'segmented' && field.kind !== 'swatches') return [];
    return [{
      label: field.label,
      hint: mixed ? 'Vários' : field.options.find((option) => option.value === value)?.label,
      icon: field.kind === 'swatches' ? 'palette' : 'layout',
      submenu: field.options.map((option) => ({
        label: option.label,
        radio: true,
        checked: !mixed && option.value === value,
        swatch: field.kind === 'swatches' ? option.swatch : undefined,
        run: () => apply(field.key, option.value),
      })),
    }];
  });
}

export function createBulkEdit({ store, ui, actions, selection }) {
  const bar = document.querySelector('#selection-bar');
  const trigger = bar.querySelector('[data-selection="edit"]');
  const panel = document.createElement('div');
  panel.className = 'bulk-edit';
  panel.id = 'bulk-edit';
  panel.setAttribute('role', 'dialog');
  panel.setAttribute('aria-labelledby', 'bulk-edit-title');
  if (supportsPopover) panel.popover = 'manual';
  else panel.hidden = true;
  document.querySelector('#app').append(panel);

  let session = null; // { returnFocus }
  const isOpen = () => Boolean(session);

  const selectedBlocks = () => {
    const ids = new Set(selection.ids());
    return store.doc.blocks.filter((block) => ids.has(block.id));
  };

  function fieldBlock(group, { field, mixed, value, sample }) {
    const control = fieldHtml(field, field.kind === 'number' || field.kind === 'range' ? sample : value, { idBase: `bulk-${group.type}` });
    return `
      <div class="bulk-edit__field"${mixed ? ' data-mixed' : ''} data-key="${esc(field.key)}">
        ${control}
        <p class="bulk-edit__mixed">Está diferente entre os blocos; o que você escolher vale para todos.</p>
      </div>`;
  }

  function render() {
    const blocks = selectedBlocks();
    const groups = bulkGroups(blocks);
    const editable = groups.filter((group) => group.fields.length);
    const without = groups.filter((group) => !group.fields.length);
    const sections = editable.map((group) => `
      <section class="bulk-edit__group" data-type="${esc(group.type)}" aria-labelledby="bulk-edit-${esc(group.type)}">
        <h3 class="bulk-edit__group-title" id="bulk-edit-${esc(group.type)}">${icon(group.icon, 'icon--sm')}${esc(group.label)} <span>· ${countLabel(group.ids.length)}</span></h3>
        ${group.fields.map((entry) => fieldBlock(group, entry)).join('')}
      </section>`).join('');
    const rest = without.length
      ? `<p class="bulk-edit__rest">Sem opções para editar em conjunto: ${esc(without.map((group) => `${group.label} (${group.ids.length})`).join(', '))}.</p>`
      : '';
    panel.innerHTML = `
      <div class="bulk-edit__head">
        <h2 class="bulk-edit__title" id="bulk-edit-title">Editar ${countLabel(blocks.length)}</h2>
        <button type="button" class="icon-btn icon-btn--sm" data-bulk="close" aria-label="Fechar (Esc)" title="Fechar (Esc)">${icon('x')}</button>
      </div>
      <p class="bulk-edit__hint">Cada opção muda todos os blocos daquele tipo na seleção. Ctrl+Z desfaz.</p>
      ${sections || '<p class="bulk-edit__empty">Os blocos selecionados não têm opções em comum (só textos, que se editam um a um).</p>'}
      ${rest}`;
    // Valores diferentes: nenhuma cor marcada, interruptor no meio.
    panel.querySelectorAll('.bulk-edit__field[data-mixed]').forEach((wrapper) => {
      const current = wrapper.querySelector('[data-tone-current]');
      if (current) current.textContent = 'vários';
      const toggle = wrapper.querySelector('input[type="checkbox"]');
      if (toggle) toggle.indeterminate = true;
    });
  }

  /** Acima da barra da seleção, centralizado; no celular ocupa a largura. */
  function place() {
    if (!session) return;
    const margin = 8;
    const width = Math.min(448, window.innerWidth - margin * 2);
    const barTop = bar.hidden ? window.innerHeight : bar.getBoundingClientRect().top;
    const bottom = barTop - margin;
    panel.style.width = `${width}px`;
    panel.style.maxHeight = `${Math.max(160, bottom - margin)}px`;
    const height = panel.offsetHeight;
    panel.style.left = `${Math.round((window.innerWidth - width) / 2)}px`;
    panel.style.top = `${Math.round(clamp(bottom - height, margin, Math.max(margin, window.innerHeight - height - margin)))}px`;
  }

  /** Lembra o controle com foco para devolvê-lo depois de redesenhar o painel. */
  function captureFocus() {
    const active = document.activeElement;
    if (!active || !panel.contains(active)) return null;
    return { type: active.closest('[data-type]')?.dataset.type, path: active.dataset.path, value: active.type === 'radio' ? active.value : null, close: active.matches('[data-bulk="close"]') };
  }

  function restoreFocus(snapshot) {
    if (!snapshot) return;
    let target = null;
    if (snapshot.close) target = panel.querySelector('[data-bulk="close"]');
    else if (snapshot.type && snapshot.path) {
      const scope = panel.querySelector(`[data-type="${CSS.escape(snapshot.type)}"]`);
      const selector = `[data-path="${CSS.escape(snapshot.path)}"]${snapshot.value != null ? `[value="${CSS.escape(snapshot.value)}"]` : ''}`;
      target = scope?.querySelector(selector) ?? scope?.querySelector(`[data-path="${CSS.escape(snapshot.path)}"]`);
    }
    (target ?? panel.querySelector('[data-bulk="close"]'))?.focus({ preventScroll: true });
  }

  function refresh() {
    const focus = captureFocus();
    const scroll = panel.scrollTop;
    render();
    panel.scrollTop = scroll;
    restoreFocus(focus);
    place();
  }

  function open() {
    if (!selection.many) return;
    if (session) { refresh(); return; }
    session = { returnFocus: document.activeElement };
    render();
    if (supportsPopover) panel.showPopover();
    else panel.hidden = false;
    trigger?.setAttribute('aria-expanded', 'true');
    place();
    (panel.querySelector('.bulk-edit__group input:checked, .bulk-edit__group input') ?? panel.querySelector('[data-bulk="close"]'))?.focus({ preventScroll: true });
    actions.announce(`Editar ${countLabel(selection.ids().length)}. Esc fecha.`);
  }

  function close({ restoreFocus: giveBack = true } = {}) {
    if (!session) return;
    const { returnFocus } = session;
    session = null;
    store.breakCoalescing();
    if (supportsPopover) { if (panel.matches(':popover-open')) panel.hidePopover(); } else panel.hidden = true;
    panel.innerHTML = '';
    trigger?.setAttribute('aria-expanded', 'false');
    if (!giveBack) return;
    const back = !bar.hidden && trigger ? trigger : returnFocus;
    if (back?.isConnected && back !== document.body) back.focus({ preventScroll: true });
  }

  /** Valor escolhido num controle do painel → todos os blocos daquele tipo na seleção. */
  function apply(event) {
    const control = event.target.closest('[data-path]');
    const type = control?.closest('[data-type]')?.dataset.type;
    if (!control || !type || (control.type === 'radio' && !control.checked)) return;
    const field = bulkField(type, control.dataset.path);
    if (!field) return;
    const ids = selectedBlocks().filter((block) => block.type === type).map((block) => block.id);
    const value = readControlValue(control);
    if (field.kind === 'range') {
      const output = control.parentElement.querySelector('output');
      if (output) output.textContent = `${control.value}${field.unit ?? ''}`;
    }
    // Arrastar o controle deslizante ou digitar um número vira um passo de desfazer só.
    const continuous = field.kind === 'range' || field.kind === 'number';
    const changed = actions.setBlocksField(ids, field.key, value, { coalesce: continuous ? `bulk:${type}:${field.key}:${ids.join(',')}` : null });
    const wrapper = control.closest('.bulk-edit__field');
    wrapper?.removeAttribute('data-mixed');
    if (control.type === 'checkbox') control.indeterminate = false;
    if (changed && !continuous) actions.announce(`${field.label}: ${valueLabel(field, value)} em ${countLabel(ids.length)}.`);
  }

  /** Paradas do Tab: cada grupo de rádios para uma vez (no marcado ou, com valores diferentes, no primeiro). */
  function tabStops() {
    const radios = (name) => panel.querySelectorAll(`input[type="radio"][name="${CSS.escape(name)}"]`);
    return [...panel.querySelectorAll('input, button:not([tabindex="-1"])')].filter((el) => {
      if (el.offsetParent === null) return false;
      if (el.type !== 'radio') return true;
      const group = [...radios(el.name)];
      return el.checked || (!group.some((radio) => radio.checked) && el === group[0]);
    });
  }

  panel.addEventListener('input', apply);
  panel.addEventListener('change', (event) => {
    // Fim do arraste ou do número digitado: anuncia uma vez.
    const control = event.target.closest('[data-path]');
    const type = control?.closest('[data-type]')?.dataset.type;
    const field = type && bulkField(type, control.dataset.path);
    if (!field || (field.kind !== 'range' && field.kind !== 'number')) return;
    store.breakCoalescing();
    const count = selectedBlocks().filter((block) => block.type === type).length;
    actions.announce(`${field.label}: ${valueLabel(field, readControlValue(control))} em ${countLabel(count)}.`);
  });
  panel.addEventListener('click', (event) => {
    if (event.target.closest('[data-bulk="close"]')) close();
  });
  panel.addEventListener('keydown', (event) => {
    if (event.key === 'Escape') {
      event.preventDefault();
      event.stopPropagation();
      close();
    } else if (event.key === 'Tab') {
      // Foco preso no painel enquanto ele está aberto (como no campo da edição na página).
      const focusable = tabStops();
      const first = focusable[0];
      const last = focusable.at(-1);
      if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); }
      else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
    }
  });

  trigger?.addEventListener('click', () => (isOpen() ? close() : open()));

  // Clique fora fecha; mexer na seleção (cartões, Estrutura, prévia), no aviso ou num menu não conta.
  document.addEventListener('pointerdown', (event) => {
    if (!session || panel.contains(event.target)) return;
    if (event.target.closest?.('#selection-bar, .block-card, #outline-list, #pages, .toast-region, dialog[open], .context-menu')) return;
    close({ restoreFocus: false });
  }, true);

  // Desfazer, edição no editor ou outra seleção: o painel mostra os valores atuais.
  store.subscribe((doc, change) => {
    if (!session) return;
    if (change.source === 'bulk') requestAnimationFrame(place);
    else refresh();
  });
  ui.subscribe((state, changed) => {
    if (!session || !changed.includes('selectedIds')) return;
    if (selection.many) refresh();
    else close({ restoreFocus: false });
  });
  window.addEventListener('resize', () => requestAnimationFrame(place));

  return { open, close, isOpen, contains: (element) => panel.contains(element) };
}
