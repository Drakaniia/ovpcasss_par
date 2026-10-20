import { PROGRAM_LEVELS, REPORT_TYPES, UNIT_KINDS } from '@par/shared';
import { index, integer, sqliteTable, text } from 'drizzle-orm/sqlite-core';

/**
 * Admin-editable dropdowns the PAR form and the monitoring exports depend on
 * (spec §8). Every table shares the same bookkeeping:
 *
 *   is_active   the admin's on/off switch. Deactivating keeps the row (and any
 *               report that already points at it) but hides it from new forms.
 *   is_seeded   row came from the source workbook. Seeded rows are editable.
 *   deleted_at  soft delete reserved for reference data (spec §8); list reads
 *               exclude deleted rows, but a row is normally only deactivated.
 *
 * Names, codes, and SDG numbers are deliberately not unique: the admin page
 * warns about a duplicate and lets the admin save anyway (phase 04 §2).
 */

/** How a term's semester is stored; the API maps '1'/'2' to numbers (spec §8). */
export const TERM_SEMESTERS = ['1', '2', 'SUMMER'] as const;
export type TermSemester = (typeof TERM_SEMESTERS)[number];

const bookkeeping = {
  isActive: integer('is_active', { mode: 'boolean' }).notNull().default(true),
  isSeeded: integer('is_seeded', { mode: 'boolean' }).notNull().default(false),
  deletedAt: text('deleted_at'),
  createdAt: text('created_at').notNull(),
  updatedAt: text('updated_at').notNull(),
};

/** MAIN and SATELLITE; the named campuses are units of kind SATELLITE_CAMPUS. */
export const refCampuses = sqliteTable('ref_campuses', {
  id: text('id').primaryKey(),
  code: text('code').notNull(),
  name: text('name').notNull(),
  sortOrder: integer('sort_order').notNull().default(0),
  ...bookkeeping,
});

/**
 * Colleges, graduate-school groups, satellite campuses, and other units, told
 * apart by `kind` because the workbook's "Colleges" list mixes all four
 * (spec §8 data note 1). Each unit belongs to a campus.
 */
export const refUnits = sqliteTable(
  'ref_units',
  {
    id: text('id').primaryKey(),
    code: text('code').notNull(),
    name: text('name').notNull(),
    kind: text('kind', { enum: UNIT_KINDS }).notNull(),
    campusId: text('campus_id').notNull(),
    sortOrder: integer('sort_order').notNull().default(0),
    ...bookkeeping,
  },
  (table) => [index('ref_units_campus_idx').on(table.campusId)],
);

/** Degrees offered, each under a college/unit. `level` is the degree level. */
export const refPrograms = sqliteTable(
  'ref_programs',
  {
    id: text('id').primaryKey(),
    code: text('code').notNull(),
    name: text('name').notNull(),
    level: text('level', { enum: PROGRAM_LEVELS }).notNull(),
    unitId: text('unit_id').notNull(),
    sortOrder: integer('sort_order').notNull().default(0),
    ...bookkeeping,
  },
  (table) => [index('ref_programs_unit_idx').on(table.unitId)],
);

/** No source list exists; the office maintains these by hand (spec §14 Q5). */
export const refDepartments = sqliteTable('ref_departments', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  sortOrder: integer('sort_order').notNull().default(0),
  ...bookkeeping,
});

export const refOffices = sqliteTable('ref_offices', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  sortOrder: integer('sort_order').notNull().default(0),
  ...bookkeeping,
});

/** The 17 UN Sustainable Development Goals; not in the workbook (spec §8 note 6). */
export const refSdgs = sqliteTable('ref_sdgs', {
  id: text('id').primaryKey(),
  number: integer('number').notNull(),
  title: text('title').notNull(),
  ...bookkeeping,
});

/** School year + semester with dates; drives "Semester, SY" in the exports. */
export const refTerms = sqliteTable('ref_terms', {
  id: text('id').primaryKey(),
  schoolYear: text('school_year').notNull(),
  semester: text('semester', { enum: TERM_SEMESTERS }).notNull(),
  startsOn: text('starts_on').notNull(),
  endsOn: text('ends_on').notNull(),
  isCurrent: integer('is_current', { mode: 'boolean' }).notNull().default(false),
  ...bookkeeping,
});

/** Per activity type, which attachments a submission must carry (spec §7.6). */
export const refAttachmentRequirements = sqliteTable('ref_attachment_requirements', {
  id: text('id').primaryKey(),
  activityType: text('activity_type', { enum: REPORT_TYPES }).notNull(),
  label: text('label').notNull(),
  minCount: integer('min_count').notNull().default(0),
  isRequired: integer('is_required', { mode: 'boolean' }).notNull().default(true),
  ...bookkeeping,
});

export type RefCampusRow = typeof refCampuses.$inferSelect;
export type RefUnitRow = typeof refUnits.$inferSelect;
export type RefProgramRow = typeof refPrograms.$inferSelect;
export type RefDirectoryRow = typeof refDepartments.$inferSelect;
export type RefSdgRow = typeof refSdgs.$inferSelect;
export type RefTermRow = typeof refTerms.$inferSelect;
export type RefAttachmentRequirementRow = typeof refAttachmentRequirements.$inferSelect;
