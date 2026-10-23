import type { ReportType } from '@par/shared';
import { PDFDocument, StandardFonts, rgb, type PDFFont } from 'pdf-lib';

import { BSU_SEAL_JPEG_BASE64 } from './assets';

export interface ReceiptData {
  referenceNo: string;
  recipientName: string;
  title: string;
  type: ReportType;
  activityStartDate: string;
  activityEndDate: string;
  location: string;
  approvedAt: string;
  signatoryName: string;
  signatoryTitle: string;
}

const A4_WIDTH = 595.28;
const A4_HEIGHT = 841.89;
const MARGIN = 62;
const CONTENT_WIDTH = A4_WIDTH - MARGIN * 2;
const MANILA = 'Asia/Manila';

const MONTHS = [
  'January',
  'February',
  'March',
  'April',
  'May',
  'June',
  'July',
  'August',
  'September',
  'October',
  'November',
  'December',
] as const;

function dateParts(iso: string): { day: number; month: number; year: number } | null {
  const value = iso.slice(0, 10);
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (!match) return null;
  return { year: Number(match[1]), month: Number(match[2]), day: Number(match[3]) };
}

function longDate(iso: string): string {
  const parts = dateParts(iso);
  if (!parts) return iso;
  return `${parts.day} ${MONTHS[parts.month - 1]} ${parts.year}`;
}

/** "21 October 2026" or "21–23 October 2026" for a multi-day activity. */
export function formatActivityDate(start: string, end: string): string {
  const from = dateParts(start);
  const to = dateParts(end);
  if (!from || !to) return start;
  if (start === end) return longDate(start);

  if (from.month === to.month && from.year === to.year) {
    return `${from.day}\u2013${to.day} ${MONTHS[from.month - 1]} ${from.year}`;
  }

  return `${longDate(start)} \u2013 ${longDate(end)}`;
}

export function ordinal(day: number): string {
  const rest = day % 100;
  if (rest >= 11 && rest <= 13) return `${day}th`;
  switch (day % 10) {
    case 1:
      return `${day}st`;
    case 2:
      return `${day}nd`;
    case 3:
      return `${day}rd`;
    default:
      return `${day}th`;
  }
}

/** The "Done this …" line always uses the approval day in Manila. */
export function approvalDateLine(approvedAt: string): string {
  const date = new Date(approvedAt);
  if (Number.isNaN(date.getTime()))
    return 'Done this ____ day of ____________, ______ at Malaybalay City, Bukidnon.';

  const parts = new Intl.DateTimeFormat('en-GB', {
    timeZone: MANILA,
    day: 'numeric',
    month: 'numeric',
    year: 'numeric',
  }).formatToParts(date);

  const day = Number(parts.find((part) => part.type === 'day')?.value ?? '1');
  const month = Number(parts.find((part) => part.type === 'month')?.value ?? '1');
  const year = parts.find((part) => part.type === 'year')?.value ?? '';

  return `Done this ${ordinal(day)} day of ${MONTHS[month - 1]}, ${year} at Malaybalay City, Bukidnon.`;
}

/**
 * Helvetica/Times WinAnsi cannot draw every character a title may carry, so
 * curly punctuation is folded before it reaches pdf-lib.
 */
function sanitize(value: string): string {
  return value
    .replaceAll('\u2018', "'")
    .replaceAll('\u2019', "'")
    .replaceAll('\u201c', '"')
    .replaceAll('\u201d', '"')
    .replaceAll('\u2013', '\u2013')
    .replaceAll('\u2014', '-')
    .replaceAll('\u2026', '...')
    .replaceAll('\u00b7', '-')
    .replaceAll('\u00a0', ' ');
}

function wrap(text: string, font: PDFFont, size: number, maxWidth: number): string[] {
  const lines: string[] = [];

  for (const paragraph of text.split('\n')) {
    const words = paragraph.trim().split(/\s+/).filter(Boolean);
    if (words.length === 0) {
      lines.push('');
      continue;
    }

    let current = '';
    for (const word of words) {
      const candidate = current ? `${current} ${word}` : word;
      if (current && font.widthOfTextAtSize(candidate, size) > maxWidth) {
        lines.push(current);
        current = word;
      } else {
        current = candidate;
      }
    }
    lines.push(current);
  }

  return lines;
}

const BASE64_ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';

/** Workers have no `atob` in this project's type library, so decode directly. */
function decodeBase64(value: string): Uint8Array {
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

/**
 * OVPCASSS-F-013 ACKNOWLEDGMENT RECEIPT (spec §10). One page, the letterhead
 * seal extracted from the form, the form's wording verbatim except for the
 * in-campus/off-campus phrase, and the fixed VPCASSS signatory.
 */
export async function renderReceipt(data: ReceiptData): Promise<Uint8Array> {
  const doc = await PDFDocument.create();
  const regular = await doc.embedFont(StandardFonts.TimesRoman);
  const bold = await doc.embedFont(StandardFonts.TimesRomanBold);
  const italic = await doc.embedFont(StandardFonts.TimesRomanItalic);

  const page = doc.addPage([A4_WIDTH, A4_HEIGHT]);
  const center = A4_WIDTH / 2;
  let y = A4_HEIGHT - 46;

  const seal = await doc.embedJpg(decodeBase64(BSU_SEAL_JPEG_BASE64));
  const sealWidth = 58;
  const sealHeight = (seal.height / seal.width) * sealWidth;
  page.drawImage(seal, {
    x: center - sealWidth / 2,
    y: y - sealHeight,
    width: sealWidth,
    height: sealHeight,
  });

  page.drawText('ANNEX I', {
    x: A4_WIDTH - MARGIN - bold.widthOfTextAtSize('ANNEX I', 8),
    y: y - 10,
    size: 8,
    font: bold,
    color: rgb(0.12, 0.14, 0.18),
  });

  y -= sealHeight + 8;

  const university = 'BUKIDNON STATE UNIVERSITY';
  page.drawText(university, {
    x: center - bold.widthOfTextAtSize(university, 13) / 2,
    y,
    size: 13,
    font: bold,
    color: rgb(0.09, 0.16, 0.42),
  });
  y -= 13;

  for (const [text, size, font] of [
    ['Malaybalay City, Bukidnon, 8700', 8.5, regular],
    ['www.buksu.edu.ph', 8.5, regular],
  ] as const) {
    page.drawText(text, {
      x: center - font.widthOfTextAtSize(text, size) / 2,
      y,
      size,
      font,
      color: rgb(0.2, 0.22, 0.28),
    });
    y -= 10;
  }

  y -= 3;
  const office = ['OFFICE OF THE VICE PRESIDENT FOR CULTURE, ARTS, SPORTS', 'AND STUDENT SERVICES'];
  for (const line of office) {
    page.drawText(line, {
      x: center - bold.widthOfTextAtSize(line, 8) / 2,
      y,
      size: 8,
      font: bold,
      color: rgb(0.12, 0.14, 0.18),
    });
    y -= 10;
  }

  y -= 4;
  page.drawLine({
    start: { x: MARGIN, y },
    end: { x: A4_WIDTH - MARGIN, y },
    thickness: 0.8,
    color: rgb(0.72, 0.58, 0.2),
  });
  y -= 26;

  page.drawText(sanitize(data.referenceNo), {
    x: A4_WIDTH - MARGIN - bold.widthOfTextAtSize(sanitize(data.referenceNo), 11),
    y,
    size: 11,
    font: bold,
    color: rgb(0.09, 0.16, 0.42),
  });

  y -= 24;
  const heading = 'ACKNOWLEDGMENT RECEIPT';
  page.drawText(heading, {
    x: center - bold.widthOfTextAtSize(heading, 14) / 2,
    y,
    size: 14,
    font: bold,
    color: rgb(0.09, 0.11, 0.15),
  });
  y -= 34;

  const kind = data.type === 'IN_CAMPUS' ? 'in-campus' : 'off-campus';
  const paragraphs = [
    `Dear ${data.recipientName},`,
    `This is to acknowledge the successful completion and compliance with all requirements related to the ${kind} activity conducted on ${formatActivityDate(data.activityStartDate, data.activityEndDate)} at ${data.location}.`,
    `We appreciate your diligent efforts in ensuring the smooth implementation of the said activity ${data.title}. Your dedication and cooperation contributed significantly to its success.`,
    'Please be informed that this acknowledgment receipt is issued in accordance with the provisions of CHED Memorandum No.63, s. 2017.',
    'Thank you once again for your invaluable contribution.',
  ];

  const lineHeight = 15.5;
  for (const paragraph of paragraphs) {
    for (const line of wrap(sanitize(paragraph), regular, 11, CONTENT_WIDTH)) {
      page.drawText(line, {
        x: MARGIN,
        y,
        size: 11,
        font: regular,
        color: rgb(0.08, 0.09, 0.12),
      });
      y -= lineHeight;
    }
    y -= 9;
  }

  page.drawText(sanitize(approvalDateLine(data.approvedAt)), {
    x: MARGIN,
    y,
    size: 11,
    font: regular,
    color: rgb(0.08, 0.09, 0.12),
  });

  y -= 56;
  page.drawText('Sincerely,', {
    x: MARGIN,
    y,
    size: 11,
    font: regular,
    color: rgb(0.08, 0.09, 0.12),
  });

  y -= 46;
  page.drawText(sanitize(data.signatoryName), {
    x: MARGIN,
    y,
    size: 11,
    font: bold,
    color: rgb(0.08, 0.09, 0.12),
  });
  y -= 14;
  page.drawText(sanitize(data.signatoryTitle), {
    x: MARGIN,
    y,
    size: 10,
    font: italic,
    color: rgb(0.2, 0.22, 0.28),
  });

  const footerY = 52;
  page.drawLine({
    start: { x: MARGIN, y: footerY + 14 },
    end: { x: A4_WIDTH - MARGIN, y: footerY + 14 },
    thickness: 0.5,
    color: rgb(0.72, 0.74, 0.78),
  });

  // The form prints all four footer fields on one ruled line, left to right.
  const footerSize = 7;
  const footerColor = rgb(0.35, 0.38, 0.44);
  const footerFields: readonly [string, number][] = [
    ['Document Code: OVPCASSS-F-013', MARGIN],
    ['Revision No: 0', MARGIN + 158],
    ['Issue Date: March 18, 2025', MARGIN + 262],
    ['Page 1 of 1', A4_WIDTH - MARGIN - regular.widthOfTextAtSize('Page 1 of 1', footerSize)],
  ];

  for (const [text, x] of footerFields) {
    page.drawText(text, {
      x,
      y: footerY,
      size: footerSize,
      font: regular,
      color: footerColor,
    });
  }

  return doc.save();
}
