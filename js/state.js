/**
 * Estado central.
 *
 * - `createStore`: o documento (meta, design, blocos) com histórico de
 *   desfazer/refazer. Toda alteração passa por `update(mutator, change)`;
 *   `change.kind` diz aos assinantes o que mudou, para que cada parte da
 *   interface redesenhe só o necessário.
 * - `createUiState`: estado efêmero da interface (seleção, painel, zoom...),
 *   que não entra no histórico nem é salvo junto com o documento.
 */

const HISTORY_LIMIT = 150;
const COALESCE_WINDOW_MS = 1200;

/**
 * Tipos de mudança emitidos:
 *  - content   texto de um bloco (o editor não precisa se redesenhar)
 *  - block     estrutura interna de um bloco (itens, linhas de tabela)
 *  - structure inclusão, remoção ou reordenação de blocos
 *  - design    aparência do documento
 *  - meta      textos fixos (capa, cabeçalho, contracapa)
 *  - name      nome do arquivo
 *  - replace   documento inteiro trocado (abrir, desfazer, refazer)
 */
export function createStore(initialDoc) {
  let doc = initialDoc;
  let past = [];
  let future = [];
  let lastCoalesceKey = null;
  let lastUpdateAt = 0;
  const listeners = new Set();

  const emit = (change) => listeners.forEach((listener) => listener(doc, change));

  return {
    get doc() { return doc; },
    get canUndo() { return past.length > 0; },
    get canRedo() { return future.length > 0; },

    subscribe(listener) {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },

    /**
     * Aplica uma alteração. Digitação contínua no mesmo campo (mesmo
     * `coalesce`) vira um único passo de desfazer.
     */
    update(mutator, change = { kind: 'content' }) {
      const now = Date.now();
      const sameBurst = change.coalesce && change.coalesce === lastCoalesceKey && now - lastUpdateAt < COALESCE_WINDOW_MS;
      if (!sameBurst) {
        past.push(structuredClone(doc));
        if (past.length > HISTORY_LIMIT) past.shift();
      }
      lastCoalesceKey = change.coalesce ?? null;
      lastUpdateAt = now;
      future = [];
      mutator(doc);
      doc.updatedAt = now;
      emit(change);
    },

    undo() {
      if (!past.length) return false;
      future.push(structuredClone(doc));
      doc = past.pop();
      lastCoalesceKey = null;
      emit({ kind: 'replace', source: 'history' });
      return true;
    },

    redo() {
      if (!future.length) return false;
      past.push(structuredClone(doc));
      doc = future.pop();
      lastCoalesceKey = null;
      emit({ kind: 'replace', source: 'history' });
      return true;
    },

    /** Troca o documento inteiro (abrir outro arquivo); zera o histórico. */
    replace(nextDoc) {
      doc = nextDoc;
      past = [];
      future = [];
      lastCoalesceKey = null;
      emit({ kind: 'replace', source: 'load' });
    },

    /**
     * Marca do passo mais recente do histórico. O "Desfazer" de um aviso
     * guarda a marca da ação anunciada e só desfaz se ela ainda for o último
     * passo (não desfaz outra edição feita depois, nem a mesma duas vezes).
     */
    historyMark() {
      return past.at(-1) ?? null;
    },

    undoIfLast(mark) {
      if (!mark || past.at(-1) !== mark) return false;
      return this.undo();
    },

    /** Encerra a "rajada" de digitação atual (ex.: ao trocar de campo). */
    breakCoalescing() {
      lastCoalesceKey = null;
    },
  };
}

export function createUiState(initial) {
  const state = { ...initial };
  const listeners = new Set();
  return {
    get: (key) => state[key],
    snapshot: () => ({ ...state }),
    set(patch) {
      const changed = Object.keys(patch).filter((key) => state[key] !== patch[key]);
      if (!changed.length) return;
      Object.assign(state, patch);
      listeners.forEach((listener) => listener(state, changed));
    },
    subscribe(listener) {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
  };
}
