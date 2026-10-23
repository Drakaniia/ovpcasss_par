import { describe, expect, it } from 'vitest';

import {
  canArchive,
  canDecide,
  canDeleteRecord,
  canManageRecord,
  canViewReport,
  canWriteNarrative,
  isAdmin,
} from './report-access';

const admin = { userId: 'admin-1', role: 'ADMIN' as const };
const personnel = { userId: 'person-1', role: 'PERSONNEL' as const };

describe('report access', () => {
  it('shows the register to every signed-in account', () => {
    expect(canViewReport(admin)).toBe(true);
    expect(canViewReport(personnel)).toBe(true);
    expect(canViewReport({ userId: 'x', role: undefined })).toBe(true);
  });

  it('lets only the office edit the activity, and never after approval', () => {
    expect(canManageRecord(admin, 'PENDING')).toBe(true);
    expect(canManageRecord(admin, 'SUBMITTED')).toBe(true);
    expect(canManageRecord(admin, 'APPROVED')).toBe(false);
    expect(canManageRecord(personnel, 'PENDING')).toBe(false);
  });

  it('lets any PIC write an open narrative, assigned or not', () => {
    expect(canWriteNarrative(personnel, 'PENDING')).toBe(true);
    expect(canWriteNarrative(personnel, 'RETURNED')).toBe(true);
    expect(canWriteNarrative(personnel, 'SUBMITTED')).toBe(false);
    expect(canWriteNarrative(personnel, 'APPROVED')).toBe(false);
    // The office stands in for every role (spec §9).
    expect(canWriteNarrative(admin, 'PENDING')).toBe(true);
    expect(canWriteNarrative({ userId: 'x', role: undefined }, 'PENDING')).toBe(false);
  });

  it('decides one submitted narrative, office only', () => {
    expect(canDecide(admin, 'SUBMITTED')).toBe(true);
    expect(canDecide(admin, 'PENDING')).toBe(false);
    expect(canDecide(admin, 'APPROVED')).toBe(false);
    expect(canDecide(personnel, 'SUBMITTED')).toBe(false);
  });

  it('deletes only a pending record, office only', () => {
    expect(canDeleteRecord(admin, 'PENDING')).toBe(true);
    expect(canDeleteRecord(admin, 'RETURNED')).toBe(false);
    expect(canDeleteRecord(personnel, 'PENDING')).toBe(false);
  });

  it('archives an approved record only, and only for the office', () => {
    expect(canArchive(admin, 'APPROVED')).toBe(true);
    expect(canArchive(admin, 'SUBMITTED')).toBe(false);
    expect(canArchive(personnel, 'APPROVED')).toBe(false);
  });

  it('reads a missing role as no role at all', () => {
    expect(isAdmin({ userId: 'x', role: undefined })).toBe(false);
  });
});
