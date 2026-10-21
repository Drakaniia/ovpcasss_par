import { describe, expect, it } from 'vitest';

import { canDecide, canEditReport, canViewReport, reportSearchScope } from './report-access';

describe('report access', () => {
  it('limits a submitter to their own reports', () => {
    const submitter = { userId: 'u1', role: 'SUBMITTER' as const };

    expect(canViewReport(submitter, 'u1')).toBe(true);
    expect(canViewReport(submitter, 'u2')).toBe(false);
  });

  it('lets reviewers, approvers, and admins read every report', () => {
    for (const role of ['REVIEWER', 'APPROVER', 'ADMIN'] as const) {
      expect(canViewReport({ userId: 'u1', role }, 'u2')).toBe(true);
    }
  });

  it('allows edits only to the owner in a draft or returned state', () => {
    const submitter = { userId: 'u1', role: 'SUBMITTER' as const };

    expect(canEditReport(submitter, 'u1', 'DRAFT')).toBe(true);
    expect(canEditReport(submitter, 'u1', 'RETURNED_BY_REVIEWER')).toBe(true);
    expect(canEditReport(submitter, 'u1', 'RETURNED_BY_APPROVER')).toBe(true);
    expect(canEditReport(submitter, 'u1', 'SUBMITTED')).toBe(false);
    expect(canEditReport({ userId: 'u2', role: 'REVIEWER' }, 'u1', 'DRAFT')).toBe(false);
  });

  it('scopes a report search to the owner for a submitter, and to everyone else unfiltered', () => {
    expect(reportSearchScope({ userId: 'u1', role: 'SUBMITTER' })).toEqual({ ownerUserId: 'u1' });

    for (const role of ['REVIEWER', 'APPROVER', 'ADMIN'] as const) {
      expect(reportSearchScope({ userId: 'u1', role })).toEqual({});
    }
  });

  it('never lets a submitter decide on their own report', () => {
    const reviewer = { userId: 'u1', role: 'REVIEWER' as const };

    expect(canDecide(reviewer, 'u1')).toBe(false);
    expect(canDecide(reviewer, 'u2')).toBe(true);
  });

  it('treats an admin as the owner of the report it filed, and nobody else', () => {
    const admin = { userId: 'u1', role: 'ADMIN' as const };

    expect(canEditReport(admin, 'u1', 'DRAFT')).toBe(true);
    expect(canEditReport(admin, 'u1', 'SUBMITTED')).toBe(false);
    expect(canEditReport(admin, 'u2', 'DRAFT')).toBe(false);
  });

  it('lets an admin decide on reports it did not submit', () => {
    const admin = { userId: 'u1', role: 'ADMIN' as const };

    expect(canDecide(admin, 'u1')).toBe(false);
    expect(canDecide(admin, 'u2')).toBe(true);
  });
});
