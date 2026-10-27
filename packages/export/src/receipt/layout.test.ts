import { describe, expect, it } from 'vitest';

import {
  BODY_BASELINE,
  FOOTER_BASELINE,
  HEADING_BASELINE,
  RECEIPT_PAGE,
  approvalDateLine,
  buildReceipt,
  formatActivityDate,
  ordinal,
  type ReceiptData,
  type ReceiptMetrics,
  type ReceiptOp,
} from './layout';

const data: ReceiptData = {
  referenceNo: 'AR No. 0001',
  recipientName: 'M. Santos',
  title: 'Coastal cleanup and mangrove planting',
  type: 'OFF_CAMPUS',
  activityStartDate: '2026-10-21',
  activityEndDate: '2026-10-23',
  location: 'Brgy. Poblacion, Malaybalay City',
  approvedAt: '2026-10-25T04:00:00.000Z',
  signatoryName: 'DR. LINCOLN V. TAN',
  signatoryTitle: 'VPCASSS',
};

/** Wide enough that every paragraph stays on one line, so wording is visible. */
const wide: ReceiptMetrics = { width: (text, _font, size) => text.length * size * 0.1 };

function runs(ops: readonly ReceiptOp[]): string[] {
  return ops
    .filter((op): op is Extract<ReceiptOp, { kind: 'text' }> => op.kind === 'text')
    .map((op) => op.text);
}

function textAt(ops: readonly ReceiptOp[], baseline: number): string[] {
  return ops
    .filter(
      (op): op is Extract<ReceiptOp, { kind: 'text' }> =>
        op.kind === 'text' && Math.abs(op.baseline - baseline) < 0.01,
    )
    .map((op) => op.text);
}

describe('receipt dates', () => {
  it('formats a range inside one month', () => {
    expect(formatActivityDate('2026-10-21', '2026-10-23')).toBe('21\u201323 October 2026');
    expect(formatActivityDate('2026-10-21', '2026-10-21')).toBe('21 October 2026');
  });

  it('uses the Manila approval day with an English ordinal', () => {
    expect(ordinal(1)).toBe('1st');
    expect(ordinal(22)).toBe('22nd');
    expect(ordinal(23)).toBe('23rd');
    expect(ordinal(11)).toBe('11th');
    expect(approvalDateLine('2026-10-25T20:00:00.000Z')).toBe(
      'Done this 26th day of October, 2026 at Malaybalay City, Bukidnon.',
    );
  });
});

describe('buildReceipt', () => {
  it('prints the docx letter verbatim', () => {
    const text = runs(buildReceipt(data, wide));

    expect(text).toContain('Dear M. Santos,');
    expect(text).toContain(
      'This is to acknowledge the successful completion and compliance with all requirements related to the off-campus activity conducted on 21\u201323 October 2026 at Brgy. Poblacion, Malaybalay City.',
    );
    expect(text).toContain(
      'We appreciate your diligent efforts in ensuring the smooth implementation of the said activity Coastal cleanup and mangrove planting. Your dedication and cooperation contributed significantly to its success.',
    );
    expect(text).toContain(
      'Please be informed that this acknowledgment receipt is issued in accordance with the provisions of CHED Memorandum No.63, s. 2017.',
    );
    expect(text).toContain('Thank you once again for your invaluable contribution.');
    expect(text).toContain('Done this 25th day of October, 2026 at Malaybalay City, Bukidnon.');
  });

  it('swaps the phrase for an in-campus activity', () => {
    const text = runs(buildReceipt({ ...data, type: 'IN_CAMPUS' }, wide)).join(' ');
    expect(text).toContain('in-campus');
    expect(text).not.toContain('off-campus');
  });

  it('sets the form on A5 landscape with the measured type sizes and baselines', () => {
    const ops = buildReceipt(data, wide);

    // Exactly half of the A4 sheet the office form is printed on.
    expect(RECEIPT_PAGE).toEqual({ width: 595.28, height: 419.53 });

    const heading = ops.find(
      (op): op is Extract<ReceiptOp, { kind: 'text' }> =>
        op.kind === 'text' && op.text === 'ACKNOWLEDGMENT RECEIPT',
    );
    expect(heading).toMatchObject({ baseline: HEADING_BASELINE, size: 10, font: 'bold' });

    const annex = ops.find(
      (op): op is Extract<ReceiptOp, { kind: 'text' }> =>
        op.kind === 'text' && op.text === 'ANNEX I',
    );
    expect(annex?.x).toBeCloseTo(532.57 - wide.width('ANNEX I', 'bold', 10), 2);

    const footer = textAt(ops, FOOTER_BASELINE);
    expect(footer).toEqual([
      'Document Code: OVPCASSS-F-013',
      'Revision No: 0',
      'Issue Date: March 18, 2025',
      'Page',
      '1',
      'of',
      '1',
    ]);

    expect(textAt(ops, BODY_BASELINE)).toEqual(['Dear M. Santos,']);
    expect(textAt(ops, 110.9 + 24.84)).toEqual([
      'This is to acknowledge the successful completion and compliance with all requirements related to the off-campus activity conducted on 21\u201323 October 2026 at Brgy. Poblacion, Malaybalay City.',
    ]);
    expect(runs(ops)).toContain('DR. LINCOLN V. TAN');
    expect(runs(ops)).toContain('VPCASSS');
    expect(runs(ops)).toContain('AR No. 0001');
  });

  it('keeps the seal and emblem once, on the letterhead', () => {
    const images = buildReceipt(data, wide).filter((op) => op.kind === 'image');
    expect(images).toMatchObject([
      { image: 'seal', x: 62.7, top: 7.7, width: 59.3, height: 59.65 },
      { image: 'emblem', x: 481.75, top: 19.5, width: 90.25, height: 48 },
    ]);
  });

  it('prints the letter once, with no repeated copy', () => {
    const ops = buildReceipt(data, wide);
    const text = runs(ops);

    for (const line of [
      'ACKNOWLEDGMENT RECEIPT',
      'AR No. 0001',
      'Dear M. Santos,',
      'Sincerely,',
      'DR. LINCOLN V. TAN',
      'VPCASSS',
      'Document Code: OVPCASSS-F-013',
    ]) {
      expect(text.filter((value) => value === line)).toHaveLength(1);
    }

    const headings = ops.filter(
      (op): op is Extract<ReceiptOp, { kind: 'text' }> =>
        op.kind === 'text' && op.text === 'ACKNOWLEDGMENT RECEIPT',
    );
    expect(headings.map((op) => op.baseline)).toEqual([HEADING_BASELINE]);

    const images = ops.filter((op) => op.kind === 'image');
    expect(images).toHaveLength(2);
    expect(images.map((op) => op.top)).toEqual([7.7, 19.5]);
  });

  it('closes the copy with its document-code line and draws no cut hairline', () => {
    const ops = buildReceipt(data, wide);

    expect(textAt(ops, FOOTER_BASELINE)).toEqual([
      'Document Code: OVPCASSS-F-013',
      'Revision No: 0',
      'Issue Date: March 18, 2025',
      'Page',
      '1',
      'of',
      '1',
    ]);

    // Only the letterhead's two rules remain, both above the letter.
    const rules = ops.filter(
      (op): op is Extract<ReceiptOp, { kind: 'rule' }> => op.kind === 'rule',
    );
    expect(rules).toHaveLength(2);
    expect(rules.every((rule) => rule.top < FOOTER_BASELINE)).toBe(true);
  });

  it('keeps every mark inside the A5 sheet, nothing stranded below the footer', () => {
    const ops = buildReceipt(data, wide);

    for (const op of ops) {
      const top = op.kind === 'text' ? op.baseline - op.size : op.top;
      const bottom = op.kind === 'text' ? op.baseline : op.top + op.height;

      expect(top).toBeGreaterThanOrEqual(0);
      expect(bottom).toBeLessThanOrEqual(RECEIPT_PAGE.height);
      if (op.kind !== 'image' || op.image === 'emblem') {
        expect(op.x + ('width' in op ? op.width : 0)).toBeLessThanOrEqual(RECEIPT_PAGE.width);
      }
    }

    // Footer to sheet edge is blank paper for the printer, not a lost second copy.
    expect(RECEIPT_PAGE.height - FOOTER_BASELINE).toBeLessThan(36);
  });
});
