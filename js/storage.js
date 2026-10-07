/**
 * Persistência local com IndexedDB (API nativa do navegador).
 *
 * Por que IndexedDB e não localStorage: documentos com prints facilmente
 * passam dos ~5 MB que o localStorage permite. Os dados ficam em dois
 * "object stores": `documents` (texto, leve, usado na listagem) e `assets`
 * (imagens), para que listar documentos não carregue todas as imagens.
 *
 * Se o IndexedDB estiver indisponível (modo privado restrito), o app segue
 * funcionando em memória e avisa que é preciso salvar o arquivo .json.
 */
const DB_NAME = 'doc-studio';
const DB_VERSION = 1;
const DOCUMENTS = 'documents';
const ASSETS = 'assets';

function promisify(request) {
  return new Promise((resolve, reject) => {
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

function openDatabase() {
  return new Promise((resolve, reject) => {
    if (!('indexedDB' in window)) {
      reject(new Error('IndexedDB indisponível'));
      return;
    }
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(DOCUMENTS)) db.createObjectStore(DOCUMENTS, { keyPath: 'id' });
      if (!db.objectStoreNames.contains(ASSETS)) db.createObjectStore(ASSETS, { keyPath: 'id' });
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
    request.onblocked = () => reject(new Error('Banco local bloqueado por outra aba.'));
  });
}

function createMemoryBackend() {
  const documents = new Map();
  const assets = new Map();
  return {
    persistent: false,
    async save(doc, docAssets) {
      documents.set(doc.id, structuredClone(doc));
      assets.set(doc.id, docAssets);
    },
    async load(id) {
      return documents.has(id) ? { doc: structuredClone(documents.get(id)), assets: assets.get(id) ?? {} } : null;
    },
    async list() {
      return [...documents.values()].map(({ id, name, updatedAt, design, meta }) => ({ id, name, updatedAt, design, meta }));
    },
    async remove(id) {
      documents.delete(id);
      assets.delete(id);
    },
  };
}

function createIndexedDbBackend(db) {
  const run = (stores, mode, work) => new Promise((resolve, reject) => {
    const tx = db.transaction(stores, mode);
    let result;
    Promise.resolve(work(tx)).then((value) => { result = value; }, reject);
    tx.oncomplete = () => resolve(result);
    tx.onerror = () => reject(tx.error);
    tx.onabort = () => reject(tx.error ?? new Error('Transação cancelada'));
  });

  return {
    persistent: true,
    save(doc, docAssets) {
      return run([DOCUMENTS, ASSETS], 'readwrite', (tx) => {
        tx.objectStore(DOCUMENTS).put(doc);
        tx.objectStore(ASSETS).put({ id: doc.id, assets: docAssets });
      });
    },
    load(id) {
      return run([DOCUMENTS, ASSETS], 'readonly', async (tx) => {
        const doc = await promisify(tx.objectStore(DOCUMENTS).get(id));
        if (!doc) return null;
        const assetRecord = await promisify(tx.objectStore(ASSETS).get(id));
        return { doc, assets: assetRecord?.assets ?? {} };
      });
    },
    list() {
      return run([DOCUMENTS], 'readonly', async (tx) => {
        const all = await promisify(tx.objectStore(DOCUMENTS).getAll());
        return all.map(({ id, name, updatedAt, design, meta }) => ({ id, name, updatedAt, design, meta }));
      });
    },
    remove(id) {
      return run([DOCUMENTS, ASSETS], 'readwrite', (tx) => {
        tx.objectStore(DOCUMENTS).delete(id);
        tx.objectStore(ASSETS).delete(id);
      });
    },
  };
}

export async function createStorage() {
  try {
    return createIndexedDbBackend(await openDatabase());
  } catch {
    return createMemoryBackend();
  }
}

/* ------------------------------------------------------------------ preferências leves */
const PREFIX = 'doc-studio:';

export const preferences = {
  get(key, fallback = null) {
    try {
      const value = localStorage.getItem(PREFIX + key);
      return value === null ? fallback : JSON.parse(value);
    } catch {
      return fallback;
    }
  },
  set(key, value) {
    try {
      localStorage.setItem(PREFIX + key, JSON.stringify(value));
    } catch { /* armazenamento indisponível: preferência dura só nesta sessão */ }
  },
};
