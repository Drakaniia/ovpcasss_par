import { render } from 'svelte/server';
import { describe, expect, it } from 'vitest';

import HowItWorksPage from './HowItWorksPage.svelte';

function renderPage() {
  return render(HowItWorksPage).body;
}

describe('HowItWorksPage', () => {
  it('lists every stage as a tab and opens on the first', () => {
    const html = renderPage();

    expect(html).toContain('role="tablist"');
    expect((html.match(/role="tab"/g) ?? []).length).toBe(4);
    expect(html).toContain('aria-selected="true"');
    expect(html).toContain('id="stage-tab-prepare"');
  });

  it('explains the open stage with real status badges', () => {
    const html = renderPage();

    expect(html).toContain('role="tabpanel"');
    expect(html).toContain('aria-labelledby="stage-tab-prepare"');
    expect(html).toContain('Report status at this stage');
    expect(html).toContain('>Draft<');
  });

  it('offers the one primary action the screen needs', () => {
    const html = renderPage();

    expect((html.match(/btn-primary/g) ?? []).length).toBe(1);
    expect(html).toContain('href="/reports/new"');
  });
});
