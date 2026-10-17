# AGENTS.md

Paperless Post-Activity Report system for OVPCASSS. pnpm workspaces + Turborepo;
SvelteKit SPA + Tauri (Windows) over one Hono Worker on Cloudflare (D1, R2,
Queues).

## State of the repo

Scaffold only: boundaries and config exist, implementations are placeholders.
**Dependencies are not installed and no lockfile is committed.** Run
`pnpm install` first and commit the generated `pnpm-lock.yaml` — CI installs with
`--frozen-lockfile` and will fail without it.

Never claim a check passed without running it in this session. `pnpm test` runs
`vitest run` and fails when a package has no test file yet.

## Commands

```bash
pnpm install          # first run; commit pnpm-lock.yaml afterwards
pnpm dev              # web :5173 (proxies /api -> :8787) + wrangler dev :8787
pnpm build            # web build + Worker bundle; desktop only via --filter @par/desktop
pnpm verify           # check:structure -> lint -> typecheck -> test  (the local gate)
pnpm db:generate      # drizzle-kit generate from packages/db/src/schema
pnpm db:migrate       # wrangler d1 migrations apply --local
pnpm --filter @par/web test        # single package
```

Use `pnpm verify` before calling work done. CI additionally runs
`turbo run build --filter=!@par/desktop` — Tauri needs Windows, WebView2, and
generated icons, so it is excluded upstream.

Turbo quirk: `lint`, `typecheck`, and `test` all `dependsOn: ["^build"]`. A build
failure in a dependency surfaces as a lint/typecheck failure, not a build
failure — read the actual error before debugging the wrong package.

## Where the truth lives

| Question                                                               | File                                       |
| ---------------------------------------------------------------------- | ------------------------------------------ |
| What to build, endpoint groups, data model, workflow, milestones M0–M8 | `docs/spec/par-paperless-spec.md`          |
| UI contract and visual system                                          | `docs/spec/par-ui-ux-spec.md`              |
| Which UI work belongs in this session                                  | `docs/spec/ui/README.md` + `00..16-*.md`   |
| Where a new file goes                                                  | `docs/architecture/folder-architecture.md` |
| Deploy / rollback / restore / key rotation                             | `docs/runbooks/README.md`                  |

The specs win over your judgment. If a UI phase file disagrees with
`par-ui-ux-spec.md`, the original wins and the phase file is wrong. Run **one UI
phase per session** and walk its acceptance checklist as the definition of done.
Open questions in spec §14 are unanswered by design — do not silently decide
them; state the assumption in the report.

## Placeholders

Every unimplemented module says so and names its milestone: `(M3)`, `spec §7.3`.
When a milestone lands, replace the placeholder **in place** — do not add a
parallel module — and drop the `(M<n>)` marker. Do not pre-create empty layer
folders or speculative scaffolding for later milestones.

## Architecture rules

Hybrid layered-by-feature: `domain/` → `application/` → `infrastructure/` →
`presentation/`, dependencies pointing inward. Create only the layers a feature
actually has.

Dependency direction (never break it):

```
shared ← db, email, export
api  → all packages
web  → shared + platform adapters only
desktop → nothing from apps
```

- `packages/shared` is the single source of truth for Zod contracts, enums, the
  workflow state machine, and tracking numbers. The server enforces the state
  machine; clients only request transitions. Never put a workflow rule in a
  route file.
- The API is the only door to D1/R2. The web app talks to `/api/v1` through
  `src/lib/api/http.ts` (`apiFetch`, `ApiError`, cookie credentials).
- Shell differences (offline drafts, token store, file dialog) go behind
  `src/lib/platform/contracts.ts` with `platform/web/` and `platform/tauri/`
  implementations. Tauri adapters are lazily imported so the browser never
  downloads them — keep it that way.
- API routes register as `features/<name>/routes.ts`; sub-resources of the same
  base are merged onto `/reports` in `app.ts`, not mounted separately.

Enforced by `pnpm check:structure`, not by review:

- 400 lines per source file, 30 files per directory, 4 levels below each
  package's `src/`.
- No `utils/`, `helpers/`, or `misc/` directories. Name modules for what they do
  (`tracking-number.ts`).
- No source files in the repo root except `*.config.js|mjs|ts`.
- kebab-case files/folders, `PascalCase.svelte`, plural feature folders.

## API and data conventions

- REST + JSON under `/api/v1`; errors are always
  `{ error: { code, message, details? } }`.
- Zod validates every input at the edge. Author schemas in `packages/shared`,
  then import them in both the API and the web app.
- Timestamps are stored UTC, displayed `Asia/Manila`.
- `audit_events` is append-only — never write an update or delete path for it.
- Tracking numbers (`OFF-2026-0001`, `EDU`, `INC`) are issued at first
  submission only, atomically, and never change on resubmission.
- A user can never review or approve a report they submitted. Admin is not
  implicitly Reviewer or Approver.
- D1 migrations are generated, never hand-edited, forward-only; destructive
  changes use expand/contract.

## Environment quirks

- `apps/api/wrangler.toml` has `database_id = "replace-with-environment-database-id"`
  and points `[assets]` at `../web/build` — a Worker build/deploy needs the web
  build to exist first. Local D1/R2/Queues are emulated by `wrangler dev`.
- Secrets come from `apps/api/.dev.vars` (copy `.dev.vars.example`) or Wrangler
  secrets. Never commit them and never inline them in the Tauri bundle.
- `apps/web/.env.example` → `VITE_API_BASE_URL` stays relative `/api/v1` for the
  web build; the desktop build needs an absolute URL.
- `.npmrc` sets `engine-strict=true`: Node >=22 and pnpm 12.3.4 exactly.
- All dependency versions are pinned to an exact version. Do not bump one
  without verifying it resolves and that its peers are satisfied.

## UI work

Baseline for every UI change: **apple-design**, refined by **antislop-ui** and
kept minimal with **ponytail**. The phase-00 tokens are the palette; components
use CSS custom properties from `app.css`, never raw hex.

Non-negotiables from the UI spec (the acceptance checklists repeat these):

- Status maps 1:1 to the API enum (`DRAFT`, `SUBMITTED`, `RESUBMITTED`,
  `RETURNED_BY_REVIEWER`, `RETURNED_BY_APPROVER`, `ENDORSED`, `APPROVED`).
  Never display "In progress" or invent a state. Status is never color alone.
- Exactly one filled navy primary button per screen. Gold is decorative and
  never a button color. Maroon means "sent back" in workflow contexts.
- Keyboard is a shortcut, never a requirement; single-letter shortcuts are
  suppressed while typing. WCAG 2.2 AA, visible focus, skip link first.
- No webfonts (the Tauri build must stay offline-safe). No mobile design: below
  1024 px show the foundation notice; auth and awaiting-approval are exempt.
- Copy is English, formal institutional voice, using the office's terms
  verbatim (Post-Activity Report, tracking number, endorsement, approval,
  return). No exclamation marks.
- Shared primitives (`StatusBadge`, `EmptyState`, `ErrorState`, `ConfirmDialog`,
  `ToastRegion`, table/form styles) are owned by phase 00 — extend them instead
  of forking them inside a page. Cross-feature components live in
  `src/lib/components/`, feature components in
  `src/lib/features/<feature>/presentation/`.
- shadcn-svelte primitives are copied into the repo, not imported from a package.

Svelte 5 runes are the state model (`$props()`, `$state`); components stay under
400 lines.

## Commits

Conventional Commits. Reference the milestone or phase when relevant, e.g.
`feat(api): submit-report transitions to SUBMITTED (M3)`.
