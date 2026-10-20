import { PDFDocument, StandardFonts, degrees, rgb, type PDFFont } from 'pdf-lib';

import {
  MARGIN,
  MUTED,
  Writer,
  clean,
  drawActivity,
  drawAttachments,
  drawLetterhead,
  drawNarrative,
  drawParticipants,
  drawSignatures,
  formatLongDate,
} from './layout';

export interface FacsimilePdfData {
  trackingNumber: string | null;
  title: string;
  statusLabel: string;
  submitterName: string;
  classification: string;
  campus: string;
  college: string;
  department?: string | null;
  office?: string | null;
  level: string;
  activityStartDate: string;
  activityEndDate: string;
  location: string;
  totalStudents: number;
  totalPic: number;
  pics: { name: string; email?: string | null; phone?: string | null }[];
  sdgNumbers: number[];
  narrative: string;
  attachments: { label: string; originalName: string }[];
  watermark: 'NONE' | 'DRAFT' | 'NOT_APPROVED';
  generatedAt: string;
  approvedByName?: string | null;
  approvedAt?: string | null;
}

const WATERMARK_LABELS: Record<FacsimilePdfData['watermark'], string> = {
  NONE: '',
  DRAFT: 'DRAFT',
  NOT_APPROVED: 'NOT APPROVED',
};

function drawWatermark(doc: PDFDocument, label: string, font: PDFFont): void {
  if (!label) return;

  for (const page of doc.getPages()) {
    const { width, height } = page.getSize();
    page.drawText(label, {
      x: width * 0.16,
      y: height * 0.32,
      size: 78,
      font,
      color: rgb(0.82, 0.83, 0.85),
      opacity: 0.55,
      rotate: degrees(35),
    });
  }
}

function drawFooters(doc: PDFDocument, font: PDFFont, data: FacsimilePdfData): void {
  const pages = doc.getPages();
  const generated = formatLongDate(data.generatedAt);

  pages.forEach((page, index) => {
    const reference = data.trackingNumber ? ` - ${data.trackingNumber}` : '';
    const footer = `Generated ${generated}${reference} - Page ${index + 1} of ${pages.length}`;
    page.drawText(clean(footer), {
      x: MARGIN,
      y: MARGIN - 18,
      size: 7,
      font,
      color: MUTED,
    });
  });
}

/**
 * The facsimile's PDF rendering (UI spec §7.8): the same sections as the record
 * view, A4 portrait with the office's letterhead, a watermark on anything not
 * approved, and a page-numbered footer.
 */
export async function renderFacsimilePdf(data: FacsimilePdfData): Promise<Uint8Array> {
  const doc = await PDFDocument.create();
  const body = await doc.embedFont(StandardFonts.TimesRoman);
  const bold = await doc.embedFont(StandardFonts.TimesRomanBold);
  const writer = new Writer(doc, body, bold);

  drawLetterhead(writer, data);
  drawActivity(writer, data);
  drawParticipants(writer, data);
  drawNarrative(writer, data);
  drawAttachments(writer, data);
  drawSignatures(writer, data);

  drawWatermark(doc, WATERMARK_LABELS[data.watermark], bold);
  drawFooters(doc, body, data);

  return doc.save();
}
