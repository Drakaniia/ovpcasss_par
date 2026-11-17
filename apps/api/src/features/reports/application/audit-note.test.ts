import { describe, expect, it } from 'vitest';

import { auditNote } from './audit-note';
import { activitySnapshot } from './change-summary';

describe('report audit payloads', () => {
  it('shows only the note in the compact timeline, not the full narrative', () => {
    expect(
      auditNote(JSON.stringify({ before: { narrative: 'Private words' }, note: 'AR No. 0001' })),
    ).toBe('AR No. 0001');
    expect(auditNote('Historical note')).toBe('Historical note');
    expect(auditNote('{"after":{}}')).toBe('Change recorded');
  });

  it('captures activity facts and lists, never narrative or storage keys', () => {
    const snapshot = activitySnapshot(
      {
        title: 'Changed title',
        narrative: 'Private words',
        narrativeSignatureKey: 'secret-key',
      } as never,
      [{ name: 'PIC', email: null }],
      ['sdg1'],
    );
    expect(snapshot.title).toBe('Changed title');
    expect(snapshot.pics).toEqual([{ name: 'PIC', email: null, phone: null }]);
    expect(snapshot.sdgIds).toEqual(['sdg1']);
    expect(snapshot).not.toHaveProperty('narrative');
    expect(snapshot).not.toHaveProperty('narrativeSignatureKey');
  });
});
