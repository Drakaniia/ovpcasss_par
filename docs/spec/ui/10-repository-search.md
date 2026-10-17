# Phase 10 — Repository search

**Milestone:** M5
**Routes:** `/search` (Repository → Search)
**Depends on:** 00 (tokens/table/empty/error/skeleton), 05 (table conventions),
08 (facsimile summary), 09 (`MasterDetailLayout`)
**Source:** `par-ui-ux-spec.md` §7.11, §8.3, §8.8, §12

The repository is for retrieval, not for browsing everything. It defaults to
approved reports, searches the full record, and can hand its exact scope to the
exports screen.

---

## 1. Context for this run

- Roles: REVIEWER, APPROVER, ADMIN. A Submitter or anonymous user gets permission
  denied with the required role; do not show an empty search.
- Default result set: **all APPROVED reports**, newest `date_received` first.
  Status is a filter, so other statuses can be retrieved when the role may see
  them.
- One primary action: **Open report** (row/pane) — there is no filled primary
  button on the page itself. "Export these results" is an outline action.
- Filters and query are URL state, e.g.
  `/search?q=cleanup&type=OFF_CAMPUS&status=APPROVED&page=2`.
- Table rules and `MasterDetailLayout` come from earlier phases; do not fork
  them.
- Search never returns reports the role cannot access; counts reflect the
  authorized scope.

---

## 2. Layout

```
┌──────────────────────────────────────────────────────────────────────────────┐
│  Repository    Search   Exports                                               │
│  Repository                                                                  │
│  [ search title, narrative, PIC, location…        ]  [ Filters (3) ]         │
│  [ Type: All ▾ ] [ Term: 2nd Sem 2025–26 ▾ ] [ Status: Approved ▾ ]  Clear   │
├──────────────────────────────────────────────────────────────────────────────┤
│ RECEIVED   TRACKING      TITLE                 TYPE      COLLEGE    STATUS   │
│ 14 Mar 26  OFF-2026-0014 Coastal cleanup       Off-camp  CAS        Approved │
│ 12 Mar 26  EDU-2026-0007 Museum visit          Tour      COED       Approved │
├──────────────────────────────────────────────────────────────────────────────┤
│  Showing 1–25 of 212                                    [ 1 2 3 … 9 ]        │
└──────────────────────────────────────────────────────────────────────────────┘
```

- Page header: "Repository". The section tabs in the shell show Search and
  Exports; `/search` is the active tab.
- Search input spans the content width up to 720 px; placeholder names the
  searchable fields: "search title, narrative, PIC, location…".
- **Filters (n)** button opens the full panel; the count is the number of active
  filters.
- A compact row of the most-used active filters sits under the search input with
  removable chips and **Clear**.
- Results table columns: Received (`14 Mar 26`), Tracking number, Title, Type,
  College, Status. Title is the row link.
- Sort: newest received first by default; Received and Title headers sort.
- Pagination: 25 per page, URL state.

### Filter panel

Collapsible; three columns at ≥1280 px. Fields:

| Field           | Control                                                                             |
| --------------- | ----------------------------------------------------------------------------------- |
| Tracking number | Text, exact-ish match                                                               |
| Title           | Text                                                                                |
| Type            | Select (All / Off-campus / Educational tour / In-campus)                            |
| Classification  | Select from reference data                                                          |
| Campus          | Select                                                                              |
| College/unit    | Select                                                                              |
| Department      | Free text                                                                           |
| Office          | Free text                                                                           |
| Level           | Select (Graduate / Undergraduate)                                                   |
| SDG             | Searchable multi-select (1–17)                                                      |
| Status          | Select (default Approved; includes Draft? no — repository should not expose drafts) |
| Date received   | From / to                                                                           |
| Activity date   | From / to                                                                           |
| PIC name        | Text                                                                                |

- Status options exclude `DRAFT`; drafts are not repository records. Include
  Submitted, Resubmitted, Returned, Endorsed, Approved for roles that may see
  them.
- Apply runs the search; Reset clears all fields except the default status.
- Invalid ranges (from after to) block Apply with inline errors.
- Deactivated reference values in a saved URL render as inactive chips, not
  silently dropped.
- The panel starts collapsed when no filters are active and open when the URL
  carries filters other than status.

---

## 3. Results and preview

- Full-text matches highlight the matched term in the results table (title and
  any visible snippet) using a `<mark>`-style background, never color alone for
  meaning; the snippet has accessible text.
- At ≥1440 px, results and preview share the screen. The pane shows a compact
  facsimile summary, status badge, key metadata, and **Open full report**.
- Below 1440 px, rows navigate to `/reports/[id]`.
- Row click selects in the pane; Enter on a focused row opens the full report.
- Result count is explicit and scoped: "212 reports match". Never show an
  unqualified number.
- Active filters are echoed above the results ("Type: Off-campus · Status:
  Approved · 3 filters") with a Clear action.
- **Export these results** passes the current filters to `/exports` via query
  params. The export screen owns the actual download; do not generate a file
  here.
- An approved report's facsimile and print/acknowledgement actions remain
  available from the full report, not from the pane.

---

## 4. States

- **No filters and no query:** "Search the repository" plus one line explaining
  what is included ("Approved post-activity reports from all campuses and
  terms."). Do not run an empty full-text query; the default approved list still
  shows.
- **No results:** "No reports matched" + **Clear filters** and the three
  most-used filters as suggestions (Type, Term, College). Suggestions must apply
  a filter, not just describe it.
- Loading: 8 skeleton rows; the filter panel stays interactive.
- Error: inline `ErrorState` with request id and Retry; search and filters stay.
- Permission denied: page-level state naming Reviewer/Approver/Admin.
- Report deleted or access revoked between results and open: shared 404 copy.
- Search timeout/large result: keep the last results, show an inline notice with
  Retry and a suggestion to narrow filters. No fake partial counts.

---

## 5. Acceptance checklist

- [ ] Only REVIEWER/APPROVER/ADMIN can open search; others get permission denied.
- [ ] Default scope is APPROVED, newest date received first; drafts are never
      returned.
- [ ] Search placeholder and matching cover title, narrative, PIC, and location.
- [ ] Filter panel contains all fields in the table, three columns at ≥1280 px,
      validates date ranges, and excludes Draft from status.
- [ ] Filters, query, sort, and pagination are URL state; active filters render as
      removable chips with Clear.
- [ ] Deactivated reference values in a URL render as inactive chips.
- [ ] Results columns, row navigation, sort, and 25-per-page pagination match.
- [ ] Matches are highlighted with accessible text, not color-only.
- [ ] At ≥1440 px a preview pane shows the summary, status, and Open full report;
      below 1440 px rows navigate.
- [ ] Counts are explicit ("212 reports match"); active scope is echoed.
- [ ] Export these results hands filters to `/exports` via query params.
- [ ] No-filters, no-results (with suggestions), loading, error, denied, and
      access-revoked states are implemented.
- [ ] `pnpm lint`, `pnpm typecheck`, and `pnpm build` results reported.

## 6. Out of scope

- Generating the export file (phase 14).
- Editing or deciding from search results.
- Saved searches, shareable search links beyond URL state, and export history.
- Full-text search infrastructure (API/FTS5).

## 7. Open questions

1. Should the repository include non-approved statuses for admins by default?
   This spec keeps Approved as the default for every role.
2. Are the "three most-used filters" suggestions computed from usage or fixed?
   Assumed fixed (Type, Term, College) until analytics exist.
3. Does the repository search comments/review history, or only report fields?
   The placeholder lists title, narrative, PIC, location; comments are excluded.
