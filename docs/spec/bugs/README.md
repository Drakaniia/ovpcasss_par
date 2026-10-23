# Bug phase specs: runbook

Nine reports from the office, each one a small, runnable phase. They are **fixes
to behaviour that already ships**, not new features; each file states the defect,
the verified cause in the current tree, the behaviour contract, and an acceptance
checklist. Nothing here overrides
[`../par-ui-ux-spec.md`](../par-ui-ux-spec.md) or
[`../personnel-narrative-flow-spec.md`](../personnel-narrative-flow-spec.md);
where a screen is renamed by the flow change, the phase file names the surviving
surface.

## How to run a phase

1. Start in the repo root with the workspace installed (`pnpm install`).
2. Prompt the agent with:

   ```
   Implement docs/spec/bugs/<phase-file>. Read docs/spec/bugs/README.md first.
   Use apple-design as the UI baseline, refine with antislop-ui, and implement
   strictly with ponytail. Change only what this phase scopes. Finish by walking
   the acceptance checklist and reporting evidence for each item; report anything
   you could not verify as not verified.
   ```

3. Walk the acceptance checklist before coding; it is the definition of done.
4. Run `pnpm verify` plus the test file named in the phase. A phase that touches
   `packages/shared`, `packages/db`, or `packages/export` also needs the package's
   own `vitest run`.

## Phases

| #   | Phase file                                                                       | Report                                                                                         | Surface                               | Severity | Touches                                                      |
| --- | -------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------- | ------------------------------------- | -------- | ------------------------------------------------------------ |
| 01  | [`01-reference-dropdown-row-actions.md`](./01-reference-dropdown-row-actions.md) | Edit and remove are two shared buttons; you cannot tell which entry they act on                | `EditableSelect` (Department, Office) | medium   | `apps/web`                                                   |
| 02  | [`02-wizard-validation-timing.md`](./02-wizard-validation-timing.md)             | Red required-field errors appear while entering, before Continue or an advancing arrow         | Report form, all steps                | high     | `apps/web`                                                   |
| 03  | [`03-people-step-validation-timing.md`](./03-people-step-validation-timing.md)   | Step 3 flags a blank PIC field the moment focus leaves it, even when moving back to the counts | Report form, step 3                   | high     | `apps/web`                                                   |
| 04  | [`04-location-suggestions.md`](./04-location-suggestions.md)                     | Location is a hand-typed text box with no reuse of addresses the office already entered        | Report form, step 2; API              | medium   | `apps/web`, `apps/api`                                       |
| 05  | [`05-signature-in-print.md`](./05-signature-in-print.md)                         | A saved signature does not appear on the printable record                                      | Facsimile screen + PDF, signatures    | high     | `apps/api`, `packages/export`, `apps/web`                    |
| 06  | [`06-repository-list-first-preview.md`](./06-repository-list-first-preview.md)   | The repository opens as two sections before anything is selected                               | `/search`                             | medium   | `apps/web`                                                   |
| 07  | [`07-exports-reference-data-link.md`](./07-exports-reference-data-link.md)       | The "no terms" action lands on Campuses instead of Terms                                       | `/exports`, `/admin/reference-data`   | low      | `apps/web`                                                   |
| 08  | [`08-tab-attention-dot.md`](./08-tab-attention-dot.md)                           | Nothing on the section tabs says an item is waiting for you                                    | Section tabs (Reports, Admin)         | medium   | `apps/web`                                                   |
| 09  | [`09-export-request-columns.md`](./09-export-request-columns.md)                 | The monitoring workbook has no receipt-number heading and no date the request started          | Monitoring workbook + preview         | medium   | `packages/export`, `packages/shared`, `apps/api`, `apps/web` |

Suggested order: **02 → 03** (one mechanism, two phases) → **05** → **09** →
**01** → **04** → **06** → **07** → **08**. 01, 04, 06, 07, 08 are independent and
can run in separate worktrees; 02 and 03 touch the same three files and must run
in order.

## Rules that hold for every phase

1. **Fix the cause.** No suppression, no widened assertion, no "hide the error"
   CSS. Every phase names the cause it removes.
2. **Shared primitives are extended, not forked.** `EditableSelect`,
   `WizardField`, `EmptyState`, `TabIndicator`, `StatusBadge` and tokens live in
   `apps/web/src/lib/components/` and `apps/web/src/lib/styles/`.
3. **One filled navy primary per screen.** Gold stays decorative; maroon means
   "sent back" and destructive actions. State is never colour alone.
4. **Everything is reachable by mouse and by keyboard.** A hover-only affordance
   needs a keyboard equivalent, and the equivalent is written down.
5. **Desktop widths only.** Below 1024 px the foundation notice applies; no phase
   introduces a mobile layout.
6. **No invented fields, states, or copy.** Required-ness comes from the shared
   Zod contract; a new column or field must come from an existing record.
7. **Structure limits hold:** 400 lines per source file, 30 files per directory,
   4 levels below `src/`, `*.test.ts` beside the source.
8. **Report honestly.** A checklist item that could not be exercised (no
   configured geocoder, no R2 credentials, no deployed Worker) is reported as not
   verified, with the blocker named.

## Mapping to the flow change

The personnel-narrative flow retires `/review`, `/approval`, `/admin/import`, and
the reviewer/approver roles. Where an earlier report named those screens:

| Report wording                | Spec phase surfaces now                                                             |
| ----------------------------- | ----------------------------------------------------------------------------------- |
| "queue page"                  | the single admin list in the work inbox / reports table (phase 06 covers `/search`) |
| "review / approval tab"       | the Reports section tabs (phase 08); the retired tab names are not reintroduced     |
| "reviewer/approver signature" | the personnel-in-charge signature snapshot on submit (phase 05)                     |
| "tracking number"             | `AR No. 0001` (phase 09 heads it "Receipt No. / AR No.")                            |

## Open questions carried by these phases

| Phase | Question                                                                       | Default until answered                             |
| ----- | ------------------------------------------------------------------------------ | -------------------------------------------------- |
| 04    | Which geocoding provider, if any, the office authorizes                        | Ship reusable locations only; geo assist stays off |
| 09    | Whether the office accepts a nineteenth column on the printed monitoring sheet | Insert it; the office form itself is unchanged     |
| 05    | Whether removing a signature before submit should survive submit               | It does not; the snapshot is taken at submit       |
