import {
  approvedTemplate,
  assignedTemplate,
  picRemovedTemplate,
  receiptIssuedTemplate,
  recordEditedTemplate,
  reminderTemplate,
  returnedTemplate,
  submittedTemplate,
  type EmailContent,
  type EmailKind,
  type EmailTemplateCopy,
  type NarrativeEventData,
} from '@par/email';

/**
 * The facts a narrative mail carries (spec §11). A template that cannot be
 * completed from these sends nothing: the inbox row is still written, and the
 * outbox records the skip, so a half-told message never goes out.
 */
export interface NotificationEmailData {
  referenceNo?: string | undefined;
  title?: string | undefined;
  activityDate?: string | undefined;
  location?: string | undefined;
  picName?: string | undefined;
  submitterName?: string | undefined;
  comments?: string | undefined;
  approvedAt?: string | undefined;
  waitingDays?: number | undefined;
  changedFields?: readonly string[] | undefined;
  reason?: string | undefined;
  /** Absolute app origin, so links work from mail and the desktop shell. */
  origin?: string | undefined;
  /** True only when an attachment survived the size budget. */
  hasAttachment?: boolean | undefined;
  attachmentOmitted?: boolean | undefined;
  /** The recipient had no account before the assignment. */
  newAccount?: boolean | undefined;
}

function narrativeOf(data: NotificationEmailData): NarrativeEventData | null {
  if (!data.referenceNo || !data.title) return null;

  return {
    referenceNo: data.referenceNo,
    title: data.title,
    ...(data.activityDate === undefined ? {} : { activityDate: data.activityDate }),
    ...(data.location === undefined ? {} : { location: data.location }),
    ...(data.picName === undefined ? {} : { picName: data.picName }),
    ...(data.submitterName === undefined ? {} : { submitterName: data.submitterName }),
    ...(data.comments === undefined ? {} : { comments: data.comments }),
    ...(data.approvedAt === undefined ? {} : { approvedAt: data.approvedAt }),
    ...(data.waitingDays === undefined ? {} : { waitingDays: data.waitingDays }),
    ...(data.changedFields === undefined ? {} : { changedFields: data.changedFields }),
    ...(data.reason === undefined ? {} : { reason: data.reason }),
    ...(data.origin === undefined ? {} : { origin: data.origin }),
    hasAttachment: data.hasAttachment ?? false,
    attachmentOmitted: data.attachmentOmitted ?? false,
    ...(data.newAccount === undefined ? {} : { newAccount: data.newAccount }),
  };
}

/**
 * Email for one outbox kind (spec §11). Account and operational kinds are built
 * by their own senders, so they return null here. `copy` is the administrator's
 * saved copy for this kind; absent, the template's built-in words are used.
 */
export function emailForNotification(
  kind: EmailKind,
  data: NotificationEmailData,
  copy?: EmailTemplateCopy,
): EmailContent | null {
  const narrative = narrativeOf(data);

  switch (kind) {
    case 'ASSIGNED':
      return narrative ? assignedTemplate(narrative, copy) : null;
    case 'SUBMITTED':
      return narrative ? submittedTemplate(narrative, copy) : null;
    case 'RETURNED':
      return narrative ? returnedTemplate(narrative, copy) : null;
    case 'APPROVED':
      return narrative ? approvedTemplate(narrative, copy) : null;
    case 'RECEIPT_ISSUED':
      return narrative ? receiptIssuedTemplate(narrative, copy) : null;
    case 'RECORD_EDITED':
      return narrative ? recordEditedTemplate(narrative, copy) : null;
    case 'REMINDER':
      return narrative ? reminderTemplate(narrative, copy) : null;
    case 'PIC_REMOVED':
      return narrative ? picRemovedTemplate(narrative, copy) : null;
    case 'VERIFY':
    case 'RESET':
    case 'WORKBOOK':
    case 'FAILURE_DIGEST':
    case 'ROLE_ASSIGNED':
    case 'ACCOUNT_ACTIVATED':
    case 'ACCOUNT_DISABLED':
      return null;
  }
}
