import type {
  DecisionAction,
  DecisionNoteInput,
  QueueItem,
  QueueKind,
  ReportDetail,
  ReportStatus,
  ReturnReportInput,
  Role,
} from '@par/shared';
import { decisionNoteSchema, returnReportSchema } from '@par/shared';

import { api } from '$lib/api/client';
import { ApiError } from '$lib/api/http';
import { parseForm, type FieldErrors } from '$lib/validation/field-errors';

import { queuePath } from './queue-filters';

/**
 * Reviewer and approver decisions (UI spec §7.10, project spec §9). Which button
 * exists, whether it is enabled, and the reason shown next to a disabled one are
 * derived here, so the queue pane, the detail rail, and the keyboard shortcut
 * all agree.
 */
export type DecisionSubject = {
  id: string;
  kind: QueueKind;
  reference: string;
  title: string;
  submitterName: string;
  status: ReportStatus;
  ownerUserId: string;
  hasPendingAttachments: boolean;
  /** Path of the refreshed facsimile, used when a decision lost a race. */
  facsimileHref: string;
};

const WAITING_STATUSES: Record<QueueKind, readonly ReportStatus[]> = {
  review: ['SUBMITTED', 'RESUBMITTED'],
  approval: ['ENDORSED'],
};

const REQUIRED_ROLE: Record<QueueKind, Role> = {
  review: 'REVIEWER',
  approval: 'APPROVER',
};

const DECISION_ROLE_LABEL: Record<QueueKind, { plural: string; withArticle: string }> = {
  review: { plural: 'reviewers', withArticle: 'A reviewer' },
  approval: { plural: 'approvers', withArticle: 'An approver' },
};

export function decisionSubjectFromItem(item: QueueItem, kind: QueueKind): DecisionSubject {
  return {
    id: item.id,
    kind,
    reference: item.trackingNumber ?? 'Report',
    title: item.title,
    submitterName: item.submitterName,
    status: item.status,
    ownerUserId: item.ownerUserId,
    hasPendingAttachments: item.hasPendingAttachments,
    facsimileHref: queuePath(kind, item.id),
  };
}

export function decisionSubjectFromDetail(detail: ReportDetail, kind: QueueKind): DecisionSubject {
  return {
    id: detail.id,
    kind,
    reference: detail.trackingNumber ?? 'Report',
    title: detail.form.title,
    submitterName: detail.people?.submitter.fullName ?? 'the submitter',
    status: detail.status,
    ownerUserId: detail.ownerUserId,
    hasPendingAttachments: isUploading(detail),
    facsimileHref: queuePath(kind, detail.id),
  };
}

/** A report with an attachment that has not finished uploading cannot be decided. */
export function isUploading(detail: ReportDetail): boolean {
  return detail.attachments.some((attachment) => attachment.status === 'PENDING');
}

export type DecisionButton = {
  action: DecisionAction;
  label: string;
  tone: 'primary' | 'danger';
  enabled: boolean;
  reason?: string;
};

export type DecisionAvailability = {
  buttons: DecisionButton[];
  /** Set when this role has no decision to make at all; shown as a note. */
  blocked: string | null;
};

const ACTION_LABELS: Record<DecisionAction, string> = {
  ENDORSE: 'Endorse',
  APPROVE: 'Approve',
  RETURN: 'Return',
};

const ACTION_TONES: Record<DecisionAction, 'primary' | 'danger'> = {
  ENDORSE: 'primary',
  APPROVE: 'primary',
  RETURN: 'danger',
};

const ACTIONS_FOR: Record<QueueKind, readonly [DecisionAction, DecisionAction]> = {
  review: ['ENDORSE', 'RETURN'],
  approval: ['APPROVE', 'RETURN'],
};

/**
 * Disabled-with-reason, never a tooltip: separation of duties, a decision this
 * role cannot make, and attachments still uploading are all stated in the open.
 */
export function decisionAvailability(
  subject: DecisionSubject,
  viewer: { userId: string | null; role: Role | null | undefined },
): DecisionAvailability {
  const waiting = WAITING_STATUSES[subject.kind].includes(subject.status);

  if (!waiting) {
    return {
      buttons: [],
      blocked:
        subject.kind === 'review'
          ? 'This report is no longer awaiting your review.'
          : 'This report is no longer awaiting your approval.',
    };
  }

  if (viewer.role !== REQUIRED_ROLE[subject.kind]) {
    return {
      buttons: [],
      blocked: `This queue is for ${DECISION_ROLE_LABEL[subject.kind].plural}.`,
    };
  }

  const ownReport = Boolean(viewer.userId) && subject.ownerUserId === viewer.userId;
  const reason = ownReport
    ? `You submitted this report. ${DECISION_ROLE_LABEL[subject.kind].withArticle} cannot act on a report they submitted.`
    : subject.hasPendingAttachments
      ? 'Attachments are still uploading.'
      : undefined;

  return {
    buttons: ACTIONS_FOR[subject.kind].map((action) => ({
      action,
      label: ACTION_LABELS[action],
      tone: ACTION_TONES[action],
      enabled: reason === undefined,
      reason,
    })),
    blocked: null,
  };
}

export type DecisionSpec = {
  action: DecisionAction;
  title: string;
  /** "OFF-2026-0014 · Coastal cleanup" under the title. */
  subtitle: string;
  consequence: string;
  confirmLabel: string;
  tone: 'primary' | 'danger';
  commentLabel: string;
  commentOptional: boolean;
  commentRequired: boolean;
  notifyOption: string | null;
  /** Approving needs a signature on file; the drawer blocks without one. */
  requiresSignature: boolean;
  successToast: string;
};

export function decisionSpec(action: DecisionAction, subject: DecisionSubject): DecisionSpec {
  const subtitle = `${subject.reference} · ${subject.title}`;

  switch (action) {
    case 'ENDORSE':
      return {
        action,
        title: 'Endorse report',
        subtitle,
        consequence:
          'Endorsed to the approving officer. They will be asked to approve the report or return it.',
        confirmLabel: 'Endorse',
        tone: 'primary',
        commentLabel: 'Note',
        commentOptional: true,
        commentRequired: false,
        notifyOption: null,
        requiresSignature: false,
        successToast: 'Report endorsed',
      };
    case 'APPROVE':
      return {
        action,
        title: 'Approve report',
        subtitle,
        consequence:
          'Approved. The submitter is notified and the acknowledgement becomes available.',
        confirmLabel: 'Approve',
        tone: 'primary',
        commentLabel: 'Note',
        commentOptional: true,
        commentRequired: false,
        notifyOption: null,
        requiresSignature: true,
        successToast: 'Report approved',
      };
    case 'RETURN':
      return {
        action,
        title: 'Return report',
        subtitle,
        consequence: `Returned to ${subject.submitterName} with your comments. They will be asked to resubmit.`,
        confirmLabel: 'Return report',
        tone: 'danger',
        commentLabel: 'Comment',
        commentOptional: false,
        commentRequired: true,
        notifyOption: 'Notify submitter by email',
        requiresSignature: false,
        successToast: 'Report returned',
      };
  }
}

/** Validates the drawer's one field with the shared contract, not a local rule. */
export function validateDecisionComment(
  action: DecisionAction,
  values: { note: string; notifySubmitter: boolean },
): FieldErrors {
  const result =
    action === 'RETURN'
      ? parseForm(returnReportSchema, {
          comments: values.note.trim(),
          notifySubmitter: values.notifySubmitter,
        })
      : parseForm(decisionNoteSchema, { note: values.note.trim() || undefined });

  return result.ok ? {} : result.errors;
}

/** One call per action and role; the server derives the resulting status. */
export function decisionRequest(
  action: DecisionAction,
  subject: DecisionSubject,
  values: { note: string; notifySubmitter: boolean },
): Promise<ReportDetail> {
  if (action === 'ENDORSE') {
    const input: DecisionNoteInput = { note: values.note.trim() || undefined };
    return api.decisions.endorse(subject.id, input);
  }

  if (action === 'APPROVE') {
    const input: DecisionNoteInput = { note: values.note.trim() || undefined };
    return api.decisions.approve(subject.id, input);
  }

  const input: ReturnReportInput = {
    comments: values.note.trim(),
    notifySubmitter: values.notifySubmitter,
  };

  return subject.kind === 'review'
    ? api.decisions.return(subject.id, input)
    : api.decisions.returnForRevision(subject.id, input);
}

/**
 * Someone else decided first. The API answers 409 (or a `*_STATE` code); the
 * drawer keeps the comment and points at the refreshed document instead of
 * retrying blindly (UI spec §7.9 §6).
 */
export function isDecisionConflict(error: unknown): boolean {
  return (
    error instanceof ApiError &&
    (error.status === 409 || /PENDING|STATE|CONFLICT/i.test(error.code))
  );
}
