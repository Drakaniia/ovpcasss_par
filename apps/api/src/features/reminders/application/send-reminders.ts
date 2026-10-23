import {
  createDb,
  createEmailOutboxQueries,
  createMonitoringQueries,
  createReportReadQueries,
  createUserQueries,
} from '@par/db';

import type { Env } from '../../../env';
import { notify } from '../../notifications/application/notify';
import { REMINDER_AFTER_DAYS, shouldRemind, waitingDays } from '../domain/reminder-schedule';

export { REMINDER_AFTER_DAYS, MAX_REMINDERS } from '../domain/reminder-schedule';

export interface ReminderSummary {
  /** Draft records past the threshold. */
  due: number;
  /** Notifications written, one per personnel in charge. */
  sent: number;
}

/**
 * The reminder sweep (spec §14). It reuses `notify()`, so a reminder appears in
 * the in-app inbox as well as in mail and the recipient's mute is honoured by
 * the same rule as every other message. A record stops being reminded once its
 * narrative is submitted, which is why only `PENDING` rows are selected.
 */
export async function sendReminders(
  env: Env,
  now = new Date(),
  thresholdDays = REMINDER_AFTER_DAYS,
): Promise<ReminderSummary> {
  const db = createDb(env.DB);
  const records = createMonitoringQueries(db);
  const reads = createReportReadQueries(db);
  const outbox = createEmailOutboxQueries(db);
  const users = createUserQueries(db);

  const cutoff = new Date(now.getTime() - thresholdDays * 86_400_000).toISOString();
  const drafts = await records.listOverduePending(cutoff);
  const summary: ReminderSummary = { due: drafts.length, sent: 0 };

  for (const draft of drafts) {
    const pics = await reads.listPics(draft.id);
    const waited = waitingDays(draft.createdAt, now);

    for (const pic of pics) {
      if (!pic.userId) continue;
      const user = await users.findById(pic.userId);
      if (!user || user.status !== 'ACTIVE' || !user.emailVerifiedAt) continue;

      const [sentCount, lastSentAt] = await Promise.all([
        outbox.countForReport('REMINDER', draft.id, user.email),
        outbox.lastSentFor('REMINDER', draft.id, user.email),
      ]);
      if (!shouldRemind({ createdAt: draft.createdAt, sentCount, lastSentAt, now })) continue;

      await notify(env, {
        userId: user.id,
        kind: 'REMINDER',
        description: `${draft.referenceNo} is still waiting for its narrative report.`,
        target: { kind: 'report', reportId: draft.id },
        email: {
          kind: 'REMINDER',
          to: user.email,
          referenceNo: draft.referenceNo,
          title: draft.title,
          waitingDays: waited,
          ...(env.APP_ORIGIN ? { origin: env.APP_ORIGIN } : {}),
        },
      });
      summary.sent += 1;
    }
  }

  return summary;
}
