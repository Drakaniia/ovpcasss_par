import { createDb } from '@par/db';

import { enqueueEmail } from '../../../email/queue';
import type { Env } from '../../../env';
import {
  buildNotification,
  type NewNotification,
  type NotificationRecord,
} from '../domain/notification';
import { createNotificationRepository } from '../infrastructure/notification-repository';
import { emailForNotification, type NotificationEmailData } from './notification-email';

export interface NotifyInput extends NewNotification {
  /** Omit to write the row without mail (account events, in-app-only kinds). */
  email?: ({ to: string } & NotificationEmailData) | null;
}

/**
 * The single write path for notifications (spec §7.9): one inbox row for one
 * recipient, plus the email that tells them about it. Callers are the workflow
 * transitions — submit/resubmit notifies Reviewers, return notifies the
 * submitter, endorse notifies Approvers, approve notifies the submitter — and
 * the admin role assignment. A queue failure is logged, never thrown: the row is
 * already written and the transition must not fail because of mail.
 */
export async function notify(env: Env, input: NotifyInput): Promise<NotificationRecord> {
  const at = new Date().toISOString();
  const record = buildNotification(input, crypto.randomUUID(), at);

  await createNotificationRepository(createDb(env.DB)).insert(record);

  const content = input.email ? emailForNotification(input.kind, input.email) : null;
  if (input.email && content) {
    try {
      await enqueueEmail(env, { to: input.email.to, ...content });
    } catch (error) {
      console.error(
        JSON.stringify({
          level: 'error',
          message: 'Notification email could not be queued',
          kind: input.kind,
          reason: error instanceof Error ? error.message : 'unknown',
        }),
      );
    }
  }

  return record;
}
