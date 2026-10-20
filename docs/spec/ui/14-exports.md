# Phase 14 — Monitoring exports

**Milestone:** M6
**Routes:** `/exports` (Repository → Exports)
**Depends on:** 00 (tokens/forms/empty/error), 05 (table conventions), 08
(approved report states and dates)
**Source:** `par-ui-ux-spec.md` §7.12, §8.3, §8.8; project spec §11 (three
monitoring sheets, 18 columns in order)

The office maintains three Excel sheets by hand. This screen replaces that with a
form and a live preview that shows exactly what will be downloaded.

---

## 1. Context for this run

- Roles: REVIEWER, APPROVER, ADMIN. Others get permission denied naming the
  required roles.
- One primary action: **Download .xlsx** (navy). **Export these results** on the
  Repository page feeds this screen; there is no second filled button here.
- The preview must use the **actual export column order**, not a UI-only subset.
  The column contract lives in `packages/export`; never hardcode 18 columns in the
  component.
- Missing values are warnings, never blockers. The download still works.
- Dates use `14 Mar 2026` in the preview, and the workbook uses real date cells
  where the export contract says so. Never export display strings as dates.
- The screen is print-irrelevant; do not add print styles.

---

## 2. Layout

```
┌──────────────────────────────────────────────────────────────────────────────┐
│  Monitoring sheet export                                                     │
│  Sheet  (•) Off-campus  ( ) Educational tour  ( ) In-campus                   │
│  Semester  [ 2nd Semester ▾ ]   School year  [ 2025–2026 ▾ ]                  │
│  Include in-progress reports  [ ]      [ Download .xlsx ]                     │
├──────────────────────────────────────────────────────────────────────────────┤
│  PREVIEW · 46 approved reports · 2 with missing values                       │
│  ⚠ OFF-2026-0042 has no Date Completed — it will export blank                 │
│  ┌──────────────────────────────────────────────────────────────────────┐    │
│  │ No. Date received Tracking Classification Campus … Date completed    │    │
│  │ 1   14 Mar 2026   OFF-2026-0014 Curricular Main  … 20 Mar 2026       │    │
│  └──────────────────────────────────────────────────────────────────────┘    │
│  Horizontal scroll; first column and header are sticky.                       │
└──────────────────────────────────────────────────────────────────────────────┘
```

- Page header "Monitoring sheet export"; no subtitle beyond a one-line
  explanation: "Downloads one workbook matching the office's monitoring sheet."
- Form card, then preview card. Both use `--surface-card`.
- Form controls in one row at ≥1280 px, wrapping below:

| Control                     | Behavior                                                                                                                                 |
| --------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------- |
| Sheet                       | Radio: Off-campus / Educational tour / In-campus. Default Off-campus. Determines which sheet carries the rows; the other two ship blank. |
| Semester                    | Select from `ref_terms`; default the current term.                                                                                       |
| School year                 | Select from `ref_terms`; default the current school year.                                                                                |
| Include in-progress reports | Checkbox; off by default. Adds `SUBMITTED` and `ENDORSED` rows with Date Completed blank.                                                |
| Download .xlsx              | Navy primary. Disabled until a preview has loaded and there is at least one row.                                                         |

- Changing any control refreshes the preview; debounce 300 ms and keep the
  previous preview visible with a subtle "Updating preview…" line.
- The term and school-year pair must be valid; an invalid combination shows an
  inline error and disables download.

---

## 3. Preview

- Header line: "PREVIEW · 46 approved reports · 2 with missing values". Counts are
  explicit and scoped to the selected sheet/term.
- When in-progress is on, the line says "PREVIEW · 52 reports (46 approved, 6
  in progress) · 2 with missing values".
- Missing-value warnings list each affected report by tracking number with the
  missing field named: "OFF-2026-0042 has no Date Completed — it will export
  blank."
  - Warnings are text with an icon, not color-only.
  - More than 5 warnings: show the first 5 and a "Show all (n)" toggle.
  - Warnings never disable Download.
- Table:
  - Actual export column order, including the leading **No.** column.
  - Header row and first column sticky; horizontal scroll for the remaining
    columns.
  - Values formatted for reading; long text clamps with a title/tooltip.
  - Empty cells render blank as they will in the workbook, with the warning
    above explaining why.
- Preview cap: 50 rows. When more, the header reads "Previewing 50 of 212" and
  the download still includes every row.
- The preview data comes from the same server contract the download uses; it is
  not recomputed client-side from search results.

---

## 4. Download

- **Download .xlsx** requests the workbook for the exact current selection
  (sheet type, term, include-in-progress).
- The workbook is the office's full sheet set in source order — OFF-CAMPUS,
  EDUCATIONAL TOUR, IN-CAMPUS. The selected sheet carries the rows; the other
  two are the office's blank sheets for the same term, so the file filed is the
  file the office keeps.
- Button shows "Preparing…" and is disabled while the request runs; the label
  then returns.
- If **Include in-progress reports** is checked, the first download after
  checking opens a confirmation that states the consequence explicitly:
  "The workbook will include 6 reports that are not yet approved. Date Completed
  will be blank for those rows." Buttons: Cancel / Download .xlsx. Do not rely
  on the checkbox label alone.
- On success: toast "Monitoring sheet downloaded" with the filename. Trigger the
  browser download from a short-lived signed URL or a streamed response; never
  expose an object key.
- On failure: inline alert with request id and Retry; keep the selection.
- Empty result: "No approved reports for 2nd Semester, SY 2025–2026" plus a link
  to Repository (`/search`) with the same type, term, and status filters
  pre-filled. Download is disabled.
- If the workbook is large, keep the preparing state and allow cancel; do not
  freeze the page.

---

## 5. Empty and edge states

- No preview yet (initial load): skeleton table rows and a disabled Download.
- Preview error: `ErrorState` inside the preview card with Retry; form stays.
- Empty term: the copy above, with the Repository link.
- Missing term data: inline message "No terms are configured. Add a term in
  Reference data." with a link for admins; others see "Ask an administrator to
  configure terms."
- Include-in-progress with zero extra rows: the confirmation is skipped and the
  header reflects the approved-only count.
- Permission denied: page-level state naming Reviewer/Approver/Admin.
- A signed-URL failure after a successful request: alert with Retry; do not
  produce a partial file.

---

## 6. Acceptance checklist

- [ ] Only REVIEWER/APPROVER/ADMIN can open exports; others see permission
      denied.
- [ ] Sheet radio sets type and defaults to Off-campus; term/SY default to the
      current term; invalid combinations disable download.
- [ ] Changing any control refreshes the preview without losing the previous one
      while loading.
- [ ] Preview header shows approved count, missing-value count, and the
      in-progress breakdown when enabled.
- [ ] Missing-value warnings name the tracking number and field, list up to 5
      with Show all, never block download, and are not color-only.
- [ ] Preview uses the export contract's real column order (including No.), with
      sticky header and first column and horizontal scroll.
- [ ] Preview caps at 50 rows and shows "Previewing 50 of N".
- [ ] Download includes every row, shows Preparing…, and toasts the filename.
- [ ] Include in-progress adds SUBMITTED/ENDORSED rows with blank Date Completed
      and shows the explicit confirmation copy on download.
- [ ] Empty result copy names the term/SY and links to `/search` with prefilled
      filters; download is disabled.
- [ ] Failure states keep the selection and offer Retry; no object keys leak.
- [ ] Loading, preview error, no-terms, denied, and signed-URL-failure states are
      implemented.
- [ ] `pnpm lint`, `pnpm typecheck`, and `pnpm build` results reported.

## 7. Out of scope

- Generating the workbook, column definitions, and sheet formatting
  (`packages/export`).
- Scheduling or emailing exports.
- Custom column selection, CSV output, and multi-term exports.
- Export history/audit UI beyond what the global audit log records.

## 8. Open questions

1. Is the sheet selection locked to the current term at download time, or can an
   admin export any historical term? This spec allows any configured term.
2. Should "Include in-progress" also include `RETURNED_BY_*` rows? The source says
   only SUBMITTED/ENDORSED; this spec follows it.
3. Confirm the workbook's date format and whether Date Completed is a date cell or
   text; the UI preview is display-only.
4. Should the Repository's "Export these results" prefill more than type/term
   (e.g. college)? The export contract only accepts type/term in v1.
