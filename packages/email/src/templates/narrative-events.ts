import type { EmailKind, EmailTemplateCopy } from '@par/shared';

import { narrativeContext } from '../context';
import { defaultCopyFor } from '../copy';
import type { NarrativeEventData } from '../data';
import type { EmailContent } from '../provider';
import { resolveEmailTemplate } from '../resolve';
import { renderShell } from '../shell';

export type { NarrativeEventData } from '../data';

/**
 * The report and personnel messages (email spec §5, §11). Each kind owns its
 * cases — a new account, an attached receipt, a known waiting period — and the
 * office owns the words inside them.
 */
function content(
  kind: EmailKind,
  data: NarrativeEventData,
  copy: EmailTemplateCopy | undefined,
): EmailContent {
  return renderShell(resolveEmailTemplate(copy ?? defaultCopyFor(kind), narrativeContext(data)));
}

export function assignedTemplate(
  data: NarrativeEventData,
  copy?: EmailTemplateCopy,
): EmailContent {
  return content('ASSIGNED', data, copy);
}

export function submittedTemplate(
  data: NarrativeEventData,
  copy?: EmailTemplateCopy,
): EmailContent {
  return content('SUBMITTED', data, copy);
}

export function returnedTemplate(
  data: NarrativeEventData,
  copy?: EmailTemplateCopy,
): EmailContent {
  return content('RETURNED', data, copy);
}

/**
 * The approval itself, before and apart from the receipt mail (spec §11). The
 * receipt is issued by its own message, so this one never claims an attachment.
 */
export function approvedTemplate(
  data: NarrativeEventData,
  copy?: EmailTemplateCopy,
): EmailContent {
  return content('APPROVED', data, copy);
}

export function receiptIssuedTemplate(
  data: NarrativeEventData,
  copy?: EmailTemplateCopy,
): EmailContent {
  return content('RECEIPT_ISSUED', data, copy);
}

export function reminderTemplate(
  data: NarrativeEventData,
  copy?: EmailTemplateCopy,
): EmailContent {
  return content('REMINDER', data, copy);
}

export function recordEditedTemplate(
  data: NarrativeEventData,
  copy?: EmailTemplateCopy,
): EmailContent {
  return content('RECORD_EDITED', data, copy);
}

export function picRemovedTemplate(
  data: NarrativeEventData,
  copy?: EmailTemplateCopy,
): EmailContent {
  return content('PIC_REMOVED', data, copy);
}
