/**
 * Converte texto livre (Markdown simples ou texto colado do Word) em blocos.
 *
 * Regras reconhecidas:
 *   # Título            → seção          ## / ###  → subtítulo / intertítulo
 *   - item / * item / • → lista          1. item   → passo a passo (com "Título: texto")
 *   > texto             → destaque       > [!ATENÇÃO] → destaque com tipo
 *   | a | b |           → tabela         ---       → divisor
 *   /quebra             → quebra de página
 *   ```título … ```     → código ou texto de tela (linhas literais)
 *   Pergunta? + R: ...  → pergunta e resposta
 *   demais linhas       → parágrafos (linha em branco separa parágrafos)
 *
 * Nada é descartado pelos limites dos blocos (20 mil caracteres por texto,
 * 60 passos, 40 perguntas, 400 linhas e 12 colunas de tabela): o excesso
 * continua em blocos seguintes do mesmo tipo.
 */
import { createBlock, BLOCK_TYPES, MAX_TEXT, TABLE_LIMITS } from './schema.js';

const ALERT_TYPES = {
  'atencao': 'warning', 'atenção': 'warning', 'warning': 'warning', 'aviso': 'warning',
  'dica': 'tip', 'tip': 'tip',
  'alerta': 'danger', 'caution': 'danger', 'cuidado': 'danger', 'importante': 'danger', 'important': 'danger',
  'sucesso': 'success', 'ok': 'success',
  'nota': 'info', 'note': 'info', 'info': 'info', 'informacao': 'info', 'informação': 'info',
};
const ALERT_TITLES = { warning: 'Atenção', tip: 'Dica', danger: 'Importante', success: 'Tudo certo', info: 'Observação' };

const isTableRow = (line) => /^\s*\|.*\|\s*$/.test(line);
const isTableSeparator = (line) => /^\s*\|?\s*:?-{2,}:?\s*(\|\s*:?-{2,}:?\s*)*\|?\s*$/.test(line);
const splitRow = (line) => line.trim().replace(/^\||\|$/g, '').split('|').map((cell) => cell.trim());
const BULLET = /^\s*(?:[-*+•▪◦‣]|–)\s+(.*)$/;
const ORDERED = /^\s*\d+[.)]\s+(.*)$/;
const ANSWER = /^\s*(?:R|Resp(?:osta)?)\s*[:.-]\s*(.*)$/i;

/** Corta um texto longo em partes de até `max` caracteres: entre linhas, entre frases ou entre palavras. */
export function chunkText(text, max = MAX_TEXT) {
  const parts = [];
  let rest = String(text ?? '').trim();
  while (rest.length > max) {
    const head = rest.slice(0, max + 1);
    const cut = [head.lastIndexOf('\n'), head.lastIndexOf('. ') + 1, head.lastIndexOf(' ')].find((index) => index > max / 2) ?? max;
    parts.push(rest.slice(0, cut).trim());
    rest = rest.slice(cut).trim();
  }
  if (rest) parts.push(rest);
  return parts;
}

const chunkList = (list, size) => Array.from({ length: Math.ceil(list.length / size) }, (_, index) => list.slice(index * size, (index + 1) * size));
const itemsLimit = (type) => BLOCK_TYPES[type].fields.find((field) => field.key === 'items').max;

/** Agrupa linhas em textos de até MAX_TEXT caracteres (uma linha longa demais é cortada em partes). */
function chunkLines(lines) {
  const groups = [[]];
  let size = 0;
  for (const line of lines.flatMap((text) => (text.length > MAX_TEXT ? chunkText(text) : [text]))) {
    if (size + line.length + 1 > MAX_TEXT && groups.at(-1).length) {
      groups.push([]);
      size = 0;
    }
    groups.at(-1).push(line);
    size += line.length + 1;
  }
  return groups.map((group) => group.join('\n'));
}

/** Tabela com colunas demais: as excedentes juntam-se à última (separadas por " · "), sem perder texto. */
function fitColumns(row) {
  const max = TABLE_LIMITS.columns;
  return row.length <= max ? row : [...row.slice(0, max - 1), row.slice(max - 1).filter(Boolean).join(' · ')];
}

/** Converte "Título: texto" (ou "**Título** texto") em { title, text }. */
function splitTitle(content) {
  const bold = /^\*\*(.+?)\*\*\s*[:.\-–]?\s*(.*)$/.exec(content);
  if (bold) return { title: bold[1], text: bold[2] };
  const colon = /^([^:]{2,80}):\s+(.*)$/.exec(content);
  if (colon) return { title: colon[1], text: colon[2] };
  return { title: content, text: '' };
}

export function markdownToBlocks(source) {
  const lines = String(source ?? '').replace(/\r\n?/g, '\n').replace(/\t/g, '    ').split('\n');
  const blocks = [];
  let paragraph = [];
  let i = 0;

  const flushParagraph = () => {
    for (const text of chunkText(paragraph.join('\n'))) blocks.push(createBlock('paragraph', { text, style: 'normal' }));
    paragraph = [];
  };

  while (i < lines.length) {
    const line = lines[i];
    const trimmed = line.trim();

    if (!trimmed) { flushParagraph(); i += 1; continue; }

    // Bloco de código entre ``` (o texto depois das crases vira o título).
    const fence = /^\s*```(.*)$/.exec(line);
    if (fence) {
      flushParagraph();
      const code = [];
      i += 1;
      while (i < lines.length && !/^\s*```\s*$/.test(lines[i])) { code.push(lines[i]); i += 1; }
      i += 1;
      chunkLines(code).forEach((text, index) => blocks.push(createBlock('code', { title: index ? '' : fence[1].trim(), text })));
      continue;
    }

    if (/^\/(quebra|pagina|página|newpage)$/i.test(trimmed) || trimmed === '\\newpage') {
      flushParagraph();
      blocks.push(createBlock('pagebreak'));
      i += 1;
      continue;
    }

    if (/^(-{3,}|\*{3,}|_{3,})$/.test(trimmed)) {
      flushParagraph();
      blocks.push(createBlock('divider', { style: 'line' }));
      i += 1;
      continue;
    }

    const heading = /^(#{1,4})\s+(.*)$/.exec(trimmed);
    if (heading) {
      flushParagraph();
      const level = heading[1].length;
      const text = heading[2].replace(/\s+#+$/, '');
      if (level === 1) {
        // "# Título | Chamada" permite definir a chamada da seção.
        const [title, kicker = ''] = text.split(/\s+\|\s+/);
        blocks.push(createBlock('section', { title, kicker, intro: '' }));
      } else {
        blocks.push(createBlock('heading', { text, level: level === 2 ? '2' : '3' }));
      }
      i += 1;
      continue;
    }

    if (trimmed.startsWith('>')) {
      flushParagraph();
      const quoted = [];
      while (i < lines.length && lines[i].trim().startsWith('>')) {
        quoted.push(lines[i].trim().replace(/^>\s?/, ''));
        i += 1;
      }
      let tone = 'info';
      let title = '';
      const alert = /^\[!\s*([^\]]+)\]\s*(.*)$/.exec(quoted[0] ?? '');
      if (alert) {
        const key = alert[1].trim().toLowerCase();
        tone = ALERT_TYPES[key] ?? 'info';
        title = alert[2] || ALERT_TITLES[tone];
        quoted.shift();
      } else {
        const bold = /^\*\*(.+?)\*\*\s*(.*)$/.exec(quoted[0] ?? '');
        if (bold) {
          title = bold[1];
          quoted[0] = bold[2];
        }
      }
      // Um destaque só com título ("> [!ATENÇÃO] Confira o CNPJ.") também vira bloco.
      const texts = chunkText(quoted.join('\n'));
      (texts.length ? texts : ['']).forEach((text, index) => blocks.push(createBlock('callout', { tone, title: index ? '' : title, text })));
      continue;
    }

    if (isTableRow(line)) {
      flushParagraph();
      const rows = [];
      while (i < lines.length && isTableRow(lines[i])) {
        if (!isTableSeparator(lines[i])) rows.push(splitRow(lines[i]));
        i += 1;
      }
      const [header = ['Coluna'], ...body] = rows.map(fitColumns);
      const parts = body.length ? chunkList(body, TABLE_LIMITS.rows) : [[header.map(() => '')]];
      for (const part of parts) blocks.push(createBlock('table', { header, rows: part }));
      continue;
    }

    if (BULLET.test(line)) {
      flushParagraph();
      const items = [];
      while (i < lines.length && BULLET.test(lines[i])) {
        items.push(BULLET.exec(lines[i])[1].trim());
        i += 1;
      }
      for (const text of chunkLines(items)) blocks.push(createBlock('list', { items: text, style: 'bullet' }));
      continue;
    }

    if (ORDERED.test(line)) {
      flushParagraph();
      const items = [];
      while (i < lines.length && (ORDERED.test(lines[i]) || (lines[i].startsWith('   ') && lines[i].trim()))) {
        if (ORDERED.test(lines[i])) {
          items.push(splitTitle(ORDERED.exec(lines[i])[1].trim()));
        } else {
          const last = items.at(-1);
          last.text = [last.text, lines[i].trim()].filter(Boolean).join(' ');
        }
        i += 1;
      }
      // Mais passos que o bloco comporta: os seguintes continuam a numeração num novo bloco.
      chunkList(items, itemsLimit('steps')).forEach((part, index) => {
        blocks.push(createBlock('steps', { title: '', start: 1 + index * itemsLimit('steps'), tone: 'theme', items: part }));
      });
      continue;
    }

    // Pergunta seguida de "R: resposta" vira pergunta e resposta.
    if (trimmed.endsWith('?') && ANSWER.test(lines[i + 1] ?? '')) {
      flushParagraph();
      const items = [];
      while (i < lines.length && lines[i].trim().endsWith('?') && ANSWER.test(lines[i + 1] ?? '')) {
        items.push({ question: lines[i].trim(), answer: ANSWER.exec(lines[i + 1])[1].trim() });
        i += 2;
        while (i < lines.length && !lines[i].trim()) i += 1;
      }
      for (const part of chunkList(items, itemsLimit('faq'))) blocks.push(createBlock('faq', { items: part }));
      continue;
    }

    paragraph.push(trimmed);
    i += 1;
  }
  flushParagraph();

  // Primeiro parágrafo logo após uma seção vira a introdução dela.
  for (let index = 0; index < blocks.length - 1; index += 1) {
    const current = blocks[index];
    const next = blocks[index + 1];
    if (current.type === 'section' && !current.intro && next.type === 'paragraph') {
      current.intro = next.text;
      blocks.splice(index + 1, 1);
    }
  }
  return blocks;
}
