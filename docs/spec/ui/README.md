# UI phase specs: runbook

The UI/UX contract in [`../par-ui-ux-spec.md`](../par-ui-ux-spec.md) is one
1,100-line document. Implementing it in a single session produces drift and
half-finished screens. This folder splits it into **one runnable phase per
session**, ordered by the milestone in §13 of the UI spec.

The original document is still the source contract. These files reorganize it;
they do not change any decision in it. If a phase file disagrees with
`par-ui-ux-spec.md`, the original wins and the phase file is wrong.

## How to run a phase

1. Start the session in the repo root, with the workspace installed
   (`pnpm install`) so lint, typecheck, and build can run.
2. Prompt the agent with:

   ```
   Implement docs/spec/ui/<phase-file>. Read docs/spec/ui/00-foundation.md
   first. Use apple-design as the UI baseline, refine with antislop-ui, and
   implement strictly with ponytail. Build only what this phase scopes. Do not
   refactor other phases' screens. Finish by walking the acceptance checklist
   and reporting evidence for each item; report anything you could not verify
   as not verified.
   ```

3. Read the acceptance checklist before coding; it is the definition of done.
4. Run one phase at a time. Phases grouped as parallel-safe in the run order
   touch disjoint files and can run in separate worktrees, but must not edit
   shared primitives (`lib/components`, `app.css`) concurrently — foundation is
   the only phase allowed to do that.

## Phases

| #   | Phase file                                                   | Milestone | Screens / routes                                                                                                                     | Depends on             |
| --- | ------------------------------------------------------------ | --------- | ------------------------------------------------------------------------------------------------------------------------------------ | ---------------------- |
| 00  | [`00-foundation.md`](./00-foundation.md)                     | M0        | Tokens, shell, nav, shared primitives                                                                                                | —                      |
| 01  | [`01-auth-and-account.md`](./01-auth-and-account.md)         | M1        | `/login`, `/register`, `/verify-email`, `/forgot-password`, `/reset-password`, `/awaiting-approval`, `/profile` (account + password) | 00                     |
| 02  | [`02-work-inbox.md`](./02-work-inbox.md)                     | M1        | `/` work inbox, onboarding checklist                                                                                                 | 00, 01                 |
| 03  | [`03-admin-users.md`](./03-admin-users.md)                   | M1        | `/admin/users`                                                                                                                       | 00, 01                 |
| 04  | [`04-admin-reference-data.md`](./04-admin-reference-data.md) | M2        | `/admin/reference-data`                                                                                                              | 00, 03                 |
| 05  | [`05-reports-table.md`](./05-reports-table.md)               | M3        | `/reports`                                                                                                                           | 00                     |
| 06  | [`06-create-wizard.md`](./06-create-wizard.md)               | M3        | `/reports/new`, attachment uploader, completeness checklist                                                                          | 00, 04, 05             |
| 07  | [`07-edit-returned.md`](./07-edit-returned.md)               | M3        | `/reports/[id]/edit`, conflict dialog                                                                                                | 06                     |
| 08  | [`08-facsimile.md`](./08-facsimile.md)                       | M4        | `/reports/[id]`, `/reports/[id]?print=1`, acknowledgement download                                                                   | 00, 06                 |
| 09  | [`09-queues-and-decisions.md`](./09-queues-and-decisions.md) | M4        | `/review`, `/review/[id]`, `/approval`, `/approval/[id]`, decision drawer, signature card                                            | 05, 08                 |
| 10  | [`10-repository-search.md`](./10-repository-search.md)       | M5        | `/search`                                                                                                                            | 05, 08, 09             |
| 11  | [`11-notifications.md`](./11-notifications.md)               | M5        | `/notifications` (new route), bell menu                                                                                              | 00, 01                 |
| 12  | [`12-global-tools.md`](./12-global-tools.md)                 | M5        | Shortcut help, command palette (derived)                                                                                             | 00                     |
| 13  | [`13-admin-audit.md`](./13-admin-audit.md)                   | M5        | `/admin/audit`                                                                                                                       | 00                     |
| 14  | [`14-exports.md`](./14-exports.md)                           | M6        | `/exports`                                                                                                                           | 00, 05, 08             |
| 15  | [`15-desktop-shell.md`](./15-desktop-shell.md)               | M7        | SQLite drafts, OS credential store, file dialog, print in the webview                                                                | 01, 06, 07, 08         |
| 16  | [`16-quality-pass.md`](./16-quality-pass.md)                 | M8        | Cross-screen audit: a11y, zoom, contrast, print                                                                                      | all                    |
| 17  | [`17-email.md`](./17-email.md)                               | M8+       | `/admin/emails` (**new route**), `/profile` (Email section), `/exports` (Send by email)                                              | 00, 01, 03, 09, 11, 14 |

Suggested order: 00 → 01, 02, 03 (parallel-safe) → 04 → 05 → 06 → 07, 08
(parallel-safe) → 09 → 10, 11, 12, 13 (parallel-safe) → 14 → 15 → 16 → 17 (after
14; independent of 15 and 16).

Phase 17 is the one exception to "these files only reorganize the original". It
is not a slice of `par-ui-ux-spec.md`; it is specified by
[`../email-integration-spec.md`](../email-integration-spec.md) and adds three
surfaces on top of phases 01, 03 and 14. Where it disagrees with a phase file on
presentation, the email spec wins; where it disagrees on tokens or shared
primitives, the refinement track below still wins.

### Milestone mapping (§13)

| Milestone | Original deliverables                                                                                              | Phase files |
| --------- | ------------------------------------------------------------------------------------------------------------------ | ----------- |
| M0        | Tokens, `AppHeader`, `SectionTabs`, auth layout, placeholder replacement, optional dev gallery                     | 00          |
| M1        | Auth pages, awaiting approval, inbox skeleton, profile account/password, admin users, toast/empty/error primitives | 01–03       |
| M2        | Reference-data tabs, entry drawer, runtime dropdowns                                                               | 04          |
| M3        | Reports table, 4-step wizard, uploader, autosave, edit-returned, completeness checklist                            | 05–07       |
| M4        | Facsimile (record + print), stepper, next-step strip, comments, decision drawer, signature, acknowledgement        | 08–09       |
| M5        | Queues + master–detail, repository, notifications, audit page, shortcut help                                       | 09–13       |
| M6        | Exports form, preview, download states                                                                             | 14          |
| M7        | SQLite drafts, OS credential store, file dialog, print in the webview                                              | 15          |
| M8        | Accessibility audit, 200% zoom, contrast, print fidelity                                                           | 16          |
| M8+       | Email surfaces: delivery log, email preferences, workbook mailing                                                  | 17          |

### Refinement track (after M8)

[`../ui-redesign-spec.md`](../ui-redesign-spec.md) refines every screen
00–16 onto one contained-surface system: spacing/radius/elevation/z-index tokens,
a shared `PageHeader` and `.panel` contract, tokenised controls, and a height model
that removes the `calc(100vh - Npx)` pattern. It is delivered as runs R0–R6 and
does not renumber phases. Where it disagrees with a phase file on presentation,
the phase file still wins on scope; where it disagrees on tokens or shared
primitives, this track wins, because it supersedes the phase-00 values named in
its §7.2.

## Non-negotiables for every run

1. **The report is the hero.** Every screen gets the user to a report, moves one
   forward, or finds a stored report.
2. **One primary action per screen.** Exactly one filled navy button; everything
   else is outline, ghost, or in a row menu.
3. **Status is never color alone.** Label + icon/shape + color, always.
4. **Gold is decorative**, never a button color and never the only state signal.
   **Maroon means "sent back"** in workflow contexts, destructive in menus.
5. **Compact, not cramped:** 40 px table rows, 13 px table type, 36 px minimum
   interactive height, 32 px minimum touch target.
6. **Official terminology.** Use the form and export vocabulary verbatim
   (Post-Activity Report, tracking number, endorsement, approval, return).
7. **No dead ends.** Every empty, error, denied, and failed state names the next
   action and links to it.
8. **Keyboard is a shortcut, never a requirement.** Every shortcut has a visible
   mouse path, and single-letter shortcuts are suppressed while typing.
9. **No invented fields or states.** The API is the source of truth; statuses map
   1:1 (`DRAFT`, `SUBMITTED`, `RESUBMITTED`, `RETURNED_BY_REVIEWER`,
   `RETURNED_BY_APPROVER`, `ENDORSED`, `APPROVED`). Never display "In progress".
10. **English only, formal institutional voice.** No exclamation marks, "Oops",
    "Uh oh", or jokes.
11. **Desktop widths only.** No mobile design in v1; below 1024 px shows the
    notice defined in foundation. Auth and awaiting-approval pages are exempt.
12. **Shared primitives are owned by phase 00.** Do not fork `StatusBadge`,
    `EmptyState`, `ErrorState`, `ConfirmDialog`, `ToastRegion`, table/form
    styles, or tokens inside a page phase. Extend the shared component and note
    the change.
13. **!IMPORTANT: Design skills are always on.** Build every screen with **apple-design** as
    the baseline (motion, depth, typography, feedback), refine it with
    **antislop-ui** (kill generic AI-slop visuals), and implement it strictly with
    **ponytail** (lazy, minimal, no speculative abstraction).

## File placement

- Cross-feature primitives: `apps/web/src/lib/components/`
- Feature-owned components: `apps/web/src/lib/features/<feature>/presentation/`
- Feature logic: `features/<feature>/{domain,application,infrastructure}/`
- No `utils/` or `helpers/`; name modules for what they do.
- Components stay under 400 lines; folders under 30 files and 4 levels below
  `src/`.
- shadcn-svelte primitives are copied into the repo, not imported from a
  package.

## Coverage map: original spec → phase files

| Original section                                              | Lives in                              |
| ------------------------------------------------------------- | ------------------------------------- |
| §1–§3 direction, rationale, principles                        | 00                                    |
| §4 visual identity and tokens                                 | 00                                    |
| §5 information architecture, nav, shell                       | 00                                    |
| §6 screen inventory                                           | this file + phase headers             |
| §7.1–§7.2 sign in, register, verify, reset, awaiting approval | 01                                    |
| §7.3 work inbox                                               | 02                                    |
| §7.4 my reports                                               | 05                                    |
| §7.5 create wizard                                            | 06                                    |
| §7.6 edit returned report                                     | 07                                    |
| §7.7–§7.8 facsimile record + print                            | 08                                    |
| §7.9–§7.10 queues + decision drawer                           | 09                                    |
| §7.11 repository search                                       | 10                                    |
| §7.12 monitoring exports                                      | 14                                    |
| §7.13 notifications                                           | 11                                    |
| §7.14 profile + signature                                     | 01 (account/password), 09 (signature) |
| §7.15 admin users                                             | 03                                    |
| §7.16 admin reference data                                    | 04                                    |
| §7.17 admin audit                                             | 13                                    |
| §7.18 keyboard help                                           | 12                                    |
| §8.1–§8.2 facsimile structure, status/next step               | 08                                    |
| §8.3–§8.4 tables, forms                                       | 00 (used by all)                      |
| §8.5 attachments                                              | 06                                    |
| §8.6 desktop shell                                            | 15                                    |
| §8.7 notifications and toasts                                 | 00 (surfaces), 11 (inbox)             |
| §8.8 loading, empty, error                                    | 00                                    |
| §8.9 keyboard shortcuts                                       | 00 (table), 12 (help + palette)       |
| §9 flows                                                      | 00 (state), 06, 09                    |
| §10 component inventory                                       | 00 (ownership table), each phase      |
| §11 accessibility and content                                 | 00, verified in 16                    |
| §12 responsive behavior                                       | 00, verified in 16                    |
| §13 build sequence                                            | this file                             |
| §14 open questions                                            | this file + per-phase open questions  |
| §15 process traceability                                      | 00                                    |

## Gaps in the original spec

These are referenced but not specified. Each is marked **Derived** in its phase
file; treat the derivation as provisional and confirm the copy before shipping.

| Gap                                                            | Referenced in                        | Handled in |
| -------------------------------------------------------------- | ------------------------------------ | ---------- |
| Onboarding checklist (`§7.21` is a dangling cross-reference)   | §7.3, §10                            | 02         |
| Command palette (`Ctrl/Cmd+K`) has no screen spec              | §8.9, §14 Q12                        | 12         |
| Acknowledgement download has no screen spec                    | §8.2, §13 M4                         | 08         |
| Bell menu details beyond "three newest"                        | §5.3, §7.13                          | 11         |
| `/notifications` route does not exist in the scaffold          | §5.1                                 | 11         |
| Mail format, delivery log, email preferences, workbook mailing | §7.13 names email notifications only | 17         |

## Open questions that affect more than one phase

Copied from §14 of the original. Resolve before the milestone that needs it.

1. **Brand hex values** and whether the seal may appear in app chrome and print
   letterhead — blocks 00.
2. **Paper size** for print preview (A4 assumed) — blocks 08.
3. **Comment visibility** (no internal-vs-shared flag in the data model) — blocks 09.
4. **Approver signature on a returned report's facsimile** (assumed blank) —
   blocks 09.
5. **Department/Office input** (seeded select + "Other (specify)" assumed) —
   blocks 04/06.
6. **Attachment label requirements per activity type** — blocks 06.
7. **Notification retention** — blocks 11.
8. **Queue routing scope** — blocks 09.
9. **Dark mode for the facsimile** (paper stays light) — blocks 08.
10. **Mobile** (explicitly out of scope) — all phases.
11. **`/dev/components` gallery** allowed in the repo/Tauri build — blocks 00.
12. **Command palette scope** (reports/pages only vs. actions) — blocks 12.
