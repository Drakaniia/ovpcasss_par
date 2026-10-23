import { OFFICE_NAME } from '@par/shared';
import { unzlibSync } from 'fflate';
import { PDFDict, PDFDocument, PDFName } from 'pdf-lib';
import { describe, expect, it } from 'vitest';

import { renderFacsimilePdf, type FacsimilePdfData } from './pdf';

const facsimile: FacsimilePdfData = {
  referenceNo: 'AR No. 0001',
  title: 'Coastal cleanup',
  statusLabel: 'Approved',
  personnelName: 'J. Dela Cruz',
  classification: 'Curricular',
  campus: 'Main',
  college: 'Arts and Sciences',
  department: 'Biology',
  office: 'Student Affairs',
  level: 'Undergraduate',
  activityStartDate: '2026-03-12',
  activityEndDate: '2026-03-13',
  location: 'Brgy. Poblacion',
  activityCount: 2,
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

/** A 1x1 PNG: the smallest image a signature can be. */
const PNG = new Uint8Array([
  0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0x00, 0x00, 0x00, 0x0d, 0x49, 0x48, 0x44, 0x52,
  0x00, 0x00, 0x00, 0x01, 0x00, 0x00, 0x00, 0x01, 0x08, 0x06, 0x00, 0x00, 0x00, 0x1f, 0x15, 0xc4,
  0x89, 0x00, 0x00, 0x00, 0x0d, 0x49, 0x44, 0x41, 0x54, 0x78, 0xda, 0x63, 0xfc, 0xcf, 0xc0, 0x50,
  0x0f, 0x00, 0x04, 0x85, 0x01, 0x80, 0x84, 0xa9, 0x8c, 0x21, 0x00, 0x00, 0x00, 0x00, 0x49, 0x45,
  0x4e, 0x44, 0xae, 0x42, 0x60, 0x82,
]);

/** Counts the images the pages draw; an alpha channel adds a mask, not a picture. */
async function drawnImages(bytes: Uint8Array): Promise<number> {
  const doc = await PDFDocument.load(bytes);
  let count = 0;

  for (const page of doc.getPages()) {
    const xobjects = page.node.Resources()?.lookupMaybe(PDFName.of('XObject'), PDFDict);
    if (!xobjects) continue;

    count += xobjects.keys().length;
  }

  return count;
}

/**
 * pdf-lib deflates content streams and writes text as hex strings, so the drawn
 * copy is read back by inflating each stream and decoding each `<hex> Tj`.
 */
function latin1(bytes: Uint8Array): string {
  let text = '';
  for (const byte of bytes) text += String.fromCharCode(byte);
  return text;
}

function drawnText(bytes: Uint8Array): string {
  const raw = latin1(bytes);
  let content = '';

  for (const match of raw.matchAll(/stream\r?\n([\s\S]*?)endstream/g)) {
    const body: string = match[1] ?? '';
    const binary = Uint8Array.from(body, (char: string) => char.charCodeAt(0) & 0xff);
    try {
      content += latin1(unzlibSync(binary));
    } catch {
      // Not every stream is text; only the drawn ones matter here.
    }
  }

  return content.replace(/<([0-9A-Fa-f]+)>\s*Tj/g, (_, hex: string) => {
    let decoded = '';
    for (let index = 0; index < hex.length; index += 2) {
      decoded += String.fromCharCode(Number.parseInt(hex.slice(index, index + 2), 16));
    }
    return decoded;
  });
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
    const draft = await renderFacsimilePdf({ ...facsimile, watermark: 'NOT_SUBMITTED' });

    expect(await pageCount(draft)).toBe(1);
    // The watermark adds drawing operators, so the stored document differs.
    expect(draft.byteLength).not.toBe(plain.byteLength);
  });

  it('prints the office line from the source email', async () => {
    const text = drawnText(await renderFacsimilePdf(facsimile));

    expect(text).toContain(OFFICE_NAME);
    expect(text).not.toContain('Campus Affairs');
  });

  it('still produces a page when the narrative is empty', async () => {
    const bytes = await renderFacsimilePdf({ ...facsimile, narrative: '', attachments: [] });
    expect(await pageCount(bytes)).toBe(1);
  });

  it('embeds one image per signature slot', async () => {
    const plain = await renderFacsimilePdf(facsimile);
    const signed = await renderFacsimilePdf({
      ...facsimile,
      submitterSignature: PNG,
      approverSignature: PNG,
    });

    expect(await drawnImages(signed)).toBe(2);
    expect(signed.byteLength).toBeGreaterThan(plain.byteLength);
  });

  it('embeds no image when no signature is on file', async () => {
    expect(await drawnImages(await renderFacsimilePdf(facsimile))).toBe(0);
  });

  it('still renders when the stored image is corrupt', async () => {
    const bytes = await renderFacsimilePdf({
      ...facsimile,
      submitterSignature: new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x00, 0x00, 0x00, 0x00]),
    });

    expect(await pageCount(bytes)).toBe(1);
    expect(await drawnImages(bytes)).toBe(0);
  });
});
