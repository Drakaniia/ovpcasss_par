# Phase 03 — Admin: users and roles

**Milestone:** M1
**Routes:** `/admin/users` (Admin → Users)
**Depends on:** 00-foundation (table/form primitives, drawer shell, confirm
dialog, toast), 01 (role/status vocabulary)
**Source:** `par-ui-ux-spec.md` §7.15, §8.3, §8.4, §8.8; project spec §9 and
`users` table (roles `SUBMITTER|REVIEWER|APPROVER|ADMIN`, status
`PENDING_VERIFICATION|ACTIVE|DISABLED`)

This is the administrator's queue for account requests and account state. It is
not a profile editor for arbitrary user data beyond role and status.

---

## 1. Context for this run

- Role: ADMIN only. A non-admin hitting the route gets the permission-denied
  state naming the required role, not a 404.
- No filled navy button on this page. **Assign role** in the drawer is an outline
  action, like the filters and row actions: every account already has a role, so
  a change corrects it rather than unblocking the person.
- Table conventions from foundation §4.1: 40 px rows, sticky header, row click
  opens the drawer, ⋯ menu stops propagation, sort indicator, no checkboxes.
- Form conventions from foundation §4.2: labels above, validation on blur/submit,
  adjacent reasons for disabled controls.
- Role changes and activation are audited server-side; the UI never claims
  success before the API confirms.
- The admin cannot change their own role or disable themselves. The control is
  disabled with the reason adjacent: "You cannot change your own role." /
  "You cannot disable your own account."

---

## 2. Page layout

```
┌──────────────────────────────────────────────────────────────────────────────┐
│  Users & roles                                                               │
├──────────────────────────────────────────────────────────────────────────────┤
│  [ Search name or email        ]  [ Role: All ▾ ]  [ Status: All ▾ ]       │
├──────────────────────────────────────────────────────────────────────────────┤
│ NAME              EMAIL                 ROLE       STATUS        CAMPUS  REGISTERED  ⋯ │
│ J. Dela Cruz      jd@university.edu     Submitter  Active        Main    12 Mar 26     │
│ M. Santos         ms@university.edu     Reviewer   Disabled      Main    14 Mar 26     │
├──────────────────────────────────────────────────────────────────────────────┤
│  Showing 1–25 of 84                                          [ 1 2 3 … ]    │
└──────────────────────────────────────────────────────────────────────────────┘
```

- Page header title "Users & roles"; no subtitle and no callout.
- **Filter bar:** search (name or email, debounced), role (All, Submitter,
  Reviewer, Approver, Admin), status (All, Pending verification, Active,
  Disabled). Default status filter is **All**, so the directory lists every
  account.
- Filters are URL state (`?status=DISABLED&role=REVIEWER&q=santos`) so a view
  survives refresh and can be shared with another admin.
- Table columns: Name, Email, Role, Status, Campus, Registered, ⋯. Registered
  uses `12 Mar 2026`; email is plain text, not a link.
- Default sort: Registered ascending (oldest request first). Sortable: name,
  registered. Role/status are filtered, not sorted, in v1.
- Pagination: 25 per page, "Showing 1–25 of 84", page size 25/50/100.
- Below 1280 px hide Campus, then Registered; never hide Name, Status, or the ⋯
  menu.

---

## 3. Row drawer

Clicking a row opens a right-side drawer (480 px; full width below 640 px) over
the table. The table stays visible but inert; Escape closes, focus returns to the
row.

**Account facts** (read-only): full name, email, role, status, campus/unit,
contact number, registered date, email-verified date, last sign-in if the API
provides it.

**Actions**, in this order:

| Action      | When                  | Behavior                                                                                                                                        |
| ----------- | --------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------- |
| Assign role | Role needs correction | Select Submitter / Reviewer / Approver / Admin, then confirm. On success the role updates; status is untouched.                                 |
| Activate    | `DISABLED`            | Confirms and sets `ACTIVE`; copy states the user can sign in after activation.                                                                  |
| Disable     | `ACTIVE`              | Confirm names the user and consequence: "M. Santos will no longer be able to sign in. Their reports and audit history are kept." Maroon button. |

- **Assign role** is an outline action, never the drawer's primary button.
- Role changes take effect on the user's next request; do not promise an instant
  sign-out. Say "The new role applies the next time they sign in or refresh."
- Disable is not offered for `PENDING_VERIFICATION`; that account is not active.
  Activate is the only switch for `DISABLED`.
- All actions require confirmation via `ConfirmDialog` naming the person and the
  consequence. Success closes the drawer, fires a toast ("Role assigned",
  "Account activated", "Account disabled"), and refreshes the row in place.
- Errors keep the drawer open with an inline alert and the request id; never
  close on failure.

### Self-protection

On the signed-in admin's own row and drawer:

- Role select is disabled with "You cannot change your own role."
- Disable is disabled with "You cannot disable your own account."
- Activate is irrelevant and hidden.
- The UI does not rely on tooltips for these reasons.

---

## 4. States

- Loading: 8 skeleton rows matching the column widths.
- Empty (no filters): "No accounts yet." with a one-line explanation that
  registrations appear here.
- Empty (filtered): "No accounts match these filters." plus **Clear filters**.
- Error: full-page `ErrorState` with request id and Retry.
- Permission denied: "This page requires the Admin role." No Retry.
- A role assignment that conflicts with a concurrent change returns the server's
  current state; show it in the drawer and ask the admin to review again. Never
  silently overwrite.

---

## 5. Acceptance checklist

- [ ] Only ADMIN can open the page; others see the permission-denied state.
- [ ] Default status filter is All, so every account is listed; filters are URL
      state and survive refresh.
- [ ] Table shows Name, Email, Role, Status, Campus, Registered, ⋯; default sort
      oldest first; pagination 25/50/100.
- [ ] Row click opens the drawer and Escape returns focus to the row.
- [ ] Assign role, Activate, and Disable behave per the table; each confirms by
      naming the person and consequence.
- [ ] Disable uses maroon styling and only appears for `ACTIVE` accounts.
- [ ] Activate appears only for `DISABLED` accounts and sets them active.
- [ ] Self role change and self disable are disabled with visible reasons.
- [ ] Success closes the drawer, toasts, and updates the row without a full page
      reload; failure keeps the drawer open with an inline alert.
- [ ] Loading, empty, filtered-empty, error, denied, and concurrent-change states
      are implemented.
- [ ] Below 1280 px Campus/Registered hide before Name/Status/⋯.
- [ ] `pnpm lint`, `pnpm typecheck`, and `pnpm build` results reported.

## 6. Out of scope

- Reference data (phase 04) and audit log (phase 13).
- Creating users or editing names/emails/contact details on their behalf.
- Password resets for other users; no such action exists in v1.
- Deleting accounts. Disable is the only removal action.

## 7. Open questions

1. Can an admin assign the Admin role to another user, and should the last active
   admin be protected from demotion/disable? Not specified.
2. Does disabling invalidate existing sessions immediately, or only block the next
   sign-in? The copy currently says "next time they sign in or refresh."
3. Confirm whether a role change should notify the person by email as well as in
   the in-app inbox (currently both).
