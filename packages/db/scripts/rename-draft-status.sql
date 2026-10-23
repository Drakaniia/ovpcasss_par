-- DRAFT is renamed to PENDING (spec 2026-10-23 §15.2).
-- Run once per environment before the new Worker takes traffic:
--   wrangler d1 execute par-db --remote --file packages/db/scripts/rename-draft-status.sql
-- Safe to re-run: the second pass matches no rows.
UPDATE reports SET status = 'PENDING' WHERE status = 'DRAFT';
