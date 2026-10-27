import { render } from 'svelte/server';
import { describe, expect, it } from 'vitest';

import RecordPdfPreview from './RecordPdfPreview.svelte';

describe('RecordPdfPreview', () => {
  it('names the record and holds the download until the PDF has loaded', () => {
    const { body } = render(RecordPdfPreview, {
      props: { reportId: 'report-1', referenceNo: 'AR No. 0001', onclose: () => {} },
    });

    expect(body).toContain('Report facsimile');
    expect(body).toContain('AR No. 0001');
    expect(body).toContain('Preparing the record…');
    expect(body).toContain('Download PDF');
    expect(body).toMatch(/<button[^>]*disabled[^>]*>[\s\S]*Download PDF/);
    expect(body).not.toContain('<iframe');
  });

  it('offers a keyboard-reachable close, not only the backdrop', () => {
    const { body } = render(RecordPdfPreview, {
      props: { reportId: 'report-1', referenceNo: 'AR No. 0001', onclose: () => {} },
    });

    expect(body).toContain('aria-label="Close"');
  });
});
