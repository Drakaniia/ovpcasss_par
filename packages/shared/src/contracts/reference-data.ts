import { z } from 'zod';

import { PROGRAM_LEVELS, REPORT_TYPES, SEMESTERS, UNIT_KINDS } from '../domain/enums';
import { idSchema, isoDateSchema, isoDateTimeSchema } from './common';

/**
 * Runtime dropdowns the PAR form depends on (project spec §8). Admins maintain
 * these; nothing is hardcoded once the reference-data phase ships. Request
 * shapes are the authority for both the Worker and the admin page.
 */

export const REFERENCE_ENTITIES = [
  'campuses',
  'units',
  'programs',
  'departments',
  'offices',
  'sdgs',
  'terms',
  'attachment-requirements',
] as const;
export type ReferenceEntityKey = (typeof REFERENCE_ENTITIES)[number];

export const unitKindSchema = z.enum(UNIT_KINDS);

export const programLevelSchema = z.enum(PROGRAM_LEVELS);

export const semesterSchema = z.union([
  z.literal(SEMESTERS[0]),
  z.literal(SEMESTERS[1]),
  z.literal(SEMESTERS[2]),
]);

export const activityTypeSchema = z.enum(REPORT_TYPES);
export type ActivityType = z.infer<typeof activityTypeSchema>;

const entryBase = {
  id: idSchema,
  isActive: z.boolean(),
  /** Rows copied from the source workbook. They can be edited or deactivated. */
  isSeeded: z.boolean(),
  updatedAt: isoDateTimeSchema.optional(),
};

const codeSchema = z
  .string()
  .trim()
  .min(1, 'Enter a code.')
  .max(40, 'Use 40 characters or fewer.')
  .transform((value) => value.toUpperCase())
  .pipe(z.string().regex(/^[A-Z0-9][A-Z0-9-]*$/, 'Use letters, numbers, and hyphens.'));

const nameSchema = z
  .string()
  .trim()
  .min(1, 'Enter a name.')
  .max(200, 'Use 200 characters or fewer.');

const sortOrderSchema = z
  .number({ error: 'Enter a number.' })
  .int('Use a whole number.')
  .min(0, 'Use 0 or greater.')
  .max(9999, 'Use 9999 or lower.');

const activeSchema = z.boolean();

/* ---------- List items ---------- */

export const campusSchema = z.object({
  ...entryBase,
  code: z.string(),
  name: z.string(),
  sortOrder: z.number().int(),
  unitsCount: z.number().int().nullable().optional(),
});
export type Campus = z.infer<typeof campusSchema>;

export const unitSchema = z.object({
  ...entryBase,
  code: z.string(),
  name: z.string(),
  kind: unitKindSchema,
  campusId: idSchema,
  campusName: z.string(),
  sortOrder: z.number().int(),
});
export type Unit = z.infer<typeof unitSchema>;

export const programSchema = z.object({
  ...entryBase,
  code: z.string(),
  name: z.string(),
  level: programLevelSchema,
  unitId: idSchema,
  unitName: z.string(),
  sortOrder: z.number().int(),
});
export type Program = z.infer<typeof programSchema>;

export const departmentSchema = z.object({
  ...entryBase,
  name: z.string(),
  sortOrder: z.number().int(),
  usageCount: z.number().int().nullable().optional(),
});
export type Department = z.infer<typeof departmentSchema>;

export const officeSchema = departmentSchema;
export type Office = z.infer<typeof officeSchema>;

export const sdgSchema = z.object({
  ...entryBase,
  number: z.number().int().min(1).max(17),
  title: z.string(),
});
export type Sdg = z.infer<typeof sdgSchema>;

export const termSchema = z.object({
  ...entryBase,
  schoolYear: z.string(),
  semester: semesterSchema,
  startsOn: isoDateSchema,
  endsOn: isoDateSchema,
  /** Only one term may be current; the UI blocks deactivating it. */
  isCurrent: z.boolean(),
  openReportCount: z.number().int().nullable().optional(),
});
export type Term = z.infer<typeof termSchema>;

export const attachmentRequirementSchema = z.object({
  ...entryBase,
  activityType: activityTypeSchema,
  label: z.string(),
  minCount: z.number().int().min(0).max(9),
  isRequired: z.boolean(),
});
export type AttachmentRequirement = z.infer<typeof attachmentRequirementSchema>;

export type ReferenceEntry =
  Campus | Unit | Program | Department | Office | Sdg | Term | AttachmentRequirement;

export type ReferenceItemMap = {
  campuses: Campus;
  units: Unit;
  programs: Program;
  departments: Department;
  offices: Office;
  sdgs: Sdg;
  terms: Term;
  'attachment-requirements': AttachmentRequirement;
};

export type ReferenceListResponse<T extends ReferenceEntry = ReferenceEntry> = {
  items: T[];
};

/* ---------- Create and update inputs ---------- */

export const campusInputSchema = z.object({
  code: codeSchema,
  name: nameSchema,
  sortOrder: sortOrderSchema,
  isActive: activeSchema,
});
export type CampusInput = z.infer<typeof campusInputSchema>;

export const unitInputSchema = z.object({
  code: codeSchema,
  name: nameSchema,
  kind: unitKindSchema,
  campusId: idSchema,
  sortOrder: sortOrderSchema,
  isActive: activeSchema,
});
export type UnitInput = z.infer<typeof unitInputSchema>;

export const programInputSchema = z.object({
  code: codeSchema,
  name: nameSchema,
  level: programLevelSchema,
  unitId: idSchema,
  sortOrder: sortOrderSchema,
  isActive: activeSchema,
});
export type ProgramInput = z.infer<typeof programInputSchema>;

export const departmentInputSchema = z.object({
  name: nameSchema,
  sortOrder: sortOrderSchema,
  isActive: activeSchema,
});
export type DepartmentInput = z.infer<typeof departmentInputSchema>;

export const officeInputSchema = departmentInputSchema;
export type OfficeInput = z.infer<typeof officeInputSchema>;

export const sdgInputSchema = z.object({
  number: z
    .number({ error: 'Choose a number.' })
    .int('Use a whole number.')
    .min(1, 'Use a number from 1 to 17.')
    .max(17, 'Use a number from 1 to 17.'),
  title: z.string().trim().min(1, 'Enter a title.').max(200, 'Use 200 characters or fewer.'),
  isActive: activeSchema,
});
export type SdgInput = z.infer<typeof sdgInputSchema>;

export const termInputSchema = z
  .object({
    schoolYear: z
      .string()
      .trim()
      .regex(/^\d{4}-\d{4}$/, 'Use the format 2025-2026.'),
    semester: semesterSchema,
    startsOn: isoDateSchema,
    endsOn: isoDateSchema,
    isActive: activeSchema,
  })
  .refine((value) => value.endsOn >= value.startsOn, {
    path: ['endsOn'],
    message: 'The end date must be on or after the start date.',
  });
export type TermInput = z.infer<typeof termInputSchema>;

export const attachmentRequirementInputSchema = z.object({
  activityType: activityTypeSchema,
  label: z.string().trim().min(1, 'Enter a label.').max(120, 'Use 120 characters or fewer.'),
  minCount: z
    .number({ error: 'Enter a number.' })
    .int('Use a whole number.')
    .min(0, 'Use 0 or greater.')
    .max(9, 'Use 9 or lower.'),
  isRequired: z.boolean(),
  isActive: activeSchema,
});
export type AttachmentRequirementInput = z.infer<typeof attachmentRequirementInputSchema>;

export type ReferenceInput =
  | CampusInput
  | UnitInput
  | ProgramInput
  | DepartmentInput
  | OfficeInput
  | SdgInput
  | TermInput
  | AttachmentRequirementInput;

export type ReferenceInputMap = {
  campuses: CampusInput;
  units: UnitInput;
  programs: ProgramInput;
  departments: DepartmentInput;
  offices: OfficeInput;
  sdgs: SdgInput;
  terms: TermInput;
  'attachment-requirements': AttachmentRequirementInput;
};
