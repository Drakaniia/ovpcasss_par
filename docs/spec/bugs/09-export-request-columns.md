# Bug phase 09 — The monitoring workbook names its receipt number and shows when the request started

**Severity:** medium (the office cannot reconcile the workbook against the
acknowledgment receipts)
**Surface:** `/exports` preview and the downloaded monitoring workbook, all three
sheets, plus the blank template
**Reported:** 2026-10-22
**Depends on:** none; reads the personnel-narrative flow's `AR No.` reference and
`reports.created_at`
**Touches:** `packages/shared/src/contracts/exports.ts`,
`apps/api/src/features/exports/domain/monitoring-rows.ts` (+ test),
`packages/export/src/monitoring/columns.ts`,
`packages/export/src/monitoring/workbook.ts`,
`packages/export/src/monitoring/ooxml/package.ts`,
`packages/export/src/monitoring/ooxml/sample/layouts.ts`,
`apps/web/src/lib/features/exports/presentation/ExportPreviewTable.svelte`,
`packages/export/src/monitoring/columns.test.ts`,
`packages/export/src/monitoring/workbook.test.ts`

---

## 1. What the office sees

The monitoring sheet has a "Tracking Number" column but nothing calling it the
receipt number, so matching a printed receipt to a workbook row is a mental step.
It also has "Date Received" — the day the narrative arrived — and nothing for the
day the office opened the request, which is the date the office is actually asked
about ("when did we send that one out?").

## 2. Verified current behaviour

- `packages/export/src/monitoring/columns.ts#MONITORING_COLUMNS` lists 18 columns:
  `No.`, `Date Received`, `Tracking Number`, classification, campus, college,
  department, office, level, title, SDG, `Date of the Activity`, location, totals,
  PIC name, PIC contact, `Date Completed`.
- The workbook is generated from raw worksheet templates in
  `packages/export/src/monitoring/ooxml/sample/layouts.ts`: every static row lists
  cells `A1`…`R1`, `spans="1:18"`, per-sheet `<col>` blocks end with a filler
  `<col min="19" max="16384">`, merges are `A1:R1` (and `A3:R3` on the tour sheet),
  and the dimension is written as `A1:R{last}`. Dynamic body rows are built from
  `COLUMN_COUNT = 18` and `BODY_STYLES` arrays of 18 entries.
- Rows come from `toMonitoringRow`
  (`apps/api/src/features/exports/domain/monitoring-rows.ts`); the shared shape is
  `monitoringSheetRowSchema`.
- `isoDate()` in that file slices the first ten characters of a UTC timestamp, so a
  report created or submitted between 00:00 and 07:59 Manila time is dated the
  previous day in the sheet.

## 3. Decisions

| Topic           | Decision                                                                                                                                                                                                                                                   |
| --------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Receipt number  | It is the existing reference (`AR No. 0001`). The column keeps its position and its data; its heading becomes **"Receipt No. / AR No."**. No duplicated number column.                                                                                     |
| New date column | **"Date Requested"** — the day the office registered the request (`reports.created_at`), as a Manila date.                                                                                                                                                 |
| Placement       | Appended as the last column (19). Inserting it beside `Date Received` would require re-indexing every static cell, style, width, merge, and dimension in the templates; appending touches the same files without shifting 16 columns of the office's form. |
| Date Received   | Unchanged in meaning: `submitted_at`, the day the narrative arrived.                                                                                                                                                                                       |
| Date Completed  | Unchanged: the approval date.                                                                                                                                                                                                                              |
| Timezone        | Every date cell in the sheet is a Manila calendar date, existing columns included.                                                                                                                                                                         |

## 4. Behaviour contract

1. **Column order is fixed** and identical in the preview, the downloaded workbook,
   and the blank template: 1 `No.`, 2 `Date Received`, 3 `Receipt No. / AR No.`,
   4–18 as today, 19 `Date Requested`.
2. **`Date Requested` carries the creation date**, rendered as a real date cell
   (same style family as `Date Received`), empty only when the record has no
   creation timestamp (which should not happen).
3. **`Receipt No. / AR No.` carries the same value the app calls the receipt number**
   in lists, detail, search, emails, and the F-013 receipt. No second numbering
   scheme and no prefix changes.
4. **Dates never shift a day.** A record created at 07:00 Manila time exports that
   Manila day, not the UTC day before. This applies to `Date Received`,
   `Date of the Activity`, and `Date Completed` as well, because they share the same
   helper.
5. **The preview agrees with the file.** The preview shows the same 19 headings in
   the same order and formats `Date Requested` like the other date columns.
6. **The worksheet stays a valid facsimile.** Merged title covers the full 19
   columns, the print area and the signature block sit inside the new last column,
   the dimension and `spans` match, and Excel and LibreOffice open the file without
   a repair prompt.
7. **The blank template stays blank.** It gains the same heading and an empty cell
   in every row; no sample values are written.
8. **No new warnings.** `Date Requested` is always present, so it does not join
   `WATCHED_FIELDS` in `monitoringGaps`.

## 5. Implementation notes

- Contract: add `dateRequested: z.string()` to `monitoringSheetRowSchema`; keep
  `referenceNo` as the key (the flow migration renames the old `trackingNumber`;
  do not reintroduce it).
- `monitoring-rows.ts`: add `dateRequested: manilaDate(report.createdAt)` and
  replace the local `isoDate` slice with one `manilaDate(value)` helper
  (`Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Manila' })` yields
  `YYYY-MM-DD`). Use it for all four date fields. Extend the unit test with a
  record created at `2026-10-21T23:30:00Z` (⇒ `2026-10-22`) and one at
  `2026-10-22T15:00:00Z` (⇒ `2026-10-22`).
- `columns.ts`: relabel index 2 to `Receipt No. / AR No.`, append
  `{ key: 'dateRequested', label: 'Date Requested' }`, and update the count test.
- `workbook.ts#bodyCells`: append `dateCell(row.dateRequested)` after
  `dateCell(row.dateCompleted)`.
- `package.ts` / `sample/layouts.ts`: the mechanical 18 → 19 pass —
  - `COLUMN_COUNT = 19`; `columnLetter` must produce `S`;
  - one extra trailing `<c r="S…" s="…"/>` in `titleRow`, `headerRow`, and every
    `blankRows` row, of both sheet variants;
  - `spans="1:18"` → `spans="1:19"`;
  - the filler column becomes `<col min="20" max="16384">`, and one width is added
    (`14`) for column 19 in both sheet layouts;
  - merges `A1:R1` (and `A3:R3`) → `A1:S1` (and `A3:S3`), including the
    `sheet.rows.length > 0 ? ['A1:R1']` branch;
  - the dimension becomes `A1:S{2 + bodyRows}`;
  - `BODY_STYLES` gains a 19th entry (date style, matching `Date Received`);
  - the title row's `selection sqref` follows the merge.
    Keep the office's letterhead, signature text box, and print setup otherwise
    untouched; verify the drawing anchors still land on the same rows.
- `ExportPreviewTable.svelte`: add `dateRequested` to `DATE_KEYS`.
- Tests: `columns.test.ts` (19 entries, exact labels, new key last);
  `workbook.test.ts` (headings row contains all 19 labels, `<mergeCell ref="A1:S1"/>`,
  `dimension ref="A1:S…"`, `spans="1:19"`, 19 body cells, template rows extended);
  an API test that the preview carries `dateRequested` for a created record.

## 6. Acceptance checklist

- [ ] The preview shows 19 headings, with `Receipt No. / AR No.` in place of
      `Tracking Number` and `Date Requested` as the last column.
- [ ] The downloaded workbook's header row carries the same 19 headings in the same
      order, on all three sheets.
- [ ] A report created at 07:00 Manila time shows that day in `Date Requested`.
- [ ] `Date Received`, `Date of the Activity`, and `Date Completed` show Manila
      dates and did not shift for records created near midnight UTC.
- [ ] Each `Date Requested` cell is a date cell (right-aligned, sortable as a date),
      not text.
- [ ] The merged title spans A1:S1, the dimension and spans cover S, the print area
      and signature block sit inside the last column, and the file opens in Excel
      and LibreOffice without a repair prompt.
- [ ] The **Blank template** download has the same 19 headings and no values.
- [ ] The exports screen's warnings, counts, and "missing values" line are unchanged.
- [ ] `pnpm --filter @par/export exec vitest run` and
      `pnpm --filter @par/api exec vitest run src/features/exports` pass, and
      `pnpm verify` passes.

## 7. Out of scope

- Reordering or renaming any other column.
- Adding columns to the F-013 receipt (it is a fixed facsimile of the docx).
- Changing the workbook's sheet names, titles, letterhead, print scale, or the
  signature text box.
- Backfilling `Date Requested` for reports created before the column existed: it
  reads `created_at`, so existing rows already have the value.
