/**
 * Comportamento dos controles próprios do projeto (nenhum usa a aparência
 * nativa do navegador):
 * - campo numérico com botões − e + (as setas nativas ficam ocultas);
 * - controle deslizante com a parte preenchida desenhada pelo CSS (--fill);
 * - paleta de cores (rádios) que mostra o nome da cor escolhida;
 * - campo de busca com botão próprio de limpar.
 *
 * Tudo por delegação de eventos no documento, então vale também para os
 * controles criados depois (cartões do editor redesenhados, diálogos).
 * Os controles continuam sendo <input> reais: teclado, leitores de tela e o
 * evento "input" que o editor escuta funcionam como antes.
 */

/** Percentual preenchido de um controle deslizante, usado pelo CSS. */
export function rangeFill(input) {
  const min = Number(input.min || 0);
  const max = Number(input.max || 100);
  const value = Number(input.value);
  return `${max > min ? ((value - min) / (max - min)) * 100 : 0}%`;
}

function dispatchInput(input) {
  input.dispatchEvent(new Event('input', { bubbles: true }));
  input.dispatchEvent(new Event('change', { bubbles: true }));
}

function syncSearchClear(input) {
  const clear = input.parentElement?.querySelector('[data-search-clear]');
  if (clear) clear.hidden = !input.value;
}

export function setupControls(root = document) {
  root.addEventListener('click', (event) => {
    const stepButton = event.target.closest('[data-step]');
    if (stepButton) {
      const input = stepButton.closest('.stepper')?.querySelector('input');
      if (!input || input.disabled) return;
      if (stepButton.dataset.step === 'up') input.stepUp();
      else input.stepDown();
      dispatchInput(input);
      return;
    }
    const clear = event.target.closest('[data-search-clear]');
    if (clear) {
      const input = clear.parentElement.querySelector('input');
      input.value = '';
      dispatchInput(input);
      input.focus();
    }
  });

  root.addEventListener('input', (event) => {
    const input = event.target;
    if (!(input instanceof HTMLInputElement)) return;
    if (input.type === 'range') input.style.setProperty('--fill', rangeFill(input));
    if (input.type === 'search') syncSearchClear(input);
    if (input.type === 'radio' && input.checked) {
      const current = input.closest('.tone-picker')?.querySelector('[data-tone-current]');
      if (current) current.textContent = input.dataset.name ?? '';
    }
  });
}
