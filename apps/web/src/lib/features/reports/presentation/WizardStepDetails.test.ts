import { render } from 'svelte/server';
import { describe, expect, it, vi } from 'vitest';

import { RecordFormState } from '../application/record-state.svelte';
import WizardStepDetails from './WizardStepDetails.svelte';

/**
 * Step 2 (todo: multiple location input): the Location field is a list of
 * venues, not one text box, and its error still lands on the field.
 */
function renderStep(locations: readonly string[]): string {
  vi.stubGlobal('document', { getElementById: () => null });
  const state = new RecordFormState({ mode: 'create' });
  state.patchForm({ locations: [...locations] });

  return render(WizardStepDetails, { props: { state } }).body;
}

describe('WizardStepDetails location field', () => {
  it('renders one venue row per location and the add button', () => {
    const html = renderStep(['Brgy. Casisang', 'Malaybalay City']);

    expect(html).toContain('id="wiz-location"');
    expect(html).toContain('id="wiz-location-2"');
    expect(html).toContain('value="Malaybalay City"');
    expect(html).toContain('Add location');
  });

  it('shows the field error on the location rows', () => {
    vi.stubGlobal('document', { getElementById: () => null });
    const state = new RecordFormState({ mode: 'create' });
    state.errors = { locations: 'Enter at least one location.' };

    const html = render(WizardStepDetails, { props: { state } }).body;

    expect(html).toContain('Enter at least one location.');
    expect(html).toContain('aria-invalid="true"');
  });
});
