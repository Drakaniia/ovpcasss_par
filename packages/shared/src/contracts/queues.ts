import { z } from 'zod';

import { REPORT_STATUSES, REPORT_TYPES } from '../domain/enums';
import { idSchema, isoDateTimeSchema } from './common';
import { reportFilterOptionSchema } from './reports';

/**
 * The review and approval queues (UI spec §7.9). One template, two roles: the
 * approval queue shows when the reviewer endorsed instead of when it was
 * submitted, and both share columns, filters, and paging.
 */
export const QUEUE_KINDS = ['review', 'approval'] as const;
export type QueueKind = (typeof QUEUE_KINDS)[number];

/** Oldest first is the backlog default; `age` orders by working days waiting. */
export const QUEUE_SORTS = ['oldest', 'newest', 'age'] as const;
export type QueueSort = (typeof QUEUE_SORTS)[number];

/** The queue is never paged differently from the other tables (UI spec §7.9). */
export const QUEUE_PAGE_SIZE = 25;

export const queueQuerySchema = z.object({
  type: z.enum(REPORT_TYPES).optional(),
  campus: idSchema.optional(),
  /** College or unit id; the queue filters by the report's `unitId`. */
  college: idSchema.optional(),
  sort: z.enum(QUEUE_SORTS).default('oldest'),
  page: z.coerce.number().int().min(1).default(1),
  size: z.coerce.number().int().min(1).max(100).default(QUEUE_PAGE_SIZE),
});
export type QueueListQuery = z.infer<typeof queueQuerySchema>;

/** One waiting report, already scoped by the server to the caller's role. */
export const queueItemSchema = z.object({
  id: idSchema,
  ownerUserId: idSchema,
  /** Named so the return copy can say who receives it (UI spec §7.10). */
  submitterName: z.string().min(1),
  trackingNumber: z.string().nullable(),
  title: z.string().min(1),
  type: z.enum(REPORT_TYPES),
  status: z.enum(REPORT_STATUSES),
  campusId: idSchema,
  collegeId: idSchema,
  /** College or unit label, resolved server-side like the table's other values. */
  college: z.string().min(1),
  /** Review queue: when it was submitted. Approval queue: when it was endorsed. */
  waitingSince: isoDateTimeSchema,
  /** An attachment still uploading blocks a decision (UI spec §7.9 §6). */
  hasPendingAttachments: z.boolean().default(false),
});
export type QueueItem = z.infer<typeof queueItemSchema>;

export const queueFacetsSchema = z.object({
  campuses: z.array(reportFilterOptionSchema),
  colleges: z.array(reportFilterOptionSchema),
});
export type QueueFacets = z.infer<typeof queueFacetsSchema>;

export const queueResponseSchema = z.object({
  items: z.array(queueItemSchema),
  total: z.number().int().min(0),
  page: z.number().int().min(1),
  size: z.number().int().min(1),
  /** Working days the oldest waiting report has waited, for the header summary. */
  oldestAgeDays: z.number().int().min(0),
  facets: queueFacetsSchema,
});
export type QueueListResponse = z.infer<typeof queueResponseSchema>;
