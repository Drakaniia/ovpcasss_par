import { PDFDocument } from 'pdf-lib';
import { describe, expect, it } from 'vitest';

import { formatAcknowledgementDate, renderAcknowledgement } from '../acknowledgement/pdf';
import { renderFacsimilePdf, type FacsimilePdfData } from './pdf';

const facsimile: FacsimilePdfData = {
  trackingNumber: 'OFF-2026-0014',
  title: 'Coastal cleanup',
  statusLabel: 'Approved',
  submitterName: 'J. Dela Cruz',
  classification: 'Curricular',
  campus: 'Main',
  college: 'Arts and Sciences',
  department: 'Biology',
  office: 'Student Affairs',
  level: 'Undergraduate',
  activityStartDate: '2026-03-12',
  activityEndDate: '2026-03-13',
  location: 'Brgy. Poblacion',
  totalStudents: 42,
  totalPic: 3,
  pics: [{ name: 'J. Dela Cruz', email: 'j@example.edu', phone: null }],
  sdgNumbers: [4, 14],
  narrative: 'The activity gathered students for a coastal cleanup along the barangay shoreline.',
  attachments: [{ label: 'Attendance sheet', originalName: 'attendance.pdf' }],
  watermark: 'NONE',
  generatedAt: '2026-10-17T06:02:00.000Z',
  approvedByName: 'M. Santos',
  approvedAt: '2026-03-17T02:02:00.000Z',
};

async function pageCount(bytes: Uint8Array): Promise<number> {
  return (await PDFDocument.load(bytes)).getPageCount();
}

describe('renderFacsimilePdf', () => {
  it('writes a valid A4 PDF', async () => {
    const bytes = await renderFacsimilePdf(facsimile);
    const doc = await PDFDocument.load(bytes);
    const page = doc.getPage(0);

    expect(String.fromCharCode(...bytes.slice(0, 4))).toBe('%PDF');
    expect(doc.getPageCount()).toBe(1);
    expect(page.getWidth()).toBeCloseTo(595.28, 1);
    expect(page.getHeight()).toBeCloseTo(841.89, 1);
  });

  it('draws a watermark for a non-approved report', async () => {
    const plain = await renderFacsimilePdf(facsimile);
    const draft = await renderFacsimilePdf({ ...facsimile, watermark: 'DRAFT' });

    expect(await pageCount(draft)).toBe(1);
    // The watermark adds drawing operators, so the stored document differs.
    expect(draft.byteLength).not.toBe(plain.byteLength);
  });

  it('still produces a page when the narrative is empty', async () => {
    const bytes = await renderFacsimilePdf({ ...facsimile, narrative: '', attachments: [] });
    expect(await pageCount(bytes)).toBe(1);
  });
});

describe('renderAcknowledgement', () => {
  it('renders the approval facts and a blank signature line', async () => {
    const bytes = await renderAcknowledgement({
      trackingNumber: 'OFF-2026-0014',
      title: 'Coastal cleanup',
      approverName: 'M. Santos',
      approvedAt: '2026-03-17T02:02:00.000Z',
      signatureImage: null,
    });

    expect(await pageCount(bytes)).toBe(1);
    expect(formatAcknowledgementDate('2026-03-17T02:02:00.000Z')).toBe('17 March 2026');
  });
});
