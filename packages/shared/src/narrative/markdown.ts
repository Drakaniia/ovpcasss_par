/**
 * The narrative report's Markdown subset (report 7). One parser serves the
 * editor's live preview, the read-only record, the print sheet, and the PDF
 * writers, so every surface agrees about what the text means.
 *
 * Supported, deliberately small:
 *
 *   # Heading 1     ## Heading 2     ### Heading 3
 *   - item          * item           (unordered list)
 *   1. item                          (ordered list)
 *   **bold**        *italic*         __underline__
 *
 * Everything else is literal text. Raw HTML, links, images, tables, and code
 * fences are not part of the subset and never reach a renderer: the parser
 * returns an AST of text spans, never an HTML string, so no surface has to
 * sanitise what it prints. Line breaks inside a paragraph are preserved.
 */

export interface NarrativeInline {
  text: string;
  bold: boolean;
  italic: boolean;
  underline: boolean;
}

export type NarrativeBlock =
  | { kind: 'heading'; level: 1 | 2 | 3; spans: NarrativeInline[] }
  | { kind: 'paragraph'; lines: NarrativeInline[][] }
  | { kind: 'list'; ordered: boolean; items: NarrativeInline[][] };

const HEADING = /^(#{1,3})\s+(.*)$/;
const UNORDERED = /^\s*[-*]\s+(.*)$/;
const ORDERED = /^\s*\d+[.)]\s+(.*)$/;

interface Marker {
  marker: string;
  bold?: boolean;
  italic?: boolean;
  underline?: boolean;
}

/** Longest first, so `**` is never read as two italic markers. */
const MARKERS: readonly Marker[] = [
  { marker: '**', bold: true },
  { marker: '__', underline: true },
  { marker: '*', italic: true },
];

function span(text: string, style: Omit<NarrativeInline, 'text'>): NarrativeInline {
  return { text, ...style };
}

/** Appends text to the current run, merging spans that share a style. */
function pushSpan(spans: NarrativeInline[], add: NarrativeInline): void {
  if (add.text === '') return;

  const last = spans[spans.length - 1];
  if (
    last &&
    last.bold === add.bold &&
    last.italic === add.italic &&
    last.underline === add.underline
  ) {
    last.text += add.text;
    return;
  }

  spans.push(add);
}

/**
 * One pass over a line. An opening marker without a closing partner is literal,
 * so a stray asterisk in a title never swallows the rest of the paragraph.
 */
export function parseNarrativeInline(line: string): NarrativeInline[] {
  const spans: NarrativeInline[] = [];
  let text = '';
  let index = 0;

  const flush = () => {
    if (text !== '') {
      pushSpan(spans, span(text, { bold: false, italic: false, underline: false }));
      text = '';
    }
  };

  while (index < line.length) {
    const marker = MARKERS.find((candidate) => line.startsWith(candidate.marker, index));

    if (marker) {
      const start = index + marker.marker.length;
      const end = line.indexOf(marker.marker, start);

      const inner = end > start ? line.slice(start, end) : '';

      /* A delimiter touching whitespace is literal, as in Markdown: `a __ b __`
         is prose, not an underline spanning the words around it. */
      if (inner !== '' && inner.trim() === inner) {
        flush();
        pushSpan(spans, span(inner, {
          bold: Boolean(marker.bold),
          italic: Boolean(marker.italic),
          underline: Boolean(marker.underline),
        }));
        index = end + marker.marker.length;
        continue;
      }
    }

    text += line[index];
    index += 1;
  }

  flush();
  return spans;
}

/** Splits the narrative into headings, paragraphs, and lists. */
export function parseNarrative(source: string): NarrativeBlock[] {
  const lines = source.replaceAll('\r\n', '\n').replaceAll('\r', '\n').split('\n');
  const blocks: NarrativeBlock[] = [];
  let paragraph: NarrativeInline[][] = [];
  let list: { ordered: boolean; items: NarrativeInline[][] } | null = null;

  const closeParagraph = () => {
    if (paragraph.length > 0) blocks.push({ kind: 'paragraph', lines: paragraph });
    paragraph = [];
  };

  const closeList = () => {
    if (list) blocks.push({ kind: 'list', ordered: list.ordered, items: list.items });
    list = null;
  };

  for (const line of lines) {
    if (line.trim() === '') {
      closeParagraph();
      closeList();
      continue;
    }

    const heading = HEADING.exec(line);
    if (heading) {
      closeParagraph();
      closeList();
      const level = heading[1]?.length === 3 ? 3 : heading[1]?.length === 2 ? 2 : 1;
      blocks.push({
        kind: 'heading',
        level,
        spans: parseNarrativeInline(heading[2]?.trim() ?? ''),
      });
      continue;
    }

    const unordered = UNORDERED.exec(line);
    const ordered = unordered ? null : ORDERED.exec(line);

    if (unordered || ordered) {
      closeParagraph();
      const isOrdered = Boolean(ordered);
      if (list && list.ordered !== isOrdered) closeList();
      if (!list) list = { ordered: isOrdered, items: [] };
      list.items.push(parseNarrativeInline((unordered ?? ordered)?.[1]?.trim() ?? ''));
      continue;
    }

    closeList();
    paragraph.push(parseNarrativeInline(line));
  }

  closeParagraph();
  closeList();
  return blocks;
}

/** The Markdown markers removed, for a plain-text surface with its own layout. */
export function narrativeToPlainText(source: string): string {
  return parseNarrative(source)
    .map((block) => {
      if (block.kind === 'heading') return block.spans.map((entry) => entry.text).join('');

      if (block.kind === 'list') {
        return block.items
          .map((item, index) =>
            `${block.ordered ? `${index + 1}.` : '\u2022'} ${item.map((entry) => entry.text).join('')}`,
          )
          .join('\n');
      }

      return block.lines.map((line) => line.map((entry) => entry.text).join('')).join('\n');
    })
    .join('\n\n');
}
