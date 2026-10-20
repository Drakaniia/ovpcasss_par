import type { ReportPicRow, ReportRow, AttachmentRow } from '@par/db';
import type {
  Attachment,
  ReportDraftForm,
  ReportFormInput,
  ReportHead,
  ReportListItem,
} from '@par/shared';

/** Row-to-contract mappers; routes and the detail builder share one shape. */

export function parseDraftForm(row: ReportRow): ReportDraftForm | null {
  if (!row.draftForm) return null;

  try {
    const parsed: unknown = JSON.parse(row.draftForm);
    return typeof parsed === 'object' && parsed !== null ? (parsed as ReportDraftForm) : null;
  } catch {
    return null;
  }
}

function picture(pic: ReportPicRow): ReportFormInput['pics'][number] {
  return {
    name: pic.name,
    ...(pic.email ? { email: pic.email } : {}),
    ...(pic.phone ? { phone: pic.phone } : {}),
  };
}

/** The form as stored: the projected columns plus both many-to-many lists. */
export function toReportForm(
  row: ReportRow,
  pics: readonly ReportPicRow[],
  sdgIds: readonly string[],
): ReportFormInput {
  return {
    type: row.type,
    classification: row.classification,
    campusId: row.campusId,
    unitId: row.unitId,
    ...(row.department ? { department: row.department } : {}),
    ...(row.office ? { office: row.office } : {}),
    level: row.level,
    title: row.title,
    activityStartDate: row.activityStartDate,
    activityEndDate: row.activityEndDate,
    location: row.location,
    totalStudents: row.totalStudents,
    totalPic: row.totalPic,
    pics: pics.map(picture),
    sdgIds: [...sdgIds],
    narrative: row.narrative,
  };
}

/**
 * A draft is whatever the submitter has entered so far; a submitted report is
 * always complete. The wizard's `formFromDraft` accepts the partial shape.
 */
export function toDetailForm(
  row: ReportRow,
  pics: readonly ReportPicRow[],
  sdgIds: readonly string[],
): ReportFormInput {
  if (row.status === 'DRAFT') {
    const draft = parseDraftForm(row);
    if (draft) return draft as ReportFormInput;
  }

  return toReportForm(row, pics, sdgIds);
}

/** The form submit/validate works on, even when no JSON copy was stored. */
export function toValidationForm(
  row: ReportRow,
  pics: readonly ReportPicRow[],
  sdgIds: readonly string[],
): unknown {
  if (row.status === 'DRAFT') {
    const draft = parseDraftForm(row);
    if (draft) return draft;
  }

  return toReportForm(row, pics, sdgIds);
}

export function toReportHead(row: ReportRow): ReportHead {
  return {
    id: row.id,
    version: row.version,
    status: row.status,
    trackingNumber: row.trackingNumber,
    updatedAt: row.updatedAt,
  };
}

export function toReportListItem(row: ReportRow): ReportListItem {
  const draft = row.status === 'DRAFT' ? parseDraftForm(row) : null;

  return {
    id: row.id,
    ownerUserId: row.ownerUserId,
    trackingNumber: row.trackingNumber,
    title: row.title.trim() || 'Untitled draft',
    type: draft?.type ?? row.type,
    status: row.status,
    activityStartDate: row.activityStartDate,
    activityEndDate: row.activityEndDate,
    updatedAt: row.updatedAt,
  };
}

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
