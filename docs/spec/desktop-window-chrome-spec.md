# Desktop Window Chrome Spec

Status: ready to implement
Date: 2026-10-20
Applies to: `apps/web` shell + `apps/desktop` (Tauri 2, Windows)
Related: `docs/spec/par-ui-ux-spec.md` §8.6, `docs/spec/ui/15-desktop-shell.md`,
`docs/spec/startup-splash-spec.md`

A real Windows titlebar drawn by the app: drag, maximize, restore, close, Snap
Layouts, edge resizing, remembered window bounds, a working application menu,
and browser parity for everything except the OS window.

---

## 1. Purpose

Replace the native Windows caption with a branded, app-drawn titlebar that still
behaves like a native window, and give the desktop app a real menu bar. The menu
must invoke real commands, not decorative placeholders.

The titlebar and the application header are one surface on desktop: brand,
menus, tools, and window controls share a single 44 px navy bar. Primary
navigation moves to the section-tab row that already exists below it, producing
two compact rows instead of today's 56 px header plus 40 px tab row.

The browser build renders the same menu strip inside its header, but has no
window controls, no drag regions, and no Window menu.

---

## 2. Verified current state

| Fact | Evidence |
| --- | --- |
| Main window is undecorated? No. `decorations` is unset for `main`; only `splash` sets it. | `apps/desktop/src-tauri/tauri.conf.json:14-24` |
| Main window is created hidden and revealed by the splash handoff. | `tauri.conf.json:21-22`; `src/startup.rs:99-121` |
| Splash spec is implemented (state, commands, timeout, tests). | `src/startup.rs`, `src/lib.rs:302-320` |
| No custom titlebar, drag region, window state, or menu model exists. | repo search |
| Shell capability has no window-control permissions. | `src-tauri/capabilities/default.json` |
| `@tauri-apps/api` 2.12.4 is already a web dependency; `@tauri-apps/plugin-updater` 2.14.0. | `apps/web/package.json` |
| Header is 56 px, navy, with brand, inline primary nav, search, notifications, avatar. | `AppHeader.svelte:113-122` |
| Section tabs are a separate 40 px row; hidden when one tab or on the wizard. | `SectionTabs.svelte:14-31` |
| Layout already knows the desktop shell (`html.desktop-shell`) and bare auth routes. | `routes/+layout.svelte` |
| Wizard has `saveDraft(): Promise<boolean>`, `draft.dirty`, autosave every 20 s, leave guard. | `wizard-page.svelte.ts:130-140,212-214,393-395` |
| Edit-returned has `dirty` (derived) and `saveChanges(): Promise<boolean>`. | `edit-returned-state.svelte.ts:107-113,301` |
| Wizard owns Ctrl+S inside `wizardKeyAction`; PrintPreview owns Ctrl+P. | `wizard-page.svelte.ts:369-381`; `PrintPreview.svelte` |
| Platform contract already carries `Updater` and `StartupGate`. | `platform/contracts.ts:43-72` |
| `lib.rs` is 325 lines; adding modules must not push it past 400. | `src/lib.rs` |

---

## 3. Scope

### In scope

- App-drawn 44 px titlebar (desktop) and matching browser header row.
- Brand seal as a drag surface; wordmark remains a link to `/`.
- Application menus: File, Edit, View, Window (desktop only), Help.
- Real command wiring, role/route availability, disabled reasons, accelerators.
- Window controls with native Windows metrics and behavior.
- Native drag, double-click maximize, Aero Snap while dragging.
- Snap Layouts on the maximize button, edge/corner resizing.
- Remembered bounds and maximized state, applied before the first reveal.
- WebView zoom (desktop only) persisted across restarts.
- Full screen with auto-hiding chrome.
- Unsaved-changes guard on window close for the wizard and edit-returned page.
- About dialog with version and an inline update check.
- Slim window bar on desktop auth routes.
- Browser parity: menus and commands, no OS-window affordances.

### Out of scope

- macOS/Linux chrome. The app is Windows-only.
- Native system menu on right-click, Alt+Space custom menu, jump lists, tray.
- Submenus, menu search, customizable/rearranged menus, menu icons.
- Multi-window support or tab tear-off.
- A custom Snap Layout flyout; Windows draws it.
- Offline outbox or download queue changes.
- Menu localization or theme switching.
- Window-state plugin; persistence is a small Rust module.

### Anti-goals

- Reimplementing native caption drawing (we own the pixels and the hit test).
- A web-style "app launcher" menu with oversized rows.
- Gold as a button color; the only new red is the system close-hover red.
- A second header row on desktop; the nav row is the only new row.
- New dependencies for menus, dialogs, window state, or icons.

---

## 4. Decisions

| # | Decision |
| --- | --- |
| D1 | Full custom titlebar. `decorations: false`; the app owns drag, identity, menus, controls. |
| D2 | One titlebar surface combining brand, menus, and tools. |
| D3 | Menu items map to real commands, never placeholders. |
| D4 | Branded navy chrome using existing tokens (`--surface-topbar`, gold accent). |
| D5 | Primary nav moves to the section-tab row: nav left, section tabs right. |
| D6 | Window buttons use native Windows metrics: 46x32 targets, 44 px bar, system glyphs, `#c42b1c` close hover, restore glyph when maximized. |
| D7 | Native behavior: drag, double-click maximize, Aero Snap, edge resize, Snap Layouts. Keep the "add native support" option, not a pure visual replica. |
| D8 | Gestures: drag and double-click only. No right-click system menu. |
| D9 | Standard Windows menus: File, Edit, View, Window, Help. |
| D10 | Accelerators are displayed and actually bound, except Alt+F4 which Windows owns. |
| D11 | Unavailable commands are disabled with a reason, never silently missing (role gating included). |
| D12 | Closing with unsaved editor changes prompts: Save and close / Discard and close / Cancel. A failed save keeps the window open. |
| D13 | Guarded screens: the new-report wizard and the edit-returned page. Other routes close immediately. |
| D14 | Browser gets the menu strip; no window controls, no drag, no Window menu. |
| D15 | Full screen hides the chrome; moving the pointer into the top edge reveals it. |
| D16 | About: identity, version, runtime, inline update check. |
| D17 | Menu keyboard model is the Windows menubar pattern (Alt mnemonics, F10, arrows, hover switch, Esc). |
| D18 | Desktop auth routes get a slim 44 px bar: seal, drag, three controls. No menus. |
| D19 | Native behavior ships via a small hand-written Rust hit-test module (`windows` crate), not a plugin. |
| D20 | Remember size, position, maximized state, clamped to a visible monitor. |
| D21 | Zoom 50-200 % in 10 % steps, persisted; brief percentage indicator. |
| D22 | Developer tools exist only in development builds. |
| D23 | Titlebar is 44 px; minimum window is 1024x700. |
| D24 | Windows 11 rounded corners plus shadow; square when maximized (system behavior). |
| D25 | The nav row remains visible on the wizard (focus mode hides section tabs only), so navigation never disappears. |
| D26 | Sign out and Reload are disabled while an editor has unsaved changes; the user must save or discard first. |
| D27 | Snapshot menus are not added to the web app outside the header row. |

---

## 5. Layout

### 5.1 Chrome routes (desktop and browser)

```
+----------------------------------------------------------------------------+
| 44 px  [seal] Paperless PAR | File Edit View Window Help |  search  bell  avatar | - [] X |
+----------------------------------------------------------------------------+
| 40 px  [Reports  Queues  Repository  Admin]                 [section tabs]                |
+----------------------------------------------------------------------------+
| page content                                                                              |
+----------------------------------------------------------------------------+
```

- Row 1: `TitleBar` replaces `AppHeader`. Height 44 px.
- Row 2: `NavigationRow` extends today's `SectionTabs`: primary nav on the left,
  section tabs pushed right. Styled on `--surface-card`, not navy.
- Both rows are sticky at the top; menus and tooltips render above content.
- The wizard shows primary nav but no section tabs (D25).
- Home shows primary nav only, so row 2 is still present.
- No additional rows are introduced.

### 5.2 Titlebar anatomy

| Zone | Content | Drag |
| --- | --- | --- |
| Brand | Seal (28 px) + wordmark "Paperless PAR" | Seal is a drag surface; wordmark is a link to `/` |
| Menus | File, Edit, View, Window, Help | No |
| Spacer | Flexible empty area | Yes; double-click maximizes |
| Tools | Search (opens palette), notifications, avatar menu | No |
| Controls | Minimize, Maximize/Restore, Close | No |

Desktop tools reuse `CommandPalette` trigger, `NotificationBell`, `AvatarMenu`.
Browser tools keep the same three. Search width shrinks before labels truncate.

### 5.3 Window controls

- Container: 46 px wide per button, 32 px tall, flush to the right edge; 6 px
  top/bottom inset inside the 44 px bar.
- Glyphs: 10x10 inline SVG matching Segoe Fluent weights (1 px stroke): minus,
  square, two overlapping squares for restore, X.
- Hover: `--topbar-hover` for minimize/maximize; `--window-close-hover`
  (`#c42b1c`) with white glyph for close. Active states are one step darker.
- Maximize tooltip becomes "Restore" while maximized.
- The maximize button reserves its Snap Layout hit region; the glyph is driven
  by `isMaximized()` and updates on every resize event.
- Buttons are real `<button>` elements with `aria-label` and keyboard support.
  Mouse hits on the maximize button are handled by Rust (see §9.3) so Snap
  Layouts work; keyboard activation stays in the frontend.

### 5.4 Auth routes (desktop)

- 44 px navy bar, no menus, no nav, no tools.
- Left: seal only. The remaining area is draggable.
- Right: the same three window controls.
- Wordmark is omitted; the seal is decorative (`aria-hidden`).
- Browser auth routes keep their current bare layout with no bar.

### 5.5 Full screen

- Chrome hides completely; content occupies the full window.
- A 4 px top hover zone reveals the titlebar over the content after 150 ms.
- It stays while a menu is open or focus is inside the chrome; it hides 1200 ms
  after the pointer leaves both the zone and the bar.
- `Esc` exits full screen; `F11` toggles; the View item shows a check when on.
- Browser uses the Fullscreen API with the same reveal behavior.

### 5.6 Narrow widths

- Desktop enforces 1024x700, so the chrome never collapses.
- Browser below 1024 px keeps the existing foundation notice; chrome is not
  redesigned for mobile.

---

## 6. Visual specification

All values use tokens; no raw hex in components except the two new tokens.

| Token | Value | Use |
| --- | --- | --- |
| `--window-close-hover` | `#c42b1c` | Close hover only |
| `--window-close-active` | `#b0261a` | Close pressed |
| `--titlebar-height` | `44px` | Row height |
| `--window-control-width` | `46px` | Each control |
| `--window-control-height` | `32px` | Control target |
| `--menu-panel-width` | `240px` | Minimum panel width |

Reuse: `--surface-topbar` (bar), `--text-on-topbar`, `--text-topbar-muted`,
`--topbar-hover`, `--topbar-border`, `--brand-gold-400` (open-menu accent),
`--surface-card`, `--text-secondary`, `--text-primary`, `--brand-navy-800`
(nav active), `--shadow-raised`, `--border`, `--brand-maroon-800` (discard
action text only, never a filled button).

### 6.1 Titlebar

- Background `--surface-topbar`; bottom border `--topbar-border`; no shadow.
- Wordmark: 13 px, 600 weight, `--text-on-topbar`, tracked -0.01em.
  "Paperless PAR" with "OVPCASSS" omitted in the bar (the seal carries it).
- Menu trigger: 13 px, `--text-topbar-muted`, 10 px horizontal padding, 28 px
  tall, 4 px radius. Hover/open: `--topbar-hover`, text white.
- Open trigger gets a 2 px `--brand-gold-400` inset bottom rule, aligned to the
  bar's bottom edge. This is the only gold in the chrome.
- No text selection inside the bar.
- Focus ring: 2 px `--brand-gold-400` outside the control, visible on navy.

### 6.2 Menu panel

- Anchored under its trigger, left-aligned, 4 px gap, radius 8 px, border
  `--border`, background `--surface-card`, `--shadow-raised`, min-width 240 px,
  max-height `calc(100vh - 56px)` with internal scroll.
- Padding 4 px; item height 32 px; 13 px text; 12 px inline padding; 4 px radius.
- Accelerator right-aligned, 12 px, `--text-muted`, 16 px left gap.
- Separator: 1 px `--border`, 6 px vertical margin, inset 8 px.
- Item hover/focus: `--surface-page`. No gold, no filled rows.
- Disabled: 50 % text opacity, `aria-disabled="true"`, still focusable so the
  reason is announced; reason attached via `aria-describedby`.
- Checkable item (Full screen): leading 16 px check column; check glyph is navy.
- Open/close motion: 120 ms fade plus 2 px upward settle; none under
  `prefers-reduced-motion: reduce`.
- Only one panel is open.

### 6.3 Navigation row

- 40 px, `--surface-card`, inset bottom border, existing max-width 1440 px and
  24 px inline padding.
- Primary nav left: 14 px, `--text-secondary`; active gets a 2 px
  `--brand-navy-800` underline and primary text. Hover `--surface-page`.
- Section tabs keep their current style, right-aligned with `margin-left:auto`.
  No separator between the groups; spacing is 24 px.
- Order: primary nav, flexible spacer, section tabs. If the row cannot fit at
  1024 px, section tabs scroll horizontally; primary nav never scrolls.

### 6.4 Tabs removal from header

`AppHeader.svelte` is replaced, not extended. The nav markup moves to
`NavigationRow.svelte`. Existing `navigation.ts` predicates and role filtering
are reused unchanged. `AppHeader` is deleted once nothing imports it.

---

## 7. Menu model

Every item has a stable command id. Availability is derived; labels and
accelerators are static except Maximize/Restore.

### 7.1 File

| Item | Command id | Accelerator | Enabled when | Disabled reason |
| --- | --- | --- | --- | --- |
| New report | `file.new-report` | Ctrl+N | `actsAs(role, 'SUBMITTER')` | "Requires Submitter access." |
| Save draft | `file.save-draft` | Ctrl+S | An editor guard is active and dirty and not saving | "Available while editing a report." / "No unsaved changes." / "Saving…" |
| Print | `file.print` | Ctrl+P | The print command is registered by `PrintPreview` | "Open a report to print." |
| Export | `file.export` | — | Repository access (`canSearchRepository`) | "Requires repository access." |
| Sign out | `file.sign-out` | — | Signed in and no dirty editor guard | "You are not signed in." / "Save or discard your draft first." |
| Exit | `file.exit` | Alt+F4 (OS) | Always | — |

Behavior:

- New report: `goto('/reports/new')`. If already there, focus the current
  step's first field instead of resetting state.
- Save draft: invoke the registered editor save. Success keeps the window open
  and shows the editor's existing saved state.
- Print: invoke the registered print action. The action is `window.print()`.
- Export: `goto('/exports')`.
- Sign out: existing `signOut()` then `goto('/login')`; disabled while dirty.
- Exit: request window close (guard applies).
- Separator between Export and Sign out.

### 7.2 Edit

| Item | Command id | Accelerator | Enabled when |
| --- | --- | --- | --- |
| Undo | `edit.undo` | Ctrl+Z | An editable target is focused and has undo history |
| Redo | `edit.redo` | Ctrl+Y | An editable target is focused and has redo history |
| Cut | `edit.cut` | Ctrl+X | Editable target focused with a non-empty selection |
| Copy | `edit.copy` | Ctrl+C | Any non-empty selection, editable or read-only |
| Paste | `edit.paste` | Ctrl+V | Editable target focused |
| Select all | `edit.select-all` | Ctrl+A | Editable target focused, or page text selection available |

Rules:

- Acts on the focused target only; never on the page globally.
- Run with WebView2 edit commands (`document.execCommand`). No new dependency.
- Disabled reasons: "No editable field is focused." / "Select text first." /
  "Nothing to undo." / "Nothing to redo."
- Menu items are enabled/disabled on open and on focus changes; the list is
  recomputed each time the menu opens.
- Accelerators are not intercepted when the event target is not editable,
  except Cut/Copy/Paste/Select all, which are no-ops with a reason.
- Ctrl+A inside an input selects input text, not page text.

### 7.3 View

| Item | Command id | Accelerator | Availability |
| --- | --- | --- | --- |
| Reload | `view.reload` | Ctrl+R | Enabled unless a dirty editor guard is active |
| Zoom in | `view.zoom-in` | Ctrl++ | Desktop only, 50-200 % |
| Zoom out | `view.zoom-out` | Ctrl+- | Desktop only, 50-200 % |
| Actual size | `view.zoom-reset` | Ctrl+0 | Desktop only |
| Full screen | `view.fullscreen` | F11 | Both shells; checkable |
| Developer tools | `view.devtools` | Ctrl+Shift+I | Development desktop builds only |

- Reload disabled reason: "Save or discard your draft first."
- Zoom items are hidden in the browser; Ctrl +/- keeps native browser zoom.
- Full screen: browser uses `document.documentElement.requestFullscreen()`.
- Devtools item is not rendered in release or web builds.

### 7.4 Window (desktop only)

| Item | Command id | Accelerator |
| --- | --- | --- |
| Minimize | `window.minimize` | — |
| Maximize / Restore | `window.toggle-maximize` | — (double-click titlebar) |
| Close | `window.close` | Alt+F4 (OS) |

- The whole Window menu is omitted in the browser (D14).
- Labels track state: "Maximize" ↔ "Restore".
- Close uses the same guarded path as the titlebar button.

### 7.5 Help

| Item | Command id | Accelerator |
| --- | --- | --- |
| Keyboard shortcuts | `help.shortcuts` | ? |
| About Paperless PAR | `help.about` | — |

- Keyboard shortcuts opens the existing shortcuts dialog from `shortcuts.ts`.
- `?` keeps its existing typing suppression rule.

### 7.6 Global rules

- Menus close on route change, window blur, outside click, `Esc`, and after a
  command runs (unless the command opens a dialog).
- Hovering another top-level item while a menu is open switches immediately.
- Clicking the open trigger closes it.
- Role checks go through `actsAs` so Admin stands in for every role.
- Menu labels use the office's terms: Post-Activity Report, tracking number,
  endorsement, approval, return.

---

## 8. Interaction and keyboard

### 8.1 Mouse

- Drag surfaces: brand seal, titlebar spacer, and the whole auth slim bar
  except its controls.
- Double-click a drag surface toggles maximize.
- Drag to a screen edge or corner snaps (Aero Snap), because dragging uses the
  native move loop.
- Resize from any edge or corner with a 6 logical px band.
- Right-click on the bar does nothing; the page's context menu is not replaced.
- Window controls: single click. Close is guarded when an editor is dirty.

### 8.2 Menubar keyboard (Windows pattern)

- `Alt` alone or `F10` focuses the first menu trigger; focus ring visible.
- `Alt+<letter>` opens that menu: F, E, V, W, H.
- Mnemonic letters are underlined only while Alt is held or the bar has focus.
- `Left`/`Right` move between top-level menus; wrapping at the ends is allowed.
- `Down`/`Up` move within a menu, wrapping; `Enter`/`Space` activate.
- `Home`/`End` jump to first/last item.
- Typing a letter jumps to the first matching item.
- `Esc` closes the panel and returns focus to its trigger; a second `Esc`
  leaves the menubar.
- `Tab` closes the menu and moves focus normally.
- Opening a menu with the mouse does not steal keyboard focus from the page
  until an arrow key is pressed.
- While typing in a field, Alt mnemonics still work; plain-letter shortcuts do
  not (existing suppression).

### 8.3 Accelerators

- One handler at the chrome root. It runs before component handlers, checks
  `defaultPrevented`, ignores `isComposing`, and matches `Ctrl` without `Alt`
  (avoids AltGr).
- It prevents the default only when the command exists, regardless of enabled
  state, so Ctrl+P never opens the browser print dialog inside the app.
- Disabled accelerators do nothing; the reason lives in the menu.
- `Ctrl+S`, `Ctrl+P`, and `Ctrl+R` are single-sourced here. The wizard's save
  branch and PrintPreview's local Ctrl+P listener are removed to prevent double
  execution; the wizard keeps its Enter/step keys.
- Alt+F4 is not intercepted; Tauri forwards it to the same close path.

### 8.4 Zoom

- Range 50-200 % in 10 % steps; persists in `localStorage["par.window.zoom"]`.
- Applied on chrome mount; a brief 100 % paint is acceptable.
- `Ctrl+=`/`Ctrl++`/numpad add zoom in; `Ctrl+-`/numpad subtract zoom out;
  `Ctrl+0` resets.
- A small bottom-right pill shows "125 %" for 1200 ms, `aria-live="polite"`,
  never color-only.
- Zoom does not affect the titlebar or menu panel (they are fixed-size chrome).
- If the installed Tauri API cannot set webview zoom, add one Rust command using
  WebView2 `SetZoomFactor`; the frontend contract stays the same.

### 8.5 Full screen reveal

- Reveal zone: top 4 px of the viewport.
- Pointer inside the bar or a menu: keep visible.
- Keyboard focus inside the bar: keep visible.
- Leave delay: 1200 ms. Menus are closed before hiding.
- Maximize/restore and close stay available in full screen.

### 8.6 Close guard

Trigger: titlebar Close, File > Exit, Window > Close, Alt+F4, or OS close.
Path: Tauri `onCloseRequested`.

1. If no guard is registered or the active guard is clean, close immediately.
2. Otherwise `preventDefault()` and open the close dialog.
3. Dialog title: "Save your changes before closing?"
   Body tells which report has unsaved changes.
4. Actions:
   - Primary (filled navy): "Save and close".
   - Secondary: "Discard and close" (`--brand-maroon-800` text, not filled).
   - Tertiary: "Cancel" (default focus).
5. "Save and close" calls the registered save:
   - `true`: destroy the window (`destroy()`, bypassing the guard).
   - `false`: keep the window open, close the dialog, let the editor surface
     its own validation/save error. The guard stays armed.
6. "Discard and close": destroy without saving; existing saved drafts remain.
7. Cancel: stay; focus returns to the element that requested close.
8. While saving, the primary button shows a busy state and the dialog cannot be
   dismissed with `Esc` or backdrop click.
9. OS shutdown/logoff is not interceptable reliably; out of scope.

Only one guard is active: the wizard registers while mounted, edit-returned
registers while mounted. Last registration wins; disposal restores the previous.

---

## 9. Technical design

### 9.1 Frontend structure

Feature folder: `apps/web/src/lib/features/window-chrome/`
(existing convention is singular feature names; follow it).

```
application/
  command-registry.svelte.ts    reactive commands, availability, disposal
  menu-model.svelte.ts          menus from registry + role + route + shell
  accelerators.ts               key matching and dispatch
  unsaved-guard.svelte.ts       guard registry + close flow state
  zoom.svelte.ts                clamp/persist/apply + indicator state
presentation/
  TitleBar.svelte
  WindowControls.svelte
  MenuBar.svelte
  MenuPanel.svelte
  MenuItem.svelte
  NavigationRow.svelte
  AboutDialog.svelte
  CloseGuardDialog.svelte
  ZoomIndicator.svelte
```

Rules:

- Each file stays under 400 lines; split `MenuPanel` and `MenuItem` if needed.
- No `utils/`, `helpers/`, or `misc/`.
- `TitleBar` composes; it does not own menu state beyond open index.
- Menus derive from `menu-model`, not hard-coded markup.

### 9.2 Platform contract

Extend `platform/contracts.ts`:

```ts
export type WindowShell = 'tauri' | 'web';

export interface WindowChrome {
  readonly shell: WindowShell;
  readonly controllable: boolean;      // false in the browser
  minimize(): Promise<void>;
  toggleMaximize(): Promise<void>;
  isMaximized(): Promise<boolean>;
  close(): Promise<void>;              // goes through the guard
  destroy(): Promise<void>;            // bypasses the guard
  setFullscreen(on: boolean): Promise<void>;
  isFullscreen(): Promise<boolean>;
  setZoom(scale: number): Promise<void>;
  openDevtools(): Promise<void>;
  onResized(listener: () => void): () => void;
  onCloseRequested(listener: (event: { preventDefault(): void }) => void): () => void;
}
```

- Add `chrome: WindowChrome` to `Platform`.
- `platform/tauri/window-chrome.ts` lazily imports `@tauri-apps/api/window` and
  `@tauri-apps/api/webview` so the browser bundle never loads them.
- `platform/web/window-chrome.ts`: no-ops for window calls, `controllable:false`,
  Fullscreen API for full screen, no zoom calls, no devtools.
- Rust-only extra command: `set_maximize_hit_rect` (see §9.5). Exposed through a
  thin wrapper in the Tauri adapter; the web adapter ignores it.

### 9.3 Native window behavior (Rust)

New modules, each kept small:

| File | Responsibility | Target size |
| --- | --- | --- |
| `src/window_chrome.rs` | Subclass main HWND, `WM_NCHITTEST`, maximize hit region, hover events | ~180 lines |
| `src/window_state.rs` | Load/save/clamp bounds JSON | ~140 lines |
| `src/dwm.rs` | Rounded corners; shadow fallback | ~50 lines |

`lib.rs` gains 3 module declarations and setup calls only; it stays under 400.

Hit test, in order:

1. If maximized/minimized/fullscreen, skip resize bands.
2. Convert the screen point to client coordinates; if inside a 6 logical px
   edge/corner band (scaled by `GetDpiForWindow`), return `HTLEFT`, `HTRIGHT`,
   `HTTOP`, `HTTOPLEFT`, `HTTOPRIGHT`, `HTBOTTOM`, `HTBOTTOMLEFT`,
   `HTBOTTOMRIGHT`.
3. If inside the registered maximize-button rectangle (physical px):
   - return `HTMAXBUTTON` (9) so Windows shows the Snap Layout flyout;
   - on `WM_NCLBUTTONDOWN` over that hit, toggle maximize in Rust and consume;
   - emit `window-chrome:maximize-hover` on enter/leave (`WM_NCMOUSEMOVE`,
     `WM_NCMOUSELEAVE`) so the DOM can paint hover, which it will not receive.
4. Otherwise call the previous window procedure.

Notes:

- Drag and double-click do not go through Rust: drag surfaces use
  `data-tauri-drag-region`, which invokes the native move loop (Aero Snap) and
  Tauri's double-click maximize. Manual verification must confirm double-click;
  if it does not work, add an `ondblclick` fallback on drag surfaces.
- Returning `HTMAXBUTTON` means the DOM does not get mouse events over the
  maximize button; the Rust toggle is the mouse path. Keyboard activation calls
  the JS `toggleMaximize()`.
- Keep the previous `WNDPROC` and forward everything unhandled. Use
  `SetWindowSubclass`/`RemoveWindowSubclass`; remove on exit.
- DPI: all rects are physical px. The frontend sends `getBoundingClientRect()`
  multiplied by `devicePixelRatio`, updated on resize, zoom change, and layout
  changes via `ResizeObserver`.
- Tauri may already handle undecorated resizing; these hit-test results are
  compatible and take precedence. Verify all eight directions.

Rounded corners and shadow:

- Call `DwmSetWindowAttribute` with `DWMWA_WINDOW_CORNER_PREFERENCE` =
  `DWMWCP_ROUND` (attribute 33, Windows 11; ignore failure on Windows 10).
- Keep `shadow: true` in config. If the frameless window loses its shadow,
  apply `DwmExtendFrameIntoClientArea` with 1 px margins and a frame change.
  Verify visually on Windows 11; do not fake a CSS shadow outside the window.
- Do not use `transparent: true`.

Window state:

- Path: `app.path().app_config_dir()?/window-state.json`.
- Shape:

```json
{
  "version": 1,
  "x": 120,
  "y": 80,
  "width": 1280,
  "height": 860,
  "maximized": false
}
```

- Values are physical pixels. Read in `setup`, before `frontend_ready` reveals
  the window, so there is no resize flash.
- Track the last normal bounds while not maximized. If closed maximized, restore
  the normal bounds and then maximize.
- Clamp: union of monitor work areas; require at least 160x120 px visible; then
  clamp size to the target work area and enforce 1024x700 minimum. If the saved
  monitor is gone, center on the primary monitor.
- Write atomically (temp file + rename) 400 ms after the last move/resize, and
  once on close request. Failures log in debug and never block closing.
- Corrupt/missing file: use 1280x860 centered, not maximized.
- Pure clamp logic gets `#[cfg(test)]` unit tests (offscreen, too small,
  larger than work area, monitor missing).

### 9.4 Tauri configuration

`tauri.conf.json` main window:

```json
{
  "decorations": false,
  "shadow": true,
  "minWidth": 1024,
  "minHeight": 700,
  "visible": false,
  "focus": false,
  "backgroundColor": [250, 248, 244, 255]
}
```

- Keep the splash handoff as-is; state is applied before the reveal.
- Keep `title` for the taskbar and `identifier`; do not change the app id.
- `center: true` is not added: restored state wins, default fallback centers in
  Rust.
- Do not add `transparent`.

`Cargo.toml`:

- Add `windows` pinned to the exact version already in `cargo tree -i windows`
  (avoid duplicate versions), with features for Foundation,
  WindowsAndMessaging, Dwm, and Controls (`SetWindowSubclass`).
- No window-state plugin, no menu dependency.

`capabilities/default.json` additions (main window behavior; splash remains
listed):

```
core:window:allow-minimize
core:window:allow-toggle-maximize
core:window:allow-is-maximized
core:window:allow-close
core:window:allow-destroy
core:window:allow-set-fullscreen
core:window:allow-is-fullscreen
core:window:allow-start-dragging
core:webview:allow-set-webview-zoom
core:webview:allow-open-devtools
```

- `core:default` already covers event listening. Verify actual permission ids
  against the generated schema before claiming done.
- Devtools permission stays in the default capability but the menu item is
  compiled out of release; note this residue in the implementation report. If a
  build-time split is easy, prefer a dev-only capability file.

### 9.5 Command registry

```ts
interface Command {
  id: string;
  run(): void | Promise<void>;
  enabled: () => boolean;
  disabledReason?: () => string;
}
```

- Built-in commands are registered once by the chrome feature.
- Route commands are registered on mount and disposed on unmount:
  - `file.save-draft` by the wizard (dirty/busy from the wizard state) and by
    edit-returned (dirty/busy from `edit-returned-state`).
  - `file.print` by `PrintPreview`.
- The menu model reads the registry reactively with Svelte 5 runes.
- Accelerators resolve through the same registry, so menu and keyboard can
  never diverge.
- Registering a duplicate id replaces it for the active route; disposal restores
  the previous entry.
- `Ctrl+S` on edit-returned is new behavior; it calls `saveChanges()`.
- `wizardKeyAction` drops its `save` result; update or add its unit test. No
  other caller changes.
- `PrintPreview` removes its local Ctrl+P `<svelte:window>` handler; the
  registered command calls `window.print()`.
- `help.shortcuts` dispatches the existing `par:shortcuts` event used by
  `AppShell`.

### 9.6 About dialog

- Native `<dialog>` (`showModal`), same width/typography as existing dialogs.
- Contents: seal, "OVPCASSS Paperless PAR", office name, version, runtime line,
  and actions.
- Version: `updaterState.currentVersion` when supported; "Browser build" on web.
- Runtime: "WebView2 <major.minor>" parsed from the user agent on desktop; hidden
  in browser and when parsing fails.
- Check for updates:
  - Web: button disabled, reason "Updates are available in the desktop app."
  - Desktop: calls the updater check with auto-install suppressed, shows a
    spinner, then inline "You are up to date.", "Version X is available" with an
    "Install update" action, or "Could not check for updates."
  - Install uses the existing `installUpdate()`; the app exits.
  - Extend `checkForUpdates` with an option to skip idle auto-install while the
    dialog is open; default behavior for startup checks is unchanged.
- Close button is the only filled primary in the dialog.
- `Esc` closes; focus returns to the Help trigger.
- No external links, no update channel switching.

### 9.7 Shell integration

- `AppShell` renders `TitleBar`, `NavigationRow`, page content, and global
  dialogs/toasts.
- `AppHeader.svelte` is removed after `NavigationRow` absorbs nav and the tools
  move into `TitleBar`.
- `SectionTabs.svelte` is folded into `NavigationRow.svelte`; section-tab
  helpers stay in `navigation.ts`.
- The desktop-only chrome class already exists; use
  `html.desktop-shell` for drag/controls, and the platform `controllable` flag
  for behavior (not CSS alone).
- Auth layout renders the slim bar on desktop and nothing on web.
- The foundation notice stays below 1024 px in the browser.

---

## 10. Accessibility

- Menubar semantics: `role="menubar"` with `aria-label="Application"`;
  triggers `role="menuitem"`, `aria-haspopup="menu"`, `aria-expanded`; panels
  `role="menu"`; items `role="menuitem"` with `aria-keyshortcuts`.
- Disabled items use `aria-disabled="true"` and remain focusable; the reason is
  in `aria-describedby`, not only a mouse tooltip.
- Window controls are labeled "Minimize", "Maximize"/"Restore", "Close"; state
  changes are reflected in the label.
- Focus is always visible on navy: 2 px gold ring with 2 px offset.
- Menus restore focus to their trigger on `Esc`; dialogs restore focus on close.
- Full screen reveal also happens on keyboard focus, not pointer only.
- Zoom indicator is a polite live region; status is text, never color alone.
- No keyboard trap; `Tab` always escapes menus and dialogs.
- Reduced motion disables the menu settle and dialog fades.
- Copy in English, formal institutional voice, no exclamation marks.
- One filled navy primary per surface: the close dialog's "Save and close" and
  the About dialog's "Close"/"Install update" (never both visible at once).

---

## 11. Testing

### 11.1 Automated

Vitest (web):

- Menu model: item order, role gating via `actsAs`, route availability,
  disabled reasons, Window menu absent on web.
- Command registry: route registration/disposal, duplicate replacement,
  enabled transitions, accelerator dispatch, `defaultPrevented` and
  `isComposing` handling, Ctrl+Plus variants.
- Zoom: clamp at 50/200, 10 % steps, persistence read/write, reset.
- Close guard: no guard closes; clean guard closes; dirty guard prevents;
  save success destroys; save failure keeps the window and re-arms; discard
  destroys; cancel restores focus.
- Menu keyboard reducer: arrows, wrap, Home/End, typeahead, Esc, Tab.
- About update states: unsupported, checking, up-to-date, available, error.

Rust (`cargo test` in `apps/desktop/src-tauri`):

- Window-state clamp: offscreen, too small, larger than work area, missing
  monitor, maximized round-trip.
- State serialization round-trip and corrupt-file fallback.

Then run `pnpm verify`.

### 11.2 Manual Windows checklist

- Drag by seal and spacer; window follows the pointer.
- Double-click drag surface maximizes; double-click again restores.
- Drag to each screen edge/corner; Aero Snap previews and snaps.
- Hover the maximize button: Snap Layout flyout appears; hover highlight paints.
- Click maximize: maximizes; glyph becomes Restore; click again restores.
- Resize from all eight directions; minimum 1024x700 holds.
- Windows 11: rounded corners, shadow, square and full-work-area when maximized.
- 100/125/150/200 % DPI: controls, hit rects, and resize bands stay aligned.
- Multi-monitor: close on secondary, relaunch on secondary; unplug monitor and
  relaunch (window appears on the primary, fully visible).
- Close with a dirty wizard: prompt; Save succeeds → closes; save failure →
  window stays and the editor shows the error; Discard → closes; Cancel → stays.
- Repeat for edit-returned with a validation error.
- Close clean: no prompt.
- Alt+F4, File > Exit, Window > Close, and X all take the same path.
- Full screen: F11 hides chrome; top-edge hover reveals; Esc exits.
- Zoom: Ctrl +/−/0, indicator, persists after restart.
- About: version, runtime, update check states; web build disables the check.
- Browser: menus work, no Window menu, no controls, no drag, full screen works,
  Ctrl +/- keeps browser zoom.
- `pnpm verify` passes.

---

## 12. Acceptance checklist

- [ ] Main window is frameless with app-drawn chrome on every route.
- [ ] Drag, double-click maximize, Aero Snap, edge resize, Snap Layouts work.
- [ ] Window controls match native metrics and show the correct glyph/state.
- [ ] Primary nav lives in the 40 px row, left; section tabs right.
- [ ] Wizard keeps primary nav and hides only section tabs.
- [ ] All five menus exist on desktop; Window is absent in the browser.
- [ ] Every File/Edit/View/Help item performs its documented action.
- [ ] Accelerators work, are displayed, and do not double-fire.
- [ ] Unavailable items are disabled with an announced reason.
- [ ] Role gating uses `actsAs`; Admin behaves as every role.
- [ ] Window close prompts only for dirty wizard/edit-returned, with the three
      actions; failed save keeps the window open.
- [ ] Window bounds and maximized state survive restart, clamped on screen.
- [ ] Zoom persists and stays within 50-200 %.
- [ ] Full screen hides chrome and reveals it from the top edge.
- [ ] Auth routes show the slim bar on desktop and nothing extra in the browser.
- [ ] About shows identity, version, runtime, and inline update results.
- [ ] Devtools are reachable only in development builds.
- [ ] Keyboard model matches Windows (Alt/F10, arrows, Esc, mnemonics).
- [ ] No file exceeds 400 lines; `pnpm verify` passes.

---

## 13. Assumptions and open items

1. **Splash handoff is live.** Verified: the main window is hidden and revealed
   by `startup.rs`. Window state is applied before `frontend_ready`, so no
   splash changes are needed.
2. **Nav row on the wizard** (D25) is a spec call. It preserves navigation
   access; the wizard still has no section tabs.
3. **Window minimum** is 1024x700 (D23). The foundation notice remains the
   browser fallback below 1024.
4. **Tauri drag-region double-click** must be verified on Windows; the fallback
   is an explicit `ondblclick`. No behavior change to the spec either way.
5. **WebView zoom API** must be verified against `@tauri-apps/api` 2.12.4; the
   fallback is a one-command WebView2 `SetZoomFactor` wrapper.
6. **Devtools permission** remains in the default capability even though the
   menu is compiled out of release. A dev-only capability split is preferred if
   it does not complicate the build.
7. **About update check** suppresses idle auto-install only while the dialog is
   open; startup checks keep their current behavior.
8. **OS shutdown** cannot be blocked reliably; no guard is attempted.
9. **Windows 10** has no rounded corners; the square fallback is acceptable and
   must not break hit testing.
10. **Menu labels** are English only; the app has no localization layer.

---

## 14. Implementation order

1. Tokens and layout: `TitleBar`, `NavigationRow`, move nav, remove `AppHeader`.
2. Command registry, menu model, menu UI, accelerators, Help shortcuts.
3. Platform contract + Tauri/web adapters; capability additions.
4. Tauri config: frameless, min size, rounded corners, window state.
5. Rust hit test: resize bands, Snap Layouts, maximize hover event.
6. Close guard: registry, dialog, save/discard/cancel, failed-save path.
7. Zoom, full screen, About, updater inline check.
8. Route command migrations: wizard Ctrl+S, PrintPreview Ctrl+P.
9. Tests, manual Windows pass, `pnpm verify`.

---

## 15. Out of scope follow-ups

- Native jump list / recent reports.
- Per-window chrome for a future multi-window mode.
- Custom Snap Layout flyout or snap groups.
- Menu personalization, icons, or submenus.
- Dev-only capability split, if deferred.
- Windows 10 visual polish beyond the square fallback.
