# Incident

Scope: the failures an operator actually gets called about. Start with the
symptom, stop when the immediate harm is contained, then write down what was
done.

## 1. Everyone is signed out / sign-in fails

- Check `/api/health` and `wrangler tail par` first; a deploy is more likely
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
3. Open **Admin → Email log** (`/admin/emails`). It opens on **Failed** and lists
   every attempt with its kind, recipient, subject, attempts, and the provider's
   reason. A **Suppressed** row means nothing was sent on purpose — the reason is
   in the same column (recipient muted the category, account inactive or
   unverified, or the message could not be completed).
4. Check the queue consumer's structured logs (`wrangler tail`): retries and the
   dead-letter queue are `wrangler.toml` configuration (`max_retries = 5`,
   `par-email-dlq`).
5. Verify the provider key and sender domain (`key-rotation.md`, `uploads.md`).
   `403 The <domain> domain is not verified` on every row is a DNS problem, not a
   key problem: resending will fail the same way until the domain is verified in
   Resend and `EMAIL_FROM` uses it. While `EMAIL_PROVIDER=brevo`, a 4xx on every
   row means the address in `EMAIL_FROM` is not confirmed under Senders in Brevo
   (`email-delivery.md`).
6. **View** the failed row: it opens the stored copy with its links, so a
   verification or reset link can be sent to its owner by hand while delivery is
   broken. Read-only, no delivery, nothing recorded in the audit trail.
7. **Resend** from the failed row. It re-queues the stored message and creates a
   new outbox row; the original stays as it is. Ten resends an hour per admin.
   "The stored message is no longer available" means the rendered copy was lost —
   repeat the action that caused the mail instead.

The daily failure digest emails active admins when any message is `FAILED`; it
is sent directly, not through the queue, so it still arrives while mail is
broken. An empty inbox and no digest means nothing failed, not that the digest
is missing.

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
