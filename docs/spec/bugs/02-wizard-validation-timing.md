# Bug phase 02 — Red validation only when the reporter tries to move on

**Severity:** high (the wizard reads as hostile while the report is being typed)
**Surface:** `/reports/new` and every returned-report edit, all four steps; the
admin record form reuses the same steps 1–3 for step 1–3 fields
**Reported:** 2026-10-22
**Depends on:** none — phase 03 builds on the mechanism introduced here
**Touches:** `apps/web/src/lib/features/reports/application/wizard-page.svelte.ts`,
`apps/web/src/lib/features/reports/application/wizard-validation.ts`,
`apps/web/src/lib/features/reports/application/wizard-validation.test.ts`,
`apps/web/src/lib/features/reports/application/wizard-requests.test.ts`,
`apps/web/src/lib/features/reports/presentation/ReportWizardPage.svelte`,
`apps/web/src/lib/features/reports/presentation/WizardErrorSummary.svelte`

---

## 1. What the office sees

Step 2 opens. Title of the activity is empty. The reporter clicks the calendar
icon to pick a date, and immediately the title turns red — "Enter the title of the
activity" — and the banner at the top says "Check the highlighted field." Nothing
was submitted and no step was left. The same happens after touching any empty
required field and clicking anywhere else: the form scolds the reporter for
fields they have not reached yet.

## 2. Verified current behaviour

- `ReportWizardPage.svelte` puts `onfocusout={(event) => wizard.onFocusOut(event)}`
  on the whole form column `.wizard-main`. Every focus change inside the form is
  therefore a validation event.
- `wizard-page.svelte.ts#onFocusOut` runs on any typing control that loses focus:

  ```ts
  onFocusOut(event: FocusEvent): void {
    const target = event.target;
    if (!(target instanceof HTMLElement) || !isTypingTarget(target)) return;
    void this.saveDraft();
    if (target.id) this.validateOnBlur(target.id);
  }
  ```

  `validateOnBlur` then calls `validateField(field, form)`, which reports an
  empty required field as an error. Clicking the calendar button moves focus out
  of the date text input and into the popover, and clicking the title field moves
  focus out of anywhere else — every one of those paths paints red.

- Because the same `errors` map feeds `WizardErrorSummary`, the banner "Check the
  highlighted field" also appears during entry, not only after a failed advance.
- `tryGoToStep` already validates only the steps being left before it advances,
  and `submit()` already walks `firstInvalidStep`. Those two paths are correct and
  are the only places an empty required field must ever be flagged.

## 3. Behaviour contract

The form follows one rule: **empty required fields are punished late, broken
values are rewarded early.**

1. **An empty required field never turns red on blur.** It turns red only when the
   reporter tries to leave the step: **Continue**, the advancing **ArrowRight**
   (`wizardKeyAction`), clicking a **later stepper dot**, or **Submit**. On that
   attempt the existing error summary appears, the first invalid field takes
   focus, and the step does not change — unchanged from today.
2. **A field the reporter has edited validates on blur, for format and
   relationship errors only.** "Edited" means the value differed from the value
   the field had when the step rendered (typing, picking a date, choosing an
   option, adding or removing a PIC). Examples that must show immediately:
   - a date that does not parse (`DD MMM YYYY`) or an end date before the start
     date;
   - a PIC email with content that is not an address, or a phone with forbidden
     characters;
   - a count that is not a whole number of 0 or greater;
   - `Total number of PIC` disagreeing with the number of PIC rows, once either
     side has been edited;
   - a field the reporter filled and then cleared (clearing is an edit, so the
     required message is fair).
     An empty field that has never held content is **not** validated on blur, even
     if the reporter has focused and left it several times.
3. **Interacting with a field's own control is not leaving the field.** Clicking a
   calendar icon, a date popover, a dropdown trigger, its list, or the
   add/remove-row buttons must not validate the field that owns that control.
   Suppress the blur when the newly focused element (`event.relatedTarget`) is
   inside the same field wrapper, and when the focus moved to a non-text control
   inside the form.
4. **The error summary is an advance-time surface.** It appears after a failed
   Continue, a failed Submit, or when an advance-attempted step already carries
   errors. It must not appear because a blur produced one inline message. A step
   the reporter has already attempted keeps its summary and inline errors until
   the fields are corrected (existing `clearErrorsForPatch` behaviour).
5. **Errors clear exactly as they do today**: editing a field clears its own
   error; changing Campus clears an incompatible College or unit; editing PIC
   rows clears PIC errors. Nothing new is kept stale.
6. **No new validation rules, copy, or required-ness.** This phase changes _when_
   a message appears, never _what_ it says. `validateStep` and `validateField`
   keep their rules; the shared Zod contract stays the source of truth.

## 4. Implementation notes

- Add to `WizardPageState`:
  - `private edited = new Set<string>()` — field keys as produced by
    `fieldFromDomId` (`title`, `startDate`, `pic.<id>.name`, …);
  - `private attempted = new Set<WizardStep>()` — steps the reporter tried to
    leave;
  - `markEdited(patch: Partial<WizardForm>)` called from `patchForm`, mapping the
    changed keys through `ERROR_CLEAR` in reverse and only when a value actually
    changed (compare before applying). Keep the set across step changes within one
    wizard instance, and clear it with the form on `reset()`.
- `validateOnBlur(controlId)` becomes:

  ```ts
  const field = fieldFromDomId(controlId);
  if (!field || !this.edited.has(field)) return;
  const message = validateEditedField(field, this.form); // empty ⇒ no error
  ```

- Add `validateEditedField(field, form): string | undefined` to
  `wizard-validation.ts`: reuses the same predicates as `validateField` but
  returns `undefined` for an empty value unless the field was emptied after
  holding content (pass `wasCleared` or compare against the edited set's first
  non-empty value). Keep it small: one `switch` over the relational fields, one
  delegated call for the rest.
- `onFocusOut` gains a guard: skip when `event.relatedTarget` is a Node inside
  `target.closest('.field')`, and skip when the target is a `button`, a
  `role="option"`, or `aria-haspopup` control. `Autosave` stays unconditional —
  the draft still saves on every blur.
- `tryGoToStep` adds every step it validated to `attempted`; `submit()` marks the
  step it sends the reporter back to. `WizardErrorSummary` renders when
  `attempted.has(step) && hasErrors(errors)`, not whenever `errors` is non-empty.
- Keep `firstErrorField` ordering and focus behaviour untouched — it is what makes
  Continue land on the right field.
- Tests, all in the existing files:
  - `wizard-validation.test.ts`: `validateEditedField` returns nothing for an
    untouched empty field, the format message for an edited bad value, the
    required message for an emptied field.
  - `wizard-requests.test.ts` (or a new `wizard-page.test.ts` beside the state):
    blur on an untouched empty field adds no error; blur after typing an invalid
    date adds one; `tryGoToStep(2)` on a form with no title records `attempted`
    and one error; editing the title clears it.

## 5. Acceptance checklist

- [ ] Open step 2 with an empty title, click the start-date calendar icon, pick a
      date: nothing turns red and no summary appears.
- [ ] Tab from an empty Title through every field on step 2 without typing: no
      error anywhere, at any point.
- [ ] Click Continue with empty required fields: the step does not advance, the
      summary lists the missing fields in form order, and focus lands on the first
      one. This is unchanged from today.
- [ ] Press ArrowRight where it advances the step with empty required fields: same
      result as Continue.
- [ ] Click a later stepper dot with empty required fields: the reporter is taken
      to the earliest incomplete step, with its summary.
- [ ] Type an end date before the start date and leave the field: the end-date
      message appears inline, without the summary.
- [ ] Type a malformed date and leave the field: the date message appears.
- [ ] Type a title and delete it, then leave the field: the required message
      appears (the field was edited).
- [ ] Correct every error after a failed Continue: the errors and the summary
      disappear as each field is fixed.
- [ ] Open and close the SDG picker, the Campus dropdown, and the calendar
      popover: no error is produced for their owning fields.
- [ ] Autosave still fires on blur and on the 20-second timer.
- [ ] `pnpm --filter @par/web exec vitest run src/lib/features/reports` passes;
      `pnpm verify` passes.

## 6. Out of scope

- Rewriting error copy or adding asterisks/hints.
- Server-side validation responses on Submit (they keep their own surface).
- The step 3 PIC-row specifics — see phase 03, which depends on this mechanism.
- Any change to which fields are required.
