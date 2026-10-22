# Deploy

Owner: OVPCASSS system administrator. Scope: the `par` Worker, the web build it
serves, and the Windows desktop installer.

## Preconditions

- Node 22.18 or newer and pnpm 12.3.4 (`engine-strict` rejects anything else).
  22.18 is the floor because `db:seed` runs a `.ts` file with Node's built-in
  type stripping.
- `pnpm install --frozen-lockfile` on a clean checkout.
- Wrangler authenticated (`wrangler login` locally, `CLOUDFLARE_API_TOKEN` in CI).
- Worker secrets already set (see `key-rotation.md`); secrets are not part of a
  deploy and survive a redeploy. They are **per Worker**, not per account: a
  renamed Worker is a new script and starts with none, so re-set every secret on
  it before the first deploy (`wrangler secret put <NAME> --name par`).
- Renaming the account's `workers.dev` subdomain moves every Worker at once and
  breaks two things outside Cloudflare: every Worker is a new script and starts
  with no secrets (above), and any OAuth client that names the old host rejects
  the callback with `redirect_uri_mismatch`. Update `APP_ORIGIN` in
  `wrangler.toml`, then add the new origin and
  `<origin>/api/v1/auth/google/callback` to the Google client before testing
  Google sign-in. The API derives the redirect URI from the request origin, so
  no code changes with the move.
- Cloudflare resources exist for the target environment: D1 `par-db`, R2
  `par-attachments` with its CORS policy, Queue `par-email` and `par-email-dlq`.
  `pnpm provision --apply` creates the missing ones and applies CORS; the
  vendor-only steps are in `uploads.md`.
- **Known gap:** `apps/api/wrangler.toml` still has one set of resources. There is
  no `[env.staging]` / `[env.production]` split, so there is no staging deploy
  target yet (spec §12, open questions §14 Q13-Q14). Until that lands, only a
  production deploy and a per-PR preview exist.

## Order of operations

Migrations run **before** the Worker that needs them. Never the other way round.

1. **Gate.** `pnpm verify` must pass locally; CI must be green on the commit.
2. **Build the web app.** The Worker's `[assets]` directory is
   `apps/web/build`, so a missing build ships a Worker with no UI.
   ```bash
   pnpm --filter @par/web build
   ```
3. **Apply migrations (remote).**
   ```bash
   pnpm --filter @par/db exec wrangler d1 migrations apply par-db --remote
   ```
   Review the pending list before confirming. Migrations are forward-only; see
   `rollback.md`.
4. **Backfill the retired role state (one-off).** Only when upgrading a database
   created before `PENDING_ROLE` was removed. Run it before the new Worker,
   which rejects the old value, and confirm zero rows remain.

   ```bash
   pnpm --filter @par/db exec wrangler d1 execute par-db --remote --config ../../apps/api/wrangler.toml \
     --command "UPDATE users SET role='SUBMITTER', updated_at=strftime('%Y-%m-%dT%H:%M:%fZ','now') WHERE role IS NULL; UPDATE users SET status='ACTIVE', updated_at=strftime('%Y-%m-%dT%H:%M:%fZ','now') WHERE status='PENDING_ROLE';"
   pnpm --filter @par/db exec wrangler d1 execute par-db --remote --config ../../apps/api/wrangler.toml \
     --command "SELECT count(*) AS pending FROM users WHERE status='PENDING_ROLE';"
   ```

   Expect `pending` to be 0. This is a data fix, not a migration; no environment
   can create the state again.

5. **Seed reference data (fresh database only).** Campus, unit, program, SDG,
   department, and office lists come from the workbook seed. The command is
   idempotent: it skips a row whose natural key already exists, so office edits
   survive a rerun.
   ```bash
   pnpm db:seed --remote
   ```
   Terms and attachment requirements are not seeded; the office maintains them.
6. **Deploy the Worker** (API plus the static assets from step 2).
   ```bash
   pnpm --filter @par/api exec wrangler deploy
   ```
7. **Smoke test** the deployed origin:
   ```bash
   curl -fsS https://<origin>/api/health          # {"status":"ok"}
   ```
   Then in a browser: load the sign-in page, sign in, open the work inbox, open
   one report. A 200 from `/api/health` alone does not prove the assets or the
   database binding are correct.

## PR preview

`.github/workflows/deploy.yml` uploads a preview version for each pull request
when `CLOUDFLARE_API_TOKEN` is configured:

```bash
pnpm --filter @par/api exec wrangler versions upload --preview-alias pr-<number>
```

The preview binds the same resources as production today, so **do not merge data
changes** through a preview. `wrangler versions upload` also needs the Worker to
exist already (one successful `wrangler deploy` first).

## Desktop installer

Windows only; needs WebView2, generated icons, and a code-signing certificate
(spec §14 Q12, not yet procured).

```bash
pnpm --filter @par/web build
pnpm --filter @par/desktop build
```

The NSIS installer lands in `apps/desktop/src-tauri/target/release/bundle/nsis/`.
Unsigned installers trigger SmartScreen. Auto-update is configured but not armed:
`plugins.updater.endpoints` and `pubkey` are empty, so no signed update is
published yet (M7 remainder). An installed copy has the API host baked into the
build, so changing the host means uninstalling and reinstalling from the new
installer; there is no in-app upgrade path.

## After the deploy

- `wrangler tail par` for the first few minutes; watch for structured
  `level: "error"` lines.
- Confirm the cron schedules are live: `wrangler deployments status` (or the
  dashboard) should show `17 * * * *` and `30 18 * * *`.
- Record the deployed version id; `rollback.md` needs it.
