import { describe, expect, it } from 'vitest';

import {
  adminAuditListQuerySchema,
  adminAuditListResponseSchema,
  auditDiffEntrySchema,
  auditEventDetailSchema,
  auditEventItemSchema,
  AUDIT_ACTIONS,
  AUDIT_ENTITY_TYPES,
} from './audit';

describe('audit contracts', () => {
  it('defines the expected entity types and actions', () => {
    expect(AUDIT_ENTITY_TYPES).toContain('user');
    expect(AUDIT_ENTITY_TYPES).toContain('report');
    expect(AUDIT_ENTITY_TYPES).toContain('attachment');
    expect(AUDIT_ENTITY_TYPES).toContain('reference_data');
    expect(AUDIT_ENTITY_TYPES).toContain('export');
    expect(AUDIT_ENTITY_TYPES).toContain('session');

    expect(AUDIT_ACTIONS).toContain('REGISTER');
    expect(AUDIT_ACTIONS).toContain('LOGIN');
    expect(AUDIT_ACTIONS).toContain('ROLE_ASSIGNED');
    expect(AUDIT_ACTIONS).toContain('SUBMITTED');
    expect(AUDIT_ACTIONS).toContain('ENDORSED');
    expect(AUDIT_ACTIONS).toContain('APPROVED');
  });

  it('parses admin audit list query with defaults', () => {
    const parsed = adminAuditListQuerySchema.parse({});
    expect(parsed.page).toBe(1);
    expect(parsed.limit).toBe(50);
  });

  it('parses admin audit list query with filters', () => {
    const parsed = adminAuditListQuerySchema.parse({
      actor: 'Santos',
      action: 'ENDORSED',
      entityType: 'report',
      entityId: 'OFF-2026-0014',
      from: '2026-10-01',
      to: '2026-10-31',
      fromStatus: 'SUBMITTED',
      toStatus: 'ENDORSED',
      page: '2',
      limit: '50',
    });
    expect(parsed.actor).toBe('Santos');
    expect(parsed.action).toBe('ENDORSED');
    expect(parsed.entityType).toBe('report');
    expect(parsed.entityId).toBe('OFF-2026-0014');
    expect(parsed.fromStatus).toBe('SUBMITTED');
    expect(parsed.toStatus).toBe('ENDORSED');
    expect(parsed.page).toBe(2);
    expect(parsed.limit).toBe(50);
  });

  it('parses an audit event item', () => {
    const item = auditEventItemSchema.parse({
      id: 'aud_123',
      actorUserId: 'usr_1',
      actorName: 'M. Santos',
      actorRole: 'REVIEWER',
      action: 'ENDORSED',
      entityType: 'report',
      entityId: 'rep_1',
      entityLabel: 'OFF-2026-0014',
      fromStatus: 'SUBMITTED',
      toStatus: 'ENDORSED',
      comment: 'All clear',
      createdAt: '2026-10-17T06:02:00.000Z',
    });
    expect(item.id).toBe('aud_123');
    expect(item.actorRole).toBe('REVIEWER');
    expect(item.action).toBe('ENDORSED');
  });

  it('parses diff entries and event detail', () => {
    const diffEntry = auditDiffEntrySchema.parse({
      key: 'title',
      before: 'Old Title',
      after: 'New Title',
      changed: true,
    });
    expect(diffEntry.changed).toBe(true);

    const detail = auditEventDetailSchema.parse({
      id: 'aud_456',
      action: 'REFERENCE_UPDATED',
      entityType: 'reference_data',
      createdAt: '2026-10-17T06:02:00.000Z',
      before: { name: 'Old' },
      after: { name: 'New' },
      diff: [diffEntry],
    });
    expect(detail.before).toEqual({ name: 'Old' });
    expect(detail.diff?.[0]?.key).toBe('title');
  });

  it('parses admin audit list response', () => {
    const response = adminAuditListResponseSchema.parse({
      items: [
        {
          id: 'aud_1',
          action: 'LOGIN',
          entityType: 'session',
          createdAt: '2026-10-17T06:02:00.000Z',
        },
      ],
      total: 1,
      page: 1,
      pageSize: 50,
    });
    expect(response.total).toBe(1);
    expect(response.items).toHaveLength(1);
  });
});
