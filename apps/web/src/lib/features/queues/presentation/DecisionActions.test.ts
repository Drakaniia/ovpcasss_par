import { render } from 'svelte/server';
import { describe, expect, it } from 'vitest';

import type { DecisionButton } from '../application/queue-decisions';
import DecisionActions from './DecisionActions.svelte';

const buttons: DecisionButton[] = [
  { action: 'ENDORSE', label: 'Endorse', tone: 'primary', enabled: true },
  { action: 'RETURN', label: 'Return', tone: 'danger', enabled: true },
];

describe('DecisionActions', () => {
  it('renders a navy Endorse and a maroon Return, with the shortcut hints', () => {
    const { body } = render(DecisionActions, {
      props: { buttons, ondecide: () => {}, shortcuts: true },
    });

    expect(body).toContain('btn-primary');
    expect(body).toContain('btn-danger');
    expect(body).toContain('Endorse');
    expect(body).toContain('Return');
    // Every shortcut has a visible button, and the key that fires it is shown.
    expect(body).toContain('kbd');
  });

  it('states a disabled reason next to the button instead of hiding it in a tooltip', () => {
    const blocked: DecisionButton[] = buttons.map((button) => ({
      ...button,
      enabled: false,
      reason: 'Attachments are still uploading.',
    }));

    const { body } = render(DecisionActions, { props: { buttons: blocked, ondecide: () => {} } });

    expect(body).toContain('disabled');
    expect(body).toContain('Attachments are still uploading.');
    // The shared reason is written once, not twice.
    expect(body.split('Attachments are still uploading.').length - 1).toBe(1);
  });

  it('renders the note when this role has no decision to make', () => {
    const { body } = render(DecisionActions, {
      props: {
        buttons: [],
        blocked: 'This report is no longer awaiting your review.',
        ondecide: () => {},
      },
    });

    expect(body).toContain('This report is no longer awaiting your review.');
    expect(body).not.toContain('btn-primary');
  });
});
