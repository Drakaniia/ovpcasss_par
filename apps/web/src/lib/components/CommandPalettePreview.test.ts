import { render } from 'svelte/server';
import { describe, expect, it } from 'vitest';

import type { PalettePage, PaletteReport } from '$lib/palette/palette-entries';

import CommandPalettePreview from './CommandPalettePreview.svelte';

const REPORT: PaletteReport = {
  id: 'r1',
  href: '/reports/r1',
  referenceNo: 'AR No. 0014',
  title: 'Coastal cleanup',
  status: 'SUBMITTED',
  type: 'OFF_CAMPUS',
  picNames: 'M. Santos',
  unitName: 'College of Arts and Sciences',
  activityStartDate: '2026-03-12',
  activityEndDate: '2026-03-13',
};

const PAGE: PalettePage = {
  id: 'reports',
  label: 'Reports',
  href: '/reports',
  description: 'Your reports, drafts, and returns',
};

function renderPreview(props: {
  option: PalettePage | PaletteReport | null;
  recent?: boolean;
  query?: string;
}): string {
  return render(CommandPalettePreview, {
    props: {
      option: props.option,
      recent: props.recent ?? false,
      query: props.query ?? '',
    },
  }).body;
}

describe('CommandPalettePreview', () => {
  it('describes the selected report before it is opened', () => {
    const body = renderPreview({ option: REPORT });

    expect(body).toContain('AR No. 0014');
    expect(body).toContain('Coastal cleanup');
    expect(body).toContain('Submitted');
    expect(body).toContain('M. Santos');
    expect(body).toContain('College of Arts and Sciences');
    expect(body).toContain('12–13 Mar 2026');
    expect(body).toContain('Off-campus');
  });

  it('shows the narrative excerpt with the hit marked', () => {
    const body = renderPreview({
      option: {
        ...REPORT,
        matched: 'narrative',
        snippet: '…collected waste along the breakwater…',
      },
      query: 'breakwater',
    });

    expect(body).toContain('<mark');
    expect(body).toContain('breakwater');
    expect(body).toContain('Found in the narrative');
  });

  it('names the recent group instead of a match reason', () => {
    const body = renderPreview({ option: REPORT, recent: true });

    expect(body).toContain('Recently updated');
    expect(body).not.toContain('Matched the title');
  });

  it('previews a page destination', () => {
    const body = renderPreview({ option: PAGE });

    expect(body).toContain('Reports');
    expect(body).toContain('Your reports, drafts, and returns');
    expect(body).toContain('Enter opens this page');
  });

  it('invites a query when nothing is selected', () => {
    expect(renderPreview({ option: null })).toContain('Type two characters to search reports.');
  });
});
