import { render } from 'svelte/server';
import { describe, expect, it } from 'vitest';

import DatePicker from './DatePicker.svelte';

function renderPicker(props: Record<string, unknown> = {}) {
  return render(DatePicker, {
    props: {
      id: 'activity-date',
      label: 'Activity date',
      value: '2026-03-15',
      onchange: () => {},
      ...props,
    },
  }).body;
}

describe('DatePicker', () => {
  it('shows the value in DD MMM YYYY in the text input', () => {
    const html = renderPicker();

    expect(html).toContain('value="15 Mar 2026"');
    expect(html).toContain('placeholder="DD MMM YYYY"');
  });

  it('names the trigger and marks the popup relationship', () => {
    const html = renderPicker();

    expect(html).toContain('aria-label="Choose activity date"');
    expect(html).toContain('aria-haspopup="dialog"');
    expect(html).toContain('aria-controls="activity-date-calendar"');
    expect(html).toContain('aria-expanded="false"');
  });

  it('is closed on server render', () => {
    expect(renderPicker()).not.toContain('role="dialog"');
  });

  it('marks the input invalid and described only when asked', () => {
    const html = renderPicker({ invalid: true, describedBy: 'activity-date-error' });

    expect(html).toContain('aria-invalid="true"');
    expect(html).toContain('aria-describedby="activity-date-error"');
  });

  it('renders an empty field when there is no value', () => {
    const html = renderPicker({ value: '' });

    expect(html).toContain('value=""');
    expect(html).not.toContain('aria-invalid');
  });
});
