import { createDb, createUserQueries, type ReportRow, type UserRow } from '@par/db';
import type { Role } from '@par/shared';

import { notify } from '../../notifications/application/notify';
import type { Env } from '../../../env';

/** Who caused a transition; the submitter is named in every recipient's copy. */
export interface TransitionActor {
  id: string;
  fullName: string;
}

function trackingLabel(report: ReportRow): string {
  return report.trackingNumber ?? report.title;
}

async function recipients(env: Env, role: Role): Promise<UserRow[]> {
  return createUserQueries(createDb(env.DB)).listActiveByRole(role);
}

/** Submitted or resubmitted: every active Reviewer is told in-system and by mail. */
export async function notifySubmitted(
  env: Env,
  report: ReportRow,
  actor: TransitionActor,
  resubmitted: boolean,
): Promise<void> {
  const verb = resubmitted ? 'resubmitted' : 'submitted';

  for (const reviewer of await recipients(env, 'REVIEWER')) {
    await notify(env, {
      userId: reviewer.id,
      kind: 'SUBMITTED',
      description: `${trackingLabel(report)} was ${verb} by ${actor.fullName}.`,
      target: { kind: 'review', reportId: report.id },
      email: report.trackingNumber
        ? {
            to: reviewer.email,
            recipientName: reviewer.fullName,
            trackingNumber: report.trackingNumber,
            title: report.title,
            actorName: actor.fullName,
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
            to: submitter.email,
            recipientName: submitter.fullName,
            trackingNumber: report.trackingNumber,
            title: report.title,
            comments,
          }
        : null,
  });
}

/** Endorsed: every active Approver is told the report is ready for a decision. */
export async function notifyEndorsed(
  env: Env,
  report: ReportRow,
  actor: TransitionActor,
): Promise<void> {
  for (const approver of await recipients(env, 'APPROVER')) {
    await notify(env, {
      userId: approver.id,
      kind: 'ENDORSED',
      description: `${trackingLabel(report)} was endorsed by ${actor.fullName}.`,
      target: { kind: 'approval', reportId: report.id },
      email: report.trackingNumber
        ? {
            to: approver.email,
            recipientName: approver.fullName,
            trackingNumber: report.trackingNumber,
            title: report.title,
            actorName: actor.fullName,
          }
        : null,
    });
  }
}

/** Approved: the submitter gets the closing notice; the acknowledgement follows. */
export async function notifyApproved(
  env: Env,
  report: ReportRow,
  submitter: UserRow | null,
): Promise<void> {
  if (!submitter) return;

  await notify(env, {
    userId: submitter.id,
    kind: 'APPROVED',
    description: `${trackingLabel(report)} was approved.`,
    target: { kind: 'report', reportId: report.id },
    email: report.trackingNumber
      ? {
          to: submitter.email,
          recipientName: submitter.fullName,
          trackingNumber: report.trackingNumber,
          title: report.title,
        }
      : null,
  });
}
