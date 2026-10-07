/**
 * Geração dos campos de formulário a partir das definições de campo do
 * catálogo (schema.js) e dos textos fixos (design.js).
 *
 * Cada controle recebe `data-path` (ex.: "items.2.title"), que o editor usa
 * para gravar o valor no lugar certo do bloco. Todo valor é escapado.
 */
import { esc, icon } from './utils.js';
import { FORMATS } from './markup.js';

const idFor = (base, path) => `${base}-${path.replace(/[^\w-]/g, '-')}`;

function label(id, text) {
  return `<label for="${id}">${esc(text)}</label>`;
}

function hint(field, id) {
  return field.hint ? `<p class="field__hint" id="${id}-hint">${esc(field.hint)}</p>` : '';
}

function richToolbar(id, labelText) {
  // Barra com "tabindex móvel": uma só parada de Tab; as setas trocam de botão.
  const buttons = Object.entries(FORMATS).map(([name, format], index) => {
    const shortcut = format.key ? ` (Ctrl+${format.key.toUpperCase()})` : '';
    return `<button type="button" class="icon-btn" data-format="${name}" data-target="${id}" aria-label="${format.label}${shortcut}" title="${format.label}${shortcut}" tabindex="${index === 0 ? 0 : -1}">${icon(format.icon)}</button>`;
  }).join('');
  return `<div class="rich__toolbar" role="toolbar" aria-label="Formatação: ${esc(labelText)}" aria-controls="${id}">${buttons}</div>`;
}

const RENDER = {
  text(field, value, id, path) {
    return `<div class="field">${label(id, field.label)}<input class="input${field.big ? ' input--title' : ''}" id="${id}" type="text" data-path="${path}" value="${esc(value)}"${field.placeholder ? ` placeholder="${esc(field.placeholder)}"` : ''} autocomplete="off" enterkeyhint="next"></div>`;
  },

  rich(field, value, id, path) {
    return `
      <div class="field">${label(id, field.label)}
        <div class="rich">
          ${richToolbar(id, field.label)}
          <textarea class="textarea" id="${id}" data-path="${path}" data-rich rows="${field.rows ?? 3}"${field.placeholder ? ` placeholder="${esc(field.placeholder)}"` : ''}>${esc(value)}</textarea>
        </div>
      </div>`;
  },

  lines(field, value, id, path) {
    const described = field.hint ? ` aria-describedby="${id}-hint"` : '';
    return `<div class="field">${label(id, field.label)}<textarea class="textarea" id="${id}" data-path="${path}" rows="${field.rows ?? 3}"${described}>${esc(value)}</textarea>${hint(field, id)}</div>`;
  },

  select(field, value, id, path) {
    const options = field.options.map((o) => `<option value="${esc(o.value)}"${o.value === value ? ' selected' : ''}>${esc(o.label)}</option>`).join('');
    return `<div class="field">${label(id, field.label)}<select class="select" id="${id}" data-path="${path}">${options}</select></div>`;
  },

  segmented(field, value, id, path) {
    const options = field.options.map((o) => `
      <label><input type="radio" name="${id}" value="${esc(o.value)}" data-path="${path}"${o.value === value ? ' checked' : ''}><span>${esc(o.label)}</span></label>`).join('');
    return `<fieldset class="field"><legend class="field__label">${esc(field.label)}</legend><div class="segmented segmented--block">${options}</div></fieldset>`;
  },

  toggle(field, value, id, path) {
    return `<label class="switch" for="${id}"><input type="checkbox" role="switch" id="${id}" data-path="${path}"${value ? ' checked' : ''}><span>${esc(field.label)}</span></label>`;
  },

  number(field, value, id, path) {
    return `<div class="field">${label(id, field.label)}<input class="input" id="${id}" type="number" inputmode="numeric" data-path="${path}" value="${esc(value)}" min="${field.min ?? 0}" max="${field.max ?? 9999}"></div>`;
  },

  range(field, value, id, path) {
    return `
      <div class="field">${label(id, field.label)}
        <div class="range">
          <input id="${id}" type="range" data-path="${path}" min="${field.min}" max="${field.max}" step="${field.step ?? 1}" value="${esc(value)}">
          <output for="${id}">${esc(value)}${field.unit ?? ''}</output>
        </div>
      </div>`;
  },

  items(field, value, id, path) {
    const itemLabel = field.itemLabel ?? 'Item';
    const items = value.map((item, index) => {
      const fields = field.fields.map((sub) => fieldHtml(sub, item[sub.key], { idBase: id, path: `${path}.${index}.${sub.key}` })).join('');
      const position = `${itemLabel} ${index + 1}`;
      return `
        <div class="item" data-index="${index}">
          <div class="item__head">
            <span class="item__title">${esc(position)}</span>
            <div class="item__actions">
              <button type="button" class="icon-btn icon-btn--sm" data-item-action="up" data-items-key="${path}" data-index="${index}" aria-label="Mover ${esc(position)} para cima"${index === 0 ? ' disabled' : ''}>${icon('chevron-up')}</button>
              <button type="button" class="icon-btn icon-btn--sm" data-item-action="down" data-items-key="${path}" data-index="${index}" aria-label="Mover ${esc(position)} para baixo"${index === value.length - 1 ? ' disabled' : ''}>${icon('chevron-down')}</button>
              <button type="button" class="icon-btn icon-btn--sm icon-btn--danger" data-item-action="remove" data-items-key="${path}" data-index="${index}" aria-label="Remover ${esc(position)}">${icon('trash')}</button>
            </div>
          </div>
          <div class="item__fields${field.split ? ' item__fields--split' : ''}${field.inline ? ' item__fields--inline' : ''}">${fields}</div>
        </div>`;
    }).join('');
    const canAdd = value.length < (field.max ?? 100);
    return `
      <fieldset class="items">
        <legend class="field__label">${esc(field.label)} (${value.length})</legend>
        ${items}
        <button type="button" class="btn btn--soft btn--small items__add" data-item-action="add" data-items-key="${path}"${canAdd ? '' : ' disabled'}>${icon('plus', 'icon--sm')}Adicionar ${esc(itemLabel.toLowerCase())}</button>
      </fieldset>`;
  },

  table(field, _value, id, _path, context) {
    const { header, rows } = context.block;
    const headCells = header.map((cell, c) =>
      `<th scope="col"><input data-path="header.${c}" value="${esc(cell)}" aria-label="Cabeçalho da coluna ${c + 1}" autocomplete="off"></th>`).join('');
    const bodyRows = rows.map((row, r) => `
      <tr>
        ${row.map((cell, c) => `<td><input data-path="rows.${r}.${c}" value="${esc(cell)}" aria-label="Linha ${r + 1}, coluna ${c + 1}" autocomplete="off"></td>`).join('')}
        <td class="row-tools"><button type="button" class="icon-btn icon-btn--sm icon-btn--danger" data-table-action="remove-row" data-index="${r}" aria-label="Remover linha ${r + 1}"${rows.length <= 1 ? ' disabled' : ''}>${icon('x')}</button></td>
      </tr>`).join('');
    const colTools = header.map((_, c) =>
      `<td class="col-tools"><button type="button" class="icon-btn icon-btn--sm icon-btn--danger" data-table-action="remove-col" data-index="${c}" aria-label="Remover coluna ${c + 1}"${header.length <= 1 ? ' disabled' : ''}>${icon('x')}</button></td>`).join('');
    return `
      <div class="field table-editor">
        <span class="field__label" id="${id}-label">${esc(field.label)}</span>
        <div class="table-editor__scroll" role="region" aria-label="Tabela: ${esc(header.join(', ').slice(0, 80))}" tabindex="0">
          <table>
            <thead><tr>${headCells}<th class="row-tools"><span class="visually-hidden">Ações</span></th></tr></thead>
            <tbody>${bodyRows}</tbody>
            <tfoot><tr>${colTools}<td></td></tr></tfoot>
          </table>
        </div>
        <div class="table-editor__actions">
          <button type="button" class="btn btn--soft btn--small" data-table-action="add-row">${icon('plus', 'icon--sm')}Linha</button>
          <button type="button" class="btn btn--soft btn--small" data-table-action="add-col"${header.length >= 12 ? ' disabled' : ''}>${icon('plus', 'icon--sm')}Coluna</button>
        </div>
        <p class="field__hint">Dica: copie células do Excel ou do Word e cole em qualquer célula para preencher várias de uma vez.</p>
      </div>`;
  },

  image(field, value, id, path, context) {
    const asset = value ? context.assets?.[value] : null;
    const preview = asset
      ? `<img src="${esc(asset.url)}" alt="Prévia da imagem escolhida" width="${asset.width}" height="${asset.height}">`
      : `${icon('image', 'icon--xl')}<span>Arraste uma imagem aqui, cole um print com <kbd>Ctrl</kbd> <kbd>V</kbd> ou escolha um arquivo.</span>`;
    return `
      <div class="field image-field">
        <span class="field__label">${esc(field.label)}</span>
        <div class="image-field__drop" data-image-drop data-path="${path}">${preview}</div>
        <div class="image-field__actions">
          <button type="button" class="btn btn--soft btn--small" data-image-action="choose" data-path="${path}">${icon('upload', 'icon--sm')}${asset ? 'Trocar imagem' : 'Escolher arquivo'}</button>
          ${asset ? `<button type="button" class="btn btn--ghost btn--small" data-image-action="remove" data-path="${path}">${icon('trash', 'icon--sm')}Remover</button>` : ''}
        </div>
      </div>`;
  },
};

export function fieldHtml(field, value, { idBase, path = field.key, context = {} }) {
  const render = RENDER[field.kind] ?? RENDER.text;
  return render(field, value ?? '', idFor(idBase, path), path, context);
}

/** Converte o valor de um controle para o tipo do campo. */
export function readControlValue(control) {
  if (control.type === 'checkbox') return control.checked;
  if (control.type === 'number' || control.type === 'range') {
    const number = Number(control.value);
    return Number.isFinite(number) ? number : 0;
  }
  return control.value;
}
