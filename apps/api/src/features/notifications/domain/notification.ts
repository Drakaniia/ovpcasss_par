import {
  notificationFlagsFor,
  type Notification,
  type NotificationKind,
  type NotificationTargetKind,
} from '@par/shared';

/**
 * One inbox row as stored (UI spec §7.13). The description is composed when the
 * event happens, and the two flags come from the shared kind rule, so the inbox
 * never re-derives "what happened" per request.
 */
export interface NotificationRecord {
  id: string;
  userId: string;
  kind: NotificationKind;
  description: string;
  comment: string | null;
  targetKind: NotificationTargetKind;
  reportId: string | null;
  needsAction: boolean;
  aboutOwnReport: boolean;
  readAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface NewNotification {
  userId: string;
  kind: NotificationKind;
  description: string;
  comment?: string | null;
  target: { kind: NotificationTargetKind; reportId?: string | null };
}

/** Applies the shared kind rule and stamps the row as unread. */
export function buildNotification(
  input: NewNotification,
  id: string,
  at: string,
): NotificationRecord {
  const flags = notificationFlagsFor(input.kind);

  return {
    id,
    userId: input.userId,
    kind: input.kind,
    description: input.description,
    comment: input.comment ?? null,
    targetKind: input.target.kind,
    reportId: input.target.reportId ?? null,
    needsAction: flags.needsAction,
    aboutOwnReport: flags.aboutOwnReport,
    readAt: null,
    createdAt: at,
    updatedAt: at,
  };
}

/** The client shape: the recipient's own facts, never the recipient's id. */
export function toClientNotification(record: NotificationRecord): Notification {
  return {
    id: record.id,
    kind: record.kind,
    description: record.description,
    comment: record.comment,
    target: { kind: record.targetKind, reportId: record.reportId },
    readAt: record.readAt,
    createdAt: record.createdAt,
  };
}
