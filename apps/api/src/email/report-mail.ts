import {
  assignedTemplate,
  picRemovedTemplate,
  receiptIssuedTemplate,
  reminderTemplate,
  returnedTemplate,
  submittedTemplate,
  type EmailAttachmentRef,
  type NarrativeEventData,
} from '@par/email';

import type { Env } from '../env';
import { enqueueEmail } from './outbox';

export async function sendAssignedEmail(
  env: Env,
  to: string,
  data: NarrativeEventData,
  reportId: string,
): Promise<void> {
  await enqueueEmail(env, {
    kind: 'ASSIGNED',
    to,
    content: assignedTemplate(data),
    reportId,
  });
}

export async function sendSubmittedEmail(
  env: Env,
  to: string,
  data: NarrativeEventData,
  reportId: string,
): Promise<void> {
  await enqueueEmail(env, {
    kind: 'SUBMITTED',
    to,
    content: submittedTemplate(data),
    reportId,
  });
}

export async function sendReturnedEmail(
  env: Env,
  to: string,
  data: NarrativeEventData,
  reportId: string,
): Promise<void> {
  await enqueueEmail(env, {
    kind: 'RETURNED',
    to,
    content: returnedTemplate(data),
    reportId,
  });
}

export async function sendReceiptEmail(
  env: Env,
  to: string,
  data: NarrativeEventData,
  reportId: string,
  attachments: readonly EmailAttachmentRef[],
): Promise<void> {
  await enqueueEmail(env, {
    kind: 'RECEIPT_ISSUED',
    to,
    content: receiptIssuedTemplate(data),
    reportId,
    attachments,
  });
}

export async function sendReminderEmail(
  env: Env,
  to: string,
  data: NarrativeEventData,
  reportId: string,
): Promise<void> {
  await enqueueEmail(env, {
    kind: 'REMINDER',
    to,
    content: reminderTemplate(data),
    reportId,
  });
}

export async function sendPicRemovedEmail(
  env: Env,
  to: string,
  data: NarrativeEventData,
  reportId: string,
): Promise<void> {
  await enqueueEmail(env, {
    kind: 'PIC_REMOVED',
    to,
    content: picRemovedTemplate(data),
    reportId,
  });
}
