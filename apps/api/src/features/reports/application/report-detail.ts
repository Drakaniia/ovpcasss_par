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
import { toAttachment } from './record-shape';

function formOf(row: ReportRow, pics: readonly ReportPicRow[], sdgIds: readonly string[]) {
  return {
    type: row.type,
    classification: row.classification,
    campusId: row.campusId,
    unitId: row.unitId,
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
      email: pic.email,
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
    /** The office never reads a narrative draft before it is submitted. */
    concealUnsubmitted: boolean;
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

  const events: ReportHistoryEvent[] = history.map((event) => ({
    id: event.id,
    at: event.createdAt,
    actorName:
      [createdBy, submittedBy, decidedBy].find((user) => user?.id === event.actorUserId)
        ?.fullName ?? 'Office',
    actorRole: event.actorRole ?? 'ADMIN',
    action: event.action,
    ...(event.fromStatus
      ? { fromStatus: event.fromStatus as ReportHistoryEvent['fromStatus'] }
      : {}),
    ...(event.toStatus ? { toStatus: event.toStatus as ReportHistoryEvent['toStatus'] } : {}),
    ...(event.comment ? { comment: event.comment } : {}),
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
      narrative: options.concealUnsubmitted ? '' : row.narrative,
    },
    pics: pics.map((pic) => ({
      id: pic.id,
      name: pic.name,
      email: pic.email,
      ...(pic.phone ? { phone: pic.phone } : {}),
      ...(pic.userId ? { userId: pic.userId } : {}),
    })),
    attachments: options.concealUnsubmitted ? [] : attachments.map(toAttachment),
    receipts: visibleReceipts.map((receipt) => ({
      id: receipt.id,
      recipientName: receipt.recipientName,
      generatedAt: receipt.generatedAt,
      ...(receipt.emailedAt ? { emailedAt: receipt.emailedAt } : {}),
    })),
    ...(latestReturn
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
    people: {
      createdBy: {
        userId: row.createdByUserId,
        fullName: createdBy?.fullName ?? 'Office',
        role: 'ADMIN',
      },
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
    ...(row.narrativeSignatureKey && row.narrativeSignedAt
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
    ...(row.archivedAt ? { archivedAt: row.archivedAt } : {}),
    ...(archivedBy ? { archivedByName: archivedBy.fullName } : {}),
  };
}
