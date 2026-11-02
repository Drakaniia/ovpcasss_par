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
import { loadEmailCopy } from './copy-store';
import { enqueueEmail } from './outbox';

export async function sendAssignedEmail(
  env: Env,
  to: string,
  data: NarrativeEventData,
  reportId: string,
): Promise<void> {
  const copy = await loadEmailCopy(env);

  await enqueueEmail(env, {
    kind: 'ASSIGNED',
    to,
    content: assignedTemplate(data, copy.get('ASSIGNED')),
    reportId,
  });
}

export async function sendSubmittedEmail(
  env: Env,
  to: string,
  data: NarrativeEventData,
  reportId: string,
): Promise<void> {
  const copy = await loadEmailCopy(env);

  await enqueueEmail(env, {
    kind: 'SUBMITTED',
    to,
    content: submittedTemplate(data, copy.get('SUBMITTED')),
    reportId,
  });
}

export async function sendReturnedEmail(
  env: Env,
  to: string,
  data: NarrativeEventData,
  reportId: string,
): Promise<void> {
  const copy = await loadEmailCopy(env);

  await enqueueEmail(env, {
    kind: 'RETURNED',
    to,
    content: returnedTemplate(data, copy.get('RETURNED')),
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
  const copy = await loadEmailCopy(env);

  await enqueueEmail(env, {
    kind: 'RECEIPT_ISSUED',
    to,
    content: receiptIssuedTemplate(data, copy.get('RECEIPT_ISSUED')),
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
  const copy = await loadEmailCopy(env);

  await enqueueEmail(env, {
    kind: 'REMINDER',
    to,
    content: reminderTemplate(data, copy.get('REMINDER')),
    reportId,
  });
}

export async function sendPicRemovedEmail(
  env: Env,
  to: string,
  data: NarrativeEventData,
  reportId: string,
): Promise<void> {
  const copy = await loadEmailCopy(env);

  await enqueueEmail(env, {
    kind: 'PIC_REMOVED',
    to,
    content: picRemovedTemplate(data, copy.get('PIC_REMOVED')),
    reportId,
  });
}
