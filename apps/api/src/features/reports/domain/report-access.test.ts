import { describe, expect, it } from 'vitest';

import {
  canArchive,
  canDecide,
  canDeleteArchivedRecord,
  canDeleteRecord,
  canManageRecord,
  canReadNarrative,
  canReadRecord,
  canSetCompletedDate,
  canViewFacsimile,
  canWriteNarrative,
  isAdmin,
  type NarrativeRecord,
} from './report-access';

const admin = { userId: 'admin-1', role: 'ADMIN' as const };
const personnel = { userId: 'person-1', role: 'PERSONNEL' as const };
const otherPic = { userId: 'person-2', role: 'PERSONNEL' as const };

/** A record claimed by `person-1` unless the test says otherwise. */
function record(
  status: NarrativeRecord['status'],
  submittedByUserId: string | null = 'person-1',
): NarrativeRecord {
  return { status, submittedByUserId };
}

describe('report access', () => {
  it('lets both shared-office roles edit activity details, including after approval', () => {
    expect(canManageRecord(admin, 'PENDING')).toBe(true);
    expect(canManageRecord(admin, 'SUBMITTED')).toBe(true);
    expect(canManageRecord(admin, 'APPROVED')).toBe(true);
    expect(canManageRecord(personnel, 'PENDING')).toBe(true);
  });

  it('lets any PIC write an open narrative, assigned or not', () => {
    expect(canWriteNarrative(personnel, record('PENDING', null))).toBe(true);
    expect(canWriteNarrative(otherPic, record('PENDING', 'person-1'))).toBe(true);
    expect(canWriteNarrative(personnel, record('SUBMITTED'))).toBe(true);
    expect(canWriteNarrative(personnel, record('APPROVED'))).toBe(true);
    // The office stands in for every role (spec §9).
    expect(canWriteNarrative(admin, record('PENDING', null))).toBe(true);
    expect(canWriteNarrative({ userId: 'x', role: undefined }, record('PENDING'))).toBe(false);
  });

  it('lets another PIC revise the shared returned narrative', () => {
    expect(canWriteNarrative(personnel, record('RETURNED'))).toBe(true);
    expect(canWriteNarrative(otherPic, record('RETURNED'))).toBe(true);
    expect(canWriteNarrative(personnel, record('RETURNED', null))).toBe(true);
    expect(canWriteNarrative(admin, record('RETURNED'))).toBe(true);
  });

  it('shares submitted narratives with all PICs and ADMIN', () => {
    for (const status of ['SUBMITTED', 'RETURNED', 'APPROVED'] as const) {
      expect(canReadNarrative(personnel, record(status), true)).toBe(true);
      expect(canReadNarrative(otherPic, record(status), true)).toBe(true);
      expect(canReadNarrative(admin, record(status), false)).toBe(true);
    }
  });

  it('shows submitted records to the entire shared office', () => {
    for (const status of ['SUBMITTED', 'RETURNED', 'APPROVED'] as const) {
      // The submitter and a PIC named on the record may open it; the narrative
      // itself still stays private to the submitter and the office.
      expect(canReadRecord(personnel, record(status), true)).toBe(true);
      expect(canReadRecord(otherPic, record(status), true)).toBe(true);
      expect(canReadRecord(otherPic, record(status), false)).toBe(true);
      expect(canReadRecord(admin, record(status), false)).toBe(true);
    }
  });

  it('keeps an open record in the register for anyone to claim', () => {
    expect(canReadRecord(personnel, record('PENDING', null), false)).toBe(true);
    expect(canReadRecord(otherPic, record('PENDING', 'person-1'), false)).toBe(true);
    expect(canReadRecord(admin, record('PENDING', null), false)).toBe(true);
  });

  it('shares draft narratives with PIC and ADMIN accounts', () => {
    expect(canReadNarrative(otherPic, record('PENDING', null), true)).toBe(true);
    expect(canReadNarrative(admin, record('PENDING', null), false)).toBe(true);
    expect(canReadNarrative(admin, record('PENDING', null), true)).toBe(true);
  });

  it('shows the facsimile throughout the shared office', () => {
    expect(canViewFacsimile(personnel, record('PENDING', null), true)).toBe(true);
    expect(canViewFacsimile(personnel, record('SUBMITTED'), true)).toBe(true);
    expect(canViewFacsimile(personnel, record('RETURNED'), true)).toBe(true);
    expect(canViewFacsimile(personnel, record('APPROVED'), true)).toBe(true);
    // Another PIC on the same record never gets the copy of a private narrative.
    expect(canViewFacsimile(otherPic, record('SUBMITTED'), true)).toBe(true);
    // A reader who is not named on the record never gets the office copy.
    expect(canViewFacsimile(personnel, record('APPROVED'), false)).toBe(true);
    // The office reads the draft too, watermarked NOT_SUBMITTED.
    expect(canViewFacsimile(admin, record('PENDING', null), false)).toBe(true);
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

  it('deletes a filed record, and only one that is already archived', () => {
    const filed = { status: 'APPROVED' as const, archivedAt: '2026-10-27T02:00:00Z' };

    expect(canDeleteArchivedRecord(admin, filed)).toBe(true);
    expect(canDeleteArchivedRecord(admin, { ...filed, archivedAt: null })).toBe(false);
    expect(canDeleteArchivedRecord(admin, { ...filed, status: 'SUBMITTED' })).toBe(false);
    expect(canDeleteArchivedRecord(personnel, filed)).toBe(false);
  });

  it('archives an approved record only, and only for the office', () => {
    expect(canArchive(admin, 'APPROVED')).toBe(true);
    expect(canArchive(admin, 'SUBMITTED')).toBe(false);
    expect(canArchive(personnel, 'APPROVED')).toBe(false);
  });

  it('records the completion date on an approved record, and only for the office', () => {
    expect(canSetCompletedDate(admin, 'APPROVED')).toBe(true);
    expect(canSetCompletedDate(admin, 'SUBMITTED')).toBe(false);
    expect(canSetCompletedDate(admin, 'PENDING')).toBe(false);
    expect(canSetCompletedDate(personnel, 'APPROVED')).toBe(false);
  });

  it('reads a missing role as no role at all', () => {
    expect(isAdmin({ userId: 'x', role: undefined })).toBe(false);
  });
});
