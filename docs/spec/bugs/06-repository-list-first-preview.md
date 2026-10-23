# Bug phase 06 — The repository opens as one list and splits only when a report is chosen

**Severity:** medium (half the page is an empty panel on every visit)
**Surface:** `/search` (the repository). The old `/review` and `/approval` queue
pages are retired by
[`../personnel-narrative-flow-spec.md`](../personnel-narrative-flow-spec.md); the
admin's single list inherits this behaviour when it gets a preview.
**Reported:** 2026-10-22
**Depends on:** none
**Touches:** `apps/web/src/lib/features/search/presentation/SearchPage.svelte`,
`apps/web/src/lib/features/search/presentation/SearchPreview.svelte`,
`apps/web/src/lib/features/search/application/repository-state.svelte.ts`,
`apps/web/src/lib/features/search/presentation/repository-viewport.ts` (retired),
`apps/web/src/lib/features/search/presentation/SearchResults.svelte`

---

## 1. What the office sees

The repository opens as two sections side by side: the results list on the left
and, on the right, an empty panel that says nothing useful until a row is clicked.
At narrower desktop widths the panel disappears and a click leaves the page
entirely, so the same click does two different things depending on window size.
The office reads a list of eight reports in a column that is narrower than the
screen for no reason.

## 2. Verified current behaviour

- `SearchPage.svelte` always renders both columns:

  ```svelte
  <div class="results-layout">
    <div class="results-list">…</div>
    <div class="preview-column"><SearchPreview … /></div>
  </div>
  ```

  and the CSS sets `grid-template-columns: minmax(0, 1.15fr) minmax(360px, 1fr)`
  from `@media (min-width: 1440px)`, hiding `.preview-column` below that width.

- `openRow(row)` chooses behaviour by viewport, not by intent:
  `paneAvailable()` (a `matchMedia('(min-width: 1440px)')` check in
  `repository-viewport.ts`) decides between `repository.select(row.id)` and
  `goto(row.href)`.
- `SearchPreview.svelte` therefore renders its own empty pane ("select a report")
  on every load at wide widths.
- The selection lives only in `RepositoryState.selectedId`; a reload or a shared
  link loses it.

## 3. Behaviour contract

1. **One section by default.** Without a selection, the results list uses the
   full content width at every desktop width. There is no empty preview column and
   no placeholder pane.
2. **A click opens the preview next to the list.** Selecting a row switches the
   layout to two sections — list on the left, preview on the right — with the
   selected row marked (`aria-selected="true"`, a 2 px navy leading edge, label at
   medium weight). The list keeps its filters, sort, page, and scroll position.
3. **The split view can be closed three ways**: the preview's close control, the
   Escape key, and the browser's Back button. All three return to the full-width
   list and clear the selection; focus goes back to the row that was open, or to
   the results heading if that row is no longer rendered.
4. **Selection is URL state.** Opening a row adds `?report=<id>` to the current
   query with `pushState`, so Back closes the pane and a reload or a shared link
   opens the same report. An id that is not in the current result set or that the
   account may not read shows the existing "not found" state with **Back to
   results**, never an error page.
5. **One click, one meaning, at every width.** Row activation always selects first:
   - ≥ 1024 px: the split appears as described;
   - < 1024 px: the foundation notice applies to the whole app and this page needs
     no split layout; a row activation navigates to `/reports/[id]` as today.
     The old 1440 px breakpoint disappears, as does `paneAvailable()`.
6. **Keyboard parity.** Arrow keys move the row focus within the results table as
   today; Enter or Space opens the preview; Escape closes it. `Alt+ArrowRight`
   moves focus into the preview once it is open. The close control is a real button
   with an accessible name ("Close preview").
7. **Motion is a layout change, not an entrance.** The column change uses the app's
   `--duration-base` and `--ease-standard`, is suppressed under
   `prefers-reduced-motion: reduce`, never animates the row height, and never
   scrolls the page.
8. **Nothing else on the page changes**: filters, chips, sorting, pagination,
   export link, empty and error states stay exactly as they are.

## 4. Implementation notes

- `SearchPage.svelte`: derive `open = repository.selectedId !== null`; add a class
  to `.results-layout` and switch the grid template from one column to
  `minmax(0, 1fr) minmax(380px, 0.9fr)`; delete the `1440px` query and the
  `.preview-column` display rule.
- `openRow` becomes `open = paneWide() ? repository.select(id) : goto(row.href)`,
  where `paneWide()` is a single 1024 px media query helper. Rename
  `repository-viewport.ts` accordingly or fold the helper into `SearchPage`.
- URL sync: in `openRow`, `goto(repositoryHref(filters, id), { replaceState: false })`;
  in `close()`, `goto(repositoryHref(filters), { replaceState: true })` and clear
  `repository.selectedId`. Read `?report=` on mount and on navigation into the page,
  and call `repository.select(id)` once the first page of results has loaded.
- `repositoryHref(filters)` already serialises filters; add an optional `report`
  argument so the two cannot drift.
- Add a `close` button and its handler to `SearchPreview.svelte`'s header, plus a
  `label` for the preview region (`aria-labelledby` on the document title inside).
- Focus management: on open, focus the preview's `h2` (`tabindex="-1"`); on close,
  focus `document.getElementById(\`report-row-${id}\`)` when present.
- Keep `selectedRow` derived from `rows`, so pagination or a filter change that
  drops the open row closes the pane and clears the parameter (state already
  clears `selectedId` when the item disappears).
- Tests: a component/state test that opening sets the parameter and closing clears
  it; a test that a stale `?report=` id yields the not-found pane rather than an
  exception; keep `SearchResults.test.ts` green.

## 5. Acceptance checklist

- [ ] Load `/search`: one full-width list, no empty preview panel, at 1280, 1440,
      and 1920 px.
- [ ] Click a row: the layout splits, the row is marked selected, the preview shows
      that report, and the result list keeps its scroll position.
- [ ] Click the preview's close control: the list returns to full width, the
      selection is gone, and focus is on the row that was open.
- [ ] Press Escape with the pane open: same result as the close control.
- [ ] Press the browser Back button after opening: the pane closes. Forward
      reopens it.
- [ ] Reload with `?report=<id>` in the URL: the pane opens on that report, with
      the filters preserved.
- [ ] Open a report, then change a filter that excludes it: the pane closes, the
      parameter is gone, and nothing errors.
- [ ] Open a URL with a report id the account cannot read: the not-found state with
      **Back to results** appears.
- [ ] Enter and Space on a focused row open the pane; the close button is reachable
      by Tab and named for a screen reader.
- [ ] With `prefers-reduced-motion: reduce`, the split appears without animation.
- [ ] At 1024 px wide the split still works; below 1024 px the notice applies and a
      row activation navigates to the report page.
- [ ] Filters, chips, sort, pagination, and "Export these results" behave exactly as
      before.
- [ ] `pnpm --filter @par/web exec vitest run src/lib/features/search` and
      `pnpm verify` pass.

## 6. Out of scope

- A general master–detail pattern for other lists (reports table, admin lists).
- Remembering the last opened report across sessions.
- Changing the preview's content, tabs, or actions.
- Reintroducing `/review` or `/approval`.
