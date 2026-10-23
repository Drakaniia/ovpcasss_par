import type { ReportType } from '@par/shared';

/**
 * OVPCASSS-F-013 ACKNOWLEDGMENT RECEIPT, measured from the office form
 * (`docs/OVPCASSS-F-013.ACKNOWLEDGMENT RECEIPT.docx`) rendered by Word, one
 * copy per A4 sheet. Every position is in PDF points from the page's top-left
 * corner, taken from that render: page 595.32 x 841.92, seal at (62.7, 7.7),
 * ANNEX I right-aligned to 532.57, the letterhead rule 3.55 pt thick at
 * y 73.69, the heading baseline at 86.66, the letter at 110.9..368.9, and the
 * copy's own footer baseline at 385.85.
 */

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

export type Rgb = readonly [number, number, number];
export type ReceiptFont = 'regular' | 'bold';

export const BLACK: Rgb = [0, 0, 0];
/** The docx hyperlink colour on the university address line. */
export const LINK_BLUE: Rgb = [0x05 / 255, 0x63 / 255, 0xc1 / 255];

export const RECEIPT_PAGE = { width: 595.32, height: 841.92 } as const;
export const CONTENT = { left: 54, width: 487.32 } as const;

/** Book Antiqua's line advance as Word prints it at 10 pt. */
export const BODY_LINE = 12.48;
/** Blank-line gap between two letter paragraphs. */
export const PARAGRAPH_GAP = 24.84;
export const HEADING_BASELINE = 86.66;
export const BODY_BASELINE = 110.9;
/** "Done this …", two empty lines, then "Sincerely,". */
export const DONE_TO_SINCERELY = 37.32;
export const SINCERELY_TO_NAME = 23.76;
export const NAME_TO_TITLE = 11.04;
export const TITLE_TO_REFERENCE = 24.36;
export const FOOTER_BASELINE = 385.85;

export interface TextOp {
  kind: 'text';
  text: string;
  x: number;
  baseline: number;
  size: number;
  font: ReceiptFont;
  color: Rgb;
}

export interface RuleOp {
  kind: 'rule';
  x: number;
  top: number;
  width: number;
  height: number;
  color: Rgb;
}

export interface ImageOp {
  kind: 'image';
  image: 'seal' | 'emblem';
  x: number;
  top: number;
  width: number;
  height: number;
}

export type ReceiptOp = TextOp | RuleOp | ImageOp;

/** Font measurement, supplied by the PDF renderer (and stubbed in tests). */
export interface ReceiptMetrics {
  width(text: string, font: ReceiptFont, size: number): number;
}

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

const MANILA = 'Asia/Manila';

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
  if (Number.isNaN(date.getTime())) {
    return 'Done this ____ day of ____________, ______ at Malaybalay City, Bukidnon.';
  }

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

function text(
  value: string,
  x: number,
  baseline: number,
  size: number,
  font: ReceiptFont,
  color: Rgb = BLACK,
): TextOp {
  return { kind: 'text', text: value, x, baseline, size, font, color };
}

function centered(
  value: string,
  center: number,
  baseline: number,
  size: number,
  font: ReceiptFont,
  metrics: ReceiptMetrics,
  color: Rgb = BLACK,
): TextOp {
  return text(value, center - metrics.width(value, font, size) / 2, baseline, size, font, color);
}

interface Line {
  words: string[];
  /** Natural width with single spaces, before justification. */
  width: number;
}

/**
 * Greedy wrap at the form's measure. Word also breaks after an existing
 * hyphen, which is how "off-campus" ends the first line of the letter.
 */
function wrap(paragraph: string, metrics: ReceiptMetrics): Line[] {
  const size = 10;
  const space = metrics.width(' ', 'regular', size);
  const lines: Line[] = [];
  let words: string[] = [];
  let width = 0;

  const pushLine = () => {
    if (words.length > 0) lines.push({ words, width });
    words = [];
    width = 0;
  };

  for (const raw of paragraph.split(/\s+/).filter(Boolean)) {
    let rest = raw;

    while (rest.length > 0) {
      const lead = words.length === 0 ? 0 : space;
      const whole = metrics.width(rest, 'regular', size);

      if (width + lead + whole <= CONTENT.width) {
        width += lead + whole;
        words.push(rest);
        break;
      }

      const hyphen = rest.lastIndexOf('-');
      if (hyphen > 0) {
        const prefix = rest.slice(0, hyphen + 1);
        if (width + lead + metrics.width(prefix, 'regular', size) <= CONTENT.width) {
          width += lead + metrics.width(prefix, 'regular', size);
          words.push(prefix);
          pushLine();
          rest = rest.slice(hyphen + 1);
          continue;
        }
      }

      if (words.length > 0) {
        pushLine();
        continue;
      }

      // A single unbreakable word wider than the measure: keep it whole.
      width = whole;
      words.push(rest);
      pushLine();
      break;
    }
  }

  pushLine();
  return lines;
}

/** One text op per word so justified lines can be spaced exactly. */
function drawParagraph(
  paragraph: string,
  start: number,
  metrics: ReceiptMetrics,
  ops: ReceiptOp[],
): number {
  const size = 10;
  const space = metrics.width(' ', 'regular', size);
  const lines = wrap(paragraph, metrics);
  let baseline = start;

  lines.forEach((line, index) => {
    const last = index === lines.length - 1;
    if (last || line.words.length < 2) {
      ops.push(text(line.words.join(' '), CONTENT.left, baseline, size, 'regular'));
    } else {
      const gap = (CONTENT.width - line.width) / (line.words.length - 1);
      let x = CONTENT.left;
      for (const word of line.words) {
        ops.push(text(word, x, baseline, size, 'regular'));
        x += metrics.width(word, 'regular', size) + space + gap;
      }
    }
    baseline += BODY_LINE;
  });

  return baseline - BODY_LINE;
}

function footer(ops: ReceiptOp[]): void {
  const size = 8;
  const baseline = FOOTER_BASELINE;
  ops.push(
    text('Document Code: OVPCASSS-F-013', 39.36, baseline, size, 'regular'),
    text('Revision No: 0', 236.57, baseline, size, 'regular'),
    text('Issue Date: March 18, 2025', 358.39, baseline, size, 'regular'),
    text('Page', 510.1, baseline, size, 'regular'),
    text('1', 529.18, baseline, size, 'bold'),
    text('of', 535.18, baseline, size, 'regular'),
    text('1', 544.18, baseline, size, 'bold'),
  );
}

function letterhead(metrics: ReceiptMetrics, ops: ReceiptOp[]): void {
  const center = 297.66;

  ops.push(
    { kind: 'image', image: 'seal', x: 62.7, top: 7.7, width: 59.3, height: 59.65 },
    { kind: 'image', image: 'emblem', x: 481.75, top: 19.5, width: 90.25, height: 48 },
    text('ANNEX I', 532.57 - metrics.width('ANNEX I', 'bold', 10), 16.56, 10, 'bold'),
    centered('BUKIDNON STATE UNIVERSITY', center, 28.56, 10, 'bold', metrics),
    centered('Malaybalay City, Bukidnon, 8700', center, 40.8, 10, 'regular', metrics),
    centered('www.buksu.edu.ph', center, 53.28, 10, 'regular', metrics, LINK_BLUE),
    { kind: 'rule', x: 253.37, top: 54.6, width: 88.7, height: 0.6, color: LINK_BLUE },
    centered(
      'OFFICE OF THE VICE PRESIDENT FOR CULTURE, ARTS, SPORTS AND STUDENT SERVICES',
      297.52,
      66.48,
      7,
      'bold',
      metrics,
    ),
    { kind: 'rule', x: 63, top: 73.69, width: 489.7, height: 3.55, color: BLACK },
    centered('ACKNOWLEDGMENT RECEIPT', 297.67, HEADING_BASELINE, 10, 'bold', metrics),
  );
}

/** OVPCASSS-F-013: one copy, black type, the docx wording verbatim. */
export function buildReceipt(data: ReceiptData, metrics: ReceiptMetrics): ReceiptOp[] {
  const ops: ReceiptOp[] = [];
  letterhead(metrics, ops);

  const kind = data.type === 'IN_CAMPUS' ? 'in-campus' : 'off-campus';
  const paragraphs = [
    `Dear ${data.recipientName},`,
    `This is to acknowledge the successful completion and compliance with all requirements related to the ${kind} activity conducted on ${formatActivityDate(data.activityStartDate, data.activityEndDate)} at ${data.location}.`,
    `We appreciate your diligent efforts in ensuring the smooth implementation of the said activity ${data.title}. Your dedication and cooperation contributed significantly to its success.`,
    'Please be informed that this acknowledgment receipt is issued in accordance with the provisions of CHED Memorandum No.63, s. 2017.',
    'Thank you once again for your invaluable contribution.',
    approvalDateLine(data.approvedAt),
  ];

  let baseline = BODY_BASELINE;
  for (const paragraph of paragraphs) {
    baseline = drawParagraph(paragraph, baseline, metrics, ops) + PARAGRAPH_GAP;
  }

  const sincerely = baseline - PARAGRAPH_GAP + DONE_TO_SINCERELY;
  const name = sincerely + SINCERELY_TO_NAME;
  const title = name + NAME_TO_TITLE;
  const reference = title + TITLE_TO_REFERENCE;

  ops.push(
    text('Sincerely,', CONTENT.left, sincerely, 10, 'regular'),
    text(data.signatoryName, CONTENT.left, name, 9, 'bold'),
    text(data.signatoryTitle, CONTENT.left, title, 9, 'regular'),
    text(data.referenceNo, CONTENT.left, reference, 10, 'regular'),
  );

  footer(ops);
  return ops;
}
