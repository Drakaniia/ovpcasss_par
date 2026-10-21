# Phase 17 — Email surfaces and the email log

**Milestone:** Post-M8 (delivers the M4 mail contract and completes M6 exports)
**Routes:** `/admin/emails` (**new route**), `/profile` (Email section), `/exports`
(**Send by email** action)
**Depends on:** 00 (table/form primitives, empty/error/skeleton, toast, `ConfirmDialog`),
01 (profile card order), 03 (admin table, Admin section tabs), 09 (queue age,
decision drawer), 11 (category chips), 14 (exports form and workbook)
**Source:** [`../email-integration-spec.md`](../email-integration-spec.md) §5–§11
and §16; `par-ui-ux-spec.md` §8.3, §8.4, §8.8; project spec §7.9

Mail is the office's second interface to the app. This phase gives it the three
places a person can see or steer it: the administrator's delivery log, the
profile's email preferences, and the workbook hand-off on Exports. It does not
compose mail in the browser — the API owns every message.

---

## 1. Context for this run

- Roles: `/admin/emails` is **ADMIN only**; the Email section on `/profile` is
  every signed-in user, for themselves; **Send by email** on `/exports` follows
  phase 14's REVIEWER / APPROVER / ADMIN.
- Three surfaces, one job each (foundation §4.3): the log answers "did it go
  out?", the profile answers "do you want it?", the dialog answers "send this
  file to these people".
- One primary action per screen. On `/admin/emails` the page has **no** filled
  button — the dialog's confirm is the primary. On `/profile` **Save** stays the
  page's only filled button, so the Email section saves immediately and has none.
  On `/exports` **Download .xlsx** stays primary and **Send by email** is outline.
- The log is **history, not a queue**: it is a table with a row menu, not a
  master–detail. There is no message detail screen, because the outbox stores
  metadata only — no body is ever rendered here.
- Email status chips are **categories**, like phase 11's notification chips. Never
  reuse `StatusBadge` colours as if they were report statuses.
- The recipient's mute is authoritative (email spec §8): if a submitter has turned
  workflow mail off, a reviewer ticking _Notify submitter by email_ still sends
  nothing. The drawer does not change, and the log records `Suppressed` with the
  reason, so the intent is visible without exposing anyone's preference.
- Times are Asia/Manila and formatted with the shared helpers; never the browser's
  locale guesswork.
- English, formal institutional voice. No exclamation marks, no "Oops".

---

## 2. `/admin/emails` — layout

```
┌──────────────────────────────────────────────────────────────────────────────┐
│  Email log                                                                   │
│  Every message the system tried to send, with its delivery state.            │
│  3 messages could not be delivered.                          [ Review ]      │  callout
├──────────────────────────────────────────────────────────────────────────────┤
│  [ Search recipient            ]  [ Status: Failed ▾ ]  [ Kind: All ▾ ]      │
│  Failed ×  Clear filters                                                     │  chips
├──────────────────────────────────────────────────────────────────────────────┤
│ TIME              KIND        TO                    SUBJECT            STATUS  ATT.  ERROR        ⋯ │
│ 14 Mar, 09:12     Returned    m.santos@university…  OFF-2026-0014 was  Failed   5    Resend rej…      │
│ 14 Mar, 08:40     Receipt     jd@university.edu     Submission rece…   Sent     1    —               │
│ 13 Mar, 16:05     Reminder    ms@university.edu     …still awaiting …  Suppre…  0    recipient muted │
├──────────────────────────────────────────────────────────────────────────────┤
│  Showing 1–50 of 128                                     [ 1 2 3 … ]        │
└──────────────────────────────────────────────────────────────────────────────┘
```

- Page header "Email log"; one-line subtitle as drawn; no other prose.
- **Failure callout** renders only when the failed count is > 0: the count in
  text and a **Review** action that sets `?status=FAILED` and clears the search.
  It is not a modal and never hides the table.
- **Filter bar** reuses `FilterBar` (phase 05) with URL state:
  `?status=FAILED&kind=RETURNED&q=santos&page=2`.
  - Search: recipient address, debounced 300 ms.
  - Status: All, Queued, Sent, Failed, Suppressed. **Default is Failed** — a log is
    opened to investigate, and the healthy case is an honest empty state with
    **Show all messages**. This is a deliberate difference from phase 03's
    default-All table; say so in the code comment, not the UI.
  - Kind: All plus the email kinds (Submitted, Resubmitted, Receipt, Returned,
    Endorsed, Approved, Reminder, Workbook, Failure digest, Verify, Reset, Role
    assigned, Account activated, Account disabled).
- Active filters render as removable chips with a count, per phase 13.
- Table columns: **Time, Kind, To, Subject, Status, Attempts, Last error, ⋯**.
  - Time: `14 Mar 2026, 09:12`; exact ISO timestamp in `title`.
  - Kind: neutral category chip with a text label.
  - To: full address, truncated with `title`; never a `mailto:` link.
  - Subject: truncated to one line with `title`; plain text, no HTML.
  - Status: `Queued` (neutral), `Sent` (success tint + text), `Failed` (maroon
    tint + text), `Suppressed` (neutral tint + text). Text is always present.
  - Attempts: integer, right-aligned, `0` shown rather than blank.
  - Last error: one line, truncated with the full text in `title`; `—` when none.
    Suppressed rows show the reason (`recipient muted`, `actor suppressed`,
    `account disabled`) in the same column.
- Default sort: Time descending. Sortable: Time, Kind, Status. Everything else is
  filtered, not sorted.
- Pagination: 50 per page, "Showing 1–50 of 128", page size fixed (the log is a
  diagnostic trail, not a browsable directory).
- Rows are 40 px with a sticky header. Row click does nothing — there is no
  detail view; the ⋯ menu is the only control and it stops propagation.
- Below 1280 px hide Attempts, then Subject; never hide Time, To, Status, or ⋯.
- No bulk selection, no export, no delete.

---

## 3. Resend

- Available on `Failed` and `Suppressed` rows only. On `Sent` and `Queued` the
  menu item is present but disabled with the adjacent reason "Already delivered."
  / "Still queued."
- Resend opens `ConfirmDialog` naming the recipient, kind, and subject:
  "Resend _OFF-2026-0014 was returned for revision_ to m.santos@university.edu?
  A new entry is added to the log; the original stays." Confirm label **Resend**.
- On success: dialog closes, toast "Message queued", and the table shows a **new**
  row at the top with `Queued`. The original row is never modified — the audit
  trail is append-only in spirit, matching the outbox rule.
- The resend re-queues the stored reference (email spec §9.4); it does not
  re-render from current report state, and the UI must not promise otherwise.
- Rate limit: 10 per hour per admin. A `429` shows an inline alert naming the
  limit and when to retry; the dialog stays open on failure with the request id.
- Success and failure are both audited (`EMAIL_RESENT`); the UI says nothing about
  the audit.

---

## 4. States — `/admin/emails`

- Loading: `SkeletonTable` with 8 rows matching the column widths.
- Empty (no filters, which only happens with `status=all`): "No messages have been
  sent yet."
- Empty (default `Failed`): "No failed messages." + **Show all messages**. This is
  the healthy state and must read as good news, not an error.
- Empty (filtered): "No messages match these filters." + **Clear filters**.
- Error: `ErrorState` with request id and Retry; filters preserved.
- Permission denied: "This page requires the Admin role." No Retry.
- Callout absent when the failed count is 0.

---

## 5. `/profile` — Email section

Appended below the Signature card (or below Password for non-approvers), so the
existing card order is untouched. No new filled button.

```
┌──────────────────────────────────────────────────────────────────────────────┐
│  Email                                                                       │
│  Applies to email only. In-app notifications always continue.                │
│                                                                              │
│  Workflow mail                                              [ on  ]           │
│  Submissions, receipts, returns, endorsements, approvals, acknowledgements.  │
│                                                                              │
│  Reminders                                                  [ on  ]           │
│  A nudge when a report has been waiting three working days.                  │
│                                                                              │
│  Account and security mail is always sent.                                   │
└──────────────────────────────────────────────────────────────────────────────┘
```

- Two switches, `role="switch"`, 36 px minimum target, label and description
  programmatically associated. Accessible name is the label; the description is
  the description, not part of the name.
- Saves immediately on change (no Save button). Optimistic: the switch flips, the
  PATCH runs, and on failure it flips back with an inline alert and Retry.
- Toast "Email preferences saved" on success only.
- The account/security line is plain text under the switches, not a disabled
  toggle — a greyed switch implies a permission the user might one day have.
- The section states its scope in one line (email only, in-app always continues);
  it does not repeat that inside each row.
- Read-only for nobody: every signed-in user can change their own two switches,
  including an Admin for their own account.

---

## 6. `/exports` — Send by email

An outline **Send by email** action sits next to the primary **Download .xlsx**.
It is enabled under the same conditions as Download (a loaded preview with at
least one row); a disabled state carries the same adjacent reason.

```
┌───────────────────────────────────────────────────────┐
│  Send workbook by email                            ✕  │
│                                                       │
│  Off-campus · 1st Semester · SY 2026–2027 · 46 rows   │
│                                                       │
│  Recipients                                           │
│  [ ovpcasss@buksu.edu.ph × ] [ Add address…        ]  │
│  Institutional addresses only. Up to five.            │
│                                                       │
│  Note (optional)                                      │
│  [ For the first semester filing.                ]    │
│  38 / 500                                             │
│                                                       │
│                          [ Cancel ]  [ Send by email ]│
└───────────────────────────────────────────────────────┘
```

- Dialog 480 px, one primary button inside it (**Send by email**, navy); Cancel is
  ghost. The page's Download stays the only filled button behind the scrim.
- The summary line is read-only and reflects the current form selection; changing
  the form after opening means reopening the dialog (close it when the selection
  changes, rather than silently resending a different sheet).
- Recipients: chips with a remove control, office address prefilled from config and
  removable. Free-form entry validated on submit **and** on blur:
  - must be an institutional domain (`buksu.edu.ph`, `student.buksu.edu.ph`);
    otherwise "Use an institutional address." naming the offending address;
  - at most five, deduplicated case-insensitively, with a count line when four or
    more are present;
  - an empty list disables Send with the reason adjacent ("Add at least one
    address.").
- Note: optional, 500 characters, live counter, plain text only (rendered into the
  mail as a paragraph, never as HTML).
- Send shows "Sending…", disables both buttons, and on success closes the dialog
  and toasts "Workbook sent to {first recipient}" (plus "and 2 others" when more).
  The recipients and note are not remembered for the next open.
- Failure keeps the dialog open with an inline alert, the request id, and every
  field intact; Retry re-submits the same values.
- The table is not described as "attached" in the UI; the mail carries the same
  workbook the download produces, and the dialog says so in one line under the
  summary only if space allows — otherwise the toast is enough.

---

## 7. States — dialog and profile

- Dialog: field errors stay inline under the recipients field; the summary line
  never reflows while a request is in flight.
- Dialog with no approved rows for the selection: the action is disabled, matching
  phase 14's empty-term copy; no dialog opens.
- Profile: loading shows two skeleton switch rows; an error loading preferences
  shows the card's `ErrorState` with Retry and leaves the switches hidden rather
  than defaulted, so the user never sees a wrong "on".
- Session expiry on any of the three surfaces: standard redirect to sign-in.

---

## 8. Acceptance checklist

- [ ] `/admin/emails` exists, is reachable from the Admin section tabs and from the
      inbox's failed-email card, and only ADMIN can open it; others see permission
      denied naming the role.
- [ ] Table columns are Time, Kind, To, Subject, Status, Attempts, Last error, ⋯;
      default sort newest first; 50 per page; sticky header; 40 px rows.
- [ ] Status chips read Queued / Sent / Failed / Suppressed with text and tint, and
      do not reuse report-status badge colours.
- [ ] Filters (recipient search, status, kind) are URL state, render removable chips,
      and the default status filter is Failed with a visible chip.
- [ ] The failure callout appears only with a count > 0 and its action filters to
      Failed with the search cleared.
- [ ] No message body is ever displayed in the log; only metadata.
- [ ] Resend is offered on Failed and Suppressed only, is disabled with a reason on
      Sent and Queued, confirms by naming recipient/kind/subject, adds a new Queued
      row, and leaves the original untouched.
- [ ] A rate-limited resend shows an inline alert naming the limit; a failed resend
      keeps the dialog open with the request id.
- [ ] Loading, no-messages, no-failures, filtered-empty, error, and denied states are
      implemented; the no-failures state reads as good news and offers Show all.
- [ ] Below 1280 px Attempts then Subject hide; Time, To, Status, and ⋯ never hide.
- [ ] `/profile` gains an Email section below the existing cards with two immediate-
      save switches, accessible names and descriptions, revert-on-failure, and the
      account/security line as plain text.
- [ ] The Email section adds no filled button and does not disturb the page's single
      Save.
- [ ] `/exports` gains an outline Send by email action that is enabled exactly when
      Download is, with the same adjacent reason when disabled.
- [ ] The dialog shows a read-only summary of the current selection, office address
      prefilled, institutional-domain validation naming the bad address, a five-
      recipient cap, and a 500-character note with a counter.
- [ ] Send disabled without recipients, "Sending…" while in flight, success closes and
      toasts, failure keeps every field and offers Retry.
- [ ] The dialog closes when the underlying export selection changes, so a sent
      workbook always matches the summary shown.
- [ ] Times on the log are Asia/Manila; no exclamation marks anywhere in the copy.
- [ ] Keyboard: every control is reachable by Tab, the row menu is operable with
      arrow keys and Escape, and no single-letter shortcut is introduced.
- [ ] `pnpm lint`, `pnpm typecheck`, and `pnpm build` results reported.

## 9. Out of scope

- Composing, templating, or sending mail in the browser. The shell, subjects,
  signature block, attachments, outbox writes, reminders, domain rules and the
  failure digest are `packages/email` and the API (email spec §5–§11).
- A message detail screen, an HTML preview of a sent message, and any body storage.
  Bodies are not stored, so this cannot be added later without a data change.
- Creating, editing, or suppressing addresses; a blocklist UI; bounce and complaint
  handling.
- Muting account/security mail, per-kind muting beyond the two categories, and any
  admin-side preference override.
- Deleting log rows, pruning, export of the log, and alerting beyond the daily
  digest.
- Anything on `/notifications` beyond the two new chips (`Resubmitted`, `Reminder`),
  which phase 11's list and filters already accommodate.
- Scheduled or recurring workbook mailings and recipient groups.

## 10. Open questions

1. **Log retention.** The rows are never pruned. Is 90 days right, and does that
   match the retention answer for notifications (phase 11 Q1) and audit (project
   spec §14 Q10)? The UI shows no retention notice until this is decided.
2. **Default filter.** This spec opens on Failed. If admins would rather always see
   everything, the default flips to All and the callout becomes the only failure
   signal — a one-line change, but confirm before shipping.
3. **Should reviewers and approvers see their own sends?** The log is Admin-only, so
   a reviewer who mails the workbook cannot later confirm delivery. Assumed
   acceptable; the office receives the file directly.
4. **Recipient visibility across admins.** The log shows addresses to every Admin.
   Confirm that is acceptable, given the audit log already records actor identity.
5. **Copy for suppressed rows.** Today the reason text is `recipient muted`,
   `actor suppressed`, `account disabled`, `preference off`. Confirm these read
   clearly to an administrator who is not the recipient.
6. **Per-user daily cap.** If one is added (email spec Q3), this phase needs a
   "Deferred by cap" status chip and a place to show it.
