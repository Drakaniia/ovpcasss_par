# Phase 11 — Notifications inbox and bell menu

**Milestone:** M5
**Routes:** `/notifications` (**new route**; no scaffold page exists yet)
**Depends on:** 00 (shell bell slot, empty/error/skeleton, toast), 01 (auth
context)
**Source:** `par-ui-ux-spec.md` §7.13, §8.7, §5.3; project spec §10 (email
notifications)

Notifications answer "what happened to me or my reports?" They are not the queue
and must never be the only way to find work.

---

## 1. Context for this run

- Roles: all signed-in users; each user sees only their own notifications.
- The inbox is a reverse-chronological, dense list grouped by day. It is not a
  table with columns; unread state, description, type, and time read as one line.
- One primary action: none. **Mark all read** is a text action in the page header.
  There is no delete, archive, or mute in v1.
- Clicking a notification marks it read and opens its target (report, queue, or
  profile). If the target no longer exists, show the shared 404 copy; do not
  silently do nothing.
- The bell shows an unread count capped at **"9+"**. The count updates after
  reading and on navigation; no websocket requirement in v1.
- No toast for background sync; this page itself does not toast on load.
- Four notification surfaces, one job each (foundation §4.3): bell/inbox = things
  that happened to you; nav counters = queues needing work; inbox callouts = the
  same work on the landing page; toasts = confirmation of your own action.

---

## 2. Inbox layout

```
┌──────────────────────────────────────────────────────────────────────────────┐
│  Notifications                                        [ Mark all read ]      │
│  All   Needs action   Mentions my reports                                    │
├──────────────────────────────────────────────────────────────────────────────┤
│  TODAY                                                                       │
│  ● OFF-2026-0014 was returned by M. Santos   [Returned]      09:12          │
│    Add the attendance sheet and correct the participant count.               │
│  ○ OFF-2026-0011 was approved                [Approved]      08:40          │
│  YESTERDAY                                                                   │
│  ○ Your role was assigned                    [Account]      16:05           │
└──────────────────────────────────────────────────────────────────────────────┘
```

- Page header "Notifications"; **Mark all read** appears only when unread > 0.
- Filters: **All** (default), **Needs action**, **Mentions my reports**. Filter is
  URL state (`?filter=action`).
  - _Needs action_: notifications whose target is waiting on the user (returned
    to me, awaiting my review, awaiting my approval).
  - _Mentions my reports_: events on reports the user submitted.
- Day groups: "Today", "Yesterday", then `14 Mar 2026`. Reverse-chronological
  inside each group; groups also reverse-chronological.
- Each row: unread dot (filled = unread; with an accessible "Unread" label, not
  color alone), description, type chip, time.
- Description is a full sentence with the tracking number and actor when known:
  "OFF-2026-0014 was returned by M. Santos". For returns, a one-line comment
  excerpt follows on a second line, clamped to two lines.
- Type chips: **Submitted**, **Returned**, **Endorsed**, **Approved**,
  **Account** (role assigned, activated). Use text labels, neutral tint; they are
  categories, not workflow statuses — do not reuse `StatusBadge` colors as if
  they were report statuses.
- Time: `09:12` within today/yesterday groups; `14 Mar, 09:12` for older groups.
  Exact timestamp in the `title`; always Asia/Manila.
- Rows are links; the whole row is clickable, focus ring visible.
- No row menu, no delete, no bulk selection.

### Pagination

Not specified in the source. Use 50 per page with the shared pagination footer
("Showing 1–50 of 214") so the list has a bound; confirm before shipping. Day
grouping continues across pages only if the API returns a stable cursor; if not,
page-local grouping is acceptable and the date is shown on each row.

---

## 3. Behavior

- Clicking a row marks it read (optimistic) and navigates to the target. If the
  read call fails, keep the row unread and show a non-blocking inline error; still
  navigate if the target is valid.
- **Mark all read** marks every unread notification, updates the bell count to
  none, and toasts "All notifications marked as read". No confirm.
- Unread count in the bell is the server's count, capped at "9+". After marking
  read, decrement immediately and reconcile with the API response.
- New notifications are not pushed in v1; the count refreshes on navigation.
- The page preserves scroll position when returning from a report.
- Keyboard: standard link navigation; no letter shortcuts. `j/k` row focus is not
  required because this is not a table, but the rows must be reachable by Tab.

---

## 4. Bell menu (`NotificationMenu`)

Replaces the bell slot built in phase 00.

- Trigger: bell icon with unread count badge ("9+" cap); accessible name
  "Notifications, 3 unread".
- Menu: the three newest notifications, each with unread marker, description, and
  time. Clicking one marks it read and opens the target.
- Footer: **View all notifications** → `/notifications`.
- Empty: "No notifications yet."
- Header inside the menu may show "Notifications" and the unread count; no "Mark
  all read" here (page only).
- Focus is trapped only in the sense of a standard menu: arrow keys move, Escape
  closes, focus returns to the bell.
- The menu updates its three items after a read without a full reload.

---

## 5. States

- Loading: 6 skeleton rows with day-group blocks; bell count may load separately
  and must not flash "0" then jump — render a quiet placeholder until known.
- Empty (all): "No notifications yet. Activity on your reports appears here."
- Empty (filtered): "Nothing in this filter." + **Show all**.
- Error: `ErrorState` with request id and Retry.
- Expired session: redirect to sign-in.
- Deleted target: shared 404 copy ("This report does not exist or you do not have
  access").
- Mark-all failure: keep the rows unread, inline alert with Retry.

---

## 6. Acceptance checklist

- [ ] `/notifications` exists and is reachable from the bell menu; only the
      signed-in user's notifications appear.
- [ ] List is reverse-chronological and grouped by Today / Yesterday / date.
- [ ] Rows show unread dot with an accessible label, sentence description, type
      chip, and time; returns include a two-line comment excerpt.
- [ ] Type chips use text and do not imitate report status badges.
- [ ] Filters All / Needs action / Mentions my reports work and are URL state.
- [ ] Clicking a row marks it read and opens the right target; read failures do
      not lose the row and still allow navigation.
- [ ] Mark all read appears only with unread items, marks all, updates the bell,
      and toasts; no confirm.
- [ ] Bell count caps at "9+", has an accessible name with the true count, shows
      the three newest, links to View all, and updates after reads.
- [ ] No delete, archive, mute, or bulk selection exists.
- [ ] Loading, empty, filtered-empty, error, deleted-target, and mark-all failure
      states are implemented.
- [ ] Pagination is bounded (50/page) and confirmed with the user.
- [ ] `pnpm lint`, `pnpm typecheck`, and `pnpm build` results reported.

## 7. Out of scope

- Email delivery and templates (packages/email).
- Push/websocket updates and digests. Email preferences and muting are phase 17;
  the in-app inbox has no mute of its own.
- Admin purge tooling and retention policy.
- Notifications for failed emails on the admin inbox (phase 02 admin variant).

## 8. Open questions

1. Notification retention: how long are entries kept, and can admins purge them?
   (project spec §14 Q7)
2. Pagination size and whether grouping survives pagination; this spec assumes
   50 and page-local grouping.
3. Is "Mentions my reports" limited to the submitter, or also to reviewers who
   touched the report? Assumed submitter only.
4. Should account notifications (role assigned, activated) link to `/profile` or
   `/`? Assumed `/`.
