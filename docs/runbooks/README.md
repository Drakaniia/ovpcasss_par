# Runbooks

Operational procedures written during M8 (spec §12-§13). Each file is short,
ordered, and written to be followed during a drill rather than read like design
documentation.

| Runbook                              | Covers                                                           | Drilled |
| ------------------------------------ | ---------------------------------------------------------------- | ------- |
| [`deploy.md`](./deploy.md)           | Web build, migrations, Worker deploy, smoke test, PR preview      | No      |
| [`rollback.md`](./rollback.md)       | Revert a Worker version; why migrations are fixed forward         | No      |
| [`restore.md`](./restore.md)         | D1 Time Travel plus the R2 NDJSON export                          | No      |
| [`key-rotation.md`](./key-rotation.md) | Email key, R2 S3 credentials, session revocation                | No      |
| [`uploads.md`](./uploads.md)         | Attachment pipeline, `pnpm provision`, R2 CORS and its manual steps | No    |
| [`incident.md`](./incident.md)       | Failed email, account compromise, attachment and privacy handling | No      |

Backups rely on D1 Time Travel plus a scheduled export to R2 (`apps/api/src/cron/backup.ts`,
daily at 18:30 UTC). The restore runbook must be verified against a real copy
before go-live (spec §10); the drill is written but has not been run.

Still open for M8 beyond these procedures: a security review, a load test, the
restore drill itself, and the pilot with OVPCASSS.
