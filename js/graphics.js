/**
 * Grafismo do MIV em SVG vetorial (imprime nítido em qualquer resolução).
 *
 * Cada arte é uma lista de camadas (polígonos em mm sobre a folha A4 de
 * 210 × 297 mm), preenchidas com cor sólida ou degradê linear — exatamente
 * como as faixas do grafismo oficial. As coordenadas das capas "Pasta" e do
 * rodapé foram medidas no próprio Manual de Identidade Visual.
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
    const points = layer.pts.map(([x, y]) => `${round(x)},${round(y)}`).join(' ');
    const opacity = layer.opacity != null ? ` fill-opacity="${layer.opacity}"` : '';
    if (layer.colors) {
      const id = `${idPrefix}-${index}`;
      defs.push(gradientDef(id, layer.from, layer.to, layer.colors));
      return `<polygon points="${points}" fill="url(#${id})"${opacity}/>`;
    }
    return `<polygon points="${points}" fill="${layer.color}"${opacity}/>`;
  });
  return `<defs>${defs.join('')}</defs>${shapes.join('')}`;
}

function svg(className, layers, idPrefix, { width = PAGE_W, height = PAGE_H } = {}) {
  return `<svg class="${className}" viewBox="0 0 ${width} ${height}" preserveAspectRatio="none" aria-hidden="true" focusable="false">${renderLayers(layers, idPrefix)}</svg>`;
}

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

function stripeLayers(height) {
  const rect = (a, b) => [[a, 0], [b, 0], [b, height], [a, height]];
  return [
    { pts: rect(0, 73.4), color: '#F79217' },
    { pts: rect(73.4, 141.4), colors: ['#39B848', '#63CBD8'], from: [73.4, 0], to: [141.4, 0] },
    { pts: rect(141.4, PAGE_W), colors: ['#ED2225', '#F79317'], from: [141.4, 0], to: [PAGE_W, 0] },
  ];
}

export function footerArt(style, idPrefix) {
  if (style === 'bar') return svg('footer-art', footerBarLayers(10.5), idPrefix, { height: 10.5 });
  if (style === 'stripe') return svg('footer-art', stripeLayers(1.9), idPrefix, { height: 1.9 });
  return '';
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

const FAN_COLORS = [
  ['#26A737', '#5DB12F'], ['#2DB39E', '#5FCAC9'], ['#F59C00', '#FCCF05'], ['#E94F0E', '#F59C00'],
  ['#45B16E', '#2DB39E'], ['#46AC33', '#26A737'], ['#E06A0C', '#FCCF05'], ['#38B53F', '#63CBD8'],
];

function fanLayers({ cx, cy, from, to, rays, minR, maxR, seed }) {
  const random = seededRandom(seed);
  const layers = [];
  const span = to - from;
  const step = span / rays;
  for (let i = 0; i < rays; i += 1) {
    const width = step * (0.55 + random() * 0.45);
    const start = from + i * step + random() * (step - width);
    const inner = 6 + random() * 26;
    const outer = minR + random() * (maxR - minR);
    const [c1, c2] = FAN_COLORS[Math.floor(random() * FAN_COLORS.length)];
    const rad = (deg) => (deg * Math.PI) / 180;
    const point = (r, deg) => [cx + r * Math.cos(rad(deg)), cy + r * Math.sin(rad(deg))];
    const end = start + width;
    const mid = start + width / 2;
    layers.push({
      pts: [point(inner, start), point(outer, start), point(outer, mid), point(outer, end), point(inner, end)],
      colors: [c1, c2],
      from: point(inner, mid),
      to: point(outer, mid),
      opacity: 0.94,
    });
  }
  return layers;
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

  // Releitura em retrato da capa do Manual de Identidade Visual
  identity: () => [
    { pts: [F(0, 0), F(1, 0), F(1, 0.17), F(0, 0.4)], colors: ['#3FB83F', '#46BC55', '#52C394'], from: F(0, 0.1), to: F(1, 0.3) },
    { pts: [F(0, 0.4), F(1, 0.17), F(1, 0.205), F(0, 0.435)], colors: ['#58C7BD', '#5FCAC9'], from: F(0, 0.4), to: F(1, 0.2) },
    { pts: [F(0, 0), F(0.3, 0), F(0, 0.13)], colors: ['#F04321', '#F26B21'], from: F(0, 0), to: F(0.2, 0.1) },
    { pts: [F(0, 0.7), F(0.7, 1), F(0.5, 1), F(0, 0.8)], colors: ['#F26B21', '#F7941D'], from: F(0, 0.75), to: F(0.6, 1) },
    { pts: [F(0, 0.8), F(0.5, 1), F(0, 1)], colors: ['#45BC5E', '#53C49C'], from: F(0, 0.8), to: F(0.3, 1) },
    { pts: [F(0, 0.9), F(0.22, 1), F(0, 1)], colors: ['#5FCAC9', '#58C7BD'], from: F(0, 0.9), to: F(0.2, 1) },
    { pts: [F(1, 0.62), F(1, 1), F(0.93, 1)], colors: ['#46BC50', '#52C394'], from: F(1, 0.62), to: F(0.95, 1) },
  ],

  // Inspirada no envelope do MIV: faixa diagonal com pé laranja
  envelope: () => [
    { pts: [F(0.42, 0), F(0.64, 0), F(0.92, 1), F(0.66, 1)], colors: ['#42B83C', '#4DBF73', '#58C7BD'], from: F(0.5, 0), to: F(0.8, 1) },
    { pts: [F(0.74, 0), F(1, 0), F(1, 0.3)], colors: ['#46BC50', '#54C4A0'], from: F(0.8, 0), to: F(1, 0.3) },
    { pts: [F(0.612, 0.8), F(0.864, 0.8), F(0.92, 1), F(0.66, 1)], colors: ['#F7941D', '#F26B21', '#F04321'], from: F(0.7, 0.8), to: F(0.8, 1) },
    { pts: [F(0, 0.72), F(0.1, 0.68), F(0.3, 1), F(0, 1)], colors: ['#5FCAC9', '#4DBF73'], from: F(0, 0.7), to: F(0.2, 1) },
    { pts: [F(0, 0.88), F(0.225, 0.88), F(0.3, 1), F(0, 1)], colors: ['#F04321', '#F26B21'], from: F(0, 0.9), to: F(0.3, 1) },
  ],

  fan: () => fanLayers({ cx: 214, cy: 300, from: 182, to: 272, rays: 24, minR: 70, maxR: 152, seed: 2023 }),

  solid: () => [
    { pts: [F(0, 0), F(1, 0), F(1, 1), F(0, 1)], colors: ['#21A03A', '#2BAA4F', '#2DB39E'], from: F(0, 0), to: F(1, 1) },
    { pts: [F(0.22, 0), F(1, 0), F(1, 0.545)], color: '#ffffff', opacity: 0.07 },
    { pts: [F(0.74, 0), F(1, 0), F(1, 0.135)], color: '#ffffff', opacity: 0.08 },
    { pts: [F(0, 0.39), F(0.46, 1), F(0, 1)], color: '#0b5e1f', opacity: 0.12 },
    { pts: [F(1, 0.78), F(1, 1), F(0.74, 1)], colors: ['#F7941D', '#F04321'], from: F(1, 0.8), to: F(0.8, 1) },
    { pts: [F(1, 0.86), F(1, 1), F(0.86, 1)], colors: ['#F04321', '#ED2225'], from: F(1, 0.9), to: F(0.9, 1) },
  ],

  minimal: () => [
    { pts: [F(0, 0), F(1, 0), F(1, 0.012), F(0, 0.012)], colors: ['#26A737', '#2DB39E', '#F59C00'], from: F(0, 0), to: F(1, 0) },
    { pts: [F(0.78, 0), F(1, 0), F(1, 0.1)], colors: ['#46BC50', '#54C4A0'], from: F(0.8, 0), to: F(1, 0.1) },
    ...footerBarLayers(PAGE_H),
  ],
};

const BACK_LAYERS = {
  // Modelo "Pasta – Verso" do MIV
  folder: () => [
    { pts: [F(0.38, 0), F(0.69, 0), F(1, 0.41), F(1, 0.75), F(0.77, 0.817)], colors: ['#42B83C', '#4DBF73', '#58C7BD'], from: F(0.55, 0.15), to: F(0.85, 0.8) },
    { pts: [F(0.77, 0.817), F(1, 0.75), F(1, 1), F(0.856, 1)], colors: ['#F7941D', '#F26B21', '#F04321'], from: F(0.8, 0.92), to: F(1, 0.86) },
    { pts: [F(0, 0.4), F(0.098, 1), F(0, 1)], colors: ['#F04321', '#F15A24', '#F26B21'], from: F(0, 0.5), to: F(0, 1) },
  ],
  solid: COVER_LAYERS.solid,
  fan: () => fanLayers({ cx: 214, cy: 300, from: 186, to: 272, rays: 26, minR: 80, maxR: 165, seed: 117 }),
  minimal: () => [
    { pts: [F(0, 0), F(1, 0), F(1, 0.012), F(0, 0.012)], colors: ['#26A737', '#2DB39E', '#F59C00'], from: F(0, 0), to: F(1, 0) },
    ...footerBarLayers(PAGE_H),
  ],
};

const CHAPTER_LAYERS = () => [
  { pts: [F(0.45, 0), F(1, 0), F(1, 0.36)], colors: ['#54C4A0', '#47BD5C', '#40B93C'], from: F(0.5, 0), to: F(0.95, 0.3) },
  { pts: [F(0.8, 0), F(1, 0), F(1, 0.12)], colors: ['#4CBF60', '#46BC50'], from: F(0.8, 0), to: F(1, 0.12) },
  { pts: [F(0.86, 0.28), F(1, 0.2), F(1, 0.36)], colors: ['#4FC189', '#55C5B2'], from: F(0.9, 0.25), to: F(1, 0.35) },
  ...footerBarLayers(PAGE_H),
];

export function coverArt(id, idPrefix) {
  const layers = COVER_LAYERS[id];
  return layers ? svg('cover__art', layers(), idPrefix) : '';
}

export function backArt(id, idPrefix) {
  const layers = BACK_LAYERS[id];
  return layers ? svg('back__art', layers(), idPrefix) : '';
}

export function chapterArt(idPrefix) {
  return svg('chapter__art', CHAPTER_LAYERS(), idPrefix);
}

/** Ícone de "check" usado em cartões e listas do documento. */
export const CHECK_SVG = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 12.5l4.5 4.5L19 7"/></svg>';
