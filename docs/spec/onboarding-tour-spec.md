# First-Run Onboarding Tour — Implementation Spec

**Status:** approved for implementation (decisions recorded in §2)
**Surface:** `apps/web` (browser build and the Tauri desktop shell)
**Routes:** `/` only — the tour is an overlay, not a route
**Depends on:** UI foundation (tokens, buttons, dialog conventions), phase 02 work inbox,
phase 12 global tools (command registry, Help menu)
**Source:** user request "First-Time App Onboarding UI with Interactive Guided Tour",
plus `docs/spec/par-ui-ux-spec.md`, `docs/spec/ui/00-foundation.md`,
`docs/spec/ui/02-work-inbox.md`, `docs/spec/ui/12-global-tools.md`,
`docs/spec/ui-redesign-spec.md`

---

## 1. Summary

A first-run, modal product tour over the Home work inbox. On the first eligible
visit it opens a centered welcome card; **Get started** dismisses the card and
starts a sequence of spotlight coach marks over real, existing controls:

1. Welcome (centered, no spotlight)
2. Primary navigation
3. The role's main entry point (New report / Queues / Admin)
4. Titlebar search and command palette
5. Notifications
6. Account menu
7. The "Get started" checklist (submitters with an empty inbox)
8. Setup complete (centered, no spotlight)

Each spotlight step dims the page, cuts a hole around one element, and anchors a
tooltip with a title, one or two sentences, a `Step N of M` counter, a thin
progress bar, **Back**, **Next**/**Finish**, and **Skip tour**. The tour is
resolved against the live DOM: steps whose target is absent (role, inbox state)
are dropped before the first frame, so the counter never promises a step the
user will not see.

Everything here is client-side. No API endpoint, D1 migration, shared Zod
contract, or new dependency is involved.

---

## 2. Decisions taken (interview record)

| #    | Question                           | Decision                                                              | Consequence                                                                                                                    |
| ---- | ---------------------------------- | --------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------ |
| OD1  | Where completion lives             | **Per-account `localStorage`**                                        | Key is scoped by `session.user.id`; no API/D1 change. Per account _per shell/origin_ (see §9.4).                               |
| OD2  | Relationship to the Home checklist | **The tour highlights the checklist; the checklist stays afterwards** | `/` keeps its server-derived checklist as the persistent post-tour guidance.                                                   |
| OD3  | Route scope                        | **Home + chrome only, no navigation between screens**                 | No route-aware resume, no stranded users mid-wizard. Every anchor exists on `/`.                                               |
| OD4  | Theme                              | **Light-only, matching the app**                                      | No `prefers-color-scheme` work; `tokens.css` stays light. `00-foundation.md` §2.5 remains superseded by the redesign decision. |
| OD5  | Role handling                      | **One sequence with role-gated steps**                                | One ordered config; `roles` filters copy; DOM presence is the final truth.                                                     |
| OD6  | Replay / reset location            | **Help menu only**                                                    | Two commands added to the existing Help menu; no Profile section, no avatar-menu entry.                                        |     | OD7 | Skip / Escape semantics | **Both end onboarding** | Skip stores `outcome: "skipped"`, Finish stores `"completed"`; either way it never auto-opens again, and Help is the way back. |
| OD8  | Interaction model                  | **Modal coach marks**                                                 | Page is inert; only tour controls work. No click-through to the highlighted element.                                           |
| OD9  | Secondary controls featured        | **Notifications bell, titlebar search, account menu**                 | Section tabs are deliberately excluded (hidden below 1280 px and route-dependent).                                             |
| OD10 | Eligibility                        | **Every active account, on its next Home visit**                      | Existing users see it once too; deep links do not trigger it; it waits for a successful Home load.                             |
| OD11 | Missing / hidden target            | **Drop the step and renumber progress**                               | Resolve before starting; if only bookends remain, record complete without showing anything.                                    |
| OD12 | Future copy/step changes           | **Version the stored record**                                         | `TOUR_VERSION` bump re-arms the tour once for everyone.                                                                        |
| OD13 | Spotlight treatment                | **Navy ring + soft white halo**                                       | Gold stays decorative; maroon is untouched.                                                                                    |
| OD14 | Voice                              | **Formal institutional English, no exclamation marks**                | "Setup complete", not "You're all set!".                                                                                       |
| OD15 | Bookends                           | **Centered welcome; Finish closes on Home**                           | No forced navigation into the wizard; the checklist is in view.                                                                |
| OD16 | Reset behavior                     | **Go to Home and start immediately**                                  | Reset clears storage, shows a success toast, navigates if needed, and arms the tour.                                           |
| OD17 | Target anchors                     | **Explicit `data-tour` attributes**                                   | The anchor map in §7; no reliance on classes or copy.                                                                          |
| OD18 | Home load failure                  | **Defer, do not mark complete**                                       | The tour stays armed and opens on the next successful Home load.                                                               |
| OD19 | Progress display                   | **Text counter + thin bar**                                           | `Step 2 of 7` with a 3 px track under the tooltip header.                                                                      |

---

## 3. Scope

### 3.1 In scope

- A reusable tour engine: step config, target resolution, spotlight geometry,
  tooltip placement, keyboard/focus behavior, persistence, reset.
- One concrete tour for the Home surface using only controls that exist today.
- Two Help-menu commands: **Take the guided tour** and **Reset onboarding**.
- Six `data-tour` anchors across six existing components.
- Suppression of global single-key shortcuts while the tour is open.
- Unit tests for the pure modules and an SSR markup test for the tooltip.
- Two design tokens for the scrim and halo (`tokens.css` only).

### 3.2 Out of scope (non-goals)

- Server-side or cross-device onboarding state; no `onboarding` contract change.
- Dark mode, mobile/phone layout, or a second responsive design.
- Tours for other routes (Reports, wizard, queues, repository, admin).
- Interactive "click the highlighted control to continue" behavior.
- Spotlight animation with canvas/SVG masks, confetti, sound, or video.
- Analytics/telemetry on step completion; the app has no analytics layer.
- Changing the existing "Get started" checklist, its copy, or its server data.
- Changing `par-ui-ux-spec.md` or the phase docs.

---

## 4. Assumptions and open items

1. **"First time" is a client fact.** The system does not store a creation
   timestamp that distinguishes "never onboarded" from "onboarded elsewhere", so
   the tour is armed per account per origin by `localStorage`.
2. **Home is the landing surface.** `startupDestination` sends an `ACTIVE`
   account to `/` (or the deep link it requested). A user who first lands on
   `/reports` sees the tour later, on their first Home visit — not on the deep
   link.
3. **`PENDING`/`PENDING_ROLE` accounts are skipped** until they are `ACTIVE`.
   `/awaiting-approval` has no shell, so the tour cannot and should not run there.
4. **One shell at a time.** The tour is not shown twice in the same document;
   a completed/skipped tour cannot re-open until a reset or a version bump.
5. **The desktop shell counts as a separate origin.** Web and Tauri each keep
   their own `localStorage`; completing the tour in the browser does not mark it
   complete in the desktop app. Accepted for OD1; the migration path is in §18.
6. **No banner or badge announces the tour.** It opens once, by itself, and is
   thereafter discoverable under **Help**.
7. **Unanswered spec §14 questions are not decided here.** Nothing in this
   feature depends on them.

---

## 5. User flow

```
                     first eligible Home visit
                                │
                                ▼
                    ┌───────────────────────┐
                    │ 1. Welcome (centered) │  Get started / Skip tour
                    └───────────┬───────────┘
                                │ Get started
                                ▼
   ┌───────────────────────────────────────────────────────────┐
   │ 2. Primary navigation        ┐                            │
   │ 3. Role entry point          │  spotlight steps           │
   │ 4. Search / palette          │  (missing targets dropped) │
   │ 5. Notifications             │                            │
   │ 6. Account menu              │                            │
   │ 7. Get started checklist     ┘                            │
   └───────────────────────────┬───────────────────────────────┘
                               │ Next on last spotlight
                               ▼
                    ┌───────────────────────┐
                    │ 8. Setup complete     │  Start exploring
                    └───────────┬───────────┘
                                │
                                ▼
                 write { version, outcome, at } → close
                 focus returns to #content (or the pre-tour trigger)
```

Entry points:

| Trigger                         | Behavior                                                                               |
| ------------------------------- | -------------------------------------------------------------------------------------- |
| Auto, first eligible Home visit | Welcome card opens once the inbox paints and the anchors resolve.                      |
| Help → **Take the guided tour** | Navigates to `/` if needed, waits for Home, opens the tour. Does not clear the record. |
| Help → **Reset onboarding**     | Clears the record, shows `Onboarding reset.`, goes to `/`, opens the tour.             |
| Skip tour / Escape / Finish     | Writes the record and closes.                                                          |

---

## 6. Step sequence and copy

Steps are declared once in `tour-steps.ts`. `welcome` and `finish` are always
present; spotlight steps are filtered by exact role (a step with no `roles`, or
one whose `roles` include `user.role`), **not** `actsAs` — the copy explains a
role's own workspace, so an admin must not be told they review reports. After
role filtering, a step survives only if its
`data-tour` anchor resolves to a visible element.

`placement` is the preferred side; the engine flips and clamps as needed (§10.3).

Mapping to the request's outline (the request explicitly allows adapting to the
components that exist):

| Request outline      | This tour                                                                                          |
| -------------------- | -------------------------------------------------------------------------------------------------- |
| Welcome              | Step 1, centered card with Get started and Skip tour.                                              |
| Main navigation      | Step 2, the primary nav row.                                                                       |
| Main feature         | Step 3a New report for submitters, 3b Queues for reviewers/approvers, 3c Admin for administrators. |
| Important components | Steps 4–6: titlebar search, notifications bell, account menu.                                      |
| Primary action       | Step 7, the Get started checklist (or New report when the checklist is absent).                    |
| Final step           | Step 8, Setup complete with Start exploring.                                                       |

| #   | id              | Anchor (`data-tour`)   | Title                    | Roles                        | Preferred placement     |
| --- | --------------- | ---------------------- | ------------------------ | ---------------------------- | ----------------------- |
| 1   | `welcome`       | —                      | Welcome to Paperless PAR | all                          | centered                |
| 2   | `primary-nav`   | `primary-nav`          | Primary navigation       | all with a nav row           | bottom                  |
| 3a  | `new-report`    | `new-report`           | Start a report           | `SUBMITTER`                  | bottom                  |
| 3b  | `queues`        | `nav-queues`           | Your decision queues     | `REVIEWER`, `APPROVER`       | bottom                  |
| 3c  | `admin`         | `nav-admin`            | Administration           | `ADMIN`                      | bottom                  |
| 4   | `search`        | `titlebar-search`      | Search from anywhere     | all                          | bottom (right-aligned)  |
| 5   | `notifications` | `notifications`        | Notifications            | all                          | bottom (right-aligned)  |
| 6   | `account`       | `account-menu`         | Your account             | all                          | bottom (right-aligned)  |
| 7   | `checklist`     | `onboarding-checklist` | Your first report        | `SUBMITTER` with empty inbox | right, else above/below |
| 8   | `finish`        | —                      | Setup complete           | all                          | centered                |

A fully populated submitter sees 8 steps. A reviewer or approver sees 7
(welcome, nav, queues, search, notifications, account, finish). An admin sees 7
(welcome, nav, admin, search, notifications, account, finish). A submitter whose
inbox already has work sees 7 (no checklist).

### 6.1 Exact copy

Copy is formal, sentence case, no exclamation marks, and never names a control
that the current role cannot see. Nav copy is the only multi-variant string.
Counters below show the full eight-step submitter sequence (`N = 8`); the
rendered counter always comes from the resolved list, so a reviewer sees
`Step 2 of 7` and a submitter without the checklist sees `Step 7 of 7` on the
finish card.

**1 · welcome**

- Title: `Welcome to Paperless PAR`
- Body: `Paperless PAR is the Office of the Vice President for Curriculum and Academic Standards and Services' system for post-activity reports. This short tour shows where each task begins. It takes about a minute.`
- Primary: `Get started` · Secondary: `Skip tour` · Counter: `Step 1 of N`

**2 · primary-nav**

- Title: `Primary navigation`
- Body by role:
  - `SUBMITTER`: `Home shows the work that needs your attention. Reports holds every report you have drafted, submitted or had returned.`
  - `REVIEWER`: `Home shows the work that needs your attention. Reports lists reports, and Queues holds the submissions waiting for your review.`
  - `APPROVER`: `Home shows the work that needs your attention. Reports lists reports, and Queues holds the reports waiting for your approval.`
  - `ADMIN`: `Home shows the work that needs your attention. Reports, Queues, Repository and Admin reach every part of the system.`
  - No role / nav absent: step is dropped.

**3a · new-report**

- Title: `Start a report`
- Body: `New report opens the four-step form for a completed activity. Your work is saved as a draft on this device until you submit it. Submission issues the tracking number.`

**3b · queues**

- Title: `Your decision queues`
- Body: `Queues collects the reports waiting for your decision. Open one to read the facsimile and record a review or an approval.`

**3c · admin**

- Title: `Administration`
- Body: `Admin holds user accounts, reference data, workbook import and the audit log. Changes here apply to every campus.`

**4 · search**

- Title: `Search from anywhere`
- Body: `Search opens the command palette, where you can jump to a page or a tracking number without leaving the keyboard.`

**5 · notifications**

- Title: `Notifications`
- Body: `The bell shows unread notices. It lists the three most recent, and View all notifications opens the full list.`

**6 · account**

- Title: `Your account`
- Body: `This menu opens your profile and the keyboard shortcut reference, and signs you out.`

**7 · checklist**

- Title: `Your first report`
- Body: `This checklist follows your progress: complete your profile, start a report, and submit it. It gives way once the inbox has other work to show.`

**8 · finish**

- Title: `Setup complete`
- Body: `You have seen the main areas of Paperless PAR. You can take this tour again from Help at any time.`
- Primary: `Start exploring` · Secondary: `Back` only · Counter: `Step N of N`

### 6.2 Role-aware resolution, not role-aware layout

`resolveTourSteps` is a pure function:

```ts
type TourContext = {
  role: Role | null;
  hasTarget: (anchor: string) => boolean;
};

resolveTourSteps(context: TourContext, opts?: { hasTarget?: (anchor: string) => boolean }): ResolvedStep[]
```

- Keep `welcome` and `finish` unconditionally.
- Keep a spotlight step when `step.roles` is undefined or includes `context.role`,
  and `context.hasTarget(step.anchor)` is true.
- Preserve declaration order; assign `position` (1-based) and `total` after
  filtering.
- No step stores a hard-coded index; the counter always reads from the resolved
  list.

---

## 7. Anchor map

Attributes are inert, stable, and readable in DevTools. No existing class,
`aria-label`, or `href` is changed.

| File                                                              | Element                 | Attribute                          |
| ----------------------------------------------------------------- | ----------------------- | ---------------------------------- |
| `lib/features/window-chrome/presentation/NavigationRow.svelte`    | `<nav class="primary">` | `data-tour="primary-nav"`          |
| `lib/features/window-chrome/presentation/NavigationRow.svelte`    | each nav `<a>`          | `data-tour="nav-{item.id}"`        |
| `lib/features/inbox/presentation/InboxPageHeader.svelte`          | New report `<a>`        | `data-tour="new-report"`           |
| `lib/features/window-chrome/presentation/TitleBar.svelte`         | search `<button>`       | `data-tour="titlebar-search"`      |
| `lib/components/NotificationMenu.svelte`                          | bell `<button>`         | `data-tour="notifications"`        |
| `lib/components/AvatarMenu.svelte`                                | `<summary>`             | `data-tour="account-menu"`         |
| `lib/features/inbox/presentation/InboxOnboardingChecklist.svelte` | `<section>`             | `data-tour="onboarding-checklist"` |

Visibility test used by `hasTarget`:

```ts
const rect = element.getBoundingClientRect();
const style = getComputedStyle(element);
return rect.width > 0 && rect.height > 0 && style.visibility !== 'hidden';
```

`offsetParent` is **not** used: fixed and sticky chrome elements can have a null
`offsetParent` while being perfectly visible.

Notes:

- `InboxOnboardingChecklist` renders only when `caps.submitter` and the inbox has
  no sections (`WorkInbox.svelte`), so step 7 disappears for reviewers, admins,
  and submitters with existing work without any extra logic.
- `InboxPageHeader` renders New report only when the page passes
  `roles.includes('SUBMITTER')` (Home passes `[user.role]`), so the Admin step
  targets the nav link, not a button an admin does not have.
- `NavigationRow` renders nothing when the role has no nav items; step 2 is
  dropped for a role-less account and the tour still runs.

---

## 8. Architecture

### 8.1 File plan

```
apps/web/src/lib/features/onboarding/
├── application/
│   ├── tour-steps.ts                 # config + role/target resolution (pure)
│   ├── tour-steps.test.ts
│   ├── tour-storage.ts               # read/write/clear/versioning (pure + injectable storage)
│   ├── tour-storage.test.ts
│   ├── tour-eligibility.ts           # "should the tour auto-open?" (pure)
│   ├── tour-eligibility.test.ts
│   ├── tour-placement.ts             # hole + tooltip geometry (pure)
│   ├── tour-placement.test.ts
│   ├── tour-controller.svelte.ts     # runes store: active step, home readiness, start/stop
│   └── tour-controller.test.ts
└── presentation/
    ├── OnboardingTour.svelte         # <dialog>, scrim/hole, lifecycle, focus, keyboard
    ├── TourCard.svelte               # card/tooltip body: title, body, counter, bar, actions
    └── TourCard.test.ts              # svelte/server render assertions
```

Modified files:

| File                                                                      | Change                                                  |
| ------------------------------------------------------------------------- | ------------------------------------------------------- |
| `apps/web/src/lib/components/AppShell.svelte`                             | Mount `<OnboardingTour />` once inside the shell.       |
| `apps/web/src/routes/+page.svelte`                                        | Publish Home readiness/failure to the tour store.       |
| `apps/web/src/lib/features/window-chrome/application/menu-model.ts`       | Two Help-menu items.                                    |
| `apps/web/src/lib/features/window-chrome/application/builtin-commands.ts` | Register `help.tour` and `help.reset-onboarding`.       |
| `apps/web/src/lib/shortcuts/keyboard.ts`                                  | Suppress global shortcuts while the tour is open.       |
| `apps/web/src/lib/styles/tokens.css`                                      | `--backdrop-strong`, `--tour-halo`.                     |
| §7 anchor components (6 files)                                            | One `data-tour` attribute each (nav gets one per link). |

No file approaches the 400-line limit; the folder holds 7 source files plus 6
tests, well under 30.

### 8.2 Module contracts

**`tour-steps.ts`**

```ts
export type TourStepId =
  | 'welcome'
  | 'primary-nav'
  | 'new-report'
  | 'queues'
  | 'admin'
  | 'search'
  | 'notifications'
  | 'account'
  | 'checklist'
  | 'finish';

// TourPlacement is imported from tour-placement.ts.

export type TourStepConfig = {
  id: TourStepId;
  anchor?: string;
  /** Exact role gate for copy that describes one role's workspace. */
  roles?: readonly Role[];
  placement?: TourPlacement;
  title: (context: TourContext) => string;
  description: (context: TourContext) => string;
};

export type ResolvedStep = {
  id: TourStepId;
  anchor: string | null;
  placement: TourPlacement;
  title: string;
  description: string;
  position: number; // 1-based, after filtering
  total: number;
  final: boolean;
};

export function resolveTourSteps(
  context: TourContext,
  opts?: {
    hasTarget?: (anchor: string) => boolean;
  },
): ResolvedStep[];
```

The DOM-facing `hasTarget` default lives in the controller, not in this module,
so the resolver stays testable without a document.

**`tour-storage.ts`**

```ts
export const TOUR_VERSION = 1;
export const TOUR_KEY_PREFIX = 'par.onboarding.tour';

export type TourOutcome = 'completed' | 'skipped';
export type TourRecord = { version: number; outcome: TourOutcome; at: string };

export function tourKey(userId: string): string; // `par.onboarding.tour.<userId>`
export function readTourRecord(userId: string, storage?: StorageLike): TourRecord | null;
export function isTourComplete(userId: string, storage?: StorageLike): boolean;
export function writeTourOutcome(userId: string, outcome: TourOutcome, storage?: StorageLike): void;
export function clearTourRecord(userId: string, storage?: StorageLike): void;
```

Rules:

- A record counts only when `record.version === TOUR_VERSION` and `outcome` is
  one of the two literals. Older versions therefore re-arm (§2, OD12).
- Malformed JSON, wrong shape, or a throwing storage API returns `null` /
  no-ops; nothing about the tour may throw into the shell.
- `StorageLike` is `Pick<Storage, 'getItem' | 'setItem' | 'removeItem'>` so tests
  pass a `Map`-backed fake.
- The controller keeps an in-memory mirror for the current document. If storage
  is blocked, the tour still behaves correctly until reload (then it may open
  again). This is the same graceful degradation as `zoom.svelte.ts`.

**`tour-eligibility.ts`**

```ts
export type HomeInboxStatus = 'idle' | 'ready' | 'failed';

export type TourEligibilityInput = {
  status: 'idle' | 'active';
  pathname: string;
  accountStatus: UserStatus | null;
  homeStatus: HomeInboxStatus;
  viewportWidth: number;
  completed: boolean;
  /** An auto-start has already been attempted in this document. */
  startedThisSession: boolean;
  pendingManualStart: boolean;
  modalOpen: boolean;
};

export function shouldAutoStart(input: TourEligibilityInput): boolean;
export function canStartManually(input: TourEligibilityInput): boolean;
```

`shouldAutoStart` requires all of:

- `status === 'idle'`, `!startedThisSession`, `!completed`
- `pathname === '/'`, `accountStatus === 'ACTIVE'`
- `homeStatus === 'ready'`
- `viewportWidth >= 1024`
- `!modalOpen`
- `!pendingManualStart` (the manual path owns the start when armed)

`canStartManually` drops the `completed`/`homeStatus`/`startedThisSession` checks
(the command arms a start and may replay in the same document) but still requires
an `ACTIVE` session, no open modal, and a viewport `>= 1024`.

`hasOpenTourOverlay(query: (selector: string) => Element | null)` also lives here,
so `keyboard.ts` can be tested without a DOM (§8.6).

**`tour-placement.ts`**

```ts
export type Rect = { top: number; left: number; width: number; height: number };
export type Size = { width: number; height: number };
export type Placement = 'top' | 'bottom' | 'left' | 'right';
export type TourPlacement = Placement | 'auto';

export function spotlightRect(target: DOMRectReadOnly | Rect, padding = 8, viewport: Size): Rect;

export function placeTooltip(input: {
  target: Rect; // already padded hole
  tooltip: Size;
  viewport: Size;
  preferred: TourPlacement;
  gap?: number; // 16
  margin?: number; // 16
}): { placement: Placement; top: number; left: number };
```

**`tour-controller.svelte.ts`**

```ts
export const tour = $state<{
  status: 'idle' | 'active';
  steps: ResolvedStep[];
  index: number;
  startedAt: number | null;
}>({ status: 'idle', steps: [], index: 0, startedAt: null });

export const homeInbox = $state<{ status: HomeInboxStatus }>({ status: 'idle' });

export function setHomeInboxStatus(status: HomeInboxStatus): void;
export type Navigate = () => void | Promise<void>;

export type StartOptions = {
  pathname: string;
  /** Injected by the caller so this module never imports `$app`. */
  navigate?: Navigate;
};

/** Called by the mounted component's effect with its reactive inputs. */
export function maybeAutoStart(input: { pathname: string; viewportWidth: number }): void;

/** The in-memory mirror, seeded from tour-storage; used by the auto-start gate. */
export function hasCompletedTour(): boolean;

/** Manual: arm the start; navigate to Home when `pathname` is not `/`. */
export function startTour(options: StartOptions): void;
/** Clear + toast + arm + navigate to Home. */
export function resetOnboarding(options: StartOptions): void;
export function nextStep(): void;
export function backStep(): void;
export function skipTour(): void; // writes 'skipped'
export function finishTour(): void; // writes 'completed'
export function closeTour(markComplete: boolean): void;
export function currentStep(): ResolvedStep | null;
```

The controller reads `session.user` for the id, role and status, as
`builtin-commands.ts` does. The completion mirror is `$state`, so
`hasCompletedTour()` is reactive and a reset immediately re-arms the gate. Only
routing and viewport width are injected, so the state transitions stay testable
without a router or a real window.

### 8.3 State machine

```
idle ──auto/manual start──▶ active ──next on last──▶ completed(write) ──▶ idle
                              │
                              ├──skip / Escape────────▶ completed(write) ──▶ idle
                              ├──finish / Start exploring─▶ completed(write) ──▶ idle
                              ├──route leaves `/`──────▶ idle (no write)
                              └──viewport < 1024 ──────▶ idle (no write)
```

- Starting resolves the step list first. If the resolved list is only the two
  bookends (no target survived), write `completed` and never open — this is the
  "nothing to point at" case, distinct from a failed inbox (§OD18).
- `skip` and `finish` are the only writes. Closing for a route change or resize
  leaves the tour armed for the next Home visit.
- `startedThisSession` is set when an auto-start actually resolves at least one
  spotlight step. It suppresses only the **auto** path, so a Home remount cannot
  re-open a tour the user dismissed, while **Help → Take the guided tour** can
  still replay it in the same document. Reset clears it; a reload resets it.

### 8.4 Mounting and lifecycle

`AppShell.svelte` renders `<OnboardingTour />` after `CommandPalette`, inside
`.app-shell` (it is a top-layer `<dialog>`, so nesting does not affect stacking):

```svelte
<ShortcutHelpDialog bind:open={helpOpen} />
<CommandPalette bind:open={paletteOpen} />
<OnboardingTour />
```

The component owns the DOM lifecycle and calls the store:

1. `onMount` → `maybeAutoStart()` after `setHomeInboxStatus` has had a chance to
   update (see `Home` wiring below).
2. `$effect` watches `tour.status`; when it flips to `active`, `dialog.showModal()`
   and schedules the first measurement.
3. `$effect` watches `tour.index`; on each change it scrolls, measures, places,
   and focuses the primary button.
4. On close: `dialog.close()`, restore focus to the remembered element, clear
   timers/listeners.

`/` wiring (`routes/+page.svelte`):

```ts
onMount(() => {
  void load();
  return () => setHomeInboxStatus('idle');
});

// after: inbox = await api.inbox.get();
setHomeInboxStatus('ready');

// in catch, before the failure state is rendered (401/403 returns early):
setHomeInboxStatus('failed');
```

`setHomeInboxStatus('ready')` runs before Svelte flushes the inbox markup, so the
controller waits `tick()` plus up to two `requestAnimationFrame`s (with a ~250 ms
watchdog so a throttled tab cannot hang the start) before resolving targets. This
guarantees the checklist and New report are in the DOM when the anchors are
queried.

Manual start from the Help menu while on another route:

1. `startTour({ navigate })` sets `pendingManualStart = true`.
2. If `page.url.pathname !== '/'`, await `navigate()`.
3. When `homeInbox.status === 'ready'`, the mounted component starts.
4. If the inbox reports `failed`, clear `pendingManualStart` and show
   `toast.error('The tour could not start because the work inbox did not load.')`.
   Auto-start simply stays armed and silent.

Starting is refused while another modal dialog is open (`dialog[open]:not([data-tour])`).
The overlay is modal, so the menu that launched it is already closed.

When the user is already on `/` with a ready inbox, the same effect starts the
pending manual tour immediately; `pendingManualStart` bypasses
`startedThisSession`, which is why Help can replay the tour in the same document.
If the inbox has already reported `failed`, clear the pending flag and show the
toast described above rather than leaving a start armed indefinitely.

### 8.5 Help menu and commands

`menu-model.ts`, in the existing `help` menu, in this order:

```ts
{ id: 'help.tour', label: 'Take the guided tour' },
{ id: 'help.reset-onboarding', label: 'Reset onboarding' },
{ id: 'help.shortcuts', label: 'Keyboard shortcuts', accelerator: '?' },
{ id: 'help.about', label: 'About Paperless PAR', separatorBefore: true },
```

`builtin-commands.ts` registers both with the command registry:

```ts
registerCommand({
  id: 'help.tour',
  enabled: () => session.user?.status === 'ACTIVE',
  disabledReason: () => 'Sign in to take the tour.',
  run: () => startTour({ pathname: page.url.pathname, navigate: () => goto('/') }),
});
registerCommand({
  id: 'help.reset-onboarding',
  enabled: () => session.user?.status === 'ACTIVE',
  disabledReason: () => 'Sign in to reset onboarding.',
  run: () => resetOnboarding({ pathname: page.url.pathname, navigate: () => goto('/') }),
});
```

`resetOnboarding()` clears the record for the current user, clears
`startedThisSession`, shows `toast.success('Onboarding reset.')`, and arms a
manual start. No confirmation dialog: the action is reversible (the tour can be
skipped or replayed) and the toast reports it.

Both entries render in the browser and the desktop shell, because `MenuBar` is
part of every shell page and the Help menu is not `desktopMenu`.

### 8.6 Shortcut suppression

`installGlobalShortcuts` currently acts on `/`, `?`, and `Ctrl/Cmd+K` with no
modal check. Add one guard after the existing Escape handling, using the testable
helper from `tour-eligibility.ts`:

```ts
if (hasOpenTourOverlay((selector) => document.querySelector(selector))) return;
```

The helper checks `dialog[open][data-onboarding-tour]`; it takes the query
function as an argument so its unit test needs no DOM.

Effects while the tour is open:

- `/` does not focus a page search field.
- `?` does not open the shortcut help sheet on top of the tour.
- `Ctrl/Cmd+K` does not open the palette.
- Escape is handled by the `<dialog>`'s `oncancel`; the global handler already
  returns early for Escape.

The tour's own `keydown` handles ArrowRight/ArrowLeft for Next/Back. It never
uses single-letter shortcuts, matching the "shortcuts are optional" rule.

---

## 9. Persistence

### 9.1 Record

```json
{ "version": 1, "outcome": "completed", "at": "2026-10-21T09:14:03.512Z" }
```

- `version` is `TOUR_VERSION`, a literal in `tour-storage.ts`.
- `outcome` is `completed` (finished) or `skipped` (Skip tour / Escape). Both
  suppress auto-open; the distinction exists for future analytics and for
  wording in later versions.
- `at` is an ISO UTC timestamp; never displayed in this feature.

### 9.2 Keys

```
par.onboarding.tour.<userId>
```

- Namespaced like `par.window.zoom`.
- Account-scoped from `session.user.id`, so two users on one machine each see the
  tour once.
- Never written before a user is known; signed-out pages have no shell anyway.

### 9.3 Versioning and reset

- A record whose `version !== TOUR_VERSION` is treated as absent, so bumping the
  constant re-arms the tour once.
- **Reset onboarding** removes the key and the in-memory mirror, then starts the
  tour immediately (OD16).
- **Take the guided tour** does not remove the key; finishing or skipping writes
  it again.
- Nothing is written merely because the welcome card appeared. A reload before
  **Get started** or **Skip tour** re-opens it; only an explicit action ends the
  first-run state. This keeps an accidental refresh from silently skipping the
  tour.

### 9.4 Cross-shell and privacy notes

- `localStorage` is per origin and per OS user profile. The browser and the
  packaged Tauri app use different origins, so each arm is independent; clearing
  site data re-arms the tour. This is accepted for OD1 and recorded in §18.
- The record contains no personal data beyond what the key prefix implies
  (a user id); it is never sent to the API.

---

## 10. Target resolution and positioning

### 10.1 Start resolution

```
tick()
→ rAF → rAF
→ hasTarget(anchor) for every configured anchor
→ resolveTourSteps({ role }, { hasTarget })
→ if resolved.length <= 2: write completed, stay idle
→ else: showModal(), index = 0
```

### 10.2 Step entry sequence

For every step with an anchor:

1. **Scroll into view** if the target is not fully inside the viewport:
   `element.scrollIntoView({ block: 'center', inline: 'nearest', behavior: 'auto' })`.
   `behavior` is forced to `auto`: `base.css` already disables smooth scrolling
   under reduced motion, and the tour must not race an in-flight smooth scroll.
2. **Wait for layout**: one `requestAnimationFrame`, then read
   `getBoundingClientRect()`.
3. **Measure the tooltip**: render it at `visibility: hidden`, read its size,
   then place it (§10.3) and reveal it in the next frame. This avoids the
   two-frame jump caused by estimating the card height.
4. **Apply geometry** to the hole and the tooltip, both `position: fixed` with
   viewport coordinates.
5. **Focus** the primary action and update the polite live region.

Bookends (welcome/finish) skip scrolling and spotlight geometry; they still
measure the card (step 3) in order to center it:
`top = (viewportHeight - cardHeight) / 2`, `left = (viewportWidth - cardWidth) / 2`,
clamped to the 16 px margin.

### 10.3 Tooltip placement algorithm

The hole is `spotlightRect`:

```
padding = 8
top    = max(0, rect.top - padding)
left   = max(0, rect.left - padding)
right  = min(viewport.width, rect.right + padding)
bottom = min(viewport.height, rect.bottom + padding)
```

`placeTooltip`:

1. Compute available space per side after `gap = 16` and `margin = 16`:
   `bottom = viewport.height - hole.bottom - gap - margin`, and so on.
2. A side fits when it can hold the tooltip's full height (top/bottom) or full
   width (left/right).
3. Preference order: the step's `preferred` side, then `bottom`, `top`, `right`,
   `left`.
4. Choose the first fitting side. If none fit (very tall target, 600 px window),
   choose the side with the largest space and constrain the tooltip with
   `max-height` + internal scroll; partial overlap with the dimmed target is
   acceptable, overlap with the _tooltip covering the whole viewport_ is not.
5. Cross-axis alignment: center on the hole, then clamp to the margins:
   - top/bottom → `left = clamp(centeredLeft, margin, viewport.width - tooltip.width - margin)`
   - left/right → `top = clamp(centeredTop, margin, viewport.height - tooltip.height - margin)`

   Clamping is what gives the titlebar targets their right-aligned look; no
   separate alignment field is needed.

6. No arrow or caret is drawn in v1; the ring identifies the target and the card
   stays close to it.

### 10.4 Repositioning

- `window.resize` (debounced 100 ms) → recompute scroll, hole, tooltip.
- `ResizeObserver` on the target is **not** used: the Home layout is static while
  the modal is open (the page is inert).
- Scroll position is not restored on close; the user stays where the last step
  left the viewport. Finishing with the checklist in view is deliberate (it is
  the next action), and Skip from an earlier step usually leaves the page at its
  original position. Opening and closing the tour never changes the page's
  layout or document height.
- Window height changes from the OS keyboard/zoom are covered by `resize`.
- A resize below 1024 px closes the tour without writing (§12).

### 10.5 Scroll and pointer containment

- The tour does **not** call `lockScroll()`. `overflow: hidden` would block the
  programmatic `scrollIntoView` needed for the checklist step on short windows.
- Instead the overlay consumes user scrolling: non-passive `wheel`, `touchmove`,
  and `keydown` handlers for PageDown/PageUp/Home/End call `preventDefault()`
  while the tour is open. Space is deliberately not intercepted: it must still
  activate the focused button. `overscroll-behavior: none` is already global.
- The dialog is `showModal()`, so the page behind it is inert; the scrim's
  transparent cutout is visual only. No click ever reaches the highlighted
  element (OD8).

---

## 11. Visual design

### 11.1 Tokens

Add exactly two tokens to `lib/styles/tokens.css` (the only file allowed to hold
raw color values):

```css
--backdrop-strong: rgb(15 26 51 / 62%);
--tour-halo: rgb(255 255 255 / 22%);
```

Everything else is existing semantics: `--surface-card`, `--border`,
`--text-primary`, `--text-secondary`, `--primary`, `--on-primary`,
`--radius-card`, `--radius-card-lg`, `--shadow-raised`, `--brand-navy-700`,
`--focus-ring`.

### 11.2 Overlay and spotlight

```
viewport
┌───────────────────────────────────────────────────────────┐
│ scrim (--backdrop-strong) over all chrome and page content │
│                                                           │
│      ┌─────────────────────┐                              │
│      │ highlighted target  │   hole + 8 px padding        │
│      │ navy 2 px ring      │                              │
│      └─────────────────────┘                              │
│                 ┌────────────────────────────┐            │
│                 │ tooltip (340 px)           │            │
│                 │ title · counter            │            │
│                 │ progress bar               │            │
│                 │ body                       │            │
│                 │ Skip   Back   Next         │            │
│                 └────────────────────────────┘            │
└───────────────────────────────────────────────────────────┘
```

- Scrim: a fixed, absolutely positioned hole element (its geometry is the
  spotlight rect, not `inset: 0`) with
  `box-shadow: 0 0 0 2px var(--brand-navy-700), 0 0 0 6px var(--tour-halo), 0 0 0 100vmax var(--backdrop-strong)`
  and `border-radius: 8px`. The 100vmax spread paints everything except the hole.
  `pointer-events: none` on the hole; the dialog itself is the click blocker.
- The hole's `top/left/width/height` transition over `220 ms`
  `cubic-bezier(0.22, 1, 0.36, 1)`; reduced motion collapses this to ~0 via the
  global rule in `base.css`.
- The highlighted element is not cloned, tinted, or transformed, so its own
  hover/active styling cannot fire while the page is inert.
- No gold, no maroon: the ring is navy, the halo is white, in line with OD13.

### 11.3 Card / tooltip anatomy

| Part           | Spec                                                                                                                                                                                                                                                                                             |
| -------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Container      | `background: var(--surface-card)`, `border: 1px solid var(--border)`, `border-radius: var(--radius-card-lg)`, `box-shadow: var(--shadow-raised)`, `padding: 20px`, `width: 340px`, `max-width: min(340px, calc(100vw - 32px))`, `max-height: calc(100dvh - 32px)`, internal scroll for the body. |
| Header row     | Title left, counter right, baseline aligned.                                                                                                                                                                                                                                                     |
| Title          | `16px / 600`, `--text-primary`, `margin: 0`.                                                                                                                                                                                                                                                     |
| Counter        | `12px`, `--text-secondary`, `font-variant-numeric: tabular-nums`, `Step 2 of 8`.                                                                                                                                                                                                                 |
| Progress       | 3 px track, `--border`; fill `--primary`; width `position / total * 100%`; 2 px radius; 180 ms width transition. Shown on every step, including welcome (1/total) and finish (full).                                                                                                             |
| Body           | `13px / 1.55`, `--text-secondary`, `margin: 10px 0 0`.                                                                                                                                                                                                                                           |
| Footer         | `display: flex`, `gap: 8px`, `margin-top: 16px`, `align-items: center`.                                                                                                                                                                                                                          |
| Skip tour      | Text button, `13px`, `--text-secondary`, left-aligned (`margin-right: auto`), min-height 32 px. Hidden on the final step.                                                                                                                                                                        |
| Back           | `.btn .btn-ghost` (or `.btn-outline` if the ghost reads too light against the card), hidden on step 1.                                                                                                                                                                                           |
| Primary action | `.btn .btn-primary` — the only filled navy button on the layer: `Get started`, `Next`, `Start exploring`.                                                                                                                                                                                        |
| Focus          | Existing `:focus-visible` ring (2 px `--focus-ring`, 2 px offset).                                                                                                                                                                                                                               |
| Open animation | Card fades + rises 4 px over 160 ms; step changes re-key the card so it replays. Bookends fade only.                                                                                                                                                                                             |
| Layering       | Native modal `<dialog>` top layer; no `z-index` added to page chrome.                                                                                                                                                                                                                            |

### 11.4 Content order and one-primary rule

- The tour is its own layer, so its primary button does not compete with the
  page's New report button; the page is dimmed and inert.
- Skip is never gold and never filled. Back is never filled.
- Status is never color alone: the ring is paired with the title and body naming
  the highlighted area.

### 11.5 Theme

Light only, per OD4. The overlay uses semantic tokens, so a future dark mode would
follow automatically once tokens flip; no `prefers-color-scheme` block is added
to this feature.

---

## 12. Interaction, keyboard, and accessibility

### 12.1 Controls per step

| Step           | Skip tour | Back | Primary         |
| -------------- | --------- | ---- | --------------- |
| Welcome        | yes       | no   | Get started     |
| Spotlight 2    | yes       | yes  | Next            |
| …              | yes       | yes  | Next            |
| Last spotlight | yes       | yes  | Next            |
| Finish         | no        | yes  | Start exploring |

- `Next` on the last spotlight advances to the finish card.
- `Back` never returns past the welcome card.
- `Skip tour` on the finish card is removed; Escape there finishes (writes
  `completed`), which is equivalent to Start exploring.

### 12.2 Keyboard

| Key                 | Action                                                             |
| ------------------- | ------------------------------------------------------------------ |
| `Tab` / `Shift+Tab` | Cycle within the dialog (existing `trapFocus`).                    |
| `Enter` / `Space`   | Activate the focused button.                                       |
| `ArrowRight`        | Next; no effect on the finish card.                                |
| `ArrowLeft`         | Back when not on the first step.                                   |
| `Escape`            | Skip (records `skipped`) or finish on the last step (`completed`). |

Arrow keys are handled only when the event originates inside the tour dialog, so
they cannot leak to the page. No letter shortcuts are introduced.

### 12.3 Focus

- On open and on every step change, focus the primary button (`Get started`,
  `Next`, `Start exploring`). The visible focus ring tells sighted keyboard users
  where they are; screen readers announce the button while the dialog's
  `aria-labelledby`/`aria-describedby` carry the step text.
- `trapFocus(event, dialog)` runs on `keydown` inside the dialog, matching
  `ShortcutHelpDialog`.
- On close, restore focus to `document.activeElement` captured before the tour
  opened. Auto-start usually has `body` as the active element; fall back to
  `#content` (`<main tabindex="-1">`).
- Focus restoration happens after `dialog.close()` in the same frame.

### 12.4 Screen readers

```html
<dialog
  class="tour"
  data-onboarding-tour
  aria-labelledby="tour-title"
  aria-describedby="tour-description"
  oncancel="{...}"
>
  <p class="sr-only" aria-live="polite">Step 2 of 8. Primary navigation.</p>
  …
</dialog>
```

- The dialog is modal, so the page behind it is not reachable — correct for OD8.
- The live region announces the step number and title on every change; it is the
  only thing that updates silently.
- The spotlight is `aria-hidden="true"` decoration; the target's accessible name
  is repeated in the step title.
- The progress bar is decorative (`<span class="track" aria-hidden="true">`);
  the text counter carries the same information.
- No `aria-label` duplicates the visible title on buttons; labels are the visible
  text.

### 12.5 Contrast and sizing

- Title `--text-primary` on white and body `--text-secondary` on white both meet
  AA at their sizes (existing token pairs).
- All controls are ≥32 px tall; the primary is ≥36 px via `.btn`.
- The tooltip width is fixed at 340 px, so copy must stay under ~60 words. The
  copy in §6.1 is within that.

---

## 13. Responsive behavior and failure modes

| Condition                                    | Behavior                                                                                           |
| -------------------------------------------- | -------------------------------------------------------------------------------------------------- |
| Viewport 1024–1439 px                        | Full tour; tooltips flip/clamp; checklist step scrolls into view.                                  |
| Viewport ≥1440 px                            | Full tour; no layout change.                                                                       |
| Viewport <1024 px at start                   | Tour does not open (the foundation notice owns that width).                                        |
| Resized below 1024 px during the tour        | Close without writing; the tour re-opens on a later eligible Home visit.                           |
| 200 % browser zoom at ≥1024 CSS px           | Coordinates are CSS pixels; the card clamps to the viewport margin.                                |
| Home inbox loading                           | Wait; nothing opens on the skeleton.                                                               |
| Home inbox request fails                     | Auto: stay armed, silent. Manual: disarm + `toast.error(...)`.                                     |
| Target unmounted between steps               | Reposition attempt yields a zero rect → skip forward to the next resolvable step; if none, finish. |
| Another modal opens (impossible via pointer) | Ignore; the tour owns the top layer.                                                               |
| Route changes (browser Back)                 | Close without writing.                                                                             |
| Storage throws on read/write                 | In-memory mirror for this document; no user-facing error.                                          |
| Signed out / account not ACTIVE              | Never starts.                                                                                      |
| No role / empty nav                          | Nav step dropped; tour still runs with the remaining anchors.                                      |
| `prefers-reduced-motion: reduce`             | No transitions or card rise; geometry jumps instantly (global CSS rule).                           |

The request's mobile tooltip repositioning is intentionally not implemented: the
product is desktop-only below 1024 px (`00-foundation.md` §4.7, §12), so there is
no app surface to tour there. The placement engine still flips and clamps at every
supported width.

---

## 14. Implementation notes

### 14.1 `<dialog>` skeleton

```svelte
<dialog
  bind:this={dialog}
  class="tour"
  data-onboarding-tour
  aria-labelledby="tour-title"
  aria-describedby="tour-description"
  oncancel={(event) => { event.preventDefault(); dismiss(); }}
  onkeydown={onKeydown}
>
  {#if step}
    <div class="hole" style:--hole-top={...} aria-hidden="true"></div>
    <div class="tour-surface" class:centered={!step.anchor} bind:this={surface}>
      <TourCard {step} onback={...} onnext={...} onskip={...} />
    </div>
  {/if}
</dialog>
```

- `dialog.showModal()` on `active`; `dialog.close()` on idle.
- `::backdrop { background: transparent }` because the hole element paints the
  scrim; the UA backdrop would otherwise double-darken.
- The dialog is `inset: 0; width: 100vw; height: 100dvh; max-width: none;
max-height: none; margin: 0; padding: 0; background: transparent; border: 0;
overflow: visible;`.
  \-`TourCard` is a pure presentational component (props in, callbacks out) so the
  SSR test can render it without a document. It owns no state beyond markup and
  derives `first`/`final` from `step.position` and `step.final`, so no duplicate
  props can disagree with the resolved list.

### 14.2 Controller watchers

`OnboardingTour.svelte`:

```ts
$effect(() => {
  const status = tour.status;
  if (status === 'active' && dialog && !dialog.open) {
    rememberFocus();
    dialog.showModal();
  }
  if (status === 'idle' && dialog?.open) dialog.close();
});

$effect(() => {
  // Re-run on index change and on step identity change.
  const index = tour.index;
  const step = tour.steps[index];
  if (!step || tour.status !== 'active') return;
  void positionStep(step);
});
```

`OnboardingTour.svelte` calls the gate from one effect:

```ts
let viewportWidth = $state(window.innerWidth);

$effect(() => {
  maybeAutoStart({ pathname: page.url.pathname, viewportWidth });
});
```

The effect reads `page.url.pathname` and the `viewportWidth` state, and the store
reads `tour.status`, `homeInbox.status` and `session.user` internally while it
runs, so eligibility is re-evaluated when any of those change. `viewportWidth` is
updated by the same debounced resize listener that repositions the tour. A small
`startedThisSession` module flag prevents re-opening loops while leaving Help
menus free to replay the tour.

### 14.3 Guard rails

- Every DOM access is behind `typeof document !== 'undefined'`; the component is
  client-only in practice, but `svelte/server` tests must not crash the module
  graph.
- Measurement uses `requestAnimationFrame` handles stored on the component and
  cancelled on destroy/step change.
- All listeners (`resize`, `wheel`, `touchmove`, `keydown`) are removed on
  destroy and on close.
- The component never writes to the route, fetches data, or mutates the session.

---

## 15. Testing

Tests sit beside source as `*.test.ts` and use `vitest run` (no config, no DOM).
Component markup tests use `render` from `svelte/server`, as
`ShortcutHelpDialog.test.ts` does.

### 15.1 Unit tests

**`tour-steps.test.ts`**

- A submitter with all anchors gets 8 steps in the declared order.
- A reviewer gets welcome, nav, queues, search, notifications, account, finish.
- An approver gets `queues`; an admin gets `admin` and not `queues` or
  `new-report`.
- `new-report` is dropped for a reviewer even when the anchor is stubbed true
  (role gate wins); it is dropped for a submitter when `hasTarget` is false.
- `position`/`total` are contiguous after filtering, `final` is only on the last.
- No title or description contains `!`.
- A navigation copy variant never mentions a destination the role lacks
  (e.g. the submitter string does not contain `Queues`).

**`tour-storage.test.ts`** (fake `StorageLike` over a `Map`)

- Fresh user → `isTourComplete` false.
- Write `completed` → true; write `skipped` → true.
- Version 0 record → false (re-armed).
- Corrupt JSON, `null`, array, missing `outcome` → false, no throw.
- `clearTourRecord` removes the key.
- A storage that throws on every operation → no throw, reads `null`, and the
  caller's in-memory fallback path is exercised via the controller test.
- Two user ids do not share state.

**`tour-eligibility.test.ts`**

- Auto-start true only for: idle, active account, `/`, home ready, width ≥1024,
  not completed, no modal.
- False for `/reports`, PENDING, failed inbox, width 1023, completed, already
  started, modal open.
- Manual start is allowed when completed but not when signed out or <1024.

**`tour-placement.test.ts`**

- Standard target mid-viewport → preferred `bottom`, centered.
- Target near the bottom → flips to `top`.
- Target near the right with `left` preference → flips to `bottom`.
- Clamps within the 16 px margin on all sides.
- Tooltip wider/taller than the viewport still returns a non-negative position.
- `spotlightRect` pads by 8 and clamps to viewport edges.
- Tall target (hole taller than viewport) → tooltip picks the largest space and
  never gets a negative top/left.

**`tour-controller.test.ts`** (pure state transitions)

- `nextStep` on the last step invokes `finishTour` and writes `completed`.
- `skipTour` writes `skipped` and resets to idle.
- `backStep` stops at 0.
- Starting with only bookends writes `completed` and stays idle.
- `resetOnboarding` clears the record and arms a manual start.
- `startTour({ pathname: '/reports', navigate: spy })` calls the injected
  navigation exactly once; with `pathname: '/'` it does not, and arms the start
  instead. The controller never imports `$app`; tests set `session.user` directly.
- Storage refusal still suppresses a second auto-start in the same document.

### 15.2 SSR markup test

`TourCard.test.ts` renders the card for a spotlight step and for the finish card:

- Title, body, and `Step 3 of 7` are present.
- The card renders the `tour-title` and `tour-description` ids that the dialog
  references through `aria-labelledby`/`aria-describedby`.
- Welcome shows `Get started` and `Skip tour`, no `Back`.
- Middle steps show `Back`, `Next`, `Skip tour`.
- Finish shows `Start exploring` and `Back`, no `Skip tour`, no `Next`.
- Exactly one `.btn-primary` in each render.
- The progress element is `aria-hidden="true"`.

### 15.3 Commands and shortcut guard

- `menu-model.test.ts` (new): Help contains `Take the guided tour` and
  `Reset onboarding` in order before `Keyboard shortcuts`; both resolve as
  enabled when registered.
- `tour-eligibility.test.ts` covers `hasOpenTourOverlay`: a query that returns an
  element → true; `null` → false. `keyboard.ts` stays a two-line guard around
  `installGlobalShortcuts`, and the manual QA script (§15.4 step 9) confirms the
  wiring end to end.

### 15.4 Manual QA script

Run the app:

```bash
pnpm --filter @par/web --filter @par/api dev
```

1. **Skip path.** Sign in as a submitter with an all-empty inbox. Home paints,
   then the welcome card appears. `Skip tour`; reload → no tour.
2. **Happy path.** Help → Reset onboarding → toast, Home, welcome. `Get started`
   → nav (ring, counter `Step 2 of 8`) → New report → search → bell → account →
   checklist (scrolled into view) → Setup complete → Start exploring. Focus
   lands on Home content; reload → no tour.
3. **Reload before acting.** Help → Reset onboarding, then reload while the
   welcome is open. The welcome returns, because nothing is recorded until Skip
   or Finish; `Skip tour` afterwards.
4. **Replay.** Navigate to `/reports`, then Help → Take the guided tour: the app
   returns to Home and opens the tour. Back and Next traverse the same steps.
   Escape closes and records `skipped`; reload → no tour.
5. **Storage.** DevTools → Application → Local Storage: exactly one
   `par.onboarding.tour.<userId>` key with `{"version":1,...}`.
6. **Reviewer.** Sign in as a reviewer: the tour contains Queues, no New report,
   no checklist, and the counter says `of 7`. An approver sees the same shape.
7. **Admin.** Sign in as an admin: Administration, no Queues, no New report, no
   checklist, `of 7`.
8. **Submitter with work.** A submitter with an existing draft: no checklist
   step; the counter reflects 7.
9. **Shortcuts.** While the tour is open: `?` does nothing, `/` does nothing,
   `Ctrl+K` does nothing, Tab and Shift+Tab cycle, Escape closes, ArrowRight and
   ArrowLeft move.
10. **Resize.** Drag 1024 → 1440: the card stays inside the viewport and never
    covers its target. Resize to 1000: the tour closes without writing; back at
    ≥1024 and Home it opens again.
11. **Zoom.** Browser zoom 200 % at 1280: the card stays within margins and the
    checklist step scrolls correctly.
12. **Reduced motion.** DevTools → Rendering → `prefers-reduced-motion: reduce`:
    no card rise, no hole animation; everything else identical.
13. **Desktop shell.** `pnpm --filter @par/desktop dev`, sign in, confirm the same
    flow, and confirm a fresh WebView2 profile shows the tour again.
14. **Screen reader.** NVDA or Narrator: the dialog name and description are
    announced, the counter update is announced politely, and buttons read their
    visible labels.

### 15.5 Commands

```bash
pnpm --filter @par/web exec vitest run src/lib/features/onboarding
pnpm --filter @par/web lint
pnpm --filter @par/web typecheck
pnpm turbo run build --filter=!@par/desktop
```

`pnpm verify` runs the whole workspace; run it before handing off if time allows.
A fix for a failing check must address the cause, not relax the assertion.

---

## 16. Acceptance checklist

Functional:

- [ ] The tour opens automatically on the first eligible Home visit and never
      again after completion.
- [ ] Welcome shows the purpose copy, `Get started`, and `Skip tour`.
- [ ] The spotlight dims the page, cuts a clear hole, and draws the navy ring +
      white halo around the real element.
- [ ] The tooltip does not cover its target at 1024, 1280, 1440, and 1920 px.
- [ ] Every step shows title, body, `Step N of M`, and the progress bar.
- [ ] `Next`, `Back`, `Skip tour`, and the final `Start exploring` all work.
- [ ] Back is absent on the welcome step; Skip is absent on the final step.
- [ ] Escape skips (or finishes on the last step) and writes the record.
- [ ] Completion survives a refresh and a new app launch.
- [ ] Help → Take the guided tour and Reset onboarding both work and are reachable
      on every shell page.
- [ ] Role variants resolve correctly for submitter, reviewer, approver, admin,
      and a submitter with existing inbox work.
- [ ] Missing targets are dropped and the counter renumbers.
- [ ] The tour never navigates away from `/` on its own.
- [ ] No page click fires while the tour is open; `/`, `?`, and `Ctrl/Cmd+K` are
      suppressed.

Quality:

- [ ] All new source files are under 400 lines; kebab-case modules;
      `PascalCase.svelte` components; no `utils/`, `helpers/`, `misc/`.
- [ ] No raw brand hex outside `tokens.css`.
- [ ] No new dependency; icons come from `@lucide/svelte`.
- [ ] Build passes with `pnpm turbo run build --filter=!@par/desktop`.
- [ ] Lint and typecheck pass for `@par/web`.
- [ ] Unit and SSR tests pass; no test asserts on timing or pixel values from a
      real browser.
- [ ] The overlay is not in the DOM (or is `display: none`) until the tour is
      active, so it cannot intercept clicks.
- [ ] `prefers-reduced-motion` removes the hole and card animations.
- [ ] No exclamation marks, no "Oops", no sentence that names a destination the
      role cannot reach.

---

## 17. Rollout notes

- The feature ships without a flag: no menu-item condition, no server work. The
  first deploy arms it for every `ACTIVE` account.
- If the tour must be held back after release, `TOUR_VERSION` can be bumped only
  to _re-arm_, not to disable; a temporary support lever is
  `localStorage.setItem('par.onboarding.tour.<userId>', '{"version":1,"outcome":"skipped","at":"..."}')`.
  A formal kill switch is out of scope.
- Support script for "the tour will not go away": check the key above, complete
  or skip it, or Help → Reset onboarding.
- The docs index (`docs/spec/ui/README.md`) does not list this spec because it is
  not a phase file; add a link only if the team decides to fold it into the phase
  series.

---

## 18. Deferred / future work

1. **Server-side onboarding state.** If the tour must be once per account across
   devices, add `tour_completed_version` to the account (expand/contract
   migration, `Account` contract field, `PATCH /me/onboarding`) and make
   `tour-storage` read remote state first. The controller already isolates
   persistence behind that module.
2. **A second tour for the wizard.** Reusing the engine on `/reports/new` needs a
   route-aware resume and anchors on the wizard steps; the engine is ready, the
   navigation policy is not.
3. **Click-to-advance coach marks.** Would require making the page interactive
   while keeping the modal guarantees; currently a deliberate non-goal.
4. **Tour analytics.** Step reach/skip rates need an analytics layer the app does
   not have.
5. **Dark-mode tokens.** If `00-foundation.md` §2.5 is ever reinstated, the tour
   inherits it through semantic tokens with no changes beyond the two new ones.
