---
name: Fontes do padrão visual
description: onde estão o MIV e os manuais de referência, e de onde vieram as coordenadas do grafismo
type: reference
category: reference
date: 2026-10-07
---
O padrão visual do app vem do Manual de Identidade Visual do Governo do Ceará e de dois manuais já aprovados pela chefia.

**Problema/Contexto:** capas, rodapé, cores e tipografia precisam continuar fiéis a essas referências em qualquer evolução.

**Por que importa:** sem a referência, ajustes "a olho" afastam o resultado do padrão oficial.

**Como aplicar:**
- MIV: `/home/daniel/desenvolvimento/documentacao/manuais/MANUAL DE IDENTIDADE VISUAL 2023.pdf` (máquina do mantenedor). Páginas de pasta, envelope, papel timbrado e grafismo ("Elemento base") inspiraram as capas.
- Manuais de referência aprovados: `manual-despachante-emplacamento-externo-g003.pdf` e `manual-coleta-externa-primeiro-emplacamento-2026-10-06.pdf` (pasta `Downloads` do mantenedor, outubro de 2026).
- As coordenadas da capa "Pasta", da contracapa "Pasta" e do rodapé foram medidas no MIV para esses manuais e agora vivem em `js/graphics.js` (`COVER_LAYERS.folder`, `BACK_LAYERS.folder`, `footerBarLayers`). As capas Identidade, Envelope, Leque, Verde pleno e Minimalista são releituras, não cópias medidas.
- Logos: `assets/img/ceara.png` (assinatura com Secretaria da Infraestrutura) e `assets/img/detran.png`; as versões `-negative` têm a parte tipográfica em branco para fundos coloridos.

**Evidência:** arquivos presentes nos caminhos acima em 2026-10-07; comparação visual das páginas geradas com os PDFs de referência na mesma data.
