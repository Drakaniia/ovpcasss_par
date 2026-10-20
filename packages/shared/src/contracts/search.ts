import { z } from 'zod';

import { CLASSIFICATIONS, LEVELS, REPORT_TYPES } from '../domain/enums';
import { idSchema, isoDateSchema, isoDateTimeSchema } from './common';
import { reportFilterOptionSchema, SORT_DIRECTIONS } from './reports';

/**
 * Repository search (UI spec §7.11). One shape serves the URL state, the API
 * query, and the export handoff, so a shared link reproduces exactly what the
 * sender saw. The repository is for retrieval, not browsing: it defaults to
 * approved reports, newest date received first.
 */

/** Drafts are not repository records, so `DRAFT` is not a status here. */
export const REPOSITORY_STATUSES = [
  'SUBMITTED',
  'RETURNED_BY_REVIEWER',
  'RESUBMITTED',
  'ENDORSED',
  'RETURNED_BY_APPROVER',
  'APPROVED',
] as const;
export type RepositoryStatus = (typeof REPOSITORY_STATUSES)[number];

export const REPOSITORY_DEFAULT_STATUS: RepositoryStatus = 'APPROVED';

/** Received and Title are the only sortable headers; received is the default. */
export const REPOSITORY_SORT_FIELDS = ['received', 'title'] as const;
export type RepositorySortField = (typeof REPOSITORY_SORT_FIELDS)[number];

export const REPOSITORY_PAGE_SIZE = 25;

export const repositoryQuerySchema = z.object({
  /** Free text over title, narrative, PIC name, and location. */
  q: z.string().trim().max(120).optional(),
  tracking: z.string().trim().max(40).optional(),
  title: z.string().trim().max(300).optional(),
  type: z.enum(REPORT_TYPES).optional(),
  classification: z.enum(CLASSIFICATIONS).optional(),
  campus: idSchema.optional(),
  /** College or unit id; the report stores it as `unitId`. */
  college: idSchema.optional(),
  term: idSchema.optional(),
  department: z.string().trim().max(120).optional(),
  office: z.string().trim().max(120).optional(),
  level: z.enum(LEVELS).optional(),
  sdg: z.array(idSchema).optional(),
  status: z.enum(REPOSITORY_STATUSES).default(REPOSITORY_DEFAULT_STATUS),
  receivedFrom: isoDateSchema.optional(),
  receivedTo: isoDateSchema.optional(),
  activityFrom: isoDateSchema.optional(),
  activityTo: isoDateSchema.optional(),
  /** Matches the person in charge by name. */
  pic: z.string().trim().max(200).optional(),
  sort: z.enum(REPOSITORY_SORT_FIELDS).default('received'),
  dir: z.enum(SORT_DIRECTIONS).default('desc'),
  page: z.coerce.number().int().min(1).default(1),
  size: z.coerce.number().int().min(1).max(100).default(REPOSITORY_PAGE_SIZE),
});
export type RepositoryQuery = z.infer<typeof repositoryQuerySchema>;

/** One result row, already scoped by the server to what the caller may see. */
export const repositoryItemSchema = z.object({
  id: idSchema,
  ownerUserId: idSchema,
  trackingNumber: z.string().nullable(),
  title: z.string().min(1),
  type: z.enum(REPORT_TYPES),
  classification: z.enum(CLASSIFICATIONS),
  level: z.enum(LEVELS),
  status: z.enum(REPOSITORY_STATUSES),
  campusId: idSchema,
  collegeId: idSchema,
  /** College or unit label, resolved server-side like the other tables. */
  college: z.string().min(1),
  /** Date received; the register's sort key. */
  receivedAt: isoDateTimeSchema,
  activityStartDate: isoDateSchema,
  activityEndDate: isoDateSchema,
  /** Narrative excerpt around the match, when the query matched the narrative. */
  snippet: z.string().optional(),
});
export type RepositoryItem = z.infer<typeof repositoryItemSchema>;

/** Deactivated values stay in the facets so a saved URL can show them inactive. */
export const repositoryFacetsSchema = z.object({
  campuses: z.array(reportFilterOptionSchema),
  colleges: z.array(reportFilterOptionSchema),
  terms: z.array(reportFilterOptionSchema),
  sdgs: z.array(reportFilterOptionSchema),
});
export type RepositoryFacets = z.infer<typeof repositoryFacetsSchema>;

export const repositoryResponseSchema = z.object({
  items: z.array(repositoryItemSchema),
  total: z.number().int().min(0),
  page: z.number().int().min(1),
  size: z.number().int().min(1),
  facets: repositoryFacetsSchema,
});
export type RepositorySearchResponse = z.infer<typeof repositoryResponseSchema>;
