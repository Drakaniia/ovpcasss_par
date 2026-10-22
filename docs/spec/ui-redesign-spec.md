# Application-wide UI refinement — implementation spec

**Status:** Draft for review, ready to implement after sign-off
**Scope:** `apps/web` (every route, shared primitives, all stylesheets); presentation
only — no API, schema, or workflow contract changes
**Track:** cross-cutting refinement after M8. It does **not** renumber UI phases
00–16; it is delivered as runs R0–R6 (§12) that sit on top of them
**Decided:** 2026-10-20

---

## 1. Request

Refine the **entire existing application** with one cohesive, modern surface
language: contained surfaces, subtle borders, comfortable inset spacing, a clear
type hierarchy, restrained elevation, and layouts that adapt to real viewport
widths **and heights**.

The application should read as one designed product — calm, structured, light —
where each region has a visible boundary without every region becoming a heavy
card. Visual and interaction design only; routes, permissions, validation, data
flow, and keyboard behaviour stay exactly as they are.

---

## 2. Success definition (measurable)

The work is done when all of the following are true, checked in the running app:

1. Every page gutter, inner padding, gap, and control height comes from the
   tokens in §7.2. No `padding: 24px`-style literals remain in page or component
   CSS outside `tokens.css`.
2. At rest, no page region carries a shadow. Shadows appear only on floating
   layers (dialog, drawer, popover, menu, toast, command palette).
3. Every route renders without clipping at **1024×600** and at **200 % zoom**, and
   every auth route renders without clipping at **360×640**.
4. Auth pages no longer centre vertically with fixed free space: content starts at
   a minimum top offset and the page scrolls when it does not fit.
5. No layout container height is computed from another element's pixel height.
   The `calc(100vh - <pixels>)` pattern is gone from all twelve call sites.
6. Every text input, select, textarea, and button is at least **36 px** tall;
   icon-only controls have a 36×36 hit box. Table-dense controls are the single
   documented exception at 30 px.
7. Every page-frame header renders through one `PageHeader`; no screen invents
   its own page frame, and no page-frame class is defined twice.
8. `pnpm --filter @par/web typecheck`, `pnpm lint`, `pnpm check:structure`, and the
   web unit tests pass. No test assertion is relaxed to make this true.

---

## 3. Current state (verified in this repo)

### 3.1 What already exists

| Fact                                                                                                                                                                                                                              | Where                                                    |
| --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------- |
| Single SPA, 24 `+page.svelte` routes; chrome wrapper `AppShell` (skip link, header, section tabs, `<main class="page-content">`)                                                                                                  | `apps/web/src/routes/`, `lib/components/AppShell.svelte` |
| Design tokens: palette, status colours, 3 radii, 2 shadows, 3 fonts. **No spacing, type-size, control-height, z-index, or motion tokens**                                                                                         | `lib/styles/tokens.css` (90 lines)                       |
| Shared component styles: `.page-content`, `.card`, `.btn*`, `.field*`, `.input/.select/.textarea`, `.table-scroll`, `.data-table`, `.dialog`, `.toast`, `.skeleton`, `.foundation-notice`                                         | `lib/styles/components.css` (433 lines)                  |
| Feature stylesheets layered on top: `accounts.css` (60), `edit-returned.css` (193), `facsimile.css` (172)                                                                                                                         | `lib/styles/`                                            |
| 24 shared components in `lib/components/` (incl. `AuthLayout`, `EditableSelect`, `DatePicker`, `SideDrawer`, `ConfirmDialog`, `CommandPalette`)                                                                                   | `lib/components/`                                        |
| Ten feature-owned page headers, using six page-frame class names (`.page-head` ×4, `.entity-head`, `.audit-header`, `.page-header`, `.wizard-head`, `.inbox-head`) plus the facsimile's own document header, each with scoped CSS | `lib/features/*/presentation/*Header.svelte`             |
| Desktop-only gate below 1024 px (fixed overlay), auth pages exempt                                                                                                                                                                | `components.css` §Foundation notice, `AppShell.svelte`   |

### 3.2 Inconsistencies the refinement has to remove

Measured across `lib/` and `routes/`:

| Symptom                                                                                                                                                  | Count                                                                      | Consequence                                                                                               |
| -------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------- |
| Raw `border-radius` literals (`4px`, `6px`, `10px`, `2px`, `1px`, `9999px`)                                                                              | 32                                                                         | Radii drift from the token scale                                                                          |
| Distinct ad-hoc `padding` values                                                                                                                         | 20+ (`16px`, `24px`, `48px 24px`, `10px 12px`, `12px 14px`, `6px 10px`, …) | Spacing has no rhythm; adjacent screens differ by 2–4 px                                                  |
| `max-height: calc(100vh - <pixels>)` with hard-coded chrome heights (`300px`, `320px`, `340px`, `240px`, `200px`, …)                                     | 12                                                                         | Breaks whenever the header, tabs, or page title changes height; guarantees clipping on short viewports    |
| `.card` carrying `box-shadow` at rest                                                                                                                    | 16 files use the class                                                     | Every region reads as a floating card, which is exactly the "collection of cards" failure the brief names |
| Two gutter definitions (`page-content` and `AppHeader .bar` both hard-code `1440px`/`24px`)                                                              | 2                                                                          | Header and content misalign the moment either changes                                                     |
| Page-frame class names                                                                                                                                   | 6                                                                          | No shared frame; every new page copies one of them                                                        |
| Vertical centring in `AuthLayout` (`min-height: 100vh`, `justify-content: flex-start`, `overflow: hidden`, fixed `clamp(84px, 12vh, 130px)` top padding) | 1                                                                          | The card cannot scroll; on short or zoomed viewports the footer and lower fields are unreachable          |
| Control heights: `.btn` 32, `.btn-primary` 36, `.btn-sm` 28, `.input/.select` 32 min-height                                                              | 4                                                                          | Mixed alignment on every form row; below the 36 px rule in `docs/spec/ui/README.md`                       |
| `z-index` values in use                                                                                                                                  | 0, 1, 2, 3, 4, 5, 10, 20, 40, 50, 60, 70, 100, 1000                        | Floating layers can disagree on who is on top                                                             |

None of this is a behavioural bug. It is drift, and the refinement is the moment
to collapse it into tokens and shared contracts.

---

## 4. Decisions

| #   | Decision                  | Choice                                                                                                                                                                                               | Rationale                                                                            |
| --- | ------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------ |
| D1  | Surface model             | Three tiers: **page → panel → inset**, plus **floating**                                                                                                                                             | Enough separation without a card per element                                         |
| D2  | Primary separation device | 1 px border first, background contrast second, shadow last                                                                                                                                           | Matches the brief; keeps the interface light                                         |
| D3  | Resting shadows           | Removed from `.card`; `--shadow-card` retained for opt-in sticky regions                                                                                                                             | Kills the "everything floats" reading                                                |
| D4  | Elevation                 | `--shadow-popover` / `--shadow-dialog` only on layers that truly float                                                                                                                               | Depth means "above the page", nothing else                                           |
| D5  | Spacing                   | 4 px base, ten-step token scale + three semantic tokens (gutter, page max, section gap)                                                                                                              | Removes the 20-value padding soup                                                    |
| D6  | Gutters                   | One source of truth: `--gutter-page`, consumed by header, tabs, and `page-content`                                                                                                                   | Header/content alignment becomes structural                                          |
| D7  | Radii                     | Keep `--radius-card` 6 px (surfaces + controls), `--radius-badge` 4 px, `--radius-card-lg` 12 px (floating), new `--radius-pill`                                                                     | Modest, already close; only 12 px moves (was 14)                                     |
| D8  | Typography                | Keep Montserrat; add `--text-*` tokens: 12/13/14/16/20/24/30; 13 px table body, 12 px meta                                                                                                           | Existing sizes were right; only their names were missing                             |
| D9  | Form controls             | 36 px default, 30 px table-dense, 36×36 icon hit box                                                                                                                                                 | Satisfies the repo's own 36 px non-negotiable                                        |
| D10 | Field boundary            | Inputs get `--border-field`, a mid-tone border measured at ≥3:1 against its surface                                                                                                                  | `#e4e1da` on white is ≈1.3:1 and fails 1.4.11                                        |
| D11 | Page header               | Extract `PageHeader.svelte` (title, description, actions, optional meta slot); every page-frame header keeps its role logic and renders it; the facsimile's document header stays a document heading | One implementation instead of six frame conventions                                  |
| D12 | Panels                    | CSS classes `.panel`, `.panel-inset`, `.panel-header`, `.toolbar`; no new component wrapper                                                                                                          | Lazy: styles, not abstraction                                                        |
| D13 | Tables                    | One `.table-scroll` contract; height from flex + `min-height: 0`, never from `100vh - N`                                                                                                             | Fixes the 12 magic numbers and short-viewport clipping                               |
| D14 | Dialogs / drawers         | `max-height: calc(100dvh - 2 * var(--space-6))`, flex column, scrollable body, `width: min(<max>, calc(100vw - 2 * var(--gutter-page)))`                                                             | Usable at 600 px and 200 % zoom                                                      |
| D15 | Auth layout               | No vertical centring: `padding-block-start: clamp(var(--space-10), 9vh, 96px)`, natural flow, page scrolls                                                                                           | The reported bug; centring is only correct when content is shorter than the viewport |
| D16 | Responsive reach          | Chrome layouts must hold at ≥1024 px and 200 % zoom; auth fully responsive to 360 px                                                                                                                 | Preserves the product's desktop-only rule, fixes the exempt screens                  |
| D17 | Navigation                | Keep the navy top bar + section tabs; refine spacing, active state, and hover only                                                                                                                   | Functional structure; no sidebar rebuild                                             |
| D18 | Print                     | Facsimile and print preview keep cream paper, serif type, and no new chrome                                                                                                                          | Print fidelity is a contract                                                         |
| D19 | Colour                    | No palette changes; add `--border-subtle`, `--border-field`, `--surface-sunken`, `--surface-raised`                                                                                                  | Brand stays; surfaces need one more step each                                        |
| D20 | Motion                    | `--ease-standard`, 120/180/280 ms; existing `prefers-reduced-motion` block unchanged                                                                                                                 | Feedback without decoration                                                          |
| D21 | Z-index                   | Single scale: content 1, sticky 10, header 20, menu 40, backdrop 60, drawer 70, dialog 80, toast 90, scrollbar 1000                                                                                  | Ends the guessing                                                                    |
| D22 | Gallery                   | `/dev/components` becomes the visual contract: every primitive, both surface tiers, token swatches                                                                                                   | Review happens against one page                                                      |
| D23 | Dependencies              | None added; no Tailwind theme rewrite; styles stay in `@layer components`                                                                                                                            | Nothing here needs a library                                                         |
| D24 | Work order                | R0 tokens → R1 shell + header + panel → R2 auth → R3 tables → R4 forms → R5 floating → R6 detail/print/audit                                                                                         | Foundation before pages, as UI phase 00 established                                  |
| D25 | Scope guard               | No route removed or added, no permission, validation, copy, or workflow change                                                                                                                       | The brief's §12                                                                      |

---

## 5. Goals

1. One surface language across 24 routes and 24 shared components.
2. Spacing, radii, type sizes, control heights, z-index, and motion expressed as
   tokens — the reason a screen looks right is discoverable in `tokens.css`.
3. Every page survives a 600 px-tall window and 200 % zoom without hiding a
   control or a scrollbar.
4. Auth screens work at phone width, because they are the one surface the
   desktop-only gate exempts.
5. Data-dense screens get _more_ readable, not less: 40 px rows, aligned columns,
   one container per table.

## 6. Non-goals

- Re-architecting navigation (no sidebar, no rail, no tile dashboard).
- Dark mode. The app is light-only by decision; tokens stay light.
- New features, new routes, new fields, new statuses.
- Replacing shadcn-svelte copies or Tailwind with another framework.
- Restyling the facsimile document itself or the printed acknowledgement.
- Removing the 1024 px foundation notice (a product decision, not a styling one —
  see §15, Q1).
- Pixel-perfect parity with any third-party product screenshot.

---

## 7. The surface system

### 7.1 Tiers

| Tier         | Token                                                                          | What belongs here                                                                                            |
| ------------ | ------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------ |
| **Page**     | `--surface-page` (existing `#f5f4f1`)                                          | The body behind everything. No border, no shadow.                                                            |
| **Panel**    | `--surface-card` (white) + `--border` + `--radius-card`                        | A region that owns content: table container, form section, detail block, inbox group, settings section.      |
| **Inset**    | `--surface-sunken` + `--border-subtle` + `--radius-sm`                         | A region inside a panel that is subordinate: filter bar, summary strip, read-only metadata, attachment list. |
| **Floating** | `--surface-card` + `--shadow-popover` / `--shadow-dialog` + `--radius-card-lg` | Dialog, drawer, popover, menu, toast, palette. Always above the page, never in normal flow.                  |

Rules:

- A panel is never nested inside another panel of the same tier. If content needs
  more separation inside a panel, use an inset or a divider.
- Panel headers (`.panel-header`) are a single row: title + optional count +
  optional actions, separated from the body by one `--border` hairline.
- Dividers are `1px solid var(--border)`. Whitespace alone separates groups that
  belong together; a border is used when two regions would otherwise merge.
- Body copy sits directly on the page tier; not everything deserves a panel.

### 7.2 Tokens to add (`apps/web/src/lib/styles/tokens.css`)

```css
/* Spacing: 4 px base. */
--space-1: 4px;
--space-2: 8px;
--space-3: 12px;
--space-4: 16px;
--space-5: 20px;
--space-6: 24px;
--space-8: 32px;
--space-10: 40px;
--space-12: 48px;
--space-16: 64px;

/* Layout: one source of truth for gutters and content width. */
--page-max: 1440px;
--gutter-page: clamp(16px, 2vw, 32px);
--panel-pad: var(--space-5);
--section-gap: var(--space-6);

/* Surfaces. */
--surface-sunken: #f0ede7;
--surface-raised: #ffffff;
--border-subtle: #edeae3;
--border-field: #948d7f; /* ≈3.3:1 on --surface-card; re-measure in R1 */

/* Radii. */
--radius-sm: 4px;
--radius-pill: 999px;

/* Elevation. Resting surfaces get none. */
--shadow-popover: 0 6px 16px rgb(15 26 51 / 10%);
--shadow-dialog: 0 16px 48px rgb(15 26 51 / 18%);

/* Type sizes. */
--text-xs: 12px;
--text-sm: 13px;
--text-md: 14px;
--text-lg: 16px;
--text-xl: 20px;
--text-2xl: 24px;
--text-3xl: 30px;

/* Controls. */
--control-height: 36px;
--control-height-sm: 30px;
--control-pad-x: var(--space-3);

/* Layers. */
--z-content: 1;
--z-sticky: 10;
--z-header: 20;
--z-menu: 40;
--z-backdrop: 60;
--z-drawer: 70;
--z-dialog: 80;
--z-toast: 90;
--z-scrollbar: 1000;

/* Motion. */
--ease-standard: cubic-bezier(0.22, 1, 0.36, 1);
--duration-fast: 120ms;
--duration-base: 180ms;
--duration-slow: 280ms;
```

Existing tokens keep their names. `--radius-card` stays 6 px and becomes the
default for panels and controls; `--radius-card-lg` becomes 12 px and is reserved
for floating layers. `--shadow-card` survives for sticky sub-headers only.

### 7.3 Spacing rules

- Page: `padding-inline: var(--gutter-page)`, `padding-block: var(--space-6)`.
- Panel: `padding: var(--panel-pad)`; a panel with a header pads only its body.
- Form rows: label → control `var(--space-2)`; control → hint `var(--space-1)`;
  field → field `var(--space-4)`; section → section `var(--space-6)`.
- Toolbars: `padding: var(--space-3) var(--space-4)`, `gap: var(--space-2)`.
- Tables: cell padding `0 var(--space-3)` for density columns,
  `0 var(--space-4)` for text columns.
- Nothing touches its container edge. Minimum inset inside any panel is
  `var(--space-4)`.

### 7.4 Borders and elevation

| Element                              | Border            | Shadow                                              |
| ------------------------------------ | ----------------- | --------------------------------------------------- |
| Page region                          | none              | none                                                |
| Panel                                | `--border`        | none                                                |
| Inset                                | `--border-subtle` | none                                                |
| Sticky table header / sticky toolbar | bottom `--border` | `--shadow-card` (opt-in)                            |
| Menu, popover, palette               | `--border`        | `--shadow-popover`                                  |
| Dialog, drawer                       | none              | `--shadow-dialog`                                   |
| Toast                                | `--border`        | `--shadow-popover`                                  |
| Input / select / textarea            | `--border-field`  | none; focus adds a 3 px `--focus-ring` ring at 16 % |

### 7.5 Typography

| Role             | Token             | Size / weight       | Colour             |
| ---------------- | ----------------- | ------------------- | ------------------ |
| Page title       | `--text-2xl`      | 24 / 600, `-0.01em` | `--text-primary`   |
| Page description | `--text-sm`       | 13 / 400            | `--text-secondary` |
| Panel title      | `--text-md`       | 14 / 600            | `--text-primary`   |
| Section label    | `--text-xs`       | 12 / 500, `0.02em`  | `--text-secondary` |
| Body             | `--text-md`       | 14 / 400, 1.5       | `--text-primary`   |
| Table body       | `--text-sm`       | 13 / 400            | `--text-primary`   |
| Meta / hint      | `--text-xs`       | 12 / 400            | `--text-secondary` |
| Facsimile        | `--font-document` | unchanged           | `--text-paper`     |

No new font, no external request, no weight above 600.

### 7.6 Dark mode

Out of scope; tokens are light-only and the spec that established this stands.
`prefers-color-scheme` must not change surfaces.

---

## 8. Component contracts

### 8.1 `.panel` / `.panel-inset`

```css
.panel {
  background: var(--surface-card);
  border: 1px solid var(--border);
  border-radius: var(--radius-card);
}
.panel-header {
  align-items: center;
  border-bottom: 1px solid var(--border);
  display: flex;
  gap: var(--space-2);
  justify-content: space-between;
  padding: var(--space-3) var(--space-4);
}
.panel-body {
  padding: var(--panel-pad);
}
.panel-inset {
  background: var(--surface-sunken);
  border: 1px solid var(--border-subtle);
  border-radius: var(--radius-sm);
  padding: var(--space-3) var(--space-4);
}
```

`.card` remains as a deprecated alias of `.panel` for one track, then is removed.
`.card`'s `box-shadow` is dropped in R0; the 16 files using it gain nothing to
change.

### 8.2 `PageHeader.svelte` (new, `lib/components/`)

```ts
let {
  title, // string
  description, // string | undefined
  actions, // Snippet | undefined  — one primary action, right aligned
  meta, // Snippet | undefined  — badges, counts, breadcrumb
}: Props = $props();
```

Layout: wrapping flex row, `align-items: flex-start`, `gap: var(--space-6)`,
`margin-bottom: var(--section-gap)`, title block `min-width: 0` so long
descriptions wrap instead of pushing actions off-screen. Below 1100 px the
actions move under the title (`flex-wrap: wrap`) rather than shrinking.

The existing page headers keep their data and permission logic and delegate their
markup to `PageHeader`; their local frame CSS (`.page-head`, `.entity-head`,
`.audit-header`, `.page-header`, `.wizard-head`, `.inbox-head`) is deleted.
`FacsimileHeader` and the facsimile's document title row are **not** page frames
and keep their own document styling.

### 8.3 `.toolbar`

A single row above a table or list: search, filters, view switch, secondary
actions. `gap: var(--space-2)`, wraps at narrow widths, sits inside the panel's
header band when it filters that table, otherwise in its own inset strip.

### 8.4 Tables

- One container: `.table-scroll` (border, radius, `overflow: auto`).
- Height comes from the layout: the page becomes a flex column with
  `min-height: calc(100dvh - <measured chrome>)` **replaced by**
  `flex: 1; min-height: 0` inside a `height: 100dvh` shell, so the table scrolls
  inside the viewport without pixel arithmetic.
- Where a table is not the page's main body (queues, search, exports preview),
  it keeps an intrinsic height with `max-height: none` and the page scrolls.
- Header row: `position: sticky; top: 0`, `--surface-card`, bottom hairline.
- Rows: 40 px, 13 px type, hover `--row-hover`, selected `--row-selected`.
- Numeric and date columns: `font-variant-numeric: tabular-nums`, right aligned.
- Secondary columns hide at 1279 px (existing rule); nothing essential hides.
- No per-row card. Actions live in a row menu or a single trailing cell.

### 8.5 Forms

- `.field` gap `var(--space-2)`; label `--text-xs`, 500, `--text-secondary`.
- Control height `--control-height`; padding `0 var(--control-pad-x)`; radius
  `--radius-card`; border `--border-field`.
- States: hover raises the border one step; focus adds the 3 px ring; filled is
  identical to default (the border carries no "dirty" meaning); disabled uses
  `--surface-sunken` + `--text-disabled`; invalid uses `--status-danger-fg`.
- Grouped fields sit in a panel section with one heading and `--space-4` between
  rows; a wizard step is one panel with sections, not a card per field.

### 8.6 Floating layers

| Layer           | Width                          | Radius             | Shadow  | Max height                          |
| --------------- | ------------------------------ | ------------------ | ------- | ----------------------------------- |
| Menu / popover  | content, `min 200px`           | `--radius-card-lg` | popover | `min(60dvh, 480px)`                 |
| Command palette | `min(560px, 100vw - gutter×2)` | `--radius-card-lg` | dialog  | `70dvh`                             |
| Dialog          | `min(440px, 100vw - gutter×2)` | `--radius-card-lg` | dialog  | `calc(100dvh - 2 * var(--space-6))` |
| Drawer          | `min(480px, 100vw)`            | left corners only  | dialog  | `100dvh`                            |
| Toast           | `min(380px, 100vw - gutter×2)` | `--radius-card`    | popover | —                                   |

Dialogs and drawers are flex columns: fixed header, `overflow: auto` body, fixed
footer. A dialog that cannot fit its content scrolls its body; the confirm button
never leaves the viewport.

### 8.7 Auth shell (`AuthLayout.svelte`)

- Structure stays: decor, brand block, card, footer.
- Vertical behaviour: **no centring**. `padding-block-start:
clamp(var(--space-10), 9vh, 96px)`, `padding-block-end: var(--space-8)`,
  natural document flow, `overflow: visible`, page scrolls when needed.
- No `min-height: 100vh` on the auth page; the brand block and card define the
  height. A `min-height: 100dvh` is allowed only on a wrapper that also has
  `display: flex; flex-direction: column` and lets content overflow.
- Card: `width: min(440px, calc(100% - 2 * var(--gutter-page)))`, padding
  `var(--space-6)` (shrinks to `var(--space-4)` under 480 px).
- Decor: below 768 px the campus scene and corner bands are dropped; the page
  becomes a plain paper field with the brand lockup.
- The footer sits in flow with `--space-6` above it, never fixed.

### 8.8 Application chrome

- Header: `height: 56px`, `max-width: var(--page-max)`, `padding-inline:
var(--gutter-page)` — the same two values as `page-content`.
- Nav links: 36 px tall hit area inside the 56 px bar, `--space-3` horizontal,
  active state keeps the 2 px gold underline plus 500 weight (never colour alone).
- Section tabs: same horizontal track as the header and page content; 40 px tall;
  active tab uses an underline and weight, hover uses a subtle fill.
- Tools (search, bell, avatar): 36 px targets, 8 px gaps, borders only on the
  search trigger.
- Main content: `max-width: var(--page-max)`, `margin-inline: auto`, block padding
  `var(--space-6)`.

---

## 9. Layout and responsive contract

### 9.1 Widths

| Range     | Behaviour                                                                 |
| --------- | ------------------------------------------------------------------------- |
| ≥1440 px  | Content capped at `--page-max`, centred; master–detail splits allowed     |
| 1280–1439 | Full-width content, `--gutter-page`                                       |
| 1024–1279 | Secondary table columns collapse; page headers wrap; toolbars wrap        |
| 768–1023  | Chrome screens show the foundation notice (unchanged); auth renders fully |
| <768      | Auth only: single column, decor removed, card padding `--space-4`         |
| <480      | Auth card fills the width minus gutters; brand lockup scales to 60 vw     |

### 9.2 Heights

1. Nothing is vertically centred against the viewport unless it is a floating
   layer with its own scroll container.
2. No `calc(100vh - Npx)`. Chrome height is derived by flex, not arithmetic:
   shell `height: 100dvh` (not `min-height`), `main { flex: 1; min-height: 0;
overflow: auto }`, pages that need a fixed table body use
   `display: flex; flex-direction: column; min-height: 0`.
3. `100dvh` replaces `100vh` wherever a full-height region exists, so mobile
   browser chrome cannot create a scroll trap.
4. Section gaps collapse before content does: on a 600 px window, spacing drops
   to `--space-4` (via one `@media (max-height: 720px)` rule per scroll region,
   not per component).
5. Scrolling belongs to one element per view. Nested scroll areas are allowed only
   for a table body or a dialog body, never both inside one another.

### 9.3 Auth pages (the reported defect)

Before: `min-height: 100vh`, `justify-content: flex-start`, `overflow: hidden`,
fixed `clamp(84px, 12vh, 130px)` top padding, `align-items: center`. The card is
centred-ish by a fixed pad; when the viewport shortens or the card grows(register, reset with errors) the bottom is cut off and cannot be reached.

After:

- `padding-block-start: clamp(var(--space-10), 9vh, 96px)` — padding, not centring.
- `overflow: visible`; the document scrolls.
- Card and footer in normal flow; `--space-6` between brand, card, and footer.
- Heights are content-driven; no `100vh` on the auth page itself.
- Accepts 360 px width without horizontal scroll.

### 9.4 Data-dense pages

Queue and search screens keep their master–detail split at ≥1440 px. The detail
pane becomes a panel with its own scroll; the list keeps the page scroll. At
1024–1439 px the split collapses to a full-page detail route (already the
behaviour).

---

## 10. Route-by-route plan

| Route                                                                         | Container change                        | Specific work                                                                                                                                                  |
| ----------------------------------------------------------------------------- | --------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `/login`, `/register`, `/forgot-password`, `/reset-password`, `/verify-email` | Auth shell                              | §8.7; card padding/token pass; form controls at 36 px; decor drop under 768 px                                                                                 |
| `/` (work inbox)                                                              | Page + 2–3 panels                       | `InboxPageHeader` → `PageHeader`; each group becomes a `.panel` with `.panel-header`; remove card shadows; empty/loading states inside the panel, not floating |
| `/reports`                                                                    | Panel with table                        | `ReportsPageHeader` → `PageHeader`; toolbar in `.panel-header`; table height from flex; remove `calc(100vh - 300px)`                                           |
| `/reports/new`                                                                | Wizard: page header + step panel + rail | Steps are sections inside one panel; field gaps from tokens; fixed footer bar becomes a sticky panel footer inside the content width                           |
| `/reports/[id]/edit`                                                          | Wizard-like                             | Same treatment as `/reports/new`; conflict dialog per §8.6                                                                                                     |
| `/reports/[id]`                                                               | Facsimile                               | Record mode: document panel + metadata inset + action bar. Paper styling untouched                                                                             |
| `/reports/[id]?print=1`                                                       | Print                                   | No change beyond ensuring no new chrome leaks into print                                                                                                       |
| `/review`, `/approval`                                                        | Tables + drawer                         | Queue header → `PageHeader`; row actions unchanged; drawer per §8.6                                                                                            |
| `/review/[id]`, `/approval/[id]`                                              | Master detail                           | Document panel + decision inset; sticky action footer inside content width                                                                                     |
| `/search`                                                                     | Results + preview                       | Two panels; remove `calc(100vh - 340px)`/`240px`; toolbar in panel header                                                                                      |
| `/notifications`                                                              | List panel                              | Header → `PageHeader`; rows as a divided list inside one panel, not cards                                                                                      |
| `/exports`                                                                    | Form + preview                          | Form in a panel with sections; preview dialog per §8.6; remove `calc(100vh - 240px)`                                                                           |
| `/profile`                                                                    | Sections                                | Account, password, signature as three panels with `--section-gap`                                                                                              |
| `/admin/users`                                                                | Panel with table                        | Header → `PageHeader`; drawer for edits                                                                                                                        |
| `/admin/reference-data`                                                       | Tabs + panel                            | Tabs get the shared 40 px contract; entry drawer per §8.6; editable selects at 36 px                                                                           |
| `/admin/audit`                                                                | Panel with table                        | Remove `calc(100vh - 48px)`; filter toolbar; 13 px mono cells                                                                                                  |
| `/admin/import`                                                               | Form                                    | Panel sections; drop zone inset                                                                                                                                |
| `/dev/components`                                                             | Gallery                                 | Becomes the contract page: tokens, panels, controls, states, floating layers, table, empty/error/skeleton                                                      |

---

## 11. Accessibility

- Visible focus on every interactive element: 2 px `--focus-ring` + 2 px offset
  (existing), plus the 3 px field ring on inputs.
- Field borders meet 3:1 against their adjacent surface (D10).
- Status never colour alone; keep label + icon in `StatusBadge`.
- Hit targets ≥36×36 for icon-only controls.
- Dialogs keep `aria-modal`, focus trap, Escape, and return focus to trigger.
- Drawers keep labelled headings and a visible close control.
- Reduced motion honoured through the existing block; new transitions use the
  duration tokens so the override still applies.
- Contrast: `--text-secondary` on `--surface-page`, `--surface-card`, and
  `--surface-sunken` verified in R6 at 4.5:1 for body-size text.
- Skip link stays first; `#content` stays focusable.

---

## 12. Delivery plan

Each run ends green: `pnpm --filter @par/web typecheck`, targeted
`pnpm --filter @par/web exec vitest run <path>`, `pnpm lint`,
`pnpm check:structure`.

### R0 — Tokens and primitive CSS

Files: `lib/styles/tokens.css`, `lib/styles/components.css`, `lib/styles/base.css`.

- Add every token in §7.2; switch `.card`, `.btn*`, `.field*`, `.input/.select/
.textarea`, `.table-scroll`, `.data-table`, `.dialog`, `.toast` to tokens.
- Drop `.card`'s shadow; add `.panel`, `.panel-header`, `.panel-body`,
  `.panel-inset`, `.toolbar`.
- Reconcile control heights to 36/30.
- Replace raw radii with tokens in `accounts.css`, `edit-returned.css`,
  `facsimile.css`.
- Verify `--border-field` contrast and record the measured value in a comment.

Acceptance: no visual regression beyond the intended shadow removal; typecheck and
structure checks pass; `tokens.css` is the only file with raw hex except the
facsimile's paper values.

### R1 — Shell, gutters, page header, gallery

Files: `components/AppShell.svelte`, `components/AppHeader.svelte`,
`components/SectionTabs.svelte`, new `components/PageHeader.svelte`,
the `*Header.svelte` files that own a page frame,
`routes/dev/components/+page.svelte`.

- Header, tabs, and content share `--page-max`/`--gutter-page`.
- Header tools and nav links at 36 px.
- `PageHeader` extracted; every page-frame header delegates; no duplicate frame
  styling remains.
- Gallery rebuilt on the new tokens.

Acceptance: header and content edges align at every width; `.page-head` exists once;
all pages render with the new header.

### R2 — Auth shell

Files: `components/AuthLayout.svelte`, `routes/*/+page.svelte` (auth), auth form
components in `lib/features/auth/presentation/`.

- §8.7 vertical model, responsive card, decor breakpoints, footer in flow.
- Forms at 36 px; error summaries inside the card.

Acceptance: `/register` with a validation error scrolls at 1024×600, 800×600,
375×667, and 200 % zoom; nothing clipped; no horizontal scroll at 360 px.

### R3 — Tables and lists

Files: `components/SkeletonTable.svelte`, `features/reports/presentation/
ReportTable.svelte`, `features/queues/presentation/QueueTable.svelte` +
`QueuePreview.svelte`, `features/search/presentation/SearchResults.svelte` +
`SearchPreview.svelte`, `features/audit/presentation/AdminAuditPage.svelte`,
`features/admin/presentation/ReferenceDataTable.svelte`, inbox list components.

- Remove all twelve `100vh - N` heights; flex-based containment; sticky headers
  with a real scroll parent.
- Toolbars move into panel headers.

Acceptance: every table scrolls inside its panel at 1024×600; header stays sticky;
no double scrollbars; empty state fills the panel body.

### R4 — Forms, wizard, admin

Files: `features/reports/presentation/ReportWizardPage.svelte`,
`WizardStep*.svelte`, `ReportFormGroups.svelte`, `WizardField.svelte`,
`EditableSelect.svelte`, `DatePicker.svelte`, `CalendarPopover.svelte`,
`features/reports/presentation/EditReturned*`, `features/admin/presentation/
ReferenceEntryDrawer.svelte`, `features/profile/presentation/*`.

- Field rhythm, section panels, 36 px controls, tokenised popovers.
- Wizard footer inside the content width.

Acceptance: wizard usable at 1024×600 with the footer reachable; no field label
collision; popover stays inside the viewport on the last row of the page.

### R5 — Floating layers

Files: `ConfirmDialog.svelte`, `SideDrawer.svelte`, `CommandPalette.svelte`,
`ShortcutHelpDialog.svelte`, `ToastRegion.svelte`, `NotificationMenu.svelte`,
`AvatarMenu` (inside `AppHeader`), `ExportPreviewDialog.svelte`,
`ConflictDialog.svelte`.

- §8.6 sizing, flex column bodies, z-index tokens, popover shadows.

Acceptance: at 1024×600 and 200 % zoom, every dialog shows title, scrollable body,
and its primary action without clipping; Escape and focus return still work.

### R6 — Detail, facsimile, print, audit pass

Files: `features/facsimile/presentation/*`, `lib/styles/facsimile.css`,
`features/exports/*`, `features/notifications/*`, remaining page-level CSS.

- Record-mode panels around the document, metadata insets, sticky action bar.
- Print output unchanged or improved.
- Full visual audit against §2; fix any remaining literal or one-off.

Acceptance: §2 checklist satisfied end to end; gallery matches the app.

---

## 13. Verification

### 13.1 Automated

```bash
pnpm --filter @par/web typecheck
pnpm --filter @par/web test                 # vitest run for the web package
pnpm lint
pnpm check:structure
```

Add focused tests where behaviour is observable without a DOM:

- `PageHeader` renders title, description, actions, meta (`svelte/server` render).
- `AuthLayout` renders children plus footer and never sets a fixed 100vh class.
- Panel/table class contracts: a small render test asserting `.panel-header` and
  `.table-scroll` wrappers exist on the reports table and inbox list.

### 13.2 Manual matrix (required, screenshots)

| Width × height         | Screens                                  |
| ---------------------- | ---------------------------------------- |
| 1920×1080              | inbox, reports, report detail, gallery   |
| 1440×900               | reports, queues (split), search          |
| 1366×768               | inbox, wizard, queue row menu            |
| 1280×800               | reference data + drawer, exports         |
| 1024×600               | every route; dialogs and drawers on each |
| 800×600                | `/login`, `/register` with error         |
| 375×667                | `/login`, `/register`, `/reset-password` |
| 200 % zoom at 1280×800 | login, reports, wizard footer, dialog    |

Record failures as rows in the run log; a screenshot that shows clipping is a
failed check, not a note.

### 13.3 Regression checks outside the browser

- Print preview and acknowledgement PDF unchanged (compare a rendered page).
- Keyboard-only pass on one list route and one form route.
- No new external network request (fonts and brand assets stay local).

---

## 14. Risks

| #   | Risk                                                                                    | Mitigation                                                                                                                        |
| --- | --------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------- |
| R1  | Shadow removal flattens hierarchy on dense pages                                        | Border + tier contrast carries it; use insets for grouping; review on 1366×768                                                    |
| R2  | Token migration touches 1 300 lines of CSS and can shift many screens at once           | R0 is styles-only and reviewed before any page edits; gallery as the diff baseline                                                |
| R3  | `height: 100dvh` shell changes scroll ownership and can hide content behind sticky bars | Keep one scroll element; verify at 600 px on every route in R3/R4                                                                 |
| R4  | Nine page headers have divergent markup (breadcrumbs, counts, role switches)            | Extract only the shared frame; keep feature-specific slots; migrate one header per commit                                         |
| R5  | `--border-field` at 3:1 looks heavy next to hairline panels                             | Mid-tone border measured, not guessed; pair with the focus ring; revisit in R6 if it reads as a box, but never lower it below 3:1 |
| R6  | Auth responsive work conflicts with the desktop-only product rule                       | Auth is exempt by the existing spec; chrome screens keep the 1024 gate                                                            |
| R7  | Tailwind preflight resets surprise scoped styles                                        | All shared rules stay in `@layer components`; no arbitrary-value utilities added                                                  |

---

## 15. Open questions

- **Q1 —** Does the desktop-only gate below 1024 px still hold for chrome screens
  after this track? The spec assumes **yes** (§16, A2). If the answer becomes no,
  R2's responsive rules already cover the auth shell and the token system is ready,
  but list and wizard layouts would need their own responsive pass — a separate
  spec, not a silent extension of this one.
- **Q2 —** Should the reports table own the viewport height (fixed table body) or
  scroll with the page? This spec picks **fixed body with sticky header**, because
  the queue screens triage dozens of rows; confirm with the office.
- **Q3 —** Is `--radius-card` 6 px the final surface radius, or should panels move
  to 8 px? 6 px is kept for continuity; the gallery makes the comparison cheap.
- **Q4 —** Does the facsimile need the new panel treatment at all, or should it stay
  a document on paper with no surrounding chrome? Assumed: one wrapping panel plus
  insets, document untouched.

## 16. Assumptions

- **A1** Visual-only: no route, contract, permission, or workflow change.
- **A2** The 1024 px foundation notice remains for chrome routes; auth pages
  stay exempt and must work down to 360 px.
- **A3** Montserrat stays the UI face; no new font, no CDN.
- **A4** Light mode only.
- **A5** Tailwind remains a reset/utility layer; the design system lives in
  `@layer components` and CSS custom properties.
- **A6** shadcn-svelte copies stay as copied; no package is added.
- **A7** Printable output is out of scope for restyling, in scope for regression
  checking.

---

## 17. Acceptance checklist

- [ ] Tokens in §7.2 exist; no raw spacing, radius, type-size, z-index, or shadow
      literals remain outside `tokens.css` (documented exceptions: facsimile paper
      values).
- [ ] Resting surfaces carry a border and no shadow; floating layers use
      `--shadow-popover` / `--shadow-dialog`.
- [ ] `.card` shadow removed and `.panel`/`.panel-inset` adopted across every route.
- [ ] `PageHeader` used by every page frame; no page-frame class defined twice.
- [ ] Header, section tabs, and page content share gutters and max width at every
      width.
- [ ] Zero `calc(100vh - Npx)` in the codebase; zero double scrollbars.
- [ ] Auth pages: no vertical centring, top offset from padding, page scrolls,
      works at 360 px and 200 % zoom, decor degrades below 768 px.
- [ ] All primary controls 36 px; dense table controls 30 px; icon targets 36×36.
- [ ] Dialogs and drawers keep title, scrollable body, and primary action visible
      at 1024×600 and 200 % zoom.
- [ ] Tables: sticky header, single scroll container, 40 px rows, 13 px type.
- [ ] Gallery at `/dev/components` reflects every primitive and state.
- [ ] Print preview and acknowledgement output unchanged.
- [ ] Focus visible everywhere; status never colour alone; `prefers-reduced-motion`
      respected.
- [ ] `pnpm --filter @par/web typecheck`, `pnpm --filter @par/web test`,
      `pnpm lint`, and `pnpm check:structure` pass; any failure reported, none
      suppressed.
- [ ] Screenshot matrix in §13.2 captured and reviewed; no clipping.
