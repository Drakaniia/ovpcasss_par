import { render } from 'svelte/server';
import { describe, expect, it } from 'vitest';

import LocationRows from './LocationRows.svelte';

function renderRows(locations: readonly string[]): string {
  return render(LocationRows, {
    props: {
      id: 'wiz-location',
      label: 'Location',
      locations,
      onchange: () => {},
      onadd: () => {},
      onremove: () => {},
    },
  }).body;
}

describe('LocationRows', () => {
  it('renders one combobox for the first venue and the add button', () => {
    const html = renderRows(['Brgy. Poblacion']);

    expect(html).toContain('id="wiz-location"');
    expect(html).toContain('Add location');
    expect(html).not.toContain('Remove location');
  });

  it('numbers each added venue and lets it be removed', () => {
    const html = renderRows(['Brgy. Poblacion', 'Malaybalay City']);

    expect(html).toContain('id="wiz-location-2"');
    expect(html).toContain('value="Malaybalay City"');
    expect(html).toContain('aria-label="Remove location 2"');
  });
});
