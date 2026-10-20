# Restore

Two copies exist (spec §10). Use Time Travel for a bulk restore; use the R2
export to inspect or recover individual rows.

| Copy           | Where                                                    | Written by                             |
| -------------- | -------------------------------------------------------- | -------------------------------------- |
| D1 Time Travel | Cloudflare-managed, per database                         | Continuous, retained by Cloudflare     |
| NDJSON export  | `par-attachments/backups/d1/<YYYY-MM-DD>/<table>.ndjson` | Daily cron at 18:30 UTC (02:30 Manila) |

The export covers every table in the Drizzle schema. Objects are
newline-delimited JSON, one row per line, so `grep`, `jq`, and an editor all
work without a database.

## Point-in-time restore (D1 Time Travel)

1. Take a bookmark **before** restoring, so the current state is also recoverable:
   ```bash
   wrangler d1 time-travel info par-db
   ```
2. Restore to a timestamp or bookmark:
   ```bash
   wrangler d1 time-travel restore par-db --timestamp=<ISO-8601>
   # or
   wrangler d1 time-travel restore par-db --bookmark=<bookmark-id>
   ```
3. Verify:
   ```bash
   wrangler d1 execute par-db --remote --command "SELECT count(*) FROM reports"
   wrangler d1 execute par-db --remote --command "SELECT count(*) FROM audit_events"
   ```
   Then sign in and open a report whose existence you are certain about.

Time Travel restores the whole database, including `audit_events`. That is the
point: an audit trail that can be silently trimmed is not an audit trail.

## Inspecting the R2 export

```bash
wrangler r2 object get par-attachments/backups/d1/2026-10-19/reports.ndjson --file reports.ndjson
wc -l reports.ndjson
jq -c 'select(.tracking_number == "OFF-2026-0042")' reports.ndjson
```

The export is a **second copy for recovery and inspection**, not a one-command
database rebuild: replaying it means reconstructing `INSERT` statements for the
rows you need, in dependency order (users → reference data → reports →
attachments → operations). Prefer Time Travel for anything wider than a handful
of rows. For an ad-hoc SQL dump, `wrangler d1 export par-db --remote --output=dump.sql`
also exists.

## Quarterly drill (not yet run)

Run against a scratch database, never production data.

1. Pick yesterday's export; confirm 23 objects and that each file's line count
   matches the live `count(*)` for that table.
2. Restore a staging/scratch D1 to a bookmark taken before the drill.
3. Sign in on a build pointed at the scratch database; open a report and its
   acknowledgement.
4. Record the date, the bookmark, and any table whose counts drifted.

## Retention

Retention for approved reports and attachments is still open (spec §14 Q10).
Do not delete backup objects until that answer lands.
