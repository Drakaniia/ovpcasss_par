import {
  createDb,
  createEmailOutboxQueries,
  createMonitoringQueries,
  createUserQueries,
  type UserRow,
} from '@par/db';
import type { Role } from '@par/shared';

import type { Env } from '../../../env';
import { notify } from '../../notifications/application/notify';
import { selectDueReminders, type DueReminder } from '../domain/select-due';

/** Load back far enough that any report past the threshold is included. */
const LOOKBACK_DAYS = 45;

export interface ReminderSummary {
  /** Reports that met the working-day rule. */
  due: number;
  /** Notifications written, one per recipient. */
  sent: number;
  /** Recipients deliberately left out (the owner, or nobody holds the role). */
  skipped: number;
}

function lookback(now: Date): string {
  return new Date(now.getTime() - LOOKBACK_DAYS * 86_400_000).toISOString();
}

/**
 * The reminder sweep (email spec §10). It reuses `notify()`, so a reminder
 * appears in the in-app inbox as well as in mail and the recipient's mute is
 * honoured by the same rule as every other message.
 */
export async function sendReminders(
  env: Env,
  now = new Date(),
  threshold?: number,
): Promise<ReminderSummary> {
  const db = createDb(env.DB);
  const reports = createMonitoringQueries(db);
  const outbox = createEmailOutboxQueries(db);
  const users = createUserQueries(db);

  const since = lookback(now);
  const [review, approval] = await Promise.all([
    reports.listWaitingSince(['SUBMITTED', 'RESUBMITTED'], since, 'submittedAt'),
    reports.listWaitingSince(['ENDORSED'], since, 'endorsedAt'),
  ]);

  const rule = threshold === undefined ? {} : { threshold };
  const candidates = selectDueReminders({ now, review, approval, lastSent: new Map(), ...rule });
  const lastSent = new Map<string, string>();

  for (const candidate of candidates) {
    const last = await outbox.lastSentFor('REMINDER', candidate.id);
    if (last) lastSent.set(candidate.id, last);
  }

  const due = selectDueReminders({ now, review, approval, lastSent, ...rule });
  const byRole = new Map<Role, UserRow[]>();
  const summary: ReminderSummary = { due: due.length, sent: 0, skipped: 0 };

  for (const reminder of due) {
    const role: Role = reminder.queue === 'approval' ? 'APPROVER' : 'REVIEWER';

    if (!byRole.has(role)) byRole.set(role, await users.listActiveByRole(role));
    const holders = (byRole.get(role) ?? []).filter((holder) => holder.id !== reminder.ownerUserId);

    if (holders.length === 0) {
      summary.skipped += 1;
      continue;
    }

    for (const holder of holders) {
      await notify(env, {
        userId: holder.id,
        kind: 'REMINDER',
        description: `${reminder.trackingNumber} has been waiting ${reminder.workingDays} working days.`,
        target: {
          kind: reminder.queue === 'approval' ? 'approval' : 'review',
          reportId: reminder.id,
        },
        email: {
          kind: 'REMINDER',
          to: holder.email,
          recipientName: holder.fullName,
          trackingNumber: reminder.trackingNumber ?? '',
          title: reminder.title,
          submitterName: reminder.submitterName,
          waitingSince: reminder.since,
          workingDays: reminder.workingDays,
          queue: reminder.queue,
          ...(env.APP_ORIGIN ? { origin: env.APP_ORIGIN } : {}),
        },
      });
      summary.sent += 1;
    }
  }

  return summary;
}

export type { DueReminder };
