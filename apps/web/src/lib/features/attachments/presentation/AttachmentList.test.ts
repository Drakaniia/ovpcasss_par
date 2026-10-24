import { render } from 'svelte/server';
import { describe, expect, it } from 'vitest';

import type { AttachmentItem } from '../application/attachment-items';
import AttachmentList from './AttachmentList.svelte';

const FAILED: AttachmentItem = {
  key: 'row-1',
  id: null,
  fileName: 'attendance.pdf',
  size: 2048,
  mimeType: 'application/pdf',
  label: '',
  status: 'FAILED',
  progress: 0,
  error: 'This report cannot accept new files.',
};

const CONFIRMED: AttachmentItem = { ...FAILED, status: 'CONFIRMED', progress: 100, id: 'a1' };

const handlers = {
  onlabel: () => {},
  onretry: () => {},
  onremove: () => {},
  onpreview: () => {},
};

function body(items: AttachmentItem[]): string {
  return render(AttachmentList, { props: { items, labelOptions: [], ...handlers } }).body;
}

describe('AttachmentList', () => {
  it('offers Retry and a named Discard on a failed row', () => {
    const html = body([FAILED]);

    expect(html).toContain('Retry');
    expect(html).toContain('Discard');
    expect(html).toContain('aria-label="Discard attendance.pdf"');
    // Discard is the only removal path for a failed row; no second trash icon.
    expect(html).not.toContain('aria-label="Remove attendance.pdf"');
  });

  it('names the reason the upload failed', () => {
    expect(body([FAILED])).toContain('This report cannot accept new files.');
  });

  it('keeps the Remove confirmation path for a confirmed row', () => {
    const html = body([CONFIRMED]);

    expect(html).toContain('aria-label="Remove attendance.pdf"');
    expect(html).not.toContain('Discard');
  });
});
