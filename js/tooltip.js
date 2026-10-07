/**
 * Dicas de ferramenta próprias, no lugar da dica nativa do atributo `title`.
 *
 * A dica nativa usa a aparência do sistema operacional, demora a aparecer e
 * nunca surge pelo teclado. Aqui, qualquer elemento com `title` (inclusive os
 * criados depois) tem o texto movido para `data-tip` na primeira interação, o
 * que impede a dica nativa. Uma única dica é posicionada junto ao elemento:
 * - mouse: aparece após uma pausa curta (sem pausa se outra acabou de sumir);
 * - teclado: aparece no foco visível (`:focus-visible`);
 * - toque: não aparece (o texto continua acessível como nome do controle).
 * A dica usa `popover="manual"` para ficar acima dos diálogos (camada superior).
 */
const SHOW_DELAY = 450;
const WARM_WINDOW = 600;
const GAP = 8;
const MARGIN = 8;

const supportsPopover = typeof HTMLElement !== 'undefined' && 'showPopover' in HTMLElement.prototype;

export function setupTooltips() {
  const tip = document.createElement('div');
  tip.className = 'tooltip';
  tip.id = 'app-tooltip';
  tip.setAttribute('role', 'tooltip');
  if (supportsPopover) tip.popover = 'manual';
  else tip.hidden = true;
  document.body.append(tip);

  let current = null;
  let timer = 0;
  let lastHiddenAt = 0;

  /** Move o `title` para `data-tip`; sem nome acessível, o texto vira o aria-label. */
  function adopt(element) {
    const title = element.getAttribute('title');
    if (title === null) return;
    element.removeAttribute('title');
    if (!title.trim()) return;
    element.dataset.tip = title;
    const hasName = element.getAttribute('aria-label') || element.getAttribute('aria-labelledby') || element.textContent.trim();
    if (!hasName) element.setAttribute('aria-label', title);
  }

  function targetOf(node) {
    const element = node?.closest?.('[title], [data-tip]');
    // Nada de dicas dentro das páginas do documento (prévia e miniaturas).
    if (!element || element.closest('.doc')) return null;
    adopt(element);
    return element.dataset.tip ? element : null;
  }

  function position(element) {
    const rect = element.getBoundingClientRect();
    const width = tip.offsetWidth;
    const height = tip.offsetHeight;
    let left = rect.left + rect.width / 2 - width / 2;
    left = Math.min(Math.max(MARGIN, left), window.innerWidth - width - MARGIN);
    let top = rect.top - height - GAP;
    let placement = 'top';
    if (top < MARGIN) {
      top = rect.bottom + GAP;
      placement = 'bottom';
    }
    tip.style.left = `${Math.round(left)}px`;
    tip.style.top = `${Math.round(top)}px`;
    tip.dataset.placement = placement;
  }

  function show(element) {
    clearTimeout(timer);
    current = element;
    tip.textContent = element.dataset.tip;
    if (supportsPopover) {
      // Reabrir coloca a dica no topo da camada superior (acima de um diálogo aberto agora).
      if (tip.matches(':popover-open')) tip.hidePopover();
      tip.showPopover();
    } else {
      tip.hidden = false;
    }
    position(element);
    requestAnimationFrame(() => { if (current === element) tip.classList.add('is-visible'); });
    // Só descreve o controle quando a dica traz algo além do nome dele.
    if (element.getAttribute('aria-label') !== element.dataset.tip) element.setAttribute('aria-describedby', tip.id);
  }

  function hide() {
    clearTimeout(timer);
    if (!current) return;
    if (current.getAttribute('aria-describedby') === tip.id) current.removeAttribute('aria-describedby');
    current = null;
    lastHiddenAt = Date.now();
    tip.classList.remove('is-visible');
    if (supportsPopover) {
      if (tip.matches(':popover-open')) tip.hidePopover();
    } else {
      tip.hidden = true;
    }
  }

  function schedule(element) {
    clearTimeout(timer);
    const warm = Date.now() - lastHiddenAt < WARM_WINDOW;
    timer = setTimeout(() => show(element), warm ? 0 : SHOW_DELAY);
  }

  document.addEventListener('pointerover', (event) => {
    if (event.pointerType === 'touch') return;
    const element = targetOf(event.target);
    if (!element) {
      if (current && !current.contains(event.target)) hide();
      else clearTimeout(timer);
      return;
    }
    if (element !== current) {
      if (current) hide();
      schedule(element);
    }
  });

  document.addEventListener('pointerout', (event) => {
    const element = targetOf(event.target);
    if (element && !element.contains(event.relatedTarget)) {
      if (element === current) hide();
      else clearTimeout(timer);
    }
  });

  document.addEventListener('focusin', (event) => {
    const element = targetOf(event.target);
    if (element && element.matches(':focus-visible')) show(element);
    else hide();
  });
  document.addEventListener('focusout', () => hide());
  document.addEventListener('pointerdown', () => hide(), true);
  document.addEventListener('keydown', (event) => { if (event.key === 'Escape') hide(); }, true);
  document.addEventListener('scroll', () => hide(), true);
  window.addEventListener('blur', () => hide());
}
