import type { ImportedMonitoringRow } from '@par/export';
import type { Classification, Level, ReportType } from '@par/shared';

export interface ImportReferenceOption {
  id: string;
  name: string;
  code?: string;
}

export interface ImportReferences {
  campuses: readonly ImportReferenceOption[];
  units: readonly ImportReferenceOption[];
  sdgs: readonly { id: string; number: number }[];
}

/** A row that passed validation, ready for the repository. */
export interface PlannedReportValues {
  type: ReportType;
  trackingNumber: string;
  status: 'SUBMITTED' | 'APPROVED';
  classification: Classification;
  level: Level;
  campusId: string;
  unitId: string;
  department: string | null;
  office: string | null;
  title: string;
  activityStartDate: string;
  location: string;
  totalStudents: number;
  totalPic: number;
  submittedAt: string;
  approvedAt: string | null;
  sdgIds: string[];
  pic: { name: string; email: string | null; phone: string | null } | null;
}

export interface ImportPlanRow {
  source: ImportedMonitoringRow;
  values: PlannedReportValues | null;
  issues: string[];
}

const TRACKING_NUMBER = /^(OFF|EDU|INC)-(\d{4})-(\d{4,})$/;

const PREFIX: Record<ReportType, string> = {
  OFF_CAMPUS: 'OFF',
  EDUCATIONAL_TOUR: 'EDU',
  IN_CAMPUS: 'INC',
};

/** Matches `SAN FERNANDO` with the seed's `SAN-FERNANDO`, and case differences. */
function normalize(value: string): string {
  return value.toUpperCase().replace(/[^A-Z0-9]/g, '');
}

function findOption(
  options: readonly ImportReferenceOption[],
  value: string,
): ImportReferenceOption | null {
  const key = normalize(value);
  if (!key) return null;

  return (
    options.find((option) => normalize(option.name) === key) ??
    options.find((option) => option.code !== undefined && normalize(option.code) === key) ??
    null
  );
}

export function parseSdgNumbers(text: string): number[] {
  const numbers = [...text.matchAll(/(?<!\d)(\d{1,2})(?!\d)/g)]
    .map((match) => Number(match[1]))
    .filter((value) => value >= 1 && value <= 17);

  return [...new Set(numbers)];
}

function classificationOf(value: string): Classification | null {
  const key = value.trim().toLowerCase().replace(/\s+/g, '-');
  if (key === 'curricular') return 'CURRICULAR';
  if (key === 'non-curricular') return 'NON_CURRICULAR';
  return null;
}

function levelOf(value: string): Level | null {
  const key = value.trim().toLowerCase();
  if (key === 'graduate') return 'GRADUATE';
  if (key === 'undergraduate') return 'UNDERGRADUATE';
  return null;
}

function looksLikeEmail(value: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim());
}

export function trackingParts(
  trackingNumber: string,
): { prefix: string; year: number; seq: number } | null {
  const match = TRACKING_NUMBER.exec(trackingNumber);
  if (!match) return null;

  return { prefix: match[1]!, year: Number(match[2]), seq: Number(match[3]) };
}

/**
 * Validates one sheet row against the reference data. Every problem is
 * collected so the admin sees the whole row at once; a row with any issue is
 * never written.
 */
export function planImportRow(
  source: ImportedMonitoringRow,
  references: ImportReferences,
): ImportPlanRow {
  const issues: string[] = [];
  const tracking = trackingParts(source.trackingNumber);

  if (!source.trackingNumber) {
    issues.push('Tracking number is blank.');
  } else if (!tracking) {
    issues.push(`Tracking number "${source.trackingNumber}" is not in the OFF-YYYY-0000 form.`);
  } else if (tracking.prefix !== PREFIX[source.type]) {
    issues.push(
      `Tracking number "${source.trackingNumber}" does not belong on the ${source.sheetName} sheet.`,
    );
  }

  const classification = classificationOf(source.classification);
  if (!classification) {
    issues.push(
      source.classification
        ? `Classification "${source.classification}" is not Curricular or Non-Curricular.`
        : 'Classification is blank.',
    );
  }

  const level = levelOf(source.level);
  if (!level) {
    issues.push(source.level ? `Level "${source.level}" is not Graduate or Undergraduate.` : 'Level is blank.');
  }

  const campus = findOption(references.campuses, source.campus);
  if (!campus) {
    issues.push(source.campus ? `Campus "${source.campus}" is not in reference data.` : 'Campus is blank.');
  }

  const unit = findOption(references.units, source.college);
  if (!unit) {
    issues.push(
      source.college ? `College "${source.college}" is not in reference data.` : 'College is blank.',
    );
  }

  if (!source.title) issues.push('Title of the Activity is blank.');
  if (!source.activityDate) issues.push('Date of the Activity is blank or not a date.');
  if (!source.dateReceived) issues.push('Date Received is blank or not a date.');

  const sdgIds = parseSdgNumbers(source.sdg)
    .map((number) => references.sdgs.find((sdg) => sdg.number === number)?.id)
    .filter((id): id is string => Boolean(id));

  if (issues.length > 0 || !campus || !unit || !classification || !level) {
    return { source, values: null, issues };
  }

  const contact = source.picContact.trim();
  const pic =
    source.picName || contact
      ? {
          name: source.picName,
          email: contact && looksLikeEmail(contact) ? contact : null,
          phone: contact && !looksLikeEmail(contact) ? contact : null,
        }
      : null;

  const approved = Boolean(source.dateCompleted);

  return {
    source,
    issues,
    values: {
      type: source.type,
      trackingNumber: source.trackingNumber,
      status: approved ? 'APPROVED' : 'SUBMITTED',
      classification,
      level,
      campusId: campus.id,
      unitId: unit.id,
      department: source.department || null,
      office: source.office || null,
      title: source.title,
      activityStartDate: source.activityDate,
      location: source.location,
      totalStudents: source.totalStudents,
      totalPic: source.totalPic,
      submittedAt: `${source.dateReceived}T00:00:00.000Z`,
      approvedAt: approved ? `${source.dateCompleted}T00:00:00.000Z` : null,
      sdgIds,
      pic,
    },
  };
}

export function planImportRows(
  rows: readonly ImportedMonitoringRow[],
  references: ImportReferences,
): ImportPlanRow[] {
  return rows.map((row) => planImportRow(row, references));
}
