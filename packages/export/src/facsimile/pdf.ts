import { PDFDocument, StandardFonts, degrees, rgb, type PDFFont, type PDFImage } from 'pdf-lib';

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
  referenceNo: string;
  title: string;
  statusLabel: string;
  /** The personnel in charge who submitted the narrative. */
  personnelName: string;
  classification: string;
  campus: string;
  college: string;
  department?: string | null;
  office?: string | null;
  level: string;
  activityStartDate: string;
  activityEndDate: string;
  location: string;
  activityCount: number;
  totalStudents: number;
  totalPic: number;
  pics: { name: string; email?: string | null; phone?: string | null }[];
  sdgNumbers: number[];
  narrative: string;
  attachments: { label: string; originalName: string }[];
  watermark: 'NONE' | 'NOT_SUBMITTED' | 'NOT_APPROVED';
  generatedAt: string;
  /** Set when the office filed the approved record away. */
  archivedAt?: string | null;
  approvedByName?: string | null;
  approvedAt?: string | null;
  /** Snapshotted images, read server-side from storage (bug phase 05 §3.3). */
  submitterSignature?: Uint8Array;
  approverSignature?: Uint8Array;
}

const WATERMARK_LABELS: Record<FacsimilePdfData['watermark'], string> = {
  NONE: '',
  NOT_SUBMITTED: 'NOT SUBMITTED',
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
    const reference = data.referenceNo ? ` - ${data.referenceNo}` : '';
    const archived = data.archivedAt ? ` - Archived ${formatLongDate(data.archivedAt)}` : '';
    const footer = `Generated ${generated}${reference} - Page ${index + 1} of ${pages.length}${archived}`;
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
 * PNG or JPEG by its own magic bytes; anything else is not an image. The API
 * reads the same check to log a broken signature with its report id.
 */
export function imageMediaType(bytes: Uint8Array): 'image/png' | 'image/jpeg' | null {
  if (bytes.length < 3) return null;

  const png = bytes[0] === 0x89 && bytes[1] === 0x50 && bytes[2] === 0x4e && bytes[3] === 0x47;
  const jpeg = bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff;

  if (png) return 'image/png';
  if (jpeg) return 'image/jpeg';
  return null;
}

/** PNG or JPEG by its own magic bytes; anything else draws the rule instead. */
async function embedImage(
  doc: PDFDocument,
  bytes: Uint8Array | undefined,
): Promise<PDFImage | null> {
  if (!bytes || bytes.length === 0) return null;

  try {
    const kind = imageMediaType(bytes);
    if (kind === 'image/png') return await doc.embedPng(bytes);
    if (kind === 'image/jpeg') return await doc.embedJpg(bytes);
  } catch {
    // A broken image must never fail the document (bug phase 05 §3.7).
  }

  return null;
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

  const [submitter, approver] = await Promise.all([
    embedImage(doc, data.submitterSignature),
    embedImage(doc, data.approverSignature),
  ]);

  drawLetterhead(writer, data);
  drawActivity(writer, data);
  drawParticipants(writer, data);
  drawNarrative(writer, data);
  drawAttachments(writer, data);
  drawSignatures(writer, data, { submitter, approver });

  drawWatermark(doc, WATERMARK_LABELS[data.watermark], bold);
  drawFooters(doc, body, data);

  return doc.save();
}
