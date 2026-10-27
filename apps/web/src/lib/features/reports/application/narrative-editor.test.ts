import { describe, expect, it } from 'vitest';

import { parseNarrative } from '@par/shared';

import { narrativeFromEditor, type EditorNode } from './narrative-editor';

const ELEMENT = 1;
const TEXT = 3;

function text(value: string): EditorNode {
  return { nodeType: TEXT, nodeName: '#text', textContent: value, childNodes: [] };
}

function element(
  nodeName: string,
  children: EditorNode[],
  style?: EditorNode['style'],
): EditorNode {
  return { nodeType: ELEMENT, nodeName, textContent: null, childNodes: children, style };
}

function surface(...children: EditorNode[]): EditorNode {
  return element('DIV', children);
}

describe('narrativeFromEditor', () => {
  it('separates typed paragraphs with a blank line', () => {
    expect(
      narrativeFromEditor(surface(element('P', [text('First')]), element('P', [text('Second')]))),
    ).toBe('First\n\nSecond');
  });

  it('keeps a line break inside one paragraph', () => {
    const line = element('P', [text('One'), element('BR', []), text('Two')]);

    expect(narrativeFromEditor(surface(line))).toBe('One\nTwo');
  });

  it('writes headings at the level the surface shows', () => {
    const blocks = surface(
      element('H3', [text('Summary')]),
      element('H4', [text('Detail')]),
      element('H5', [text('Note')]),
    );

    expect(narrativeFromEditor(blocks)).toBe('# Summary\n\n## Detail\n\n### Note');
  });

  it('writes both list kinds', () => {
    const blocks = surface(
      element('UL', [element('LI', [text('one')]), element('LI', [text('two')])]),
      element('OL', [element('LI', [text('first')]), element('LI', [text('second')])]),
    );

    expect(narrativeFromEditor(blocks)).toBe('- one\n- two\n\n1. first\n2. second');
  });

  it('keeps bold, italic, and underline applied to a selection', () => {
    const paragraph = element('P', [
      element('STRONG', [text('bold')]),
      text(' and '),
      element('EM', [text('soft')]),
      text(' and '),
      element('U', [text('drawn')]),
    ]);

    expect(narrativeFromEditor(surface(paragraph))).toBe('**bold** and *soft* and __drawn__');
  });

  it('keeps one marker when styles are nested, because the parser reads one', () => {
    const paragraph = element('P', [element('STRONG', [element('EM', [text('both')])])]);

    expect(narrativeFromEditor(surface(paragraph))).toBe('**both**');
  });

  it('leaves a space outside the marker so the parser keeps the emphasis', () => {
    const paragraph = element('P', [text('a '), element('STRONG', [text('wide')]), text(' cut')]);

    expect(narrativeFromEditor(surface(paragraph))).toBe('a **wide** cut');
  });

  it('drops the empty blocks a browser leaves behind', () => {
    const blocks = surface(
      element('BR', []),
      element('P', [element('BR', [])]),
      element('P', [text('   ')]),
      element('P', [text('Kept')]),
    );

    expect(narrativeFromEditor(blocks)).toBe('Kept');
  });

  it('reads a surface the browser nested inside one container', () => {
    const blocks = surface(
      element('DIV', [element('P', [text('Outer')]), element('P', [text('Inner')])]),
    );

    expect(narrativeFromEditor(blocks)).toBe('Outer\n\nInner');
  });

  it('produces text the shared parser reads back as the same blocks', () => {
    const blocks = surface(
      element('H3', [text('Summary')]),
      element('P', [element('STRONG', [text('Shoreline')]), text(' was cleaned.')]),
      element('OL', [element('LI', [text('Plan')]), element('LI', [text('Report')])]),
    );

    expect(parseNarrative(narrativeFromEditor(blocks))).toMatchObject([
      { kind: 'heading', level: 1 },
      { kind: 'paragraph' },
      { kind: 'list', ordered: true },
    ]);
  });
});
