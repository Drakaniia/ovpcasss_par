/**
 * Drizzle schema, split into modules as milestones land (spec §8):
 *
 *   identity.ts        users, sessions, email_tokens
 *   reference-data.ts  ref_campuses, ref_units, ref_programs, ref_departments,
 *                      ref_offices, ref_sdgs, ref_terms,
 *                      ref_attachment_requirements
 *   reports.ts         reports, report_sdgs, report_pics, report_comments,
 *                      attachments, reference_counters, receipts
 *   operations.ts      audit_events, email_outbox, idempotency_keys,
 *                      rate_limit_counters
 *   settings.ts        settings (office-wide, admin editable)
 *
 * Every table carries id, created_at, updated_at; reference data and users
 * also carry deleted_at. audit_events is append-only.
 */
export * from './identity';
export * from './notifications';
export * from './operations';
export * from './reference-data';
export * from './reports';
export * from './settings';
