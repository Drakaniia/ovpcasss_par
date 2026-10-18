# Phase 05 — My reports table

**Milestone:** M3
**Routes:** `/reports` with `?tab=all|drafts|returned|approved`
**Depends on:** 00-foundation (`StatusBadge`, `ReportTable` conventions, empty/
error/skeleton, confirm dialog)
**Source:** `par-ui-ux-spec.md` §7.4, §8.3, §8.6, §8.8, §12

This is the user's status board for their own reports — not a triage queue. It
also builds `ReportTable`, the sortable table primitive that phases 09, 10, and
14 reuse.

---

## 1. Context for this run

- Roles: all signed-in users. SUBMITTER sees their own reports and can edit
  drafts/returned. REVIEWER/APPROVER/ADMIN see the same table as a read-only
  trail of reports they touched; edit/delete actions are absent, not disabled.
- One primary action: **+ New report** for SUBMITTER. For other roles the header
  has no filled button.
- Status language comes from foundation §2.2; never invent a status or show
  "In progress".
- Filters, tab, sort, and pagination are URL state so views are shareable and
  survive refresh.
- Table conventions from foundation §4.1 apply: sticky header, 40 px rows,
  monospace tracking numbers/dates, row click opens, ⋯ stops propagation, no
  checkbox column.
- Drafts never show a tracking number; render an em dash, whether the draft is
  server-side or exists only on this device.

---

## 2. Page header and tabs

- Title "My reports"; subtitle is role-aware: "Reports you submitted" for
  SUBMITTER, "Reports you have handled" for REVIEWER/APPROVER, "All reports" for
  ADMIN. Keep it to one line.
- Primary action **+ New report** (SUBMITTER only) goes to `/reports/new`.
- Tabs: **All · Drafts · Returned · Approved**, default All, rendered by the
  shell's `SectionTabs` row. Do not add a second tab row inside the page. Tab
  state is `?tab=` and must agree with the active shell tab. Counts may appear as
  text next to labels when the API supplies them; no count-only tabs.

---

## 3. Filter bar

- Controls: Type (All, Off-campus, Educational tour, In-campus), Campus, Term,
  Activity date range (from/to), Search (title or tracking number).
- Filters are URL state, e.g.
  `/reports?tab=all&type=OFF_CAMPUS&term=2nd-2025-26&q=cleanup`.
- Active filters render as removable chips below the bar with a **Clear all**
  action.
- Search is debounced and matches tracking number exactly and title
  case-insensitively. It does not search narrative or PIC names in this table.
- Filters apply within the active tab; changing tabs keeps the filters.
- Filter values come from reference data; if a saved URL references a
  deactivated value, show it as an inactive chip rather than silently dropping it.
- Below 1280 px the filter bar collapses to Search + **Filters (n)** opening a
  panel with the same controls.

---

## 4. Table

| Column        | Notes                                                                 |
| ------------- | --------------------------------------------------------------------- |
| Tracking no.  | Monospace; `—` for drafts (device-only drafts are plain `DRAFT` rows) |
| Title         | Two-line clamp, 320 px max; row link                                  |
| Type          | Off-campus / Educational tour / In-campus                             |
| Status        | `StatusBadge` (§ foundation 2.2)                                      |
| Activity date | `12 Mar 2026` or a range `12–13 Mar 2026`                             |
| Updated       | Relative ("2 days ago") with exact timestamp in the `title` attribute |
| ⋯             | Open, Edit (draft/returned), Delete draft (confirm)                   |

- Default sort: **Updated descending**.
- Header click sorts tracking number, activity date, and status. Sort direction
  toggles; the active header shows ▲/▼; unsorted headers stay quiet. Status sorts
  by workflow order (Draft → Submitted → Resubmitted → Returned → Endorsed →
  Approved), not alphabetically.
- Row click opens `/reports/[id]`. **Drafts open `/reports/[id]/edit` directly**
  (the facsimile of a draft is not useful).
- Returned rows open the facsimile; Edit is in the row menu and in the facsimile.
- Row menu:
  - **Open** — detail or edit for drafts.
  - **Edit** — only DRAFT and returned statuses, and only for the owning
    SUBMITTER.
  - **Delete draft** — only DRAFT; opens `ConfirmDialog` naming the draft
    ("Delete draft "Marine survey"?"). The consequence line says the draft and its
    local copy are removed. No undo.
- Menu actions never navigate by bubbling; clicking ⋯ does not open the row.
- Table scrolls within the content region with a sticky header.
- Column priority below 1280 px: hide Type and College (if present) before Title
  or Status. This table has no College column; hide Type first, then Activity
  date, never Tracking no., Title, Status, or ⋯.
- No bulk selection or checkbox column in v1.

### Device-only drafts

- A draft that exists only on this device appears **first**, regardless of sort,
  as an ordinary `DRAFT` row: `—` for the tracking number, no chip, no colour
  treatment.
- Row click opens the edit page. Delete removes the local copy, the same as any
  other draft.

---

## 5. Pagination

- 25 per page by default; page size selector 25/50/100.
- Footer: "Showing 1–25 of 84", previous/next, and numbered pages with ellipsis.
- Page and page size are URL state (`?page=2&size=50`).
- Changing a filter or tab resets to page 1.
- An empty page after deletion or filtering falls back to the previous valid page
  rather than showing an empty table.

---

## 6. Empty states

Each tab states what will appear there and names the next action:

| Tab                | Copy                                                                   | Action                                                  |
| ------------------ | ---------------------------------------------------------------------- | ------------------------------------------------------- |
| All                | "No reports yet. Create a report to start the process."                | + New report (SUBMITTER); no action for read-only roles |
| Drafts             | "No drafts. Drafts you start are saved here until you submit them."    | + New report (SUBMITTER)                                |
| Returned           | "Nothing returned. Reports sent back to you for revision appear here." | None                                                    |
| Approved           | "No approved reports yet. Completed reports appear here."              | None                                                    |
| Filtered (any tab) | "No reports match these filters."                                      | Clear filters                                           |

- Empty states live inside the table region, keeping the header, tabs, and
  filters visible.
- Loading: 8 skeleton rows matching column widths. No spinner on the table.
- Error: table-region `ErrorState` with request id and Retry; header/tabs stay.

---

## 7. Acceptance checklist

- [ ] Tabs are All/Drafts/Returned/Approved with All default and `?tab=` state.
- [ ] Submitter sees one filled primary (+ New report); other roles see none.
- [ ] Filters (type, campus, term, activity date range, search) are URL state,
      render removable chips, and survive refresh; changing tabs keeps them.
- [ ] Default sort is Updated descending; tracking number, activity date, and
      status sort correctly; status uses workflow order.
- [ ] Columns match the table; drafts show `—` for tracking number; dates are
      monospace; updated shows relative time with an exact `title`.
- [ ] Row click opens the facsimile, except drafts which open the edit page.
- [ ] Row menu offers Open/Edit/Delete only where allowed; Delete confirms by
      naming the draft; ⋯ does not trigger row navigation.
- [ ] Read-only roles see no Edit/Delete actions at all.
- [ ] Pagination defaults to 25 with 25/50/100, is URL state, and resets on filter
      change; deleted last row falls back a page.
- [ ] Per-tab empty states match the copy table and show the right action.
- [ ] Below 1280 px column priority is Type → Activity date, never Title/Status/⋯.
- [ ] A device-only draft appears first as a plain `DRAFT` row with `—` and no
      queue chip.
- [ ] Loading, error, and filtered-empty states are implemented.
- [ ] `pnpm lint`, `pnpm typecheck`, and `pnpm build` results reported.

## 8. Out of scope

- The wizard (phase 06) and edit page (phase 07).
- Queue tables (phase 09), repository (phase 10), exports preview (phase 14).
- Bulk actions and column customization.

## 9. Open questions

1. Should the Returned tab be visible to non-submitters as read-only (as §5.1
   says) or hidden? This spec keeps it visible but read-only.
2. Confirm whether delete-draft is available for drafts already saved server-side
   as well as local-only drafts. The source treats both as drafts.
3. Should filter chips show deactivated reference values, or resolve them to
   "Inactive"? Assumed show as inactive, not drop.
