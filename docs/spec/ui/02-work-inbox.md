# Phase 02 — Work inbox

**Milestone:** M1
**Routes:** `/` (landing), onboarding checklist inside `/`
**Depends on:** 00-foundation (`StatusBadge`, `NextStepStrip`, empty/error/
skeleton primitives), auth context from 01
**Source:** `par-ui-ux-spec.md` §7.3, §8.2, §8.8, §10, §15 steps 1–2

The inbox answers one question: **"what do I do now?"** It is role-aware and
leads with action, not activity.

---

## 1. Context for this run

- Roles: all signed-in users. The page is the post-sign-in destination for
  `ACTIVE` accounts.
- One primary action: **+ New report** for SUBMITTER; for REVIEWER/APPROVER the
  page has no filled primary button (queue links are outline/ghost); ADMIN sees
  no report action unless they also hold a report role.
- Sections render in a **fixed order** and only when non-empty. Never render an
  empty section shell.
- Every count is a server-provided total for the section, not the number of rows
  rendered (max 3 rows per section).
- Statuses use the shared labels (foundation §2.2) and next-step text
  (foundation §2.8); never show "In progress".
- Compact, table-first rows: 40 px, 13 px type, monospace tracking numbers.
- Action before information: actionable sections precede drafts, waiting items,
  and recent activity.

---

## 2. Layout

```
┌──────────────────────────────────────────────────────────────────────────────┐
│  Good afternoon, J. Dela Cruz                          [ + New report ]      │  page header
│  Submitter · College of Arts and Sciences                                     │
├──────────────────────────────────────────────────────────────────────────────┤
│  NEEDS YOUR ACTION                                                            │
│  ┌──────────────────────────────────────────────────────────────────────┐    │
│  │ Returned to you  (2)                              [ Review changes → ]│    │
│  │ OFF-2026-0014  Coastal cleanup    Returned by reviewer · 2 days ago  │    │
│  │ INC-2026-0009  Outreach program   Returned by approver · 5 days ago   │    │
│  └──────────────────────────────────────────────────────────────────────┘    │
│  ┌──────────────────────────────────────────────────────────────────────┐    │
│  │ Awaiting your review (4)                          [ Open queue → ]    │    │
│  └──────────────────────────────────────────────────────────────────────┘    │
│  ┌──────────────────────────────────────────────────────────────────────┐    │
│  │ Awaiting your approval (1)                        [ Open queue → ]    │    │
│  └──────────────────────────────────────────────────────────────────────┘    │
│                                                                              │
│  YOUR DRAFTS (3)                                          [ View all → ]      │
│  ┌──────────────────────────────────────────────────────────────────────┐    │
│  │ Title                     Type        Updated        Completeness     │    │
│  │ Marine survey             Off-campus  today 09:12   ▓▓▓▓▓░░░ 62%     │    │
│  └──────────────────────────────────────────────────────────────────────┘    │
│                                                                              │
│  WAITING ON THE OFFICE                                                       │
│  OFF-2026-0011  Forum on governance   Submitted · with reviewer · 3 days     │
│                                                                              │
│  RECENT ACTIVITY                                                             │
│  • Your report OFF-2026-0011 was submitted            2h ago                 │
└──────────────────────────────────────────────────────────────────────────────┘
```

Page header: time-of-day greeting, full name, role, and campus/unit. No
motivational copy, no weather, no avatar in the header.

---

## 3. Sections

### 3.1 Needs your action

Fixed internal order: **Returned to you**, **Awaiting your review**, **Awaiting
your approval**. Render only the sections the role can have.

- **Returned to you** (SUBMITTER): count, up to 3 rows, "Review changes →"
  linking to `/reports?tab=returned`. Row: tracking number, title, "Returned by
  reviewer/approver · N days ago". Row click opens
  `/reports/[id]/edit`, not the facsimile.
- **Awaiting your review** (REVIEWER): count, "Open queue →" to `/review`. Up to
  3 rows with tracking, title, submitted age; row click opens `/review/[id]`.
- **Awaiting your approval** (APPROVER): count, "Open queue →" to `/approval`. Up
  to 3 rows; row click opens `/approval/[id]`.
- Counts are text ("Returned to you (2)"), not badge-only.
- Rows offer **open only**. No endorse/approve/return controls on the inbox;
  decisions happen on the report.

### 3.2 Your drafts

- Section label "YOUR DRAFTS (n)" with "View all →" to `/reports?tab=drafts`.
- Compact table: Title (2-line clamp), Type, Updated (relative, exact timestamp
  on `title`), Completeness meter with percentage text.
- Row click opens `/reports/[id]/edit`.

### 3.3 Waiting on the office

- Reports the user submitted that are not yet decided: `SUBMITTED`,
  `RESUBMITTED`, `ENDORSED`.
- One line per report: tracking number (monospace), title, current holder +
  next-step phrase (foundation §2.8), age in days.
- Row click opens `/reports/[id]`. No action controls.

### 3.4 Recent activity

- A short list (max 5) of events on the user's reports: submitted, returned,
  endorsed, approved. Reverse-chronological, relative time with exact timestamp
  on hover/title.
- Plain list, not a card table. Link to the report.
- This is the lowest-priority section and never pushes action above it.

### 3.5 Role variants

| Role                        | Inbox contents                                                                                                                                     |
| --------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------- |
| SUBMITTER                   | Returned to you, Your drafts, Waiting on the office, Recent activity                                                                               |
| REVIEWER                    | Awaiting your review, Recent activity                                                                                                              |
| APPROVER                    | Awaiting your approval, Recent activity                                                                                                            |
| REVIEWER + APPROVER         | Both queue sections, in the fixed order above, then Recent activity                                                                                |
| ADMIN (without report role) | Failed emails (only if any, link to admin), Recent audit events (link to `/admin/audit`)                                                          |

- Admin does not see review/approval queues by virtue of being Admin.
- A user with several capabilities sees the union, still in the fixed order.

---

## 4. Empty and edge states

- If **all** sections are empty: replace the page body with the onboarding
  checklist (§5). The header and primary action stay.
- A section that is empty is omitted entirely; do not show "0".
- Loading: skeleton blocks per section with the real row heights; no spinner on
  the page.
- Error: full-page `ErrorState` with request id and Retry; keep the header.
- Denied/expired session: standard redirect to sign-in, not a dead inbox.
- Counts that exceed what was fetched still show the true total with at most 3
  rows and the queue link.

---

## 5. Onboarding checklist (derived)

The source references "§7.21" for the first-run checklist, but that section does
not exist. This is a **derived** spec; confirm copy before shipping.

- Shown only when every inbox section is empty, replacing the body (header
  stays).
- Card title: "Get started". One sentence: "Three steps to your first submitted
  report."
- Steps, each with a link:
  1. **Complete your profile** — name, campus/unit, contact number → `/profile`.
  2. **Create your first report** — opens `/reports/new`.
  3. **Submit it for review** — explains that submitting issues a tracking
     number; links to the draft if one exists, otherwise step 2.
- Progress is text ("1 of 3 complete") plus check icons; never color-only.
- Persistent until all three are complete; no dismiss, no confetti, no modal.
- Once any inbox section has content, the checklist disappears.

---

## 6. Acceptance checklist

- [ ] Greeting is time-of-day based and shows name, role, campus/unit; no
      motivational copy.
- [ ] Section order is Needs your action (returned → review → approval) → Drafts
      → Waiting on the office → Recent activity.
- [ ] Empty sections are omitted; no "0" sections render.
- [ ] Each actionable section shows the true count, at most 3 rows, and the
      correct queue link.
- [ ] Returned rows open the edit page; queue rows open the corresponding detail
      route; waiting/draft rows open the right report route.
- [ ] No decision buttons appear in the inbox.
- [ ] Reviewer/approver sections are role-filtered; Admin sees the admin variant
      and no queues unless they also hold a report role.
- [ ] All-empty state shows the onboarding checklist and hides it once any
      section has content.
- [ ] Drafts table shows title, type, relative updated time with exact title
      attribute, and a completeness percentage with text.
- [ ] Waiting rows use status next-step copy, not invented states.
- [ ] Skeleton, error, and expired-session states are handled.
- [ ] `pnpm lint`, `pnpm typecheck`, and `pnpm build` results reported.

## 7. Out of scope

- Queue pages and decision actions (phase 09).
- Report table filters/tabs (phase 05).
- Notification list (phase 11); Recent activity is report events, not the inbox.

## 8. Open questions

1. Confirm the onboarding checklist copy and whether step 3 can be completed by
   submitting any report type.
2. Should "Waiting on the office" include reports returned to the user? Assumed
   no — returned reports belong in Needs your action.
3. Confirm the recent-activity retention window (how many days are shown).
