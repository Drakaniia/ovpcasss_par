# Phase 07 — Edit returned report

**Milestone:** M3
**Routes:** `/reports/[id]/edit`
**Depends on:** 06 (field groups, validation, autosave, attachment uploader),
05 (route and draft rows)
**Source:** `par-ui-ux-spec.md` §7.6, §8.4, §8.5, §8.6 (409), §8.8

A return is a targeted correction, not a new submission. The page shows the
return comment first, puts every field on one page, and never loses local edits
in a conflict.

---

## 1. Context for this run

- Role: the owning SUBMITTER only. Anyone else gets permission denied; a report
  that is not returned or resubmitted redirects to the facsimile — this page is
  not an alternate editor for drafts or approved reports.
- One primary action: **Resubmit report** (navy). **Save changes** is outline;
  **Discard local changes** is a text action and appears only when local changes
  exist.
- Field groups, labels, required markers, date format, SDG picker, and the
  attachment uploader are **the same components as the wizard**. Do not fork
  them or reorder the fields.
- Return comments are visible to the submitter by contract; every comment is
  treated as shared (open question noted below).
- Only flag fields when the API supplies field ids with the return comment. If it
  does not, the comments stand alone. Never guess which fields were meant.

---

## 2. Layout

```
┌──────────────────────────────────────────────────────────────────────────────┐
│  OFF-2026-0014 · Coastal cleanup                                [Submitted]  │
│  Returned by reviewer · 15 Mar 2026                                          │
├──────────────────────────────────────────────────────────────────────────────┤
│  ┌ maroon callout ──────────────────────────────────────────────────────┐    │
│  │ Returned by M. Santos, reviewer · 15 Mar 2026                        │    │
│  │ "Please attach the attendance sheet and correct the participant      │    │
│  │  count (42 vs 40)."                                                   │    │
│  └──────────────────────────────────────────────────────────────────────┘    │
├──────────────┬───────────────────────────────────────────────────────────────┤
│ I. Activity  │  I. ACTIVITY CLASSIFICATION                                   │
│ II. Activity │  Type *            [ Off-campus ▾ ]                          │
│ III. People  │  Classification *  [ Curricular ▾ ]                          │
│ IV. Narrative│  …                                                            │
│              │                                                               │
│  (sticky     │  II. ACTIVITY                                                 │
│   mini-index)│  …                                                            │
├──────────────┴───────────────────────────────────────────────────────────────┤
│  [ Discard local changes ]          [ Save changes ]   [ Resubmit report ]   │
└──────────────────────────────────────────────────────────────────────────────┘
```

- Header: tracking number (monospace, copyable), title, current status badge,
  and "Returned by reviewer/approver · date". No back link that loses changes
  without the confirm.
- The latest return comment sits in a maroon-tinted callout directly under the
  header, with author, role, and date. Earlier rounds are available through the
  facsimile's review history; do not stack every round here.
- Single page with four fieldset groups in the same order as the wizard steps:
  **I. Activity classification**, **II. Activity**, **III. People and outcomes**,
  **IV. Narrative and attachments**.
- Left mini-index (≥1024 px) lists the four groups, sticky, highlights the group
  in view, and scrolls to it. Below 1024 px it becomes a horizontal anchor row
  under the comment, or is omitted if it would crowd the fields.

---

## 3. Editing behavior

- All fields from the wizard are present and editable, including type. Changing
  type changes the tracking prefix only for new reports; never rewrite an issued
  tracking number.
- Attachment uploader: existing attachments show as `Confirmed`; new files go
  through the same progress/confirm flow. Required labels missing for the
  activity type appear in the page's completeness summary, not a modal.
- **Save changes** writes the current values and stays on the page. Toast
  "Changes saved"; header save time updates. It does not change the status.
- **Resubmit report** validates and transitions `RETURNED_BY_*` →
  `RESUBMITTED`; it calls server validation and renders the field list if it
  fails. On success: toast "Report resubmitted", navigate to
  `/reports/[id]` with the `RESUBMITTED` badge.
- **Discard local changes** reverts to the last saved server copy. Confirm names
  what is discarded ("Discard your unsaved changes to "Coastal cleanup"?"). If
  there are no local changes, the action is hidden.
- Autosave behavior: follow the wizard (blur + 20 s) unless the API says returned
  reports are server-persisted continuously. Never autosave a resubmission or a
  status change.
- Leaving with unsaved changes shows the same Save / Discard / Stay confirm as the
  wizard.

### Flagged fields

When the API returns `field_ids` with the return comment:

- Flagged fields get a 2 px maroon left border, 8 px padding, and a small
  "Flagged" label.
- The callout lists the flagged field labels as links that focus the field.
- A field remains flagged until it is changed once, then the flag clears locally;
  the comment stays.
- If `field_ids` are missing, render **no** flags and no "Flagged" legend.

---

## 4. Conflict (409)

Reached when a desktop outbox edit is submitted against a newer server version
(and reused by phase 15).

- Modal title: "This report changed while you were offline". If the client was
  online, use "This report changed while you were editing".
- Body: side-by-side **Server version** and **Your edits** for the fields that
  differ. Narrative and long text scroll within their columns. Show the server
  version's `version`/timestamp and who changed it when the API supplies it.
- Actions: **Use server version** (destructive to local edits; requires a second
  confirm) and **Copy my edits** (writes local values to the clipboard, keeps the
  dialog open so the user can then choose the server version).
- Never auto-merge, never silently discard, and never submit the local copy
  again without the user choosing.
- Escape closes the modal without a choice; the page still holds local edits.

---

## 5. States

- Loading: skeleton header, callout, and field groups.
- Report not found / no access: the shared 404 copy ("This report does not exist
  or you do not have access").
- Not returned: redirect to the facsimile; do not render an empty editor.
- Returned but superseded (someone else resubmitted or it was approved): show a
  read-only notice with a link to the facsimile; disable the editor.
- Save failure: inline alert, form intact.
- Resubmit failure: linked server field list; form intact.
- Attachment failure: per-file retry; Submit/Resubmit blocked until all
  attachments are `CONFIRMED`.

---

## 6. Acceptance checklist

- [ ] Only the owning SUBMITTER can edit; others get permission denied.
- [ ] A non-returned report redirects to the facsimile, not an empty editor.
- [ ] Header shows tracking number (copyable), title, status, and "Returned by
      <role> · date".
- [ ] Latest return comment renders in a maroon callout with author, role, and
      date; earlier rounds are not stacked here.
- [ ] Four fieldset groups match the wizard order and reuse the wizard field
      components.
- [ ] Mini-index is sticky at ≥1024 px, highlights the section in view, and
      scrolls to anchors.
- [ ] Flags appear only when `field_ids` are supplied; without them no flags or
      legend render; a changed field clears its flag locally.
- [ ] Save changes stays on page, toasts, and does not change status; Resubmit
      transitions to `RESUBMITTED` and lands on the facsimile with a toast.
- [ ] Discard local changes appears only with local changes, confirms by name,
      and restores the last saved copy.
- [ ] 409 modal shows side-by-side changed fields, requires an explicit choice,
      supports Copy my edits, and never silently discards.
- [ ] Attachments reuse the phase 06 uploader; Resubmit blocks until all are
      `CONFIRMED`.
- [ ] Loading, 404, superseded, save-failure, resubmit-failure, and attachment
      failure states are implemented.
- [ ] `pnpm lint`, `pnpm typecheck`, and `pnpm build` results reported.

## 7. Out of scope

- Draft editing (the wizard owns drafts).
- Reviewer/approver decisions (phase 09).
- Server conflict resolution logic and versioning (backend).
- Editing approved reports. Once approved, a report is terminal in v1.

## 8. Open questions

1. Comment visibility: the data model has no internal-vs-shared flag. This page
   treats every comment as visible to the submitter (project spec §14 Q3).
2. Should changing activity type on a returned report re-validate attachment
   requirements and clear incompatible attachments? Assumed yes, with a confirm.
3. Should resubmission require a submitter note? Not specified; this spec does not
   add one.
