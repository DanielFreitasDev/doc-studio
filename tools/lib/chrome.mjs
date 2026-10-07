/**
 * Renderização no Chrome/Chromium sem dependências: servidor estático local
 * + Chrome Devtools Protocol (CDP) pelo WebSocket nativo do Node (22.4+).
 *
 * O documento é aberto no próprio app (`index.html?render=…`), então a
 * paginação, o CSS de impressão e as assinaturas são exatamente os da
 * interface: o PDF de um agente sai pelo mesmo caminho do botão "Exportar PDF".
 */
import { createServer } from 'node:http';
import { readFile, mkdtemp, rm, access } from 'node:fs/promises';
import { spawn } from 'node:child_process';
import { tmpdir, homedir } from 'node:os';
import { readdirSync } from 'node:fs';
import path from 'node:path';

const MIME = {
  '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.mjs': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8', '.json': 'application/json; charset=utf-8', '.svg': 'image/svg+xml',
  '.woff': 'font/woff', '.woff2': 'font/woff2', '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.webp': 'image/webp', '.gif': 'image/gif', '.md': 'text/plain; charset=utf-8',
};
export const DOC_ROUTE = '/__docstudio/doc.json';

/**
 * Servidor de arquivos estáticos da pasta do app, só em 127.0.0.1. A rota
 * `DOC_ROUTE` entrega o documento em memória (o arquivo pode estar em qualquer pasta).
 */
export function startServer(root, { documentText = null, port = 0 } = {}) {
  const server = createServer(async (request, response) => {
    const url = new URL(request.url, 'http://127.0.0.1');
    if (url.pathname === DOC_ROUTE && documentText != null) {
      response.writeHead(200, { 'content-type': MIME['.json'], 'cache-control': 'no-store' });
      response.end(documentText);
      return;
    }
    const relative = decodeURIComponent(url.pathname === '/' ? '/index.html' : url.pathname);
    const file = path.resolve(root, `.${relative}`);
    if (!file.startsWith(path.resolve(root) + path.sep)) {
      response.writeHead(403).end();
      return;
    }
    try {
      const body = await readFile(file);
      response.writeHead(200, { 'content-type': MIME[path.extname(file).toLowerCase()] ?? 'application/octet-stream', 'cache-control': 'no-store' });
      response.end(body);
    } catch {
      response.writeHead(404).end('Não encontrado');
    }
  });
  return new Promise((resolve) => server.listen(port, '127.0.0.1', () => resolve({ server, port: server.address().port })));
}

/** Procura o Chrome/Chromium: DOCSTUDIO_CHROME, nomes comuns e o cache do Playwright. */
export async function findChrome() {
  const candidates = [
    process.env.DOCSTUDIO_CHROME,
    '/usr/bin/google-chrome', '/usr/bin/google-chrome-stable', '/usr/bin/chromium', '/usr/bin/chromium-browser', '/snap/bin/chromium',
    '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
    'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
  ];
  const cache = path.join(homedir(), '.cache', 'ms-playwright');
  try {
    for (const dir of readdirSync(cache).filter((d) => /^chromium-\d+$/.test(d)).sort().reverse()) {
      candidates.push(path.join(cache, dir, 'chrome-linux', 'chrome'), path.join(cache, dir, 'chrome-linux64', 'chrome'));
    }
  } catch { /* sem cache do Playwright */ }
  for (const candidate of candidates.filter(Boolean)) {
    try {
      await access(candidate);
      return candidate;
    } catch { /* tenta o próximo */ }
  }
  throw new Error('Chrome ou Chromium não encontrado. Instale um deles ou informe o caminho em DOCSTUDIO_CHROME.');
}

/** Abre o Chrome sem interface e devolve um cliente CDP com uma aba. */
export async function launchChrome() {
  if (typeof WebSocket !== 'function') throw new Error('Use Node 22.4 ou mais novo (WebSocket nativo).');
  const executable = await findChrome();
  const profile = await mkdtemp(path.join(tmpdir(), 'docstudio-chrome-'));
  const child = spawn(executable, [
    '--headless=new', '--remote-debugging-port=0', `--user-data-dir=${profile}`,
    '--no-first-run', '--no-default-browser-check', '--disable-extensions', '--hide-scrollbars', '--font-render-hinting=none',
    'about:blank',
  ], { stdio: ['ignore', 'ignore', 'pipe'] });

  const endpoint = await new Promise((resolve, reject) => {
    let output = '';
    const timer = setTimeout(() => reject(new Error(`O Chrome não respondeu.\n${output}`)), 20000);
    child.stderr.on('data', (chunk) => {
      output += chunk;
      const match = /DevTools listening on (ws:\/\/\S+)/.exec(output);
      if (match) { clearTimeout(timer); resolve(match[1]); }
    });
    child.on('exit', (code) => { clearTimeout(timer); reject(new Error(`O Chrome fechou (código ${code}).\n${output}`)); });
  });

  const socket = new WebSocket(endpoint);
  await new Promise((resolve, reject) => { socket.onopen = resolve; socket.onerror = () => reject(new Error('Falha ao conectar ao Chrome.')); });
  let nextId = 0;
  const pending = new Map();
  const listeners = [];
  socket.onmessage = (event) => {
    const message = JSON.parse(event.data);
    if (message.id && pending.has(message.id)) {
      const { resolve, reject } = pending.get(message.id);
      pending.delete(message.id);
      if (message.error) reject(new Error(message.error.message));
      else resolve(message.result);
    } else if (message.method) {
      listeners.forEach((listener) => listener(message));
    }
  };
  const send = (method, params = {}, sessionId) => new Promise((resolve, reject) => {
    nextId += 1;
    pending.set(nextId, { resolve, reject });
    socket.send(JSON.stringify({ id: nextId, method, params, ...(sessionId ? { sessionId } : {}) }));
  });

  const { targetId } = await send('Target.createTarget', { url: 'about:blank' });
  const { sessionId } = await send('Target.attachToTarget', { targetId, flatten: true });
  const page = (method, params) => send(method, params, sessionId);
  const consoleMessages = [];
  listeners.push((message) => {
    if (message.sessionId !== sessionId) return;
    if (message.method === 'Runtime.exceptionThrown') consoleMessages.push({ level: 'error', text: message.params.exceptionDetails.exception?.description ?? message.params.exceptionDetails.text });
    if (message.method === 'Runtime.consoleAPICalled' && ['error', 'warning'].includes(message.params.type)) {
      consoleMessages.push({ level: message.params.type, text: message.params.args.map((a) => a.value ?? a.description ?? '').join(' ') });
    }
    if (message.method === 'Log.entryAdded' && ['error', 'warning'].includes(message.params.entry.level)) {
      consoleMessages.push({ level: message.params.entry.level, text: `${message.params.entry.text} ${message.params.entry.url ?? ''}`.trim() });
    }
  });
  await page('Page.enable');
  await page('Runtime.enable');
  await page('Log.enable');

  const evaluate = async (expression) => {
    const { result, exceptionDetails } = await page('Runtime.evaluate', { expression, awaitPromise: true, returnByValue: true });
    if (exceptionDetails) throw new Error(exceptionDetails.exception?.description ?? exceptionDetails.text);
    return result.value;
  };

  return {
    page,
    evaluate,
    consoleMessages,
    async close() {
      try { socket.close(); } catch { /* já fechado */ }
      child.kill();
      await new Promise((resolve) => setTimeout(resolve, 200));
      await rm(profile, { recursive: true, force: true }).catch(() => {});
    },
  };
}

/** Espera uma condição na página (avaliada em JavaScript), com tempo limite. */
export async function waitFor(chrome, expression, { timeout = 60000, interval = 150 } = {}) {
  const start = Date.now();
  for (;;) {
    const value = await chrome.evaluate(expression).catch(() => null);
    if (value) return value;
    if (Date.now() - start > timeout) throw new Error('Tempo esgotado esperando a renderização.');
    await new Promise((resolve) => setTimeout(resolve, interval));
  }
}
