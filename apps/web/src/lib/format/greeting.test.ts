import { describe, expect, it } from 'vitest';

import { greetingFor } from './greeting';

describe('greetingFor', () => {
  it('uses Asia/Manila time, not the viewer clock', () => {
    // 23:30 UTC is 07:30 in Manila.
    expect(greetingFor(new Date('2026-03-20T23:30:00Z'))).toBe('Good morning');
  });

  it('switches at noon and at 18:00', () => {
    expect(greetingFor(new Date('2026-03-20T03:59:00Z'))).toBe('Good morning');
    expect(greetingFor(new Date('2026-03-20T04:00:00Z'))).toBe('Good afternoon');
    expect(greetingFor(new Date('2026-03-20T09:59:00Z'))).toBe('Good afternoon');
    expect(greetingFor(new Date('2026-03-20T10:00:00Z'))).toBe('Good evening');
  });
});
