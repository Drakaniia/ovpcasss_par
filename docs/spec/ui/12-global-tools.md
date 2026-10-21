# Phase 12 — Global tools: shortcut help and command palette

**Milestone:** M5
**Routes:** none (dialogs over the current screen)
**Depends on:** 00 (shortcut registry, `Kbd` primitive, dialog/sheet primitives)
**Source:** `par-ui-ux-spec.md` §7.18, §8.9, §5.3 (avatar menu), §14 Q12

Two global tools that make the system feel fast without becoming a requirement:
a help sheet that documents every shortcut, and a command palette for jumping to
pages and reports. Actions inside the palette are **deferred** until the open
question is answered.

---

## 1. Context for this run

- Shortcut help is opened with `?` and from the avatar menu ("Keyboard
  shortcuts"). It is a dialog, not a route.
- The palette is opened with `Ctrl/Cmd+K`. It is a dialog, not a route.
- Neither tool may expose a destination the user cannot access. Palette results
  are filtered by role exactly like the nav.
- Single-letter shortcuts are suppressed in inputs, textareas, and the narrative
  editor. `?` and `/` are also suppressed while typing.
- Both dialogs trap focus, close on Escape, restore focus to the trigger, and are
  labelled for screen readers.
- Every shortcut has a visible mouse path. The help sheet exists so users can
  discover them, not so shortcuts become the only way.

---

## 2. Shortcut registry

Implemented in phase 00; this phase consumes it to render help and to resolve
palette shortcuts.

| Scope  | Key              | Action                                    |
| ------ | ---------------- | ----------------------------------------- |
| Global | `/`              | Focus search (Repository or table filter) |
| Global | `Ctrl/Cmd+K`     | Command palette                           |
| Global | `?`              | Shortcut help                             |
| Global | `Esc`            | Close drawer/dialog                       |
| Tables | `j` / `k` or ↓/↑ | Move row focus                            |
| Tables | `Enter`          | Open focused row                          |
| Report | `R`              | Return (opens drawer)                     |
| Report | `E`              | Endorse                                   |
| Report | `A`              | Approve                                   |
| Wizard | `→` / `←`        | Next / Back step                          |
| Wizard | `Ctrl/Cmd+S`     | Save draft                                |

Rules:

- Single-letter shortcuts (`j`, `k`, `R`, `E`, `A`, `?`) never fire when focus is
  in an input, textarea, select, contenteditable, or the narrative editor.
- The wizard's `→` / `←` never fire while a text field, an open dialog, or a
  widget that already handled the arrow holds it; `Alt` + arrow moves steps even
  while typing.
- `Esc` closes the topmost layer only: palette → help → drawer → menu.
- Shortcuts do not fire while a modal or drawer has focus, except `Esc` and the
  report shortcuts that the drawer itself documents.
- `Ctrl/Cmd+S` prevents the browser save dialog only inside the wizard.
- `R`/`E`/`A` exist only on report detail pages and only for the role that owns
  the action.

---

## 3. Shortcut help dialog

- Opened by `?` anywhere outside a text field, and from the avatar menu.
- Centered dialog, max 560 px, one scroll region; title "Keyboard shortcuts",
  close button, `Esc` closes.
- Four groups in this order: **Global**, **Tables**, **Report actions**,
  **Forms**. Each row: action label left, `<kbd>` chips right. Alternate keys
  render as two chips ("Ctrl" "K") with a thin separator.
- Show the platform-correct modifier: `Cmd` on macOS, `Ctrl` elsewhere. Do not
  show both unless the platform cannot be detected.
- Footer note: "Shortcuts are disabled while typing."
- No search field, no customization/reset, no printable version in v1.
- `Report actions` entries appear for all users who can reach a report; they are
  not role-filtered in help (the actions themselves are).
- Focus starts on the close button or the dialog container; Tab cycles within.

---

## 4. Command palette (derived)

The source lists `Ctrl/Cmd+K` as "jump to report, page, or action" but does not
specify the screen, and §14 Q12 asks whether actions belong in v1. **This phase
builds pages and reports only.** Do not add approve/export actions until the
question is answered.

### Layout

```
        ┌──────────────────────────────────────────────────────────────┐
        │ [ Search pages and reports…                                ] │
        ├───────────────────────────────┬──────────────────────────────┤
        │ PAGES                         │ OFF-2026-0014     Submitted  │
        │  Work inbox                   │ Coastal cleanup              │
        │  My reports                   │ Submitted by  M. Santos      │
        │  Review queue                 │ Unit          College of ... │
        │ RECENT                        │ Activity      12–13 Mar 2026 │
        │  OFF-2026-0014 Coastal cleanup│ Type          Off-campus     │
        │  INC-2026-0009 Outreach prog. │ ┌──────────────────────────┐ │
        │                               │ │ …the cleanup along the   │ │
        │                               │ │ breakwater…              │ │
        │                               │ └──────────────────────────┘ │
        │                               │ Recently updated             │
        ├───────────────────────────────┴──────────────────────────────┤
        │ ↑ ↓ to move        Enter to open        Esc to close        │
        └──────────────────────────────────────────────────────────────┘
```

- Centered overlay near the top of the viewport (11 vh), max 820 px wide, two
  panes: results left (360 px), preview right. Under 780 px viewport width the
  preview is dropped and the list keeps the full width; <1024 px still shows the
  foundation notice instead of the app.
- The surface arrives as a material — opacity, a 2 px lift, and a blurred edge
  clearing in 180 ms — and leaves along the same path in 140 ms. Under
  `prefers-reduced-motion: reduce` both are instant. A result that is chosen
  navigates immediately; the exit animation is never on the path of an action.
- Search input autofocuses; placeholder "Search pages and reports…".
- Empty query shows **Pages** (role-filtered nav destinations) in nav order:
  Home, Reports, Queues (if allowed), Repository (if allowed), Admin (if
  allowed), Profile, Notifications — then **Recent**: the five reports the
  viewer touched most recently, so the palette opens on documents rather than
  only navigation. Recent is not a match: it carries no match reason.
- Typing queries pages by label and reports server-side (debounced 200 ms) once
  the query reaches **2 characters**. Results group under **Pages** and
  **Reports**; the Recent group disappears at that point.
- Report matching is ranked, not merely filtered. A report matches on tracking
  number, title, narrative, location, submitter name, or a person in charge;
  results order exact tracking number → tracking prefix → title prefix → title
  contains → narrative → location → submitter → person in charge, and within a
  rank by most recently updated.
- Report rows show tracking number (monospace, tabular), title, status badge.
  Page rows show the label and a one-line description.
- Highlight the matched substring in result rows and in the preview excerpt.
- **Preview** follows the active option without opening it: tracking number,
  status, title, submitter, unit, activity dates, type, and — for a narrative
  match — an excerpt around the hit with the hit marked. A page shows its
  description. The last line names why the report was found ("Found in the
  narrative", "Recently updated") or what Enter does.
- ↑/↓ move the active option and the preview follows; Enter opens it; Tab does
  not leave the dialog; Escape closes and restores focus. Pointing at a row
  makes it active, so the preview tracks the mouse too.
- Clicking a result opens it in the same tab.
- No results: "No pages or reports match." with the query echoed.
- Loading reports: a single quiet row "Searching reports…"; never block page
  results on the report request.
- Report search failure: show page results with an inline "Reports could not be
  searched. Retry." Do not fail the whole palette.
- Footer shows the three keys (↑ ↓, Enter, Esc) as chips: the palette has no
  mouse-only step, and its keyboard path is discoverable without the help sheet.
- Actions are still out of scope (§14 Q12).

### Permissions

- Pages are exactly the nav destinations the role can see (foundation §3.2):
  Submitters never see Queues, Repository, or Admin.
- Reports are limited to the user's access scope; the API enforces it, and the
  palette must not request broader results. The server applies the same rule as
  `canViewReport`: a Submitter searches their own reports, Reviewers, Approvers,
  and Admins search every report. The palette never sends a role or owner
  filter of its own — it asks `/reports/search` and shows what comes back.
- Profile and Notifications are available to all signed-in users.

### Accessibility

- Use a combobox + listbox pattern: input has `role="combobox"`,
  `aria-expanded`, `aria-controls`, `aria-activedescendant`; results are
  `role="listbox"` with `role="option"`.
- Announce the result count via a polite live region.
- Focus stays in the input while arrow keys move the active option.
- The dialog has an accessible name ("Command palette").

---

## 5. States

- Help dialog: no loading or error states; it is static content from the
  registry.
- Palette: initial pages with the recent group, typing/loading, results, no
  results, report-search error, preview for a report and for a page, and
  permission-filtered-empty are all required.
- Both dialogs: Escape restores focus; opening one closes the other; background
  scroll is locked.
- Reduced motion: open/close respects `prefers-reduced-motion`.

---

## 6. Acceptance checklist

- [ ] `?` opens the help dialog outside text fields and from the avatar menu;
      `Esc` closes and restores focus.
- [ ] Help groups are Global, Tables, Report actions, Forms; every shortcut in the
      registry is listed; keys render as `<kbd>`; the "disabled while typing" note
      is present.
- [ ] Modifier labels are platform-correct.
- [ ] `Ctrl/Cmd+K` opens the palette and prevents the browser shortcut,
      including while the caret is in a text field or table filter.
- [ ] Empty query lists role-allowed pages in nav order, then up to five
      recently updated reports; typing ≥2 characters searches pages and reports
      and drops the recent group.
- [ ] Results group Pages/Reports, show tracking/title/status for reports,
      highlight matches, and support ↑/↓/Enter/Escape.
- [ ] Reports match on tracking number, title, narrative, location, submitter,
      and person in charge, in the ranked order above.
- [ ] The preview follows the active row and names the match reason; choosing a
      result navigates without waiting for the exit animation.
- [ ] Palette never shows pages or reports the user cannot access.
- [ ] No result, loading, and report-search-error states behave as specified.
- [ ] Both dialogs trap focus, have accessible names, lock background scroll, and
      respect reduced motion.
- [ ] Escape closes only the topmost layer.
- [ ] Single-letter and `?` shortcuts do not fire while typing.
- [ ] `pnpm lint`, `pnpm typecheck`, and `pnpm build` results reported.

## 7. Out of scope

- Actions (approve, return, export) inside the palette; deferred by §14 Q12.
- Shortcut customization, conflict detection, and printable cheat sheets.
- Recent searches, fuzzy scoring UI, and cross-entity search beyond pages and
  reports.
- Mobile layouts.

## 8. Open questions

1. Palette scope: pages and reports only in v1, or actions too? This phase ships
   the former. If actions are added, they need the same permission checks and
   confirmation flows as the buttons.
2. Should help be role-filtered (reviewers see Report actions, submitters not) or
   complete for everyone? This spec keeps it complete.
3. ~~Is `Ctrl/Cmd+K` acceptable in the Tauri webview, or does it conflict with a
   native menu shortcut?~~ Resolved 2026-10-21: the shell draws its menu bar in
   HTML and installs no native accelerator for `K`, so the chord reaches the
   webview; verified in the browser build and with `pnpm --filter @par/desktop
dev`. The only interception is the first-run tour, which owns the layer by
   design (§3).
