import { render } from 'svelte/server';
import { describe, expect, it } from 'vitest';

import SearchPreview from './SearchPreview.svelte';

describe('SearchPreview', () => {
  it('shows the not-found pane when the linked report is outside the results', () => {
    const { body } = render(SearchPreview, {
      props: {
        row: null,
        preview: { loading: false, detail: null, notFound: true, error: null },
        onretry: () => {},
        onclose: () => {},
      },
    });

    expect(body).toContain('Report not available');
    expect(body).toContain('This report does not exist or you do not have access');
    expect(body).toContain('Back to results');
    expect(body).toContain('aria-label="Close preview"');
  });
});
