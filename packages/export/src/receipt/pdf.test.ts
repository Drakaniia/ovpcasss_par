import { unzlibSync } from 'fflate';
import { PDFDocument } from 'pdf-lib';
import { describe, expect, it } from 'vitest';

import { approvalDateLine, formatActivityDate, ordinal, renderReceipt } from './pdf';

const receipt = {
  referenceNo: 'AR No. 0001',
  recipientName: 'M. Santos',
  title: 'Coastal cleanup and mangrove planting',
  type: 'OFF_CAMPUS' as const,
  activityStartDate: '2026-10-21',
  activityEndDate: '2026-10-23',
  location: 'Brgy. Poblacion, Malaybalay City',
  approvedAt: '2026-10-25T04:00:00.000Z',
  signatoryName: 'DR. LINCOLN V. TAN',
  signatoryTitle: 'VPCASSS',
};

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
      // Not every stream is text.
    }
  }

  return content.replace(/<([0-9A-Fa-f]+)>\s*Tj/g, (_, hex: string) => {
    let decoded = '';
    for (let index = 0; index < hex.length; index += 2) {
      decoded += String.fromCharCode(Number.parseInt(hex.slice(index, index + 2), 16));
    }
    return `${decoded} `;
  });
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

/** Join the drawn text runs, one per wrapped line, into readable prose. */
function prose(bytes: Uint8Array): string {
  const runs: string[] = [];
  for (const match of drawnText(bytes).matchAll(/Tm\s+([\s\S]*?)\s+T\*/g)) {
    if (match[1]) runs.push(match[1]);
  }

  return runs.join(' ').replaceAll('\u0096', '\u2013').replace(/\s+/g, ' ').trim();
}

describe('renderReceipt', () => {
  it('renders one A4 page with the form wording and reference', async () => {
    const bytes = await renderReceipt(receipt);
    const doc = await PDFDocument.load(bytes);
    const text = drawnText(bytes);

    expect(doc.getPageCount()).toBe(1);
    expect(doc.getPage(0).getWidth()).toBeCloseTo(595.28, 1);
    expect(text).toContain('ACKNOWLEDGMENT');
    expect(text).toContain('RECEIPT');
    expect(text).toContain('AR No. 0001');
    expect(text).toContain('Santos');
    expect(text).toContain('CHED');
    expect(text).toContain('2017');
    expect(text).toContain('LINCOLN');
    expect(text).toContain('OVPCASSS-F-013');
    expect(text).toContain('Revision No: 0');
    expect(text).toContain('Issue Date: March 18, 2025');
    expect(text).toContain('Page 1 of 1');
  });

  it('embeds the letterhead seal', async () => {
    const bytes = await renderReceipt(receipt);
    expect(latin1(bytes)).toContain('/DCTDecode');
  });

  it('prints the docx letter verbatim', async () => {
    const text = prose(await renderReceipt(receipt));

    expect(text).toContain(
      'Dear M. Santos, ' +
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

  it('swaps the phrase for an in-campus activity', async () => {
    const off = drawnText(await renderReceipt(receipt));
    const inside = drawnText(await renderReceipt({ ...receipt, type: 'IN_CAMPUS' }));

    expect(off).toContain('off-campus');
    expect(inside).toContain('in-campus');
    expect(inside).not.toContain('off-campus');
  });
});
