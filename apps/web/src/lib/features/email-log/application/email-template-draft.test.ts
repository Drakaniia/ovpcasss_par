import { describe, expect, it } from 'vitest';

import type { EmailTemplateCopy } from '@par/shared';

import {
  branchIndex,
  draftFrom,
  insertTokenAt,
  issueFor,
  sameCopy,
  subjectRemaining,
  tokenExample,
} from './email-template-draft';

const copy: EmailTemplateCopy = {
  subject: 'A subject',
  heading: 'A heading',
  greeting: 'Good day.',
  intro: [
    { text: 'Always shown.', when: null },
    { text: 'When new.', when: 'newAccount' },
  ],
  facts: null,
  quote: null,
  action: null,
  footer: { enabled: true, reference: '', note: '', replyNotice: true },
};

describe('insertTokenAt', () => {
  it('replaces the selection with the token and leaves the caret after it', () => {
    const result = insertTokenAt('Hello world', 'referenceNo', 6, 11);

    expect(result.value).toBe('Hello {{referenceNo}}');
    expect(result.caret).toBe('Hello {{referenceNo}}'.length);
  });

  it('inserts at the caret when nothing is selected', () => {
    const result = insertTokenAt('AR No. ', 'title', 7, 7);

    expect(result.value).toBe('AR No. {{title}}');
    expect(result.caret).toBe(16);
  });

  it('clamps a stale selection to the current value', () => {
    const result = insertTokenAt('Short', 'count', 99, 120);

    expect(result.value).toBe('Short{{count}}');
    expect(result.caret).toBe('Short{{count}}'.length);
  });
});

describe('draft helpers', () => {
  it('counts the characters left under the office tag', () => {
    expect(subjectRemaining('')).toBe(63);
    expect(subjectRemaining('abc')).toBe(60);
    expect(subjectRemaining('a'.repeat(70))).toBe(-7);
  });

  it('finds the issue for a field or its parent', () => {
    const issues = [
      { path: 'intro', message: 'Add the paragraph for this case.' },
      { path: 'subject', message: 'This message needs {{referenceNo}}.', token: 'referenceNo' },
    ];

    // A field inside an issue path shows the message about its parent.
    expect(issueFor(issues, 'intro.1.text')).toBe('Add the paragraph for this case.');
    expect(issueFor(issues, 'subject')).toBe('This message needs {{referenceNo}}.');
    expect(issueFor(issues, 'heading')).toBeUndefined();
  });

  it('locates the paragraph a branch owns', () => {
    expect(branchIndex(copy, 'newAccount')).toBe(1);
    expect(branchIndex(copy, 'existingAccount')).toBe(-1);
  });

  it('tracks changes by value and hands out an isolated draft', () => {
    expect(sameCopy(copy, draftFrom(copy))).toBe(true);

    const draft = draftFrom(copy);
    draft.heading = 'Changed';
    expect(sameCopy(copy, draft)).toBe(false);
    expect(copy.heading).toBe('A heading');
  });

  it('keeps a token example short enough for a menu', () => {
    expect(tokenExample('AR No. 0001')).toBe('AR No. 0001');
    expect(tokenExample('a'.repeat(80))).toHaveLength(46);
  });
});
