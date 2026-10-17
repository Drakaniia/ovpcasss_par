import { describe, expect, it } from 'vitest';

import { STATUS_PRESENTATION, nextStepText } from './report-status';

describe('STATUS_PRESENTATION', () => {
  it('maps all seven API statuses to a label and a tone', () => {
    expect(
      Object.fromEntries(
        Object.entries(STATUS_PRESENTATION).map(([status, meta]) => [status, meta.label]),
      ),
    ).toEqual({
      DRAFT: 'Draft',
      SUBMITTED: 'Submitted',
      RESUBMITTED: 'Resubmitted',
      RETURNED_BY_REVIEWER: 'Returned by reviewer',
      RETURNED_BY_APPROVER: 'Returned by approver',
      ENDORSED: 'Endorsed',
      APPROVED: 'Approved',
    });
  });
});

describe('nextStepText', () => {
  it('matches the spec copy for every non-terminal status', () => {
    expect(nextStepText('DRAFT')).toBe('Not yet submitted · Next: complete the form and submit');
    expect(nextStepText('SUBMITTED')).toBe('With OVPCASSS reviewer · Next: review');
    expect(nextStepText('RESUBMITTED')).toBe('With OVPCASSS reviewer · Next: re-review');
    expect(nextStepText('RETURNED_BY_REVIEWER')).toBe(
      'Returned to submitter · Next: revise and resubmit',
    );
    expect(nextStepText('ENDORSED')).toBe('With approving officer · Next: approve');
    expect(nextStepText('RETURNED_BY_APPROVER')).toBe(
      'Returned to submitter · Next: revise and resubmit',
    );
  });

  it('uses the completion date on an approved report', () => {
    expect(nextStepText('APPROVED', '2026-03-20T01:00:00Z')).toBe(
      'Completed 20 Mar 2026 · Acknowledgement available',
    );
  });

  it('never invents an in-progress label', () => {
    const texts = Object.keys(STATUS_PRESENTATION).map((status) =>
      nextStepText(status as keyof typeof STATUS_PRESENTATION),
    );
    expect(texts.join(' ')).not.toMatch(/in progress/i);
  });
});
