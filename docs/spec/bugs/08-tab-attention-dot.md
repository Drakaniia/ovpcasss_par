# Bug phase 08 — A tab shows a dot when its list is waiting for you

**Severity:** medium (nothing in the chrome says work is waiting)
**Surface:** the section tab row in the window chrome — Reports (`All`, `Drafts`,
`Returned`, `Approved`, plus the admin's awaiting-review tab under the
personnel-narrative flow) and Admin (`Users`, `Reference data`, `Audit`,
`Email log`). The retired `/review` and `/approval` tabs are **not** reintroduced;
their waiting items fold into the admin's single list.
**Reported:** 2026-10-22
**Depends on:** none
**Touches:** `apps/web/src/lib/navigation/navigation.ts`,
`apps/web/src/lib/features/window-chrome/presentation/NavigationRow.svelte`,
a new `apps/web/src/lib/session/inbox-attention.svelte.ts`,
`apps/web/src/lib/navigation/navigation.test.ts`,
`apps/web/src/lib/features/window-chrome/presentation/NavigationRow.test.ts` (new),
`apps/web/src/lib/styles/components.css` (tab dot only)

---

## 1. What the office sees

The window chrome shows a row of tabs with no state. A reviewer or approver has no
way to know from the chrome that three reports came back or that one narrative is
waiting, until they open the page and read the list. The notification bell is the
only place a count exists, and it covers notifications, not lists.

## 2. Verified current behaviour

- `navigation.ts#sectionTabsFor(section, role)` returns
  `{ label, href }[]`. `NavigationRow.svelte` renders each as an `<a class="tab">`
  with `data-tab-key`, `aria-current`, and nothing else; `TabIndicator` draws only
  the selection underline.
- Counts already exist on the server: `inboxResponseSchema` carries
  `awaitingReview.total`, `withPic.total`, `returned.total`, `approved.total`,
  `myReports.total`, `notificationsUnread`, and `admin.failedEmails`. The shell
  does not read them; only `/` (the work inbox) and the bell do.
- `session.user.unreadNotifications` drives the bell's number; there is no
  equivalent for list tabs.
- The Reports tabs today are `All`, `Drafts`, `Returned`, `Approved`; the
  personnel-narrative flow replaces the reviewer/approver pair with the admin's one
  review list. The dot must attach to whichever tab survives that change, so it is
  keyed by tab identity, not by the string "Review".

## 3. Behaviour contract

1. **A dot means "this list holds an item that needs this account".** Nothing else
   earns a dot. The mapping is explicit:

   | Tab (Reports)                                | Dot when                                               |
   | -------------------------------------------- | ------------------------------------------------------ |
   | Awaiting review (ADMIN; today's review list) | `awaitingReview.total > 0`                             |
   | Returned (both roles)                        | `returned.total > 0`                                   |
   | Drafts                                       | never (a draft is not waiting on the account)          |
   | All                                          | never (the dot belongs to the tab that names the work) |
   | Approved                                     | never                                                  |
   | Admin → Email log (ADMIN)                    | `admin.failedEmails > 0`                               |

2. **Absent means zero.** With a count of 0 the tab renders exactly as it does
   today: no dot, no gap, no placeholder ring.
3. **The dot sits with the label.** A 6 px filled circle, baseline-aligned, 6 px
   after the label text, inside the link so the whole tab remains one click target.
   It never sits on the tab's border and never replaces the underline.
4. **It is never colour alone.** The link's accessible name carries the count —
   "Returned, 3 reports need attention" — while the dot is `aria-hidden="true"`.
   The visible label text does not change and does not gain a number, so the tab row
   does not reflow.
5. **Apple-style appearing, not announcing.** On first paint after a count becomes
   non-zero the dot scales from 0.6 to 1 with a short ease-out (`--duration-fast`),
   once. No pulse, no loop, no shake, and no motion under
   `prefers-reduced-motion: reduce`.
6. **Reserved space.** Each tab keeps an 8 px right gutter so a dot appearing never
   shifts the labels or the underline's measured position (`TabIndicator` measures
   `offsetWidth`; that measurement must stay stable).
7. **Fresh, never invented.** Counts come from one source — the existing inbox
   response, not a new endpoint — read through a small session store that refreshes
   on route change, on window focus, and after any decision or submit mutation, and
   is throttled to at most one request per 60 seconds in the background. While a
   count is unknown (first load, signed out, failed request) the dot is absent; a
   failed refresh keeps the last known value rather than clearing it.
8. **Scoped to the section.** The dot belongs to the tab, so it is visible from
   every section, not only when that section is open. Counts are cleared on sign-out
   and never shared between accounts.
9. **Colour.** `--status-danger-fg` for attention that is a returned or waiting
   record; `--status-warning-fg` when the tab means a delivery failure (Email log).
   Gold stays decorative and never marks work.

## 4. Implementation notes

- `navigation.ts`: extend `SectionTab` with an optional `attention?: TabAttention`
  key (`'review' | 'returned' | 'emailFailures'`) instead of a boolean, so the
  mapping is data and `NavigationRow` stays dumb. Export
  `tabAttention(tabs, counts, role): Record<string, number>` that returns only
  non-zero counts keyed by `href`, and unit-test it.
- New `lib/session/inbox-attention.svelte.ts`: one `$state` object
  `{ awaitingReview, returned, failedEmails, loadedAt }`, one `refresh()` calling
  the existing inbox endpoint through `apiFetch`, a 60-second throttle, a
  `window.addEventListener('focus', …)` hook registered in `AppShell.svelte`, and
  an `invalidate()` called by the submit/decision paths and on sign-out. No polling
  timer.
- `NavigationRow.svelte`: read `tabAttention(...)` once per row; inside each `<a>`
  render `{#if count > 0}<span class="tab-dot" aria-hidden="true"></span>{/if}` and
  append a visually hidden ", {count} need attention" to the label, or set
  `aria-label` on the link. Prefer the visually hidden suffix so the visible label
  keeps its exact text.
- `components.css` (or the component's scoped style, if the row owns the tab
  paint): `.tab { padding-right: … }` gains the reserved gutter;
  `.tab-dot { width: 6px; height: 6px; border-radius: 50%; background:
var(--status-danger-fg); }` with the scale-in keyframe and the reduced-motion
  guard.
- Keep `activeTabHref` and the indicator measurement untouched; verify the dot does
  not change `offsetWidth` between states (reserved gutter).
- Tests: `navigation.test.ts` for the mapping table (including a PERSONNEL account
  with no review tab); a new `NavigationRow.test.ts` through `svelte/server`
  asserting the dot is present with a count, absent at zero, and that the accessible
  name includes the number.

## 5. Acceptance checklist

- [ ] With one returned report, the **Returned** tab shows a dot; the link's
      accessible name names the count; the visible label text is unchanged.
- [ ] With zero returned reports the dot is absent and the tab row does not shift.
- [ ] As ADMIN with a submitted narrative waiting, the awaiting-review tab shows a
      dot; as PERSONNEL that tab does not exist and nothing else gains one.
- [ ] With a failed email delivery in the log, the Admin → **Email log** tab shows
      the warning-toned dot.
- [ ] Approving or returning the last waiting report clears the dot within one
      refresh, without a page reload.
- [ ] Switching sections keeps the correct dots visible on their tabs.
- [ ] Signing out and signing in as another account never shows the previous
      account's dot.
- [ ] With the inbox request failing, the last known dots remain and no error is
      shown in the chrome.
- [ ] Under `prefers-reduced-motion: reduce` the dot appears without animation.
- [ ] The selection underline still lands exactly under the active tab before and
      after a dot appears.
- [ ] `pnpm --filter @par/web exec vitest run src/lib/navigation` and
      `pnpm verify` pass.

## 6. Out of scope

- Numeric badges in the primary navigation ("Reports 3").
- A dot on primary nav items, the bell, or the account menu (the bell already has
  its count).
- Per-tab polling or websockets.
- Notification preferences or marking a tab list as read.
- Reintroducing `/review` or `/approval`.
