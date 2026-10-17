# Migrations

Generated SQL files live here. Do not hand-edit them.

- `pnpm db:generate` runs `drizzle-kit generate` against `src/schema/`.
- `pnpm db:migrate` applies them with `wrangler d1 migrations apply`.
- Migrations are forward-only and reviewed before they reach production.
  Destructive changes use expand/contract (spec §12).
