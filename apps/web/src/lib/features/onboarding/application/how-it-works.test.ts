import { REPORT_STATUSES } from '@par/shared';
import { describe, expect, it } from 'vitest';

import { EXPLAINED_STATUSES, WORKFLOW_STAGES } from './how-it-works';

describe('workflow explainer', () => {
  it('covers every API status exactly once', () => {
    expect([...EXPLAINED_STATUSES].sort()).toEqual([...REPORT_STATUSES].sort());
    expect(new Set(EXPLAINED_STATUSES).size).toBe(EXPLAINED_STATUSES.length);
  });

  it('reads from the first draft to final approval', () => {
    expect(WORKFLOW_STAGES.map((stage) => stage.key)).toEqual([
      'prepare',
      'submit',
      'review',
      'approve',
    ]);
    expect(WORKFLOW_STAGES[0].statuses).toEqual(['DRAFT']);
    expect(WORKFLOW_STAGES[WORKFLOW_STAGES.length - 1].statuses).toContain('APPROVED');
  });

  it('names an owner and explains what happens at every stage', () => {
    for (const stage of WORKFLOW_STAGES) {
      expect(stage.owner).not.toBe('');
      expect(stage.summary.length).toBeGreaterThan(20);
      expect(stage.points.length).toBeGreaterThanOrEqual(2);
      expect(stage.mail).not.toBe('');
    }
  });
});
