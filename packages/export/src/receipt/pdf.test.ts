import fontkit from '@pdf-lib/fontkit';
import { PDFArray, PDFDict, PDFDocument, PDFName } from 'pdf-lib';
import { describe, expect, it } from 'vitest';

import { PAGELLA_BOLD_OTF_BASE64, PAGELLA_REGULAR_OTF_BASE64 } from './fonts';
import { CONTENT, COPY_OFFSET, buildReceipt, type ReceiptData, type ReceiptOp } from './layout';
import { decodeBase64, pageFontMetrics, renderReceipt } from './pdf';

const data: ReceiptData = {
  referenceNo: 'AR No. 0001',
  recipientName: '[Name of Personnel In charge]',
  title: '[Title of the activity]',
  type: 'OFF_CAMPUS',
  activityStartDate: '2026-10-21',
  activityEndDate: '2026-10-21',
  location: '[Location]',
  approvedAt: '2026-10-25T04:00:00.000Z',
  signatoryName: 'DR. LINCOLN V. TAN',
  signatoryTitle: 'VPCASSS',
};

function latin1(bytes: Uint8Array): string {
  let text = '';
  for (const byte of bytes) text += String.fromCharCode(byte);
  return text;
}

/** The faces the page draws with, each with its own outline program embedded. */
function embeddedFaces(doc: PDFDocument): string[] {
  const fontDict = doc.getPage(0).node.Resources()?.lookup(PDFName.of('Font'), PDFDict);
  expect(fontDict).toBeDefined();
  const faces = new Set<string>();

  for (const ref of fontDict?.values() ?? []) {
    const font = doc.context.lookup(ref, PDFDict);
    const base = font.get(PDFName.of('BaseFont'))?.toString() ?? '';
    faces.add(base);

    const descendants = font.lookup(PDFName.of('DescendantFonts'), PDFArray);
    const descendant = doc.context.lookup(descendants.get(0), PDFDict);
    const descriptor = descendant.lookup(PDFName.of('FontDescriptor'), PDFDict);
    const program =
      descriptor.get(PDFName.of('FontFile2')) ?? descriptor.get(PDFName.of('FontFile3'));
    expect(program, `${base} embeds its own outline program`).toBeDefined();
  }

  return [...faces];
}

async function measuredOps(): Promise<{
  ops: ReceiptOp[];
  width: (value: string, font: 'regular' | 'bold', size: number) => number;
}> {
  const doc = await PDFDocument.create();
  doc.registerFontkit(fontkit);
  const regular = await doc.embedFont(decodeBase64(PAGELLA_REGULAR_OTF_BASE64));
  const bold = await doc.embedFont(decodeBase64(PAGELLA_BOLD_OTF_BASE64));
  const metrics = pageFontMetrics(regular, bold);

  return { ops: buildReceipt(data, metrics), width: metrics.width };
}

describe('renderReceipt', () => {
  it('renders one A4 page with the embedded faces and both letterheads', async () => {
    const bytes = await renderReceipt(data);
    const doc = await PDFDocument.load(bytes);
    const page = doc.getPage(0);

    expect(doc.getPageCount()).toBe(1);
    expect(page.getWidth()).toBeCloseTo(595.32, 2);
    expect(page.getHeight()).toBeCloseTo(841.92, 2);

    const faces = embeddedFaces(doc);
    expect(faces.some((face) => face.includes('TeXGyrePagella-Regular'))).toBe(true);
    expect(faces.some((face) => face.includes('TeXGyrePagella-Bold'))).toBe(true);
    expect(faces.some((face) => face.includes('Helvetica') || face.includes('Times'))).toBe(false);

    const raw = latin1(bytes);
    expect(raw).toContain('/DCTDecode');
    expect(raw).toContain('/FlateDecode');
    expect(raw).not.toContain('Helvetica');
  });
});

describe('the measured form', () => {
  it('justifies the letter to the form measure and breaks at off-campus', async () => {
    const { ops, width } = await measuredOps();
    const words = ops.filter(
      (op): op is Extract<ReceiptOp, { kind: 'text' }> => op.kind === 'text',
    );

    const firstLine = words.filter((op) => Math.abs(op.baseline - 135.74) < 0.01);
    expect(firstLine.at(-1)?.text).toBe('off-');

    const last = firstLine.at(-1);
    expect(last).toBeDefined();
    if (last) {
      const end = last.x + width(last.text, last.font, last.size);
      expect(end).toBeCloseTo(CONTENT.left + CONTENT.width, 1);
    }

    const secondLine = words.filter((op) => Math.abs(op.baseline - 148.22) < 0.01);
    const secondText = secondLine.map((op) => op.text).join(' ');
    expect(secondText.split(' ')[0]).toBe('campus');
    expect(secondText).toBe('campus activity conducted on 21 October 2026 at [Location].');
  });

  it('keeps the heading, signature block and footer on the form baselines', async () => {
    const { ops } = await measuredOps();
    const at = (value: string) =>
      ops.find(
        (op): op is Extract<ReceiptOp, { kind: 'text' }> => op.kind === 'text' && op.text === value,
      );

    /**
     * Word's own line advance wobbles by up to 0.12 pt between lines of the
     * form (12.36 against 12.48), so the copy is matched to a fifth of a point —
     * 0.07 mm on paper, well under a printed pixel.
     */
    const onForm = (actual: number | undefined, expected: number) => {
      expect(actual).toBeDefined();
      expect(Math.abs((actual ?? 0) - expected)).toBeLessThan(0.2);
    };

    onForm(at('ACKNOWLEDGMENT RECEIPT')?.baseline, 86.66);
    onForm(at('Sincerely,')?.baseline, 309.77);
    onForm(at('DR. LINCOLN V. TAN')?.baseline, 333.53);
    onForm(at('VPCASSS')?.baseline, 344.57);
    onForm(at('AR No. 0001')?.baseline, 368.93);
    onForm(at('Document Code: OVPCASSS-F-013')?.baseline, 385.85);
  });

  it('repeats the whole letter a second time, 393.89 pt lower on the same page', async () => {
    const { ops } = await measuredOps();
    const at = (value: string) =>
      ops.filter(
        (op): op is Extract<ReceiptOp, { kind: 'text' }> => op.kind === 'text' && op.text === value,
      );

    const headings = at('ACKNOWLEDGMENT RECEIPT');
    expect(headings).toHaveLength(2);
    expect(headings[1]?.baseline).toBeCloseTo((headings[0]?.baseline ?? 0) + COPY_OFFSET, 2);

    const references = at('AR No. 0001');
    expect(references).toHaveLength(2);
    expect(references[1]?.baseline).toBeCloseTo((references[0]?.baseline ?? 0) + COPY_OFFSET, 2);

    expect(at('Document Code: OVPCASSS-F-013')).toHaveLength(2);
  });
});
