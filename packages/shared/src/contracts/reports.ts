import { z } from 'zod';

import { CLASSIFICATIONS, LEVELS, REPORT_STATUSES, REPORT_TYPES, ROLES } from '../domain/enums';
import { attachmentSchema } from './attachments';
import { emailSchema, signatureUploadSchema } from './auth';
import { idSchema, isoDateTimeSchema } from './common';
import { LOCATION_MAX_LENGTH } from './locations';

/** Every listed PIC needs an email: that address is the account and the mailbox. */
export const reportPicSchema = z.object({
  id: idSchema.optional(),
  name: z.string().trim().min(1).max(200),
  email: emailSchema,
  phone: z.string().trim().max(50).optional(),
  /** Set when the address already has an account. */
  userId: idSchema.optional(),
});
export type ReportPic = z.infer<typeof reportPicSchema>;

/** Steps 1-3 of the office's record: everything the admin owns (spec §12.1). */
export const reportActivitySchema = z.object({
  type: z.enum(REPORT_TYPES),
  classification: z.enum(CLASSIFICATIONS),
  /** Campus and college/unit are optional: the office fills them in when known. */
  campusId: idSchema.optional(),
  unitId: idSchema.optional(),
  department: z.string().max(120).optional(),
  office: z.string().max(120).optional(),
  level: z.enum(LEVELS),
  title: z.string().min(1).max(300),
  activityStartDate: z.string().min(1),
  activityEndDate: z.string().min(1),
  location: z.string().min(1).max(LOCATION_MAX_LENGTH),
  activityCount: z.number().int().min(1),
  totalStudents: z.number().int().min(0),
  totalPic: z.number().int().min(0),
  pics: z.array(reportPicSchema).min(1),
  sdgIds: z.array(idSchema).min(1),
});
export type ReportActivityInput = z.infer<typeof reportActivitySchema>;

/** The PIC's half: typed narrative, saved as a draft until submitted. */
export const reportNarrativeSchema = z.object({
  narrative: z.string().max(50_000),
});
export type ReportNarrativeInput = z.infer<typeof reportNarrativeSchema>;

/**
 * Activity corrections after submission (spec §9). The narrative, attachments
 * and signature are never part of this shape; a submitted record needs a reason.
 */
export const reportUpdateSchema = reportActivitySchema.extend({
  reason: z.string().trim().max(500).optional(),
});
export type ReportUpdateInput = z.infer<typeof reportUpdateSchema>;

/**
 * The office's Date Completed (spec §7.13), a Manila calendar date. It is what
 * the monitoring sheet prints; the approval timestamp still records when the
 * decision was made, so an issued receipt never changes.
 */
export const reportCompletedDateSchema = z.object({
  /** `null` clears it, and the sheet falls back to the approval date. */
  completedOn: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, 'Use a date in YYYY-MM-DD form')
    .nullable(),
});
export type ReportCompletedDateInput = z.infer<typeof reportCompletedDateSchema>;

/** The whole record as the facsimile and the detail page read it. */
export const reportFormSchema = reportActivitySchema.extend({
  narrative: z.string(),
});
export type ReportFormInput = z.infer<typeof reportFormSchema>;
export type ReportDraftForm = Partial<ReportFormInput>;

/* ---------- Register ---------- */

/** `pending` is the office's list of records whose narrative is still missing. */
export const REPORT_LIST_TABS = ['all', 'pending', 'submitted', 'returned', 'approved'] as const;
export type ReportListTab = (typeof REPORT_LIST_TABS)[number];

export const REPORT_SORT_FIELDS = ['updated', 'referenceNo', 'activityDate', 'status'] as const;
export type ReportSortField = (typeof REPORT_SORT_FIELDS)[number];

export const SORT_DIRECTIONS = ['asc', 'desc'] as const;
export type SortDirection = (typeof SORT_DIRECTIONS)[number];

export const REPORT_PAGE_SIZES = [25, 50, 100] as const;
export type ReportPageSize = (typeof REPORT_PAGE_SIZES)[number];

const pageSizeSchema = z.union([
  z.literal(REPORT_PAGE_SIZES[0]),
  z.literal(REPORT_PAGE_SIZES[1]),
  z.literal(REPORT_PAGE_SIZES[2]),
]);

const pageSizeQuerySchema = z.preprocess(
  (value) => (typeof value === 'string' && value.trim() !== '' ? Number(value) : value),
  pageSizeSchema,
);

/** A filing flag: archived rows leave the register unless asked for. */
export const REPORT_ARCHIVE_FILTERS = ['active', 'archived', 'all'] as const;
export type ReportArchiveFilter = (typeof REPORT_ARCHIVE_FILTERS)[number];

export const reportListQuerySchema = z.object({
  tab: z.enum(REPORT_LIST_TABS).default('all'),
  archived: z.enum(REPORT_ARCHIVE_FILTERS).default('active'),
  type: z.enum(REPORT_TYPES).optional(),
  campus: idSchema.optional(),
  term: idSchema.optional(),
  from: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/)
    .optional(),
  to: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/)
    .optional(),
  q: z.string().trim().max(120).optional(),
  /** Matches a personnel in charge by name only, never the title. */
  picName: z.string().trim().max(120).optional(),
  /** Matches the names of the accounts that submitted the narrative. */
  submittedBy: z.string().trim().max(120).optional(),
  sort: z.enum(REPORT_SORT_FIELDS).default('updated'),
  dir: z.enum(SORT_DIRECTIONS).default('desc'),
  page: z.coerce.number().int().min(1).default(1),
  size: pageSizeQuerySchema.default(REPORT_PAGE_SIZES[0]),
});
export type ReportListQuery = z.infer<typeof reportListQuerySchema>;

export const reportListItemSchema = z.object({
  id: idSchema,
  referenceNo: z.string().min(1),
  title: z.string().min(1),
  type: z.enum(REPORT_TYPES),
  status: z.enum(REPORT_STATUSES),
  activityStartDate: z.string().min(1),
  activityEndDate: z.string().min(1),
  location: z.string(),
  /** Joined PIC names, so the register answers "who is accountable" at a glance. */
  picNames: z.string(),
  /** The PIC who pressed submit; null until the first submission. */
  submittedByName: z.string().nullable().optional(),
  updatedAt: isoDateTimeSchema,
  submittedAt: isoDateTimeSchema.nullable().optional(),
  /** Set once the office files an approved record away. */
  archivedAt: isoDateTimeSchema.nullable().optional(),
});
export type ReportListItem = z.infer<typeof reportListItemSchema>;

export const reportFilterOptionSchema = z.object({
  id: idSchema,
  label: z.string().min(1),
  isActive: z.boolean(),
});
export type ReportFilterOption = z.infer<typeof reportFilterOptionSchema>;

export const reportListFacetsSchema = z.object({
  campuses: z.array(reportFilterOptionSchema),
  terms: z.array(reportFilterOptionSchema),
});
export type ReportListFacets = z.infer<typeof reportListFacetsSchema>;

export const reportListResponseSchema = z.object({
  items: z.array(reportListItemSchema),
  total: z.number().int().min(0),
  page: z.number().int().min(1),
  size: pageSizeSchema,
  facets: reportListFacetsSchema,
});
export type ReportListResponse = z.infer<typeof reportListResponseSchema>;

/* ---------- Palette search ---------- */

export const reportSearchQuerySchema = z.object({
  q: z
    .string()
    .trim()
    .max(120)
    .optional()
    .refine((value) => value === undefined || value.length >= 2, {
      message: 'Type at least two characters',
    }),
  limit: z.coerce.number().int().min(1).max(20).default(8),
});
export type ReportSearchQuery = z.infer<typeof reportSearchQuerySchema>;

export const REPORT_SEARCH_MATCHES = [
  'reference',
  'title',
  'narrative',
  'location',
  'pic',
] as const;
export type ReportSearchMatch = (typeof REPORT_SEARCH_MATCHES)[number];

export const reportSearchItemSchema = reportListItemSchema.extend({
  classification: z.enum(CLASSIFICATIONS),
  unitName: z.string().nullable(),
  matched: z.enum(REPORT_SEARCH_MATCHES).optional(),
  snippet: z.string().optional(),
});
export type ReportSearchItem = z.infer<typeof reportSearchItemSchema>;

export const reportSearchResponseSchema = z.object({ items: z.array(reportSearchItemSchema) });
export type ReportSearchResponse = z.infer<typeof reportSearchResponseSchema>;

/* ---------- Create, narrative, decisions ---------- */

export const reportHeadSchema = z.object({
  id: idSchema,
  version: z.number().int().min(0),
  status: z.enum(REPORT_STATUSES),
  referenceNo: z.string().min(1),
  updatedAt: isoDateTimeSchema.optional(),
});
export type ReportHead = z.infer<typeof reportHeadSchema>;

export const submitNarrativeResponseSchema = reportHeadSchema.extend({
  submittedAt: isoDateTimeSchema.optional(),
});
export type SubmitNarrativeResponse = z.infer<typeof submitNarrativeResponseSchema>;

/* ---------- Deleting ---------- */

/**
 * Filing may end in removal (2026-10-27): the office archives an approved
 * record, then deletes it. Acknowledgment receipts may already be with the
 * PICs, so the caller says whether those PDFs are kept in storage.
 */
export const REPORT_DELETE_RECEIPT_POLICIES = ['keep', 'void'] as const;
export type ReportDeleteReceiptPolicy = (typeof REPORT_DELETE_RECEIPT_POLICIES)[number];

export const reportDeleteQuerySchema = z.object({
  receipts: z.enum(REPORT_DELETE_RECEIPT_POLICIES).default('keep'),
});
export type ReportDeleteQuery = z.infer<typeof reportDeleteQuerySchema>;

/** What the office is told afterwards: the number gone and the register after it. */
export const reportDeleteResponseSchema = z.object({
  referenceNo: z.string().min(1),
  /** Records after the deleted one that moved down one number. */
  renumbered: z.number().int().min(0),
  /** The number the next created record will receive. */
  nextReferenceNo: z.string().min(1),
  receiptsVoided: z.number().int().min(0),
});
export type ReportDeleteResponse = z.infer<typeof reportDeleteResponseSchema>;

export const REPORT_DECISIONS = ['APPROVE', 'RETURN'] as const;
export type ReportDecision = (typeof REPORT_DECISIONS)[number];

export const reportDecisionSchema = z.object({
  decision: z.enum(REPORT_DECISIONS),
  /** Required on a return; kept as an office note on an approval. */
  comments: z.string().trim().max(4000).optional(),
});
export type ReportDecisionInput = z.infer<typeof reportDecisionSchema>;

/* ---------- Detail ---------- */

export const reportReturnEventSchema = z.object({
  comments: z.string().min(1),
  authorName: z.string().min(1),
  createdAt: isoDateTimeSchema,
});
export type ReportReturnEvent = z.infer<typeof reportReturnEventSchema>;

export const reportPersonSchema = z.object({
  userId: idSchema.optional(),
  fullName: z.string().min(1),
  role: z.enum(ROLES),
  actedAt: isoDateTimeSchema.optional(),
});
export type ReportPerson = z.infer<typeof reportPersonSchema>;

export const reportPeopleSchema = z.object({
  createdBy: reportPersonSchema,
  personnel: z.array(reportPersonSchema),
  decidedBy: reportPersonSchema.nullable().optional(),
});
export type ReportPeople = z.infer<typeof reportPeopleSchema>;

export const reportHistoryEventSchema = z.object({
  id: idSchema.optional(),
  at: isoDateTimeSchema,
  actorName: z.string().min(1),
  actorRole: z.enum(ROLES),
  action: z.string().min(1),
  fromStatus: z.enum(REPORT_STATUSES).nullable().optional(),
  toStatus: z.enum(REPORT_STATUSES).nullable().optional(),
  comment: z.string().optional(),
});
export type ReportHistoryEvent = z.infer<typeof reportHistoryEventSchema>;

export const reportSignatureSchema = z.union([
  signatureUploadSchema,
  z.object({ fromProfile: z.literal(true) }),
]);
export type ReportSignatureInput = z.infer<typeof reportSignatureSchema>;

export const reportSubmitterSignatureSchema = z.object({
  signerName: z.string().min(1),
  signedAt: isoDateTimeSchema,
  signatureUrl: z.string().min(1).optional(),
});
export type ReportSubmitterSignature = z.infer<typeof reportSubmitterSignatureSchema>;

export const reportReceiptSchema = z.object({
  id: idSchema,
  recipientName: z.string().min(1),
  generatedAt: isoDateTimeSchema,
  emailedAt: isoDateTimeSchema.nullable().optional(),
  /** Short-lived signed URL; omitted until it is requested. */
  url: z.string().optional(),
});
export type ReportReceipt = z.infer<typeof reportReceiptSchema>;

/** One issued receipt in the recipient's own history (spec §10). */
export const myReceiptSchema = reportReceiptSchema.extend({
  reportId: idSchema,
  referenceNo: z.string().min(1),
  title: z.string().min(1),
});
export type MyReceipt = z.infer<typeof myReceiptSchema>;

export const reportDetailSchema = z.object({
  id: idSchema,
  referenceNo: z.string().min(1),
  createdByUserId: idSchema,
  status: z.enum(REPORT_STATUSES),
  version: z.number().int().min(0),
  createdAt: isoDateTimeSchema,
  updatedAt: isoDateTimeSchema,
  form: reportFormSchema,
  pics: z.array(reportPicSchema),
  attachments: z.array(attachmentSchema),
  receipts: z.array(reportReceiptSchema),
  returnEvent: reportReturnEventSchema.nullable().optional(),
  submittedAt: isoDateTimeSchema.optional(),
  submittedByName: z.string().optional(),
  approvedAt: isoDateTimeSchema.optional(),
  /** The office's Date Completed, when it is not the approval date. */
  completedOn: z.string().optional(),
  people: reportPeopleSchema.optional(),
  history: z.array(reportHistoryEventSchema).optional(),
  narrativeSignature: reportSubmitterSignatureSchema.nullable().optional(),
  /** The caller is a listed PIC: the client shows the narrative editor. */
  canWriteNarrative: z.boolean().optional(),
  /**
   * Another PIC submitted this narrative: its words, files, and signature are
   * withheld from this caller, who may still read the activity itself.
   */
  narrativePrivate: z.boolean().optional(),
  /** The caller may edit activity details, assign PICs, or delete a draft. */
  canManage: z.boolean().optional(),
  /** The caller (the office) may archive or unarchive this approved record. */
  canArchive: z.boolean().optional(),
  /** The caller may record this approved record's Date Completed. */
  canSetCompletedDate: z.boolean().optional(),
  archivedAt: isoDateTimeSchema.optional(),
  archivedByName: z.string().optional(),
});
export type ReportDetail = z.infer<typeof reportDetailSchema>;

export const REPORT_PDF_WATERMARKS = ['NONE', 'NOT_SUBMITTED', 'NOT_APPROVED'] as const;
export type ReportPdfWatermark = (typeof REPORT_PDF_WATERMARKS)[number];

export const reportPdfResponseSchema = z.object({
  url: z.string().min(1),
  expiresAt: isoDateTimeSchema.optional(),
  watermark: z.enum(REPORT_PDF_WATERMARKS),
});
export type ReportPdfResponse = z.infer<typeof reportPdfResponseSchema>;
