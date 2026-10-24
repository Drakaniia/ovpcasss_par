# File uploads

Owner: OVPCASSS system administrator. Scope: the attachment pipeline (spec §7.8),
the R2 bucket behind it, and the credentials that make it work.

## How an upload works

1. The client asks `POST /api/v1/reports/:id/attachments/presign` for a URL. The
   API checks access, report state, the 25 MB limit, and the extension/MIME
   allowlist, then mints a SigV4 URL for `reports/<reportId>/<uuid>` and records a
   `PENDING` row.
2. The browser or the desktop shell PUTs the file **straight to R2**. The file
   never passes through the Worker.
3. The client calls `confirm`. The API HEADs the object, checks the stored size
   and content type, hashes it, and marks the row `CONFIRMED`.
4. Downloads go through `GET /reports/:id/attachments/:attachmentId/url`, which
   returns a short-lived presigned GET. The bucket is never public.
5. The hourly cron deletes `PENDING` rows older than 24 hours with their objects.

## What the script does

`pnpm provision` (or `node scripts/provision-cloud.mjs`) is a dry run; add
`--apply` to create missing resources. It reads the names from
`apps/api/wrangler.toml`, so renaming a bucket or queue there is enough.

Automated:

| Step                           | Command behind it                                               |
| ------------------------------ | --------------------------------------------------------------- |
| R2 bucket                      | `wrangler r2 bucket create par-attachments`                     |
| R2 CORS                        | `wrangler r2 bucket cors set ... --file`                        |
| Email queue + dead-letter      | `wrangler queues create par-email` / `par-email-dlq`            |
| D1 database                    | `wrangler d1 list` / `d1 create`, uuid written back             |
| `SESSION_SECRET` (generated)   | `wrangler secret put`, only when absent                         |
| `R2_ACCOUNT_ID` (detected)     | `wrangler secret put`, only when absent                         |
| `apps/api/.dev.vars` local dev | generated from `.dev.vars.example` when missing                 |
| D1 migrations (remote)         | `wrangler d1 migrations apply par-db --remote` with `--migrate` |

An existing secret is never overwritten: rotating `SESSION_SECRET` signs every
user out and needs to be a deliberate act (see `key-rotation.md`).

## What only you can do

These need a browser at a vendor; the script prints them at the end.

1. **R2 API token.** Cloudflare dashboard → R2 → Manage API tokens → Create, with
   Object Read & Write limited to `par-attachments`. Then:
   ```bash
   pnpm --filter @par/api exec wrangler secret put R2_ACCESS_KEY_ID
   pnpm --filter @par/api exec wrangler secret put R2_SECRET_ACCESS_KEY
   ```
   Without these, presign answers `503 STORAGE_UNAVAILABLE` and the uploader says
   storage is not configured.
2. **Resend key and sending domain.** `resend.com` → API keys →
   `wrangler secret put EMAIL_API_KEY`. Then add `send.buksu.edu.ph` as a domain
   in Resend and verify it (spec §14 Q15). `buksu.edu.ph` is served by Cloudflare
   DNS, so Resend's **Sign in to Cloudflare** button (Domain Connect) adds the
   records in one step; without that access, the records are:

   | Type | Name                | Value                                           |
   | ---- | ------------------- | ----------------------------------------------- |
   | MX   | `send`              | `feedback-smtp.<region>.amazonses.com`, prio 10 |
   | TXT  | `send`              | `v=spf1 include:amazonses.com ~all`             |
   | TXT  | `resend._domainkey` | `p=...` (the key Resend shows for the domain)   |

   The names are relative to `send.buksu.edu.ph`, and the root MX stays with
   Google Workspace: nothing here changes where `@buksu.edu.ph` mail is received.
   If `send.buksu.edu.ph` already has an MX or SPF record, raise the priority
   above 10 instead of replacing it.

   `EMAIL_FROM` in `apps/api/wrangler.toml` must then use that domain
   (`OVPCASSS PAR <no-reply@send.buksu.edu.ph>`). A sender on `buksu.edu.ph`
   itself is refused with `403 The buksu.edu.ph domain is not verified` even
   while the subdomain is verified, and the message ends up `FAILED` in the
   outbox after six attempts. Until a domain is verified, send from
   `onboarding@resend.dev`, which reaches only the Resend account owner.

3. **Google OAuth client**, optional. Credentials → OAuth client (Web) with the
   JavaScript origin and redirect URI for each environment; both values are
   secrets, and the sign-in button stays hidden until they are set.
4. **Production origins in `apps/api/r2-cors.json`.** The policy ships with
   localhost, the Tauri origin, `*.workers.dev`, `*.pages.dev`, and
   `*.buksu.edu.ph`. `*.pages.dev` covers the browser site and its per-PR
   previews, which upload straight from the Pages origin. Narrow the list once
   the custom domain is fixed, then apply it:
   `wrangler r2 bucket cors set par-attachments --file apps/api/r2-cors.json`.
   Without the matching origin the browser's PUT fails CORS and no row is
   created, even though presign succeeded.
5. **Deploy.** Secrets and CORS are not code: nothing reaches production until
   `pnpm --filter @par/web build && pnpm --filter @par/api exec wrangler deploy`.

## Checks that prove it works

```bash
pnpm verify                                              # rules and routes
pnpm --filter @par/api exec wrangler r2 bucket cors list par-attachments
pnpm --filter @par/api exec wrangler secret list
```

Then, signed in, upload one PDF from the wizard, one from the desktop shell, and
one 26 MB file (that one must be refused with the size message, not a network
error).

## Local development

`pnpm dev` runs the API with `wrangler dev --remote`, so the bucket is the real
`par-attachments` and every local upload is a real object. Presign still answers
with `mode: "proxy"` whenever the signing values are absent or still say
`replace-me`, and the Worker then writes the bytes itself, so a developer needs
no R2 API token. Keep real keys out of `.dev.vars` so this stays true.

Downloads already fall back to an authenticated in-app URL on loopback, so a
local upload can be opened again without leaving the machine.

The proxy fallback URL is built from the caller, not from `APP_ORIGIN`: a browser
page gets its own origin back, and a bearer-token client (the desktop shell)
gets the API's origin. So a proxy-mode upload works from both shells, including
the Tauri dev build.

## Troubleshooting

| Symptom                          | Cause                                                                                   |
| -------------------------------- | --------------------------------------------------------------------------------------- |
| `503 STORAGE_UNAVAILABLE`        | No longer returned for a missing token; if seen, the Worker predates the proxy fallback |
| Upload fails immediately, no row | CORS policy missing on the bucket: rerun `pnpm provision --apply`                       |
| `UPLOAD_NOT_FOUND` at confirm    | A cancelled or interrupted PUT, or presign against a bucket the Worker cannot read      |
| `UPLOAD_SIZE_MISMATCH`           | The file changed between presign and upload                                             |
| `UPLOAD_TYPE_NOT_ALLOWED`        | The stored content type is not on the allowlist                                         |
| `405` on the upload PUT          | The fallback URL named a host with no API (an `APP_ORIGIN` that is not the app in use)  |
