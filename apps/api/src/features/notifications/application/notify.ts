import { createDb, createUserQueries, type UserRow } from '@par/db';
import { EMAIL_KIND_CATEGORIES, type EmailKind, type EmailPreferenceCategory } from '@par/shared';
import type { EmailAttachmentRef } from '@par/email';

import { applyAttachmentBudget, maxAttachmentBytes } from '../../../email/attachments';
import { enqueueEmail, suppressEmail } from '../../../email/outbox';
import type { Env } from '../../../env';
import {
  buildNotification,
  type NewNotification,
  type NotificationRecord,
} from '../domain/notification';
import { createNotificationRepository } from '../infrastructure/notification-repository';
import { emailForNotification, type NotificationEmailData } from './notification-email';

export interface NotifyEmail extends NotificationEmailData {
  /** The outbox kind; the inbox row keeps the separate `NotificationKind`. */
  kind: EmailKind;
  to: string;
  attachments?: readonly EmailAttachmentRef[];
  note?: string;
}

export interface NotifyInput extends NewNotification {
  /** Omit to write the row without mail (in-app-only kinds). */
  email?: NotifyEmail | null;
}

function muted(user: UserRow, category: EmailPreferenceCategory): boolean {
  return category === 'WORKFLOW' ? !user.emailWorkflow : !user.emailReminders;
}

/**
 * The single write path for notifications (spec §7.9, email spec §8). One inbox
 * row for one recipient, then the mail that tells them about it.
 *
 * The row is always written: muting stops mail, never the in-app notification.
 * A message that is not sent is recorded as `SUPPRESSED` with its reason, so the
 * reviewer's intent and the recipient's preference are both visible in the log.
 * Nothing here throws — a transition must not fail because of mail.
 */
export async function notify(env: Env, input: NotifyInput): Promise<NotificationRecord> {
  const at = new Date().toISOString();
  const record = buildNotification(input, crypto.randomUUID(), at);

  await createNotificationRepository(createDb(env.DB)).insert(record);

  if (input.email) {
    await deliver(env, input, record).catch((error: unknown) => {
      console.error(
        JSON.stringify({
          level: 'error',
          message: 'Notification email could not be prepared',
          kind: input.email?.kind,
          reason: error instanceof Error ? error.message : 'unknown',
        }),
      );
    });
  }

  return record;
}

async function deliver(env: Env, input: NotifyInput, record: NotificationRecord): Promise<void> {
  const email = input.email;
  if (!email) return;

  const reportId = record.reportId ?? null;
  const skip = (reason: string) =>
    suppressEmail(env, {
      kind: email.kind,
      to: email.to,
      reason,
      reportId,
      subject: `${record.description}`,
    });

  const user = await createUserQueries(createDb(env.DB)).findById(input.userId);
  if (!user) return skip('recipient account not found');
  if (user.status !== 'ACTIVE') return skip('recipient account is not active');
  if (!user.emailVerifiedAt) return skip('recipient email is not verified');

  const category = EMAIL_KIND_CATEGORIES[email.kind];
  if (category && muted(user, category)) {
    return skip(`recipient muted ${category.toLowerCase()} mail`);
  }

  const budget = applyAttachmentBudget(email.attachments ?? [], maxAttachmentBytes(env));
  const content = emailForNotification(email.kind, {
    ...email,
    hasAttachment: budget.refs.length > 0,
    attachmentOmitted: budget.omitted,
  });

  if (!content) return skip(`the ${email.kind} message could not be completed`);

  await enqueueEmail(env, {
    kind: email.kind,
    to: email.to,
    content,
    attachments: budget.refs,
    reportId,
    ...(budget.omitted
      ? { note: 'attachment omitted (size)' }
      : email.note
        ? { note: email.note }
        : {}),
  });
}
