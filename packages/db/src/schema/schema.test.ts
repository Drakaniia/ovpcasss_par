import { getTableColumns } from 'drizzle-orm';
import { describe, expect, it } from 'vitest';

import { sessions, users } from './identity';
import { auditEvents, rateLimitCounters } from './operations';

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
});
