import {
  createAuditQueries,
  createDb,
  createReceiptQueries,
  createReportReadQueries,
  createUserQueries,
  type ReportCommentRow,
  type ReportPicRow,
  type ReportRow,
} from '@par/db';
import type { ReportDetail, ReportHistoryEvent } from '@par/shared';

import type { Env } from '../../../env';
import { auditNote } from './audit-note';
import { toAttachment } from './record-shape';

function formOf(row: ReportRow, pics: readonly ReportPicRow[], sdgIds: readonly string[]) {
  return {
    type: row.type,
    ...(row.trackingNumber ? { trackingNumber: row.trackingNumber } : {}),
    classification: row.classification,
    ...(row.campusId ? { campusId: row.campusId } : {}),
    ...(row.unitId ? { unitId: row.unitId } : {}),
    ...(row.department ? { department: row.department } : {}),
    ...(row.office ? { office: row.office } : {}),
    level: row.level,
    title: row.title,
    activityStartDate: row.activityStartDate,
    activityEndDate: row.activityEndDate,
    location: row.location,
    activityCount: row.activityCount,
    totalStudents: row.totalStudents,
    totalPic: row.totalPic,
    pics: pics.map((pic) => ({
      id: pic.id,
      name: pic.name,
      ...(pic.email ? { email: pic.email } : {}),
      ...(pic.phone ? { phone: pic.phone } : {}),
      ...(pic.userId ? { userId: pic.userId } : {}),
    })),
    sdgIds: [...sdgIds],
    narrative: row.narrative,
  };
}

/** The detail the register page, the narrative editor, and the receipts read. */
export async function buildReportDetail(
  env: Env,
  row: ReportRow,
  options: {
    canWriteNarrative: boolean;
    canManage: boolean;
    canArchive: boolean;
    canSetCompletedDate: boolean;
    /**
     * This caller may not read the narrative: another PIC after submission, or
     * the office before submission. Everything written about it is withheld.
     */
    concealNarrative: boolean;
    /** Set for a non-admin reader: only their own receipt is disclosed. */
    receiptsForUserId?: string;
  },
): Promise<ReportDetail> {
  const db = createDb(env.DB);
  const read = createReportReadQueries(db);
  const users = createUserQueries(db);

  const [
    pics,
    sdgIds,
    attachments,
    receipts,
    comments,
    history,
    createdBy,
    submittedBy,
    decidedBy,
    archivedBy,
  ] = await Promise.all([
    read.listPics(row.id),
    read.listSdgIds(row.id),
    read.listAttachments(row.id),
    createReceiptQueries(db).listForReport(row.id),
    read.listComments(row.id),
    createAuditQueries(db).listForEntity('report', row.id),
    users.findById(row.createdByUserId),
    row.submittedByUserId ? users.findById(row.submittedByUserId) : Promise.resolve(null),
    row.approvedByUserId ? users.findById(row.approvedByUserId) : Promise.resolve(null),
    row.archivedByUserId ? users.findById(row.archivedByUserId) : Promise.resolve(null),
  ]);

  const visibleReceipts = options.receiptsForUserId
    ? receipts.filter((receipt) => receipt.recipientUserId === options.receiptsForUserId)
    : receipts;

  const latestReturn: ReportCommentRow | undefined = [...comments]
    .reverse()
    .find((comment) => comment.kind === 'RETURN');

  const actorIds = [
    ...new Set(history.flatMap((event) => (event.actorUserId ? [event.actorUserId] : []))),
  ];
  const actors = await Promise.all(actorIds.map((id) => users.findById(id)));
  const actorById = new Map(
    actors.filter((actor) => actor !== null).map((actor) => [actor.id, actor]),
  );
  const edits = history.filter((event) =>
    [
      'RECORD_UPDATED',
      'NARRATIVE_SAVED',
      'NARRATIVE_SIGNED',
      'SIGNATURE_REMOVED',
      'ATTACHMENT_ADDED',
      'ATTACHMENT_REMOVED',
      'ATTACHMENT_RENAMED',
    ].includes(event.action),
  );
  const submission = history.findLast((event) => event.action === 'NARRATIVE_SUBMITTED');
  const editorOf = (event: (typeof history)[number] | undefined) => {
    if (!event?.actorUserId) return null;
    const actor = actorById.get(event.actorUserId);
    return {
      userId: event.actorUserId,
      fullName: actor?.fullName ?? 'Unavailable account',
      role: event.actorRole === 'ADMIN' ? ('ADMIN' as const) : ('PERSONNEL' as const),
      actedAt: event.createdAt,
    };
  };

  const events: ReportHistoryEvent[] = history.map((event) => ({
    id: event.id,
    at: event.createdAt,
    actorName:
      (event.actorUserId ? actorById.get(event.actorUserId) : undefined)?.fullName ??
      'Unavailable account',
    actorRole: event.actorRole ?? 'ADMIN',
    action: event.action,
    ...(event.fromStatus
      ? { fromStatus: event.fromStatus as ReportHistoryEvent['fromStatus'] }
      : {}),
    ...(event.toStatus ? { toStatus: event.toStatus as ReportHistoryEvent['toStatus'] } : {}),
    ...(event.comment && !options.concealNarrative ? { comment: auditNote(event.comment) } : {}),
  }));

  return {
    id: row.id,
    referenceNo: row.referenceNo,
    createdByUserId: row.createdByUserId,
    status: row.status,
    version: row.version,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
    form: {
      ...formOf(row, pics, sdgIds),
      narrative: options.concealNarrative ? '' : row.narrative,
    },
    narrativePrivate: options.concealNarrative,
    pics: pics.map((pic) => ({
      id: pic.id,
      name: pic.name,
      ...(pic.email ? { email: pic.email } : {}),
      ...(pic.phone ? { phone: pic.phone } : {}),
      ...(pic.userId ? { userId: pic.userId } : {}),
    })),
    attachments: options.concealNarrative ? [] : attachments.map(toAttachment),
    receipts: visibleReceipts.map((receipt) => ({
      id: receipt.id,
      recipientName: receipt.recipientName,
      generatedAt: receipt.generatedAt,
      ...(receipt.emailedAt ? { emailedAt: receipt.emailedAt } : {}),
    })),
    ...(latestReturn && !options.concealNarrative
      ? {
          returnEvent: {
            comments: latestReturn.body,
            authorName:
              comments.find((comment) => comment.id === latestReturn.id)?.authorName ?? 'Office',
            createdAt: latestReturn.createdAt,
          },
        }
      : {}),
    ...(row.submittedAt ? { submittedAt: row.submittedAt } : {}),
    ...(submittedBy ? { submittedByName: submittedBy.fullName } : {}),
    ...(row.approvedAt ? { approvedAt: row.approvedAt } : {}),
    ...(row.completedOn ? { completedOn: row.completedOn } : {}),
    people: {
      createdBy: {
        userId: row.createdByUserId,
        fullName: createdBy?.fullName ?? 'Office',
        role: createdBy?.role === 'ADMIN' ? 'ADMIN' : 'PERSONNEL',
        actedAt: row.createdAt,
      },
      firstEditedBy: editorOf(edits[0]),
      lastEditedBy: editorOf(edits.at(-1)),
      submittedBy: submission
        ? editorOf(submission)
        : submittedBy && row.submittedAt
          ? {
              userId: row.submittedByUserId ?? submittedBy.id,
              fullName: submittedBy.fullName,
              role: submittedBy.role === 'ADMIN' ? 'ADMIN' : 'PERSONNEL',
              actedAt: row.submittedAt,
            }
          : null,
      personnel: pics.map((pic) => ({
        ...(pic.userId ? { userId: pic.userId } : {}),
        fullName: pic.name,
        role: 'PERSONNEL' as const,
      })),
      ...(decidedBy
        ? {
            decidedBy: {
              userId: decidedBy.id,
              fullName: decidedBy.fullName,
              role: 'ADMIN' as const,
              ...(row.approvedAt ? { actedAt: row.approvedAt } : {}),
            },
          }
        : {}),
    },
    history: events,
    ...(!options.concealNarrative && row.narrativeSignatureKey && row.narrativeSignedAt
      ? {
          narrativeSignature: {
            signerName: submittedBy?.fullName ?? 'Personnel in charge',
            signedAt: row.narrativeSignedAt,
            /** Byte endpoint: works for a cookie and a bearer-token client alike. */
            signatureUrl: `/api/v1/reports/${row.id}/signature/file`,
          },
        }
      : {}),
    canWriteNarrative: options.canWriteNarrative,
    canManage: options.canManage,
    canArchive: options.canArchive,
    canSetCompletedDate: options.canSetCompletedDate,
    ...(row.archivedAt ? { archivedAt: row.archivedAt } : {}),
    ...(archivedBy ? { archivedByName: archivedBy.fullName } : {}),
  };
}
