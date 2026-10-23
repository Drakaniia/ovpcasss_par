import { describe, expect, it } from 'vitest';

import { STATUS_PRESENTATION, legacyStatusLabel, nextStepText } from './report-status';

describe('STATUS_PRESENTATION', () => {
  it('maps all four API statuses to a label and a tone', () => {
    expect(
      Object.fromEntries(
        Object.entries(STATUS_PRESENTATION).map(([status, meta]) => [status, meta.label]),
      ),
    ).toEqual({
      PENDING: 'Pending',
      SUBMITTED: 'Submitted',
      RETURNED: 'Returned',
      APPROVED: 'Approved',
    });
  });
});

describe('nextStepText', () => {
  it('matches the spec copy for every non-terminal status', () => {
    expect(nextStepText('PENDING')).toBe('With personnel in charge · Next: narrative report');
    expect(nextStepText('SUBMITTED')).toBe('With the office · Next: review and decision');
    expect(nextStepText('RETURNED')).toBe('With personnel in charge · Next: revise and resubmit');
  });

  it('uses the completion date on an approved report', () => {
    expect(nextStepText('APPROVED', '2026-03-20T01:00:00Z')).toBe(
      'Completed 20 Mar 2026 · Acknowledgment receipt available',
    );
  });

  it('keeps a historical stored Draft readable as legacy', () => {
    expect(legacyStatusLabel('DRAFT')).toBe('Draft (legacy)');
    expect(legacyStatusLabel('PENDING')).toBeNull();
  });

  it('never invents an in-progress label', () => {
    const texts = Object.keys(STATUS_PRESENTATION).map((status) =>
      nextStepText(status as keyof typeof STATUS_PRESENTATION),
    );
    expect(texts.join(' ')).not.toMatch(/in progress/i);
  });
});
