# Folder architecture

Derived from `docs/spec/par-paperless-spec.md` §3-§4. This is the placement
contract for every file added to the repository. `pnpm check:structure` enforces
the mechanical rules.

## Pattern

**Hybrid, layered-by-feature.** Each app and package owns one bounded context;
inside a feature, code is split by layer and dependencies point inward:

```
domain/          pure types, enums, rules. No I/O, no framework imports.
application/     use cases orchestrating domain + ports.
infrastructure/  D1, R2, HTTP, email adapters implementing ports.
presentation/    Svelte components or Hono route wiring (web/api only).
```

A feature only creates the layers it actually has. Do not pre-create empty
layer folders. The core feature (`apps/api/src/features/reports`) is the
reference example.

Framework routing is the one exception: SvelteKit owns `src/routes/`, Hono
route wiring lives in `features/<name>/routes.ts`, and Tauri owns
`src-tauri/`.

## Repository tree

```
apps/
  web/        SvelteKit SPA (adapter-static)
  desktop/    Tauri 2 Windows shell; consumes the apps/web build
  api/        Hono Worker: routes, middleware, feature layers
packages/
  shared/     Zod contracts, enums, workflow state machine, tracking numbers
  db/         Drizzle schema, migrations, seed, query helpers
  email/      EmailProvider interface, adapters, templates
  export/     Monitoring-sheet and acknowledgement generators
  config/     Shared tsconfig, ESLint, Prettier presets
docs/         spec/ (spec and ADRs), architecture/ (this file), runbooks/
scripts/      Repository tooling (structure check)
```

## Dependency direction

| Package           | May import                              |
| ----------------- | --------------------------------------- |
| `packages/shared` | nothing (third-party libraries only)    |
| `packages/db`     | `shared`, drizzle                       |
| `packages/email`  | `shared`                                |
| `packages/export` | `shared`, pdf/excel libraries           |
| `apps/api`        | all packages, Hono                      |
| `apps/web`        | `shared`, platform adapters             |
| `apps/desktop`    | nothing from apps; shells the web build |

Never import an app from a package, and never import one feature's
`infrastructure/` from another feature. Cross-feature reuse goes through
`shared` only after a third consumer exists.

## Placement rules

- **Web routes** mirror the screens in spec §5. URL-visible segments stay
  kebab-case; route groups in parentheses do not affect URLs.
- **Web features** mirror API feature names: `auth`, `reports`, `review`,
  `approval`, `attachments`, `search`, `exports`, `admin`, `profile`.
  Shell-specific behavior lives behind `src/lib/platform/contracts.ts`;
  `platform/web/` and `platform/tauri/` implement it.
- **API features** own one resource group from spec §7.3. Route registration
  is `routes.ts`; handlers call `application/`, which calls
  `infrastructure/`. Workflow rules belong in `packages/shared`, not in a
  route file.
- **Tests** mirror source under a package-level `tests/` folder, e.g.
  `packages/shared/src/workflow/state-machine.ts` →
  `packages/shared/tests/workflow/state-machine.test.ts`.
- **Config** lives in the owning package. Only build/workspace manifests,
  README, LICENSE, and CI config belong at the repository root.
- **Generated output** (`dist/`, `build/`, `.svelte-kit/`, `migrations/`,
  `src-tauri/target/`) is excluded from all checks.

## Naming

- Files and folders: `kebab-case.ts`. Name by purpose: `tracking-number.ts`,
  never `helpers.ts`.
- Svelte components: `PascalCase.svelte`.
- Feature folders: plural resource nouns matching the API (`reports`,
  `attachments`).
- No `utils/`, `helpers/`, `common/`, or `misc/`. Shared technical code gets a
  descriptive module in the owning package (`lib/api/http.ts`,
  `lib/platform/contracts.ts`).

## Thresholds

| Rule                            | Limit               | Enforced          |
| ------------------------------- | ------------------- | ----------------- |
| Files per directory             | 30                  | `check:structure` |
| Lines per source file           | 400                 | `check:structure` |
| Folder depth below `src/`       | 4                   | `check:structure` |
| Source files in repository root | 0                   | `check:structure` |
| Shared module consumers         | 3 before extraction | review            |

The 4-level limit is measured from each package's `src/`, which is what the
hybrid pattern needs: `src/lib/features/reports/application` is four levels.
SvelteKit route folders must also stay within four levels.

`apps/desktop` has no TypeScript sources, so it declares only `dev` and `build`
and is excluded from the CI build (`--filter=!@par/desktop`). Root config files
(`eslint.config.js`, `prettier.config.js`) are exempt from the root-source-file
rule; anything else at the root must be a manifest, README, LICENSE, or CI
config.

## Adding a file

1. Pick the owning app/package and feature.
2. Choose the innermost layer that can hold it (domain → application →
   infrastructure → presentation).
3. Check the target directory is under 30 files and depth 4.
4. Name it by purpose in kebab-case, or PascalCase for Svelte components.
5. Update the feature barrel only if the feature has one.
6. Run `pnpm check:structure`, then the package typecheck and tests.

## Current state

This scaffold contains configuration, folder boundaries, and placeholder
modules only. No dependencies are installed and no build has run yet. The
first implementation milestone is M0 in spec §13.
