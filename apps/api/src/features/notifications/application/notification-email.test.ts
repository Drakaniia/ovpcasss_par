import { describe, expect, it } from 'vitest';

import { emailForNotification, type NotificationEmailData } from './notification-email';

const report: NotificationEmailData = {
  recipientName: 'M. Santos',
  trackingNumber: 'OFF-2026-0014',
  title: 'Coastal cleanup',
  actorName: 'J. Dela Cruz',
  origin: 'https://par.example.edu',
};

describe('emailForNotification', () => {
  it('tells reviewers a report is ready for review', () => {
    const content = emailForNotification('SUBMITTED', report);

    expect(content?.subject).toBe('[OVPCASSS PAR] OFF-2026-0014 is ready for review');
    expect(content?.text).toContain('J. Dela Cruz');
    expect(content?.text).toContain('https://par.example.edu/review');
  });

  it('uses the resubmission wording instead of the first-submission copy', () => {
    const content = emailForNotification('RESUBMITTED', { ...report, revisionRound: 2 });

    expect(content?.subject).toBe('[OVPCASSS PAR] OFF-2026-0014 was resubmitted');
    expect(content?.text).toContain('resubmitted after revision');
    expect(content?.text).toContain('revision round 2');
  });

  it('tells approvers a report is ready for approval', () => {
    expect(emailForNotification('ENDORSED', report)?.subject).toBe(
      '[OVPCASSS PAR] OFF-2026-0014 is ready for approval',
    );
  });

  it('carries the return comments to the submitter', () => {
    const content = emailForNotification('RETURNED', {
      ...report,
      comments: 'Add the attendance sheet and correct the participant count.',
    });

    expect(content?.subject).toBe('[OVPCASSS PAR] OFF-2026-0014 was returned for revision');
    expect(content?.text).toContain('> Add the attendance sheet');
  });

  it('claims an acknowledgement only when the attachment is carried', () => {
    expect(emailForNotification('APPROVED', report)?.text).not.toContain('attached');
    expect(emailForNotification('APPROVED', { ...report, hasAttachment: true })?.text).toContain(
      'The signed acknowledgement is attached.',
    );
  });

  it('sends a receipt with the report it describes', () => {
    const content = emailForNotification('RECEIPT', { ...report, hasAttachment: true });

    expect(content?.subject).toBe('[OVPCASSS PAR] Submission received: OFF-2026-0014');
    expect(content?.text).toContain('A copy of the report as filed is attached.');
  });

  it('names the queue a reminder is about', () => {
    expect(
      emailForNotification('REMINDER', { ...report, queue: 'approval', workingDays: 4 })?.subject,
    ).toBe('[OVPCASSS PAR] OFF-2026-0014 is still awaiting approval');
  });

  it('sends nothing when the facts a template needs are missing', () => {
    expect(emailForNotification('SUBMITTED', { recipientName: 'M. Santos' })).toBeNull();
    expect(
      emailForNotification('SUBMITTED', {
        recipientName: 'M. Santos',
        trackingNumber: 'OFF-2026-0014',
        title: 'Coastal cleanup',
      }),
    ).toBeNull();
    expect(emailForNotification('REMINDER', report)).toBeNull();
  });

  it('leaves account and operational kinds to their own senders', () => {
    expect(emailForNotification('VERIFY', report)).toBeNull();
    expect(emailForNotification('WORKBOOK', report)).toBeNull();
    expect(emailForNotification('FAILURE_DIGEST', report)).toBeNull();
  });
});
