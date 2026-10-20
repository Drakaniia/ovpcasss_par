import {
  approvedTemplate,
  endorsedTemplate,
  returnedTemplate,
  roleApprovedTemplate,
  submittedTemplate,
  type EmailContent,
  type ReportEventData,
} from '@par/email';
import type { NotificationKind } from '@par/shared';

export interface NotificationEmailData {
  /** The recipient's full name, used by account events. */
  recipientName: string;
  trackingNumber?: string;
  title?: string;
  /** Who caused the event; report events name them when the template does. */
  actorName?: string;
  comments?: string;
}

/**
 * Email for one notification (spec §7.9). Report events need a tracking number
 * and title, and the ones that name the actor need the actor; when a fact is
 * missing there is nothing useful to send, so the inbox row is still written and
 * no mail goes out. A notification never fails because its email could not.
 */
export function emailForNotification(
  kind: NotificationKind,
  data: NotificationEmailData,
): EmailContent | null {
  if (kind === 'ACCOUNT') return roleApprovedTemplate(data.recipientName);
  if (!data.trackingNumber || !data.title) return null;

  const report: ReportEventData = {
    trackingNumber: data.trackingNumber,
    title: data.title,
    actorName: data.actorName ?? '',
    ...(data.comments === undefined ? {} : { comments: data.comments }),
  };

  switch (kind) {
    case 'SUBMITTED':
      return data.actorName ? submittedTemplate(report) : null;
    case 'ENDORSED':
      return data.actorName ? endorsedTemplate(report) : null;
    case 'RETURNED':
      return returnedTemplate(report);
    case 'APPROVED':
      return approvedTemplate(report);
  }
}
