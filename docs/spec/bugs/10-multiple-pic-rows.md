# Bug phase 10 — A second person in charge cannot be saved

**Severity:** high (a record with two PICs never reaches the register)
**Surface:** `/reports/new` step 3 (`People and hand-over`) and `/reports/<id>/edit`
**Reported:** 2026-10-26
**Touches:** `apps/web/src/lib/features/reports/application/record-validation.ts`,
`apps/web/src/lib/features/reports/application/record-state.svelte.ts`,
`apps/web/src/lib/features/reports/application/record-validation.test.ts`,
`apps/web/src/lib/features/reports/application/record-state.test.ts`

---

## 1. What the office sees

The office adds a second person in charge, fills every field on both rows — name
and email, phone if they have it — and presses **Create and send**. The form
answers `Check the highlighted fields` in the banner under the wizard. Nothing on
the page is red, no message sits on either row, and the record is never created.
The office reads this as "multiple PICs cannot be added", retries, and gets the
same sentence.

## 2. Verified cause

Two faults compound:

1. **The client accepts what the API refuses.** `validateField` checks each PIC
   email on its own (present, valid format). The API additionally requires the
   addresses to differ — `packages/shared/src/validation/report.ts#validateActivity`
   answers `Each personnel in charge must have a different email address.` on
   `pics` — because the address _is_ the account, and `report_pics` keeps one row
   per `(report_id, email)` (`packages/db/src/schema/reports.ts`). A second row
   that repeats an address (a capitalised repeat, or the browser autofilling one
   saved address into both email inputs) passes every client check.
2. **`save()` throws the rejection away.**
   `RecordFormState.save` caught the `ApiError` and copied only
   `error.message` into `saveError`, so the field-level `error.details` the API
   had already computed never reached the wizard. `WizardErrorSummary` was never
   involved: `errors` stayed empty, so the banner under the form was the only
   symptom.

With distinct addresses, two or three rows already save correctly —
`totalPic` is derived from the rows and `toRecordInput` sends every filled row.
The bug is the invisible refusal, not the row list.

## 3. Behaviour contract

1. **A repeated address is client-side.** Blur and Continue report
   `This email is already used by another person in charge.` on **both** rows
   that share it — case and padding ignored. Create refuses without sending a
   request.
2. **Fixing one address clears the other row.** The message belongs to the
   current values, not to whatever was true when the field lost focus.
3. **A rejected save is never a dead end.** When a 400 carries field issues, the
   wizard puts each one on its control — `pics.<index>.<key>` on the row id the
   form holds, `activityStartDate`/`activityEndDate` on the wizard's
   `startDate`/`endDate`, everything else by name — moves to the earliest step
   involved, marks that step attempted so the summary lists the sentences, and
   focuses the first offending control. The generic banner is not shown.
4. **Nothing is hidden.** A 400 with no usable issues (or a non-validation error)
   still shows the banner with its message and request id.
5. **The happy path is unchanged.** Two or more rows with different addresses
   create the record, and the confirmation still reports the number of people it
   was sent to.

## 4. Implementation notes

- `record-validation.ts#duplicateEmail` is the client mirror of the shared rule;
  it lives inside `validateField`'s email branch so blur, step validation, and
  `firstInvalidStep` cannot disagree.
- `record-validation.ts#errorsFromIssues` translates `ValidationIssue[]` into
  `FieldErrors` plus the earliest wizard step. Rows are matched by position
  because the contract has no row ids; a row the form no longer holds falls back
  to the `pics` message.
- `record-state.svelte.ts#showIssues` applies the mapping on a rejected save;
  `clearResolvedRowErrors` drops a row message the moment the row stops producing
  it.

## 5. Acceptance checklist

- [x] Two rows with the same address: Create names both rows in the summary, the
      rows are marked inline, focus lands on the first email input, no request is
      sent.
- [x] Correct the second address: both messages disappear and Create succeeds
      with `Sent to 2 personnel in charge`.
- [x] Two rows with different addresses: the record is created and both people are
      listed in the payload (`pics` length 2, `totalPic` 2).
- [x] A 400 whose issue names `pics.1.email` lands on row 2's email field with the
      server's sentence, no banner.
- [x] A 400 with no issues keeps the banner (409 conflict path).
- [x] `pnpm --filter @par/web exec vitest run src/lib/features/reports` and
      `pnpm --filter @par/web typecheck` pass.

## 6. Out of scope

- Allowing the same address on two rows. The email is the account and the
  database keeps one PIC row per report and address.
- The name, phone, and count rules.
- The narrative flow's assignment and receipt behaviour.
