/**
 * Arrastar e soltar com Pointer Events (mouse, caneta e toque).
 *
 * O "drag and drop" nativo do HTML não funciona com toque na maioria dos
 * celulares, então o controle é feito à mão:
 *  - mouse/caneta: o arraste começa depois de mover alguns pixels;
 *  - toque em itens da paleta: exige um toque longo (para não brigar com a
 *    rolagem); na alça de arraste (touch-action: none) começa ao mover.
 * Sempre existe alternativa sem arrastar (clique, botões e teclado).
 */
import { icon } from './utils.js';

const MOVE_THRESHOLD = 5;
const LONG_PRESS_MS = 380;
const AUTOSCROLL_EDGE = 56;
const SCROLLERS = '.editor-pane, .preview-scroll, .panel__body';

export function createDragController({ resolveDrop, onDrop }) {
  let session = null;

  const ghost = document.createElement('div');
  ghost.className = 'drag-ghost';
  ghost.hidden = true;
  const indicator = document.createElement('div');
  indicator.className = 'drop-indicator';
  indicator.hidden = true;
  document.body.append(ghost, indicator);

  const preventTouchScroll = (event) => { if (session?.active) event.preventDefault(); };

  function activate() {
    session.active = true;
    ghost.innerHTML = `${icon(session.options.icon ?? 'grip')}<span></span>`;
    ghost.querySelector('span').textContent = session.options.label;
    ghost.hidden = false;
    document.body.classList.add('is-dragging');
    session.options.source?.classList.add('is-dragging');
    document.addEventListener('touchmove', preventTouchScroll, { passive: false });
    navigator.vibrate?.(10);
    update(session.x, session.y);
  }

  function update(x, y) {
    ghost.style.transform = `translate(${x + 14}px, ${y + 12}px)`;
    const target = resolveDrop(x, y, session.options.payload);
    session.target = target;
    if (target?.rect) {
      indicator.hidden = false;
      indicator.style.left = `${target.rect.left}px`;
      indicator.style.top = `${target.rect.top - 2}px`;
      indicator.style.width = `${target.rect.width}px`;
    } else {
      indicator.hidden = true;
    }
    autoscroll(x, y);
  }

  function autoscroll(x, y) {
    cancelAnimationFrame(session.scrollFrame);
    const scroller = document.elementFromPoint(x, y)?.closest(SCROLLERS);
    if (!scroller) return;
    const rect = scroller.getBoundingClientRect();
    let delta = 0;
    if (y < rect.top + AUTOSCROLL_EDGE) delta = -Math.ceil((rect.top + AUTOSCROLL_EDGE - y) / 4);
    else if (y > rect.bottom - AUTOSCROLL_EDGE) delta = Math.ceil((y - (rect.bottom - AUTOSCROLL_EDGE)) / 4);
    if (!delta) return;
    session.scrollFrame = requestAnimationFrame(() => {
      scroller.scrollTop += delta;
      if (session?.active) update(session.x, session.y);
    });
  }

  function finish(commit) {
    if (!session) return;
    const { active, target, options } = session;
    clearTimeout(session.longPressTimer);
    cancelAnimationFrame(session.scrollFrame);
    window.removeEventListener('pointermove', onMove);
    window.removeEventListener('pointerup', onUp);
    window.removeEventListener('pointercancel', onCancel);
    window.removeEventListener('keydown', onKey, true);
    document.removeEventListener('touchmove', preventTouchScroll);
    ghost.hidden = true;
    indicator.hidden = true;
    document.body.classList.remove('is-dragging');
    options.source?.classList.remove('is-dragging');
    session = null;

    if (active) {
      // Evita que o "click" disparado ao soltar acione o elemento de origem.
      // O "click" vem logo após o pointerup; depois disso o bloqueio é removido.
      const swallow = (event) => { event.stopPropagation(); event.preventDefault(); };
      window.addEventListener('click', swallow, { capture: true, once: true });
      setTimeout(() => window.removeEventListener('click', swallow, true), 0);
      if (commit && target) onDrop(options.payload, target);
    }
  }

  function onMove(event) {
    if (!session || event.pointerId !== session.pointerId) return;
    session.x = event.clientX;
    session.y = event.clientY;
    if (session.active) {
      event.preventDefault();
      update(session.x, session.y);
      return;
    }
    const distance = Math.hypot(session.x - session.startX, session.y - session.startY);
    if (session.longPress) {
      if (distance > 10) finish(false); // virou rolagem
    } else if (distance > MOVE_THRESHOLD) {
      activate();
    }
  }

  const onUp = (event) => { if (session && event.pointerId === session.pointerId) finish(true); };
  const onCancel = () => finish(false);
  const onKey = (event) => {
    if (event.key === 'Escape' && session?.active) {
      event.preventDefault();
      event.stopPropagation();
      finish(false);
    }
  };

  return {
    /**
     * Inicia um possível arraste a partir de um pointerdown.
     * options: { payload, label, icon, source, longPressOnTouch }
     */
    begin(event, options) {
      if (event.button !== 0 || session) return;
      session = {
        options,
        pointerId: event.pointerId,
        startX: event.clientX,
        startY: event.clientY,
        x: event.clientX,
        y: event.clientY,
        active: false,
        longPress: event.pointerType === 'touch' && options.longPressOnTouch,
        target: null,
      };
      if (session.longPress) {
        session.longPressTimer = setTimeout(() => session && !session.active && activate(), LONG_PRESS_MS);
      }
      window.addEventListener('pointermove', onMove, { passive: false });
      window.addEventListener('pointerup', onUp);
      window.addEventListener('pointercancel', onCancel);
      window.addEventListener('keydown', onKey, true);
    },
    get dragging() { return Boolean(session?.active); },
  };
}

/* ------------------------------------------------------------------ alvos de soltura */
/**
 * Lista vertical (editor, estrutura): devolve a posição de inserção pelo
 * ponto médio de cada item e a linha indicadora entre eles.
 */
export function resolveListDrop(container, itemSelector, x, y) {
  const area = container.closest(SCROLLERS) ?? container;
  const bounds = area.getBoundingClientRect();
  if (x < bounds.left || x > bounds.right || y < bounds.top || y > bounds.bottom) return null;
  if (area.offsetParent === null) return null;

  const items = [...container.querySelectorAll(itemSelector)];
  const listRect = container.getBoundingClientRect();
  if (!items.length) return { index: 0, rect: { left: listRect.left, width: listRect.width, top: listRect.top + 8 } };

  for (let i = 0; i < items.length; i += 1) {
    const rect = items[i].getBoundingClientRect();
    if (y < rect.top + rect.height / 2) {
      const previous = items[i - 1]?.getBoundingClientRect();
      const top = previous ? (previous.bottom + rect.top) / 2 : rect.top - 6;
      return { index: i, rect: { left: rect.left, width: rect.width, top } };
    }
  }
  const last = items.at(-1).getBoundingClientRect();
  return { index: items.length, rect: { left: last.left, width: last.width, top: last.bottom + 6 } };
}

/**
 * Prévia: o ponto sob o dedo/cursor indica antes ou depois de qual bloco
 * inserir. Capa = início do documento; contracapa = fim.
 */
export function resolvePreviewDrop(pagesRoot, blocks, x, y) {
  const scroller = pagesRoot.closest('.preview-scroll');
  if (!scroller || scroller.offsetParent === null) return null;
  const bounds = scroller.getBoundingClientRect();
  if (x < bounds.left || x > bounds.right || y < bounds.top || y > bounds.bottom) return null;

  const element = document.elementFromPoint(x, y);
  const page = element?.closest('.page');
  if (!page || !pagesRoot.contains(page)) return null;
  const pageRect = page.getBoundingClientRect();

  if (page.dataset.target === 'cover') return { index: 0, rect: { left: pageRect.left, width: pageRect.width, top: pageRect.bottom } };
  if (page.dataset.target === 'back') return { index: blocks.length, rect: { left: pageRect.left, width: pageRect.width, top: pageRect.top } };

  const indexOf = (id) => blocks.findIndex((block) => block.id === id);
  let atomElement = element.closest('.atom[data-block-id]');
  if (!atomElement) {
    // Área vazia da página: insere depois do último bloco desta página.
    const atoms = page.querySelectorAll('.atom[data-block-id]');
    atomElement = atoms[atoms.length - 1];
    if (!atomElement) return null;
    const rect = atomElement.getBoundingClientRect();
    return { index: indexOf(atomElement.dataset.blockId) + 1, rect: { left: rect.left, width: rect.width, top: rect.bottom + 3 } };
  }
  const rect = atomElement.getBoundingClientRect();
  const index = indexOf(atomElement.dataset.blockId);
  if (index < 0) return null;
  const before = y < rect.top + rect.height / 2;
  return { index: before ? index : index + 1, rect: { left: rect.left, width: rect.width, top: before ? rect.top - 3 : rect.bottom + 3 } };
}
