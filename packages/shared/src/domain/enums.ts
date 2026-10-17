export const ROLES = ['SUBMITTER', 'REVIEWER', 'APPROVER', 'ADMIN'] as const;
export type Role = (typeof ROLES)[number];

export const USER_STATUSES = [
  'PENDING_VERIFICATION',
  'PENDING_ROLE',
  'ACTIVE',
  'DISABLED',
] as const;
export type UserStatus = (typeof USER_STATUSES)[number];

export const REPORT_TYPES = ['OFF_CAMPUS', 'EDUCATIONAL_TOUR', 'IN_CAMPUS'] as const;
export type ReportType = (typeof REPORT_TYPES)[number];

export const REPORT_TYPE_PREFIX = {
  OFF_CAMPUS: 'OFF',
  EDUCATIONAL_TOUR: 'EDU',
  IN_CAMPUS: 'INC',
} as const satisfies Record<ReportType, string>;

export const REPORT_STATUSES = [
  'DRAFT',
  'SUBMITTED',
  'RETURNED_BY_REVIEWER',
  'RESUBMITTED',
  'ENDORSED',
  'RETURNED_BY_APPROVER',
  'APPROVED',
] as const;
export type ReportStatus = (typeof REPORT_STATUSES)[number];

export const CLASSIFICATIONS = ['CURRICULAR', 'NON_CURRICULAR'] as const;
export type Classification = (typeof CLASSIFICATIONS)[number];

export const LEVELS = ['GRADUATE', 'UNDERGRADUATE'] as const;
export type Level = (typeof LEVELS)[number];

export const UNIT_KINDS = [
  'COLLEGE',
  'GRADUATE_SCHOOL_GROUP',
  'SATELLITE_CAMPUS',
  'OTHER_UNIT',
] as const;
export type UnitKind = (typeof UNIT_KINDS)[number];

export const ATTACHMENT_STATUSES = ['PENDING', 'CONFIRMED', 'DELETED'] as const;
export type AttachmentStatus = (typeof ATTACHMENT_STATUSES)[number];
