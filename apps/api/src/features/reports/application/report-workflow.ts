import type {
  AttachmentQueries,
  ReportReadQueries,
  ReportRow,
  ReportWriteQueries,
  UserQueries,
  UserRow,
} from '@par/db';
import { projectReportForm } from '@par/db';
import {
  formatTrackingNumber,
  REPORT_TYPE_PREFIX,
  reportFormSchema,
  validateReport,
  type ReportStatus,
  type ReportType,
  type ValidationIssue,
} from '@par/shared';

import type { Env } from '../../../env';
import { createId } from '../../../lib/ids';
import { notifyApproved, notifyEndorsed, notifyReturned, notifySubmitted, type TransitionActor } from './report-events';
import { toValidationForm } from './report-shape';

/** Structural copy of the admin-editable requirement row (spec §7.6). */
export interface Requirement {
  activityType: ReportType;
  label: string;
  minCount: number;
  isRequired: boolean;
  isActive: boolean;
}

export interface WorkflowDependencies {
  read: ReportReadQueries;
  write: ReportWriteQueries;
  attachments: AttachmentQueries;
  users: UserQueries;
  requirements: readonly Requirement[];
  env: Env;
  now: string;
}

export type WorkflowFailure = { kind: 'invalid'; issues: ValidationIssue[] } | { kind: 'conflict' };

export interface WorkflowSuccess {
  kind: 'ok';
  row: ReportRow;
  action: string;
  from: ReportStatus;
  to: ReportStatus;
}

export type WorkflowOutcome = WorkflowSuccess | WorkflowFailure;

async function validateRow(
  deps: WorkflowDependencies,
  row: ReportRow,
): Promise<{ issues: ValidationIssue[]; form: unknown }> {
  const [pics, sdgIds, attachmentRows] = await Promise.all([
    deps.read.listPics(row.id),
    deps.read.listSdgIds(row.id),
    deps.read.listAttachments(row.id),
  ]);

  const form = toValidationForm(row, pics, sdgIds);
  const issues = validateReport(form, {
    attachments: attachmentRows.map((attachment) => ({
      label: attachment.label,
      status: attachment.status,
    })),
    requirements: deps.requirements,
  });

  return { issues, form };
}

/** Field list used by `POST /reports/:id/validate` (spec §7.6). */
export async function validateStoredReport(
  deps: WorkflowDependencies,
  row: ReportRow,
): Promise<ValidationIssue[]> {
  return (await validateRow(deps, row)).issues;
}

/**
 * First submission issues the tracking number; resubmission keeps it. Both move
 * through the shared state machine, bump the version, and notify Reviewers.
 */
export async function submitReportRow(
  deps: WorkflowDependencies,
  row: ReportRow,
  options: { resubmit: boolean; actor: TransitionActor; version?: number },
): Promise<WorkflowOutcome> {
  const allowed: readonly ReportStatus[] = options.resubmit
    ? ['RETURNED_BY_REVIEWER', 'RETURNED_BY_APPROVER']
    : ['DRAFT'];

  if (!allowed.includes(row.status)) return { kind: 'conflict' };

  const { issues, form } = await validateRow(deps, row);
  if (issues.length > 0) return { kind: 'invalid', issues };

  const candidate = reportFormSchema.safeParse(form);
  if (!candidate.success) {
    return {
      kind: 'invalid',
      issues: candidate.error.issues.map((issue) => ({
        field: issue.path.join('.') || 'form',
        message: issue.message,
      })),
    };
  }

  const submitted = candidate.data;
  let trackingNumber = row.trackingNumber;
  if (!trackingNumber) {
    const year = new Date(deps.now).getUTCFullYear();
    const sequence = await deps.write.nextTrackingSequence(
      REPORT_TYPE_PREFIX[submitted.type],
      year,
    );
    trackingNumber = formatTrackingNumber(submitted.type, year, sequence);
  }

  const changed = await deps.write.changeStatus(row.id, {
    to: options.resubmit ? 'RESUBMITTED' : 'SUBMITTED',
    from: allowed,
    ...(options.version === undefined ? {} : { version: options.version }),
    now: deps.now,
    patch: {
      ...projectReportForm(submitted, deps.now),
      draftForm: null,
      trackingNumber,
      submittedAt: row.submittedAt ?? deps.now,
      ...(options.resubmit
        ? { endorsedAt: null, approvedAt: null, approvedByUserId: null }
        : {}),
    },
  });

  if (!changed) return { kind: 'conflict' };

  await deps.write.replaceLists(changed.id, submitted.sdgIds, submitted.pics);
  await notifySubmitted(deps.env, changed, options.actor, options.resubmit);

  return {
    kind: 'ok',
    row: changed,
    action: options.resubmit ? 'RESUBMITTED' : 'SUBMITTED',
    from: row.status,
    to: changed.status,
  };
}

export type DecisionKind = 'ENDORSE' | 'APPROVE' | 'REVIEWER_RETURN' | 'APPROVER_RETURN';

export interface DecisionInput {
  kind: DecisionKind;
  actor: TransitionActor;
  submitter: UserRow | null;
  /** Approver/reviewer note; optional for endorse and approve. */
  note?: string;
  /** Required for a return (validated at the route with the shared schema). */
  comments?: string;
  notifySubmitter?: boolean;
}

const DECISION: Record<
  DecisionKind,
  { from: readonly ReportStatus[]; to: ReportStatus; action: string }
> = {
  ENDORSE: { from: ['SUBMITTED', 'RESUBMITTED'], to: 'ENDORSED', action: 'ENDORSED' },
  REVIEWER_RETURN: {
    from: ['SUBMITTED', 'RESUBMITTED'],
    to: 'RETURNED_BY_REVIEWER',
    action: 'RETURNED_BY_REVIEWER',
  },
  APPROVE: { from: ['ENDORSED'], to: 'APPROVED', action: 'APPROVED' },
  APPROVER_RETURN: {
    from: ['ENDORSED'],
    to: 'RETURNED_BY_APPROVER',
    action: 'RETURNED_BY_APPROVER',
  },
};

/**
 * One decision path for both roles (spec §7.5, §9). The target status comes from
 * the caller's explicit action, never from the request body, and a report with
 * an upload still in flight cannot be decided.
 */
export async function decideReportRow(
  deps: WorkflowDependencies,
  row: ReportRow,
  input: DecisionInput,
): Promise<WorkflowOutcome> {
  const decision = DECISION[input.kind];
  if (!decision.from.includes(row.status)) return { kind: 'conflict' };
  if (await deps.attachments.countPending(row.id)) return { kind: 'conflict' };

  const changed = await deps.write.changeStatus(row.id, {
    to: decision.to,
    from: decision.from,
    now: deps.now,
    patch:
      input.kind === 'APPROVE'
        ? { approvedAt: deps.now, approvedByUserId: input.actor.id }
        : input.kind === 'ENDORSE'
          ? { endorsedAt: deps.now }
          : {},
  });

  if (!changed) return { kind: 'conflict' };

  const returnComment = input.kind.endsWith('_RETURN') ? input.comments?.trim() : undefined;
  if (returnComment) {
    const round = (await deps.write.countReturns(row.id)) + 1;
    await deps.write.insertComment({
      id: createId(),
      reportId: row.id,
      authorUserId: input.actor.id,
      kind: 'RETURN',
      round,
      body: returnComment,
      createdAt: deps.now,
    });
  } else if (input.note?.trim()) {
    await deps.write.insertComment({
      id: createId(),
      reportId: row.id,
      authorUserId: input.actor.id,
      kind: input.kind === 'APPROVE' ? 'APPROVER_NOTE' : 'REVIEW_NOTE',
      round: 1,
      body: input.note.trim(),
      createdAt: deps.now,
    });
  }

  if (input.kind === 'ENDORSE') {
    await notifyEndorsed(deps.env, changed, input.actor);
  } else if (input.kind === 'APPROVE') {
    await notifyApproved(deps.env, changed, input.submitter);
  } else {
    await notifyReturned(
      deps.env,
      changed,
      input.submitter,
      input.actor,
      returnComment ?? '',
      input.notifySubmitter ?? true,
    );
  }

  return {
    kind: 'ok',
    row: changed,
    action: decision.action,
    from: row.status,
    to: changed.status,
  };
}

