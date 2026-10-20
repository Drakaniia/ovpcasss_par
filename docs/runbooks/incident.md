# Incident

Scope: the failures an operator actually gets called about. Start with the
symptom, stop when the immediate harm is contained, then write down what was
done.

## 1. Everyone is signed out / sign-in fails

- Check `/api/health` and `wrangler tail par-api` first; a deploy is more likely
  than an auth bug.
- Rate limiting is a D1 counter per route + IP/account. A burst of failures in
  the audit log (`LOGIN_FAILED`) with a short lockout is expected behaviour, not
  an outage.
- To clear lockouts: delete the closed windows —
  `DELETE FROM rate_limit_counters WHERE window_start < '<ISO cutoff>'`.
- To force sign-in again: `DELETE FROM sessions` (see `key-rotation.md`).

## 2. Email is not arriving

1. Confirm the notification itself exists: the in-app row is written **before**
   the mail is queued, so a missing row is a workflow bug, not a mail problem.
2. Check failures:
   ```bash
   wrangler d1 execute par-db --remote --command \
     "SELECT id, kind, to, attempts, last_error FROM email_outbox WHERE status = 'FAILED' ORDER BY updated_at DESC LIMIT 20"
   ```
3. Check the queue consumer's structured logs (`wrangler tail`): retries and the
   dead-letter queue are `wrangler.toml` configuration (`max_retries = 5`,
   `par-email-dlq`).
4. Verify the provider key and sender domain (`key-rotation.md`). The default
   `onboarding@resend.dev` sender only delivers to the account owner.
5. **Requeue is manual**: there is no admin action for it yet. Resend by causing
   the event again (e.g. ask the reviewer to re-return the report) or accept the
   in-app notification as delivered.

The admin work inbox shows only a **count** of failed emails; it does not list
them (gap against spec §12). Use the query above.

## 3. Suspected account compromise

1. Admin → Users → disable the account. Disabling deletes that user's sessions
   immediately; role changes do not.
2. Force a password reset through the normal forgot-password flow.
3. Read the account's trail:
   `SELECT * FROM audit_events WHERE actor_user_id = '<id>' ORDER BY created_at DESC`.
4. Check for reports or attachments the account touched, and for downloads
   (`action = 'EXPORTED'`).
5. Do not edit or delete audit rows. They are the record.

## 4. Attachment exposure question

- The R2 bucket is private; every read goes through the API, which checks the
  caller's role against the report.
- Presigned URLs are short-lived (5 minutes for downloads, 15 for uploads) and
  are logged as `EXPORTED` when a file is fetched.
- If a link escaped, treat it as expired after the TTL, then confirm no public
  bucket or custom domain is attached in the R2 dashboard.

## 5. Suspected malware in an upload

There is no malware scanner (spec §14 Q11). The mitigation is containment:

1. Identify the attachment object key from `attachments` for the report.
2. Mark it deleted so no report counts it, then remove the object:
   ```bash
   wrangler d1 execute par-db --remote --command \
     "UPDATE attachments SET status = 'DELETED' WHERE id = '<id>'"
   wrangler r2 object delete par-attachments/reports/<reportId>/<key>
   ```
3. Preserve the audit trail and inform the OVPCASSS administrator. Do not open
   the file on an office machine.

## 6. Data privacy (RA 10173)

Form fields hold student **counts**; attachments may contain names, so they are
personal data. For a suspected breach:

- Contain access (disable accounts, rotate R2 credentials if a key leaked).
- Preserve `audit_events`; it is append-only and is the evidence.
- Notify the office's designated data protection contact. **The contact and the
  notification window are not configured in this repository** (spec §10, open).
- Record scope: which reports, which attachments, which accounts, what window.

## 7. Rollback and restore

A deploy that broke behaviour: `rollback.md`. Lost or corrupted data:
`restore.md`. Do not improvise a database fix under pressure.
