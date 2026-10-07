/**
 * Utilitários pequenos e puros, sem dependência do restante do app.
 */

export const $ = (selector, root = document) => root.querySelector(selector);
export const $$ = (selector, root = document) => [...root.querySelectorAll(selector)];

/** Escapa texto para uso seguro dentro de HTML (conteúdo e atributos). */
export function esc(value) {
  return String(value ?? '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}

/** Identificador curto e único o suficiente para blocos, itens e documentos. */
export function uid(prefix = 'b') {
  const random = crypto.getRandomValues(new Uint32Array(2));
  return `${prefix}_${random[0].toString(36)}${random[1].toString(36)}`.slice(0, 16);
}

export function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

export function debounce(fn, wait) {
  let timer = 0;
  const debounced = (...args) => {
    clearTimeout(timer);
    timer = setTimeout(() => fn(...args), wait);
  };
  debounced.flush = (...args) => {
    clearTimeout(timer);
    fn(...args);
  };
  debounced.cancel = () => clearTimeout(timer);
  return debounced;
}

/** Converte "Manual do Despachante" em "manual-do-despachante" (nomes de arquivo). */
export function slugify(text) {
  return String(text ?? '')
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80) || 'documento';
}

/** Remove acentos e caixa para buscas tolerantes ("seção" encontra "secao"). */
export function normalizeSearch(text) {
  return String(text ?? '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().trim();
}

export function pad2(n) {
  return String(n).padStart(2, '0');
}

export function formatDateTime(timestamp) {
  if (!timestamp) return '';
  return new Intl.DateTimeFormat('pt-BR', { dateStyle: 'short', timeStyle: 'short' }).format(new Date(timestamp));
}

export function formatTime(timestamp) {
  return new Intl.DateTimeFormat('pt-BR', { hour: '2-digit', minute: '2-digit' }).format(new Date(timestamp));
}

/** "Outubro de 2026" (mês atual): usado nas versões dos modelos para a data nunca ficar velha. */
export function monthYear(date = new Date()) {
  const text = new Intl.DateTimeFormat('pt-BR', { month: 'long', year: 'numeric' }).format(date);
  return text.charAt(0).toUpperCase() + text.slice(1);
}

/** "7 de outubro de 2026" (data de hoje por extenso). */
export function longDate(date = new Date()) {
  return new Intl.DateTimeFormat('pt-BR', { day: 'numeric', month: 'long', year: 'numeric' }).format(date);
}

/**
 * Chaves que nunca podem aparecer num caminho: chegariam ao protótipo de
 * todos os objetos (prototype pollution) a partir de um arquivo importado.
 */
const UNSAFE_KEYS = new Set(['__proto__', 'prototype', 'constructor']);
export const isSafeKey = (key) => key !== '' && !UNSAFE_KEYS.has(key);

/** Lê um valor por caminho "items.2.title" (índices numéricos viram posições de array). Só lê propriedades próprias. */
export function getByPath(target, path) {
  return path.split('.').reduce((node, key) => (node != null && typeof node === 'object' && Object.hasOwn(node, key) ? node[key] : undefined), target);
}

/** Escreve um valor por caminho, criando objetos intermediários quando faltarem. Recusa chaves inseguras e caminhos por dentro de textos. */
export function setByPath(target, path, value) {
  const keys = path.split('.');
  if (!keys.every(isSafeKey)) throw new TypeError(`Caminho inválido: “${path}”.`);
  const last = keys.pop();
  const parent = keys.reduce((node, key) => {
    if (!Object.hasOwn(node, key) || node[key] == null) node[key] = /^\d+$/.test(key) ? [] : {};
    if (typeof node[key] !== 'object') throw new TypeError(`Caminho inválido: “${path}”.`);
    return node[key];
  }, target);
  parent[last] = value;
}

export function moveItem(list, from, to) {
  if (from === to || from < 0 || from >= list.length) return list;
  const [item] = list.splice(from, 1);
  list.splice(clamp(to, 0, list.length), 0, item);
  return list;
}

export const prefersReducedMotion = () => matchMedia('(prefers-reduced-motion: reduce)').matches;

/** Anuncia mensagens para leitores de tela (região aria-live). */
export function announce(message) {
  const region = document.getElementById('announcer');
  if (!region) return;
  region.textContent = '';
  requestAnimationFrame(() => { region.textContent = message; });
}

/** Rola um elemento para dentro da área visível do contêiner, respeitando movimento reduzido. */
export function scrollIntoViewIfNeeded(element, { block = 'nearest' } = {}) {
  if (!element) return;
  element.scrollIntoView({ block, inline: 'nearest', behavior: prefersReducedMotion() ? 'auto' : 'smooth' });
}

export function isTypingTarget(element) {
  return element instanceof HTMLElement &&
    (element.isContentEditable || element.matches('input:not([type="checkbox"], [type="radio"], [type="range"], [type="file"]), textarea, select'));
}

/** Converte data URL (base64) em Blob de forma síncrona. */
export function dataUrlToBlob(dataUrl) {
  const [header, base64] = dataUrl.split(',');
  const mime = /data:([^;]+)/.exec(header)?.[1] ?? 'application/octet-stream';
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i += 1) bytes[i] = binary.charCodeAt(i);
  return new Blob([bytes], { type: mime });
}

export function downloadBlob(blob, filename) {
  const url = URL.createObjectURL(blob);
  const link = Object.assign(document.createElement('a'), { href: url, download: filename });
  document.body.append(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export const icon = (name, extraClass = '') =>
  `<svg class="icon ${esc(extraClass)}" aria-hidden="true" focusable="false"><use href="#i-${esc(name)}"/></svg>`;
