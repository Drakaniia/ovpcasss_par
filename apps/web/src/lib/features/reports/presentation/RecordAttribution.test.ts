import { render } from 'svelte/server';
import { describe, expect, it } from 'vitest';

import RecordAttribution from './RecordAttribution.svelte';

describe('record attribution', () => {
  it('shows creator, first editor, last editor, and submitter with timestamps', () => {
    const person = (fullName: string) => ({
      fullName,
      role: 'PERSONNEL' as const,
      actedAt: '2026-03-14T01:12:00.000Z',
    });
    const { body } = render(RecordAttribution, {
      props: {
        people: {
          createdBy: person('Creator One'),
          personnel: [],
          firstEditedBy: person('Editor Two'),
          lastEditedBy: person('Editor Three'),
          submittedBy: person('Submitter Four'),
        },
      },
    });
    for (const text of [
      'Created by',
      'First edited by',
      'Last edited by',
      'Submitted by',
      'Creator One',
      'Editor Two',
      'Editor Three',
      'Submitter Four',
    ]) {
      expect(body).toContain(text);
    }
    expect(body.match(/datetime=/g)).toHaveLength(4);
  });

  it('does not invent an editor or submitter for a new record', () => {
    const { body } = render(RecordAttribution, {
      props: { people: { createdBy: { fullName: 'Creator', role: 'ADMIN' }, personnel: [] } },
    });
    expect(body).toContain('Not edited');
    expect(body).toContain('Not submitted');
  });
});
