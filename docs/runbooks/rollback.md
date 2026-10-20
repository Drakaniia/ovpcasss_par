# Rollback

Scope: undo a bad Worker deploy. Data damage is `restore.md`, not this file.

## Decide first

| Symptom                         | Action                                  |
| ------------------------------- | --------------------------------------- |
| New code is wrong, data is fine | Roll the Worker back (below)            |
| New code wrote bad rows         | Roll back the Worker, then `restore.md` |
| A migration is wrong            | **Do not** roll it back; fix forward    |

## Worker rollback

Workers keep previous versions; assets roll back with them.

```bash
wrangler deployments list
wrangler rollback <deployment-id> --message "Rollback: <reason>"
```

`wrangler rollback` without an id returns to the previous deployment. It is
immediate and does not require a rebuild.

Verify after the rollback:

```bash
curl -fsS https://<origin>/api/health
```

Then sign in, open one report, and open one attachment. A rollback that leaves
the UI cached in a browser is easy to mistake for a failed rollback; hard-reload
before debugging further.

## Migrations

Migrations are forward-only (spec §12). D1 has no down-migration path in this
repo, and deleting a migration file after it was applied causes drift that the
CI check will reject.

- Additive change (new column, new table): roll the Worker back, leave the
  migration in place. Old code ignores the new shape.
- Destructive intent: use expand/contract across two releases — add the new
  column/table, ship code that writes both, backfill, then remove in a later
  release. Never drop a column in the same release that stops using it.
- Wrong backfill: write a corrective forward migration. Correct data through
  D1 Time Travel only if the damage is larger than a targeted fix.

## Desktop

An installed desktop build cannot be rolled back remotely. Publish a new signed
installer; users update through the Tauri updater once it is armed
(`deploy.md`). Until then, users reinstall manually.

## Record

Add the rollback reason, deployment id, and the report ids checked to the
incident entry. `audit_events` already records the actions themselves, but not
why an operator intervened.
