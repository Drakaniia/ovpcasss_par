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
    expect(AUDIT_ENTITY_TYPES).toContain('report');
    expect(AUDIT_ENTITY_TYPES).toContain('attachment');
    expect(AUDIT_ENTITY_TYPES).toContain('reference_data');

    expect(AUDIT_ACTIONS).toContain('RECORD_CREATED');
    expect(AUDIT_ACTIONS).toContain('NARRATIVE_SUBMITTED');
    expect(AUDIT_ACTIONS).toContain('NARRATIVE_APPROVED');
    expect(AUDIT_ACTIONS).toContain('RECEIPT_ISSUED');
    expect(AUDIT_ACTIONS).toContain('RECORD_COMPLETED_DATE_SET');
    expect(AUDIT_ACTIONS).not.toContain('ENDORSED');
  });

  it('parses the admin query with defaults and filters', () => {
    expect(adminAuditListQuerySchema.parse({}).page).toBe(1);
    const parsed = adminAuditListQuerySchema.parse({
      action: 'NARRATIVE_APPROVED',
      fromStatus: 'SUBMITTED',
      toStatus: 'APPROVED',
      page: '2',
    });
    expect(parsed.page).toBe(2);
    expect(parsed.toStatus).toBe('APPROVED');
  });

  it('parses an event with the two roles only', () => {
    const item = auditEventItemSchema.parse({
      id: 'aud_123',
      actorName: 'M. Santos',
      actorRole: 'PERSONNEL',
      action: 'NARRATIVE_SUBMITTED',
      entityType: 'report',
      entityId: 'rep_1',
      entityLabel: 'AR No. 0001',
      fromStatus: 'PENDING',
      toStatus: 'SUBMITTED',
      createdAt: '2026-10-17T06:02:00.000Z',
    });
    expect(item.actorRole).toBe('PERSONNEL');
    expect(auditEventItemSchema.safeParse({ ...item, actorRole: 'REVIEWER' }).success).toBe(false);
  });

  it('parses diff entries and detail', () => {
    const diffEntry = auditDiffEntrySchema.parse({
      key: 'title',
      before: 'Old',
      after: 'New',
      changed: true,
    });
    const detail = auditEventDetailSchema.parse({
      id: 'aud_456',
      action: 'REFERENCE_UPDATED',
      entityType: 'reference_data',
      createdAt: '2026-10-17T06:02:00.000Z',
      before: { name: 'Old' },
      after: { name: 'New' },
      diff: [diffEntry],
    });
    expect(detail.diff?.[0]?.changed).toBe(true);
  });

  it('parses the admin list response', () => {
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
  });
});
