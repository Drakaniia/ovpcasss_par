import type { Role } from '@par/shared';
import { describe, expect, it } from 'vitest';

import { hasSpotlightStep, resolveTourSteps } from './tour-steps';

const allTargets = () => true;

function ids(role: Role | null, hasTarget = allTargets) {
  return resolveTourSteps({ role }, { hasTarget }).map((step) => step.id);
}

describe('resolveTourSteps', () => {
  it('gives personnel in charge the assignment tour, without a create step', () => {
    expect(ids('PERSONNEL')).toEqual([
      'welcome',
      'primary-nav',
      'search',
      'notifications',
      'account',
      'finish',
    ]);
  });

  it('gives the administrator the record-creation step', () => {
    expect(ids('ADMIN')).toEqual([
      'welcome',
      'primary-nav',
      'new-record',
      'admin',
      'search',
      'notifications',
      'account',
      'finish',
    ]);
    expect(ids('ADMIN')).not.toContain('checklist');
    expect(ids('PERSONNEL')).not.toContain('admin');
    expect(ids('PERSONNEL')).not.toContain('new-record');
  });

  it('lets the role gate win even when the anchor exists', () => {
    expect(ids('PERSONNEL', () => true)).not.toContain('new-record');
    expect(ids('PERSONNEL', () => false)).toEqual(['welcome', 'finish']);
  });

  it('renumbers the surviving steps contiguously', () => {
    const steps = resolveTourSteps({ role: 'PERSONNEL' }, { hasTarget: allTargets });

    expect(steps.every((step, index) => step.position === index + 1)).toBe(true);
    expect(steps.every((step) => step.total === steps.length)).toBe(true);
    expect(steps.filter((step) => step.final).map((step) => step.id)).toEqual(['finish']);
  });

  it('reports whether anything survived to point at', () => {
    expect(
      hasSpotlightStep(resolveTourSteps({ role: 'PERSONNEL' }, { hasTarget: allTargets })),
    ).toBe(true);
    expect(
      hasSpotlightStep(resolveTourSteps({ role: 'PERSONNEL' }, { hasTarget: () => false })),
    ).toBe(false);
  });

  it('writes institutional copy with no exclamation marks', () => {
    for (const role of ['PERSONNEL', 'ADMIN'] as const) {
      for (const step of resolveTourSteps({ role }, { hasTarget: allTargets })) {
        expect(step.title).not.toContain('!');
        expect(step.description).not.toContain('!');
        expect(step.description.length).toBeGreaterThan(0);
      }
    }
  });

  it('never names a destination the role cannot reach', () => {
    const nav = resolveTourSteps({ role: 'PERSONNEL' }, { hasTarget: allTargets }).find(
      (step) => step.id === 'primary-nav',
    );

    expect(nav?.description).toContain('Reports');
    expect(nav?.description).not.toContain('Admin');
    expect(nav?.description).not.toContain('Queues');
  });
});
