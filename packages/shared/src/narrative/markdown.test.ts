import { describe, expect, it } from 'vitest';

import {
  narrativeToPlainText,
  parseNarrative,
  parseNarrativeInline,
  type NarrativeInline,
} from './markdown';

function plain(line: string): string {
  return parseNarrativeInline(line)
    .map((span) => span.text)
    .join('');
}

function styles(line: string): NarrativeInline[] {
  return parseNarrativeInline(line);
}

describe('parseNarrativeInline', () => {
  it('reads bold, italic, and underline', () => {
    expect(styles('A **bold** word')).toEqual([
      { text: 'A ', bold: false, italic: false, underline: false },
      { text: 'bold', bold: true, italic: false, underline: false },
      { text: ' word', bold: false, italic: false, underline: false },
    ]);
    expect(styles('*soft*')[0]).toMatchObject({ text: 'soft', italic: true });
    expect(styles('__drawn__')[0]).toMatchObject({ text: 'drawn', underline: true });
  });

  it('keeps an unmatched marker as literal text', () => {
    expect(plain('5 * 3 = 15')).toBe('5 * 3 = 15');
    expect(plain('**unfinished')).toBe('**unfinished');
    expect(plain('a __ b __ c')).toBe('a __ b __ c');
  });

  it('merges adjacent runs with the same style', () => {
    expect(styles('**one****two**')).toHaveLength(1);
  });

  it('does not treat HTML as markup', () => {
    expect(plain('<b>not bold</b>')).toBe('<b>not bold</b>');
  });
});

describe('parseNarrative', () => {
  it('separates headings, paragraphs, and lists', () => {
    const blocks = parseNarrative('# Title\n\nFirst line\nSecond line\n\n- one\n- two\n\n1. step');

    expect(blocks.map((block) => block.kind)).toEqual(['heading', 'paragraph', 'list', 'list']);
    expect(blocks[0]).toMatchObject({ kind: 'heading', level: 1 });
    expect(blocks[1]).toMatchObject({ kind: 'paragraph' });
    expect(blocks[1]?.kind === 'paragraph' && blocks[1].lines).toHaveLength(2);
    expect(blocks[2]).toMatchObject({ kind: 'list', ordered: false });
    expect(blocks[3]).toMatchObject({ kind: 'list', ordered: true });
  });

  it('keeps blank-line-free text as one paragraph with its line breaks', () => {
    const blocks = parseNarrative('One\nTwo\nThree');
    expect(blocks).toHaveLength(1);
    expect(blocks[0]?.kind === 'paragraph' && blocks[0].lines).toHaveLength(3);
  });

  it('normalises Windows line endings', () => {
    expect(parseNarrative('# A\r\nText')).toHaveLength(2);
  });

  it('reads every heading level and rejects a fourth', () => {
    expect(parseNarrative('### Three')[0]).toMatchObject({ level: 3 });
    expect(parseNarrative('#### Four')[0]).toMatchObject({ kind: 'paragraph' });
  });

  it('does not confuse a hyphenated word with a list', () => {
    const blocks = parseNarrative('off-campus activity');
    expect(blocks[0]).toMatchObject({ kind: 'paragraph' });
  });
});

describe('narrativeToPlainText', () => {
  it('drops the markers and keeps the reading order', () => {
    const text = narrativeToPlainText(
      '# Summary\n\n**Bold** and *soft*\n\n- one\n- two\n\n1. first',
    );

    expect(text).not.toContain('#');
    expect(text).not.toContain('*');
    expect(text).toContain('Summary');
    expect(text).toContain('Bold and soft');
    expect(text).toContain('\u2022 one');
    expect(text).toContain('1. first');
  });
});
