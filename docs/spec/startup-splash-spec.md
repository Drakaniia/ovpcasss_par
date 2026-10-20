# Startup splash screen — implementation spec

**Status:** Ready to implement
**Scope:** `apps/desktop` (Tauri 2 shell) + the boot path of `apps/web`
**Milestone:** desktop shell follow-on to M7 (UI phase 15)
**Decided:** 2026-10-20

---

## 1. Request

Show a splash screen the moment the desktop app launches: the logo and a smooth
loading animation, visible while the app initializes, then a seamless handoff to
the main window. No unnecessary delay, no flickering, no blank white frame. It
appears only during startup.

---

## 2. Current state (verified in this repo)

| Fact                                                                                                                      | Where                                              |
| ------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------- |
| Tauri 2 shell, one window, `1280×860`, titled "OVPCASSS Paperless PAR", no `visible` flag                                 | `apps/desktop/src-tauri/tauri.conf.json`           |
| CLI `@tauri-apps/cli` 2.12.3; `@tauri-apps/api` 2.12.4; Rust `tauri = "2"`, `rust-version = 1.85`                         | `apps/desktop/package.json`, `Cargo.toml`          |
| `frontendDist` is `../../web/build`; dev uses `http://localhost:5173`                                                     | `tauri.conf.json`                                  |
| SvelteKit SPA, `ssr = false`, `adapter-static` with `fallback: 'index.html'`                                              | `apps/web/vite.config.ts`, `src/routes/+layout.ts` |
| CSP: `default-src 'self'; img-src 'self' data:; style-src 'self' 'unsafe-inline'` — **no inline scripts allowed**         | `tauri.conf.json`                                  |
| Shell is detected by `'__TAURI_INTERNALS__' in window`; platform adapters are lazily imported                             | `src/lib/platform/index.ts`                        |
| `loadSession()` is called only for chrome routes; `/login` never probes the session                                       | `src/routes/+layout.svelte`                        |
| Session token restore runs inside `loadSession()`                                                                         | `src/lib/platform/session-token.ts`                |
| Brand lockup `static/brand/ovpcasss-logo.png` (2172×724, ~3:1), self-hosted Montserrat at `/fonts/montserrat-latin.woff2` | `apps/web/static/`                                 |
| Tokens: `--surface-paper #faf8f4`, `--brand-navy-700 #2c3f70`, `--brand-navy-100 #e9edf6`, `--text-primary #14203c`       | `src/lib/styles/tokens.css`                        |
| No splash of any kind exists; capability file targets `"windows": ["main"]`                                               | `visual grep`                                      |

Nothing in this feature changes the web build's behaviour.

---

## 3. Decisions (from the interview)

| #   | Decision                  | Choice                                                                                                             |
| --- | ------------------------- | ------------------------------------------------------------------------------------------------------------------ |
| D1  | Splash surface            | Second Tauri **webview window** (`splash`) using the official v2 two-window recipe                                 |
| D2  | Composition               | Paper field, centred brand lockup, wordmark, thin navy progress line                                               |
| D3  | Motion                    | Logo settle (fade + 6 px rise, ~280 ms) then a 1.15 s indeterminate sweep                                          |
| D4  | Copy                      | Wordmark only: `OVPCASSS Paperless PAR`                                                                            |
| D5  | Splash window             | Frameless, **420×240**, centred on the primary monitor, `skipTaskbar`, fixed size, not draggable, no close control |
| D6  | Reveal gate               | Main shell mounted **and** session resolved **and** first navigation settled                                       |
| D7  | Minimum dwell             | **400 ms** from the splash's own first paint                                                                       |
| D8  | Stuck startup             | Hard timeout at **10 s**; reveal anyway                                                                            |
| D9  | Handoff                   | Show main → focus → tonal dissolve (**140 ms**) → close splash                                                     |
| D10 | API unreachable at launch | Reveal; in-app error/empty states own the failure                                                                  |
| D11 | Auth-route launch         | Probe the session on desktop before reveal; redirect once, then reveal                                             |
| D12 | Dev mode                  | Splash runs in `tauri dev` too                                                                                     |
| D13 | In-app reload             | Never re-show (once per process)                                                                                   |
| D14 | Interaction               | None (no drag, no close, no Escape); `Alt+F4` quits as Windows allows                                              |
| D15 | Splash markup             | Standalone `static/splash.html` + `static/splash.css` + `static/splash.js`                                         |
| D16 | Logo                      | Existing `static/brand/ovpcasss-logo.png`, ~320 px wide                                                            |
| D17 | Docs                      | This file, a phase-17 file derived from it, and a row in `docs/spec/ui/README.md`                                  |
| D18 | Verification              | Windows release build, 5 cold + 5 warm launches, flicker/timing recorded                                           |
| D19 | Bypass                    | None                                                                                                               |
| D20 | Instrumentation           | Dev-only timing logs (frontend console + Rust stdout)                                                              |
| D21 | Progress line colour      | `--brand-navy-700` on a `--brand-navy-100` track                                                                   |
| D22 | Screen readers            | Silent, decorative; document title + logo `alt` only                                                               |
| D23 | Second app launch         | Out of scope; recorded as an open question                                                                         |
| D24 | Main window               | Created hidden, loads in parallel, focused only on reveal                                                          |
| D25 | Transparency              | None; the "cross-fade" is a tonal dissolve on an opaque window                                                     |

---

## 4. Goals

1. A branded first frame appears as early as WebView2 allows, with no white flash
   before it.
2. The splash is never the bottleneck: it disappears as soon as the app is ready,
   and never survives past 10 s.
3. No flash of a route the user is about to be redirected away from.
4. No animation on the main window after reveal (the app is already painted).
5. Zero new runtime dependencies; works offline; no webfont fetch; no bundled
   splash framework.

## 5. Non-goals

- A native (non-WebView) splash window. It is the documented fallback if
  measurement shows the webview splash paints too late (§11, R1).
- Single-instance handling (D23).
- Splash on the browser build, macOS/Linux, or any post-startup surface.
- Gating the reveal on the updater check, inbox data, or draft-store load. The
  startup gate must not depend on network calls other than the session probe.

---

## 6. UX design

### 6.1 Window

- 420 × 240 logical px, frameless (`decorations: false`), `resizable: false`,
  `maximizable/minimizable: false`, `center: true`, `skipTaskbar: true`,
  `shadow: true`, `focus: true`. Not always-on-top.
- Background `#faf8f4` (`--surface-paper`), also used for the main window's
  pre-paint `backgroundColor`, so no white frame is ever exposed.
- On a multi-monitor machine the splash centres on the primary monitor; verify
  `center: true` does that and, if it follows the cursor instead, centre it
  explicitly in `setup()` against `primary_monitor()`.

### 6.2 Composition

```
┌──────────────────────────────────────────┐ 420 × 240
│                                          │
│            [ OVPCASSS lockup ]           │  ~320 × 107
│                                          │
│          OVPCASSS Paperless PAR          │  12.5 px / 600 / 0.08em
│                                          │
│        ▁▁▁▁▁▁▁▁▁▁▁▁▁▁▁▁▁▁▁▁▁▁               │  356 × 2 px, 28 px from bottom
└──────────────────────────────────────────┘
```

- Lockup: `<img src="/brand/ovpcasss-logo.png">`, `max-width: 320px`,
  `width: 100%`, `height: auto`. Inspect the render once: if the lockup visibly
  contains the words "Paperless PAR", keep the separate wordmark anyway (it is
  the product name, the lockup carries the office) but drop to 12 px and 60%
  opacity so it reads as a caption rather than a second title.
- Wordmark: `OVPCASSS Paperless PAR`, 12.5 px, weight 600, `letter-spacing:
0.08em`, colour `--text-primary`, `text-transform: none`.
- Progress track: 356 × 2 px, `border-radius: 999px`, background
  `--brand-navy-100`, 28 px above the bottom edge, horizontally centred,
  `overflow: hidden`. The moving segment is 30% of the track in
  `--brand-navy-700`.
- No border, no gradient, no outer glow, no version string, no status text.

### 6.3 Motion

| Element           | Animation                                                                                  | Reduced motion                    |
| ----------------- | ------------------------------------------------------------------------------------------ | --------------------------------- |
| Lockup + wordmark | `opacity 0→1`, `translateY(6px→0)`, 280 ms `cubic-bezier(0.22,1,0.36,1)`, 60 ms delay      | Instant, final state              |
| Sweep             | 30% segment, `translateX(-100%→333%)` over 1.15 s, `cubic-bezier(0.65,0,0.35,1)`, infinite | Static navy segment parked at 25% |
| Dissolve out      | Root `opacity 1→0` over 140 ms `ease-out`                                                  | Instant close                     |

All motion is CSS-only; no JS animation loop. `@media (prefers-reduced-motion:
reduce)` removes the delays, the sweep, and the dissolve.

### 6.4 States

| State                      | What the user sees                                                                                  |
| -------------------------- | --------------------------------------------------------------------------------------------------- |
| Normal                     | Splash, then the app                                                                                |
| Slow start (up to 10 s)    | Splash; the sweep keeps moving so it never looks frozen                                             |
| Ready before minimum dwell | Splash holds to 400 ms, then dissolves                                                              |
| Frontend never signals     | At 10 s the main window is shown anyway (logged); splash closes                                     |
| Splash page fails to paint | Main window still appears at the 10 s timeout; nothing hangs                                        |
| API unreachable            | Splash behaves normally (session probe fails fast or times out); app reveals to its own error state |
| Reduced motion             | Static lockup and track; same timings for reveal                                                    |

### 6.5 Accessibility & content

- `<html lang="en">`, `<title>OVPCASSS Paperless PAR</title>`.
- Logo `alt="OVPCASSS — Office of the Vice President for Culture, Arts, Sports and Student Services"` (same string as `AuthLayout.svelte`).
- No `role="status"`, no live region, no focusable element, no autofocus.
- Wordmark contrast: `#14203c` on `#faf8f4` ≈ 15.5:1. Track vs segment:
  `#e9edf6` vs `#2c3f70` ≈ 8:1. Both pass WCAG 2.2 AA.
- Formal institutional copy only; no exclamation marks, no "Loading…".

---

## 7. Technical design

### 7.1 Windows (`apps/desktop/src-tauri/tauri.conf.json`)

Add `withGlobalTauri` (so the static splash page can call `invoke`/`listen`
without a bundler) and split the window list. Main first so its WebView starts
booting first; both start in parallel.

```json
"app": {
  "withGlobalTauri": true,
  "windows": [
    {
      "label": "main",
      "title": "OVPCASSS Paperless PAR",
      "width": 1280,
      "height": 860,
      "resizable": true,
      "visible": false,
      "focus": false,
      "backgroundColor": [250, 248, 244, 255]
    },
    {
      "label": "splash",
      "url": "splash.html",
      "width": 420,
      "height": 240,
      "resizable": false,
      "maximizable": false,
      "minimizable": false,
      "decorations": false,
      "center": true,
      "skipTaskbar": true,
      "shadow": true,
      "focus": true,
      "backgroundColor": [250, 248, 244, 255]
    }
  ]
}
```

- `url: "splash.html"` resolves to `http://localhost:5173/splash.html` in dev
  (Vite serves `static/`) and to `splash.html` inside `web/build` in release.
- Do **not** set `transparent` or `alwaysOnTop`.
- A hidden main window means Windows shows no taskbar entry while the splash is
  up (`skipTaskbar`); the entry appears when `main.show()` runs. Accepted.

### 7.2 Capability (`capabilities/default.json`)

The splash window uses `core:event` (to listen) and app commands. Add it:

```json
"windows": ["main", "splash"]
```

No new plugin or permission is introduced. Verify the `listen` call succeeds;
if it is denied, the dissolve is skipped and Rust still closes the window after
140 ms (see 7.4), so the failure mode is a visible cut, not a hang.

### 7.3 Splash page (`apps/web/static/`)

Three files, copied verbatim into `web/build`:

**`splash.html`** — no inline script (CSP `default-src 'self'` forbids it), no
framework, no hydration:

```html
<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <title>OVPCASSS Paperless PAR</title>
    <link rel="stylesheet" href="/splash.css" />
    <script src="/splash.js" defer></script>
  </head>
  <body>
    <main class="splash">
      <img
        class="splash-logo"
        src="/brand/ovpcasss-logo.png"
        alt="OVPCASSS — Office of the Vice President for Culture, Arts, Sports and Student Services"
        width="2172"
        height="724"
      />
      <p class="splash-wordmark">OVPCASSS Paperless PAR</p>
      <div class="splash-track" aria-hidden="true"><span class="splash-sweep"></span></div>
    </main>
  </body>
</html>
```

**`splash.css`** — self-contained. Copy the five values it needs from
`src/lib/styles/tokens.css`, each with a comment naming the token (this is the
one accepted duplication; `static/` cannot import the app stylesheet):

```css
/* Values mirrored from apps/web/src/lib/styles/tokens.css — keep in sync. */
:root {
  --surface-paper: #faf8f4; /* --surface-paper */
  --text-primary: #14203c; /* --text-primary */
  --brand-navy-700: #2c3f70; /* --brand-navy-700 */
  --brand-navy-100: #e9edf6; /* --brand-navy-100 */
  --font-ui: 'Montserrat', system-ui, 'Segoe UI', sans-serif; /* --font-ui */
}
```

plus the `@font-face` for `/fonts/montserrat-latin.woff2` (`font-display: swap`,
system fallback so a font failure never delays paint), the layout, and the motion
from §6. `html.is-leaving` triggers the 140 ms dissolve.

**`splash.js`** — ~15 lines, defensive, works in a plain browser too (so the page
can be reviewed at `http://localhost:5173/splash.html`):

```js
const tauri = window.__TAURI__;
if (tauri) {
  tauri.event.listen('splash:dissolve', () => {
    document.documentElement.classList.add('is-leaving');
  });
  requestAnimationFrame(() => tauri.core.invoke('splash_painted').catch(() => {}));
}
```

Do not add a loading progress percentage, network calls, or console noise here.

### 7.4 Rust (`apps/desktop/src-tauri/src/startup.rs`, wired from `lib.rs`)

New module (`lib.rs` stays under 400 lines). One piece of state, two commands,
two timers.

```rust
const MIN_VISIBLE: Duration = Duration::from_millis(400);
const DISSOLVE: Duration = Duration::from_millis(140);
const READY_TIMEOUT: Duration = Duration::from_secs(10);

pub struct StartupState {
    created_at: Instant,                      // splash window built
    painted_at: Mutex<Option<Instant>>,       // set by the splash page
    revealed: AtomicBool,                     // idempotent handoff
}
```

**Commands**

- `splash_painted` — records `Instant::now()` once.
- `frontend_ready` — the main window's one-shot signal:
  1. `revealed.swap(true)`; if already true, return `Ok(())`.
  2. If `painted_at` is known, sleep `MIN_VISIBLE - painted.elapsed()` when
     positive. If unknown, do not wait (the splash never painted; do not delay).
  3. `main.show()`, then `main.set_focus()`.
  4. `splash.emit("splash:dissolve")`.
  5. Sleep `DISSOLVE`, then `splash.close()` (ignore "already closed").
  6. Log `[startup] reveal at N ms` (debug builds only).

Idempotent, and safe when the splash is already gone.

**Timeout** — spawned in `setup()`: sleep `READY_TIMEOUT`; if `revealed` is
still false, log a warning, set it, show + focus `main`, close `splash`. This is
the only path that reveals without the frontend's consent.

**Ordering rule:** show main before emitting the dissolve, and close the splash
last. Never focus the hidden main window during boot.

**Clock choice:** the minimum dwell is measured from `splash_painted` (the
splash's real first paint), not process start, so a slow WebView boot does not
produce a 40 ms splash flash. If the paint message is lost, `frontend_ready`
proceeds immediately — correctness over polish.

**Registration**

```rust
.manage(StartupState::new())
.invoke_handler(tauri::generate_handler![
    /* existing commands */,
    startup::splash_painted,
    startup::frontend_ready
])
.setup(startup::spawn_ready_timeout)
```

### 7.5 Frontend gate

**Contract** (`apps/web/src/lib/platform/contracts.ts`)

```ts
export interface StartupGate {
  /** Desktop only: releases the splash window. A no-op in the browser. */
  ready(): Promise<void>;
}

export interface Platform {
  /* …existing… */
  startup: StartupGate;
}
```

**Adapters**

- `platform/tauri/startup.ts` — `invoke('frontend_ready')`, errors swallowed (the
  Rust timeout is the safety net).
- `platform/web/startup.ts` — `async ready() {}`.
- `platform/index.ts` — wire both branches; export `isTauri()` for the gate
  module.

**Gate module** (`apps/web/src/lib/platform/startup.ts`)

```ts
export async function releaseSplash(): Promise<void> {
  if (!isTauri()) return; // browser build unchanged
  try {
    await (await platform()).startup.ready();
  } catch {
    /* timeout covers */
  }
}
```

Reuse the memoized `platform()` accessor so `restoreSessionToken()` and the gate
share one `createPlatform()` call.

**Root layout** (`src/routes/+layout.svelte`)

Run once per document in `onMount` (not `$effect` — effects re-run):

1. `const account = await loadSession().catch(() => null)` — desktop only.
   `loadSession()` already restores the OS credential-store token. This is the
   one probe for the launch; page-level calls are memoized and reuse it.
2. `const target = startupDestination(page.url.pathname, account)` — the gate
   owns the launch redirect, so the splash never hides a page that is about to
   bounce:
   - `account === null` on a chrome route → `/login`.
   - `account === null` on an auth route (`/login`, `/register`, `/verify-email`,
     `/forgot-password`, `/reset-password`, `/awaiting-approval`) → no change.
   - `PENDING_ROLE` → `/awaiting-approval`; `PENDING_VERIFICATION` →
     `/verify-email?email=…`; `ACTIVE` on `/login` or `/register` → `/`.
   - `DISABLED` or already on the target → `null`.
     When `target` is non-null, `await goto(target, { replaceState: true })`.
     The pages' own post-load redirects then see the correct URL (and any
     duplicate `goto` to the same path is a no-op).
3. `await tick()`, then `await new Promise(requestAnimationFrame)` twice, so the
   landing route has painted.
4. `await releaseSplash()`.

The existing chrome-route `loadSession()` effect stays; it now finds the memoized
result.

**Web build:** `releaseSplash()` returns immediately and the probe is skipped, so
no behaviour changes in the browser (including no redirect off `/login`).

### 7.6 Sequence

```
process start
  ├─ create main (hidden, loading web/build)
  ├─ create splash (visible, splash.html) ──── paints → invoke splash_painted
  │                                              (t0 = paint time)
  ├─ main: layout mounts → loadSession (token restore + GET /me)
  │         → startupDestination → at most one goto
  │         → tick + 2 rAF
  │         → invoke frontend_ready
  └─ Rust: wait max(0, 400 ms − (now − t0))
           → main.show() + main.set_focus()
           → splash: "splash:dissolve" → 140 ms CSS opacity fade
           → splash.close()
  timeout: 10 s → same reveal, warning logged
```

---

## 8. Files to change

| File                                                               | Change                                                                                                     |
| ------------------------------------------------------------------ | ---------------------------------------------------------------------------------------------------------- |
| `apps/desktop/src-tauri/tauri.conf.json`                           | `withGlobalTauri`, `main` label + `visible:false` + `focus:false` + `backgroundColor`, new `splash` window |
| `apps/desktop/src-tauri/src/startup.rs`                            | **new** — state, two commands, timeout, timing logs                                                        |
| `apps/desktop/src-tauri/src/lib.rs`                                | `mod startup;`, `.manage(...)`, `.setup(...)`, handler registration                                        |
| `apps/desktop/src-tauri/capabilities/default.json`                 | `windows: ["main", "splash"]`                                                                              |
| `apps/web/static/splash.html`                                      | **new** — markup only                                                                                      |
| `apps/web/static/splash.css`                                       | **new** — tokens copied, layout, motion, reduced motion                                                    |
| `apps/web/static/splash.js`                                        | **new** — dissolve listener + paint ping                                                                   |
| `apps/web/src/lib/platform/contracts.ts`                           | `StartupGate` + `Platform.startup`                                                                         |
| `apps/web/src/lib/platform/tauri/startup.ts`                       | **new** — `invoke('frontend_ready')`                                                                       |
| `apps/web/src/lib/platform/web/startup.ts`                         | **new** — no-op                                                                                            |
| `apps/web/src/lib/platform/index.ts`                               | wire `startup`, export `isTauri`, memoized `platform()`                                                    |
| `apps/web/src/lib/platform/session-token.ts`                       | use the shared `platform()`                                                                                |
| `apps/web/src/lib/platform/startup.ts`                             | **new** — `releaseSplash()` gate                                                                           |
| `apps/web/src/lib/features/auth/application/startup-route.ts`      | **new** — pure `startupDestination(pathname, account)`, the gate's redirect decision                       |
| `apps/web/src/lib/features/auth/application/startup-route.test.ts` | **new** — unit tests for the redirect decision                                                             |
| `apps/web/src/routes/+layout.svelte`                               | desktop-only startup sequence in `onMount`                                                                 |
| `docs/spec/ui/17-startup-splash.md`                                | **new** — runnable phase file derived from this spec (acceptance checklist, files, scope)                  |
| `docs/spec/ui/README.md`                                           | runbook row for phase 17                                                                                   |
| `docs/todo.md`                                                     | tick the splash item when verified                                                                         |

No changes to `apps/api`, `packages/*`, or `.github/workflows` are needed.

---

## 9. Edge cases

| Case                                               | Behaviour                                                                          |
| -------------------------------------------------- | ---------------------------------------------------------------------------------- |
| Main signals ready before the splash paints        | No wait; main shows, splash closes when it appears (worst case a sub-frame splash) |
| Splash paints, main never signals                  | Timeout at 10 s reveals main                                                       |
| `frontend_ready` invoked twice                     | Second call is a no-op                                                             |
| Splash window already closed (crash / user closed) | `close()` error ignored                                                            |
| In-app reload (Ctrl+R, HMR full reload)            | No splash: it was closed at first reveal                                           |
| Vite dev server not up yet                         | Main window shows its own failure; splash still times out                          |
| API unreachable / slow                             | Probe rejects or resolves `null`; reveal proceeds                                  |
| Signed-in user launches into `/login`              | One `goto('/')` (or `/awaiting-approval`) before reveal; no login flash            |
| Signed-out launch                                  | Gate navigates to `/login` before reveal; the inbox skeleton never becomes visible |
| `PENDING_ROLE` launch                              | Redirect to `/awaiting-approval` before reveal                                     |
| `DISABLED` account with a stored token             | Probe clears the session (`loadSession` handles 401/403); login shows              |
| Primary monitor smaller than 420×240               | Window still opens; Tauri clamps it; no crash                                      |
| 200% display scaling                               | CSS px scale correctly; the window is 420×240 logical                              |
| Second app instance                                | Out of scope: a second splash and window appear (§12)                              |
| `prefers-reduced-motion`                           | Static lockup, static track, instant close                                         |
| Alt+F4 during splash                               | Process quits normally (splash is a real top-level window)                         |

---

## 10. Verification plan

### 10.1 Automated

```bash
pnpm --filter @par/web build
cargo check --manifest-path apps/desktop/src-tauri/Cargo.toml
pnpm verify                      # check:structure -> lint -> typecheck -> test
```

- Add a Rust unit test for the dwell helper
  (`remaining_hold(painted_at, now)`) covering: paint 100 ms ago → 300 ms,
  paint 500 ms ago → 0, no paint → 0.
- Add `startup-route.test.ts` covering: signed out on `/` → `/login`; signed out
  on `/login` → no redirect; ACTIVE on `/login` → `/`; ACTIVE on `/` → no
  redirect; PENDING_ROLE on `/` → `/awaiting-approval`; PENDING_VERIFICATION →
  `/verify-email?email=…`; DISABLED → no redirect.
- The static splash page is reviewable directly at
  `http://localhost:5173/splash.html` while `pnpm --filter @par/web dev` runs;
  capture a screenshot for the report (both shells' visuals must match).

### 10.2 Manual (Windows, release build) — required

Build with `pnpm --filter @par/desktop build` (or `cargo build --release`), then
record for **5 cold launches** (first launch after a reboot or after
`taskkill`-ing WebView2 processes) and **5 warm launches**:

| Metric                    | How                                                                 | Target                                             |
| ------------------------- | ------------------------------------------------------------------- | -------------------------------------------------- |
| Splash paint → reveal     | `[startup]` debug log / devtools marks                              | ≥ 400 ms, reveal ≤ ready + ~200 ms                 |
| Time to splash paint      | Screen recording, frame count                                       | report the measurement                             |
| White frame before splash | Frame-by-frame review of the recording                              | none                                               |
| Blank frame at handoff    | Same recording                                                      | none                                               |
| Taskbar entries           | Observe during and after startup                                    | one, only after reveal                             |
| Splash in taskbar         | Observe                                                             | never                                              |
| Focus after reveal        | Type immediately                                                    | main window receives input                         |
| Reveal timed out          | Temporarily comment out the layout's `releaseSplash()` call, launch | main appears at ~10 s, warning logged, splash gone |

Also verify on the release bundle (not just `tauri dev`): splash in dev match
release, `/login` launch has no login flash for a signed-in account, reduced
motion at OS level freezes the animation, and Alt+F4 during splash quits.

Anything not executed must be reported as **not verified**, with the reason.

---

## 11. Risks

| #   | Risk                                                                                      | Mitigation                                                                                                                                                                                                 |
| --- | ----------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| R1  | The splash WebView paints late on cold start, so the first visible frame is a white flash | Matching `backgroundColor`; measure time-to-splash-paint. If > 400 ms or a white frame is visible, fall back to a native image window (out of scope here, but the Rust seam stays: only `setup()` changes) |
| R2  | `show()` reveals an unpainted main window                                                 | Main is only shown after `tick` + 2 rAF post-navigation; frame review in 10.2 proves it                                                                                                                    |
| R3  | `skipTaskbar` unreliable on some Windows 10 builds (Tauri #10422)                         | Verify; if it fails, accept the entry or set the splash window as a tool window in Rust (`set_skip_taskbar` fallback) and note it                                                                          |
| R4  | Cross-window focus steals during the animation                                            | `main` created with `focus: false`; focus is set only inside `frontend_ready`                                                                                                                              |
| R5  | Splash window partly transparent or layered oddly under DWM                               | Opaque window, no `transparent`, no `alwaysOnTop`; frame review                                                                                                                                            |
| R6  | Duplicated token values drift from `tokens.css`                                           | One commented `:root` block; review on token changes. Deliberately no test for five constants                                                                                                              |
| R7  | Extra `GET /me` at startup                                                                | Memoized with the existing `loadSession()`; desktop-only, so web is untouched                                                                                                                              |
| R8  | Static splash drifts from the app's type scale                                            | Wordmark and lockup sized from §6.2; screenshot compared with the login lockup                                                                                                                             |

---

## 12. Open questions (not decided here)

1. **Single instance.** Two launches mean two processes, two splashes, two main
   windows. Fixing that needs `tauri-plugin-single-instance` and is a separate
   change.
2. **Splash asset.** Whether a seal-only square mark should replace the wide
   lockup, so the wordmark is not visually redundant. Needs a new asset.
3. **Native splash.** Only if R1 is measured as unacceptable.
4. **Dwell tuning.** 400 ms is the starting floor; revisit after measurement.

## 13. Assumptions

1. The logo file stays at `/brand/ovpcasss-logo.png`; no new brand asset is
   required for this feature.
2. The app has no startup work that must complete before the splash appears
   (no database migration, no license check). Adding one later means an extra
   gate inside `StartupState`.
3. Tauri's `center: true` centres on the primary monitor on Windows. Verify
   (6.1); if not, compute the position from `primary_monitor()`.
4. The desktop app never needs the splash on a reload or a second main window.
5. No translation, no version display, no progress percentage in v1.

---

## 14. Acceptance checklist

- [ ] Launching the release build shows the splash with logo, wordmark, and
      sweep before any main-window content; no white frame precedes it.
- [ ] The splash is frameless, 420×240, centred on the primary monitor, absent
      from the taskbar, and cannot be resized, dragged, or dismissed.
- [ ] The splash runs in `tauri dev` and in the release bundle.
- [ ] The handoff shows the already-painted main window, then dissolves the
      splash over ~140 ms and closes it; no blank or white frame in the
      recording.
- [ ] Minimum dwell is 400 ms measured from the splash's first paint; reveal
      adds ≤ ~200 ms on top of readiness.
- [ ] A stuck frontend reveals the main window at 10 s with a logged warning;
      the splash never blocks the app.
- [ ] An unreachable API does not hold the splash; the app reveals to its
      existing error/sign-in states.
- [ ] A signed-in launch into `/login` redirects before reveal; a signed-out
      launch never flashes the work inbox.
- [ ] `Ctrl+R` and Vite full reloads do not re-show the splash.
- [ ] Reduced motion yields a static splash and the same reveal timing.
- [ ] The splash page renders correctly in a browser at `/splash.html`; in Tauri
      it uses the injected global API and never requires network fonts or
      imagery.
- [ ] No inline scripts (CSP), no `transparent`, no new dependency, no webfont
      download.
- [ ] Wordmark and progress-line contrast pass WCAG 2.2 AA; the splash exposes
      no focusable element and no live region.
- [ ] The splash window has no taskbar entry; the app has exactly one entry once
      the main window appears; input reaches the main window immediately after
      reveal.
- [ ] Timing table for 5 cold and 5 warm launches is recorded in the completion
      report with the WebView2 version and display scaling.
- [ ] `pnpm verify` passes, plus the new Rust and TypeScript unit tests.
- [ ] No unverified item is reported as verified.
