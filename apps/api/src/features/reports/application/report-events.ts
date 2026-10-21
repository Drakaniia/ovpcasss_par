import { createDb, createUserQueries, type ReportRow, type UserRow } from '@par/db';
import type { EmailAttachmentRef } from '@par/email';
import type { Role } from '@par/shared';

import { notify } from '../../notifications/application/notify';
import type { Env } from '../../../env';

/** Who caused a transition; the submitter is named in every recipient's copy. */
export interface TransitionActor {
  id: string;
  fullName: string;
}

const CLASSIFICATION_LABELS = {
  CURRICULAR: 'Curricular',
  NON_CURRICULAR: 'Non-curricular',
} as const;

function trackingLabel(report: ReportRow): string {
  return report.trackingNumber ?? report.title;
}

/**
 * Active holders of a role, minus the actor and minus the report's owner
 * (email spec §5.4). Nobody receives mail for their own action, and an Admin
 * acting as a reviewer produces no message to itself.
 */
async function recipients(
  env: Env,
  role: Role,
  report: ReportRow,
  actor: TransitionActor,
): Promise<UserRow[]> {
  const holders = await createUserQueries(createDb(env.DB)).listActiveByRole(role);

  return holders.filter((holder) => holder.id !== actor.id && holder.id !== report.ownerUserId);
}

/** Submitted or resubmitted: every other active Reviewer is told. */
export async function notifySubmitted(
  env: Env,
  report: ReportRow,
  actor: TransitionActor,
  options: { resubmitted: boolean; revisionRound?: number; origin?: string },
): Promise<void> {
  const verb = options.resubmitted ? 'resubmitted' : 'submitted';
  const kind = options.resubmitted ? 'RESUBMITTED' : 'SUBMITTED';

  for (const reviewer of await recipients(env, 'REVIEWER', report, actor)) {
    await notify(env, {
      userId: reviewer.id,
      kind,
      description: `${trackingLabel(report)} was ${verb} by ${actor.fullName}.`,
      target: { kind: 'review', reportId: report.id },
      email: report.trackingNumber
        ? {
            kind,
            to: reviewer.email,
            recipientName: reviewer.fullName,
            trackingNumber: report.trackingNumber,
            title: report.title,
            actorName: actor.fullName,
            submitterName: actor.fullName,
            receivedAt: report.submittedAt ?? undefined,
            classification: CLASSIFICATION_LABELS[report.classification],
            ...(options.revisionRound === undefined
              ? {}
              : { revisionRound: options.revisionRound }),
            ...(options.origin === undefined ? {} : { origin: options.origin }),
          }
        : null,
    });
  }
}

/** Returned: the submitter sees the reason in-system and (optionally) by mail. */
export async function notifyReturned(
  env: Env,
  report: ReportRow,
  submitter: UserRow | null,
  actor: TransitionActor,
  comments: string,
  emailSubmitter: boolean,
  origin?: string,
): Promise<void> {
  if (!submitter) return;

  await notify(env, {
    userId: submitter.id,
    kind: 'RETURNED',
    description: `${trackingLabel(report)} was returned by ${actor.fullName}.`,
    comment: comments,
    target: { kind: 'report', reportId: report.id },
    email:
      emailSubmitter && report.trackingNumber
        ? {
            kind: 'RETURNED',
            to: submitter.email,
            recipientName: submitter.fullName,
            trackingNumber: report.trackingNumber,
            title: report.title,
            actorName: actor.fullName,
            comments,
            receivedAt: report.updatedAt,
            ...(origin === undefined ? {} : { origin }),
          }
        : null,
  });
}

/** Endorsed: every other active Approver is told the report awaits a decision. */
export async function notifyEndorsed(
  env: Env,
  report: ReportRow,
  actor: TransitionActor,
  origin?: string,
): Promise<void> {
  for (const approver of await recipients(env, 'APPROVER', report, actor)) {
    await notify(env, {
      userId: approver.id,
      kind: 'ENDORSED',
      description: `${trackingLabel(report)} was endorsed by ${actor.fullName}.`,
      target: { kind: 'approval', reportId: report.id },
      email: report.trackingNumber
        ? {
            kind: 'ENDORSED',
            to: approver.email,
            recipientName: approver.fullName,
            trackingNumber: report.trackingNumber,
            title: report.title,
            actorName: actor.fullName,
            receivedAt: report.endorsedAt ?? report.updatedAt,
            ...(origin === undefined ? {} : { origin }),
          }
        : null,
    });
  }
}

/**
 * Approved: the submitter gets the closing notice, carrying the acknowledgement
 * when it could be rendered (email spec D12, §7.3). The copy only mentions an
 * attachment when one is actually there.
 */
export async function notifyApproved(
  env: Env,
  report: ReportRow,
  submitter: UserRow | null,
  attachment: EmailAttachmentRef | null,
  actor: TransitionActor,
  origin?: string,
): Promise<void> {
  if (!submitter) return;

  await notify(env, {
    userId: submitter.id,
    kind: 'APPROVED',
    description: `${trackingLabel(report)} was approved.`,
    target: { kind: 'report', reportId: report.id },
    email: report.trackingNumber
      ? {
          kind: 'APPROVED',
          to: submitter.email,
          recipientName: submitter.fullName,
          trackingNumber: report.trackingNumber,
          title: report.title,
          actorName: actor.fullName,
          approvedAt: report.approvedAt ?? report.updatedAt,
          ...(attachment ? { attachments: [attachment] } : {}),
          ...(origin === undefined ? {} : { origin }),
        }
      : null,
  });
}
