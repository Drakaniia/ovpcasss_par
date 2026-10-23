import { describe, expect, it } from 'vitest';

import { REPORT_STATUSES } from '../domain/enums';
import {
  ALLOWED_TRANSITIONS,
  canTransition,
  isTerminal,
  sourcesFor,
} from './state-machine';

describe('report workflow', () => {
  it('has exactly the four states the office works with', () => {
    expect([...REPORT_STATUSES]).toEqual(['DRAFT', 'SUBMITTED', 'RETURNED', 'APPROVED']);
  });

  it('moves draft to submitted, submitted to a decision, and returned back to submitted', () => {
    expect(canTransition('DRAFT', 'SUBMITTED')).toBe(true);
    expect(canTransition('SUBMITTED', 'RETURNED')).toBe(true);
    expect(canTransition('SUBMITTED', 'APPROVED')).toBe(true);
    expect(canTransition('RETURNED', 'SUBMITTED')).toBe(true);
  });

  it('never skips a state or reopens an approved record', () => {
    expect(canTransition('DRAFT', 'APPROVED')).toBe(false);
    expect(canTransition('DRAFT', 'RETURNED')).toBe(false);
    expect(canTransition('RETURNED', 'APPROVED')).toBe(false);
    expect(ALLOWED_TRANSITIONS.APPROVED).toEqual([]);
    expect(isTerminal('APPROVED')).toBe(true);
    expect(isTerminal('SUBMITTED')).toBe(false);
  });

  it('derives the source statuses a transition accepts', () => {
    expect(sourcesFor('SUBMITTED')).toEqual(['DRAFT', 'RETURNED']);
    expect(sourcesFor('RETURNED')).toEqual(['SUBMITTED']);
    expect(sourcesFor('APPROVED')).toEqual(['SUBMITTED']);
    expect(sourcesFor('DRAFT')).toEqual([]);
  });
});
