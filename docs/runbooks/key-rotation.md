# Key rotation

Secrets live only in Worker secrets (or `apps/api/.dev.vars` locally, which is
git-ignored). Never inline one in the Tauri bundle, a build arg, or a migration.

## Inventory

| Name                                                    | Used by                            | Rotating it does…                                              |
| ------------------------------------------------------- | ---------------------------------- | -------------------------------------------------------------- |
| `EMAIL_API_KEY`                                         | Resend or Cloudflare Email adapter | Nothing until the next send; no downtime                       |
| `R2_ACCESS_KEY_ID` / `R2_SECRET_ACCESS_KEY`             | S3-compatible presigning (SigV4)   | Invalidates every outstanding presigned URL                    |
| `R2_ACCOUNT_ID`                                         | Presign host                       | Only changes with the account                                  |
| `SESSION_SECRET`                                        | Declared in `env.ts`, **not read** | Nothing today                                                  |
| `EMAIL_PROVIDER`, `EMAIL_FROM`                           | `wrangler.toml` vars               | Changes behaviour on the next request                          |
| `BOOTSTRAP_ADMIN_EMAILS`                                | `wrangler.toml` vars               | That address becomes an active Admin the next time it verifies |

**Session revocation is not a secret rotation.** Sessions are opaque 32-byte
tokens stored as SHA-256 hashes; there is no signing key to rotate. To sign
everyone out, delete the rows:

```bash
wrangler d1 execute par-db --remote --command "DELETE FROM sessions"
```

That action is not an audit event, so record it in the incident log.

## Email provider key

1. Create the new key in the provider dashboard (Resend → API Keys).
2. Put it as a Worker secret — no redeploy needed; the next request reads it:
   ```bash
   wrangler secret put EMAIL_API_KEY
   ```
3. Send a test through the product (register a throwaway account, or trigger a
   role approval) and confirm `email_outbox.status = 'SENT'`:
   ```bash
   wrangler d1 execute par-db --remote --command \
     "SELECT status, count(*) FROM email_outbox GROUP BY status"
   ```
4. Revoke the old key in the provider.

## R2 S3 credentials

Presigning signs with these at request time, so a rotation takes effect
immediately and outstanding upload/download URLs stop working.

1. Cloudflare dashboard → R2 → Manage R2 API Tokens → create a token scoped to
   `par-attachments` with object read/write.
2. Set both secrets:
   ```bash
   wrangler secret put R2_ACCESS_KEY_ID
   wrangler secret put R2_SECRET_ACCESS_KEY
   ```
3. Verify: upload one attachment on a draft report, then download it. Check the
   object exists with the dashboard or
   `wrangler r2 object get par-attachments/reports/<id>/<key> --file /tmp/check`.
4. Revoke the previous token.

## Local development

`apps/api/.dev.vars` mirrors the names in `.dev.vars.example`. It is git-ignored;
rotate the real values and update the local file by hand. Never commit it.

## After any rotation

- `wrangler tail par` for errors while doing one real operation.
- Note the date and the operator in the incident/change log.
