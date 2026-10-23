# Bug phase 07 — "No terms are configured" opens the Terms tab

**Severity:** low (one click lands on the wrong tab, then a second click to fix it)
**Surface:** `/exports` empty state when no school year/semester exists; any other
link that sends the office to a specific reference-data tab
**Reported:** 2026-10-22
**Depends on:** none
**Touches:** `apps/web/src/lib/features/exports/presentation/ExportPage.svelte`,
`apps/web/src/lib/features/admin/application/reference-data.ts`,
`apps/web/src/lib/features/admin/application/reference-data.test.ts`,
any other empty state that links to `/admin/reference-data`

---

## 1. What the office sees

On a fresh install the Monitoring sheet export page says "No terms are
configured" and offers **Open reference data**. Clicking it opens Reference data on
**Campuses** — the first tab — so the administrator has to find Terms in a row of
ten tabs. The message is about terms; the destination is about campuses.

## 2. Verified current behaviour

- `ExportPage.svelte` renders the empty state with a hard-coded destination:

  ```svelte
  action={state.userRole === 'ADMIN'
    ? { label: 'Open reference data', href: '/admin/reference-data' }
    : undefined}
  ```

- `ReferenceDataPage.svelte` reads the active entity from the URL and
  `reference-data.ts#entityFromParams` falls back to `'campuses'` when `entity` is
  missing. `paramsForView(entity, …)` omits `entity` for campuses because it is the
  default, so the bare path can only ever mean Campuses.
- Nothing in the app links to a specific reference-data tab; every entry point uses
  the bare path.

## 3. Behaviour contract

1. **The destination matches the message.** An empty state that exists because the
   office has no school year or semester links to
   `/admin/reference-data?entity=terms`, and the page opens with the **Terms** tab
   active and the tab underlined.
2. **One helper, no hard-coded URLs.** A single exported function builds the href
   (`referenceDataHref('terms')` ⇒ `/admin/reference-data?entity=terms`, and
   `referenceDataHref('campuses')` ⇒ `/admin/reference-data`), so no surface can
   forget the parameter. Every existing link that means "go to reference data"
   keeps its current destination.
3. **Only the term cause points at Terms.** Empty states with a different cause
   keep their own destinations:
   - no approved reports in the term ⇒ the message that points at the repository
     (`/search`) stays;
   - a failed preview ⇒ **Back to repository** stays;
   - a permission error ⇒ **Back to inbox** stays.
4. **Non-admins get no link.** The copy "Ask an administrator to add a school year
   and semester in Reference data before exporting a monitoring sheet." stays, and
   no action is rendered — unchanged from today.
5. **The link is a real link.** It remains an anchor (middle-click, open in a new
   tab, and keyboard Enter work), and it carries no other state.
6. **Reload keeps the tab.** Landing on the parameter sets the tab; reloading keeps
   it; switching tabs afterwards rewrites the parameter as it does now.

## 4. Implementation notes

- Add to `reference-data.ts`:

  ```ts
  export function referenceDataHref(entity: ReferenceEntityKey): string {
    const params = paramsForView(entity, false);
    return `/admin/reference-data${params ? `?${params}` : ''}`;
  }
  ```

  and use it in `ReferenceDataTabs.svelte` and `paramsForView` call sites so there
  is one builder, not two.

- `ExportPage.svelte`: replace the literal with
  `href: referenceDataHref('terms')`. Nothing else in the empty state changes.
- Grep for `'/admin/reference-data'` across `apps/web/src` and route each hit
  through the helper; where the intent is genuinely "somewhere in reference data",
  keep `referenceDataHref('campuses')`.
- Test in `reference-data.test.ts`: `referenceDataHref('terms')` and
  `referenceDataHref('campuses')` produce the expected strings; `entityFromParams`
  round-trips both. A `ReferenceDataPage` test already exists — extend it with the
  `?entity=terms` case.

## 5. Acceptance checklist

- [ ] As an admin with no terms, open `/exports`: the button reads **Open reference
      data** and navigates to `/admin/reference-data?entity=terms`.
- [ ] The Terms tab is active and underlined on arrival, and the URL shows
      `entity=terms`.
- [ ] Reloading that URL keeps Terms active.
- [ ] Switching to Campuses afterwards produces `/admin/reference-data` (no stale
      parameter).
- [ ] As a non-admin, the same page shows the "Ask an administrator…" copy and no
      action.
- [ ] The empty-preview state still points at the repository, and the preview error
      still offers **Back to repository**.
- [ ] No other reference-data link changed destination.
- [ ] `pnpm --filter @par/web exec vitest run src/lib/features/admin` and
      `pnpm verify` pass.

## 6. Out of scope

- Seeding school years, semesters, or any other reference list.
- Changing which tab reference data opens on by default.
- Adding terms management from the export page.
