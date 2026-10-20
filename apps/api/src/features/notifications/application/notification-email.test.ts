import { describe, expect, it } from 'vitest';

import { emailForNotification, type NotificationEmailData } from './notification-email';

const report: NotificationEmailData = {
  recipientName: 'M. Santos',
  trackingNumber: 'OFF-2026-0014',
  title: 'Coastal cleanup',
  actorName: 'J. Dela Cruz',
};

describe('emailForNotification', () => {
  it('tells reviewers a report is ready for review', () => {
    const content = emailForNotification('SUBMITTED', report);

    expect(content?.subject).toBe('PAR OFF-2026-0014 is ready for review');
    expect(content?.text).toContain('J. Dela Cruz');
  });

  it('tells approvers a report is ready for approval', () => {
    expect(emailForNotification('ENDORSED', report)?.subject).toBe(
      'PAR OFF-2026-0014 is ready for approval',
    );
  });

  it('carries the return comments to the submitter', () => {
    const content = emailForNotification('RETURNED', {
      ...report,
      comments: 'Add the attendance sheet and correct the participant count.',
    });

    expect(content?.subject).toBe('PAR OFF-2026-0014 was returned for revision');
    expect(content?.text).toContain('Add the attendance sheet');
  });

  it('tells the submitter the report is approved', () => {
    expect(emailForNotification('APPROVED', report)?.subject).toBe('PAR OFF-2026-0014 is approved');
  });

  it('uses the account template for account events', () => {
    const content = emailForNotification('ACCOUNT', { recipientName: 'M. Santos' });

    expect(content?.subject).toBe('Your OVPCASSS PAR account is active');
    expect(content?.text).toContain('M. Santos');
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
    expect(
      emailForNotification('ENDORSED', { recipientName: 'M. Santos', title: 'Coastal cleanup' }),
    ).toBeNull();
  });
});
