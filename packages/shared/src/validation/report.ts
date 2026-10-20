import type { AttachmentStatus, ReportType } from '../domain/enums';
import { reportFormSchema } from '../contracts/reports';

/**
 * Server-side completeness (spec §7.6). The API renders this list as the linked
 * summary on step 4 and refuses a submit that has any issue; the client never
 * re-implements a rule.
 */
export interface ValidationIssue {
  /** Contract field path, e.g. `pics.0.name` or `attachments`. */
  field: string;
  message: string;
  /** Wizard step the field belongs to, so the UI can link to it. */
  step?: number;
}

export interface ValidationAttachment {
  label: string;
  status: AttachmentStatus;
}

export interface ValidationRequirement {
  activityType: ReportType;
  label: string;
  minCount: number;
  isRequired: boolean;
  isActive: boolean;
}

export interface ValidateReportOptions {
  attachments?: readonly ValidationAttachment[];
  requirements?: readonly ValidationRequirement[];
}

const STEP_BY_FIELD: Record<string, number> = {
  type: 1,
  classification: 1,
  campusId: 1,
  unitId: 1,
  department: 1,
  office: 1,
  level: 1,
  title: 2,
  activityStartDate: 2,
  activityEndDate: 2,
  location: 2,
  totalStudents: 3,
  totalPic: 3,
  pics: 3,
  sdgIds: 3,
  narrative: 4,
  attachments: 4,
};

const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

function stepFor(field: string): number | undefined {
  return STEP_BY_FIELD[field.split('.')[0] ?? ''] ?? undefined;
}

function isRealDate(value: string): boolean {
  if (!DATE_PATTERN.test(value)) return false;
  const parsed = new Date(`${value}T00:00:00.000Z`);
  return !Number.isNaN(parsed.getTime()) && parsed.toISOString().startsWith(value);
}

function zodIssues(form: unknown): ValidationIssue[] {
  const parsed = reportFormSchema.safeParse(form);
  if (parsed.success) return [];

  return parsed.error.issues.map((issue) => {
    const field = issue.path.join('.') || 'form';
    const step = stepFor(field);
    return {
      field,
      message: issue.message,
      ...(step === undefined ? {} : { step }),
    };
  });
}

/**
 * Returns every problem that blocks submission. Attachment requirements come
 * from `ref_attachment_requirements`; only CONFIRMED uploads count, and a file
 * still uploading blocks the submit rather than being silently ignored.
 */
export function validateReport(
  form: unknown,
  options: ValidateReportOptions = {},
): ValidationIssue[] {
  const issues = zodIssues(form);
  const candidate = reportFormSchema.safeParse(form);
  if (!candidate.success) return issues;

  const value = candidate.data;

  if (!isRealDate(value.activityStartDate)) {
    issues.push({ field: 'activityStartDate', message: 'Enter a valid start date.', step: 2 });
  }
  if (!isRealDate(value.activityEndDate)) {
    issues.push({ field: 'activityEndDate', message: 'Enter a valid end date.', step: 2 });
  }
  if (
    isRealDate(value.activityStartDate) &&
    isRealDate(value.activityEndDate) &&
    value.activityEndDate < value.activityStartDate
  ) {
    issues.push({
      field: 'activityEndDate',
      message: 'The end date must be on or after the start date.',
      step: 2,
    });
  }

  const attachments = options.attachments ?? [];
  const uploading = attachments.filter((attachment) => attachment.status === 'PENDING').length;
  if (uploading > 0) {
    issues.push({
      field: 'attachments',
      message:
        uploading === 1
          ? '1 attachment is still uploading. Submit is available once every attachment is confirmed.'
          : `${uploading} attachments are still uploading. Submit is available once every attachment is confirmed.`,
      step: 4,
    });
  }

  const requirements = (options.requirements ?? []).filter(
    (requirement) => requirement.isActive && requirement.activityType === value.type,
  );

  for (const requirement of requirements) {
    if (!requirement.isRequired || requirement.minCount <= 0) continue;

    const confirmed = attachments.filter(
      (attachment) => attachment.label === requirement.label && attachment.status === 'CONFIRMED',
    ).length;

    if (confirmed < requirement.minCount) {
      issues.push({
        field: 'attachments',
        message: `Attach ${requirement.minCount} ${requirement.minCount === 1 ? 'file' : 'files'} labelled “${requirement.label}”.`,
        step: 4,
      });
    }
  }

  return issues;
}
