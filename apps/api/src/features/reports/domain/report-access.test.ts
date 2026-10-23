import { describe, expect, it } from 'vitest';

import {
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
  it('shows a record to the office and to its listed personnel in charge', () => {
    expect(canViewReport(admin, false)).toBe(true);
    expect(canViewReport(personnel, true)).toBe(true);
    expect(canViewReport(personnel, false)).toBe(false);
    // Membership, not the role label, decides access for a listed person.
    expect(canViewReport({ userId: 'x', role: undefined }, true)).toBe(true);
    expect(canViewReport({ userId: 'x', role: undefined }, false)).toBe(false);
  });

  it('lets only the office edit the activity, and never after approval', () => {
    expect(canManageRecord(admin, 'DRAFT')).toBe(true);
    expect(canManageRecord(admin, 'SUBMITTED')).toBe(true);
    expect(canManageRecord(admin, 'APPROVED')).toBe(false);
    expect(canManageRecord(personnel, 'DRAFT')).toBe(false);
  });

  it('lets a listed person write the narrative only while it is theirs to submit', () => {
    expect(canWriteNarrative(personnel, true, 'DRAFT')).toBe(true);
    expect(canWriteNarrative(personnel, true, 'RETURNED')).toBe(true);
    expect(canWriteNarrative(personnel, true, 'SUBMITTED')).toBe(false);
    expect(canWriteNarrative(personnel, true, 'APPROVED')).toBe(false);
    expect(canWriteNarrative(personnel, false, 'DRAFT')).toBe(false);
    expect(canWriteNarrative(admin, false, 'DRAFT')).toBe(false);
  });

  it('decides one submitted narrative, office only', () => {
    expect(canDecide(admin, 'SUBMITTED')).toBe(true);
    expect(canDecide(admin, 'DRAFT')).toBe(false);
    expect(canDecide(admin, 'APPROVED')).toBe(false);
    expect(canDecide(personnel, 'SUBMITTED')).toBe(false);
  });

  it('deletes only a draft, office only', () => {
    expect(canDeleteRecord(admin, 'DRAFT')).toBe(true);
    expect(canDeleteRecord(admin, 'RETURNED')).toBe(false);
    expect(canDeleteRecord(personnel, 'DRAFT')).toBe(false);
  });

  it('reads a missing role as no role at all', () => {
    expect(isAdmin({ userId: 'x', role: undefined })).toBe(false);
  });
});
