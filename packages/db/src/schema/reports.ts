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
import { index, integer, primaryKey, sqliteTable, text, uniqueIndex } from 'drizzle-orm/sqlite-core';

/**
 * The PAR record (spec §8). Monitoring-sheet fields are columns here, because
 * the three exports read them directly and the form edits them one to one.
 *
 * `tracking_number` is null until first submission and unique once issued, so a
 * retried submit can never mint a second number for the same report. Activities
 * imported from an existing workbook carry the tracking number from that file.
 */
export const reports = sqliteTable(
  'reports',
  {
    id: text('id').primaryKey(),
    type: text('type', { enum: REPORT_TYPES }).$type<ReportType>().notNull(),
    trackingNumber: text('tracking_number'),
    status: text('status', { enum: REPORT_STATUSES }).$type<ReportStatus>().notNull(),
    version: integer('version').notNull().default(0),
    ownerUserId: text('owner_user_id').notNull(),
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
    totalStudents: integer('total_students').notNull().default(0),
    totalPic: integer('total_pic').notNull().default(0),
    narrative: text('narrative').notNull().default(''),
    /** Exact partial input while the report is a draft; columns are the projection. */
    draftForm: text('draft_form'),
    submittedAt: text('submitted_at'),
    endorsedAt: text('endorsed_at'),
    approvedAt: text('approved_at'),
    approvedByUserId: text('approved_by_user_id'),
    createdAt: text('created_at').notNull(),
    updatedAt: text('updated_at').notNull(),
  },
  (table) => [
    uniqueIndex('reports_tracking_number_unique_idx').on(table.trackingNumber),
    index('reports_status_type_idx').on(table.status, table.type),
    index('reports_owner_idx').on(table.ownerUserId),
    index('reports_activity_idx').on(table.activityStartDate),
  ],
);

/** Many-to-many: one activity can serve several SDGs (spec §8). */
export const reportSdgs = sqliteTable(
  'report_sdgs',
  {
    reportId: text('report_id').notNull(),
    sdgId: text('sdg_id').notNull(),
  },
  (table) => [primaryKey({ columns: [table.reportId, table.sdgId] })],
);

/**
 * People in charge. The sheet has one name and one contact column, exported as
 * the joined values, but the form allows more than one PIC per activity.
 */
export const reportPics = sqliteTable(
  'report_pics',
  {
    id: text('id').primaryKey(),
    reportId: text('report_id').notNull(),
    name: text('name').notNull(),
    email: text('email'),
    phone: text('phone'),
    sortOrder: integer('sort_order').notNull().default(0),
  },
  (table) => [index('report_pics_report_idx').on(table.reportId)],
);

/**
 * Atomic per-prefix, per-year sequence (spec §7.7). One row per prefix/year;
 * the submit path increments it in the same batch that issues the number.
 */
export const trackingCounters = sqliteTable(
  'tracking_counters',
  {
    prefix: text('prefix').notNull(),
    year: integer('year').notNull(),
    lastSeq: integer('last_seq').notNull().default(0),
  },
  (table) => [primaryKey({ columns: [table.prefix, table.year] })],
);

/**
 * Uploaded files (spec §7.8). The object key is server-chosen and never carries
 * a user-provided name; `status` stays PENDING until `confirm` has HEADed the
 * object. `sha256` is recorded when the object is read back.
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
    index('attachments_report_idx').on(table.reportId, table.status),
    uniqueIndex('attachments_object_key_unique_idx').on(table.objectKey),
  ],
);

/** Comment kinds (spec §8); returns are the only kind that carries a round. */
export const REPORT_COMMENT_KINDS = ['RETURN', 'REVIEW_NOTE', 'APPROVER_NOTE'] as const;
export type ReportCommentKind = (typeof REPORT_COMMENT_KINDS)[number];

/** Reviewer and approver comments; `round` groups a return with its resubmission. */
export const reportComments = sqliteTable(
  'report_comments',
  {
    id: text('id').primaryKey(),
    reportId: text('report_id').notNull(),
    authorUserId: text('author_user_id').notNull(),
    kind: text('kind', { enum: REPORT_COMMENT_KINDS }).$type<ReportCommentKind>().notNull(),
    round: integer('round').notNull().default(1),
    body: text('body').notNull(),
    createdAt: text('created_at').notNull(),
  },
  (table) => [index('report_comments_report_idx').on(table.reportId, table.createdAt)],
);

/** The generated approval PDF, one per report (spec §7.10). */
export const acknowledgements = sqliteTable(
  'acknowledgements',
  {
    id: text('id').primaryKey(),
    reportId: text('report_id').notNull(),
    objectKey: text('object_key').notNull(),
    generatedAt: text('generated_at').notNull(),
    createdAt: text('created_at').notNull(),
    updatedAt: text('updated_at').notNull(),
  },
  (table) => [uniqueIndex('acknowledgements_report_unique_idx').on(table.reportId)],
);

export type ReportRow = typeof reports.$inferSelect;
export type NewReportRow = typeof reports.$inferInsert;
export type ReportPicRow = typeof reportPics.$inferSelect;
export type ReportSdgRow = typeof reportSdgs.$inferSelect;
export type TrackingCounterRow = typeof trackingCounters.$inferSelect;
export type AttachmentRow = typeof attachments.$inferSelect;
export type ReportCommentRow = typeof reportComments.$inferSelect;
export type AcknowledgementRow = typeof acknowledgements.$inferSelect;
