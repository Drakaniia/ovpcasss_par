# Deploy

Owner: OVPCASSS system administrator. Scope: the `par-api` Worker, the web build
it serves, and the Windows desktop installer.

## Preconditions

- Node 22 and pnpm 12.3.4 (`engine-strict` rejects anything else).
- `pnpm install --frozen-lockfile` on a clean checkout.
- Wrangler authenticated (`wrangler login` locally, `CLOUDFLARE_API_TOKEN` in CI).
- Worker secrets already set (see `key-rotation.md`); secrets are not part of a
  deploy and survive it.
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
4. **Deploy the Worker** (API plus the static assets from step 2).
   ```bash
   pnpm --filter @par/api exec wrangler deploy
   ```
5. **Smoke test** the deployed origin:
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
published yet (M7 remainder).

## After the deploy

- `wrangler tail par-api` for the first few minutes; watch for structured
  `level: "error"` lines.
- Confirm the cron schedules are live: `wrangler deployments status` (or the
  dashboard) should show `17 * * * *` and `30 18 * * *`.
- Record the deployed version id; `rollback.md` needs it.
