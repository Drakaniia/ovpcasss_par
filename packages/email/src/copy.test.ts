import {
  EMAIL_KINDS,
  EMAIL_TEMPLATE_SLOTS,
  EMAIL_TEMPLATE_TOKENS,
  emailTemplateIssues,
} from '@par/shared';
import { describe, expect, it } from 'vitest';

import { EMAIL_TEMPLATE_DEFAULTS, defaultCopyFor } from './copy';
import { resolveEmailTemplate } from './resolve';
import { emailSamples, previewEmail, tokenOptionsFor } from './samples';
import { SIGNATURE_LINES } from './identity';

/**
 * The copy layer's contract: every kind has built-in words, those words pass the
 * editor's own rules, and the resolution path still produces the office's
 * message — including when the office rewrites it.
 */

describe('default copy', () => {
  it('covers every outbound kind', () => {
    expect(Object.keys(EMAIL_TEMPLATE_DEFAULTS).sort()).toEqual([...EMAIL_KINDS].sort());
    for (const kind of EMAIL_KINDS) {
      expect(EMAIL_TEMPLATE_DEFAULTS[kind].intro.length).toBeGreaterThan(0);
      expect(EMAIL_TEMPLATE_SLOTS[kind].audience).not.toBe('');
      expect(EMAIL_TEMPLATE_TOKENS[kind].length).toBeGreaterThan(0);
    }
  });

  it('passes the validation the editor applies', () => {
    for (const kind of EMAIL_KINDS) {
      expect({ kind, issues: emailTemplateIssues(kind, EMAIL_TEMPLATE_DEFAULTS[kind]) }).toEqual({
        kind,
        issues: [],
      });
    }
  });

  it('offers a token example for every token it offers', () => {
    for (const kind of EMAIL_KINDS) {
      const options = tokenOptionsFor(kind);
      expect(options.map((option) => option.token)).toEqual([...EMAIL_TEMPLATE_TOKENS[kind]]);
      for (const option of options) {
        expect(option.label).not.toBe('');
        expect(option.example).not.toBe('');
      }
    }
  });

  it('hands out a fresh copy so a caller cannot mutate the defaults', () => {
    const first = defaultCopyFor('ASSIGNED');
    first.heading = 'changed';
    expect(defaultCopyFor('ASSIGNED').heading).toBe('You are the personnel in charge');
  });

  it('renders one sample per kind with the office subject tag', () => {
    const samples = emailSamples();
    expect(samples.map((sample) => sample.kind)).toEqual([...EMAIL_KINDS]);
    for (const sample of samples) {
      expect(sample.content.subject.startsWith('[OVPCASSS PAR] ')).toBe(true);
      expect(sample.content.text).toContain(SIGNATURE_LINES[0] ?? '');
    }
  });
});

describe('resolving edited copy', () => {
  it('shows the office’s words and keeps the signature block', () => {
    const copy = defaultCopyFor('SUBMITTED');
    copy.heading = 'A narrative report needs your decision';
    copy.greeting = 'Greetings from the OVPCASSS office.';
    copy.intro = [{ text: 'Record {{referenceNo}} is waiting for review.', when: null }];
    copy.action = null;

    const content = previewEmail('SUBMITTED', copy);

    expect(content.html).toContain('A narrative report needs your decision');
    expect(content.html).toContain('Greetings from the OVPCASSS office.');
    expect(content.text).toContain('Record AR No. 0001 is waiting for review.');
    expect(content.text).not.toContain('Open the reports queue');
    expect(content.text).toContain(SIGNATURE_LINES[0] ?? '');
    expect(content.html).not.toContain('{{');
  });

  it('drops a facts row whose value the data does not carry', () => {
    const copy = defaultCopyFor('APPROVED');
    const withoutDate = resolveEmailTemplate(copy, {
      values: { referenceNo: 'AR No. 0002', title: 'Tree planting' },
      conditions: {},
    });

    expect(withoutDate.facts?.map((row) => row.label)).toEqual(['Reference', 'Activity']);
  });

  it('switches the reply line off when the office says so', () => {
    const copy = defaultCopyFor('VERIFY');
    copy.footer.replyNotice = false;
    const content = previewEmail('VERIFY', copy);
    expect(content.text).not.toContain('Replies reach the OVPCASSS office');
  });

  it('reports a missing required token instead of letting it save', () => {
    const copy = defaultCopyFor('RETURNED');
    copy.quote = { enabled: true, label: 'Comments', body: 'See the attached notes.' };

    const issues = emailTemplateIssues('RETURNED', copy);
    expect(issues).toContainEqual({
      path: 'quote.body',
      message: 'This message needs {{comments}}.',
      token: 'comments',
    });
  });

  it('reports an unknown token, an exclamation mark, and a typed link', () => {
    const copy = defaultCopyFor('APPROVED');
    copy.intro[0]!.text = 'Approved {{invented}}! See https://example.test';

    const issues = emailTemplateIssues('APPROVED', copy);
    expect(issues.some((issue) => issue.token === 'invented')).toBe(true);
    expect(issues.some((issue) => issue.message.includes('exclamation'))).toBe(true);
    expect(issues.some((issue) => issue.message.includes('button'))).toBe(true);
  });

  it('requires copy for every case a kind can show', () => {
    const copy = defaultCopyFor('RECEIPT_ISSUED');
    copy.intro = copy.intro.filter((paragraph) => paragraph.when !== 'omitted');

    const issues = emailTemplateIssues('RECEIPT_ISSUED', copy);
    expect(issues.some((issue) => issue.message.includes('too large'))).toBe(true);
  });
});
