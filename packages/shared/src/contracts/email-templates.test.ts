import { describe, expect, it } from 'vitest';

import { EMAIL_KINDS } from './email';
import {
  EMAIL_TEMPLATE_SLOTS,
  EMAIL_TEMPLATE_SUBJECT_MAX,
  EMAIL_TEMPLATE_TOKENS,
  EMAIL_TOKEN_LABELS,
} from './email-template-catalogue';
import {
  emailTemplateCopySchema,
  emailTemplateIssues,
  parseEmailTemplateCopy,
  type EmailTemplateCopy,
} from './email-templates';

/**
 * The contract the admin message editor and the API share (email message editor
 * spec §4, §6.1). A kind with no copy, a token from another message, or a save
 * that loses the tracking number must fail here, before a recipient sees it.
 */

function assignedCopy(): EmailTemplateCopy {
  return {
    subject: '{{referenceNo}} — you are the personnel in charge',
    heading: 'You are the personnel in charge',
    greeting: 'Good day.',
    intro: [
      { text: 'The office registered {{referenceNo}} for you.', when: null },
      { text: 'An account was created for this address.', when: 'newAccount' },
      { text: 'Open your dashboard to write the narrative.', when: 'existingAccount' },
    ],
    facts: {
      enabled: true,
      source: 'fixed',
      rows: [{ label: 'Reference', value: '{{referenceNo}}' }],
    },
    quote: null,
    action: {
      enabled: true,
      variants: [{ when: null, label: 'Open your dashboard', urlToken: '{{dashboardUrl}}' }],
    },
    footer: { enabled: true, reference: '{{referenceNo}}', note: '', replyNotice: true },
  };
}

function returnedCopy(): EmailTemplateCopy {
  return {
    subject: '{{referenceNo}} — narrative report returned for revision',
    heading: 'Your narrative report was returned',
    greeting: 'Good day.',
    intro: [{ text: 'The office returned {{referenceNo}} with comments.', when: null }],
    facts: {
      enabled: true,
      source: 'fixed',
      rows: [{ label: 'Reference', value: '{{referenceNo}}' }],
    },
    quote: { enabled: true, label: 'Comments from the office', body: '{{comments}}' },
    action: {
      enabled: true,
      variants: [{ when: null, label: 'Revise the narrative', urlToken: '{{dashboardUrl}}' }],
    },
    footer: { enabled: true, reference: '{{referenceNo}}', note: '', replyNotice: true },
  };
}

describe('the message catalogue', () => {
  it('has a row for every outbound kind', () => {
    expect(Object.keys(EMAIL_TEMPLATE_SLOTS).sort()).toEqual([...EMAIL_KINDS].sort());
    expect(Object.keys(EMAIL_TEMPLATE_TOKENS).sort()).toEqual([...EMAIL_KINDS].sort());
  });

  it('names an audience for every kind', () => {
    for (const kind of EMAIL_KINDS) {
      expect(EMAIL_TEMPLATE_SLOTS[kind].audience.length).toBeGreaterThan(0);
    }
  });

  it('offers only tokens that kind sends, each with a label', () => {
    for (const kind of EMAIL_KINDS) {
      const slots = EMAIL_TEMPLATE_SLOTS[kind];
      const offered = new Set<string>(EMAIL_TEMPLATE_TOKENS[kind]);
      expect(offered.size).toBe(EMAIL_TEMPLATE_TOKENS[kind].length);

      for (const token of offered) {
        expect(EMAIL_TOKEN_LABELS[token as keyof typeof EMAIL_TOKEN_LABELS]).toBeTruthy();
      }
      for (const token of slots.actionTokens) {
        expect(offered.has(token)).toBe(true);
      }
      for (const requirement of slots.required) {
        expect(offered.has(requirement.token)).toBe(true);
      }
    }
  });

  it('gives each branch a unique key', () => {
    for (const kind of EMAIL_KINDS) {
      const keys = EMAIL_TEMPLATE_SLOTS[kind].branches.map((branch) => branch.key);
      expect(new Set(keys).size).toBe(keys.length);
    }
  });
});

describe('copy validation', () => {
  it('accepts a complete copy', () => {
    expect(emailTemplateIssues('ASSIGNED', assignedCopy())).toEqual([]);
  });

  it('refuses a subject longer than the tag leaves room for', () => {
    const copy = assignedCopy();
    copy.subject = 'a'.repeat(EMAIL_TEMPLATE_SUBJECT_MAX + 1);

    expect(emailTemplateCopySchema.safeParse(copy).success).toBe(false);
  });

  it('refuses a truncation that drops the tracking number', () => {
    const copy = assignedCopy();
    copy.subject = 'You are the personnel in charge';

    expect(emailTemplateIssues('ASSIGNED', copy)).toContainEqual({
      path: 'subject',
      message: 'This message needs {{referenceNo}}.',
      token: 'referenceNo',
    });
  });

  it('refuses a token the kind does not send', () => {
    const copy = assignedCopy();
    copy.heading = 'Report {{comments}}';

    expect(emailTemplateIssues('ASSIGNED', copy)).toContainEqual({
      path: 'heading',
      message: '{{comments}} is not available in this message.',
      token: 'comments',
    });
  });

  it('refuses an exclamation mark and a typed link', () => {
    const copy = assignedCopy();
    copy.intro[0]!.text = 'The report is ready! See https://example.test';

    const issues = emailTemplateIssues('ASSIGNED', copy);
    expect(issues.some((issue) => issue.message.includes('exclamation'))).toBe(true);
    expect(issues.some((issue) => issue.message.includes('button'))).toBe(true);
  });

  it('refuses a hand-typed facts value instead of one token', () => {
    const copy = assignedCopy();
    copy.facts!.rows[0]!.value = 'AR No. 0001';

    expect(emailTemplateIssues('ASSIGNED', copy)).toContainEqual({
      path: 'facts.0.value',
      message: 'Choose one value for this row.',
    });
  });

  it('requires the quote to carry the office comment', () => {
    const copy = returnedCopy();
    copy.quote = { enabled: true, label: 'Comments', body: 'See the attached notes.' };

    expect(emailTemplateIssues('RETURNED', copy)).toContainEqual({
      path: 'quote.body',
      message: 'This message needs {{comments}}.',
      token: 'comments',
    });
  });

  it('does not require the quote token when the block is switched off', () => {
    const copy = returnedCopy();
    copy.quote = { enabled: false, label: 'Comments', body: 'See the attached notes.' };

    expect(emailTemplateIssues('RETURNED', copy).some((issue) => issue.path === 'quote.body')).toBe(
      false,
    );
  });

  it('requires the corrected fields when the record-edited facts block is shown', () => {
    const copy = returnedCopy();
    copy.subject = '{{referenceNo}} — activity details corrected';
    copy.quote = { enabled: true, label: 'Reason for the correction', body: '{{reason}}' };
    copy.facts!.rows = [{ label: 'Reference', value: '{{referenceNo}}' }];

    expect(emailTemplateIssues('RECORD_EDITED', copy)).toContainEqual({
      path: 'facts',
      message: 'This message needs {{changedFields}}.',
      token: 'changedFields',
    });
  });

  it('requires copy for every case the kind can show', () => {
    const copy = assignedCopy();
    copy.intro = copy.intro.filter((paragraph) => paragraph.when !== 'existingAccount');

    expect(emailTemplateIssues('ASSIGNED', copy)).toContainEqual({
      path: 'intro',
      message: 'Add the paragraph for “When the recipient already has an account”.',
    });
  });

  it('refuses a link token the button does not carry', () => {
    const copy = assignedCopy();
    copy.action!.variants[0]!.urlToken = '{{verifyUrl}}';

    expect(emailTemplateIssues('ASSIGNED', copy)).toContainEqual({
      path: 'action.0.urlToken',
      message: 'Choose a link for this button.',
    });
  });

  it('reports an unreadable stored row instead of throwing', () => {
    const parsed = parseEmailTemplateCopy('ASSIGNED', { subject: 42 });

    expect(parsed.success).toBe(false);
    expect(parsed.issues.length).toBeGreaterThan(0);
  });

  it('returns a parsed copy and its issues separately', () => {
    const copy = assignedCopy();
    copy.heading = 'You are the personnel in charge!';

    const parsed = parseEmailTemplateCopy('ASSIGNED', copy);

    expect(parsed.success).toBe(true);
    if (parsed.success) {
      expect(parsed.copy.heading).toBe('You are the personnel in charge!');
      expect(parsed.issues.some((issue) => issue.message.includes('exclamation'))).toBe(true);
    }
  });
});

function workbookCopy(): EmailTemplateCopy {
  return {
    subject: 'Monitoring workbook, {{sheet}}, SY {{schoolYear}}, {{term}}',
    heading: 'The monitoring workbook is attached',
    greeting: 'Good day.',
    intro: [
      { text: 'The monitoring workbook for {{termAndYear}} is attached.', when: null },
      { text: '{{note}}', when: 'hasNote' },
      { text: 'The file is large, so it is not attached.', when: 'attachmentOmitted' },
    ],
    facts: {
      enabled: true,
      source: 'fixed',
      rows: [
        { label: 'Sheet', value: '{{sheet}}' },
        { label: 'Reports included', value: '{{reportCount}}' },
      ],
    },
    quote: null,
    action: null,
    footer: {
      enabled: true,
      reference: 'Monitoring workbook, SY {{schoolYear}}',
      note: '',
      replyNotice: true,
    },
  };
}

describe('kinds without a tracking number', () => {
  it('requires the workbook subject to name its sheet', () => {
    const copy = workbookCopy();
    expect(emailTemplateIssues('WORKBOOK', copy)).toEqual([]);

    copy.subject = 'Monitoring workbook, SY {{schoolYear}}, {{term}}';
    expect(emailTemplateIssues('WORKBOOK', copy)).toContainEqual({
      path: 'subject',
      message: 'This message needs {{sheet}}.',
      token: 'sheet',
    });
  });

  it('requires the workbook to say how many reports it covers', () => {
    const copy = workbookCopy();
    copy.facts!.rows = copy.facts!.rows.filter((row) => row.value !== '{{reportCount}}');

    expect(emailTemplateIssues('WORKBOOK', copy)).toContainEqual({
      path: 'facts',
      message: 'This message needs {{reportCount}}.',
      token: 'reportCount',
    });
  });

  it('drops the facts requirement when the block is switched off', () => {
    const copy = workbookCopy();
    copy.facts!.enabled = false;
    copy.facts!.rows = [];

    expect(emailTemplateIssues('WORKBOOK', copy)).toEqual([]);
  });

  it('requires the digest body to carry the number', () => {
    const copy: EmailTemplateCopy = {
      subject: '{{count}} {{messageNoun}} could not be delivered',
      heading: 'Some mail could not be delivered',
      greeting: 'Good day.',
      intro: [{ text: 'Some mail could not be delivered.', when: null }],
      facts: { enabled: true, source: 'failures', rows: [] },
      quote: null,
      action: {
        enabled: true,
        variants: [{ when: null, label: 'Open the email log', urlToken: '{{emailLogUrl}}' }],
      },
      footer: { enabled: true, reference: 'Daily delivery report', note: '', replyNotice: true },
    };

    expect(emailTemplateIssues('FAILURE_DIGEST', copy)).toContainEqual({
      path: 'intro',
      message: 'This message needs {{count}}.',
      token: 'count',
    });
  });
});
