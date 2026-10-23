# Bug phase 03 — Step 3 stops flagging people who have not been typed yet

**Severity:** high (the People step flags blank rows during ordinary movement)
**Surface:** `/reports/new` step 3 (`People and outcomes`) in the four-step
wizard, and the same step when a returned report is edited
**Reported:** 2026-10-22
**Depends on:** 02 (the edited-field mechanism and the blur guard)
**Touches:** `apps/web/src/lib/features/reports/application/wizard-validation.ts`,
`apps/web/src/lib/features/reports/application/wizard-page.svelte.ts`,
`apps/web/src/lib/features/reports/presentation/WizardStepPeople.svelte`,
`apps/web/src/lib/features/reports/presentation/PicRows.svelte`,
`apps/web/src/lib/features/reports/application/wizard-validation.test.ts`

---

## 1. What the office sees

On step 3 the reporter clicks into the Name field of the first person in charge,
changes their mind, and clicks back into **Total number of students**. The Name
field turns red — "Enter the name" — before anything was typed. Add a second PIC
row and click anywhere and that blank row is red too. The reporter has to clear
red marks out of fields they never filled.

## 2. Verified current behaviour

- `wizard-validation.ts#validateField` returns required messages for PIC fields
  unconditionally:

  ```ts
  if (match[2] === 'name') return pic.name.trim() ? undefined : 'Enter the name.';
  ```

  Email and phone are already conditioned on content, but name is not.

- `validateStep(3, form)` validates `pics` and then loops over every row and every
  key, so `Continue` correctly flags each incomplete row. That part stays.
- The blur path (`wizard-page.svelte.ts#onFocusOut` → `validateOnBlur`) calls
  `validateField` for whichever PIC input just lost focus, including a field the
  reporter only clicked into. Combined with the shared `onfocusout` on the form
  column, merely visiting a blank field is enough to flag it.
- `clearErrorsForPatch` clears PIC errors only when the patch contains `pics`
  (add/remove/edit a row). Editing `totalStudents` or `totalPic` does not clear a
  row error, which is why the red mark appears to "follow" the reporter back to
  the counts.
- `PicRows` renders `errors[\`pic.${pic.id}.name\`]` directly, so anything in the
  map is visible immediately.

## 3. Behaviour contract

1. **A fresh row is blank, not wrong.** Adding a PIC row never marks it red, and
   never re-marks rows that were already complete.
2. **Visiting is not editing.** Moving focus into a PIC field and out again without
   typing produces no message for that field, in either direction — including a
   move back to `Total number of students` or `Total number of PIC`.
3. **Typed but wrong is flagged.** With the phase 02 mechanism, a row field that
   has been edited validates on blur:
   - Name: empty after being typed, or after a row was filled and cleared ⇒
     "Enter the name.";
   - Email: non-empty and not an address ⇒ "Enter a valid email address.";
   - Phone: non-empty with characters outside digits, spaces, `+`, `-`,
     parentheses ⇒ "Use digits, spaces, +, -, and parentheses."
     Empty email and empty phone are valid (they are optional in the contract).
4. **Continue is unchanged.** Continue validates the whole step, flags every
   incomplete row with the inline message, shows the summary, and focuses the first
   invalid control (`Name of person in charge 1`). Rows the reporter never touched
   are flagged only here.
5. **The count mismatch is a count message.** "The PIC count does not match the
   number of PIC rows" stays on `Total number of PIC`, appears once either
   `totalPic` or the row set has been edited (or on Continue), and clears when the
   numbers agree. It never appears while both sides are still at their initial
   empty state.
6. **Deleted rows take their errors with them.** Removing a row removes that row's
   messages; it must not move an error onto the row that took its place.
7. **Nothing else changes.** `Given` rules, labels, order, and SDG behaviour stay
   exactly as they are.

## 4. Implementation notes

- Reuse phase 02's `edited` set. `patchForm` already receives a `pics` patch from
  `patchPic`, `addPic`, and `removePic`; mark the specific row fields
  (`pic.<id>.name|email|phone`) for `patchPic`, and the row set for
  `addPic`/`removePic`.
- Change the `name` branch in `validateField` to the same shape email already uses,
  and add the required variant in `validateEditedField` only:
  - `validateField('pic.<id>.name')` keeps "Enter the name." for an empty value —
    Continue must still flag it;
  - `validateEditedField` returns `undefined` for an untouched empty name.
- `clearErrorsForPatch`: when the patch touches `totalStudents` or `totalPic`,
  also clear the `pics` and `totalPic` relationship messages only if the
  relationship now holds. Do not clear row-level messages — phase 02 already
  cleared the row the reporter edited.
- `PicRows` needs no markup change beyond receiving the already-filtered errors.
  If it currently derives its own error strings, keep the derivation in the
  parent (`WizardStepPeople`) so there is one source.
- Tests in `wizard-validation.test.ts`:
  - `validateEditedField` for a blank untouched row name, a cleared name, a bad
    email, a bad phone, a good row;
  - `validateStep(3)` still returns one error per incomplete row plus `pics` when
    there are no rows;
  - count mismatch: present when `totalPic = '3'` and one row exists and the count
    was edited, absent at the initial state.
- Add a state test (same file as phase 02's) proving that
  `onFocusOut(picNameInput) → onFocusOut(totalStudentsInput)` on an untouched form
  leaves `errors` empty.

## 5. Acceptance checklist

- [ ] Click into a blank PIC Name, click back into `Total number of students`:
      nothing turns red.
- [ ] Click through Name → Email → Phone → `Total number of PIC` on a new row
      without typing: no message appears on the row or on the counts.
- [ ] Click **Add person in charge**: the new row is blank and unflagged; existing
      rows keep their state.
- [ ] Type a name, clear it, leave the field: "Enter the name." appears on that
      row.
- [ ] Type `abc` into Email and leave the field: the email message appears; clear
      it and the message disappears.
- [ ] Press Continue with an incomplete row: the row is flagged, the summary lists
      "Name of person in charge 1" (and the others in order), and focus lands on
      the first invalid control.
- [ ] Set `Total number of PIC` to 2 with one row, after editing the count: the
      mismatch message appears on the count, not on the row.
- [ ] Add the second row: the mismatch clears.
- [ ] Remove a filled row: its messages disappear and the remaining rows' messages
      stay attached to the right rows.
- [ ] A returned report opened for edit behaves the same; pre-filled complete rows
      are never red on open.
- [ ] `pnpm --filter @par/web exec vitest run src/lib/features/reports` and
      `pnpm verify` pass.

## 6. Out of scope

- Changing the PIC row fields, their order, or their optionality.
- Auto-filling `Total number of PIC` from the row count (the current contract
  refuses to overwrite either value; that is not a bug).
- The SDG picker's behaviour.
- Steps 1, 2, and 4 — covered by phase 02.
