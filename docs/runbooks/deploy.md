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
- The Pages project `ovpcasss-par` exists (see **Pages site** below), and
  `CLOUDFLARE_API_TOKEN` carries Pages:Edit as well as Workers and D1.

## Order of operations

Migrations run **before** the Worker that needs them. Never the other way round.

1. **Gate.** `pnpm verify` must pass locally; CI must be green on the commit.
2. **Build the web app.** The Worker's `[assets]` directory is
   `apps/web/build`, so a missing build ships a Worker with no UI.
   ```bash
   pnpm --filter @par/web build
   ```
3. **Clear the old register, if this is the office-created-record release
   (one-off, destructive).** Migrations 0009–0011 expect no old report rows: a
   record's AR No. cannot be backfilled. Take a backup, run
   `packages/db/scripts/reset-reports.sql` against the `0008` schema, and delete
   the R2 objects under `reports/` and `signatures/reports/`. User accounts,
   sessions, notifications, the email outbox, reference data, and `audit_events`
   survive. Skip this on a database that never held reports.

4. **Apply migrations (remote).**
   ```bash
   pnpm --filter @par/db exec wrangler d1 migrations apply par-db --remote
   ```
   Review the pending list before confirming. Migrations are forward-only; see
   `rollback.md`. `reference_counters` starts empty, so the first created record
   is `AR No. 0001`.
5. **Backfill the retired role state (one-off).** Only when upgrading a database
   created before `PENDING_ROLE` was removed. Run it before the new Worker,
   which rejects the old value, and confirm zero rows remain. Retired roles move
   to the current personnel role.

   ```bash
   pnpm --filter @par/db exec wrangler d1 execute par-db --remote --config ../../apps/api/wrangler.toml \
     --command "UPDATE users SET role='PERSONNEL', updated_at=strftime('%Y-%m-%dT%H:%M:%fZ','now') WHERE role IS NULL OR role IN ('SUBMITTER','REVIEWER','APPROVER'); UPDATE users SET status='ACTIVE', updated_at=strftime('%Y-%m-%dT%H:%M:%fZ','now') WHERE status='PENDING_ROLE';"
   pnpm --filter @par/db exec wrangler d1 execute par-db --remote --config ../../apps/api/wrangler.toml \
     --command "SELECT count(*) AS pending FROM users WHERE status='PENDING_ROLE';"
   ```

   Expect `pending` to be 0. This is a data fix, not a migration; no environment
   can create the state again.

6. **Seed reference data (fresh database only).** Campus, unit, program, SDG,
   department, and office lists come from the workbook seed. The command is
   idempotent: it skips a row whose natural key already exists, so office edits
   survive a rerun.
   ```bash
   pnpm db:seed --remote
   ```
   Terms and attachment requirements are not seeded; the office maintains them.
7. **Deploy the Worker** (API plus the static assets from step 2).
   ```bash
   pnpm --filter @par/api exec wrangler deploy
   ```
   Then deploy the Pages site, which is the address the browser uses (see
   **Pages site** below). Worker first: the new Function proxies to it.
8. **Smoke test** the deployed origin:
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

## Pages site

The browser opens `https://ovpcasss-par.pages.dev`. The Worker at
`https://par.ovpcasss.workers.dev` is the API and keeps its own copy of the app
as the rollback path. Pages serves the SPA and its
`apps/web/functions/api/[[path]].ts` forwards `/api/*` to the Worker, so the
browser still sees one origin — which is what the `SameSite=Lax` cookie and the
CSRF guard require (spec §7.1, §7.4, §10).

One-time setup, with the same random value for both secrets:

```bash
pnpm --filter @par/web exec wrangler pages project create ovpcasss-par --production-branch main
pnpm --filter @par/api exec wrangler secret put PROXY_TOKEN
pnpm --filter @par/web exec wrangler pages secret put PROXY_TOKEN --project-name ovpcasss-par
```

The API accepts the proxy's `x-par-proxy-token` only when it matches, and reads
the browser's address from the same request. A mismatch fails closed: every
signed-in write from Pages answers 403.

Deploy after the Worker:

```bash
pnpm --filter @par/web build
pnpm --filter @par/web exec wrangler pages deploy build --project-name ovpcasss-par --branch main
```

A pull request deploys `--branch pr-<number>` to
`pr-<number>.ovpcasss-par.pages.dev`; the R2 CORS policy allows every
`*.pages.dev` origin, so previews can upload too.

Rollback: Workers & Pages → `ovpcasss-par` → Deployments → roll back to the last
known-good deployment, or redeploy the previous tag. `APP_ORIGIN` in
`apps/api/wrangler.toml` names this host, so renaming the project or moving to a
custom domain means editing that line, the Pages domain, and the Google redirect
URI together, then redeploying the Worker.

### Local Pages run

```bash
pnpm --filter @par/api dev
pnpm --filter @par/web build
pnpm --filter @par/web exec wrangler pages dev build --binding API_ORIGIN=http://localhost:8787
```

`wrangler pages dev` serves the build and its Function. Leave `PROXY_TOKEN`
unset locally: the API then treats the request as a direct one and keeps its
loopback behaviour.

### Address suggestions (location field)

`LOCATION_SUGGEST_URL` in `apps/api/wrangler.toml [vars]` points at Photon
(keyless, OpenStreetMap); `{q}` holds the encoded query and the lat/lon pair
biases results toward Malaybalay City. Only the text typed into the location
field leaves the Worker — the browser calls `/api/v1/locations/suggest`, never
the provider — so the bundle, the CSP, and the desktop build are unchanged.

- **Keyed provider:** put `{key}` in the template and set
  `wrangler secret put LOCATION_SUGGEST_KEY --name par`. Without `{key}` in the
  template the key travels as a bearer header instead.
- **Swap or stop:** edit or delete the line and redeploy the Worker. With it
  unset the field offers only locations the office already used, and no request
  leaves Cloudflare.
- **Quota:** the public Photon endpoint is meant for moderate use. If the office
  outgrows it, move to a keyed provider rather than adding a retry; the route
  already answers an empty list when the provider is slow, refuses, or is
  unreachable.

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
- Record the deployed version id and the Pages deployment; `rollback.md` needs
  the Worker one.
