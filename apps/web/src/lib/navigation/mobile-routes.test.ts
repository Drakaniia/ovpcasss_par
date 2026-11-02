import { describe, expect, it } from 'vitest';

import { mobileShell } from './mobile-routes';

describe('mobile shell routes', () => {
  it('covers the record and the create and edit wizard', () => {
    expect(mobileShell('/reports/new', 'ADMIN')).toBe(true);
    expect(mobileShell('/reports/rep_1', 'PERSONNEL')).toBe(true);
    expect(mobileShell('/reports/rep_1/edit', 'ADMIN')).toBe(true);
  });

  it('keeps the office register and the other sections on desktop', () => {
    expect(mobileShell('/reports', 'ADMIN')).toBe(false);
    expect(mobileShell('/search', 'ADMIN')).toBe(false);
    expect(mobileShell('/admin/users', 'ADMIN')).toBe(false);
    expect(mobileShell('/profile', 'PERSONNEL')).toBe(false);
  });

  it('gives home to the personnel account only', () => {
    expect(mobileShell('/', 'PERSONNEL')).toBe(true);
    expect(mobileShell('/', null)).toBe(true);
    expect(mobileShell('/', 'ADMIN')).toBe(false);
  });

  it('ignores a trailing slash', () => {
    expect(mobileShell('/reports/rep_1/', 'PERSONNEL')).toBe(true);
    expect(mobileShell('/reports/', 'ADMIN')).toBe(false);
  });

  it('does not match a deeper path below a report', () => {
    expect(mobileShell('/reports/rep_1/receipts', 'PERSONNEL')).toBe(false);
  });
});
