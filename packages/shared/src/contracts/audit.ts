import { z } from 'zod';

import { ROLES } from '../domain/enums';
import { idSchema, isoDateTimeSchema } from './common';

export const AUDIT_ENTITY_TYPES = [
  'user',
  'report',
  'attachment',
  'reference_data',
  'export',
  'session',
] as const;
export type AuditEntityType = (typeof AUDIT_ENTITY_TYPES)[number];

export const AUDIT_ACTIONS = [
  'REGISTER',
  'LOGIN',
  'LOGIN_FAILED',
  'PASSWORD_RESET_REQUESTED',
  'PASSWORD_RESET',
  'ROLE_ASSIGNED',
  'USER_APPROVED',
  'USER_DISABLED',
  'PROFILE_UPDATED',
  'SIGNATURE_UPDATED',
  'SIGNATURE_REMOVED',
  'SIGNATURE_ATTACHED',
  'RECORD_CREATED',
  'RECORD_UPDATED',
  'RECORD_COMPLETED_DATE_SET',
  'RECORD_DELETED',
  'RECORD_RENUMBERED',
  'RECORD_ARCHIVED',
  'RECORD_UNARCHIVED',
  'PIC_ASSIGNED',
  'PIC_REMOVED',
  'NARRATIVE_SAVED',
  'NARRATIVE_SUBMITTED',
  'NARRATIVE_SIGNED',
  'NARRATIVE_RETURNED',
  'NARRATIVE_APPROVED',
  'RECEIPT_ISSUED',
  'RECEIPT_DOWNLOADED',
  'INVITATION_RESENT',
  'SUBMITTED',
  'RETURNED',
  'APPROVED',
  'EXPORTED',
  'REGISTER_EXPORTED',
  'REFERENCE_SEEDED',
  'REFERENCE_CREATED',
  'REFERENCE_UPDATED',
  'REFERENCE_DEACTIVATED',
  'REFERENCE_ACTIVATED',
  'ATTACHMENT_ADDED',
  'ATTACHMENT_REMOVED',
  'DRAFT_DELETED',
] as const;
export type AuditAction = (typeof AUDIT_ACTIONS)[number];

export const auditQuerySchema = z.object({
  entityId: z.string().optional(),
  actorId: z.string().optional(),
  from: z.string().optional(),
  to: z.string().optional(),
  limit: z.coerce.number().int().min(1).max(200).default(50),
});
export type AuditQuery = z.infer<typeof auditQuerySchema>;

export const adminAuditListQuerySchema = z.object({
  actor: z.string().optional(),
  action: z.string().optional(),
  entityType: z.string().optional(),
  entityId: z.string().optional(),
  from: z.string().optional(),
  to: z.string().optional(),
  fromStatus: z.string().optional(),
  toStatus: z.string().optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(50),
});
export type AdminAuditListQuery = z.infer<typeof adminAuditListQuerySchema>;

export const auditDiffEntrySchema = z.object({
  key: z.string(),
  before: z.unknown().optional(),
  after: z.unknown().optional(),
  changed: z.boolean(),
});
export type AuditDiffEntry = z.infer<typeof auditDiffEntrySchema>;

export const auditEventItemSchema = z.object({
  id: idSchema,
  actorUserId: idSchema.nullable().optional(),
  actorName: z.string().nullable().optional(),
  actorEmail: z.string().nullable().optional(),
  actorRole: z.enum(ROLES).nullable().optional(),
  action: z.string(),
  entityType: z.string(),
  entityId: z.string().nullable().optional(),
  entityLabel: z.string().nullable().optional(),
  fromStatus: z.string().nullable().optional(),
  toStatus: z.string().nullable().optional(),
  comment: z.string().nullable().optional(),
  ip: z.string().nullable().optional(),
  userAgent: z.string().nullable().optional(),
  requestId: z.string().nullable().optional(),
  createdAt: isoDateTimeSchema,
  diff: z.array(auditDiffEntrySchema).optional(),
});
export type AuditEventItem = z.infer<typeof auditEventItemSchema>;

export const auditEventDetailSchema = auditEventItemSchema.extend({
  before: z.record(z.string(), z.unknown()).nullable().optional(),
  after: z.record(z.string(), z.unknown()).nullable().optional(),
});
export type AuditEventDetail = z.infer<typeof auditEventDetailSchema>;

export const adminAuditListResponseSchema = z.object({
  items: z.array(auditEventItemSchema),
  total: z.number().int().min(0),
  page: z.number().int().min(1),
  pageSize: z.number().int().min(1),
});
export type AdminAuditListResponse = z.infer<typeof adminAuditListResponseSchema>;
