import type { AttachmentRow, ReportPicRow, ReportRow } from '@par/db';
import type { Attachment, ReportHead, ReportListItem } from '@par/shared';

export function toAttachment(row: AttachmentRow): Attachment {
  return {
    id: row.id,
    reportId: row.reportId,
    label: row.label,
    originalName: row.originalName,
    size: row.size,
    mimeType: row.mimeType,
    status: row.status,
    createdAt: row.createdAt,
  };
}

export function toReportHead(row: ReportRow): ReportHead {
  return {
    id: row.id,
    version: row.version,
    status: row.status,
    referenceNo: row.referenceNo,
    updatedAt: row.updatedAt,
  };
}

export function toReportListItem(
  row: ReportRow,
  pics: readonly ReportPicRow[],
  submittedByName: string | null = null,
): ReportListItem {
  return {
    id: row.id,
    referenceNo: row.referenceNo,
    title: row.title,
    type: row.type,
    status: row.status,
    activityStartDate: row.activityStartDate,
    activityEndDate: row.activityEndDate,
    location: row.location,
    picNames: pics.map((pic) => pic.name).join(', '),
    submittedByName,
    updatedAt: row.updatedAt,
    ...(row.submittedAt ? { submittedAt: row.submittedAt } : {}),
    ...(row.archivedAt ? { archivedAt: row.archivedAt } : {}),
  };
}
