import type {
  ReportDetail,
  ReportReturnEvent,
  ReportStatus,
  ReportValidationIssue,
  Role,
} from '@par/shared';

import { formatDate } from '$lib/format/datetime';

import { FIELD_LABELS, fieldKeyFromId, flaggedFieldKeys, type ReportFieldKey } from './report-field-values';
import { isReturnedStatus } from './report-rows';
import { type WizardForm } from './wizard-form';
import { fieldDomId, labelFor } from './wizard-validation';

/**
 * Edit-returned decisions (UI spec §7.6). A return is a targeted correction:
 * only the owning submitter edits, only a returned report is editable, and a
 * report that was already resubmitted by someone else becomes read-only.
 *
 * The same route also serves a draft owner (spec §7.4: "drafts open
 * `/reports/[id]/edit` directly"), which the wizard's own form takes over.
 */

export type EditAccess = 'editable' | 'draft' | 'denied' | 'redirect' | 'superseded';

/** What the header reports beside the status badge. */
export type SaveKind = 'idle' | 'saving' | 'saved' | 'local' | 'failed';

export type EditAccessInput = {
  role: Role | null;
  userId: string | null;
  ownerUserId: string;
  status: ReportStatus;
  returnEvent?: ReportReturnEvent | null;
  returnedAt?: string;
};

/** Did this report come back at least once? Distinguishes superseded from new. */
export function wasReturned(input: Pick<EditAccessInput, 'returnEvent' | 'returnedAt'>): boolean {
  return Boolean(input.returnEvent) || Boolean(input.returnedAt);
}

export function editAccessFor(input: EditAccessInput): EditAccess {
  const owns = input.role === 'SUBMITTER' && Boolean(input.userId) && input.ownerUserId === input.userId;
  if (!owns) return 'denied';

  if (isReturnedStatus(input.status)) return 'editable';

  // The owning submitter continues a draft in the wizard (spec §7.4).
  if (input.status === 'DRAFT') return 'draft';

  // Not returned: a report that came back and moved on is read-only here, and
  // anything else belongs to the facsimile.
  if (wasReturned(input)) return 'superseded';
  return 'redirect';
}

const RETURN_ROLE_LABELS: Record<Role, string> = {
  SUBMITTER: 'submitter',
  REVIEWER: 'reviewer',
  APPROVER: 'approver',
  ADMIN: 'administrator',
};

export function returnRoleLabel(role: Role): string {
  return RETURN_ROLE_LABELS[role];
}

function roleFromStatus(status: ReportStatus): Role | null {
  if (status === 'RETURNED_BY_REVIEWER') return 'REVIEWER';
  if (status === 'RETURNED_BY_APPROVER') return 'APPROVER';
  return null;
}

export type ReturnHeader = {
  roleLabel: string;
  /** ISO timestamp; formatted at the presentation edge. */
  returnedAt: string;
  authorName?: string;
};

/** "Returned by reviewer · 15 Mar 2026"; null when the API gives no return time. */
export function returnHeader(detail: ReportDetail): ReturnHeader | null {
  const event = detail.returnEvent ?? null;
  const returnedAt = detail.returnedAt ?? event?.createdAt;
  const role = event?.authorRole ?? roleFromStatus(detail.status);
  if (!returnedAt || !role) return null;

  return {
    roleLabel: returnRoleLabel(role),
    returnedAt,
    authorName: event?.authorName,
  };
}

export function formatReturnedDate(returnedAt: string): string {
  return formatDate(returnedAt);
}

export type ReturnCalloutData = {
  authorName: string;
  roleLabel: string;
  createdAt: string;
  comments: string;
  flagged: ReportFieldKey[];
};

/** Latest return only; earlier rounds belong to the facsimile's review history. */
export function returnCallout(detail: ReportDetail): ReturnCalloutData | null {
  const event = detail.returnEvent;
  if (!event) return null;

  return {
    authorName: event.authorName,
    roleLabel: returnRoleLabel(event.authorRole),
    createdAt: event.createdAt,
    comments: event.comments,
    flagged: flaggedFieldKeys(event.fieldIds),
  };
}

/** A flag clears the first time its field is edited, and stays cleared. */
export function visibleFlags(
  flagged: readonly ReportFieldKey[],
  cleared: ReadonlySet<ReportFieldKey>,
): ReportFieldKey[] {
  return flagged.filter((key) => !cleared.has(key));
}

export type IssueSummaryItem = {
  field: string;
  label: string;
  message: string;
  /** DOM id of the field to focus, when the issue maps to a rendered field. */
  targetId: string | null;
};

/**
 * Server validation is the authority (phase 06 step 4). Known field ids become
 * links into the page; an unknown id still shows its message, without a link.
 */
export function issueSummary(
  issues: readonly ReportValidationIssue[],
  form: WizardForm,
): IssueSummaryItem[] {
  return issues.map((issue) => {
    const key = fieldKeyFromId(issue.field);
    return {
      field: issue.field,
      label: key ? FIELD_LABELS[key] : labelFor(issue.field, form),
      message: issue.message,
      targetId: key ? fieldDomId(key) : null,
    };
  });
}

