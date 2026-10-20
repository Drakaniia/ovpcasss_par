import type { AuditEventRow } from '@par/db';

/**
 * Admin inbox one-liner (UI spec §7.3): the recorded action, read back as a
 * sentence, and what it happened to. The raw UUID is never shown; the admin
 * opens the audit log for detail.
 */
export function summarizeAuditEvent(row: Pick<AuditEventRow, 'action' | 'entityType'>): string {
  const action = row.action.replaceAll('_', ' ').toLowerCase();

  return `${action.charAt(0).toUpperCase()}${action.slice(1)} · ${row.entityType}`;
}
