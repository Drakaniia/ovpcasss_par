import { getTableColumns } from 'drizzle-orm';
import { describe, expect, it } from 'vitest';

import { sessions, users } from './identity';
import { auditEvents, rateLimitCounters } from './operations';
import { receipts, referenceCounters, reportPics, reports } from './reports';

/**
 * Shape invariants the queries and the specs depend on. Without this, a renamed
 * or dropped column only surfaces at runtime against a live D1 database.
 */
describe('schema', () => {
  it('keeps the audit trail append-only', () => {
    expect(Object.keys(getTableColumns(auditEvents))).not.toContain('updatedAt');
  });

  it('soft-deletes users and stores email once', () => {
    const columns = Object.keys(getTableColumns(users));

    expect(columns).toContain('deletedAt');
    expect(columns).toContain('email');
  });

  it('keys sessions by a hashed token, never the plaintext', () => {
    const columns = Object.keys(getTableColumns(sessions));

    expect(columns).toContain('tokenHash');
    expect(columns).not.toContain('token');
  });

  it('keys rate-limit counters by bucket and window', () => {
    const columns = Object.keys(getTableColumns(rateLimitCounters));

    expect(columns).toContain('bucket');
    expect(columns).toContain('windowStart');
  });

  it('stores the AR No. on the record beside the expand/contract legacy columns', () => {
    const columns = Object.keys(getTableColumns(reports));

    expect(columns).toContain('referenceNo');
    expect(columns).toContain('activityCount');
    expect(columns).toContain('createdByUserId');
    expect(columns).toContain('sequence');
  });

  it('requires an email for every person in charge', () => {
    expect(getTableColumns(reportPics).email.notNull).toBe(true);
  });

  it('keeps one global reference counter and one receipt per PIC', () => {
    expect(Object.keys(getTableColumns(referenceCounters))).toEqual(['name', 'lastSeq']);
    const receiptColumns = Object.keys(getTableColumns(receipts));

    expect(receiptColumns).toContain('recipientPicId');
    expect(receiptColumns).toContain('objectKey');
    expect(receiptColumns).not.toContain('reportId_unique');
  });
});
