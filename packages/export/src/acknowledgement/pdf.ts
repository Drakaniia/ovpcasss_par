import { OFFICE_NAME } from '@par/shared';
import { PDFDocument, StandardFonts, rgb, type PDFImage } from 'pdf-lib';

export interface AcknowledgementData {
  trackingNumber: string;
  title: string;
  approverName: string;
  approvedAt: string;
  signatureImage: Uint8Array | null;
}

const A4_WIDTH = 595.28;
const A4_HEIGHT = 841.89;
const MARGIN = 72;
const CONTENT_WIDTH = A4_WIDTH - MARGIN * 2;

/** The office prints dates in full; UTC keeps the stored day unchanged. */
export function formatAcknowledgementDate(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;

  return new Intl.DateTimeFormat('en-GB', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    timeZone: 'UTC',
  }).format(date);
}

/**
 * Helvetica's WinAnsi encoding cannot draw every character the narrative may
 * contain, so curly quotes, dashes, and ellipses are folded to their ASCII
 * equivalents before they reach pdf-lib.
 */
function sanitize(value: string): string {
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

/**
 * Acknowledgment of approval (spec §7.10): report summary, tracking number,
 * approving officer, approval date, and the officer's signature image. The
 * image is optional; a missing one leaves the signature line blank rather than
 * failing the document.
 */
export async function renderAcknowledgement(data: AcknowledgementData): Promise<Uint8Array> {
  const doc = await PDFDocument.create();
  const regular = await doc.embedFont(StandardFonts.Helvetica);
  const bold = await doc.embedFont(StandardFonts.HelveticaBold);

  const page = doc.addPage([A4_WIDTH, A4_HEIGHT]);
  const center = A4_WIDTH / 2;
  let y = A4_HEIGHT - MARGIN;

  page.drawText('OVPCASSS', {
    x: center - bold.widthOfTextAtSize('OVPCASSS', 15) / 2,
    y,
    size: 15,
    font: bold,
    color: rgb(0.09, 0.16, 0.29),
  });
  y -= 18;

  page.drawText(OFFICE_NAME, {
    x: center - regular.widthOfTextAtSize(OFFICE_NAME, 8) / 2,
    y,
    size: 8,
    font: regular,
    color: rgb(0.35, 0.38, 0.44),
  });
  y -= 34;

  const heading = 'ACKNOWLEDGEMENT OF POST-ACTIVITY REPORT';
  page.drawText(heading, {
    x: center - bold.widthOfTextAtSize(heading, 13) / 2,
    y,
    size: 13,
    font: bold,
    color: rgb(0.09, 0.16, 0.29),
  });
  y -= 14;

  page.drawLine({
    start: { x: MARGIN, y },
    end: { x: A4_WIDTH - MARGIN, y },
    thickness: 1,
    color: rgb(0.72, 0.58, 0.2),
  });
  y -= 34;

  const fields: [string, string][] = [
    ['Reference No.', data.trackingNumber],
    ['Activity', data.title],
    ['Approved by', data.approverName],
    ['Date approved', formatAcknowledgementDate(data.approvedAt)],
  ];

  for (const [label, value] of fields) {
    page.drawText(label.toUpperCase(), {
      x: MARGIN,
      y,
      size: 8,
      font: bold,
      color: rgb(0.42, 0.45, 0.5),
    });

    const lines = wrap(sanitize(value), regular, 11, CONTENT_WIDTH - 110);
    lines.forEach((line, index) => {
      page.drawText(line, {
        x: MARGIN + 110,
        y: y - index * 14,
        size: 11,
        font: regular,
        color: rgb(0.09, 0.11, 0.15),
      });
    });
    y -= Math.max(1, lines.length) * 14 + 12;
  }

  y -= 10;

  const body = `This acknowledges that the post-activity report titled "${data.title}" was reviewed and approved by ${data.approverName} on ${formatAcknowledgementDate(data.approvedAt)}. The report has been recorded under reference number ${data.trackingNumber} and is retained in the office's paperless repository.`;

  for (const line of wrap(sanitize(body), regular, 11, CONTENT_WIDTH)) {
    page.drawText(line, {
      x: MARGIN,
      y,
      size: 11,
      font: regular,
      color: rgb(0.12, 0.14, 0.18),
      lineHeight: 16,
    });
    y -= 16;
  }

  y = Math.max(y - 90, MARGIN + 110);

  const signature = await embedSignature(doc, data.signatureImage);
  if (signature) {
    const width = Math.min(180, signature.width);
    const height = (signature.height / signature.width) * width;

    page.drawImage(signature, {
      x: MARGIN,
      y: y + 6,
      width,
      height,
    });
  }

  page.drawLine({
    start: { x: MARGIN, y },
    end: { x: MARGIN + 240, y },
    thickness: 0.8,
    color: rgb(0.12, 0.14, 0.18),
  });

  page.drawText(sanitize(data.approverName), {
    x: MARGIN,
    y: y - 14,
    size: 10,
    font: bold,
    color: rgb(0.09, 0.11, 0.15),
  });

  page.drawText('Approving officer', {
    x: MARGIN,
    y: y - 26,
    size: 8,
    font: regular,
    color: rgb(0.42, 0.45, 0.5),
  });

  const footer = `Generated ${formatAcknowledgementDate(new Date().toISOString())} - ${data.trackingNumber}`;
  page.drawText(sanitize(footer), {
    x: MARGIN,
    y: MARGIN - 28,
    size: 7,
    font: regular,
    color: rgb(0.55, 0.57, 0.6),
  });

  return doc.save();
}

async function embedSignature(
  doc: PDFDocument,
  bytes: Uint8Array | null,
): Promise<PDFImage | null> {
  if (!bytes || bytes.length === 0) return null;

  try {
    return await doc.embedPng(bytes);
  } catch {
    try {
      return await doc.embedJpg(bytes);
    } catch {
      return null;
    }
  }
}

/** Greedy word wrap; a paragraph longer than the page still returns its lines. */
export function wrapText(
  text: string,
  measure: (value: string) => number,
  maxWidth: number,
): string[] {
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
      if (current && measure(candidate) > maxWidth) {
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

function wrap(
  text: string,
  font: { widthOfTextAtSize: (value: string, size: number) => number },
  size: number,
  maxWidth: number,
): string[] {
  return wrapText(text, (value) => font.widthOfTextAtSize(value, size), maxWidth);
}
