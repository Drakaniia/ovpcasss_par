import { render } from 'svelte/server';
import { describe, expect, it } from 'vitest';

import type { EmailTemplateSummary } from '@par/shared';

import EmailMessageList from './EmailMessageList.svelte';

const ITEMS: EmailTemplateSummary[] = [
  {
    kind: 'ASSIGNED',
    label: 'Assigned',
    audience: 'Every personnel in charge named on the record',
    edited: true,
    unreadable: false,
    subject: '[OVPCASSS PAR] AR No. 0001 — you are the personnel in charge',
    updatedAt: '2026-11-02T06:20:00.000Z',
    updatedByName: 'A. Reyes',
  },
  {
    kind: 'SUBMITTED',
    label: 'Submitted',
    audience: 'The office',
    edited: false,
    unreadable: false,
    subject: '[OVPCASSS PAR] AR No. 0001 — narrative report ready for review',
    updatedAt: null,
    updatedByName: null,
  },
];

function renderList(active: EmailTemplateSummary['kind'] = 'ASSIGNED') {
  return render(EmailMessageList, {
    props: { items: ITEMS, active, onselect: () => {} },
  });
}

describe('EmailMessageList', () => {
  it('shows Default or Edited plus who last changed it', () => {
    const { body } = renderList();

    expect(body).toContain('Assigned');
    expect(body).toContain('Edited');
    expect(body).toContain('by A. Reyes');
    expect(body).toContain('Submitted');
    expect(body).toContain('Default');
  });

  it('marks the open message with aria-current exactly once', () => {
    const { body } = renderList('SUBMITTED');

    expect(body.match(/aria-current="true"/g)).toHaveLength(1);
    expect(body).toContain('The office');
  });
});
