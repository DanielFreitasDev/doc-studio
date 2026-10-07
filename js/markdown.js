/**
 * Converte texto livre (Markdown simples ou texto colado do Word) em blocos.
 *
 * Regras reconhecidas:
 *   # Título            → seção          ## / ###  → subtítulo / intertítulo
 *   - item / * item / • → lista          1. item   → passo a passo (com "Título: texto")
 *   > texto             → destaque       > [!ATENÇÃO] → destaque com tipo
 *   | a | b |           → tabela         ---       → divisor
 *   /quebra             → quebra de página
 *   Pergunta? + R: ...  → pergunta e resposta
 *   demais linhas       → parágrafos (linha em branco separa parágrafos)
 */
import { createBlock } from './schema.js';

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
    const text = paragraph.join('\n').trim();
    if (text) blocks.push(createBlock('paragraph', { text, style: 'normal' }));
    paragraph = [];
  };

  while (i < lines.length) {
    const line = lines[i];
    const trimmed = line.trim();

    if (!trimmed) { flushParagraph(); i += 1; continue; }

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
      blocks.push(createBlock('callout', { tone, title, text: quoted.join('\n').trim() }));
      continue;
    }

    if (isTableRow(line)) {
      flushParagraph();
      const rows = [];
      while (i < lines.length && isTableRow(lines[i])) {
        if (!isTableSeparator(lines[i])) rows.push(splitRow(lines[i]));
        i += 1;
      }
      const [header = ['Coluna'], ...body] = rows;
      blocks.push(createBlock('table', { header, rows: body.length ? body : [header.map(() => '')] }));
      continue;
    }

    if (BULLET.test(line)) {
      flushParagraph();
      const items = [];
      while (i < lines.length && BULLET.test(lines[i])) {
        items.push(BULLET.exec(lines[i])[1].trim());
        i += 1;
      }
      blocks.push(createBlock('list', { items: items.join('\n'), style: 'bullet' }));
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
      blocks.push(createBlock('steps', { title: '', start: 1, tone: 'theme', items }));
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
      blocks.push(createBlock('faq', { items }));
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
