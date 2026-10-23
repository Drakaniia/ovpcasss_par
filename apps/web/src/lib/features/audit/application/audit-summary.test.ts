import { describe, expect, it } from 'vitest';

import {
  formatAuditActionLabel,
  formatAuditActorLabel,
  formatAuditStatusTransition,
  formatAuditSummary,
  formatManilaTimestamp,
} from './audit-summary';

describe('audit-summary', () => {
  it('formats Manila timestamp with 24-hour time and UTC exact', () => {
    const ts = formatManilaTimestamp('2026-10-17T06:02:00.000Z');
    // In Asia/Manila (+08:00), 06:02 UTC is 14:02
    expect(ts.display).toBe('17 Oct 2026 14:02');
    expect(ts.utc).toBe('2026-10-17T06:02:00.000Z');
  });

  it('formats action labels to human title', () => {
    expect(formatAuditActionLabel('NARRATIVE_APPROVED')).toBe('Narrative approved');
    expect(formatAuditActionLabel('ROLE_ASSIGNED')).toBe('Role assigned');
    expect(formatAuditActionLabel('LOGIN_FAILED')).toBe('Login failed');
  });

  it('formats actor with role label', () => {
    expect(formatAuditActorLabel('M. Santos', 'PERSONNEL')).toBe('M. Santos (Personnel in charge)');
    expect(formatAuditActorLabel(null, 'ADMIN')).toBe('Administrator');
    expect(formatAuditActorLabel(null, null)).toBe('System');
  });

  it('formats status transition with text arrow', () => {
    expect(formatAuditStatusTransition('DRAFT', 'SUBMITTED')).toBe('Draft (legacy) → Submitted');
    expect(formatAuditStatusTransition('SUBMITTED', 'APPROVED')).toBe('Submitted → Approved');
    expect(formatAuditStatusTransition(null, null)).toBeNull();
  });

  it('generates a human summary sentence', () => {
    const summary = formatAuditSummary({
      id: 'aud_1',
      actorName: 'M. Santos',
      actorRole: 'PERSONNEL',
      action: 'NARRATIVE_APPROVED',
      entityType: 'report',
      entityId: 'rep_1',
      entityLabel: 'AR No. 0014',
      createdAt: '2026-10-17T06:02:00.000Z',
    });
    expect(summary).toBe(
      'M. Santos (Personnel in charge) narrative approved AR No. 0014 on 17 Oct 2026 at 14:02.',
    );
  });
});
