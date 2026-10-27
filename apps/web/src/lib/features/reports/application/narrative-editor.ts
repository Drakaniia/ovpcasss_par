/**
 * The narrative editor is one formatted surface: the person types into the page
 * they will submit, and no Markdown markers are ever typed or shown. The record
 * still stores the Markdown subset `@par/shared` parses, because the read-only
 * record, the print sheet, the facsimile, and the PDF writers all read that same
 * text. This module is the only place the surface's formatted DOM is turned back
 * into that text.
 */

/** The formatting toolbar's commands; they apply to the surface, not to text. */
export type NarrativeCommand = 'h1' | 'h2' | 'bold' | 'italic' | 'underline' | 'bullet' | 'number';

/**
 * The slice of the DOM the serializer reads. Component tests build plain
 * objects, so this stays a structural shape rather than `Node` itself.
 */
export interface EditorNode {
  nodeType: number;
  nodeName: string;
  textContent: string | null;
  childNodes: ArrayLike<EditorNode>;
  style?: { fontWeight?: string; fontStyle?: string; textDecoration?: string };
}

interface Run {
  text: string;
  bold: boolean;
  italic: boolean;
  underline: boolean;
}

interface StyleFlags {
  bold: boolean;
  italic: boolean;
  underline: boolean;
}

const ELEMENT_NODE = 1;
const TEXT_NODE = 3;

/**
 * The surface renders source heading 1-3 as h3-h5 so the panel keeps the page
 * outline; anything else a browser may produce maps to the nearest level.
 */
const HEADING_LEVEL: Record<string, 1 | 2 | 3> = {
  H1: 1,
  H2: 2,
  H3: 1,
  H4: 2,
  H5: 3,
  H6: 3,
};

const BLOCK_TAGS = new Set([
  'P',
  'DIV',
  'SECTION',
  'ARTICLE',
  'BLOCKQUOTE',
  'PRE',
  'UL',
  'OL',
  'H1',
  'H2',
  'H3',
  'H4',
  'H5',
  'H6',
]);

const PLAIN: StyleFlags = { bold: false, italic: false, underline: false };

function tagOf(node: EditorNode): string {
  return (node.nodeName ?? '').toUpperCase();
}

function childrenOf(node: EditorNode): EditorNode[] {
  return Array.from(node.childNodes);
}

function isElement(node: EditorNode): boolean {
  return node.nodeType === ELEMENT_NODE;
}

function isBold(node: EditorNode): boolean {
  const tag = tagOf(node);
  const weight = Number(node.style?.fontWeight ?? '');
  return tag === 'B' || tag === 'STRONG' || node.style?.fontWeight === 'bold' || weight >= 600;
}

function isItalic(node: EditorNode): boolean {
  const tag = tagOf(node);
  return tag === 'I' || tag === 'EM' || node.style?.fontStyle === 'italic';
}

function isUnderline(node: EditorNode): boolean {
  return tagOf(node) === 'U' || /underline/.test(node.style?.textDecoration ?? '');
}

function sameFlags(left: StyleFlags, right: StyleFlags): boolean {
  return (
    left.bold === right.bold && left.italic === right.italic && left.underline === right.underline
  );
}

function collectRuns(node: EditorNode, inherited: StyleFlags, runs: Run[]): void {
  if (node.nodeType === TEXT_NODE) {
    runs.push({ text: node.textContent ?? '', ...inherited });
    return;
  }

  if (!isElement(node)) return;

  const tag = tagOf(node);
  if (tag === 'SCRIPT' || tag === 'STYLE') return;
  if (tag === 'BR') {
    runs.push({ text: '\n', ...inherited });
    return;
  }

  const flags: StyleFlags = {
    bold: inherited.bold || isBold(node),
    italic: inherited.italic || isItalic(node),
    underline: inherited.underline || isUnderline(node),
  };

  for (const child of childrenOf(node)) collectRuns(child, flags, runs);
}

/**
 * The parser accepts one style per span, so a nested emphasis keeps its
 * strongest marker instead of emitting markers inside markers.
 */
function markRun(run: Run): string {
  const marker = run.bold ? '**' : run.italic ? '*' : run.underline ? '__' : '';
  if (marker === '') return run.text;

  return run.text
    .split('\n')
    .map((part) => {
      // A marker that touches whitespace is literal to the parser, so outer
      // spaces stay outside the emphasis.
      const leading = /^\s*/.exec(part)?.[0] ?? '';
      const trailing = /\s*$/.exec(part)?.[0] ?? '';
      const core = part.slice(leading.length, part.length - trailing.length);
      return core === '' ? part : `${leading}${marker}${core}${marker}${trailing}`;
    })
    .join('\n');
}

function textOf(node: EditorNode): string {
  const runs: Run[] = [];
  for (const child of childrenOf(node)) collectRuns(child, PLAIN, runs);

  const merged: Run[] = [];
  for (const run of runs) {
    const last = merged[merged.length - 1];
    if (last && sameFlags(last, run)) last.text += run.text;
    else merged.push({ ...run });
  }

  return merged.map(markRun).join('');
}

function hasBlockChild(node: EditorNode): boolean {
  return childrenOf(node).some((child) => isElement(child) && BLOCK_TAGS.has(tagOf(child)));
}

function cleanText(value: string): string {
  return value.replace(/\u00a0/g, ' ').trim();
}

function blocksOf(node: EditorNode): string[] {
  const blocks: string[] = [];

  for (const child of childrenOf(node)) {
    if (child.nodeType === TEXT_NODE) {
      const text = cleanText(child.textContent ?? '');
      if (text !== '') blocks.push(text);
      continue;
    }

    if (!isElement(child) || tagOf(child) === 'BR') continue;

    const tag = tagOf(child);
    const level = HEADING_LEVEL[tag];

    if (level !== undefined) {
      const text = textOf(child).trim();
      if (text !== '') blocks.push(`${'#'.repeat(level)} ${text}`);
      continue;
    }

    if (tag === 'UL' || tag === 'OL') {
      const ordered = tag === 'OL';
      const items = childrenOf(child)
        .filter((item) => isElement(item) && tagOf(item) === 'LI')
        .map((item, index) => {
          const text = textOf(item).trim();
          return text === '' ? '' : `${ordered ? `${index + 1}.` : '-'} ${text}`;
        })
        .filter((item) => item !== '');

      if (items.length > 0) blocks.push(items.join('\n'));
      continue;
    }

    if (hasBlockChild(child)) {
      blocks.push(...blocksOf(child));
      continue;
    }

    const text = textOf(child).trim();
    if (text !== '') blocks.push(text);
  }

  return blocks;
}

/** The narrative text the formatted surface currently shows. */
export function narrativeFromEditor(root: EditorNode): string {
  return blocksOf(root)
    .map(cleanText)
    .filter((block) => block !== '')
    .join('\n\n');
}
