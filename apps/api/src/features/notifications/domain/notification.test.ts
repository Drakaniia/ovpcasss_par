import { describe, expect, it } from 'vitest';

import { buildNotification, toClientNotification } from './notification';

const AT = '2026-03-20T01:12:00.000Z';

describe('buildNotification', () => {
  it('stamps the shared kind flags instead of taking them from the caller', () => {
    const returned = buildNotification(
      {
        userId: 'u1',
        kind: 'RETURNED',
        description: 'OFF-2026-0014 was returned by M. Santos',
        comment: 'Add the attendance sheet.',
        target: { kind: 'report', reportId: 'r1' },
      },
      'n1',
      AT,
    );

    expect(returned).toMatchObject({
      id: 'n1',
      needsAction: true,
      aboutOwnReport: true,
      readAt: null,
      createdAt: AT,
      updatedAt: AT,
    });
    expect(returned.comment).toBe('Add the attendance sheet.');
  });

  it('writes an account notification with no action and no report', () => {
    const account = buildNotification(
      {
        userId: 'u1',
        kind: 'ACCOUNT',
        description: 'Your role was assigned: Reviewer',
        target: { kind: 'home' },
      },
      'n2',
      AT,
    );

    expect(account).toMatchObject({
      needsAction: false,
      aboutOwnReport: false,
      comment: null,
      reportId: null,
      targetKind: 'home',
    });
  });

  it('treats a reviewer-bound submission as work, not the reader own report', () => {
    const submitted = buildNotification(
      {
        userId: 'u2',
        kind: 'SUBMITTED',
        description: 'AR No. 0014 was submitted by J. Dela Cruz',
        target: { kind: 'report', reportId: 'r1' },
      },
      'n3',
      AT,
    );

    expect(submitted).toMatchObject({ needsAction: true, aboutOwnReport: false });
  });
});

describe('toClientNotification', () => {
  it('sends the reader their facts and never their id', () => {
    const record = buildNotification(
      {
        userId: 'u1',
        kind: 'APPROVED',
        description: 'OFF-2026-0011 was approved',
        target: { kind: 'report', reportId: 'r1' },
      },
      'n4',
      AT,
    );

    const payload = toClientNotification(record);

    expect(payload).toEqual({
      id: 'n4',
      kind: 'APPROVED',
      description: 'OFF-2026-0011 was approved',
      comment: null,
      target: { kind: 'report', reportId: 'r1' },
      readAt: null,
      createdAt: AT,
    });
    expect(payload).not.toHaveProperty('userId');
  });
});
