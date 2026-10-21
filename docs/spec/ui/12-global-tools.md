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
                    ┌──────────────────────────────────────────┐
                    │ [ Search pages and reports…         ]    │
                    ├──────────────────────────────────────────┤
                    │ PAGES                                    │
                    │  Work inbox                              │
                    │  My reports                              │
                    │  Review queue                            │
                    │ REPORTS                                  │
                    │  OFF-2026-0014  Coastal cleanup  Submitted│
                    │  INC-2026-0009  Outreach program  Endorsed│
                    └──────────────────────────────────────────┘
```

- Centered overlay near the top of the viewport, max 560 px wide; backdrop
  dims the page. Mobile widths are irrelevant (<1024 px shows the notice).
- Search input autofocuses; placeholder "Search pages and reports…".
- Empty query shows **Pages** (role-filtered nav destinations) only, in nav order:
  Home, Reports, Queues (if allowed), Repository (if allowed), Admin (if allowed),
  Profile, Notifications. Reports are not listed until the user types at least
  2 characters.
- Typing queries pages by label and reports by tracking number or title
  (debounced). Results group under **Pages** and **Reports**.
- Report rows show tracking number (monospace), title, status badge. Page rows
  show the label and a one-line description.
- Highlight the matched substring in results.
- ↑/↓ move the active option; Enter opens it; Tab does not leave the dialog;
  Escape closes and restores focus.
- Clicking a result opens it in the same tab.
- No results: "No pages or reports match." with the query echoed.
- Loading reports: a single quiet row "Searching reports…"; never block page
  results on the report request.
- Report search failure: show page results with an inline "Reports could not be
  searched. Retry." Do not fail the whole palette.
- Recent items and actions are out of scope.

### Permissions

- Pages are exactly the nav destinations the role can see (foundation §3.2):
  Submitters never see Queues, Repository, or Admin.
- Reports are limited to the user's access scope; the API enforces it, and the
  palette must not request broader results.
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
- Palette: initial pages, typing/loading, results, no results, report-search
  error, and permission-filtered-empty are all required.
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
- [ ] `Ctrl/Cmd+K` opens the palette and prevents the browser shortcut.
- [ ] Empty query lists only role-allowed pages in nav order; typing ≥2 characters
      searches pages and reports.
- [ ] Results group Pages/Reports, show tracking/title/status for reports,
      highlight matches, and support ↑/↓/Enter/Escape.
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
3. Is `Ctrl/Cmd+K` acceptable in the Tauri webview, or does it conflict with a
   native menu shortcut? Verify on Windows before shipping.
