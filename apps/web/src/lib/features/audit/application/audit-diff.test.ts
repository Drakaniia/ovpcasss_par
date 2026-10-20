import { describe, expect, it } from 'vitest';

import { computeDiff, formatDiffValue, isSecretKey } from './audit-diff';

describe('audit-diff', () => {
  it('detects secret keys', () => {
    expect(isSecretKey('password')).toBe(true);
    expect(isSecretKey('passwordHash')).toBe(true);
    expect(isSecretKey('token')).toBe(true);
    expect(isSecretKey('refreshToken')).toBe(true);
    expect(isSecretKey('secret')).toBe(true);
    expect(isSecretKey('signedUrl')).toBe(true);
    expect(isSecretKey('signature')).toBe(true);
    expect(isSecretKey('title')).toBe(false);
    expect(isSecretKey('status')).toBe(false);
  });

  it('formats diff values for humans', () => {
    expect(formatDiffValue(null)).toBe('—');
    expect(formatDiffValue(undefined)).toBe('—');
    expect(formatDiffValue('')).toBe('—');
    expect(formatDiffValue(true)).toBe('true');
    expect(formatDiffValue(false)).toBe('false');
    expect(formatDiffValue(123)).toBe('123');
    expect(formatDiffValue('Hello')).toBe('Hello');
    expect(formatDiffValue(['One', 'Two'])).toBe('1. One\n2. Two');
  });

  it('flattens nested objects with dotted keys and separates changed vs unchanged', () => {
    const before = {
      title: 'Old Title',
      status: 'DRAFT',
      settings: {
        active: true,
        nested: {
          flag: 'A',
        },
      },
      tags: ['tag1'],
    };

    const after = {
      title: 'New Title',
      status: 'DRAFT',
      settings: {
        active: false,
        nested: {
          flag: 'A',
        },
      },
      tags: ['tag1', 'tag2'],
    };

    const diff = computeDiff(before, after);
    expect(diff.hasChanges).toBe(true);

    const changedKeys = diff.changed.map((entry) => entry.key);
    expect(changedKeys).toContain('title');
    expect(changedKeys).toContain('settings.active');
    expect(changedKeys).toContain('tags');

    const unchangedKeys = diff.unchanged.map((entry) => entry.key);
    expect(unchangedKeys).toContain('status');
    expect(unchangedKeys).toContain('settings.nested.flag');
  });

  it('redacts secret values even if raw object leaked them', () => {
    const before = { password: 'old_secret' };
    const after = { password: 'new_secret' };

    const diff = computeDiff(before, after);
    expect(diff.changed[0].before).toBe('[redacted]');
    expect(diff.changed[0].after).toBe('[redacted]');
  });

  it('reports hasChanges as false when no fields exist', () => {
    expect(computeDiff(null, null).hasChanges).toBe(false);
    expect(computeDiff({}, {}).hasChanges).toBe(false);
  });
});
