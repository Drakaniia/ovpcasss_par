# Phase 13 — Admin: audit log

**Milestone:** M5
**Routes:** `/admin/audit` (Admin → Audit)
**Depends on:** 00 (tokens, table/list primitives, empty/error/skeleton)
**Source:** `par-ui-ux-spec.md` §7.17, §8.8; project spec §8 (audit records)

The audit log is the institutional memory and the recovery path for decisions.
It is read-only and never offers an undo.

---

## 1. Context for this run

- Role: ADMIN only; others see permission denied naming the Admin role.
- One primary action: none. There is no export, delete, edit, or purge in v1.
- Two panes: filters (320 px, left) + event list (right). Below 1280 px the filter
  panel collapses above the list with a **Filters (n)** toggle.
- Newest event first by default. Events are append-only and ordered by server
  timestamp; never sort client-side across pages.
- Times are Asia/Manila in the UI with the exact UTC value in the detail's
  `title`/monospace line. API values stay UTC.
- Status changes are text with an arrow ("Submitted → Endorsed"), not color-only.
- The detail expands **inline beneath the selected row**, not in a drawer, so the
  surrounding events stay visible.

---

## 2. Layout

```
┌───────────────────────┬──────────────────────────────────────────────────────┐
│ FILTERS               │  Audit log                                           │
│ Actor [___________]   │  17 Oct 2026 14:02                                   │
│ Action [All ▾]        │  M. Santos (Reviewer)  Endorsed  OFF-2026-0014       │
│ Entity type [All ▾]   │  Submitted → Endorsed                                │
│ Entity id [_________] │  ─────────────────────────────────────────────────   │
│ Date range [from][to] │  17 Oct 2026 13:45                                   │
│ Status change [▾][▾]  │  J. Dela Cruz (Submitter)  Submitted  OFF-2026-0014  │
│ [ Apply ] [ Reset ]   │  Draft → Submitted                                   │
│                       │  ...                                                 │
│                       │  Showing 1–50 of 1,204          [ 1 2 3 … ]          │
└───────────────────────┴──────────────────────────────────────────────────────┘
```

- Page header "Audit log"; a one-line caveat: "Append-only record. Times are
  Asia/Manila."
- Filter pane is sticky at ≥1280 px and independently scrollable.
- Event list rows are 56 px, not 40 px, because each row carries two lines:
  - Line 1: timestamp (monospace), actor + role, action, entity type + id.
  - Line 2: status transition when present, and a short comment excerpt when
    present.
- Row click expands the detail beneath it; clicking again collapses. Only one
  detail is open at a time; opening another closes the previous and keeps its
  header visible.
- Expanded row sets `aria-expanded` on the row button and is reachable by
  keyboard.
- Pagination: 50 per page; page size is fixed at 50 in v1.
- No checkbox column, no bulk actions, no export.

---

## 3. Filters

| Filter        | Control                                                                                                                                                                        |
| ------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Actor         | Text (name or email) with server-side match                                                                                                                                    |
| Action        | Select from the audit action list (registered, logged in, role changed, submitted, returned, endorsed, approved, exported, reference data edited, attachment added/removed, …) |
| Entity type   | Select (User, Report, Attachment, Reference data, Export, Session)                                                                                                             |
| Entity id     | Text (exact)                                                                                                                                                                   |
| Date range    | From / to, date only (day boundaries in Asia/Manila)                                                                                                                           |
| Status change | From status / To status selects, including "Any"                                                                                                                               |

- Filters are URL state so an admin can share an investigation link.
- **Apply** runs the query; **Reset** clears all fields and returns to the
  unfiltered newest-first view.
- Invalid date range (from after to) blocks Apply with an inline error.
- Active filters render as removable chips above the list with a count.
- Entity ids are shown as text; do not turn them into links in v1 (the audit
  must remain readable even if the entity is gone).

---

## 4. Event detail (inline)

Expanded content, full width of the event list, with a top border:

1. **Summary:** human sentence ("M. Santos endorsed OFF-2026-0014 on 17 Oct 2026
   at 14:02").
2. **Status:** `SUBMITTED → ENDORSED` with a text arrow and the same workflow
   labels used elsewhere.
3. **Changes:** readable key/value diff.
   - Changed keys first, two columns: **Before** and **After**, values formatted
     for humans (not raw JSON blobs). Nested objects are flattened with dotted
     keys; arrays render as ordered lists.
   - Unchanged keys collapse under "Unchanged fields (n)" with a toggle.
   - Empty/null before or after renders an em dash.
   - If the event has no diff (e.g. login), show "No field changes recorded."
4. **Context:** actor role, entity type + id, comment excerpt if any.
5. **Request:** IP, user agent (wrapped, monospace), request id (monospace,
   copyable).

Rules:

- Never show secrets: password hashes, tokens, signed URLs, or full object keys
  must be redacted by the API. If a forbidden key appears, render
  "[redacted]" and flag the response in development.
- Long values are clamped with "Show more" inside the detail; do not blow up the
  list height by default.
- Copy request id is the only action in the detail.

---

## 5. States

- Loading: 8 skeleton rows; filter pane stays interactive.
- Empty (no filters): "No audit events yet."
- Empty (filtered): "No events match these filters." + **Clear filters**.
- Error: inline `ErrorState` with request id and Retry; filters preserved.
- Permission denied: page-level state naming the Admin role; no Retry.
- Detail fetch failure: keep the row expanded with an inline retry, not a modal.
- Very long user agent / diff: internal scroll within the detail, capped height.

---

## 6. Acceptance checklist

- [ ] Only ADMIN can open the audit log; others see permission denied.
- [ ] Two-pane layout with a 320 px filter pane at ≥1280 px and a collapsible
      filter section below.
- [ ] Filters include actor, action, entity type, entity id, date range, and
      status change; Apply/Reset work; dates use Asia/Manila boundaries.
- [ ] Filters are URL state and render removable chips.
- [ ] Event rows show timestamp, actor + role, action, entity, and status arrow
      as text, newest first.
- [ ] Row click expands detail inline beneath the row (not a drawer), one at a
      time, with `aria-expanded`.
- [ ] Detail shows summary, status change, before/after diff with changed keys
      first and unchanged collapsed, comment excerpt, IP, user agent, and
      copyable request id.
- [ ] Secrets are redacted; long values clamp with Show more.
- [ ] Pagination is 50 per page and fixed.
- [ ] Loading, empty, filtered-empty, error, denied, and detail-retry states are
      implemented.
- [ ] No export, edit, delete, purge, or undo action exists.
- [ ] `pnpm lint`, `pnpm typecheck`, and `pnpm build` results reported.

## 7. Out of scope

- Server-side audit writes, redaction rules, and request-id capture (API).
- Exporting audit data, retention/purge tooling, and alerting.
- Linking entities to their live pages (event ids may reference deleted rows).
- Real-time tailing of events.

## 8. Open questions

1. Should the audit log support exporting a CSV/JSON for investigations? Explicitly
   out of scope in v1 per the source.
2. Are audit events ever purged? Retention is a project decision; the UI assumes
   append-only.
3. Should entity ids become links when the entity still exists? This spec keeps
   them as text for consistency.
