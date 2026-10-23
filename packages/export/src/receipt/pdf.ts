import fontkit from '@pdf-lib/fontkit';
import { PDFDocument, rgb, type PDFFont } from 'pdf-lib';

import { BSU_SEAL_JPEG_BASE64 } from './assets';
import { BSU_EMBLEM_PNG_BASE64 } from './emblem';
import { PAGELLA_BOLD_OTF_BASE64, PAGELLA_REGULAR_OTF_BASE64 } from './fonts';
import {
  RECEIPT_PAGE,
  buildReceipt,
  type ReceiptData,
  type ReceiptFont,
  type ReceiptMetrics,
  type Rgb,
} from './layout';

export type { ReceiptData } from './layout';
export { approvalDateLine, formatActivityDate, ordinal } from './layout';

const BASE64_ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';

/** Workers have no `atob` in this project's type library, so decode directly. */
export function decodeBase64(value: string): Uint8Array {
  const clean = value.replace(/[^A-Za-z0-9+/]/g, '');
  const bytes = new Uint8Array(Math.floor((clean.length * 3) / 4));
  let buffer = 0;
  let bits = 0;
  let offset = 0;

  for (const char of clean) {
    const index = BASE64_ALPHABET.indexOf(char);
    if (index < 0) continue;
    buffer = (buffer << 6) | index;
    bits += 6;
    if (bits >= 8) {
      bits -= 8;
      bytes[offset] = (buffer >> bits) & 0xff;
      offset += 1;
    }
  }

  return bytes.slice(0, offset);
}

function colorOf(value: Rgb) {
  return rgb(value[0], value[1], value[2]);
}

/** The layout measures with the faces the page will actually print. */
export function pageFontMetrics(regular: PDFFont, bold: PDFFont): ReceiptMetrics {
  const face = (font: ReceiptFont) => (font === 'bold' ? bold : regular);
  return { width: (value, font, size) => face(font).widthOfTextAtSize(value, size) };
}

/**
 * Curly punctuation is folded before it reaches the font, and only the Latin-1
 * range is guaranteed: the embedded Pagella subsets carry the characters a
 * Philippine name or activity title needs, no more.
 */
function sanitize(value: string): string {
  return value
    .replaceAll('\u00a0', ' ')
    .replaceAll('\t', ' ')
    .replaceAll('\u2018', "'")
    .replaceAll('\u2019', "'")
    .replaceAll('\u201c', '"')
    .replaceAll('\u201d', '"')
    .replaceAll('\u2026', '...');
}

/**
 * OVPCASSS-F-013 ACKNOWLEDGMENT RECEIPT (spec §10). One copy on A4, measured
 * from the office form: the letterhead seal and emblem, the ruled ANNEX I, the
 * justified 10 pt letter, the fixed VPCASSS signatory, and the document-code
 * footer. `buildReceipt` owns every position; this only paints it.
 */
export async function renderReceipt(data: ReceiptData): Promise<Uint8Array> {
  const doc = await PDFDocument.create();
  doc.registerFontkit(fontkit);

  const regular = await doc.embedFont(decodeBase64(PAGELLA_REGULAR_OTF_BASE64), {
    subset: false,
  });
  const bold = await doc.embedFont(decodeBase64(PAGELLA_BOLD_OTF_BASE64), { subset: false });
  const seal = await doc.embedJpg(decodeBase64(BSU_SEAL_JPEG_BASE64));
  const emblem = await doc.embedPng(decodeBase64(BSU_EMBLEM_PNG_BASE64));

  const metrics = pageFontMetrics(regular, bold);

  const page = doc.addPage([RECEIPT_PAGE.width, RECEIPT_PAGE.height]);

  for (const op of buildReceipt(data, metrics)) {
    if (op.kind === 'text') {
      const font: PDFFont = op.font === 'bold' ? bold : regular;
      page.drawText(sanitize(op.text), {
        x: op.x,
        y: RECEIPT_PAGE.height - op.baseline,
        size: op.size,
        font,
        color: colorOf(op.color),
      });
      continue;
    }

    if (op.kind === 'rule') {
      page.drawRectangle({
        x: op.x,
        y: RECEIPT_PAGE.height - op.top - op.height,
        width: op.width,
        height: op.height,
        color: colorOf(op.color),
      });
      continue;
    }

    page.drawImage(op.image === 'seal' ? seal : emblem, {
      x: op.x,
      y: RECEIPT_PAGE.height - op.top - op.height,
      width: op.width,
      height: op.height,
    });
  }

  return doc.save();
}
