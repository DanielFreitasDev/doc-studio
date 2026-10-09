/**
 * Seleção de vários blocos e área de transferência de blocos.
 *
 * Seleção: Ctrl (⌘ no Mac) + clique junta ou tira um bloco; Shift + clique
 * seleciona do bloco atual até o clicado; Ctrl+A na lista de blocos seleciona
 * todos; Esc volta a um só. Vale no editor, na Estrutura e na prévia. Com mais
 * de um bloco, uma barra mostra o que dá para fazer com eles, inclusive mudar
 * opções de todos de uma vez (edição em conjunto, js/bulkedit.js).
 *
 * Copiar/recortar/colar blocos usa os eventos nativos copy/cut/paste (Ctrl+C,
 * Ctrl+X, Ctrl+V), sem pedir permissão ao navegador. O conteúdo vai como texto
 * (cola legível no Word ou no e-mail) e, no HTML, com os blocos e as imagens
 * em JSON: colar em outro documento ou aba do Estúdio traz os blocos de volta,
 * reconstruídos campo a campo (normalizeBlock), como na importação de arquivo.
 * Texto comum colado fora de um campo vira blocos (como "Escrever texto").
 */
import { $, esc, isTypingTarget } from './utils.js';
import { normalizeBlock, blockPlainText } from './schema.js';
import { cloneBlock } from './model.js';
import { markdownToBlocks } from './markdown.js';
import { bulkGroups, fieldMenuItems } from './bulkedit.js';

const CLIPBOARD_ATTRIBUTE = 'data-doc-studio-blocks';
const CLIPBOARD_VERSION = 1;

export function createBlockSelection({ store, ui, assets, actions }) {
  const bar = $('#selection-bar');
  const count = $('#selection-count');

  /** Ids selecionados na ordem do documento (a seleção simples conta como um). */
  function ids() {
    const set = ui.get('selectedIds');
    const primary = ui.get('selectedId');
    const chosen = set?.size ? set : new Set(primary ? [primary] : []);
    return store.doc.blocks.filter((block) => chosen.has(block.id)).map((block) => block.id);
  }

  const has = (id) => ui.get('selectedIds')?.has(id) || ui.get('selectedId') === id;

  function setMany(list, primary = list.at(-1)) {
    ui.set({ selectedIds: list.length > 1 ? new Set(list) : new Set(), selectedId: primary ?? null, selectSource: 'multi' });
    if (list.length > 1) actions.announce(`${list.length} blocos selecionados.`);
  }

  /** Ctrl + clique: junta ou tira o bloco da seleção. */
  function toggle(id) {
    const current = ids();
    const next = current.includes(id) ? current.filter((other) => other !== id) : [...current, id];
    setMany(next, next.includes(id) ? id : next.at(-1));
  }

  /** Shift + clique: do bloco atual (âncora) até o clicado. */
  function extendTo(id) {
    const anchor = ui.get('selectedId');
    const from = actions.indexOf(anchor);
    const to = actions.indexOf(id);
    if (from < 0 || to < 0) return setMany([id], id);
    const [a, b] = from < to ? [from, to] : [to, from];
    const list = store.doc.blocks.slice(a, b + 1).map((block) => block.id);
    ui.set({ selectedIds: list.length > 1 ? new Set(list) : new Set(), selectedId: anchor, selectSource: 'multi' });
    actions.announce(`${list.length} blocos selecionados.`);
  }

  function clear() {
    if (ui.get('selectedIds')?.size) ui.set({ selectedIds: new Set() });
  }

  function selectAll() {
    setMany(store.doc.blocks.map((block) => block.id), ui.get('selectedId') ?? store.doc.blocks[0]?.id);
  }

  /** Trata o clique com Ctrl/Shift. Retorna true se o clique era de seleção. */
  function handleClick(event, id) {
    if (!(event.ctrlKey || event.metaKey || event.shiftKey) || !id) return false;
    if (event.shiftKey) extendTo(id);
    else toggle(id);
    return true;
  }

  /* ---------------------------------------------------------------- área de transferência */
  function payloadFor(list) {
    const blocks = store.doc.blocks.filter((block) => list.includes(block.id));
    const imageIds = blocks.filter((block) => block.type === 'image' && block.assetId).map((block) => block.assetId);
    const text = blocks.map(blockPlainText).filter(Boolean).join('\n\n');
    const json = JSON.stringify({ version: CLIPBOARD_VERSION, blocks, assets: assets.serialize(imageIds) });
    const readable = text.split(/\n{2,}/).map((part) => `<p>${esc(part).replace(/\n/g, '<br>')}</p>`).join('');
    return { blocks, text, html: `<div ${CLIPBOARD_ATTRIBUTE}="${esc(json)}">${readable}</div>` };
  }

  /** Blocos copiados pelo Estúdio dentro do HTML colado, já validados e com ids novos. */
  function blocksFromHtml(html) {
    if (!html || !html.includes(CLIPBOARD_ATTRIBUTE)) return null;
    try {
      const holder = new DOMParser().parseFromString(html, 'text/html').querySelector(`[${CLIPBOARD_ATTRIBUTE}]`);
      const data = JSON.parse(holder?.getAttribute(CLIPBOARD_ATTRIBUTE) ?? 'null');
      if (data?.version !== CLIPBOARD_VERSION || !Array.isArray(data.blocks)) return null;
      assets.merge(data.assets);
      return data.blocks.slice(0, 500).map(normalizeBlock).filter(Boolean).map(cloneBlock)
        .map((block) => (block.type === 'image' && !assets.has(block.assetId) ? { ...block, assetId: '' } : block));
    } catch {
      return null;
    }
  }

  /** Ctrl+C / Ctrl+X fora de um campo de texto, sem texto selecionado na página: copia os blocos. */
  function blockClipboardTarget(event) {
    if (isTypingTarget(event.target) || event.target.closest?.('dialog, .menu, .quick-edit')) return false;
    if (window.getSelection()?.toString()) return false;
    return ids().length > 0;
  }

  function onCopy(event, cut) {
    if (!blockClipboardTarget(event)) return;
    const list = ids();
    const { text, html } = payloadFor(list);
    event.clipboardData.setData('text/plain', text);
    event.clipboardData.setData('text/html', html);
    event.preventDefault();
    if (cut) removeMany(list, { verb: 'recortado' });
    else actions.notify(list.length === 1 ? 'Bloco copiado. Ctrl+V cola depois do bloco selecionado (também em outro documento).' : `${list.length} blocos copiados.`);
  }

  document.addEventListener('copy', (event) => onCopy(event, false));
  document.addEventListener('cut', (event) => onCopy(event, true));

  /**
   * Colar fora de um campo de texto: blocos copiados do Estúdio ou texto comum
   * (vira blocos). Imagens são tratadas pelo app (viram bloco de imagem).
   * Retorna true se colou algo.
   */
  function paste(event) {
    if (isTypingTarget(event.target) || event.target.closest?.('dialog, .quick-edit')) return false;
    const data = event.clipboardData;
    const blocks = blocksFromHtml(data?.getData('text/html'));
    if (blocks?.length) {
      event.preventDefault();
      actions.insertBlocks(blocks, actions.insertionIndex(), { focus: false });
      setMany(blocks.map((block) => block.id));
      actions.notify(blocks.length === 1 ? 'Bloco colado.' : `${blocks.length} blocos colados.`, 'info', { undo: true });
      return true;
    }
    const text = data?.getData('text/plain') ?? '';
    if (!text.trim()) return false;
    event.preventDefault();
    const fromText = markdownToBlocks(text);
    actions.insertBlocks(fromText, actions.insertionIndex(), { focus: false });
    actions.notify(fromText.length === 1 ? 'Texto colado como um bloco.' : `Texto colado como ${fromText.length} blocos.`, 'info', { undo: true });
    return true;
  }

  /* ---------------------------------------------------------------- ações em grupo */
  function removeMany(list = ids(), { verb = 'excluído' } = {}) {
    if (!list.length) return;
    if (list.length === 1) {
      actions.removeBlock(list[0], { verb });
      return;
    }
    const first = actions.indexOf(list[0]);
    const set = new Set(list);
    store.update((doc) => { doc.blocks = doc.blocks.filter((block) => !set.has(block.id)); }, { kind: 'structure' });
    const neighbor = store.doc.blocks[Math.min(first, store.doc.blocks.length - 1)];
    ui.set({ selectedIds: new Set(), selectedId: neighbor?.id ?? null, selectSource: 'remove' });
    actions.notify(`${list.length} blocos ${verb === 'recortado' ? 'recortados' : 'excluídos'}.`, 'info', { undo: true });
  }

  function duplicateMany(list = ids()) {
    if (list.length <= 1) {
      if (list[0]) actions.duplicateBlock(list[0]);
      return;
    }
    const copies = store.doc.blocks.filter((block) => list.includes(block.id)).map(cloneBlock);
    actions.insertBlocks(copies, actions.indexOf(list.at(-1)) + 1, { focus: false });
    setMany(copies.map((block) => block.id));
    actions.notify(`${copies.length} blocos duplicados.`, 'info', { undo: true });
  }

  /** Move a seleção uma posição (se os blocos forem vizinhos; senão, só o bloco atual). */
  function moveMany(delta, list = ids()) {
    const indexes = list.map(actions.indexOf);
    const contiguous = indexes.every((index, i) => i === 0 || index === indexes[i - 1] + 1);
    if (list.length <= 1 || !contiguous) {
      const id = ui.get('selectedId') ?? list[0];
      if (id) actions.moveBlockBy(id, delta);
      return;
    }
    const start = indexes[0];
    const end = indexes.at(-1);
    if ((delta < 0 && start === 0) || (delta > 0 && end === store.doc.blocks.length - 1)) return;
    store.update((doc) => {
      const group = doc.blocks.splice(start, list.length);
      doc.blocks.splice(start + delta, 0, ...group);
    }, { kind: 'structure' });
    actions.announce(`${list.length} blocos movidos.`);
  }

  async function copyMany(list = ids(), { cut = false } = {}) {
    const { text, html } = payloadFor(list);
    let ok = false;
    try {
      await navigator.clipboard.write([new ClipboardItem({
        'text/plain': new Blob([text], { type: 'text/plain' }),
        'text/html': new Blob([html], { type: 'text/html' }),
      })]);
      ok = true;
    } catch { ok = false; }
    if (!ok) {
      actions.notify(`O navegador não liberou a área de transferência para o menu. Use ${navigator.platform?.includes('Mac') ? '⌘C' : 'Ctrl+C'}.`, 'error');
      return;
    }
    if (cut) removeMany(list, { verb: 'recortado' });
    else actions.notify(list.length === 1 ? 'Bloco copiado.' : `${list.length} blocos copiados.`);
  }

  async function pasteFromMenu(index) {
    try {
      const items = await navigator.clipboard.read();
      for (const item of items) {
        if (item.types.includes('text/html')) {
          const blocks = blocksFromHtml(await (await item.getType('text/html')).text());
          if (blocks?.length) {
            actions.insertBlocks(blocks, index, { focus: false });
            actions.notify(blocks.length === 1 ? 'Bloco colado.' : `${blocks.length} blocos colados.`, 'info', { undo: true });
            return;
          }
        }
      }
      const text = await navigator.clipboard.readText();
      const blocks = markdownToBlocks(text);
      if (!blocks.length) {
        actions.notify('A área de transferência está vazia.', 'error');
        return;
      }
      actions.insertBlocks(blocks, index, { focus: false });
      actions.notify(`Texto colado como ${blocks.length} ${blocks.length === 1 ? 'bloco' : 'blocos'}.`, 'info', { undo: true });
    } catch {
      actions.notify(`O navegador não liberou a área de transferência para o menu. Use ${navigator.platform?.includes('Mac') ? '⌘V' : 'Ctrl+V'}.`, 'error');
    }
  }

  /* ---------------------------------------------------------------- teclado */
  /** Foco "no bloco" (não num campo nem num botão qualquer): onde Delete exclui o bloco. */
  const isBlockFocus = (target) => target === document.body
    || Boolean(target.closest?.('#preview-scroll'))
    || Boolean(target.matches?.('[data-drag-handle], .block-card__type, .outline__link, #editor-list'));

  document.addEventListener('keydown', (event) => {
    if (event.defaultPrevented || isTypingTarget(event.target) || event.target.closest?.('dialog, .menu, .quick-edit, .block-picker')) return;
    const mod = event.ctrlKey || event.metaKey;
    if ((event.key === 'Delete' || event.key === 'Backspace') && !mod && isBlockFocus(event.target) && ids().length) {
      // Como num editor visual: Delete exclui o que está selecionado (com "Desfazer").
      event.preventDefault();
      removeMany();
    } else if (mod && event.key.toLowerCase() === 'a' && event.target.closest?.('#editor-list, #outline-list')) {
      event.preventDefault();
      selectAll();
    } else if (event.key === 'Escape' && ui.get('selectedIds')?.size) {
      event.preventDefault();
      clear();
    }
  });

  /* ---------------------------------------------------------------- barra da seleção */
  function syncBar() {
    const list = ui.get('selectedIds');
    const many = list?.size > 1;
    bar.hidden = !many;
    if (many) count.textContent = `${list.size} blocos selecionados`;
  }

  bar.addEventListener('click', (event) => {
    const action = event.target.closest('[data-selection]')?.dataset.selection;
    const list = ids();
    if (action === 'duplicate') duplicateMany(list);
    if (action === 'copy') copyMany(list);
    if (action === 'cut') copyMany(list, { cut: true });
    if (action === 'delete') removeMany(list);
    if (action === 'up') moveMany(-1, list);
    if (action === 'down') moveMany(1, list);
    if (action === 'clear') clear();
  });

  ui.subscribe((state, changed) => {
    // Uma seleção comum (clique sem Ctrl/Shift) volta a um bloco só.
    if (changed.includes('selectedId') && !changed.includes('selectedIds') && state.selectSource !== 'multi' && state.selectedIds?.size) {
      ui.set({ selectedIds: new Set() });
      return;
    }
    if (changed.includes('selectedIds')) syncBar();
  });

  // Blocos que deixaram de existir saem da seleção (desfazer, excluir).
  store.subscribe(() => {
    const set = ui.get('selectedIds');
    if (!set?.size) return;
    const existing = [...set].filter((id) => actions.indexOf(id) >= 0);
    if (existing.length !== set.size) ui.set({ selectedIds: existing.length > 1 ? new Set(existing) : new Set() });
  });

  /** Itens do menu de contexto quando o bloco clicado faz parte de uma seleção de vários. */
  function menuItems() {
    const list = ids();
    const indexes = list.map(actions.indexOf);
    const contiguous = indexes.every((index, i) => i === 0 || index === indexes[i - 1] + 1);
    // Edição em conjunto (js/bulkedit.js): com um tipo só, as opções dele aqui mesmo; com vários, o painel.
    const groups = bulkGroups(store.doc.blocks.filter((block) => list.includes(block.id))).filter((group) => group.fields.length);
    const options = groups.length === 1
      ? fieldMenuItems(groups[0].fields, (key, value) => actions.setBlocksField(groups[0].ids, key, value, { notice: true }))
      : [];
    return {
      title: `${list.length} blocos selecionados`,
      icon: 'blocks',
      items: [
        { label: 'Duplicar', icon: 'copy', shortcut: 'Ctrl+D', run: () => duplicateMany(list) },
        { label: 'Copiar', icon: 'clipboard', shortcut: 'Ctrl+C', run: () => copyMany(list) },
        { label: 'Recortar', icon: 'scissors', shortcut: 'Ctrl+X', run: () => copyMany(list, { cut: true }) },
        { label: 'Copiar para IA (JSON)', icon: 'sparkles', run: () => actions.copyForAi(list) },
        { separator: true },
        ...options,
        { label: 'Editar em conjunto…', icon: 'edit', disabled: !groups.length, run: () => actions.openBulkEdit() },
        { separator: true },
        { label: 'Mover para cima', icon: 'chevron-up', shortcut: 'Alt+↑', disabled: !contiguous || indexes[0] === 0, run: () => moveMany(-1, list) },
        { label: 'Mover para baixo', icon: 'chevron-down', shortcut: 'Alt+↓', disabled: !contiguous || indexes.at(-1) === store.doc.blocks.length - 1, run: () => moveMany(1, list) },
        { separator: true },
        { label: 'Selecionar só este bloco', icon: 'check', run: () => clear() },
        { label: `Excluir ${list.length} blocos`, icon: 'trash', danger: true, shortcut: 'Delete', run: () => removeMany(list) },
      ],
    };
  }

  syncBar();

  return {
    ids, has, toggle, extendTo, clear, selectAll, handleClick, paste,
    select: setMany,
    removeMany, duplicateMany, moveMany, copyMany, pasteFromMenu, menuItems,
    get many() { return (ui.get('selectedIds')?.size ?? 0) > 1; },
  };
}
