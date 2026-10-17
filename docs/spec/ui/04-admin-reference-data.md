# Phase 04 — Admin: reference data

**Milestone:** M2
**Routes:** `/admin/reference-data` (Admin → Reference data)
**Depends on:** 00-foundation (table/form primitives, drawer, confirm, toast),
03 (admin shell and drawer patterns)
**Source:** `par-ui-ux-spec.md` §7.16, §8.3–§8.4, §8.8; project spec §7 data
model (`ref_campuses`, `ref_units`, `ref_programs`, `ref_departments`,
`ref_offices`, `ref_sdgs`, `ref_terms`, `ref_attachment_requirements`)

These are the runtime dropdowns the PAR form depends on. Admins maintain them;
nothing is hardcoded once this phase ships.

---

## 1. Context for this run

- Role: ADMIN only; others see permission denied naming the required role.
- One primary action per active tab: **Add entry**. Row actions are ghost/outline.
  The drawer confirms with **Save entry** (navy) and **Deactivate** (maroon,
  destructive path).
- Tables follow foundation §4.1; forms follow §4.2.
- Deactivate is a soft delete. There is **no hard delete** in the UI: reports and
  exports reference these rows, so removal would break history.
- Seeded rows carry a **Seeded** chip. Seeded rows can be edited and deactivated,
  never deleted; the chip explains why.
- Ordering uses `sort_order`. Drag handles appear only if the API supports a
  reorder operation; otherwise ordering is a numeric field in the drawer and the
  table sorts by it.
- Duplicate names warn before save (trimmed, case-insensitive). The warning names
  the existing entry; the admin must confirm to proceed.
- A deactivated entry is hidden from new reports but still resolves in existing
  reports, exports, and audit history. The UI never renders a missing label.

---

## 2. Layout

```
┌──────────────────────────────────────────────────────────────────────────────┐
│  Reference data                                                              │
│  Campuses  Units & colleges  Programs  Departments  Offices  SDGs  Terms  …  │  entity tabs
├──────────────────────────────────────────────────────────────────────────────┤
│  Campuses                                                [ + Add entry ]      │
│  ┌──────────────────────────────────────────────────────────────────────┐    │
│  │ CODE   NAME                       ENTRIES   ORDER   STATUS      ⋯     │    │
│  │ MAIN   Main Campus                15        1       Active      [Seeded] │ │
│  │ SAT    Satellite Campuses         0        2       Active      [Seeded] │ │
│  └──────────────────────────────────────────────────────────────────────┘    │
└──────────────────────────────────────────────────────────────────────────────┘
```

- Entity tabs, in this order: **Campuses**, **Units & colleges**, **Programs**,
  **Departments**, **Offices**, **SDGs**, **Terms**, **Attachment
  requirements**. Tabs are URL state (`?entity=units`).
- Section header repeats the entity name and holds **+ Add entry**.
- Table is compact: code (if the entity has one), name/title, the entity-specific
  columns below, order, status, ⋯. Seeded chip sits next to the name.
- Default sort: `sort_order` ascending, then name. Status filter defaults to
  Active with an "Show inactive" toggle; inactive rows are visible but muted and
  labelled, never hidden without a way to find them.
- Row click opens the drawer; ⋯ offers Edit and Deactivate (Activate for inactive
  rows). ⋯ stops propagation.
- Below 1280 px hide Order and Status columns after the entity-specific columns
  have collapsed to a single line.

### Entity-specific columns and fields

| Tab                     | Table columns                             | Drawer fields                                                                                                       |
| ----------------------- | ----------------------------------------- | ------------------------------------------------------------------------------------------------------------------- |
| Campuses                | Code, Name, Units count (if supplied)     | Code, Name, Sort order, Active                                                                                      |
| Units & colleges        | Code, Name, Kind, Campus                  | Code, Name, Kind (`College`, `Graduate school group`, `Satellite campus`, `Other unit`), Campus, Sort order, Active |
| Programs                | Code, Name, Level, Unit                   | Code, Name, Level (`Undergraduate`, `Graduate`, `Doctorate`, `Law`), Unit, Sort order, Active                       |
| Departments             | Name, Usage count (if supplied)           | Name, Sort order, Active                                                                                            |
| Offices                 | Name, Usage count (if supplied)           | Name, Sort order, Active                                                                                            |
| SDGs                    | No., Title                                | Number (1–17, unique), Title, Active                                                                                |
| Terms                   | School year, Semester, Start, End         | School year, Semester (`1st`, `2nd`, `Summer`), Start date, End date, Active                                        |
| Attachment requirements | Activity type, Label, Min count, Required | Activity type (Off-campus / Educational tour / In-campus), Label, Minimum count (0–9), Required toggle, Active      |

- Code fields are uppercase, trimmed, unique per entity; helper text shows the
  format. Name fields trim whitespace (the seed data has trailing spaces; do not
  reintroduce them).
- Terms: only one term may be current at a time if the API enforces it; the UI
  shows which term is current and blocks deactivating it with an adjacent
  reason ("This term is used by open reports" or "Set another term current
  first").
- SDG numbers 1–17 cannot be changed after creation; only the title and active
  flag are editable. Creation offers only unused numbers.
- Attachment requirement label is the label authors pick in the uploader; the
  required toggle and min count drive the completeness checklist. Changing a
  requirement affects new submissions only; show a note in the drawer.

---

## 3. Entry drawer

480 px right-side drawer; Escape closes and restores focus. Contents:

1. Title: "Add campus" / "Edit campus" (or "Add entry" when generic).
2. Entity fields in a single column, labels above.
3. Order field with helper text "Lower numbers appear first."
4. Active toggle, default on. For a seeded row, a **Seeded** chip and a line:
   "Seeded from the source workbook. Deactivate rather than delete."
5. Footer: **Save entry** (navy) and **Deactivate** (maroon text/outline, only for
   active rows). Cancel is a ghost action.

Behavior:

- Validate on blur/submit; errors inline under the field and in a summary at the
  top of the drawer.
- Duplicate check runs before save and shows a confirmation naming the existing
  entry: "A campus named "Main" already exists. Save anyway?" Only names, codes,
  and SDG numbers are checked; do not invent uniqueness rules.
- Deactivate requires `ConfirmDialog` naming the entry and the consequence:
  "Deactivated entries stay in existing reports but no longer appear in new
  forms." No type-to-confirm in v1.
- Success closes the drawer, toasts ("Campus saved", "Entry deactivated"), and
  refreshes the table in place.
- Failure keeps the drawer open with the server message and request id.
- Concurrent edit (the row changed since the drawer opened): show the server
  values and ask the admin to review; never overwrite silently.

---

## 4. States

- Loading: 8 skeleton rows; tabs remain interactive.
- Empty entity: "No entries yet." + **Add entry**, with one line explaining where
  the entity is used.
- Empty filtered: "No entries match this filter." + **Clear filters**.
- Error: inline `ErrorState` in the tab body; the tabs and header stay usable.
- Permission denied: full-page state naming the Admin role, no Retry.
- Deactivating an entry used by open reports: block with an adjacent reason and a
  link to the reports filter, or warn with the count. Do not silently deactivate.

---

## 5. Acceptance checklist

- [ ] Only ADMIN can open the page; others see permission denied.
- [ ] All eight entity tabs exist in the specified order and are URL state.
- [ ] Each tab shows the specified columns and drawer fields.
- [ ] Seeded rows show the Seeded chip and cannot be hard-deleted.
- [ ] Deactivate is the only removal action, and it confirms with consequence
      text; deactivated rows are visible via the inactive toggle and still resolve
      in existing reports.
- [ ] Sort order is editable; drag handles appear only if the API supports
      reorder.
- [ ] Duplicate names/codes/SDG numbers warn before save and name the existing
      entry.
- [ ] Codes are uppercase/trimmed; seeded trailing whitespace is not
      reintroduced.
- [ ] SDG numbers are unique 1–17 and immutable after creation.
- [ ] Terms expose the current term and block deactivating a term in use with an
      adjacent reason.
- [ ] Attachment requirements expose activity type, label, minimum count, and
      required, with the "new submissions only" note.
- [ ] Loading, empty, filtered-empty, error, denied, and concurrent-edit states are
      implemented.
- [ ] `pnpm lint`, `pnpm typecheck`, and `pnpm build` results reported.

## 6. Out of scope

- Seeding the database (backend/migration work).
- User administration (phase 03).
- Bulk import/export of reference data.
- Hard deletion and merge/dedupe tooling.

## 7. Open questions

1. Department and Office input is assumed to be admin-seeded with an "Other
   (specify)" free-text option in the form (project spec §14 Q5). Confirm before
   this phase ships.
2. Where do Programs appear in the PAR form? Project spec §14 Q4 leaves this
   open; the reference tab exists either way.
3. Can an inactive entry be reactivated? Assumed yes via the inactive filter and
   row action.
