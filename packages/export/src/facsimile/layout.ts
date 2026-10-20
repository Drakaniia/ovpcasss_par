import { rgb, type PDFDocument, type PDFFont, type PDFPage } from 'pdf-lib';

import type { FacsimilePdfData } from './pdf';

export const A4_WIDTH = 595.28;
export const A4_HEIGHT = 841.89;
export const MARGIN = 42.5; // ~15 mm
const LABEL_WIDTH = 108;
const CONTENT_WIDTH = A4_WIDTH - MARGIN * 2;
const BODY_SIZE = 10;
const LINE_HEIGHT = 14;
export const INK = rgb(0.11, 0.13, 0.17);
export const MUTED = rgb(0.42, 0.45, 0.5);
const NAVY = rgb(0.09, 0.16, 0.29);
const GOLD = rgb(0.72, 0.58, 0.2);

/** Curly punctuation is not in Times' WinAnsi set; fold it to ASCII. */
export function clean(value: string): string {
  return value
    .replaceAll('\u2018', "'")
    .replaceAll('\u2019', "'")
    .replaceAll('\u201c', '"')
    .replaceAll('\u201d', '"')
    .replaceAll('\u2013', '-')
    .replaceAll('\u2014', '-')
    .replaceAll('\u2026', '...')
    .replaceAll('\u00b7', '-')
    .replaceAll('\u00a0', ' ')
    .split('')
    .filter((char) => {
      const code = char.charCodeAt(0);
      return code >= 32 || code === 9 || code === 10;
    })
    .join('');
}

function formatDate(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;

  return new Intl.DateTimeFormat('en-GB', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    timeZone: 'UTC',
  }).format(date);
}

export function formatLongDate(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;

  return new Intl.DateTimeFormat('en-GB', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    timeZone: 'UTC',
  }).format(date);
}

function textWidth(font: PDFFont, value: string, size: number): number {
  return font.widthOfTextAtSize(clean(value), size);
}

/** Greedy word wrap, preserving explicit line breaks for the narrative. */
function wrap(font: PDFFont, value: string, size: number, maxWidth: number): string[] {
  const lines: string[] = [];

  for (const paragraph of clean(value).split('\n')) {
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

/**
 * A small page writer: it knows the current page and cursor, opens a new page
 * before a block would cross the bottom margin, and leaves the letterhead to
 * the first page only.
 */
export class Writer {
  readonly doc: PDFDocument;
  readonly body: PDFFont;
  readonly bold: PDFFont;
  page: PDFPage;
  y = A4_HEIGHT - MARGIN;

  constructor(doc: PDFDocument, body: PDFFont, bold: PDFFont) {
    this.doc = doc;
    this.body = body;
    this.bold = bold;
    this.page = doc.addPage([A4_WIDTH, A4_HEIGHT]);
  }

  newPage(): void {
    this.page = this.doc.addPage([A4_WIDTH, A4_HEIGHT]);
    this.y = A4_HEIGHT - MARGIN;
  }

  ensure(height: number): void {
    if (this.y - height < MARGIN) this.newPage();
  }

  line(
    value: string,
    options: { font?: PDFFont; size?: number; color?: typeof INK; x?: number } = {},
  ): void {
    const font = options.font ?? this.body;
    const size = options.size ?? BODY_SIZE;
    this.ensure(size + 4);
    this.page.drawText(clean(value), {
      x: options.x ?? MARGIN,
      y: this.y,
      size,
      font,
      color: options.color ?? INK,
    });
    this.y -= size + 4;
  }

  gap(height: number): void {
    this.y -= height;
  }

  rule(color = GOLD, thickness = 0.8): void {
    this.ensure(8);
    this.page.drawLine({
      start: { x: MARGIN, y: this.y },
      end: { x: A4_WIDTH - MARGIN, y: this.y },
      thickness,
      color,
    });
    this.y -= 10;
  }

  heading(label: string): void {
    this.ensure(34);
    this.gap(8);
    this.page.drawText(clean(label), {
      x: MARGIN,
      y: this.y,
      size: 9,
      font: this.bold,
      color: NAVY,
    });
    this.y -= 8;
    this.page.drawLine({
      start: { x: MARGIN, y: this.y },
      end: { x: A4_WIDTH - MARGIN, y: this.y },
      thickness: 0.6,
      color: GOLD,
    });
    this.y -= 14;
  }

  field(label: string, value: string): void {
    const lines = wrap(this.body, value || '-', BODY_SIZE, CONTENT_WIDTH - LABEL_WIDTH);
    const height = Math.max(1, lines.length) * LINE_HEIGHT;
    this.ensure(height + 4);

    this.page.drawText(clean(label), {
      x: MARGIN,
      y: this.y,
      size: 7.5,
      font: this.bold,
      color: MUTED,
    });

    lines.forEach((line, index) => {
      this.page.drawText(line, {
        x: MARGIN + LABEL_WIDTH,
        y: this.y - index * LINE_HEIGHT,
        size: BODY_SIZE,
        font: this.body,
        color: INK,
      });
    });
    this.y -= height + 4;
  }

  paragraph(value: string): void {
    for (const line of wrap(this.body, value, BODY_SIZE, CONTENT_WIDTH)) {
      this.ensure(LINE_HEIGHT);
      if (line) {
        this.page.drawText(line, {
          x: MARGIN,
          y: this.y,
          size: BODY_SIZE,
          font: this.body,
          color: INK,
        });
      }
      this.y -= LINE_HEIGHT;
    }
  }
}

export function drawLetterhead(writer: Writer, data: FacsimilePdfData): void {
  const { page, bold, body } = writer;
  const top = A4_HEIGHT - MARGIN;

  page.drawText('OVPCASSS', {
    x: MARGIN,
    y: top - 6,
    size: 13,
    font: bold,
    color: NAVY,
  });

  page.drawText('Office of the Vice President for Campus Affairs, Student Services and Safety', {
    x: MARGIN,
    y: top - 20,
    size: 7,
    font: body,
    color: MUTED,
  });

  const reference = data.trackingNumber ?? 'DRAFT';
  page.drawText(reference, {
    x: A4_WIDTH - MARGIN - textWidth(bold, reference, 10),
    y: top - 6,
    size: 10,
    font: bold,
    color: INK,
  });

  page.drawText(data.statusLabel, {
    x: A4_WIDTH - MARGIN - textWidth(body, data.statusLabel, 8),
    y: top - 20,
    size: 8,
    font: body,
    color: MUTED,
  });

  writer.y = top - 40;
  writer.page.drawLine({
    start: { x: MARGIN, y: writer.y },
    end: { x: A4_WIDTH - MARGIN, y: writer.y },
    thickness: 1.2,
    color: GOLD,
  });
  writer.y -= 30;

  const heading = 'POST-ACTIVITY REPORT';
  writer.page.drawText(heading, {
    x: A4_WIDTH / 2 - textWidth(bold, heading, 16) / 2,
    y: writer.y,
    size: 16,
    font: bold,
    color: NAVY,
  });
  writer.y -= 26;

  for (const line of wrap(bold, data.title, 12, CONTENT_WIDTH)) {
    writer.page.drawText(line, {
      x: A4_WIDTH / 2 - bold.widthOfTextAtSize(line, 12) / 2,
      y: writer.y,
      size: 12,
      font: bold,
      color: INK,
    });
    writer.y -= 16;
  }
  writer.gap(8);
}

export function drawActivity(writer: Writer, data: FacsimilePdfData): void {
  writer.heading('I. ACTIVITY');
  writer.field('Classification', data.classification);
  writer.field('Campus', data.campus);
  writer.field('College / unit', data.college);
  if (data.department) writer.field('Department', data.department);
  if (data.office) writer.field('Office', data.office);
  writer.field('Level', data.level);
  writer.field(
    'Date of activity',
    data.activityStartDate === data.activityEndDate
      ? formatDate(data.activityStartDate)
      : `${formatDate(data.activityStartDate)} to ${formatDate(data.activityEndDate)}`,
  );
  writer.field('Location', data.location);
  writer.field(
    'SDGs',
    data.sdgNumbers.length > 0 ? data.sdgNumbers.map((number) => `SDG ${number}`).join(', ') : '-',
  );
}

export function drawParticipants(writer: Writer, data: FacsimilePdfData): void {
  writer.heading('II. PARTICIPANTS');
  writer.field('Students', String(data.totalStudents));
  writer.field('Persons in charge', String(data.totalPic));
  writer.field(
    'Names',
    data.pics
      .map((pic) => {
        const contact = [pic.email, pic.phone].filter(Boolean).join(' / ');
        return contact ? `${pic.name} (${contact})` : pic.name;
      })
      .join('; ') || '-',
  );
}

export function drawNarrative(writer: Writer, data: FacsimilePdfData): void {
  writer.heading('III. NARRATIVE');
  writer.paragraph(data.narrative || '-');
}

export function drawAttachments(writer: Writer, data: FacsimilePdfData): void {
  writer.heading('ATTACHMENTS');
  if (data.attachments.length === 0) {
    writer.paragraph('No attachments.');
    return;
  }

  for (const attachment of data.attachments) {
    writer.field(attachment.label || 'Attachment', attachment.originalName);
  }
}

export function drawSignatures(writer: Writer, data: FacsimilePdfData): void {
  writer.heading('IV. SIGNATURES');
  writer.ensure(110);

  const column = CONTENT_WIDTH / 2;
  const baseline = writer.y - 46;

  writer.page.drawLine({
    start: { x: MARGIN, y: baseline },
    end: { x: MARGIN + column - 30, y: baseline },
    thickness: 0.6,
    color: INK,
  });
  writer.page.drawLine({
    start: { x: MARGIN + column, y: baseline },
    end: { x: A4_WIDTH - MARGIN, y: baseline },
    thickness: 0.6,
    color: INK,
  });

  writer.page.drawText(clean(`Submitted by ${data.submitterName}`), {
    x: MARGIN,
    y: baseline - 14,
    size: 9,
    font: writer.body,
    color: INK,
  });

  const approvedBy = data.approvedByName ?? '';
  writer.page.drawText(clean(approvedBy ? `Approved by ${approvedBy}` : 'Approved by'), {
    x: MARGIN + column,
    y: baseline - 14,
    size: 9,
    font: writer.body,
    color: INK,
  });

  if (data.approvedAt) {
    writer.page.drawText(clean(`Approved ${formatLongDate(data.approvedAt)}`), {
      x: MARGIN + column,
      y: baseline - 26,
      size: 8,
      font: writer.body,
      color: MUTED,
    });
  }

  writer.y = baseline - 34;
}
