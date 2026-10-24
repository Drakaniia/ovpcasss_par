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
        pushSpan(
          spans,
          span(inner, {
            bold: Boolean(marker.bold),
            italic: Boolean(marker.italic),
            underline: Boolean(marker.underline),
          }),
        );
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

/** The formatting toolbar's commands (report 7). */
export type MarkdownCommand = 'h1' | 'h2' | 'bold' | 'italic' | 'underline' | 'bullet' | 'number';

/** The text and the selection a command leaves behind. */
export interface MarkdownEdit {
  value: string;
  selectionStart: number;
  selectionEnd: number;
}

type InlineCommand = 'bold' | 'italic' | 'underline';

/** Command → the markers it wraps a selection in, and its placeholder. */
const INLINE: Record<InlineCommand, { marker: string; placeholder: string }> = {
  bold: { marker: '**', placeholder: 'bold text' },
  italic: { marker: '*', placeholder: 'italic text' },
  underline: { marker: '__', placeholder: 'underlined text' },
};

/** Any prefix a line may already carry, so a command replaces instead of stacks. */
const LINE_PREFIX = /^\s*(?:#{1,3}\s+|[-*]\s+|\d+[.)]\s+)?/;

function stripPrefix(line: string): string {
  return line.replace(LINE_PREFIX, '');
}

function applyInline(
  command: InlineCommand,
  value: string,
  start: number,
  end: number,
): MarkdownEdit {
  const { marker, placeholder } = INLINE[command];
  const selected = value.slice(start, end);

  /* Already wrapped around the selection, or the selection carries the markers:
     the same command unwraps, so the button toggles. */
  const wrappedOutside =
    value.slice(Math.max(0, start - marker.length), start) === marker &&
    value.slice(end, end + marker.length) === marker;

  if (wrappedOutside) {
    return {
      value: value.slice(0, start - marker.length) + selected + value.slice(end + marker.length),
      selectionStart: start - marker.length,
      selectionEnd: end - marker.length,
    };
  }

  if (
    selected.length > marker.length * 2 &&
    selected.startsWith(marker) &&
    selected.endsWith(marker)
  ) {
    const inner = selected.slice(marker.length, -marker.length);
    return {
      value: value.slice(0, start) + inner + value.slice(end),
      selectionStart: start,
      selectionEnd: start + inner.length,
    };
  }

  const text = selected === '' ? placeholder : selected;
  const from = start + marker.length;

  return {
    value: value.slice(0, start) + marker + text + marker + value.slice(end),
    selectionStart: from,
    selectionEnd: from + text.length,
  };
}

/**
 * The formatting toolbar's edit arithmetic: given the command, the whole text,
 * and the textarea's selection, returns the new text and where to put the caret
 * so the writer can keep typing. Selection order never matters.
 */
export function applyMarkdown(
  command: MarkdownCommand,
  value: string,
  selectionStart: number,
  selectionEnd: number,
): MarkdownEdit {
  const start = Math.min(selectionStart, selectionEnd);
  const end = Math.max(selectionStart, selectionEnd);

  if (command === 'bold' || command === 'italic' || command === 'underline') {
    return applyInline(command, value, start, end);
  }

  const lines = value.split('\n');
  const starts: number[] = [];
  let offset = 0;
  for (const line of lines) {
    starts.push(offset);
    offset += line.length + 1;
  }

  // A line the selection touches, including the one the caret sits in.
  const touched = lines
    .map((line, index) => ({ index, line, from: starts[index] ?? 0 }))
    .filter(({ line, from }) => from <= end && from + line.length >= start);

  const heading = command === 'h1' ? '# ' : command === 'h2' ? '## ' : null;
  let number = 0;

  for (const entry of touched) {
    const prefix = heading ?? `${command === 'number' ? `${(number += 1)}.` : '-'} `;
    lines[entry.index] = prefix + stripPrefix(entry.line);
  }

  const first = touched[0];
  if (!first) return { value, selectionStart: start, selectionEnd: end };

  // The selection covers the rewritten block so the writer sees the result.
  const before = starts[first.index] ?? 0;
  const block = lines.slice(first.index, first.index + touched.length).join('\n').length;

  return {
    value: lines.join('\n'),
    selectionStart: before,
    selectionEnd: before + block,
  };
}

/** The Markdown markers removed, for a plain-text surface with its own layout. */
export function narrativeToPlainText(source: string): string {
  return parseNarrative(source)
    .map((block) => {
      if (block.kind === 'heading') return block.spans.map((entry) => entry.text).join('');

      if (block.kind === 'list') {
        return block.items
          .map(
            (item, index) =>
              `${block.ordered ? `${index + 1}.` : '\u2022'} ${item.map((entry) => entry.text).join('')}`,
          )
          .join('\n');
      }

      return block.lines.map((line) => line.map((entry) => entry.text).join('')).join('\n');
    })
    .join('\n\n');
}
