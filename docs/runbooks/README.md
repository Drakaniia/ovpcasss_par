# Runbooks

Operational procedures written during M8 (spec §12-§13). Each file should be
short, ordered, and testable during a drill.

| Runbook           | Covers                                                           |
| ----------------- | ---------------------------------------------------------------- |
| `deploy.md`       | Worker + static assets deploy, migration ordering, staging gate  |
| `rollback.md`     | Revert a Worker version and undo a migration (expand/contract)   |
| `restore.md`      | D1 Time Travel point-in-time restore plus the R2 export copy     |
| `key-rotation.md` | Session/HMAC secret, R2 S3 credentials, and email provider key   |
| `incident.md`     | Failed emails, attachment access questions, data-privacy contact |

Backups rely on D1 Time Travel plus a scheduled export to R2; the restore
runbook must be verified against a real copy (spec §10).
