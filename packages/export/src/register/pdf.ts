import { PDFDocument, StandardFonts, rgb, type PDFFont, type PDFPage } from 'pdf-lib';

import { BSU_SEAL_JPEG_BASE64 } from '../receipt/assets';

/** One row of the office register, already reduced to what the sheet prints. */
export interface RegisterPdfRow {
  referenceNo: string;
  title: string;
  type: string;
  activityStartDate: string;
  activityEndDate: string;
  location: string;
  picNames: string;
  submittedByName: string;
  submittedAt: string;
  status: string;
  approvedAt: string;
}

export interface RegisterPdfData {
  rows: readonly RegisterPdfRow[];
  /** Human summary of the filters in force, printed under the title. */
  filterSummary: string;
  generatedAt: string;
}

const PAGE_WIDTH = 841.89;
const PAGE_HEIGHT = 595.28;
const MARGIN = 36;
const CONTENT_WIDTH = PAGE_WIDTH - MARGIN * 2;
const FOOTER_Y = 28;
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

const STATUS_LABELS: Record<string, string> = {
  PENDING: 'Pending',
  SUBMITTED: 'Submitted',
  RETURNED: 'Returned',
  APPROVED: 'Approved',
};

const COLUMNS: readonly { label: string; width: number }[] = [
  { label: 'AR No.', width: 70 },
  { label: 'Activity', width: 183 },
  { label: 'Type', width: 48 },
  { label: 'Dates', width: 70 },
  { label: 'Location', width: 90 },
  { label: 'Personnel in charge', width: 92 },
  { label: 'Submitted by', width: 70 },
  { label: 'Submitted', width: 48 },
  { label: 'Status', width: 50 },
  { label: 'Approved', width: 48 },
];

const ROW_SIZE = 6.6;
const HEADER_SIZE = 7;
const ROW_LINE = 8.2;

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

function sanitize(value: string): string {
  return value
    .replaceAll('\u2018', "'")
    .replaceAll('\u2019', "'")
    .replaceAll('\u201c', '"')
    .replaceAll('\u201d', '"')
    .replaceAll('\u2014', '-')
    .replaceAll('\u2026', '...')
    .replaceAll('\u00b7', '-')
    .replaceAll('\u00a0', ' ');
}

function wrap(text: string, font: PDFFont, size: number, maxWidth: number): string[] {
  const lines: string[] = [];

  for (const paragraph of sanitize(text).split('\n')) {
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

function manilaParts(iso: string): { day: number; month: number; year: number } | null {
  if (!iso) return null;
  const date = new Date(iso.length === 10 ? `${iso}T00:00:00+08:00` : iso);
  if (Number.isNaN(date.getTime())) return null;

  const parts = new Intl.DateTimeFormat('en-GB', {
    timeZone: MANILA,
    day: 'numeric',
    month: 'numeric',
    year: 'numeric',
  }).formatToParts(date);

  return {
    day: Number(parts.find((part) => part.type === 'day')?.value ?? '1'),
    month: Number(parts.find((part) => part.type === 'month')?.value ?? '1'),
    year: Number(parts.find((part) => part.type === 'year')?.value ?? '1970'),
  };
}

function shortDate(iso: string): string {
  const parts = manilaParts(iso);
  if (!parts) return '';
  return `${parts.day} ${(MONTHS[parts.month - 1] ?? '').slice(0, 3)} ${parts.year}`;
}

function activityDates(start: string, end: string): string {
  const from = manilaParts(start);
  const to = manilaParts(end);
  if (!from) return '';
  if (!to || start === end) return shortDate(start);

  if (from.month === to.month && from.year === to.year) {
    return `${from.day}\u2013${to.day} ${(MONTHS[from.month - 1] ?? '').slice(0, 3)} ${from.year}`;
  }
  return `${shortDate(start)} \u2013 ${shortDate(end)}`;
}

function generatedStamp(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return iso;

  const parts = new Intl.DateTimeFormat('en-GB', {
    timeZone: MANILA,
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).formatToParts(date);

  const get = (type: string) => parts.find((part) => part.type === type)?.value ?? '';
  return `${get('day')} ${get('month')} ${get('year')}, ${get('hour')}:${get('minute')} (Asia/Manila)`;
}

function cellValues(row: RegisterPdfRow): string[] {
  return [
    row.referenceNo,
    row.title,
    row.type,
    activityDates(row.activityStartDate, row.activityEndDate),
    row.location,
    row.picNames || '\u2014',
    row.submittedByName || '\u2014',
    row.submittedAt ? shortDate(row.submittedAt) : '\u2014',
    STATUS_LABELS[row.status] ?? row.status,
    row.approvedAt ? shortDate(row.approvedAt) : '\u2014',
  ];
}

function drawHeader(page: PDFPage, regular: PDFFont, bold: PDFFont): void {
  page.drawText('BUKIDNON STATE UNIVERSITY', {
    x: MARGIN + 50,
    y: PAGE_HEIGHT - 40,
    size: 10,
    font: bold,
    color: rgb(0.09, 0.16, 0.42),
  });
  page.drawText('OFFICE OF THE VICE PRESIDENT FOR CULTURE, ARTS, SPORTS AND STUDENT SERVICES', {
    x: MARGIN + 50,
    y: PAGE_HEIGHT - 52,
    size: 6.5,
    font: regular,
    color: rgb(0.2, 0.22, 0.28),
  });
  page.drawText('Post-Activity Report register', {
    x: MARGIN + 50,
    y: PAGE_HEIGHT - 68,
    size: 13,
    font: bold,
    color: rgb(0.08, 0.09, 0.12),
  });
}

export async function renderRegisterPdf(data: RegisterPdfData): Promise<Uint8Array> {
  const doc = await PDFDocument.create();
  const regular = await doc.embedFont(StandardFonts.Helvetica);
  const bold = await doc.embedFont(StandardFonts.HelveticaBold);
  const seal = await doc.embedJpg(decodeBase64(BSU_SEAL_JPEG_BASE64));

  const pages: PDFPage[] = [];
  let page = doc.addPage([PAGE_WIDTH, PAGE_HEIGHT]);
  pages.push(page);

  const sealWidth = 34;
  const sealHeight = (seal.height / seal.width) * sealWidth;
  page.drawImage(seal, {
    x: MARGIN,
    y: PAGE_HEIGHT - 36 - sealHeight,
    width: sealWidth,
    height: sealHeight,
  });
  drawHeader(page, regular, bold);

  page.drawText(`Filters: ${sanitize(data.filterSummary)}`, {
    x: MARGIN,
    y: PAGE_HEIGHT - 92,
    size: 7.5,
    font: regular,
    color: rgb(0.35, 0.38, 0.44),
  });
  page.drawText(`Generated ${generatedStamp(data.generatedAt)}`, {
    x: MARGIN,
    y: PAGE_HEIGHT - 102,
    size: 7.5,
    font: regular,
    color: rgb(0.35, 0.38, 0.44),
  });

  function drawTableHead(target: PDFPage, y: number): number {
    let x = MARGIN;
    target.drawRectangle({
      x: MARGIN,
      y: y - 14,
      width: CONTENT_WIDTH,
      height: 16,
      color: rgb(0.94, 0.95, 0.97),
    });

    for (const column of COLUMNS) {
      target.drawText(column.label, {
        x: x + 4,
        y: y - 9,
        size: HEADER_SIZE,
        font: bold,
        color: rgb(0.09, 0.16, 0.42),
      });
      x += column.width;
    }

    return y - 22;
  }

  let y = drawTableHead(page, PAGE_HEIGHT - 116);

  for (const [index, row] of data.rows.entries()) {
    const cells = cellValues(row).map((value, cellIndex) =>
      wrap(value, regular, ROW_SIZE, (COLUMNS[cellIndex]?.width ?? 40) - 8),
    );
    const height = Math.max(...cells.map((lines) => lines.length)) * ROW_LINE + 5;

    if (y - height < FOOTER_Y + 14) {
      page = doc.addPage([PAGE_WIDTH, PAGE_HEIGHT]);
      pages.push(page);
      drawHeader(page, regular, bold);
      page.drawImage(seal, {
        x: MARGIN,
        y: PAGE_HEIGHT - 36 - sealHeight,
        width: sealWidth,
        height: sealHeight,
      });
      y = drawTableHead(page, PAGE_HEIGHT - 48);
    }

    let x = MARGIN;
    for (const [cellIndex, lines] of cells.entries()) {
      for (const [lineIndex, line] of lines.entries()) {
        page.drawText(line, {
          x: x + 4,
          y: y - 8 - lineIndex * ROW_LINE,
          size: ROW_SIZE,
          font: regular,
          color: rgb(0.08, 0.09, 0.12),
        });
      }
      x += COLUMNS[cellIndex]?.width ?? 40;
    }

    page.drawLine({
      start: { x: MARGIN, y: y - height + 3 },
      end: { x: PAGE_WIDTH - MARGIN, y: y - height + 3 },
      thickness: 0.4,
      color: rgb(0.86, 0.88, 0.91),
    });

    y -= height;
    if (index === data.rows.length - 1) break;
  }

  for (const [index, target] of pages.entries()) {
    target.drawLine({
      start: { x: MARGIN, y: FOOTER_Y + 8 },
      end: { x: PAGE_WIDTH - MARGIN, y: FOOTER_Y + 8 },
      thickness: 0.5,
      color: rgb(0.72, 0.74, 0.78),
    });

    target.drawText(`Page ${index + 1} of ${pages.length}`, {
      x: PAGE_WIDTH - MARGIN - regular.widthOfTextAtSize(`Page ${index + 1} of ${pages.length}`, 7),
      y: FOOTER_Y,
      size: 7,
      font: regular,
      color: rgb(0.35, 0.38, 0.44),
    });
    target.drawText('OVPCASSS Paperless PAR', {
      x: MARGIN,
      y: FOOTER_Y,
      size: 7,
      font: regular,
      color: rgb(0.35, 0.38, 0.44),
    });
  }

  return doc.save();
}
