import { describe, expect, it } from 'vitest';

import {
  BODY_BASELINE,
  FOOTER_BASELINE,
  HEADING_BASELINE,
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

  it('sets the form on A4 with the measured type sizes and baselines', () => {
    const ops = buildReceipt(data, wide);

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

  it('keeps the seal and emblem of the form', () => {
    const images = buildReceipt(data, wide).filter((op) => op.kind === 'image');
    expect(images).toMatchObject([
      { image: 'seal', x: 62.7, top: 7.7, width: 59.3, height: 59.65 },
      { image: 'emblem', x: 481.75, top: 19.5, width: 90.25, height: 48 },
    ]);
  });
});
