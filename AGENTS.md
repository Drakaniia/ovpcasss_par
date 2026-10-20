# AGENTS.md

Paperless Post-Activity Report system for OVPCASSS. pnpm workspaces + Turborepo;
one SvelteKit SPA (`apps/web`) shipped both as a Cloudflare static site and inside
a Tauri 2 Windows shell, over one Hono Worker (`apps/api`) on D1, R2, and Queues.

The specs are still the source of truth; the implementation is not authorization
to change a contract. Never claim a check passed without running it this session.

## Commands

```bash
pnpm install                                        # lockfile is committed; CI uses --frozen-lockfile
pnpm --filter @par/web --filter @par/api dev        # browser work: web :5173 -> API :8787
pnpm --filter @par/desktop dev                      # desktop; its beforeDevCommand starts web+api
pnpm build                                          # every package, Tauri included (Windows only)
pnpm turbo run build --filter=!@par/desktop         # the build CI runs
pnpm verify                                         # check:structure -> lint -> typecheck -> test
pnpm --filter @par/web exec vitest run <path>       # one test file, no full turbo pass
pnpm db:generate                                    # drizzle-kit generate into packages/db/migrations
pnpm db:migrate                                     # wrangler d1 migrations apply --local
```

`pnpm dev` runs every package's `dev`, so it also launches Tauri, whose
`beforeDevCommand` starts web and API again — use the filtered commands above.

Turbo quirk: `lint`, `typecheck`, and `test` all `dependsOn: ["^build"]`, so a
dependency's build failure surfaces as a lint/typecheck failure. Read the actual
error before debugging the wrong package.

## Repo shape

| Path              | Owns                                                              |
| ----------------- | ----------------------------------------------------------------- |
| `apps/web`        | SvelteKit SPA (`adapter-static`), all screens, platform adapters  |
| `apps/api`        | Hono Worker: `/api/v1`, email-queue consumer, cron cleanup/backup |
| `apps/desktop`    | Tauri 2 shell around the web build; no TypeScript sources         |
| `packages/shared` | Zod contracts, enums, workflow state machine, tracking numbers    |
| `packages/db`     | Drizzle schema, generated migrations, seed, query helpers         |
| `packages/email`  | `EmailProvider` and adapters                                      |
| `packages/export` | Monitoring workbooks, facsimile and acknowledgement PDFs          |
| `packages/config` | Shared tsconfig, ESLint, Prettier presets                         |

## Where the truth lives

| Question                                                | File                                       |
| ------------------------------------------------------- | ------------------------------------------ |
| Endpoint groups, data model, workflow, milestones M0–M8 | `docs/spec/par-paperless-spec.md`          |
| UI contract and visual system                           | `docs/spec/par-ui-ux-spec.md`              |
| Scoped UI acceptance checklists (phases 00–16)          | `docs/spec/ui/README.md` + `NN-*.md`       |
| Surface, spacing, and responsive refinement (R0–R6)     | `docs/spec/ui-redesign-spec.md`            |
| Where a new file goes                                   | `docs/architecture/folder-architecture.md` |
| Deploy / rollback / restore / keys / uploads / incident | `docs/runbooks/README.md`                  |

A phase file never overrides `par-ui-ux-spec.md`. Open questions in spec §14 are
unanswered by design — state the assumption rather than silently deciding.

## Architecture rules

Hybrid layered-by-feature: `domain/` → `application/` → `infrastructure/` →
`presentation/`, dependencies point inward. Create only the layers a feature has.

```
shared ← db, email, export
api  → all packages
web  → shared + platform adapters only
desktop → nothing from apps
```

- `packages/shared` owns every contract and workflow rule. The API enforces the
  state machine; clients only request transitions. No workflow rule in a route.
- The API is the only door to D1/R2. Web requests go through
  `src/lib/api/http.ts` (`apiFetch`, `apiDownload`, `apiUpload`, `ApiError`).
- Web auth is an HttpOnly cookie. The desktop shell holds a bearer token from the
  OS credential store and sends `x-par-client: desktop`; `requireSession`
  resolves identity without rejecting, `requireRole` decides.
- Shell differences (drafts, tokens, file dialogs, downloads, updater) go behind
  `src/lib/platform/contracts.ts`. Tauri adapters are lazily imported — keep them
  out of the browser bundle.
- API routes are `features/<name>/routes.ts`, registered in `app.ts`. Report
  sub-resources (review, approval, attachments, acknowledgement) merge onto
  `/reports` there, not as separate mounts.
- SvelteKit owns `src/routes/` (thin route files); feature UI lives in
  `src/lib/features/<feature>/presentation/`.
- Keep the structure limits: 400 lines per source file, 30 files per directory,
  4 levels below `src/`. No `utils/`, `helpers/`, or `misc/`; name modules for
  what they do. kebab-case files, `PascalCase.svelte`, plural feature folders.

## API and data conventions

- REST + JSON under `/api/v1`; errors are
  `{ error: { code, message, details? } }`.
- Zod validates at the edge. Author schemas in `packages/shared`, import them in
  both API and web.
- Timestamps are stored UTC, displayed `Asia/Manila`.
- `audit_events` is append-only — never write an update or delete path for it.
- Tracking numbers (`OFF-2026-0001`, `EDU`, `INC`) are issued atomically at first
  submission and never change on resubmission.
- Nobody reviews or approves a report they submitted. Admin stands in for every
  role (spec §9, 2026-10-20) but separation of duties still applies to its own.
- Migrations are generated, never hand-edited, forward-only; destructive changes
  use expand/contract. CI fails if `db:generate` leaves the migrations dirty.

## Testing

- Tests sit beside their source as `*.test.ts`; there is no `tests/` tree and no
  `vitest.config` (package scripts are plain `vitest run`).
- Web component tests use `render` from `svelte/server` — no DOM or jsdom.
- `pnpm test` runs every package through turbo; a package with no test file fails.

## Environment quirks

- `apps/api/wrangler.toml` points `[assets]` at `../web/build`: build `@par/web`
  before any Worker build or deploy.
- Secrets come from `apps/api/.dev.vars` (copy `.dev.vars.example`). Set
  `EMAIL_PROVIDER=console` locally to print mail, including verification links.
  Google sign-in only appears when both OAuth values are set.
- The Vite proxy keeps `changeOrigin: false` because the Worker's CSRF guard
  compares `Origin` to `Host`; rewriting the host 403s every write.
- Desktop builds need an absolute `VITE_API_BASE_URL`, and its host must be in
  the Tauri CSP `connect-src` (`apps/desktop/src-tauri/tauri.conf.json`).
- Montserrat is vendored in `apps/web/static/fonts`; keep the app free of
  external font/CDN requests so the desktop build works offline.
- Tauri icons are generated and gitignored: run
  `pnpm --filter @par/desktop exec tauri icon <png>` before `tauri build`.
- Merging to `main` does not deploy. Production is a `v*` tag or a manual
  dispatch, with D1 migrations applied before the Worker (`.github/workflows/deploy.yml`).
- `.npmrc` sets `engine-strict=true`: Node >=22, pnpm 12.3.4. Dependency versions
  are pinned exactly; do not bump one without checking peers.

## UI work

Baseline: **apple-design**, refined by **antislop-ui**, minimal by **ponytail**.
Components consume CSS custom properties from `tokens.css` via `app.css`; raw
brand hex lives only in `tokens.css`.

- Status maps 1:1 to the API enum (`DRAFT`, `SUBMITTED`, `RESUBMITTED`,
  `RETURNED_BY_REVIEWER`, `RETURNED_BY_APPROVER`, `ENDORSED`, `APPROVED`). Never
  invent a state; status is never color alone.
- Exactly one filled navy primary button per screen. Gold is decorative, never a
  button. Maroon means "sent back" in workflow contexts.
- Keyboard is a shortcut, never a requirement; single-letter shortcuts stay
  suppressed while typing. WCAG 2.2 AA, visible focus, skip link first.
- Desktop widths only: below 1024 px show the foundation notice; auth and
  awaiting-approval are exempt.
- English, formal institutional voice, office terms verbatim. No exclamation
  marks.
- Shared primitives (`StatusBadge`, `EmptyState`, `ErrorState`, `ConfirmDialog`,
  `ToastRegion`, table/form styles) live in `src/lib/components/` — extend them
  rather than forking them into a page. shadcn-svelte primitives are copied into
  the repo, not imported.
- Svelte 5 runes are the state model (`$props()`, `$state`).

## Commits

Conventional Commits, referencing the milestone or phase when relevant:
`feat(api): submit-report transitions to SUBMITTED (M3)`.
