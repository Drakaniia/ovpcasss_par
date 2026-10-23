import { describe, expect, it } from 'vitest';

import { REPORT_STATUSES } from '../domain/enums';
import { ALLOWED_TRANSITIONS, canTransition, isTerminal, sourcesFor } from './state-machine';

describe('report workflow', () => {
  it('has exactly the four states the office works with', () => {
    expect([...REPORT_STATUSES]).toEqual(['PENDING', 'SUBMITTED', 'RETURNED', 'APPROVED']);
  });

  it('moves pending to submitted, submitted to a decision, and returned back to submitted', () => {
    expect(canTransition('PENDING', 'SUBMITTED')).toBe(true);
    expect(canTransition('SUBMITTED', 'RETURNED')).toBe(true);
    expect(canTransition('SUBMITTED', 'APPROVED')).toBe(true);
    expect(canTransition('RETURNED', 'SUBMITTED')).toBe(true);
  });

  it('never skips a state or reopens an approved record', () => {
    expect(canTransition('PENDING', 'APPROVED')).toBe(false);
    expect(canTransition('PENDING', 'RETURNED')).toBe(false);
    expect(canTransition('RETURNED', 'APPROVED')).toBe(false);
    expect(ALLOWED_TRANSITIONS.APPROVED).toEqual([]);
    expect(isTerminal('APPROVED')).toBe(true);
    expect(isTerminal('SUBMITTED')).toBe(false);
  });

  it('derives the source statuses a transition accepts', () => {
    expect(sourcesFor('SUBMITTED')).toEqual(['PENDING', 'RETURNED']);
    expect(sourcesFor('RETURNED')).toEqual(['SUBMITTED']);
    expect(sourcesFor('APPROVED')).toEqual(['SUBMITTED']);
    expect(sourcesFor('PENDING')).toEqual([]);
  });
});
