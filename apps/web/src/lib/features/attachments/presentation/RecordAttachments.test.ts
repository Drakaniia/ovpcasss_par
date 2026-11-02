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
    expect(html).toContain('Preview');
  });

  it('offers a preview for a PDF and an image, and none for an office file', () => {
    const supported = render(RecordAttachments, {
      props: {
        reportId: 'report-1',
        attachments: [
          attachment('a1', 'attendance.pdf', { mimeType: 'application/pdf' }),
          attachment('a2', 'scan.png', { mimeType: 'image/png' }),
        ],
      },
    }).body;

    expect(supported).toContain('Preview attendance.pdf');
    expect(supported).toContain('Preview scan.png');

    const sheet = render(RecordAttachments, {
      props: {
        reportId: 'report-1',
        attachments: [attachment('a1', 'students.xlsx')],
      },
    }).body;

    expect(sheet).toContain('Excel workbook');
    expect(sheet).not.toContain('Preview');
    expect(sheet).not.toContain('class="thumbnails"');
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
