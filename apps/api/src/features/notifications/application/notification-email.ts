import {
  approvedTemplate,
  endorsedTemplate,
  receiptTemplate,
  reminderTemplate,
  resubmittedTemplate,
  returnedTemplate,
  submittedTemplate,
  type EmailContent,
  type EmailKind,
  type ReminderQueue,
  type ReportEventData,
} from '@par/email';

/**
 * The facts a workflow mail needs (email spec §5.3). A template that cannot be
 * completed from these sends nothing: the inbox row is still written, and the
 * outbox records the skip, so a half-told message never goes out.
 */
export interface NotificationEmailData {
  /** The recipient's full name, used by account events. */
  recipientName: string;
  trackingNumber?: string | undefined;
  title?: string | undefined;
  /** Who caused the event; report events name them when the template does. */
  actorName?: string | undefined;
  submitterName?: string | undefined;
  comments?: string | undefined;
  /** Absolute app origin, so links work from mail and the desktop shell. */
  origin?: string | undefined;
  receivedAt?: string | undefined;
  classification?: string | undefined;
  campus?: string | undefined;
  college?: string | undefined;
  revisionRound?: number | undefined;
  approvedAt?: string | undefined;
  waitingSince?: string | undefined;
  workingDays?: number | undefined;
  queue?: ReminderQueue | undefined;
  /** True only when an attachment survived the size budget. */
  hasAttachment?: boolean | undefined;
  attachmentOmitted?: boolean | undefined;
}

function reportOf(data: NotificationEmailData): ReportEventData | null {
  if (!data.trackingNumber || !data.title) return null;

  return {
    trackingNumber: data.trackingNumber,
    title: data.title,
    actorName: data.actorName ?? '',
    submitterName: data.submitterName,
    ...(data.comments === undefined ? {} : { comments: data.comments }),
    ...(data.origin === undefined ? {} : { origin: data.origin }),
    ...(data.receivedAt === undefined ? {} : { receivedAt: data.receivedAt }),
    ...(data.classification === undefined ? {} : { classification: data.classification }),
    ...(data.campus === undefined ? {} : { campus: data.campus }),
    ...(data.college === undefined ? {} : { college: data.college }),
    ...(data.revisionRound === undefined ? {} : { revisionRound: data.revisionRound }),
    ...(data.approvedAt === undefined ? {} : { approvedAt: data.approvedAt }),
    ...(data.waitingSince === undefined ? {} : { waitingSince: data.waitingSince }),
    ...(data.workingDays === undefined ? {} : { workingDays: data.workingDays }),
    hasAttachment: data.hasAttachment ?? false,
    attachmentOmitted: data.attachmentOmitted ?? false,
  };
}

/**
 * Email for one outbox kind (spec §7.9, email spec §5). Account kinds are built
 * by `auth-mail.ts` because they carry a token link rather than report facts, so
 * they return null here.
 */
export function emailForNotification(
  kind: EmailKind,
  data: NotificationEmailData,
): EmailContent | null {
  if (kind === 'VERIFY' || kind === 'RESET' || kind === 'WORKBOOK' || kind === 'FAILURE_DIGEST') {
    return null;
  }

  const report = reportOf(data);
  if (!report) return null;

  switch (kind) {
    case 'SUBMITTED':
      return data.actorName ? submittedTemplate(report) : null;
    case 'RECEIPT':
      return receiptTemplate(report);
    case 'RESUBMITTED':
      return resubmittedTemplate(report);
    case 'RETURNED':
      return returnedTemplate(report);
    case 'ENDORSED':
      return data.actorName ? endorsedTemplate(report) : null;
    case 'APPROVED':
      return approvedTemplate(report);
    case 'REMINDER':
      return data.queue ? reminderTemplate({ ...report, queue: data.queue }) : null;
    case 'ROLE_ASSIGNED':
    case 'ACCOUNT_ACTIVATED':
    case 'ACCOUNT_DISABLED':
      return null;
  }
}
