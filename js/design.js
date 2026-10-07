/**
 * Opções de design do documento (todas derivadas do MIV 2023–2026):
 * temas de cor, capas, contracapas, cabeçalho, rodapé, numeração, estilos
 * de título, tipografia e assinatura. Também define os textos fixos (meta).
 */
import { monthYear } from './utils.js';

/**
 * Temas de cor. A cor principal de cada tema vem da paleta do grafismo do MIV
 * (p. 26) ou da assinatura (p. 11). O segundo tom é a versão escura usada em
 * textos: a oficial quando existe (#008241 = Pantone 348 C, #2a7050 = 555 C)
 * ou um escurecimento da cor principal para atingir contraste AA no papel.
 */
export const THEMES = [
  { id: 'green', label: 'Verde institucional', colors: ['#26a737', '#008241', '#f59c00'] },
  { id: 'teal', label: 'Água-marinha', colors: ['#2db39e', '#1e8576', '#f59c00'] },
  { id: 'orange', label: 'Laranja', colors: ['#e06a0c', '#b4500a', '#26a737'] },
  { id: 'red', label: 'Urucum', colors: ['#e94f0e', '#b83a0a', '#2db39e'] },
  { id: 'gold', label: 'Sol', colors: ['#e4a500', '#8a6400', '#26a737'] },
  { id: 'leaf', label: 'Folha', colors: ['#45b16e', '#2a7050', '#e94f0e'] },
  { id: 'navy', label: 'Grafite', colors: ['#465564', '#2f3b47', '#26a737'] },
];

/**
 * Capas. "mivPage" indica a página do MIV usada como referência; as que não
 * têm são releituras com os mesmos elementos (faixas, leque, cores).
 * `dark` = fundo escuro (textos e assinatura em negativo).
 */
export const COVERS = [
  { id: 'folder', label: 'Pasta', description: 'Faixas diagonais nos cantos, como a pasta do MIV (p. 44) e os manuais aprovados' },
  { id: 'official', label: 'Pasta oficial', description: 'Pasta do MIV com a assinatura vertical centralizada e o título embaixo' },
  { id: 'identity', label: 'Arcos', description: 'Arcos do grafismo, como a capa do próprio Manual de Identidade Visual' },
  { id: 'panel', label: 'Painel verde', description: 'Título em painel verde e faixas diagonais (apresentação, MIV p. 57)' },
  { id: 'invite', label: 'Convite', description: 'Faixa vertical verde com bloco laranja à esquerda (convite, MIV p. 55)' },
  { id: 'envelope', label: 'Envelope', description: 'Faixa inclinada com pé laranja (verso do envelope, MIV p. 38)' },
  { id: 'fan', label: 'Leque', description: 'Elemento base do grafismo: raios em leque (MIV p. 26)' },
  { id: 'solid', label: 'Verde pleno', description: 'Degradê verde → água-marinha com assinatura em negativo (MIV p. 117)', dark: true },
  { id: 'minimal', label: 'Minimalista', description: 'Branco, com a faixa do papel timbrado no pé' },
  { id: 'none', label: 'Sem capa', description: 'O documento começa direto no conteúdo' },
];

export const BACK_COVERS = [
  { id: 'folder', label: 'Pasta (verso)', description: 'Faixa diagonal, endereço no rodapé (verso da pasta, MIV p. 44)' },
  { id: 'concept', label: 'Conceito', description: 'Degradê verde com assinatura e slogan do Governo (contracapa do MIV, p. 117)', dark: true },
  { id: 'solid', label: 'Verde pleno', description: 'Fundo verde com assinatura e endereço centralizados', dark: true },
  { id: 'fan', label: 'Leque', description: 'Grafismo em leque e endereço' },
  { id: 'minimal', label: 'Minimalista', description: 'Assinatura e endereço centralizados, faixa no pé' },
  { id: 'none', label: 'Sem contracapa', description: 'Termina na última página de conteúdo' },
];

export const DESIGN_OPTIONS = {
  header: [
    { value: 'classic', label: 'Texto' },
    { value: 'rule', label: 'Texto e linha' },
    { value: 'logo', label: 'Texto e assinatura' },
    { value: 'letterhead', label: 'Timbrado' },
    { value: 'none', label: 'Nenhum' },
  ],
  footer: [
    { value: 'bar', label: 'Faixa' },
    { value: 'address', label: 'Faixa e endereço' },
    { value: 'half', label: 'Meia faixa' },
    { value: 'stripe', label: 'Linha fina' },
    { value: 'none', label: 'Nenhum' },
  ],
  pageNumber: [
    { value: 'circle', label: 'Círculo' },
    { value: 'text', label: 'Página X de Y' },
    { value: 'none', label: 'Sem número' },
  ],
  sectionStyle: [
    { value: 'kicker', label: 'Chamada e linha' },
    { value: 'number', label: 'Número grande' },
    { value: 'band', label: 'Faixa' },
  ],
  cardStyle: [
    { value: 'soft', label: 'Preenchido' },
    { value: 'outline', label: 'Contorno' },
    { value: 'top', label: 'Barra superior' },
  ],
  bodyFont: [
    { value: 'maitree', label: 'Maitree (serifada)' },
    { value: 'kanit', label: 'Kanit (sem serifa)' },
  ],
  density: [
    { value: 'compact', label: 'Compacta' },
    { value: 'regular', label: 'Padrão' },
    { value: 'airy', label: 'Arejada' },
  ],
  // Assinaturas conjuntas seguem o MIV (p. 16–18): órgão à esquerda, Governo sempre à direita.
  signature: [
    { value: 'joint', label: 'DETRAN/CE + Governo do Ceará (Infraestrutura)' },
    { value: 'seinfra', label: 'Governo do Ceará + Secretaria da Infraestrutura' },
    { value: 'state', label: 'Somente Governo do Ceará' },
    { value: 'custom', label: 'Logo próprio + Governo do Ceará' },
    { value: 'none', label: 'Sem assinatura' },
  ],
};

export const DEFAULT_DESIGN = Object.freeze({
  theme: 'green',
  cover: 'folder',
  backCover: 'folder',
  header: 'classic',
  footer: 'bar',
  pageNumber: 'circle',
  sectionStyle: 'kicker',
  cardStyle: 'soft',
  bodyFont: 'maitree',
  density: 'regular',
  signature: 'joint',
  customLogo: '',
  numberSections: true,
  countCover: true,
});

/** Combinações prontas de design (aplicam só a aparência, nunca o conteúdo). */
export const DESIGN_PRESETS = [
  {
    id: 'manual', label: 'Manual institucional', description: 'O visual dos manuais oficiais',
    design: { theme: 'green', cover: 'folder', backCover: 'folder', header: 'classic', footer: 'bar', pageNumber: 'circle', sectionStyle: 'kicker', cardStyle: 'soft' },
  },
  {
    id: 'guide', label: 'Guia rápido', description: 'Leve, direto e arejado',
    design: { theme: 'teal', cover: 'envelope', backCover: 'minimal', header: 'rule', footer: 'stripe', pageNumber: 'circle', sectionStyle: 'band', cardStyle: 'top' },
  },
  {
    id: 'report', label: 'Relatório executivo', description: 'Sóbrio, com números em evidência',
    design: { theme: 'navy', cover: 'identity', backCover: 'solid', header: 'logo', footer: 'bar', pageNumber: 'text', sectionStyle: 'number', cardStyle: 'outline' },
  },
  {
    id: 'campaign', label: 'Campanha', description: 'Cores fortes e capa de impacto',
    design: { theme: 'orange', cover: 'solid', backCover: 'fan', header: 'rule', footer: 'half', pageNumber: 'circle', sectionStyle: 'band', cardStyle: 'soft' },
  },
  {
    id: 'notice', label: 'Papel timbrado', description: 'Assinatura centralizada, endereço e faixa no pé (MIV p. 34)',
    design: { theme: 'green', cover: 'none', backCover: 'none', header: 'letterhead', footer: 'address', pageNumber: 'text', sectionStyle: 'kicker', cardStyle: 'outline' },
  },
  {
    id: 'miv', label: 'Identidade do MIV', description: 'Capa em arcos e meia faixa, como o próprio manual',
    design: { theme: 'green', cover: 'identity', backCover: 'concept', header: 'rule', footer: 'half', pageNumber: 'circle', sectionStyle: 'kicker', cardStyle: 'soft' },
  },
  {
    id: 'panel', label: 'Apresentação', description: 'Painel verde na capa, ideal para projetos',
    design: { theme: 'green', cover: 'panel', backCover: 'concept', header: 'rule', footer: 'half', pageNumber: 'circle', sectionStyle: 'band', cardStyle: 'top' },
  },
  {
    id: 'event', label: 'Evento', description: 'Capa de convite, leve e direta',
    design: { theme: 'teal', cover: 'invite', backCover: 'minimal', header: 'classic', footer: 'bar', pageNumber: 'circle', sectionStyle: 'number', cardStyle: 'outline' },
  },
  {
    id: 'sertao', label: 'Sol do sertão', description: 'Amarelo-ouro com leque',
    design: { theme: 'gold', cover: 'fan', backCover: 'fan', header: 'classic', footer: 'bar', pageNumber: 'circle', sectionStyle: 'number', cardStyle: 'top' },
  },
];

const VALID = {
  theme: THEMES.map((t) => t.id),
  cover: COVERS.map((c) => c.id),
  backCover: BACK_COVERS.map((c) => c.id),
  ...Object.fromEntries(Object.entries(DESIGN_OPTIONS).map(([key, options]) => [key, options.map((o) => o.value)])),
};

export function normalizeDesign(raw = {}) {
  const design = { ...DEFAULT_DESIGN };
  for (const [key, allowed] of Object.entries(VALID)) {
    if (allowed.includes(raw[key])) design[key] = raw[key];
  }
  for (const key of ['numberSections', 'countCover']) {
    if (typeof raw[key] === 'boolean') design[key] = raw[key];
  }
  design.customLogo = typeof raw.customLogo === 'string' ? raw.customLogo.slice(0, 64) : '';
  return design;
}

/** Atributos aplicados ao contêiner .doc (prévia, medição e miniaturas). */
export function docAttributes(design) {
  return {
    'data-doc-theme': design.theme,
    'data-section-style': design.sectionStyle,
    'data-card-style': design.cardStyle,
    'data-body-font': design.bodyFont,
    'data-density': design.density,
  };
}

export function applyDocAttributes(element, design) {
  for (const [name, value] of Object.entries(docAttributes(design))) element.setAttribute(name, value);
}

export function docAttributesHtml(design) {
  return Object.entries(docAttributes(design)).map(([name, value]) => `${name}="${value}"`).join(' ');
}

/* ------------------------------------------------------------------ textos fixos */
export const META_GROUPS = [
  {
    title: 'Capa',
    fields: [
      { key: 'kicker', kind: 'text', label: 'Chamada (acima do título)' },
      { key: 'title', kind: 'lines', label: 'Título', rows: 2, hint: 'Use Enter para quebrar a linha.' },
      { key: 'subtitle', kind: 'text', label: 'Subtítulo' },
      { key: 'description', kind: 'text', label: 'Linha de apoio' },
      { key: 'audienceLabel', kind: 'text', label: 'Rótulo do público', placeholder: 'Ex.: Para' },
      { key: 'audience', kind: 'lines', label: 'Público', rows: 2 },
      { key: 'version', kind: 'text', label: 'Versão e data' },
    ],
  },
  {
    title: 'Cabeçalho das páginas',
    fields: [
      { key: 'headerTitle', kind: 'text', label: 'Título (em destaque)' },
      { key: 'headerSubtitle', kind: 'text', label: 'Complemento (em cor)' },
      { key: 'headerRight', kind: 'text', label: 'Texto à direita' },
    ],
  },
  {
    title: 'Contracapa',
    fields: [
      { key: 'backTitle', kind: 'text', label: 'Nome do órgão' },
      { key: 'backText', kind: 'lines', label: 'Endereço e contatos', rows: 3 },
    ],
  },
];

export const DEFAULT_META = Object.freeze({
  kicker: 'DETRAN/CE · Diretoria de Veículos',
  title: 'Título do\nDocumento',
  subtitle: 'Subtítulo do documento',
  description: 'Linha de apoio · Sistema · Assunto',
  audienceLabel: 'Para',
  audience: 'Público a quem\no documento se destina',
  version: `Versão 1.0 · ${monthYear()}`,
  headerTitle: 'Título do Documento',
  headerSubtitle: 'Subtítulo',
  headerRight: 'DETRAN/CE · Diretoria de Veículos',
  backTitle: 'Departamento Estadual de Trânsito do Ceará',
  backText: 'Av. Godofredo Maciel, 2900 · Maraponga\nCEP: 60710-903 · Fortaleza-Ceará\nFone: (85) 3195.2300',
});

export function normalizeMeta(raw = {}) {
  const meta = { ...DEFAULT_META };
  for (const key of Object.keys(DEFAULT_META)) {
    if (typeof raw[key] === 'string') meta[key] = raw[key].slice(0, 600);
  }
  return meta;
}
