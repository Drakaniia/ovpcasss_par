import type { Attachment } from '@par/shared';
import { render } from 'svelte/server';
import { describe, expect, it } from 'vitest';

import RecordAttachments from './RecordAttachments.svelte';

function attachment(
  id: string,
  originalName: string,
  overrides: Partial<Attachment> = {},
): Attachment {
  return {
    id,
    reportId: 'report-1',
    label: '',
    originalName,
    size: 4096,
    mimeType: 'application/octet-stream',
    status: 'CONFIRMED',
    ...overrides,
  };
}

describe('RecordAttachments', () => {
  it('says so when nothing was attached', () => {
    const html = render(RecordAttachments, {
      props: { reportId: 'report-1', attachments: [] },
    }).body;

    expect(html).toContain('No attachments were submitted with this report.');
    expect(html).not.toContain('<ul');
  });

  it('lists a submitted file with its type and size', () => {
    const html = render(RecordAttachments, {
      props: {
        reportId: 'report-1',
        attachments: [attachment('a1', 'attendance.pdf', { mimeType: 'application/pdf' })],
      },
    }).body;

    expect(html).toContain('attendance.pdf');
    expect(html).toContain('PDF document');
    expect(html).toContain('4 KB');
    expect(html).toContain('Download');
    expect(html).toContain('Open');
  });

  it('offers no preview for an office file', () => {
    const html = render(RecordAttachments, {
      props: {
        reportId: 'report-1',
        attachments: [attachment('a1', 'students.xlsx')],
      },
    }).body;

    expect(html).toContain('Excel workbook');
    expect(html).not.toContain('Preview');
    expect(html).not.toContain('thumbnails');
  });

  it('marks a file that is not confirmed yet', () => {
    const html = render(RecordAttachments, {
      props: {
        reportId: 'report-1',
        attachments: [attachment('a1', 'scan.png', { status: 'PENDING', mimeType: 'image/png' })],
      },
    }).body;

    expect(html).toContain('Pending upload');
    expect(html).not.toContain('Download');
  });

  it('renders no dialog until an image is opened', () => {
    const html = render(RecordAttachments, {
      props: {
        reportId: 'report-1',
        attachments: [attachment('a1', 'scan.png', { mimeType: 'image/png' })],
      },
    }).body;

    expect(html).not.toContain('<dialog');
  });
});
