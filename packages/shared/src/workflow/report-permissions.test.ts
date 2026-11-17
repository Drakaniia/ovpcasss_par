import { describe, expect, it } from 'vitest';

import { REPORT_STATUSES } from '../domain/enums';
import { canAuthorReport, canEditReport, canSubmitReport } from './report-permissions';

describe('shared office report permissions', () => {
  it.each(['ADMIN', 'PERSONNEL'] as const)(
    'allows %s content edits in every status without resubmission',
    (role) => {
      for (const status of REPORT_STATUSES) {
        expect(canEditReport(role, status)).toBe(true);
        expect(canSubmitReport(role, status)).toBe(status === 'PENDING' || status === 'RETURNED');
      }
    },
  );
  it('rejects missing and retired roles', () => {
    for (const role of [null, undefined, 'REVIEWER' as never]) {
      expect(canAuthorReport(role)).toBe(false);
      expect(canEditReport(role, 'APPROVED')).toBe(false);
      expect(canSubmitReport(role, 'PENDING')).toBe(false);
    }
  });
});
