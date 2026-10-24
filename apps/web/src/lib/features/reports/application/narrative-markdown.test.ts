import { describe, expect, it } from 'vitest';

import { applyMarkdown } from './narrative-markdown';

function edit(
  command: Parameters<typeof applyMarkdown>[0],
  value: string,
  start = value.length,
  end = start,
) {
  return applyMarkdown(command, value, start, end);
}

describe('applyMarkdown line commands', () => {
  it('turns a line into a heading and selects it', () => {
    const result = edit('h1', 'Coastal cleanup', 0, 4);

    expect(result.value).toBe('# Coastal cleanup');
    expect(result.value.slice(result.selectionStart, result.selectionEnd)).toBe(
      '# Coastal cleanup',
    );
  });

  it('replaces an existing heading rather than stacking one', () => {
    expect(edit('h2', '# Title', 0, 0).value).toBe('## Title');
    expect(edit('h1', '## Title', 0, 0).value).toBe('# Title');
  });

  it('prefixes every selected line', () => {
    const value = 'one\ntwo\nthree';
    const result = applyMarkdown('bullet', value, 1, 5);

    expect(result.value).toBe('- one\n- two\nthree');
  });

  it('numbers selected lines from one and replaces a bullet', () => {
    expect(applyMarkdown('number', '- one\n- two', 0, 9).value).toBe('1. one\n2. two');
  });

  it('converts a numbered line to a heading without leaving the number', () => {
    expect(edit('h2', '1. Step one', 0, 0).value).toBe('## Step one');
  });
});

describe('applyMarkdown inline commands', () => {
  it('wraps the selection and keeps it selected', () => {
    const value = 'A bold word';
    const result = applyMarkdown('bold', value, 2, 6);

    expect(result.value).toBe('A **bold** word');
    expect(result.value.slice(result.selectionStart, result.selectionEnd)).toBe('bold');
  });

  it('inserts a selected placeholder when nothing is selected', () => {
    const result = edit('italic', '', 0);

    expect(result.value).toBe('*italic text*');
    expect(result.value.slice(result.selectionStart, result.selectionEnd)).toBe('italic text');
  });

  it('unwraps text that already carries the markers', () => {
    expect(applyMarkdown('bold', 'A **bold** word', 4, 8).value).toBe('A bold word');
  });

  it('uses the underline marker', () => {
    expect(applyMarkdown('underline', 'x', 0, 1).value).toBe('__x__');
  });

  it('treats a reversed selection as the same range', () => {
    expect(applyMarkdown('bold', 'word', 4, 0).value).toBe('**word**');
  });
});
