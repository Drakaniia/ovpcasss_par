import type { Role } from '@par/shared';
import { describe, expect, it } from 'vitest';

import { hasSpotlightStep, resolveTourSteps } from './tour-steps';

const allTargets = () => true;

function ids(role: Role | null, hasTarget = allTargets) {
  return resolveTourSteps({ role }, { hasTarget }).map((step) => step.id);
}

describe('resolveTourSteps', () => {
  it('gives a submitter the full eight-step sequence in order', () => {
    expect(ids('SUBMITTER')).toEqual([
      'welcome',
      'primary-nav',
      'new-report',
      'search',
      'notifications',
      'account',
      'checklist',
      'finish',
    ]);
  });

  it('swaps the entry point and the checklist for each role', () => {
    expect(ids('REVIEWER')).toEqual([
      'welcome',
      'primary-nav',
      'queues',
      'search',
      'notifications',
      'account',
      'finish',
    ]);
    expect(ids('APPROVER')).toContain('queues');
    expect(ids('ADMIN')).toContain('admin');
    expect(ids('ADMIN')).not.toContain('queues');
    expect(ids('ADMIN')).not.toContain('new-report');
    expect(ids('ADMIN')).not.toContain('checklist');
  });

  it('lets the role gate win even when the anchor exists', () => {
    expect(ids('REVIEWER', () => true)).not.toContain('new-report');
    expect(ids('SUBMITTER', () => false)).toEqual(['welcome', 'finish']);
  });

  it('renumbers the surviving steps contiguously', () => {
    const steps = resolveTourSteps({ role: 'SUBMITTER' }, { hasTarget: allTargets });

    expect(steps.every((step, index) => step.position === index + 1)).toBe(true);
    expect(steps.every((step) => step.total === steps.length)).toBe(true);
    expect(steps.filter((step) => step.final).map((step) => step.id)).toEqual(['finish']);
  });

  it('reports whether anything survived to point at', () => {
    expect(
      hasSpotlightStep(resolveTourSteps({ role: 'SUBMITTER' }, { hasTarget: allTargets })),
    ).toBe(true);
    expect(
      hasSpotlightStep(resolveTourSteps({ role: 'SUBMITTER' }, { hasTarget: () => false })),
    ).toBe(false);
  });

  it('writes institutional copy with no exclamation marks', () => {
    for (const role of ['SUBMITTER', 'REVIEWER', 'APPROVER', 'ADMIN'] as const) {
      for (const step of resolveTourSteps({ role }, { hasTarget: allTargets })) {
        expect(step.title).not.toContain('!');
        expect(step.description).not.toContain('!');
        expect(step.description.length).toBeGreaterThan(0);
      }
    }
  });

  it('never names a destination the role cannot reach', () => {
    const nav = resolveTourSteps({ role: 'SUBMITTER' }, { hasTarget: allTargets }).find(
      (step) => step.id === 'primary-nav',
    );

    expect(nav?.description).toContain('Reports');
    expect(nav?.description).not.toContain('Queues');
  });
});
