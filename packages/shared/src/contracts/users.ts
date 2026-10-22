import { z } from 'zod';

import { ROLES, USER_STATUSES } from '../domain/enums';
import { idSchema, isoDateTimeSchema } from './common';

/**
 * Account row and drawer facts for the administrator's user directory
 * (UI spec §7.15). The server owns role/status transitions; the client only
 * requests them and renders what the API returns.
 */
export const adminUserSchema = z.object({
  id: idSchema,
  fullName: z.string().min(1),
  email: z.string().min(1),
  role: z.enum(ROLES).nullable(),
  status: z.enum(USER_STATUSES),
  campusUnit: z.string().nullable(),
  contactNumber: z.string().nullable(),
  registeredAt: isoDateTimeSchema,
  emailVerifiedAt: isoDateTimeSchema.nullable(),
  lastSignedInAt: isoDateTimeSchema.nullable().optional(),
});
export type AdminUser = z.infer<typeof adminUserSchema>;

export const ADMIN_USER_SORTS = ['name', 'registered'] as const;
export type AdminUserSort = (typeof ADMIN_USER_SORTS)[number];

export const ADMIN_USER_DIRECTIONS = ['asc', 'desc'] as const;
export type AdminUserDirection = (typeof ADMIN_USER_DIRECTIONS)[number];

/** Query keys mirror the URL state so a filtered view is shareable (phase 03 §2). */
export const adminUserListQuerySchema = z.object({
  q: z.string().trim().max(200).optional(),
  role: z.enum(ROLES).optional(),
  status: z.enum(USER_STATUSES).optional(),
  sort: z.enum(ADMIN_USER_SORTS).optional(),
  dir: z.enum(ADMIN_USER_DIRECTIONS).optional(),
  page: z.number().int().min(1).optional(),
  pageSize: z.number().int().min(1).max(100).optional(),
});
export type AdminUserListQuery = z.input<typeof adminUserListQuerySchema>;

export const adminUserListResponseSchema = z.object({
  items: z.array(adminUserSchema),
  total: z.number().int().min(0),
  page: z.number().int().min(1),
  pageSize: z.number().int().min(1),
});
export type AdminUserListResponse = z.infer<typeof adminUserListResponseSchema>;

export const assignUserRoleSchema = z.object({ role: z.enum(ROLES) });
export type AssignUserRoleInput = z.infer<typeof assignUserRoleSchema>;
