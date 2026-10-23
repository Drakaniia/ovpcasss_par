-- One-off reset for the office-created-record flow (personnel-narrative-flow spec §15).
-- Run against a local or staging D1 that is still on schema 0008, BEFORE migrations
-- 0009-0011 are applied (0009 rebuilds `reports` with a required `reference_no`,
-- so old rows cannot survive it). Then clear the matching R2 prefixes
-- (reports/, acknowledgements/, signatures/reports/).
-- User accounts, sessions, notifications, the email outbox, reference data, and
-- audit_events are kept: audit is append-only and historical rows stay as history.
-- The new `reference_counters` table starts empty, so the next record is AR No. 0001.

DELETE FROM report_sdgs;
DELETE FROM report_pics;
DELETE FROM report_comments;
DELETE FROM attachments;
DELETE FROM acknowledgements;
DELETE FROM reports;
DELETE FROM tracking_counters;
DELETE FROM idempotency_keys;

-- Retired roles become personnel in charge; bootstrap addresses keep ADMIN.
UPDATE users
SET role = 'PERSONNEL'
WHERE role IN ('SUBMITTER', 'REVIEWER', 'APPROVER');
