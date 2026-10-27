import { z } from 'zod';

import { CLASSIFICATIONS, LEVELS, REPORT_STATUSES, REPORT_TYPES } from '../domain/enums';
import { idSchema, isoDateSchema, isoDateTimeSchema } from './common';
import { reportFilterOptionSchema, SORT_DIRECTIONS } from './reports';

/**
 * Repository search (spec §17). One shape serves the URL state, the API query,
 * and the export handoff. A pending record has no submitted narrative, so the
 * office's repository does not carry it.
 */
export const REPOSITORY_STATUSES = REPORT_STATUSES.filter(
  (status) => status !== 'PENDING',
) as readonly Exclude<(typeof REPORT_STATUSES)[number], 'PENDING'>[];
export type RepositoryStatus = (typeof REPOSITORY_STATUSES)[number];

export const REPOSITORY_DEFAULT_STATUS: RepositoryStatus = 'APPROVED';

export const REPOSITORY_SORT_FIELDS = ['received', 'title'] as const;
export type RepositorySortField = (typeof REPOSITORY_SORT_FIELDS)[number];

export const REPOSITORY_PAGE_SIZE = 25;

export const repositoryQuerySchema = z.object({
  q: z.string().trim().max(120).optional(),
  reference: z.string().trim().max(40).optional(),
  title: z.string().trim().max(300).optional(),
  type: z.enum(REPORT_TYPES).optional(),
  classification: z.enum(CLASSIFICATIONS).optional(),
  campus: idSchema.optional(),
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
  pic: z.string().trim().max(200).optional(),
  sort: z.enum(REPOSITORY_SORT_FIELDS).default('received'),
  dir: z.enum(SORT_DIRECTIONS).default('desc'),
  page: z.coerce.number().int().min(1).default(1),
  size: z.coerce.number().int().min(1).max(100).default(REPOSITORY_PAGE_SIZE),
});
export type RepositoryQuery = z.infer<typeof repositoryQuerySchema>;

export const repositoryItemSchema = z.object({
  id: idSchema,
  referenceNo: z.string().min(1),
  title: z.string().min(1),
  type: z.enum(REPORT_TYPES),
  classification: z.enum(CLASSIFICATIONS),
  level: z.enum(LEVELS),
  status: z.enum(REPOSITORY_STATUSES),
  /** Null when the record was filed without a campus or college/unit. */
  campusId: idSchema.nullable(),
  collegeId: idSchema.nullable(),
  college: z.string(),
  picNames: z.string(),
  receivedAt: isoDateTimeSchema,
  activityStartDate: isoDateSchema,
  activityEndDate: isoDateSchema,
  snippet: z.string().optional(),
});
export type RepositoryItem = z.infer<typeof repositoryItemSchema>;

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
