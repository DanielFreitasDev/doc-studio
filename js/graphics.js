/**
 * Grafismo do MIV em SVG vetorial (imprime nítido em qualquer resolução).
 *
 * Cada arte é uma lista de camadas (polígonos ou setores de anel em mm sobre
 * a folha A4 de 210 × 297 mm), preenchidas com cor sólida ou degradê linear —
 * exatamente como as faixas do grafismo oficial. As coordenadas das capas
 * "Pasta", da contracapa "Pasta", do rodapé e da meia faixa foram medidas no
 * próprio Manual de Identidade Visual; Arcos, Painel verde e Convite adaptam
 * para A4 retrato a capa do MIV (p. 1), o slide (p. 57) e o convite (p. 55).
 *
 * Cores: as faixas usam os tons com que a arte em CMYK do MIV aparece na tela
 * (ex.: #38B53F para C80 Y100), iguais aos dos manuais aprovados; peças novas
 * usam os valores declarados na paleta do grafismo (p. 26).
 *
 * Os ids dos degradês recebem um prefixo por página para que a mesma página
 * gere sempre o mesmo SVG (a prévia só troca as páginas que mudaram).
 */

const PAGE_W = 210;
const PAGE_H = 297;
const F = (u, v) => [u * PAGE_W, v * PAGE_H];
const round = (n) => Math.round(n * 100) / 100;

/* ------------------------------------------------------------------ montagem do SVG */
function gradientDef(id, from, to, colors) {
  const last = colors.length - 1;
  const stops = colors.map((color, i) => `<stop offset="${last ? round(i / last) : 0}" stop-color="${color}"/>`).join('');
  return `<linearGradient id="${id}" gradientUnits="userSpaceOnUse" x1="${round(from[0])}" y1="${round(from[1])}" x2="${round(to[0])}" y2="${round(to[1])}">${stops}</linearGradient>`;
}

function renderLayers(layers, idPrefix) {
  const defs = [];
  const shapes = layers.map((layer, index) => {
    const opacity = layer.opacity != null ? ` fill-opacity="${layer.opacity}"` : '';
    let fill = layer.color;
    if (layer.colors) {
      const id = `${idPrefix}-${index}`;
      defs.push(gradientDef(id, layer.from, layer.to, layer.colors));
      fill = `url(#${id})`;
    }
    if (layer.d) return `<path d="${layer.d}" fill="${fill}"${opacity}/>`;
    const points = layer.pts.map(([x, y]) => `${round(x)},${round(y)}`).join(' ');
    return `<polygon points="${points}" fill="${fill}"${opacity}/>`;
  });
  return `<defs>${defs.join('')}</defs>${shapes.join('')}`;
}

/* ------------------------------------------------------------------ setores de anel (arcos do grafismo) */
const rad = (deg) => (deg * Math.PI) / 180;
const polar = (cx, cy, r, deg) => [cx + r * Math.cos(rad(deg)), cy + r * Math.sin(rad(deg))];

/**
 * Caminho SVG de um setor de anel com centro (cx, cy), raios r1 < r2 e
 * ângulos a1 < a2 (graus, sentido horário a partir do eixo x). Com r1 = 0
 * vira uma fatia (raio que sai do centro), como os raios do elemento base.
 */
function sectorPath(cx, cy, r1, r2, a1, a2) {
  const large = a2 - a1 > 180 ? 1 : 0;
  const p = (r, a) => polar(cx, cy, r, a).map(round).join(' ');
  const outer = `M ${p(r2, a1)} A ${round(r2)} ${round(r2)} 0 ${large} 1 ${p(r2, a2)}`;
  const inner = r1 > 0 ? `L ${p(r1, a2)} A ${round(r1)} ${round(r1)} 0 ${large} 0 ${p(r1, a1)}` : `L ${round(cx)} ${round(cy)}`;
  return `${outer} ${inner} Z`;
}

/** Camada de setor com degradê ao longo do raio (do raio interno ao externo). */
function sector({ c: [cx, cy], r1, r2, a1, a2, colors, color }) {
  const mid = (a1 + a2) / 2;
  return colors
    ? { d: sectorPath(cx, cy, r1, r2, a1, a2), colors, from: polar(cx, cy, r1, mid), to: polar(cx, cy, r2, mid) }
    : { d: sectorPath(cx, cy, r1, r2, a1, a2), color };
}

function svg(className, layers, idPrefix, { width = PAGE_W, height = PAGE_H, before = '' } = {}) {
  return `<svg class="${className}" viewBox="0 0 ${width} ${height}" preserveAspectRatio="none" aria-hidden="true" focusable="false">${before}${renderLayers(layers, idPrefix)}</svg>`;
}

const pointsAttr = (pts) => pts.map(([x, y]) => `${round(x)},${round(y)}`).join(' ');

/* ------------------------------------------------------------------ rodapé do papel timbrado */
/**
 * Cunha verde que sobe de 1,3 mm (esquerda) a 10,5 mm (direita), com três
 * barras finas na base (laranja | verde→água | vermelho→laranja).
 * `baseY` é a posição da borda inferior no sistema de coordenadas do SVG.
 */
function footerBarLayers(baseY) {
  const up = (x, y) => [x, baseY - y];
  const top = (x) => 1.3 + (9.2 * x) / PAGE_W;
  const x1 = 73.4;
  const x2 = 141.4;
  return [
    { pts: [up(0, 0), up(PAGE_W, 0), up(PAGE_W, top(PAGE_W)), up(0, top(0))], color: '#38B53F' },
    { pts: [up(x2, 0), up(PAGE_W, 0), up(PAGE_W, top(PAGE_W)), up(x2, top(x2))], colors: ['#5FCAC9', '#38B540'], from: up(x2, 0), to: up(PAGE_W, 0) },
    { pts: [up(0, 0), up(x1, 0), up(x1, 1.2), up(0, 0.6)], color: '#F79217' },
    { pts: [up(x1, 0), up(x2, 0), up(x2, 1.85), up(x1, 1.45)], colors: ['#39B848', '#63CBD8'], from: up(x1, 0), to: up(x2, 0) },
    { pts: [up(x2, 0), up(PAGE_W, 0), up(PAGE_W, 2.37), up(x2, 1.9)], colors: ['#ED2225', '#F79317'], from: up(x2, 0), to: up(PAGE_W, 0) },
  ];
}

/**
 * Meia faixa: o rodapé das páginas do próprio MIV (ex.: p. 16 e 21). Só a
 * metade de fora da folha recebe a cunha, que sobe de 0 a 10,9 mm; na ponta
 * ficam os blocos verde, água-marinha e vermelho. Medida a 300 dpi na p. 21
 * (paisagem) e estreitada para a largura do A4 retrato.
 */
function halfBarLayers(baseY, mirror) {
  const sx = PAGE_W / 297;
  const at = (d, y) => [mirror ? d * sx : PAGE_W - d * sx, baseY - y];
  const top = (d) => 10.9 * (1 - d / 120);
  return [
    { pts: [at(120, 0), at(67, 0), at(67, 3), at(120, 0)], color: '#38B53F' },
    { pts: [at(120, 0), at(67, 3), at(67, top(67))], colors: ['#ED2225', '#F79217'], from: at(120, 0), to: at(67, 0) },
    { pts: [at(67, 0), at(11, 0), at(11, top(11)), at(67, top(67))], color: '#35AB3F' },
    { pts: [at(67, 0), at(11, 0), at(11, 0.6), at(67, 0.5)], colors: ['#47B876', '#59C2A9'], from: at(67, 0), to: at(11, 0) },
    { pts: [at(11, 5), at(0, 5), at(0, top(0)), at(11, top(11))], colors: ['#37AE3F', '#3DB359'], from: at(11, 5), to: at(11, top(11)) },
    { pts: [at(11, 1.2), at(0, 1.2), at(0, 5), at(11, 5)], color: '#5BC2AE' },
    { pts: [at(11, 0), at(0, 0), at(0, 1.2), at(11, 1.2)], colors: ['#E62124', '#E93421'], from: at(11, 0), to: at(0, 0) },
  ];
}

function stripeLayers(height) {
  const rect = (a, b) => [[a, 0], [b, 0], [b, height], [a, height]];
  return [
    { pts: rect(0, 73.4), color: '#F79217' },
    { pts: rect(73.4, 141.4), colors: ['#39B848', '#63CBD8'], from: [73.4, 0], to: [141.4, 0] },
    { pts: rect(141.4, PAGE_W), colors: ['#ED2225', '#F79317'], from: [141.4, 0], to: [PAGE_W, 0] },
  ];
}

/**
 * Faixas em camadas do fundo de palco e da vinheta (MIV p. 62 e 98–113): cunha
 * que sobe da esquerda para a direita, em três trechos verde → água-marinha,
 * com a faixa laranja embaixo do lado direito. `rise` é a altura na direita.
 */
function stageLayers(baseY, rise, { x1 = 75, x2 = 148 } = {}) {
  const top = (x) => baseY - (rise * x) / PAGE_W;
  const band = (x) => baseY - rise * 0.12 - ((rise * 0.42) * (x - x1)) / (PAGE_W - x1);
  return [
    { pts: [[0, baseY], [x1, top(x1)], [x1 + 1.5, baseY]], colors: ['#38B53F', '#5FCAC9'], from: [0, baseY], to: [x1, baseY] },
    { pts: [[x1, top(x1)], [x2, top(x2)], [x2, band(x2)], [x1, band(x1)]], colors: ['#47BD6A', '#55C5B2'], from: [x1, baseY], to: [x2, baseY] },
    { pts: [[x2, top(x2)], [PAGE_W, top(PAGE_W)], [PAGE_W, band(PAGE_W)], [x2, band(x2)]], colors: ['#38B53F', '#5FCAC9'], from: [x2, baseY], to: [PAGE_W, baseY] },
    { pts: [[x1, band(x1)], [PAGE_W, band(PAGE_W)], [PAGE_W, baseY], [x1 + 1.5, baseY]], colors: ['#F15A24', '#F7941D'], from: [x1, baseY], to: [PAGE_W, baseY] },
  ];
}

/** Faixa fina e inclinada do alto do certificado (MIV p. 52). */
function topBandLayers() {
  return [
    { pts: [[24, 0], [196, 0], [196, 1.2], [24, 3.4]], colors: ['#26A737', '#38B53F'], from: [24, 0], to: [196, 0] },
    { pts: [[178, 0], [210, 0], [210, 1.6], [178, 1.6]], color: '#5FCAC9' },
  ];
}

export function headerArt(style, idPrefix) {
  return style === 'band' ? svg('header-art', topBandLayers(), idPrefix, { height: 4 }) : '';
}

export function footerArt(style, idPrefix, { mirror = false } = {}) {
  if (style === 'layers') return svg('footer-art', stageLayers(14, 14), idPrefix, { height: 14 });
  if (style === 'bar' || style === 'address') return svg('footer-art', footerBarLayers(10.5), idPrefix, { height: 10.5 });
  if (style === 'half') return svg('footer-art', halfBarLayers(10.9, mirror), idPrefix, { height: 10.9 });
  if (style === 'stripe') return svg('footer-art', stripeLayers(1.9), idPrefix, { height: 1.9 });
  return '';
}

/** Faixa do grafismo usada como divisor no corpo do texto (proporção da faixa de parede, p. 83). */
export function dividerArt(idPrefix) {
  return svg('divider-art', footerBarLayers(10.5), idPrefix, { height: 10.5 });
}

/* ------------------------------------------------------------------ leque (elemento base) */
/** Gerador pseudoaleatório com semente: o leque sai sempre igual para a mesma semente. */
function seededRandom(seed) {
  let state = seed >>> 0;
  return () => {
    state = (state + 0x6d2b79f5) >>> 0;
    let t = state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/**
 * Pares de degradê do elemento base (p. 26): só verde → água-marinha e
 * laranja → vermelho. O amarelo da paleta não aparece no leque.
 */
const FAN_COLORS = [
  ['#26A737', '#5FCAC9'], ['#46AC33', '#2DB39E'], ['#26A737', '#45B16E'], ['#45B16E', '#4EC6E0'],
  ['#F59C00', '#E94F0E'], ['#E06A0C', '#ED2225'], ['#26A737', '#2DB39E'], ['#5DB12F', '#2DB39E'],
];

/**
 * Leque do elemento base: raios retos que saem de um centro, com larguras
 * variadas (finos e largos) e 1 a 3 segmentos empilhados separados por
 * vãos brancos. Cores opacas, como no MIV.
 */
function fanLayers({ cx, cy, from, to, rays, minR, maxR, seed }) {
  const random = seededRandom(seed);
  const layers = [];
  const step = (to - from) / rays;
  for (let i = 0; i < rays; i += 1) {
    const thin = random() < 0.25;
    const width = thin ? step * (0.15 + random() * 0.2) : step * (0.75 + random() * 0.25);
    const start = from + i * step + random() * (step - width);
    const end = start + width;
    const outer = minR + random() * (maxR - minR);
    const segments = thin ? 1 : 1 + Math.floor(random() * 3);
    let inner = random() < 0.4 ? 0 : 6 + random() * 22;
    const length = (outer - inner) / segments;
    for (let k = 0; k < segments; k += 1) {
      const gap = k === 0 ? 0 : 2 + random() * 5;
      const r1 = inner + gap;
      const r2 = Math.min(outer, inner + length);
      if (r2 - r1 > 3) {
        const [c1, c2] = FAN_COLORS[Math.floor(random() * FAN_COLORS.length)];
        layers.push(sector({ c: [cx, cy], r1, r2, a1: start, a2: end, colors: [c1, c2] }));
      }
      inner = r2;
    }
  }
  return layers;
}

/* ------------------------------------------------------------------ arcos (capa do MIV, p. 1) */
/**
 * Releitura em retrato da capa do MIV: o centro do leque fica fora da folha
 * (acima, à esquerda) e a área branca é um setor de anel entre dois raios,
 * com faixas verdes, água-marinha e laranja ao redor.
 */
const ARC_CENTER = [-120, -100];
const ARC = { r1: 260, r2: 480, a1: 32, a2: 66 };
function arcLayers() {
  const c = ARC_CENTER;
  return [
    { pts: [F(0, 0), F(1, 0), F(1, 1), F(0, 1)], colors: ['#26A737', '#45B16E', '#2DB39E'], from: F(0, 0.05), to: F(1, 0.3) },
    sector({ c, r1: 0, r2: ARC.r1, a1: 0, a2: 90, colors: ['#2DB39E', '#45B16E'] }),
    sector({ c, r1: 150, r2: 200, a1: 30, a2: 50, colors: ['#ED2225', '#F59C00'] }),
    sector({ c, r1: 200, r2: ARC.r1, a1: 50, a2: 64, colors: ['#26A737', '#4EC6E0'] }),
    sector({ c, r1: 0, r2: 700, a1: ARC.a2, a2: 69.4, colors: ['#E94F0E', '#F59C00'] }),
    sector({ c, r1: 0, r2: 700, a1: 69.4, a2: 71.6, colors: ['#26A737', '#45B16E'] }),
    sector({ c, r1: 0, r2: 700, a1: 71.6, a2: 80, colors: ['#2DB39E', '#4EC6E0'] }),
    sector({ c, r1: ARC.r2, r2: 700, a1: ARC.a1, a2: ARC.a2, colors: ['#26A737', '#46AC33'] }),
    sector({ c, r1: ARC.r2, r2: 700, a1: 57, a2: 61, colors: ['#2DB39E', '#5FCAC9'] }),
    sector({ c, r1: ARC.r1, r2: ARC.r2, a1: ARC.a1, a2: ARC.a2, color: '#FFFFFF' }),
  ];
}

/* ------------------------------------------------------------------ capas */
const COVER_LAYERS = {
  // Modelo "Pasta – Frente" do MIV (coordenadas medidas no manual)
  folder: () => [
    { pts: [F(0.22, 0), F(1, 0), F(1, 0.545)], colors: ['#54C4A0', '#47BD5C', '#40B93C'], from: F(0.30, 0), to: F(0.92, 0.42) },
    { pts: [F(0.74, 0), F(1, 0), F(1, 0.135)], colors: ['#4CBF60', '#46BC50'], from: F(0.74, 0), to: F(1, 0.135) },
    { pts: [F(0.81, 0.412), F(1, 0.26), F(1, 0.545)], colors: ['#4FC189', '#55C5B2'], from: F(0.9, 0.3), to: F(1, 0.5) },
    { pts: [F(0, 0.39), F(0.46, 1), F(0, 1)], colors: ['#45BC5E', '#53C49C', '#58C7BD'], from: F(0, 0.39), to: F(0.1, 0.72) },
    { pts: [F(0, 0.756), F(0.22, 0.682), F(0.46, 1), F(0, 1)], colors: ['#F04321', '#F14C20'], from: F(0.1, 0.7), to: F(0.4, 1) },
    { pts: [F(0, 0.756), F(0.15, 1), F(0, 1)], colors: ['#F35E1F', '#F4721D', '#F7941D'], from: F(0.08, 0.8), to: F(0, 1) },
  ],

  // Mesmas faixas da "Pasta", com a assinatura vertical centralizada (como no MIV)
  official: () => COVER_LAYERS.folder(),

  // Arcos do grafismo, como a capa do próprio Manual de Identidade Visual (p. 1)
  identity: arcLayers,

  // Slide de abertura do MIV (p. 57): painel verde à direita e faixas diagonais
  panel: () => [
    { pts: [[0, 0], [126, 0], [126, 92], [0, 26]], colors: ['#26A737', '#45B16E', '#2DB39E'], from: [0, 10], to: [126, 60] },
    { pts: [[0, 0], [22, 0], [0, 12]], colors: ['#ED2225', '#E94F0E'], from: [0, 0], to: [14, 8] },
    { pts: [[0, 26], [9, 30.7], [0, 96]], colors: ['#2DB39E', '#4EC6E0'], from: [0, 30], to: [0, 96] },
    { pts: [[0, 142], [140, 297], [112, 297], [0, 172]], colors: ['#26A737', '#45B16E'], from: [0, 150], to: [120, 297] },
    { pts: [[0, 172], [112, 297], [84, 297], [0, 203]], colors: ['#2DB39E', '#45B16E'], from: [0, 180], to: [100, 297] },
    { pts: [[0, 203], [84, 297], [58, 297], [0, 232]], colors: ['#E06A0C', '#F59C00'], from: [0, 210], to: [70, 297] },
    { pts: [[126, 0], [210, 0], [210, 297], [140, 297]], colors: ['#26A737', '#46AC33'], from: [130, 0], to: [210, 297] },
  ],

  // Convite do MIV (p. 55) em retrato: faixa vertical verde e bloco laranja
  invite: () => [
    { pts: [[0, 0], [15.5, 0], [18.5, 151.5], [0, 151.5]], colors: ['#26A737', '#46AC33'], from: [0, 0], to: [0, 151.5] },
    { pts: [[15.5, 0], [30.5, 0], [48, 139.6], [18.5, 151.5]], colors: ['#26A737', '#45B16E', '#2DB39E'], from: [20, 0], to: [40, 145] },
    { pts: [[18.5, 151.5], [48, 139.6], [67, 297], [24, 297]], colors: ['#26A737', '#45B16E'], from: [30, 145], to: [50, 297] },
    { pts: [[48, 139.6], [49.4, 139.6], [68.6, 297], [67, 297]], color: '#4EC6E0' },
    { pts: [[0, 151.5], [18.5, 151.5], [24, 297], [0, 297]], colors: ['#F59C00', '#E94F0E', '#ED2225'], from: [0, 151.5], to: [0, 297] },
  ],

  // Inspirada no envelope do MIV: faixa diagonal com pé laranja
  envelope: () => [
    { pts: [F(0.42, 0), F(0.64, 0), F(0.92, 1), F(0.66, 1)], colors: ['#42B83C', '#4DBF73', '#58C7BD'], from: F(0.5, 0), to: F(0.8, 1) },
    { pts: [F(0.74, 0), F(1, 0), F(1, 0.3)], colors: ['#46BC50', '#54C4A0'], from: F(0.8, 0), to: F(1, 0.3) },
    { pts: [F(0.612, 0.8), F(0.864, 0.8), F(0.92, 1), F(0.66, 1)], colors: ['#F7941D', '#F26B21', '#F04321'], from: F(0.7, 0.8), to: F(0.8, 1) },
    { pts: [F(0, 0.72), F(0.1, 0.68), F(0.3, 1), F(0, 1)], colors: ['#5FCAC9', '#4DBF73'], from: F(0, 0.7), to: F(0.2, 1) },
    { pts: [F(0, 0.88), F(0.225, 0.88), F(0.3, 1), F(0, 1)], colors: ['#F04321', '#F26B21'], from: F(0, 0.9), to: F(0.3, 1) },
  ],

  fan: () => fanLayers({ cx: 214, cy: 300, from: 182, to: 272, rays: 17, minR: 80, maxR: 165, seed: 2023 }),

  // Contracapa do MIV (p. 117): degradê horizontal verde → água-marinha, sem sobreposições
  solid: () => [
    { pts: [F(0, 0), F(1, 0), F(1, 1), F(0, 1)], colors: ['#26A737', '#45B16E', '#2DB39E'], from: F(0, 0.5), to: F(1, 0.5) },
  ],

  minimal: () => [
    { pts: [F(0, 0), F(1, 0), F(1, 0.012), F(0, 0.012)], colors: ['#26A737', '#2DB39E', '#F59C00'], from: F(0, 0), to: F(1, 0) },
    { pts: [F(0.78, 0), F(1, 0), F(1, 0.1)], colors: ['#46BC50', '#54C4A0'], from: F(0.8, 0), to: F(1, 0.1) },
    ...footerBarLayers(PAGE_H),
  ],

  // Totem de evento (MIV p. 115): degradê verde no alto com borda em arco,
  // área branca e raios coloridos no pé, saindo de um centro acima deles.
  totem: totemLayers,

  // Placa de obra (MIV p. 76): área branca à esquerda e painel verde à direita,
  // separados por faixas verticais vermelho → laranja e água-marinha.
  sign: () => [
    { pts: [[124, 0], [210, 0], [210, 297], [129, 297]], colors: ['#38B53F', '#45B16E', '#58C7BD'], from: [130, 0], to: [210, 297] },
    { pts: [[112.6, 0], [121.4, 0], [121.6, 15], [112.8, 15]], color: '#38B53F' },
    { pts: [[119.6, 0], [122.6, 0], [122.6, 8], [119.6, 8]], color: '#ED2225' },
    { pts: [[112.8, 15], [121.6, 15], [124.6, 196], [116.4, 196]], colors: ['#ED2225', '#F26B21', '#F7941D'], from: [0, 15], to: [0, 196] },
    { pts: [[116.4, 196], [124.6, 196], [126.6, 297], [118.6, 297]], colors: ['#45B16E', '#5FCAC9'], from: [0, 196], to: [0, 297] },
    { pts: [[124.6, 196], [125.6, 196], [127.7, 297], [126.6, 297]], color: '#F7941D' },
    { pts: [[121.6, 0], [124, 0], [129, 297], [126.6, 297]], color: '#5FCAC9' },
  ],

  // Fundo de palco e vinheta (MIV p. 62 e 98–113): faixas em camadas no pé e
  // a faixa vertical estreita na borda esquerda.
  stage: () => [
    ...stageLayers(PAGE_H, 78, { x1: 75, x2: 146 }),
    ...edgeStripLayers(),
  ],

  // Certificado (MIV p. 52): faixa fina no alto e a faixa do papel timbrado no pé.
  certificate: () => [
    ...topBandLayers(),
    ...footerBarLayers(PAGE_H),
  ],
};

/** Faixa vertical estreita da borda esquerda do fundo de palco (MIV p. 104). */
function edgeStripLayers() {
  return [
    { pts: [[0, 0], [4.2, 0], [4.2, 52], [0, 52]], colors: ['#ED2225', '#F26B21'], from: [0, 0], to: [0, 52] },
    { pts: [[4.2, 0], [10.6, 0], [10.2, 52], [4.2, 52]], colors: ['#45B16E', '#38B53F'], from: [0, 0], to: [0, 52] },
    { pts: [[0, 52], [10.2, 52], [0.8, 297], [0, 297]], colors: ['#5FCAC9', '#45B16E', '#38B53F'], from: [0, 52], to: [0, 297] },
  ];
}

function totemLayers() {
  // Centro e raio medidos para o branco terminar a 93% da altura no meio e a 80% nas bordas.
  const c = [105, 111.9];
  const r1 = 164.1;
  const rays = [
    [28, 42, ['#5FCAC9', '#45B16E']], [42, 56, ['#ED2225', '#F7941D']], [56, 72, ['#38B53F', '#45B16E']],
    [72, 80, ['#45B16E', '#38B53F']], [80, 100, ['#38B53F', '#5DB12F']], [100, 120, ['#F7941D', '#F26B21']],
    [120, 136, ['#38B53F', '#45B16E']], [136, 152, ['#F7941D', '#F59C00']],
  ];
  return [
    { d: 'M 0 0 L 210 0 L 210 110 Q 105 98 0 110 Z', colors: ['#3DB54A', '#45B16E', '#5BC4C0'], from: [40, 0], to: [190, 115] },
    ...rays.map(([a1, a2, colors]) => sector({ c, r1, r2: 320, a1, a2, colors })),
  ];
}

const BACK_LAYERS = {
  // Modelo "Pasta – Verso" do MIV
  folder: () => [
    { pts: [F(0.38, 0), F(0.69, 0), F(1, 0.41), F(1, 0.75), F(0.77, 0.817)], colors: ['#42B83C', '#4DBF73', '#58C7BD'], from: F(0.55, 0.15), to: F(0.85, 0.8) },
    { pts: [F(0.77, 0.817), F(1, 0.75), F(1, 1), F(0.856, 1)], colors: ['#F7941D', '#F26B21', '#F04321'], from: F(0.8, 0.92), to: F(1, 0.86) },
    { pts: [F(0, 0.4), F(0.098, 1), F(0, 1)], colors: ['#F04321', '#F15A24', '#F26B21'], from: F(0, 0.5), to: F(0, 1) },
  ],
  solid: COVER_LAYERS.solid,
  concept: COVER_LAYERS.solid,
  fan: () => fanLayers({ cx: 214, cy: 300, from: 186, to: 272, rays: 18, minR: 90, maxR: 175, seed: 117 }),
  minimal: () => [
    { pts: [F(0, 0), F(1, 0), F(1, 0.012), F(0, 0.012)], colors: ['#26A737', '#2DB39E', '#F59C00'], from: F(0, 0), to: F(1, 0) },
    ...footerBarLayers(PAGE_H),
  ],
  identity: arcLayers,
  stage: COVER_LAYERS.stage,
  // Vinheta do MIV (p. 62): branco, canto superior em faixas e camadas no pé.
  vignette: () => [
    { pts: [[0, 0], [20, 0], [0, 26]], colors: ['#F26B21', '#ED2225'], from: [0, 0], to: [12, 14] },
    { pts: [[20, 0], [34, 0], [0, 44], [0, 26]], colors: ['#45B16E', '#5FCAC9'], from: [0, 0], to: [20, 30] },
    ...stageLayers(PAGE_H, 62, { x1: 70, x2: 140 }),
  ],
  certificate: COVER_LAYERS.certificate,
};

const CHAPTER_LAYERS = () => [
  { pts: [F(0.45, 0), F(1, 0), F(1, 0.36)], colors: ['#54C4A0', '#47BD5C', '#40B93C'], from: F(0.5, 0), to: F(0.95, 0.3) },
  { pts: [F(0.8, 0), F(1, 0), F(1, 0.12)], colors: ['#4CBF60', '#46BC50'], from: F(0.8, 0), to: F(1, 0.12) },
  { pts: [F(0.86, 0.28), F(1, 0.2), F(1, 0.36)], colors: ['#4FC189', '#55C5B2'], from: F(0.9, 0.25), to: F(1, 0.35) },
  ...footerBarLayers(PAGE_H),
];

// Abertura do MIV (p. 2–3): degradê diagonal medido na tela (#3FB45D → #56C0A3).
const CHAPTER_SOLID_LAYERS = () => [
  { pts: [F(0, 0), F(1, 0), F(1, 1), F(0, 1)], colors: ['#3FB45D', '#49BA7E', '#56C0A3'], from: F(0, 0), to: F(1, 1) },
];

/**
 * Capa "Foto" (slide com foto do MIV, p. 56): a foto ocupa o alto da folha,
 * recortada por uma diagonal; faixas verde, água-marinha e laranja passam por
 * cima das bordas. Sem foto, o recorte recebe o degradê verde do MIV.
 */
const PHOTO_CLIP = [[0, 0], [210, 0], [210, 150], [0, 118]];
function photoLayers() {
  return [
    { pts: [[0, 0], [98, 0], [0, 74]], colors: ['#5DB12F', '#26A737'], from: [0, 0], to: [60, 40], opacity: 0.94 },
    { pts: [[0, 112], [210, 144], [210, 157], [0, 124]], colors: ['#2DB39E', '#4EC6E0'], from: [0, 0], to: [210, 0] },
    { pts: [[96, 138.6], [210, 157], [210, 186]], colors: ['#26A737', '#45B16E'], from: [96, 150], to: [210, 175] },
    { pts: [[0, 236], [33, 297], [0, 297]], colors: ['#ED2225', '#F59C00'], from: [0, 240], to: [20, 297] },
    { pts: [[0, 214], [12, 236], [0, 236]], colors: ['#2DB39E', '#4EC6E0'], from: [0, 214], to: [0, 236] },
  ];
}

function photoBackground(idPrefix, photoUrl) {
  const clip = `${idPrefix}-clip`;
  const fill = `${idPrefix}-photo`;
  const content = photoUrl
    ? `<image href="${photoUrl}" x="0" y="0" width="210" height="150" preserveAspectRatio="xMidYMid slice" clip-path="url(#${clip})"/>`
    : `<polygon points="${pointsAttr(PHOTO_CLIP)}" fill="url(#${fill})"/>`;
  return `<defs><clipPath id="${clip}"><polygon points="${pointsAttr(PHOTO_CLIP)}"/></clipPath>${gradientDef(fill, [0, 0], [210, 150], ['#45B16E', '#2DB39E', '#5FCAC9'])}</defs>${content}`;
}

/**
 * `photoUrl` só é usado pela capa "Foto". A URL vem do registro de imagens
 * (blob: criado pelo próprio app) e é escapada por quem chama.
 */
export function coverArt(id, idPrefix, { photoUrl = '' } = {}) {
  if (id === 'photo') return svg('cover__art', photoLayers(), idPrefix, { before: photoBackground(idPrefix, photoUrl) });
  const layers = COVER_LAYERS[id];
  return layers ? svg('cover__art', layers(), idPrefix) : '';
}

export function backArt(id, idPrefix) {
  const layers = BACK_LAYERS[id];
  return layers ? svg('back__art', layers(), idPrefix) : '';
}

/**
 * Arte da página de abertura de capítulo: "folder" (faixas da pasta) ou
 * "solid" (degradê diagonal verde → água-marinha das p. 2–3 do MIV).
 */
const CHAPTER_STYLES = {
  folder: CHAPTER_LAYERS,
  solid: CHAPTER_SOLID_LAYERS,
  // Fundo de palco (MIV p. 104) e arcos da capa do MIV (p. 1).
  stage: () => [...stageLayers(PAGE_H, 70, { x1: 75, x2: 146 }), ...edgeStripLayers()],
  arcs: arcLayers,
};

export function chapterArt(idPrefix, style = 'folder') {
  return svg('chapter__art', (CHAPTER_STYLES[style] ?? CHAPTER_LAYERS)(), idPrefix);
}

/** Ícone de "check" usado em cartões e listas do documento. */
export const CHECK_SVG = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 12.5l4.5 4.5L19 7"/></svg>';
