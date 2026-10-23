# Cloud seed, automatic Submitter, auth cleanup, and Worker rename

Status: proposed · 2026-10-22 · owner decision recorded below
Scope: `packages/db`, `packages/shared`, `packages/email`, `apps/api`,
`apps/web`, `apps/desktop`, deployment configuration, runbooks, and the
affected specs.

This file is the single record of the decisions taken in the 2026-10-22
interview. It is an implementation spec, not an authorisation to change any
contract silently: the four workstreams below intentionally amend
`par-paperless-spec.md` §7.4/§9 and the phase UI specs.

---

## 1. Why

Four separate problems, fixed together because they all touch the deployed
origin and the account lifecycle:

1. The deployed D1 has **no reference data**, so every dropdown in the web and
   desktop app is empty even though the workbook lists already exist in
   `packages/db/src/seed/reference-data.ts`. The lists are served by the API,
   so seeding the cloud database fixes every device at once.
2. A first-time user is created with `role = null` and waits in `PENDING_ROLE`
   until an administrator assigns a role. That is an unnecessary gate: every
   new account should start as a Submitter, and the admin changes the role
   later only when the office decides otherwise.
3. The auth pages paint `/brand/campus.png` as a large, faded background. It is
   unwanted, and the asset is 1.9 MB.
4. The production URL is `par-api.floresaybaez574.workers.dev`, exposing the
   owner's default Cloudflare account name. It should become
   `par.ovpcasss.workers.dev` (`par` Worker, `ovpcasss` account subdomain).

### Current state (verified this session, 2026-10-22)

| Fact                                                                                                 | Evidence                                                                                       |
| ---------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------- |
| Remote D1 `par-db` reference tables are empty                                                        | `select count(*)` returned 0 for campuses, units, programs, sdgs, departments, offices, terms  |
| Remote `users` has 2 rows, both `ADMIN` / `ACTIVE` (the two bootstrap addresses)                     | `select email, role, status` on remote D1                                                      |
| Worker `par-api` is deployed                                                                         | `wrangler deployments list --name par-api`; latest deploy 2026-10-21T16:59Z                    |
| Production origin is `https://par-api.floresaybaez574.workers.dev`                                   | `apps/api/wrangler.toml`, desktop CSP, release workflow                                        |
| Seed constants already match the workbook                                                            | `SEED_CAMPUSES` 2, `SEED_UNITS` 27, `SEED_PROGRAMS` 44, `SEED_SDGS` 17 (imported with Node 24) |
| `campus.png` has exactly one consumer                                                                | `apps/web/src/lib/components/AuthLayout.svelte`                                                |
| New accounts are role-less and pending                                                               | `register.ts`, `verify-email.ts`, `google.ts`, `password-reset.ts`                             |
| Specs describe the old approval flow                                                                 | 21 `PENDING_ROLE` mentions across 7 spec files                                                 |
| Wrangler is authenticated as `floresaybaez574@gmail.com`, account `fab94f3e8a58d3b3509d01f11a67b843` | `wrangler whoami`; visible scope is `account (read)`, `workers (write)`, `d1 (write)`          |

---

## 2. Decisions (from the interview)

| #   | Decision                                                                                                                                                                |
| --- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| D1  | One-time **rerunnable seed script** run against remote D1 now; keep `POST /api/v1/ref/seed` for reruns.                                                                 |
| D2  | Seed the workbook lists **and** create departments/offices from the units: Departments = colleges + graduate-school groups; Offices = satellite campuses + other units. |
| D3  | New accounts become **SUBMITTER + ACTIVE after email verification** (or immediately for Google's verified address).                                                     |
| D4  | **Remove `PENDING_ROLE` entirely** from the workflow, admin UI, inbox, and contracts; normalize legacy rows with a one-off remote SQL update.                           |
| D5  | Rename the Worker to **`par`** and change the account workers.dev subdomain to **`ovpcasss`**; the owner performs the dashboard change with a step-by-step guide.       |
| D6  | Handle the rename end to end: Google OAuth console, email links, desktop CSP, release workflow, runbooks, and a locally built installer. No tag or GitHub release.      |
| D7  | **Delete `par-api`** after `par` is verified, so only one Worker owns the queue consumer and cron schedules.                                                            |
| D8  | Successful password reset on an unverified account activates it as **SUBMITTER + ACTIVE**.                                                                              |
| D9  | Remove the admin pending-role queue/count/filter; role changes stay on the user row.                                                                                    |
| D10 | Amend the specs (`par-paperless-spec.md` plus affected phase/spec files) rather than leave them contradicting the code.                                                 |
| D11 | `db:seed` defaults to **local**; `--remote` is the explicit production target.                                                                                          |
| D12 | Reruns **skip existing rows**; admin edits and deactivations are never overwritten.                                                                                     |
| D13 | Seed command: rerunnable, explicit, CI-safe. No hidden seeding on read.                                                                                                 |

---

## 3. Workstream A — Seed the cloud D1

### A1. What gets written

| Table             | Source                                                                             | Rows | Natural key for idempotency |
| ----------------- | ---------------------------------------------------------------------------------- | ---- | --------------------------- |
| `ref_campuses`    | `SEED_CAMPUSES` (MAIN, SATELLITE)                                                  | 2    | `code`                      |
| `ref_units`       | `SEED_UNITS` (7 colleges, 2 graduate groups, 15 satellite campuses, 3 other units) | 27   | `code`                      |
| `ref_programs`    | `SEED_PROGRAMS`                                                                    | 44   | `code`                      |
| `ref_sdgs`        | `SEED_SDGS`                                                                        | 17   | `number`                    |
| `ref_departments` | colleges + graduate-school groups                                                  | 9    | `name`                      |
| `ref_offices`     | satellite campuses + other units                                                   | 18   | `name`                      |

Every written row: `is_active = 1`, `is_seeded = 1`, `deleted_at = NULL`,
`sort_order` as follows.

- Departments: CPAG, CAS, CB, CED, CT, CON, COL, DOCTORATE, MASTERS — sort
  1–9 in that order. Names verbatim from the workbook.
- Offices: the 15 named satellite campuses in workbook order (TALAKAG →
  CABANGLASAN), then SECONDARY LABORATORY SCHOOL, ELEMENTARY LABORATORY
  SCHOOL, NATIONAL SERVICE TRAINING PROGRAM — sort 1–18.
- Terms and attachment requirements stay empty. The workbook has no source
  list for them, and the admin maintains them (spec §8, §14 Q5). This is
  recorded as an explicit non-goal so it is not mistaken for a missing seed.

### A2. Runtime seeder change

`packages/db/src/seed/index.ts` gains two blocks after the units block:

- `SEED_DEPARTMENTS` and `SEED_OFFICES` live in
  `packages/db/src/seed/reference-data.ts` as `SeedDirectoryEntry[]`
  (`{ key, name, sortOrder }`), derived from the unit constants so a unit
  rename cannot drift between lists.
- Existing rows are matched by trimmed, case-insensitive `name`; a match is
  skipped. Inserts use `crypto.randomUUID()`, matching the current seeder.
- Also export the lists for the SQL generator and a count test.

### A3. Remote seed script (no new dependency)

Node 24.12 runs erasable TypeScript directly; verified:

```bash
node --input-type=module -e "const m = await import('./packages/db/src/seed/reference-data.ts'); console.log(m.SEED_CAMPUSES.length, m.SEED_UNITS.length, m.SEED_PROGRAMS.length, m.SEED_SDGS.length)"
# 2 27 44 17
```

Add `packages/db/scripts/seed-sql.ts`:

- Imports `../src/seed/reference-data.ts` with an explicit extension (Node
  strips the type-only `@par/shared` import, so no workspace resolution is
  needed at runtime).
- Emits idempotent SQL, one statement per row:
  `INSERT INTO ref_x (…) SELECT … WHERE NOT EXISTS (SELECT 1 FROM ref_x WHERE <natural key> = …);`
- Deterministic ids (`seed-campus-main`, `seed-unit-cpag`,
  `seed-program-bsit`, `seed-department-cpag`, `seed-office-talakag`,
  `seed-sdg-1`). `idSchema` is `z.string().min(1)`, so any stable string is a
  valid contract value, and a rerun cannot create a second copy through a new
  random id. The runtime seeder may keep `crypto.randomUUID()` because its
  skip-existing check runs before every insert; the two paths must not both
  write the same natural key.
- `--out <path>` creates its parent directory, so the fixed `.turbo/seed.sql`
  path works on a fresh checkout without a prior turbo run.
- Timestamps: `strftime('%Y-%m-%dT%H:%M:%fZ','now')` for `created_at` and
  `updated_at`.
- Escapes `'` in names (only the apostrophe-less worksheet values are present,
  but the generator must still be safe).
- Writes to a temporary file (or stdout with `--stdout`) so
  `wrangler d1 execute` can consume it.

The script sits outside `packages/db/tsconfig.json`'s include (`src/**/*.ts`,
`tests/**/*.ts`, `drizzle.config.ts`), so extension-qualified imports do not
need a tsconfig change.

### A4. Commands

Root `package.json`:

```json
"db:seed": "node packages/db/scripts/seed-sql.ts --out .turbo/seed.sql && pnpm --filter @par/db exec wrangler d1 execute par-db --file ../../.turbo/seed.sql"
```

- Default target: local D1 (matching `db:migrate`).
- `pnpm db:seed --remote` forwards `--remote` and writes the same SQL to the
  remote database. This is the deliberate production run executed once now.
- No turbo task is needed; seeding is not part of `build`, `verify`, or CI.

### A5. Execution now and verification

1. Run `pnpm db:seed --remote`.
2. Re-run `pnpm db:seed --remote`; counts must not change (idempotency proof).
3. Verify with remote SQL:

```sql
SELECT
  (SELECT count(*) FROM ref_campuses) AS campuses,        -- 2
  (SELECT count(*) FROM ref_units) AS units,              -- 27
  (SELECT count(*) FROM ref_programs) AS programs,        -- 44
  (SELECT count(*) FROM ref_sdgs) AS sdgs,                -- 17
  (SELECT count(*) FROM ref_departments) AS departments,  -- 9
  (SELECT count(*) FROM ref_offices) AS offices;          -- 18
```

4. With an admin session, load `/admin/reference-data` and confirm each tab
   lists the rows, then open a new report and confirm the campus, college,
   program, department, and office selectors populate.
5. `POST /api/v1/ref/seed` remains available and must be idempotent against
   the already-seeded remote database.

---

## 4. Workstream B — Automatic Submitter, remove `PENDING_ROLE`

### B1. Account lifecycle after the change

| Path                                | Role written                        | Status written         |
| ----------------------------------- | ----------------------------------- | ---------------------- |
| Email registration                  | `SUBMITTER`                         | `PENDING_VERIFICATION` |
| Email verification link             | `SUBMITTER` (already set)           | `ACTIVE`               |
| Bootstrap admin verifies            | `ADMIN`                             | `ACTIVE`               |
| Google, first sign-in               | `SUBMITTER` (`ADMIN` for bootstrap) | `ACTIVE`               |
| Google, existing unverified account | `SUBMITTER` if null                 | `ACTIVE`               |
| Password reset, unverified account  | `SUBMITTER` if null                 | `ACTIVE`               |
| Admin changes role                  | new role                            | status unchanged       |
| Disabled account                    | unchanged                           | `DISABLED`             |
| Reactivated by admin                | unchanged                           | `ACTIVE`               |

`PENDING_VERIFICATION` remains: it is what makes the emailed link meaningful.
`PENDING_ROLE` is gone.

### B2. Enum and contract

- `packages/shared/src/domain/enums.ts`: `USER_STATUSES` becomes
  `['PENDING_VERIFICATION', 'ACTIVE', 'DISABLED']`.
- `packages/shared/src/contracts/users.ts`: drop `pendingRoleCount` from
  `AdminUserListResponse`; the status filter accepts only the remaining three.
- `packages/shared/src/contracts/inbox.ts`: drop `pendingRoleApprovals` from
  the admin block.
- No DB migration is needed: `users.status` is a text column with an enum at
  the TypeScript/Drizzle layer, not a SQL `CHECK` constraint. Legacy values
  are removed by the data update in B5.

### B3. API changes

- `auth/application/register.ts`: insert `role: 'SUBMITTER'` (status stays
  `PENDING_VERIFICATION`). Audit payload unchanged.
- `auth/application/verify-email.ts`: set `status: 'ACTIVE'` instead of
  `PENDING_ROLE`; keep the bootstrap-admin override.
- `auth/application/google.ts`: new account gets `SUBMITTER`/`ACTIVE`; an
  existing `PENDING_VERIFICATION` account becomes `ACTIVE`; a null role is
  filled with `SUBMITTER` defensively before issuing the session.
- `auth/application/password-reset.ts`: an unverified account gets
  `SUBMITTER` if null and `ACTIVE` after a successful reset.
- `auth/domain/sign-in.ts`: remove the `PENDING_ROLE` case (only `ACTIVE` can
  sign in; the other cases keep their current blocks).
- `auth/domain/google.ts` (`googleLandingPath`): remove the
  `/awaiting-approval` branch.
- `users/application/list-users.ts`: delete the pending-role count query.
- `users/application/user-actions.ts` + `users/domain/role-change.ts`:
  `assignRole` writes only the role. Delete `statusAfterRoleAssignment`; a role
  change no longer activates anything because nothing waits for activation.
- `inbox/application/build-inbox.ts`: drop `countByStatus('PENDING_ROLE')`
  and `pendingRoleApprovals`.
- `packages/email/src/templates/account-events.ts`: `ROLE_ASSIGNED` no longer
  says the account "still needs to be activated"; update the module comment.
  `ACCOUNT_ACTIVATED` stays for the disabled → active path.

### B4. Web changes

- Delete `apps/web/src/routes/awaiting-approval/` and
  `apps/web/src/lib/features/auth/presentation/AwaitingApprovalPanel.svelte`.
- `post-sign-in.ts`, `startup-route.ts`: remove the `PENDING_ROLE` destination
  and the `/awaiting-approval` protected-path entry.
- `features/admin/application/user-directory.ts`: remove the status label,
  the pending filter option, and the pending-role activation condition in
  `userActionStates` (activation remains for `DISABLED`).
- `features/admin/presentation/UsersPageHeader.svelte` and
  `AdminUsersPage.svelte`: remove `pendingRoleCount` and its banner.
- `features/admin/presentation/UserActions.svelte`: remove the pending-role
  primary-button branch.
- `features/inbox/application/inbox-view.ts`: remove the pending-role admin
  action (the failed-email and audit actions stay).
- `features/onboarding/application/tour-eligibility.ts`: remove the
  `PENDING_ROLE` branch.
- Copy: `VerifyEmailPanel.svelte` success text becomes "Your email address is
  verified. Sign in to submit a report." (no administrator assignment).
  Review `LoginForm.svelte`, `GoogleSignIn.svelte`, and `google-errors.ts` for
  any remaining "waiting for a role" wording; "not active" remains for
  disabled accounts only.

### B5. Legacy data update (one-off, remote)

Run against remote D1 after the code is ready and before or with the deploy:

```sql
UPDATE users
SET role = 'SUBMITTER', updated_at = strftime('%Y-%m-%dT%H:%M:%fZ','now')
WHERE role IS NULL;

UPDATE users
SET status = 'ACTIVE', updated_at = strftime('%Y-%m-%dT%H:%M:%fZ','now')
WHERE status = 'PENDING_ROLE';
```

Deliberately two statements: the first gives every role-less account a role
without touching `DISABLED`; the second activates only accounts that were
waiting for a role. No `DISABLED` account is reactivated. This is a data fix,
not a schema migration (the state is removed from the code; no environment
should be able to create it again).

### B6. Tests to update or delete

- `apps/api/src/features/auth/domain/sign-in.test.ts` (remove pending case).
- `apps/api/src/features/auth/domain/google.test.ts` (landing path).
- `apps/api/src/features/users/domain/role-change.test.ts` (delete with the
  helper).
- `apps/api/src/features/auth/application/config.test.ts` (bootstrap rules
  unchanged; add coverage that bootstrap still wins).
- `apps/web/src/lib/features/auth/application/post-sign-in.test.ts` and
  `startup-route.test.ts`.
- `apps/web/src/lib/features/admin/application/user-directory.test.ts`,
  `presentation/ReferenceDataTable.test.ts` (unaffected), `UserActions`
  coverage.
- `apps/web/src/lib/features/inbox/application/inbox-view.test.ts` and
  `WorkInbox.test.ts`.
- `apps/web/src/lib/features/onboarding/application/tour-eligibility.test.ts`.
- Add API tests for: registration writes `SUBMITTER`; verification activates;
  Google first sign-in is active; reset activates unverified; bootstrap
  admin beats the default.

### B7. Spec amendments (D10)

Update the old policy in these files, keeping the office's formal voice:

- `docs/spec/par-paperless-spec.md` §7.4 (after verification the account is
  active as Submitter) and §9/§7.3 (admin assigns roles, no activation gate).
- `docs/spec/ui/01-auth-and-account.md` (routing, awaiting-approval removal,
  verification copy).
- `docs/spec/ui/00-foundation.md` (route table row).
- `docs/spec/ui/03-admin-users.md` (remove pending queue/filter/actions).
- `docs/spec/startup-splash-spec.md` (launch routing table).
- `docs/spec/onboarding-tour-spec.md` (eligibility).
- `docs/spec/email-integration-spec.md` (role-assigned mail no longer promises
  activation).

`PENDING_ROLE` must have zero remaining mentions under `docs/spec` after the
amendments.

---

## 5. Workstream C — Remove `campus.png`

Verified: the only reference is `AuthLayout.svelte`.

1. Delete the `.auth-scene` element (`{#if showScene}` block), the
   `showScene` prop, and the `.auth-scene` rules in the base, `max-width:
640px`, and `max-height: 700px` media queries.
2. Delete `apps/web/src/lib/components/AuthLayoutNoBackground.svelte`; update
   its two consumers (`routes/login/+page.svelte`, `routes/register/+page.svelte`)
   to use `AuthLayout`.
3. Delete `apps/web/static/brand/campus.png` (1,916,637 bytes).
4. The auth page keeps `var(--surface-auth)` and the existing paper surface;
   the machine figure and logo are untouched.
5. Verify: `grep -R "campus.png\|auth-scene\|showScene" apps/web` returns
   nothing; `pnpm --filter @par/web build` succeeds and the asset is absent
   from `apps/web/build/brand/`.

---

## 6. Workstream D — `par.ovpcasss.workers.dev`

### D1. What changes in the repository

| File                                           | Change                                                                                       |
| ---------------------------------------------- | -------------------------------------------------------------------------------------------- |
| `apps/api/wrangler.toml`                       | `name = "par"`; `APP_ORIGIN = "https://par.ovpcasss.workers.dev"`; update the origin comment |
| `apps/desktop/src-tauri/tauri.conf.json`       | CSP `connect-src` host → `https://par.ovpcasss.workers.dev`                                  |
| `.github/workflows/desktop-release.yml`        | `VITE_API_BASE_URL` → `https://par.ovpcasss.workers.dev/api/v1`                              |
| `docs/runbooks/deploy.md`                      | Worker name in scope line and `wrangler tail par`                                            |
| `docs/runbooks/incident.md`, `key-rotation.md` | `wrangler tail par`                                                                          |
| `docs/spec` + runbooks                         | Production origin examples where the real origin appears                                     |

Test fixtures using `par-api.example.workers.dev` are generic examples and
stay. `apps/api/dist/README.md` is a build artifact and is not edited.

### D2. Step-by-step guide for the owner (dashboard)

Per Cloudflare's current documentation
(<https://developers.cloudflare.com/workers/configuration/routing/workers-dev/>):

1. Sign in to the Cloudflare dashboard with the account that owns this project
   (`floresaybaez574@gmail.com`, account `fab94f3e8a58d3b3509d01f11a67b843`).
2. Open **Workers & Pages**.
3. Find **Your subdomain** on the right side of the Workers & Pages overview
   and select **Change**.
4. Enter `ovpcasss` and confirm.
5. Tell me when it is saved. The hostname becomes
   `par.ovpcasss.workers.dev`; every Worker in the account moves under
   `ovpcasss.workers.dev`, and the old `*.floresaybaez574.workers.dev`
   hostnames stop serving.

Notes to state, not to work around:

- `ovpcasss` must be globally available; if Cloudflare rejects it, the
  fallback is `ovpcasss-par` (URL `par.ovpcasss-par.workers.dev`).
- Cloudflare treats `workers.dev` as a Free website for hobby/personal
  projects and recommends a route or custom domain for production. A custom
  domain is out of scope for this change and remains the recommended follow-up.
- This dashboard setting is the only step that cannot be done from this
  workspace: the local wrangler OAuth token exposes `account (read)`, not the
  account-settings write the subdomain API needs.

### D3. Deploy sequence (order matters)

1. Land the code changes and pass `pnpm verify`.
2. Seed remote D1 (Workstream A) and run the role backfill (B5).
3. `pnpm --filter @par/web build`.
4. `pnpm --filter @par/api exec wrangler deploy` — creates the **`par`**
   Worker. At this point it answers on
   `par.floresaybaez574.workers.dev` (old account subdomain, new Worker name).
   Worker secrets are per script and do not carry over: re-set
   `EMAIL_API_KEY`, `GOOGLE_CLIENT_ID` and `GOOGLE_CLIENT_SECRET` (and the R2
   keys if presigned uploads are wanted) with
   `wrangler secret put <NAME> --name par` before calling the deploy done.
5. Smoke test that hostname: `/api/health`, sign in, open a report, open the
   admin reference page, confirm the seed rows.
6. **Delete the old Worker** (`wrangler delete --name par-api`) before the
   subdomain change. `par-api` still has the same cron triggers (`17 * * * *`,
   `30 18 * * *`) and the `par-email` queue consumer; leaving it deployed
   means duplicate reminders/backups and a shared queue consumer.
7. Ask the owner to perform D2. The URL becomes
   `https://par.ovpcasss.workers.dev`.
8. Update the Google Cloud console OAuth client (D4), then verify Google
   sign-in on the new origin.
9. Rebuild the desktop app (D5) and test the installer.

Between steps 4 and 7, `APP_ORIGIN` already points at the new host while the
new hostname does not resolve yet. Cron-composed mail sent in that window
would carry a dead link; the window should be minutes, not hours. Cron runs at
17 minutes past the hour, so schedule the deploy away from `:17`.

### D4. Google OAuth console

In **Google Cloud console → APIs & Services → Credentials**, open the OAuth
2.0 Client ID used for this app (the same client whose ID/secret are Worker
secrets), then:

- **Authorized JavaScript origins**: add `https://par.ovpcasss.workers.dev`
- **Authorized redirect URIs**: add
  `https://par.ovpcasss.workers.dev/api/v1/auth/google/callback`
- Save, wait for propagation (minutes), keep the old entries until the new
  sign-in is verified, then remove them.

Local development keeps `http://localhost:5173` and
`http://localhost:5173/api/v1/auth/google/callback`; `.dev.vars` is unchanged.
The desktop flow still lands on
`https://par.ovpcasss.workers.dev/api/v1/auth/google/callback` and returns to
the shell over the loopback redirect.

### D5. Desktop build (local only)

```bash
pnpm --filter @par/web build
VITE_API_BASE_URL=https://par.ovpcasss.workers.dev/api/v1 pnpm --filter @par/desktop build
```

- Icons are gitignored; if the build complains, run
  `pnpm --filter @par/desktop exec tauri icon ../../apps/web/static/brand/ovpcasss-logo.png --fit contain`.
- The MSI/NSIS output lands in
  `apps/desktop/src-tauri/target/release/bundle/`.
- The build is unsigned (no certificate yet) and no updater endpoint/pubkey is
  armed. Old installed copies keep pointing at the removed hostname and must be
  uninstalled and reinstalled from the new installer.
- No tag, no GitHub release, no publishing.

### D6. Verification after the rename

1. `curl -fsS https://par.ovpcasss.workers.dev/api/health` → `{"status":"ok"}`.
2. Load the sign-in page on the new origin; sign in with an email account.
3. Confirm the reference dropdowns are populated from remote D1.
4. Verify Google sign-in end to end on the new origin.
5. Request a verification email for a fresh address; confirm the link opens
   `https://par.ovpcasss.workers.dev/verify-email?token=…`.
6. Confirm the admin user list shows the two admins and any new test account
   as `SUBMITTER` / `ACTIVE`.
7. `wrangler deployments status --name par` shows both cron schedules; the
   queue consumer is attached to `par` only.
8. Install the locally built desktop app and sign in against the new origin.

---

## 7. Risks and mitigations

| Risk                                                                      | Mitigation                                                                                                             |
| ------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------- |
| Old desktop installs break at cutover                                     | Documented; locally built installer is the upgrade path; auto-update is not armed                                      |
| Google sign-in breaks until the console is updated                        | Update the console immediately after the subdomain change; keep the old origin entries until verified                  |
| Duplicate cron jobs / queue consumer during the overlap                   | Delete `par-api` after `par` is healthy, before the subdomain change                                                   |
| `ovpcasss` subdomain unavailable                                          | Fall back to `ovpcasss-par`; update the same three config values                                                       |
| Remote seed duplicates                                                    | `WHERE NOT EXISTS` on natural keys + deterministic ids; rerun test                                                     |
| Seed overwrites office edits                                              | Skip-existing rule; no UPDATE statements in the seed                                                                   |
| Legacy `PENDING_ROLE` rows break the enum                                 | Two-statement backfill before deploy; verify `count(*) where status='PENDING_ROLE'` is 0                               |
| New user can submit without a role check                                  | `requireRole` still enforces every route; the default is a real `SUBMITTER` role, not a bypass                         |
| Email links point at a dead host in the cutover window                    | Deploy away from `:17`; keep the window minutes                                                                        |
| New Worker starts without secrets (renaming creates a script, not a copy) | Re-set the secrets on `par` right after its first deploy; the old script's values are unrecoverable once it is deleted |

---

## 8. Files expected to change

New:

- `packages/db/scripts/seed-sql.ts`
- `docs/spec/cloud-seed-role-rebrand-spec.md` (this file)

Seed:

- `packages/db/src/seed/reference-data.ts`, `packages/db/src/seed/index.ts`,
  `packages/db/src/seed/seed.test.ts`, root `package.json`

Role:

- `packages/shared/src/domain/enums.ts`,
  `packages/shared/src/contracts/users.ts`,
  `packages/shared/src/contracts/inbox.ts`
- `apps/api/src/features/auth/application/{register,verify-email,google,password-reset}.ts`,
  `apps/api/src/features/auth/domain/{sign-in,google}.ts`
- `apps/api/src/features/users/application/{list-users,user-actions}.ts`,
  `apps/api/src/features/users/domain/role-change.ts` (delete)
- `apps/api/src/features/inbox/application/build-inbox.ts`
- `packages/email/src/templates/account-events.ts`
- `apps/web/src/lib/features/auth/application/{post-sign-in,startup-route}.ts`,
  `apps/web/src/lib/features/auth/presentation/{AwaitingApprovalPanel.svelte (delete),VerifyEmailPanel.svelte,LoginForm.svelte,GoogleSignIn.svelte}`,
  `apps/web/src/routes/awaiting-approval/` (delete)
- `apps/web/src/lib/features/admin/**` status/filter/header/actions
- `apps/web/src/lib/features/inbox/**`
- `apps/web/src/lib/features/onboarding/application/tour-eligibility.ts`
- Tests beside each of the above

Auth cleanup:

- `apps/web/src/lib/components/AuthLayout.svelte`,
  `AuthLayoutNoBackground.svelte` (delete),
  `apps/web/src/routes/{login,register}/+page.svelte`,
  `apps/web/static/brand/campus.png` (delete)

Rename:

- `apps/api/wrangler.toml`,
  `apps/desktop/src-tauri/tauri.conf.json`,
  `.github/workflows/desktop-release.yml`,
  `docs/runbooks/{deploy,incident,key-rotation}.md`

Specs:

- `docs/spec/par-paperless-spec.md`, `docs/spec/ui/00-foundation.md`,
  `docs/spec/ui/01-auth-and-account.md`, `docs/spec/ui/03-admin-users.md`,
  `docs/spec/startup-splash-spec.md`, `docs/spec/onboarding-tour-spec.md`,
  `docs/spec/email-integration-spec.md`

---

## 9. Acceptance checklist

- [ ] `pnpm verify` passes (lint, typecheck, every package's tests).
- [ ] Remote D1 counts: 2 / 27 / 44 / 17 / 9 / 18, and a second `db:seed
  --remote` changes nothing.
- [ ] `/admin/reference-data` shows all six lists; a new report's campus,
      college, program, department, and office selectors have real values on
      a second device.
- [ ] New email registration yields `SUBMITTER` at verification and lands on
      `/` (not `/awaiting-approval`).
- [ ] New Google sign-in yields `SUBMITTER` / `ACTIVE`.
- [ ] Bootstrap addresses still become `ADMIN`.
- [ ] Unverified password reset yields `SUBMITTER` / `ACTIVE`.
- [ ] `PENDING_ROLE` appears nowhere in code or `docs/spec`; remote
      `select count(*) from users where status='PENDING_ROLE'` is 0.
- [ ] Admin user row allows changing the role; the role-assigned email no
      longer claims activation is pending.
- [ ] Auth pages render without `campus.png`; the file is deleted and absent
      from the build.
- [ ] `https://par.ovpcasss.workers.dev/api/health` returns ok; web and Google
      sign-in work; email links use the new host.
- [ ] `par-api` is deleted; only `par` owns the crons and queue consumer.
- [ ] A local desktop installer built with the new `VITE_API_BASE_URL`
      installs and signs in.
- [ ] No tag, release, or production push beyond the authorised deploy.

---

## 10. Assumptions and open questions

1. `ovpcasss` is available as a workers.dev account subdomain. If not, use
   `ovpcasss-par` and update the three config values consistently.
2. The owner has access to the Google Cloud console OAuth client; without it,
   Google sign-in remains broken after the rename and that must be reported.
3. The two existing users are the only accounts in production today; the
   backfill is still written for any role-less/PENDING_ROLE row.
4. Terms and attachment requirements stay empty until the office enters them
   (the workbook has no source list).
5. A custom domain is the recommended long-term replacement for workers.dev
   (Cloudflare's own guidance) but is out of scope here.
6. No staging environment exists (`docs/runbooks/deploy.md` known gap), so the
   changes go straight to production resources after local verification.
7. The desktop installer stays unsigned; SmartScreen warnings are expected.

## 11. Out of scope

- Seeding terms or attachment requirements.
- Adding a custom domain or Cloudflare Access in front of the app.
- Publishing a desktop release, bumping the app version, or tagging.
- A role-request flow for users who need Reviewer/Approver/Admin.
- Redesigning the auth page beyond removing the photograph.
- Any change to the report workflow state machine, tracking numbers, or audit
  log rules.
