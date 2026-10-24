/**
 * The formatting toolbar's edit arithmetic (report 7). Every command is a pure
 * function of the text and the current selection, so the caret can be restored
 * after the textarea re-renders and the behaviour is unit tested without a DOM.
 *
 * Line commands replace the marker a line already carries, so pressing H1 twice
 * never produces `# # Title`; inline commands wrap the selection, or insert a
 * selected `text` placeholder when there is nothing to wrap, and unwrap when the
 * markers already surround the selection.
 */

export type MarkdownCommand = 'h1' | 'h2' | 'bold' | 'italic' | 'underline' | 'bullet' | 'number';

export interface MarkdownEdit {
  value: string;
  selectionStart: number;
  selectionEnd: number;
}

interface LineRange {
  start: number;
  end: number;
  text: string;
}

/** The lines touched by the selection, including the line holding `end`. */
function selectedLines(value: string, start: number, end: number): LineRange[] {
  const blockStart = value.lastIndexOf('\n', Math.max(0, start - 1)) + 1;
  const newline = value.indexOf('\n', end);
  const blockEnd = newline === -1 ? value.length : newline;
  let cursor = blockStart;

  return value
    .slice(blockStart, blockEnd)
    .split('\n')
    .map((text) => {
      const line = { start: cursor, end: cursor + text.length, text };
      cursor = line.end + 1;
      return line;
    });
}

const HEADING = /^\s*#{1,3}\s+/;
const BULLET = /^\s*[-*]\s+/;
const NUMBER = /^\s*\d+[.)]\s+/;

function replaceLinePrefix(text: string, pattern: RegExp, prefix: string): string {
  const stripped = text.replace(pattern, '');
  return `${prefix}${stripped}`;
}

function styleLines(value: string, start: number, end: number, command: MarkdownCommand): MarkdownEdit {
  const lines = selectedLines(value, start, end);
  let offset = 0;
  let next = value;
  let firstStart = start;
  let lastEnd = end;

  lines.forEach((line, index) => {
    const marker =
      command === 'h1' ? '# ' : command === 'h2' ? '## ' : command === 'bullet' ? '- ' : `${index + 1}. `;
    const isHeading = command === 'h1' || command === 'h2';
    const pattern = isHeading ? HEADING : command === 'bullet' ? BULLET : NUMBER;

    // A command replaces whatever marker the line already carries.
    const base = isHeading
      ? line.text.replace(NUMBER, '').replace(BULLET, '')
      : line.text.replace(HEADING, '').replace(command === 'bullet' ? NUMBER : BULLET, '');
    const updated = replaceLinePrefix(base, pattern, marker);
    const delta = updated.length - line.text.length;

    next = next.slice(0, line.start + offset) + updated + next.slice(line.end + offset);

    if (index === 0) firstStart = line.start;
    lastEnd = line.end + offset + updated.length;
    offset += delta;
  });

  return { value: next, selectionStart: firstStart, selectionEnd: lastEnd };
}

function wrapInline(
  value: string,
  start: number,
  end: number,
  marker: string,
  placeholder: string,
): MarkdownEdit {
  const selected = value.slice(start, end);

  if (selected === '') {
    const text = placeholder;
    return {
      value: `${value.slice(0, start)}${marker}${text}${marker}${value.slice(end)}`,
      selectionStart: start + marker.length,
      selectionEnd: start + marker.length + text.length,
    };
  }

  const before = value.slice(Math.max(0, start - marker.length), start);
  const after = value.slice(end, end + marker.length);

  // Pressing the same command on already-wrapped text unwraps it.
  if (before === marker && after === marker) {
    return {
      value:
        value.slice(0, start - marker.length) + selected + value.slice(end + marker.length),
      selectionStart: start - marker.length,
      selectionEnd: end - marker.length,
    };
  }

  return {
    value: `${value.slice(0, start)}${marker}${selected}${marker}${value.slice(end)}`,
    selectionStart: start + marker.length,
    selectionEnd: end + marker.length,
  };
}

export function applyMarkdown(
  command: MarkdownCommand,
  value: string,
  start: number,
  end: number,
): MarkdownEdit {
  const from = Math.min(start, end);
  const to = Math.max(start, end);

  switch (command) {
    case 'h1':
    case 'h2':
    case 'bullet':
    case 'number':
      return styleLines(value, from, to, command);
    case 'bold':
      return wrapInline(value, from, to, '**', 'bold text');
    case 'italic':
      return wrapInline(value, from, to, '*', 'italic text');
    case 'underline':
      return wrapInline(value, from, to, '__', 'underlined text');
    default:
      return { value, selectionStart: from, selectionEnd: to };
  }
}
