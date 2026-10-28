import { describe, expect, it } from 'vitest';

import { emailForNotification, type NotificationEmailData } from './notification-email';

const record: NotificationEmailData = {
  referenceNo: 'AR No. 0014',
  title: 'Coastal cleanup',
  origin: 'https://par.example.edu',
};

describe('emailForNotification', () => {
  it('leads the assignment mail with the reference', () => {
    const content = emailForNotification('ASSIGNED', { ...record, newAccount: true });

    expect(content?.subject).toBe('[OVPCASSS PAR] AR No. 0014 — you are the personnel in charge');
    expect(content?.text).toContain('Create your account');
    expect(content?.text).toContain('https://par.example.edu/register');
  });

  it('tells the office a narrative is ready for review', () => {
    const content = emailForNotification('SUBMITTED', {
      ...record,
      submitterName: 'J. Dela Cruz',
    });

    expect(content?.subject).toBe('[OVPCASSS PAR] AR No. 0014 — narrative report ready for review');
    expect(content?.text).toContain('J. Dela Cruz');
    expect(content?.text).toContain('https://par.example.edu/reports?tab=submitted');
  });

  it('carries the return comments to the personnel in charge', () => {
    const content = emailForNotification('RETURNED', {
      ...record,
      comments: 'Add the attendance sheet and correct the participant count.',
    });

    expect(content?.subject).toBe(
      '[OVPCASSS PAR] AR No. 0014 — narrative report returned for revision',
    );
    expect(content?.text).toContain('> Add the attendance sheet');
  });

  it('announces the approval without claiming the receipt is attached', () => {
    const content = emailForNotification('APPROVED', {
      ...record,
      picName: 'M. Santos',
      approvedAt: '2026-10-22T06:05:00.000Z',
      hasAttachment: true,
    });

    expect(content?.subject).toBe('[OVPCASSS PAR] AR No. 0014 — narrative report approved');
    expect(content?.text).toContain('approved the narrative report for AR No. 0014');
    expect(content?.text).toContain('stays available in the app');
    expect(content?.text).not.toContain('attached');
  });

  it('claims a receipt only when the attachment is carried', () => {
    expect(emailForNotification('RECEIPT_ISSUED', record)?.text).toContain(
      'Download the receipt from the app.',
    );
    expect(
      emailForNotification('RECEIPT_ISSUED', { ...record, hasAttachment: true })?.text,
    ).toContain('Keep this message');
  });

  it('names how long a record has been waiting in a reminder', () => {
    const content = emailForNotification('REMINDER', { ...record, waitingDays: 14 });

    expect(content?.subject).toBe('[OVPCASSS PAR] AR No. 0014 — narrative report still pending');
    expect(content?.text).toContain('14 days ago');
  });

  it('sends nothing when the facts a template needs are missing', () => {
    expect(emailForNotification('ASSIGNED', {})).toBeNull();
    expect(emailForNotification('SUBMITTED', { referenceNo: 'AR No. 0014' })).toBeNull();
  });

  it('leaves account and operational kinds to their own senders', () => {
    expect(emailForNotification('VERIFY', record)).toBeNull();
    expect(emailForNotification('WORKBOOK', record)).toBeNull();
    expect(emailForNotification('FAILURE_DIGEST', record)).toBeNull();
  });
});
