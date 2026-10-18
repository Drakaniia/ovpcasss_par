import { z } from 'zod';

import { CLASSIFICATIONS, LEVELS, REPORT_STATUSES, REPORT_TYPES, ROLES } from '../domain/enums';
import { attachmentSchema } from './attachments';
import { emailSchema } from './auth';
import { idSchema, isoDateTimeSchema } from './common';

/** A person in charge: name is required, email and phone are validated when supplied. */
export const reportPicSchema = z.object({
  name: z.string().trim().min(1).max(200),
  email: z.union([z.literal(''), emailSchema]).optional(),
  phone: z.string().trim().max(50).optional(),
});
export type ReportPic = z.infer<typeof reportPicSchema>;

export const reportFormSchema = z.object({
  type: z.enum(REPORT_TYPES),
  classification: z.enum(CLASSIFICATIONS),
  campusId: idSchema,
  unitId: idSchema,
  department: z.string().max(120).optional(),
  office: z.string().max(120).optional(),
  level: z.enum(LEVELS),
  title: z.string().min(1).max(300),
  activityStartDate: z.string().min(1),
  activityEndDate: z.string().min(1),
  location: z.string().min(1).max(300),
  totalStudents: z.number().int().min(0),
  totalPic: z.number().int().min(0),
  pics: z.array(reportPicSchema).min(1),
  sdgIds: z.array(idSchema).min(1),
  narrative: z.string().min(1),
});
export type ReportFormInput = z.infer<typeof reportFormSchema>;

/** Drafts are partial until submit; values stay in `form` so they survive schema changes. */
export type ReportDraftForm = Partial<ReportFormInput>;

/** Local or server-side draft. */
export interface ReportDraft {
  /** Local id, available the moment the wizard opens. */
  id: string;
  /** Server draft id, set once the API has persisted the draft. */
  serverId?: string;
  version: number;
  updatedAt: string;
  /** Last wizard step, so a restored draft reopens where the submitter left off. */
  step?: number;
  form: ReportDraftForm;
}

export const returnReportSchema = z.object({
  comments: z.string().min(1).max(4000),
});
export type ReturnReportInput = z.infer<typeof returnReportSchema>;

/* ---------- My reports list (UI spec §7.4) ---------- */

/** Tabs double as the `?tab=` state of `/reports`; Drafts is a status scope. */
export const REPORT_LIST_TABS = ['all', 'drafts', 'returned', 'approved'] as const;
export type ReportListTab = (typeof REPORT_LIST_TABS)[number];

/** Only these headers sort; Updated is the default order, not a click target. */
export const REPORT_SORT_FIELDS = ['updated', 'trackingNumber', 'activityDate', 'status'] as const;
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

/**
 * Filters, tab, sort, and paging live in the URL (`?tab=all&type=OFF_CAMPUS`),
 * so a shared view reproduces exactly what the sender saw.
 */
export const reportListQuerySchema = z.object({
  tab: z.enum(REPORT_LIST_TABS).default('all'),
  type: z.enum(REPORT_TYPES).optional(),
  campus: idSchema.optional(),
  term: idSchema.optional(),
  from: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  to: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  q: z.string().trim().max(120).optional(),
  sort: z.enum(REPORT_SORT_FIELDS).default('updated'),
  dir: z.enum(SORT_DIRECTIONS).default('desc'),
  page: z.coerce.number().int().min(1).default(1),
  size: pageSizeSchema.default(REPORT_PAGE_SIZES[0]),
});
export type ReportListQuery = z.infer<typeof reportListQuerySchema>;

/** One row of the table; the server already scoped it to what the caller may see. */
export const reportListItemSchema = z.object({
  id: idSchema,
  ownerUserId: idSchema,
  trackingNumber: z.string().nullable(),
  title: z.string().min(1),
  type: z.enum(REPORT_TYPES),
  status: z.enum(REPORT_STATUSES),
  activityStartDate: z.string().min(1),
  activityEndDate: z.string().min(1),
  updatedAt: isoDateTimeSchema,
});
export type ReportListItem = z.infer<typeof reportListItemSchema>;

/** Deactivated entries stay in the facets so a saved URL can show them as inactive. */
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

/* ---------- Create, validate, submit (UI spec §7.5) ---------- */

/**
 * The head of a report, returned when a draft is created or updated. The client
 * uses the id for validation, submission, and attachment endpoints.
 */
export const reportHeadSchema = z.object({
  id: idSchema,
  version: z.number().int().min(0),
  status: z.enum(REPORT_STATUSES),
  trackingNumber: z.string().nullable().optional(),
  updatedAt: isoDateTimeSchema.optional(),
});
export type ReportHead = z.infer<typeof reportHeadSchema>;

/** Field-level problems returned by `POST /reports/:id/validate`, rendered as a linked summary. */
export const reportValidationIssueSchema = z.object({
  field: z.string().min(1),
  message: z.string().min(1),
  step: z.number().int().min(1).max(4).optional(),
});
export type ReportValidationIssue = z.infer<typeof reportValidationIssueSchema>;

export const reportValidationResponseSchema = z.object({
  valid: z.boolean(),
  issues: z.array(reportValidationIssueSchema),
});
export type ReportValidationResponse = z.infer<typeof reportValidationResponseSchema>;

/** The tracking number is issued on first submission only. */
export const submitReportResponseSchema = reportHeadSchema.extend({
  trackingNumber: z.string().min(1),
  submittedAt: isoDateTimeSchema.optional(),
});
export type SubmitReportResponse = z.infer<typeof submitReportResponseSchema>;

/* ---------- Detail and edit returned (UI spec §7.6) ---------- */

/**
 * The latest return, shown in the maroon callout. `fieldIds` are optional: when
 * the API omits them the comment stands alone and no field is flagged.
 */
export const reportReturnEventSchema = z.object({
  round: z.number().int().min(1).optional(),
  comments: z.string().min(1),
  authorName: z.string().min(1),
  authorRole: z.enum(ROLES),
  createdAt: isoDateTimeSchema,
  fieldIds: z.array(z.string()).optional(),
});
export type ReportReturnEvent = z.infer<typeof reportReturnEventSchema>;

/**
 * A named participant in the workflow. Roles that have not acted are omitted
 * from `reportPeopleSchema`, never rendered with a blank name.
 */
export const reportPersonSchema = z.object({
  userId: idSchema.optional(),
  fullName: z.string().min(1),
  role: z.enum(ROLES),
  /** When this person last acted in that role. */
  actedAt: isoDateTimeSchema.optional(),
});
export type ReportPerson = z.infer<typeof reportPersonSchema>;

export const reportPeopleSchema = z.object({
  submitter: reportPersonSchema,
  reviewer: reportPersonSchema.nullable().optional(),
  approver: reportPersonSchema.nullable().optional(),
});
export type ReportPeople = z.infer<typeof reportPeopleSchema>;

/**
 * One audit event as the facsimile timeline presents it. The API owns the
 * action copy; the UI only adds the status transition and the actor role.
 */
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

/** One round of review comments, grouped under "Round n" in the document. */
export const reportCommentRoundSchema = z.object({
  round: z.number().int().min(1),
  authorName: z.string().min(1),
  authorRole: z.enum(ROLES),
  createdAt: isoDateTimeSchema,
  comments: z.string().min(1),
});
export type ReportCommentRound = z.infer<typeof reportCommentRoundSchema>;

/** The approver's signature; absent until the approval is recorded. */
export const reportApprovalSchema = z.object({
  signerName: z.string().min(1),
  signedAt: isoDateTimeSchema,
  /** Short-lived signed URL to the approver's signature image. */
  signatureUrl: z.string().min(1).optional(),
});
export type ReportApproval = z.infer<typeof reportApprovalSchema>;

/** Full report used by the facsimile and the edit-returned page. */
export const reportDetailSchema = z.object({
  id: idSchema,
  ownerUserId: idSchema,
  trackingNumber: z.string().nullable(),
  status: z.enum(REPORT_STATUSES),
  version: z.number().int().min(0),
  updatedAt: isoDateTimeSchema,
  form: reportFormSchema,
  attachments: z.array(attachmentSchema),
  /** Latest return only; earlier rounds live in the facsimile's review history. */
  returnEvent: reportReturnEventSchema.nullable().optional(),
  submittedAt: isoDateTimeSchema.optional(),
  returnedAt: isoDateTimeSchema.optional(),
  /** Set when the approving officer records the approval. */
  completedAt: isoDateTimeSchema.optional(),
  /** Who holds the report, as far as it has travelled (facsimile rail). */
  people: reportPeopleSchema.optional(),
  /** Full audit timeline for the facsimile; ascending is the UI's business. */
  history: z.array(reportHistoryEventSchema).optional(),
  /** Every return round with its comment, oldest first. */
  commentRounds: z.array(reportCommentRoundSchema).optional(),
  approval: reportApprovalSchema.nullable().optional(),
  /** Who last changed the report, when the API supplies it (409 copy). */
  updatedByName: z.string().optional(),
});
export type ReportDetail = z.infer<typeof reportDetailSchema>;

/** Watermark the API applies to a facsimile PDF; approved reports carry none. */
export const REPORT_PDF_WATERMARKS = ['NONE', 'DRAFT', 'NOT_APPROVED'] as const;
export type ReportPdfWatermark = (typeof REPORT_PDF_WATERMARKS)[number];

/** Short-lived signed URL for a server-rendered facsimile PDF (UI spec §7.8). */
export const reportPdfResponseSchema = z.object({
  url: z.string().min(1),
  expiresAt: isoDateTimeSchema.optional(),
  watermark: z.enum(REPORT_PDF_WATERMARKS),
});
export type ReportPdfResponse = z.infer<typeof reportPdfResponseSchema>;

/**
 * Server-generated acknowledgement for an approved report (derived, phase 08
 * §6). The UI never signs or renders the PDF itself.
 */
export const acknowledgementResponseSchema = z.object({
  url: z.string().min(1),
  expiresAt: isoDateTimeSchema.optional(),
});
export type AcknowledgementResponse = z.infer<typeof acknowledgementResponseSchema>;
