/**
 * A imagem Docker de verdade (`compose.yaml` + `Dockerfile`): sobe o serviço
 * numa porta livre, confere o endurecimento, os cabeçalhos, que só os arquivos
 * do app são publicados e que o app abre no Chrome sem nenhum arquivo faltando.
 * Sem Docker (ou sem o daemon rodando), os testes são pulados; sem Chrome,
 * só o teste do navegador é pulado. Rode com `node --test` na raiz do projeto.
 */
import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { execFile } from 'node:child_process';
import { readFile } from 'node:fs/promises';
import { promisify } from 'node:util';
import { fileURLToPath } from 'node:url';

import { launchChrome, findChrome, waitFor } from '../tools/lib/chrome.mjs';

const ROOT = fileURLToPath(new URL('..', import.meta.url));
const PROJECT = 'doc-studio-test';
const run = promisify(execFile);
const compose = (...args) => run('docker', ['compose', '-p', PROJECT, ...args], {
  cwd: ROOT,
  env: { ...process.env, DOCSTUDIO_HOST: '127.0.0.1', DOCSTUDIO_PORT: '0' },
  timeout: 300000,
});

const dockerAvailable = await run('docker', ['compose', 'version']).then(() => run('docker', ['info'])).then(() => true, () => false);
const skip = dockerAvailable ? false : 'Docker (com Compose e o daemon rodando) não encontrado';
const chromeAvailable = await findChrome().then(() => true, () => false);
const skipBrowser = skip || (chromeAvailable ? false : 'Chrome/Chromium não encontrado (defina DOCSTUDIO_CHROME)');

let base;

before(async () => {
  if (skip) return;
  await compose('up', '--detach', '--build', '--wait');
  const { stdout } = await compose('port', 'web', '8080');
  base = `http://${stdout.trim()}`;
});

after(async () => {
  if (skip) return;
  await compose('down', '--rmi', 'local');
});

test('.env.example documenta exatamente as variáveis do compose.yaml', async () => {
  const read = (file) => readFile(new URL(`../${file}`, import.meta.url), 'utf8');
  const used = new Set([...(await read('compose.yaml')).matchAll(/\$\{(\w+)/g)].map((m) => m[1]));
  const documented = new Set([...(await read('.env.example')).matchAll(/^(\w+)=/gm)].map((m) => m[1]));
  assert.ok(used.size > 0, 'nenhuma variável encontrada no compose.yaml');
  assert.deepEqual([...documented].sort(), [...used].sort());
});

test('contêiner saudável, sem root, só leitura e sem capabilities', { skip }, async () => {
  const { stdout: id } = await compose('ps', '--quiet', 'web');
  const { stdout } = await run('docker', ['inspect', id.trim()]);
  const [container] = JSON.parse(stdout);
  assert.equal(container.Config.User, '101:101');
  assert.equal(container.State.Health.Status, 'healthy');
  assert.equal(container.HostConfig.ReadonlyRootfs, true);
  assert.deepEqual(container.HostConfig.CapDrop, ['ALL']);
  assert.ok(container.HostConfig.SecurityOpt.includes('no-new-privileges:true'));
});

test('página com cabeçalhos de segurança e cache revalidado', { skip }, async () => {
  const response = await fetch(`${base}/`);
  assert.equal(response.status, 200);
  const header = (name) => response.headers.get(name);
  assert.equal(header('content-type'), 'text/html; charset=utf-8');
  assert.equal(header('cache-control'), 'no-cache');
  assert.match(header('content-security-policy'), /frame-ancestors 'none'/);
  assert.equal(header('x-content-type-options'), 'nosniff');
  assert.equal(header('server'), 'nginx');
  assert.match(await response.text(), /<meta http-equiv="Content-Security-Policy"/);

  const module = await fetch(`${base}/js/render.js`, { headers: { 'accept-encoding': 'gzip' } });
  assert.equal(module.headers.get('content-type'), 'application/javascript; charset=utf-8');
  const revalidated = await fetch(`${base}/js/render.js`, { headers: { 'if-none-match': module.headers.get('etag') } });
  assert.equal(revalidated.status, 304);
});

test('só os arquivos do app são publicados, e só para leitura', { skip }, async () => {
  const hidden = ['/README.md', '/AGENTS.md', '/.git/HEAD', '/.dockerignore', '/docs/ai/AI_GUIDE.md', '/tests/app.test.mjs',
    '/tools/docstudio.mjs', '/examples/manual-coleta-externa.docstudio.json', '/docker/nginx.conf', '/50x.html'];
  for (const path of hidden) assert.equal((await fetch(`${base}${path}`)).status, 404, path);
  assert.equal((await fetch(`${base}/`, { method: 'POST', body: 'x' })).status, 405);
  assert.equal(await (await fetch(`${base}/healthz`)).text(), 'ok\n');
});

test('o app abre do contêiner sem arquivo faltando e com as fontes da marca', { skip: skipBrowser }, async () => {
  const chrome = await launchChrome();
  try {
    await chrome.page('Page.navigate', { url: `${base}/` });
    await waitFor(chrome, `Boolean(window.docStudio?.store) && document.querySelectorAll('#pages > .page').length > 0`);
    await chrome.evaluate(`document.fonts.ready.then(() => true)`);
    const state = await chrome.evaluate(`({
      failed: performance.getEntriesByType('resource').filter((r) => r.responseStatus >= 400).map((r) => r.name),
      fonts: [...new Set([...document.fonts].filter((f) => f.status === 'loaded').map((f) => f.family.replaceAll('"', '')))],
    })`);
    assert.deepEqual(state.failed, []);
    assert.ok(state.fonts.includes('Kanit') && state.fonts.includes('Maitree'), state.fonts.join(', '));
    assert.deepEqual(chrome.consoleMessages.filter((m) => m.level === 'error').map((m) => m.text), []);
  } finally {
    await chrome.close();
  }
});
