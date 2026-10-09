---
name: Docker com nginx sem root e sem etapa de build
description: imagem = nginx-unprivileged fixado por digest + arquivos do navegador; .dockerignore como lista de permissão; compose endurecido; teste abre o app do contêiner
type: project
category: decision
date: 2026-10-09
---
O app é só arquivos estáticos: a imagem é um nginx sem root com os arquivos copiados, sem Node nem multi-stage. O endurecimento fica no `compose.yaml`, e `tests/docker.test.mjs` prova que nada do que o navegador carrega ficou de fora.

**Problema/Contexto:** o mantenedor pediu o projeto "dockerizado" no estado da arte, subindo tanto pelo Docker quanto pelo servidor local de sempre. A documentação do Docker (guia de React em docs.docker.com/guides/reactjs/containerize) serve estáticos com `nginxinc/nginx-unprivileged` (usuário 101, porta 8080, PID e temporários em `/tmp`) ou com Docker Hardened Images (`dhi.io`, exige `docker login`).

**Por que importa:** sem a lista de permissão, `.git`, `.playwright-mcp/` (83 MB) e documentos exportados (`*.docstudio.json`, com dados pessoais) entrariam no contexto de build. Sem `no-cache`, uma imagem nova não chegaria ao navegador (os arquivos não têm hash no nome; ver o gotcha do cache de módulos).

**Como aplicar:**
- Pasta nova ou arquivo novo na raiz carregado pelo navegador: incluir no `.dockerignore` (`!pasta/`) e num `COPY` do `Dockerfile`. Faltando, o teste do Chrome falha (por tempo esgotado, ~60 s, porque o app não termina de abrir).
- Atualizar o nginx: trocar tag e digest juntos (`docker buildx imagetools inspect nginxinc/nginx-unprivileged:<tag>`).
- Cabeçalhos ficam no nível `server` de `docker/nginx.conf`; o `Cache-Control` vem de um `map` por URI. Um `add_header` dentro de um `location` descartaria todos os do `server` (herança do nginx).
- A CSP continua só no `<meta>` do `index.html`; o cabeçalho acrescenta diretivas que o app não usa (`frame-ancestors`, `base-uri`, `object-src`, `form-action`). Repetir `default-src` no cabeçalho cortaria `img-src blob:` (as políticas se somam) e quebraria as imagens.
- `listen 8080` só IPv4 e `HEALTHCHECK` em `127.0.0.1`: `[::]` falha em hosts com IPv6 desligado e `localhost` pode virar `::1`.
- `worker_processes auto` abre um processo por CPU do host (24 aqui, ~22 MB no total); o ajuste automático da imagem reescreve `nginx.conf` e não roda com `read_only`. Aceito.
- Rede: a área de transferência (copiar/colar blocos) só funciona em `https://` ou `localhost`; fora do computador, publicar atrás de um proxy com HTTPS.

**Evidência:** em 2026-10-09, Docker 29.9.0/Compose 5.6.0: `docker build --check .` sem avisos, hadolint sem apontamentos, imagem de 9 MB (conteúdo); `docker compose up --wait` saudável em ~1 s (`--start-interval=1s`); `curl` mostrou 404 para README, `.git`, docs, testes e `50x.html`, 405 para POST/PUT/DELETE e 304 com ETag; `docker compose watch` refez a imagem e serviu a mudança em ~3 s; `node --test tests/docker.test.mjs` com 4 testes passando, e falhando ao tirar o `COPY` de `assets`.
