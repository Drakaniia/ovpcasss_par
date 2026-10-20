import { describe, expect, it } from 'vitest';

import { summarizeAuditEvent } from './audit-summary';

describe('summarizeAuditEvent', () => {
  it('reads the recorded action back as a sentence and names what it touched', () => {
    expect(summarizeAuditEvent({ action: 'ROLE_ASSIGNED', entityType: 'user' })).toBe(
      'Role assigned · user',
    );
  });

  it('humanizes multi-word actions', () => {
    expect(summarizeAuditEvent({ action: 'LOGIN_FAILED', entityType: 'session' })).toBe(
      'Login failed · session',
    );
  });
});
