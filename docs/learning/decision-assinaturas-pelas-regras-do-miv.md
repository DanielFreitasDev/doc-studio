---
name: Assinaturas pelas regras do MIV
description: órgão à esquerda e Governo à direita, sem fio, gap = largura do escudo, tamanhos mínimos; difere dos dois primeiros manuais
type: project
category: decision
date: 2026-10-07
updated: 2026-10-07
---
As assinaturas seguem o MIV (p. 15–22), mesmo onde os dois primeiros manuais aprovados faziam diferente.

**Problema/Contexto:** os manuais G003 e Coleta Externa mostravam "Governo | fio | DETRAN". O MIV (p. 16–17) manda o órgão parceiro à esquerda, o Governo sempre à direita, sem fio separador, afastados pela largura do escudo e alinhados pelo centro do escudo sem a coroa. O cabeçalho "com assinatura" usava a marca com secretaria a 20,7 mm de largura, abaixo do mínimo de 40 mm (p. 21). O usuário pediu auditoria de fidelidade total ao MIV.

**Por que importa:** voltar ao arranjo antigo ou encolher a marca reintroduz usos que o MIV proíbe. Quem comparar com os manuais antigos verá a ordem trocada: isso é intencional.

**Como aplicar:**
- `brandHtml()` em `js/render.js` monta `[órgão][Governo]`; o CSS de `.brand` usa `--brand-h` (altura da marca do Governo): gap = 0,746 × altura (largura do escudo em `ceara.png`), órgão com 0,8 × altura e topo em 0,184 × altura (centro do escudo a 58% da altura).
- Mínimos: com secretaria ≥ 40 mm de largura (altura ≥ 12,7 mm em `ceara.png`); sem secretaria ≥ 30 mm (cabeçalho usa `ceara-state.png` a 9,6 mm de altura); vertical ≥ 25 mm.
- Vertical só sem órgão parceiro, sem secretaria e sobre fundo branco (papel timbrado e Pasta oficial). Com parceiro, o MIV usa o par horizontal (p. 35).
- Vertical: com órgão parceiro, conjunta vertical lado a lado (p. 17: órgão do topo do escudo sem a coroa, 9% da altura, até a base do nome; gap = largura do escudo, 0,385 × altura); com secretaria, `ceara-vertical-secretaria.png` (nome da secretaria centralizado embaixo, p. 20 e 35). No papel timbrado com órgão parceiro, par horizontal (p. 36). Não existe vertical em negativo: sobre fundo escuro, volta à horizontal.
- Conceito (p. 9 e 117): sempre "CUIDAR / DAS PESSOAS, / AVANÇAR / O CEARÁ." com `<br>` fixos, Kanit (verbos em bold), linha verde (branca no fundo escuro), do topo de "CEARÁ" à base de "GOVERNO DO ESTADO"; distância até a linha = distância escudo–nome (0,162 × altura). Deixar o texto quebrar sozinho (antes, `max-width: 34mm`) gerou "CUIDAR DAS / PESSOAS, AVANÇAR / O CEARÁ.".
- Se a chefia preferir o arranjo antigo, trate como exceção explícita e registre aqui.

**Evidência:** MIV p. 9, 16–17, 20–21 e 35 (renderizadas e medidas em 2026-10-07; em `ceara-state.png`, escudo 0–284 px, nome a partir de 347 px, letras de "CEARÁ" de 64 a 226 px e "GOVERNO DO ESTADO" até 304 px, numa altura de 382 px); em 2026-10-07 o Playwright mediu no app: par DETRAN + Governo com 96,6 × 21 mm na Pasta oficial e 81,8 × 17,8 mm no timbrado; "somente Governo" vertical com 37 × 31,9 mm.
