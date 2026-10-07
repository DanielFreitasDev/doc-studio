/**
 * Regras da marca em formato legível por máquina (derivadas do MIV 2023–2026).
 *
 * É a fonte única dos fatos do Manual de Identidade Visual usados pelo app,
 * pela validação ("Verificar documento"), pela ferramenta de linha de comando
 * e pela documentação para agentes de IA (gerada a partir daqui). O manual
 * oficial continua sendo a autoridade máxima: em caso de divergência, vale o
 * PDF do MIV, e este arquivo deve ser corrigido.
 *
 * Sem dependência do DOM: roda no navegador e no Node.
 */

export const BRAND_SOURCE = {
  title: 'Manual de Identidade Visual do Governo do Estado do Ceará 2023–2026 (MIV)',
  precedence: ['Manual oficial (PDF do MIV)', 'js/brand.js (regras derivadas)', 'tokens do css/document.css', 'modelos e estilos prontos', 'escolhas do usuário ou do agente'],
};

/**
 * Paleta do grafismo (MIV p. 26). Erratas do próprio MIV: o texto de #26a737
 * diz G 187 (o hex é 167) e o de #46ac33 diz B 71 (o hex é 51) — vale o hex.
 */
export const GRAPHIC_PALETTE = [
  { id: 'green', name: 'Verde', hex: '#26a737', cmyk: [80, 0, 100, 0], page: 26 },
  { id: 'lime', name: 'Verde-claro', hex: '#5db12f', cmyk: [67, 0, 100, 0], page: 26 },
  { id: 'green-2', name: 'Verde 2', hex: '#46ac33', cmyk: [72, 0, 100, 0], page: 26 },
  { id: 'leaf', name: 'Folha', hex: '#45b16e', cmyk: [71, 0, 71, 0], page: 26 },
  { id: 'teal', name: 'Água-marinha', hex: '#2db39e', cmyk: [72, 0, 47, 0], page: 26 },
  { id: 'orange', name: 'Laranja', hex: '#f59c00', cmyk: [0, 45, 100, 0], page: 26 },
  { id: 'red', name: 'Urucum', hex: '#e94f0e', cmyk: [0, 79, 99, 0], page: 26 },
  { id: 'dark-orange', name: 'Laranja-escuro', hex: '#e06a0c', cmyk: [8, 68, 100, 0], page: 26 },
  { id: 'gold', name: 'Amarelo-ouro', hex: '#e4a500', cmyk: [10, 37, 98, 0], page: 26 },
  { id: 'yellow', name: 'Amarelo', hex: '#fccf05', cmyk: [0, 18, 93, 5], page: 26 },
];

/** Cores da assinatura em policromia (MIV p. 11), com o Pantone correspondente. */
export const SIGNATURE_COLORS = [
  { id: 'slate', name: 'Grafite (nome CEARÁ e contornos)', hex: '#465564', pantone: '7545 C', page: 11 },
  { id: 'flag-green', name: 'Verde do escudo', hex: '#008241', pantone: '348 C', page: 11 },
  { id: 'sand', name: 'Areia', hex: '#e1b77e', pantone: '7508 C', page: 11 },
  { id: 'ochre', name: 'Ocre', hex: '#be9b5f', pantone: '7562 C', page: 11 },
  { id: 'cream', name: 'Creme', hex: '#f1e4b2', pantone: '7499 C', page: 11 },
  { id: 'clay', name: 'Argila', hex: '#c68b66', pantone: '7515 C', page: 11 },
  { id: 'forest', name: 'Verde-escuro', hex: '#2a7050', pantone: '555 C', page: 11 },
  { id: 'sky', name: 'Azul-claro', hex: '#87d1e6', pantone: '636 C', page: 11 },
  { id: 'sun', name: 'Amarelo do sol', hex: '#ffc805', pantone: '116 C', page: 11 },
  { id: 'gray', name: 'Cinza', hex: '#dcdcdc', pantone: '7541 C', page: 11 },
  { id: 'sea', name: 'Azul do mar', hex: '#56a7b2', pantone: '7709 C', page: 11 },
];

/**
 * Tons derivados (não estão no MIV): versões escuras para texto com contraste
 * AA no papel branco e fundos claros (8–12% da cor). Ficam documentados para
 * que nenhuma cor do documento seja "inventada".
 */
export const DERIVED_COLORS = [
  { hex: '#1d8475', from: '#2db39e', use: 'texto em água-marinha' },
  { hex: '#b4500a', from: '#e06a0c', use: 'texto em laranja' },
  { hex: '#b83a0a', from: '#e94f0e', use: 'texto em urucum e laranja' },
  { hex: '#8a6400', from: '#e4a500', use: 'texto em amarelo-ouro' },
  { hex: '#2f3b47', from: '#465564', use: 'títulos (grafite escuro)' },
  { hex: '#2c6e77', from: '#56a7b2', use: 'texto em azul do mar' },
  { hex: '#38b53f', from: '#26a737', use: 'faixas do grafismo como a arte CMYK do MIV aparece na tela (C80 Y100)' },
];

export const TYPOGRAPHY = {
  headings: { family: 'Kanit', weights: [300, 400, 500, 600, 700, 800, 900], page: 10, rule: 'Kanit (geométrica sem serifa) em títulos, números e elementos gráficos.' },
  body: { family: 'Maitree', weights: [400, 600, 700], page: 10, rule: 'Maitree no texto corrido, pela legibilidade no digital e no impresso.' },
  concept: { family: 'Kanit', page: 9, rule: '“Cuidar das pessoas, avançar o Ceará.” em quatro linhas; verbos em Kanit Bold, o resto em Kanit Regular.' },
  // O MIV não define fonte de máquina: comandos e textos de tela usam a monoespaçada do sistema.
  monospace: { family: 'DejaVu Sans Mono (ou a monoespaçada do sistema)', rule: 'Exceção funcional, fora do MIV: só no bloco “Código ou texto de tela” e na formatação `texto de tela`, para comandos, códigos e textos literais.' },
  allowedFamilies: ['Kanit', 'Maitree'],
};

/**
 * Logos disponíveis (SVG vetoriais extraídos do MIV). Agentes e documentos
 * escolhem a assinatura por `design.signature`; o renderizador decide o
 * arquivo (cores, negativo, cinza, vertical) — nenhum logo é editável.
 */
export const LOGOS = [
  { id: 'ceara', file: 'assets/img/ceara.svg', label: 'Governo do Ceará + Secretaria da Infraestrutura (horizontal)', page: 50, minWidthMm: 40 },
  { id: 'ceara-state', file: 'assets/img/ceara-state.svg', label: 'Governo do Ceará (horizontal)', page: 7, minWidthMm: 30 },
  { id: 'ceara-vertical', file: 'assets/img/ceara-vertical.svg', label: 'Governo do Ceará (vertical)', page: 20, minWidthMm: 25 },
  { id: 'ceara-vertical-secretaria', file: 'assets/img/ceara-vertical-secretaria.svg', label: 'Governo do Ceará + Secretaria (vertical)', page: 20, minWidthMm: 30 },
  { id: 'detran', file: 'assets/img/detran.svg', label: 'DETRAN/CE', page: 16 },
];

/** Regras da marca. `enforcedBy` diz quem garante cada uma (honestidade sobre o que é verificado). */
export const BRAND_RULES = [
  { id: 'signature-official-files', page: 22, enforcedBy: 'renderer', text: 'Nunca altere, recrie ou distorça a marca: só os SVG oficiais de assets/img/ são usados, sempre com a proporção original.' },
  { id: 'signature-joint-order', page: 16, enforcedBy: 'renderer', text: 'Assinatura conjunta: órgão parceiro à esquerda, Governo à direita, sem fio separador, alinhados pelo centro do escudo (sem a coroa).' },
  { id: 'signature-protection', page: 15, enforcedBy: 'renderer', text: 'Área de proteção: em cima e embaixo, 2× a distância entre o brasão e o nome CEARÁ; dos lados, a largura do brasão.' },
  { id: 'signature-minimum', page: 21, enforcedBy: 'renderer', text: 'Redução mínima: 40 mm de largura com secretaria/órgão; 30 mm sem. Ideal: 50 mm.' },
  { id: 'signature-background', page: 14, enforcedBy: 'renderer', text: 'Marca sobre fundo branco; em fundo escuro, a versão em negativo.' },
  { id: 'signature-horizontal-first', page: 19, enforcedBy: 'renderer', text: 'A versão horizontal é a preferida; a vertical só quando o layout não comporta a horizontal.' },
  { id: 'concept-four-lines', page: 9, enforcedBy: 'renderer', text: 'O conceito “Cuidar das pessoas, avançar o Ceará.” fica sempre ao lado da marca, em quatro linhas, separado por uma linha verde.' },
  { id: 'colors-official', page: 26, enforcedBy: 'validator', text: 'Cores só da paleta do grafismo (p. 26), da assinatura (p. 11) ou dos tons derivados documentados. Documentos escolhem tons por nome (tema, tom do bloco), nunca por código.' },
  { id: 'typography', page: 10, enforcedBy: 'validator', text: 'Somente Kanit (títulos) e Maitree (texto corrido); o corpo pode usar Kanit. Exceção funcional: fonte monoespaçada do sistema em comandos e textos de tela (o MIV não define fonte de máquina).' },
  { id: 'grayscale', page: 12, enforcedBy: 'renderer', text: 'Para impressão P&B use a escala de cinza do MIV (tabela de correspondência da p. 12), nunca um filtro sobre a página.' },
  { id: 'monochrome-last-resort', page: 13, enforcedBy: 'manual', text: 'A versão monocromática é último caso; prefira cores ou escala de cinza.' },
  { id: 'text-contrast', page: null, enforcedBy: 'validator', text: 'Texto em cor sobre o papel precisa de contraste mínimo de 4,5:1 (WCAG AA); por isso os títulos usam os tons escuros.' },
  { id: 'image-resolution', page: null, enforcedBy: 'validator', text: 'Fotos e prints com pelo menos 150 ppi no tamanho impresso (ideal 300 ppi) para não pixelar no PDF.' },
];

/* ------------------------------------------------------------------ contraste (WCAG 2.x) */
function channel(value) {
  const c = value / 255;
  return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
}

export function relativeLuminance(hex) {
  const n = Number.parseInt(hex.replace('#', ''), 16);
  return 0.2126 * channel((n >> 16) & 255) + 0.7152 * channel((n >> 8) & 255) + 0.0722 * channel(n & 255);
}

export function contrastRatio(a, b) {
  const [light, dark] = [relativeLuminance(a), relativeLuminance(b)].sort((x, y) => y - x);
  return (light + 0.05) / (dark + 0.05);
}

/** Todas as cores que o documento pode usar (oficiais e derivadas documentadas). */
export function allowedColors() {
  return new Set([
    ...GRAPHIC_PALETTE.map((c) => c.hex),
    ...SIGNATURE_COLORS.map((c) => c.hex),
    ...DERIVED_COLORS.map((c) => c.hex),
  ]);
}
