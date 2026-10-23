import {
  ATTACHMENT_STATUSES,
  CLASSIFICATIONS,
  LEVELS,
  REPORT_STATUSES,
  REPORT_TYPES,
  type AttachmentStatus,
  type Classification,
  type Level,
  type ReportStatus,
  type ReportType,
} from '@par/shared';
import {
  index,
  integer,
  primaryKey,
  sqliteTable,
  text,
  uniqueIndex,
} from 'drizzle-orm/sqlite-core';

/**
 * The PAR record (spec §7). The office registers the activity; the persons in
 * charge are rows in `report_pics` and write the narrative. `reference_no` is
 * `AR No. 0001`, minted at creation from `reference_counters`, unique for the
 * life of the system.
 */
export const reports = sqliteTable(
  'reports',
  {
    id: text('id').primaryKey(),
    /** Formatted reference, e.g. `AR No. 0001`; unique and never reissued. */
    referenceNo: text('reference_no').notNull(),
    /** Plain sequence for ordering; the counter never goes backwards. */
    sequence: integer('sequence').notNull(),
    type: text('type', { enum: REPORT_TYPES }).$type<ReportType>().notNull(),
    status: text('status', { enum: REPORT_STATUSES }).$type<ReportStatus>().notNull(),
    version: integer('version').notNull().default(0),
    /** The admin who registered the activity. */
    createdByUserId: text('created_by_user_id').notNull(),
    classification: text('classification', { enum: CLASSIFICATIONS })
      .$type<Classification>()
      .notNull(),
    campusId: text('campus_id').notNull(),
    unitId: text('unit_id').notNull(),
    department: text('department'),
    office: text('office'),
    level: text('level', { enum: LEVELS }).$type<Level>().notNull(),
    title: text('title').notNull(),
    activityStartDate: text('activity_start_date').notNull(),
    activityEndDate: text('activity_end_date').notNull(),
    location: text('location').notNull(),
    /** How many sessions or days the one record covers. */
    activityCount: integer('activity_count').notNull().default(1),
    totalStudents: integer('total_students').notNull().default(0),
    totalPic: integer('total_pic').notNull().default(0),
    narrative: text('narrative').notNull().default(''),
    draftForm: text('draft_form'),
    /** The PIC who submitted the narrative. */
    submittedByUserId: text('submitted_by_user_id'),
    /** The submitting PIC's snapshotted signature. */
    narrativeSignatureKey: text('narrative_signature_key'),
    narrativeSignedAt: text('narrative_signed_at'),
    /**
     * The deliberate "no signature" state (bug phase 05 §7): the signer removed
     * the image from the record, so the submit snapshot must not sign it again.
     */
    narrativeSignatureCleared: integer('narrative_signature_cleared', { mode: 'boolean' })
      .notNull()
      .default(false),
    /** The approving officer's snapshotted signature, written at approval. */
    approvalSignatureKey: text('approval_signature_key'),
    approvalSignedAt: text('approval_signed_at'),
    submittedAt: text('submitted_at'),
    approvedAt: text('approved_at'),
    approvedByUserId: text('approved_by_user_id'),
    createdAt: text('created_at').notNull(),
    updatedAt: text('updated_at').notNull(),
  },
  (table) => [
    uniqueIndex('reports_reference_no_unique_idx').on(table.referenceNo),
    index('reports_status_idx').on(table.status),
    index('reports_created_by_idx').on(table.createdByUserId),
    index('reports_activity_idx').on(table.activityStartDate),
    index('reports_submitted_idx').on(table.submittedAt),
  ],
);

export type ReportRow = typeof reports.$inferSelect;
export type NewReportRow = typeof reports.$inferInsert;

/** Many-to-many: one activity can serve several SDGs (spec §7). */
export const reportSdgs = sqliteTable(
  'report_sdgs',
  {
    reportId: text('report_id').notNull(),
    sdgId: text('sdg_id').notNull(),
  },
  (table) => [primaryKey({ columns: [table.reportId, table.sdgId] })],
);

/**
 * The people in charge. Every row carries an email: that address is both the
 * mailbox and the account that may write the narrative. `user_id` links the
 * account, created on assignment when it does not exist.
 */
export const reportPics = sqliteTable(
  'report_pics',
  {
    id: text('id').primaryKey(),
    reportId: text('report_id').notNull(),
    userId: text('user_id'),
    name: text('name').notNull(),
    email: text('email').notNull(),
    phone: text('phone'),
    sortOrder: integer('sort_order').notNull().default(0),
    invitedAt: text('invited_at'),
  },
  (table) => [
    index('report_pics_report_idx').on(table.reportId),
    index('report_pics_user_idx').on(table.userId),
    uniqueIndex('report_pics_report_email_unique_idx').on(table.reportId, table.email),
  ],
);

export type ReportPicRow = typeof reportPics.$inferSelect;

/**
 * One global AR No. sequence (spec §5). Minted atomically with the insert, so
 * two admins creating a record at once never share a number. Gaps are accepted:
 * a deleted draft retires its number rather than renumbering the register.
 */
export const referenceCounters = sqliteTable('reference_counters', {
  name: text('name').primaryKey(),
  lastSeq: integer('last_seq').notNull().default(0),
});

/**
 * One acknowledgment receipt per PIC (spec §10). The PDF is rendered on
 * approval, stored in R2, and mailed; `emailed_at` is written by the consumer.
 */
export const receipts = sqliteTable(
  'receipts',
  {
    id: text('id').primaryKey(),
    reportId: text('report_id').notNull(),
    recipientPicId: text('recipient_pic_id').notNull(),
    recipientUserId: text('recipient_user_id'),
    recipientName: text('recipient_name').notNull(),
    objectKey: text('object_key').notNull(),
    generatedAt: text('generated_at').notNull(),
    emailedAt: text('emailed_at'),
    createdAt: text('created_at').notNull(),
    updatedAt: text('updated_at').notNull(),
  },
  (table) => [
    uniqueIndex('receipts_report_recipient_unique_idx').on(table.reportId, table.recipientPicId),
    index('receipts_report_idx').on(table.reportId),
    index('receipts_user_idx').on(table.recipientUserId),
  ],
);

export type ReceiptRow = typeof receipts.$inferSelect;

/** Return comments and office notes (spec §6); returns carry the round's copy. */
export const reportComments = sqliteTable(
  'report_comments',
  {
    id: text('id').primaryKey(),
    reportId: text('report_id').notNull(),
    authorUserId: text('author_user_id').notNull(),
    kind: text('kind', { enum: ['RETURN', 'OFFICE_NOTE'] }).notNull(),
    round: integer('round').notNull().default(1),
    body: text('body').notNull(),
    createdAt: text('created_at').notNull(),
  },
  (table) => [index('report_comments_report_idx').on(table.reportId, table.createdAt)],
);

export type ReportCommentRow = typeof reportComments.$inferSelect;
export type ReportCommentKind = ReportCommentRow['kind'];

/**
 * Uploaded files (spec §7.8). The object key is server-chosen and never carries
 * a user-provided name; `status` stays PENDING until `confirm` has HEADed the
 * object.
 */
export const attachments = sqliteTable(
  'attachments',
  {
    id: text('id').primaryKey(),
    reportId: text('report_id').notNull(),
    label: text('label').notNull().default(''),
    originalName: text('original_name').notNull(),
    objectKey: text('object_key').notNull(),
    size: integer('size').notNull().default(0),
    mimeType: text('mime_type').notNull().default(''),
    sha256: text('sha256'),
    status: text('status', { enum: ATTACHMENT_STATUSES }).$type<AttachmentStatus>().notNull(),
    uploadedByUserId: text('uploaded_by_user_id').notNull(),
    createdAt: text('created_at').notNull(),
    updatedAt: text('updated_at').notNull(),
  },
  (table) => [
    index('attachments_report_idx').on(table.reportId),
    index('attachments_status_idx').on(table.status),
  ],
);

export type AttachmentRow = typeof attachments.$inferSelect;
