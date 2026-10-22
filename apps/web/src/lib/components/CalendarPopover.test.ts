import { render } from 'svelte/server';
import { describe, expect, it } from 'vitest';

import CalendarPopover from './CalendarPopover.svelte';

function renderCalendar(value = '2026-03-15') {
  return render(CalendarPopover, {
    props: {
      id: 'activity-date-calendar',
      label: 'Activity date',
      value,
      onchoose: () => {},
      onclose: () => {},
    },
  }).body;
}

describe('CalendarPopover', () => {
  it('renders a labelled dialog with a 6x7 grid', () => {
    const html = renderCalendar();

    expect(html).toContain('role="dialog"');
    expect(html).toContain('aria-label="Activity date calendar"');
    expect((html.match(/role="gridcell"/g) ?? []).length).toBe(42);
  });

  it('names each day for screen readers', () => {
    expect(renderCalendar()).toContain('aria-label="15 March 2026"');
  });

  it('marks the selected day and shows its month', () => {
    const html = renderCalendar();

    expect(html).toContain('data-date="2026-03-15"');
    expect(html).toContain('aria-selected="true"');
    expect(html).toContain('March 2026');
    expect(html).toContain('aria-live="polite"');
  });

  it('offers a Today shortcut', () => {
    expect(renderCalendar()).toContain('>Today</button>');
  });

  it('opens a month and year jump from the month label', () => {
    const html = renderCalendar();

    expect(html).toMatch(/class="month[^"]*"[^>]*aria-expanded="false"/);
    expect(html).toContain('aria-controls="activity-date-calendar-jump"');
  });
});
