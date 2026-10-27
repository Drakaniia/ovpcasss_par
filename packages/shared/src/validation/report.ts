import { z } from 'zod';

import type { AttachmentStatus, ReportType } from '../domain/enums';
import { reportActivitySchema } from '../contracts/reports';

/** Field-level problems the API returns to the client (spec §17). */
export interface ValidationIssue {
  field: string;
  message: string;
  /** Wizard step the field belongs to, so the UI can link to it. */
  step?: number;
}

export interface ValidationAttachment {
  label: string;
  status: AttachmentStatus;
  /** Named in the submit message so the writer knows which file to finish. */
  fileName?: string;
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
  sdgIds: 1,
  title: 2,
  activityStartDate: 2,
  activityEndDate: 2,
  location: 2,
  activityCount: 2,
  totalStudents: 3,
  totalPic: 3,
  pics: 3,
  narrative: 3,
  attachments: 3,
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

/**
 * Zod names a problem by path; the client cannot highlight a path. Every 400
 * detail on this contract names a field, whichever check refused the request.
 */
export function issuesFromZodError(error: z.ZodError): ValidationIssue[] {
  return withStep(
    error.issues.map((issue) => ({
      field: issue.path.join('.') || 'form',
      message: issue.message,
    })),
  );
}

function withStep(issues: ValidationIssue[]): ValidationIssue[] {
  return issues.map((issue) => {
    const step = stepFor(issue.field);
    return step === undefined ? issue : { ...issue, step };
  });
}

/** The office's half: every step 1-3 field, checked before a record is created. */
export function validateActivity(form: unknown): ValidationIssue[] {
  const parsed = reportActivitySchema.safeParse(form);
  if (!parsed.success) return issuesFromZodError(parsed.error);

  const value = parsed.data;
  const issues: ValidationIssue[] = [];

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

  const emails = value.pics.map((pic) => pic.email.toLowerCase());
  if (new Set(emails).size !== emails.length) {
    issues.push({
      field: 'pics',
      message: 'Each personnel in charge must have a different email address.',
      step: 3,
    });
  }

  return issues;
}

/**
 * The PIC's half. A saved draft may be empty; a submission may not, and a file
 * still uploading blocks it rather than being silently dropped.
 */
export function validateNarrative(
  narrative: string,
  options: ValidateReportOptions = {},
): ValidationIssue[] {
  const issues: ValidationIssue[] = [];
  if (narrative.trim().length === 0) {
    issues.push({ field: 'narrative', message: 'Write the narrative report.' });
  }

  const attachments = options.attachments ?? [];
  const uploading = attachments.filter((attachment) => attachment.status === 'PENDING');
  if (uploading.length > 0) {
    const named = uploading
      .map((attachment) => attachment.fileName)
      .filter((name): name is string => Boolean(name));
    const which =
      named.length > 0 ? ` ${named.length === 1 ? 'It is' : 'They are'} ${named.join(', ')}.` : '';

    issues.push({
      field: 'attachments',
      message:
        uploading.length === 1
          ? `1 attachment is still uploading.${which} Submit is available once every attachment is confirmed.`
          : `${uploading.length} attachments are still uploading.${which} Submit is available once every attachment is confirmed.`,
    });
  }

  for (const requirement of (options.requirements ?? []).filter(
    (entry) => entry.isActive && entry.isRequired && entry.minCount > 0,
  )) {
    const confirmed = attachments.filter(
      (attachment) => attachment.label === requirement.label && attachment.status === 'CONFIRMED',
    ).length;

    if (confirmed < requirement.minCount) {
      issues.push({
        field: 'attachments',
        message: `Attach ${requirement.minCount} ${requirement.minCount === 1 ? 'file' : 'files'} labelled “${requirement.label}”.`,
      });
    }
  }

  return issues;
}

/** Whole-record validation, kept for the printed report and older callers. */
export function validateReport(
  form: unknown,
  options: ValidateReportOptions = {},
): ValidationIssue[] {
  const activity = validateActivity(form);
  const narrative =
    typeof form === 'object' && form !== null && 'narrative' in form
      ? String((form as { narrative?: unknown }).narrative ?? '')
      : '';

  return [...activity, ...validateNarrative(narrative, options)];
}
