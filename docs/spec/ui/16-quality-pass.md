# Phase 16 — Quality pass: accessibility, zoom, print, content

**Milestone:** M8
**Routes:** all
**Depends on:** every prior phase
**Source:** `par-ui-ux-spec.md` §11, §12, §8.8, §13 (M8), §14

This is not a feature phase. It proves the system meets the accessibility,
responsive, print, and language contract, fixes what does not, and records the
evidence. A check that was not run is reported as not run — never as a pass.

---

## 1. Scope and rules

- Audit every implemented screen at the widths in §3, with the roles that can
  reach it.
- Fix defects in place. Do not redesign interactions, add features, or change
  workflow decisions to make a check pass. If a check cannot pass without a
  product decision, record it as an open issue with the decision needed.
- Do not weaken tests, add lint/type suppressions, or remove assertions to get a
  green result.
- Automated checks supplement manual checks; neither replaces the other. Use the
  tooling already in the repo. If adding `axe-core`/Playwright, confirm the
  dependency first and keep it a dev dependency.
- Every result needs evidence: a measurement, a screenshot path, a command
  output, or a reproducible step list. "Looks fine" is not evidence.

---

## 2. Accessibility — WCAG 2.2 AA

Walk each screen with keyboard only, then spot-check with a screen reader.

### Keyboard and focus

- [ ] Skip link is the first focusable element and moves focus to main content.
- [ ] Tab order follows visual order on every screen; no keyboard traps outside
      intentional dialogs/drawers.
- [ ] Every interactive element has a visible focus ring (2 px navy-700, 2 px
      offset), including table rows and menu items.
- [ ] Drawers/dialogs trap focus, close on Escape, and restore focus to the
      trigger.
- [ ] The topmost-layer rule works: Escape closes palette → help → drawer → menu
      in order.
- [ ] Shortcuts are suppressed in inputs/textareas/narrative editor; every
      shortcut has a visible mouse path.
- [ ] Row menus and `⋯` controls are reachable and operable without a pointer.

### Semantics

- [ ] Tables use `<th scope="col">`, captions where useful, and `aria-sort` on
      sortable headers.
- [ ] Status is always text + icon/shape + color; a grayscale screenshot remains
      unambiguous.
- [ ] Unread dots, completeness meters, age warnings, and diff markers have text
      equivalents.
- [ ] Form labels are programmatically associated; errors are announced and
      linked to fields; required/optional is not asterisk-only.
- [ ] Drawers have accessible names; the command palette follows the combobox/
      listbox pattern with `aria-activedescendant`.
- [ ] Images (seal, signature) have alt text or are marked decorative as
      appropriate; the seal in chrome is decorative.

### Contrast and targets

- [ ] Text contrast ≥4.5:1 and large text ≥3:1 on every surface, light and dark.
      Record measured ratios for: body on page, white on navy, secondary text on
      card, badge text on badge backgrounds, maroon return button, gold accent
      text (decorative only).
- [ ] Focus ring contrast ≥3:1 against adjacent colors.
- [ ] Gold is never used for text that carries meaning and never as a button.
- [ ] Touch/pointer targets are ≥32 px (28 px row menus with 8 px spacing is the
      only exception).
- [ ] Links are distinguishable without relying on color alone (underline or
      weight).

### Motion

- [ ] Drawer/toast motion is 120 ms fades/slides.
- [ ] `prefers-reduced-motion: reduce` removes or shortens transitions.
- [ ] No autoplaying, looping, or parallax motion exists.

---

## 3. Responsive and zoom

At each width, walk the main flows and record clipping/overflow:

| Width     | Must hold                                                                               |
| --------- | --------------------------------------------------------------------------------------- |
| 1440+     | Master–detail selects preview; facsimile + rail side by side; full tab row              |
| 1280–1439 | Lists navigate to detail; facsimile + rail side by side; wizard rail collapsed to a bar |
| 1024–1279 | Single column; rail stacks; Type/College hidden before Title/Status; filters collapse   |
| <1024     | Only the notice renders; auth and awaiting-approval remain usable                       |

- [ ] At 200% browser zoom and 1280 px, no action is clipped, the rail stacks
      below the document, and horizontal scrolling is limited to tables/exports
      preview.
- [ ] No fixed-width element forces a horizontal scrollbar on form pages.
- [ ] Sticky headers/rails do not cover focused fields or the action bar.
- [ ] The 1024 px notice is not shown on auth or awaiting-approval.
- [ ] Windows display scaling at 125% does not break the shell (desktop).

---

## 4. Print fidelity

Print or export to PDF from an APPROVED report and a non-approved report:

- [ ] A4 portrait, 15 mm margins, letterhead with seal and "OVPCASSS", gold rule.
- [ ] Sections I–IV, attachments list, and signature block appear in order.
- [ ] Footer shows generated date/time, tracking number, and page X of Y.
- [ ] No nav, rail, stepper, comments, history, toolbar, shadows, or dark
      backgrounds print.
- [ ] 11 pt document type; headings and signatures avoid page breaks.
- [ ] Non-approved reports carry the correct "DRAFT" or "NOT APPROVED" watermark.
- [ ] Acknowledgement PDF (approved) includes the approver signature and is not
      blank.
- [ ] Print preview inside the Tauri webview matches the browser output.

---

## 5. Content and data conventions

- [ ] Formal institutional English; no exclamation marks, "Oops", "Uh oh", jokes,
      or motivational filler.
- [ ] Official terminology throughout: Post-Activity Report, tracking number,
      endorsement, approval, return, personnel in-charge, SDG.
- [ ] Every empty/error/denied/offline state names the next action and links to
      it; no dead ends.
- [ ] Dates: `14 Mar 2026` in tables; `14 March 2026, 9:12 AM` in prose; all
      Asia/Manila; API values UTC; tracking numbers monospace and copyable.
- [ ] Statuses map 1:1 to the shared enum; "In progress" and invented states do
      not appear.
- [ ] Missing optional values render an em dash, never blank space.
- [ ] Error copy includes a request id where available, and 404/denied copy does
      not leak report existence.
- [ ] Loading uses skeletons (8 rows / document blocks), not table spinners.

---

## 6. End-to-end flow rehearsal

Run the three journeys with real accounts (or seeded equivalents) and record each
step:

1. **Submitter:** sign in → inbox → create wizard (all 4 steps) → submit →
   facsimile → receive return → edit → resubmit → approved acknowledgement.
2. **Reviewer/approver:** queue → preview/full report → endorse → approval queue
   → approve with signature → repository search → export.
3. **Admin:** approve a role → reference data edit → audit inspection; plus a
   desktop offline submit → reconnect → conflict path.

- [ ] Each flow completes without console errors, unexpected 4xx/5xx, or dead
      ends.
- [ ] Decisions update badge/stepper/history without a full reload.
- [ ] Notifications and nav counts reflect actions within one navigation.
- [ ] Role boundaries hold: Submitter never sees Queues/Repository/Admin; Admin
      cannot review/approve without the role; self-protection on users holds.
- [ ] Offline (desktop only): queue → restart → reconnect → conflict modal →
      resolve, with no duplicate report.

---

## 7. Evidence report

Produce a short report in the phase's PR/commit description (or
`docs/spec/ui/16-quality-report.md` if a durable record is wanted) with:

| Check                                  | Method         | Result       | Evidence                |
| -------------------------------------- | -------------- | ------------ | ----------------------- |
| e.g. contrast — secondary text on card | computed ratio | 4.8:1 — pass | token values + tool     |
| e.g. 200% zoom at 1280                 | manual walk    | pass         | screenshot path         |
| e.g. print page breaks                 | PDF export     | fail → fixed | before/after page count |

- List every failure found and whether it was fixed in this phase or filed with a
  named owner/issue.
- State the commands run (`pnpm lint`, `pnpm typecheck`, `pnpm test`,
  `pnpm build`) and their results. If dependencies are not installed or a manual
  environment (Windows/Tauri) is unavailable, say so explicitly.

---

## 8. Acceptance checklist

- [ ] Keyboard-only walkthrough completed for every route; all issues fixed or
      filed.
- [ ] Screen-reader spot check completed on: sign in, work inbox, wizard step 1,
      facsimile, decision drawer, repository search, admin users, audit detail.
- [ ] Contrast ratios measured and recorded; all text meets 4.5:1 (3:1 large).
- [ ] Grayscale status check passes on all badges, chips, and warnings.
- [ ] All table semantics and `aria-sort` verified.
- [ ] Focus trap/restore and Escape layering verified on palette, help, drawer,
      and mobile-width notice.
- [ ] Reduced motion verified.
- [ ] All breakpoints and 200% zoom verified with no clipped actions.
- [ ] Print and PDF fidelity verified, including watermark and acknowledgement.
- [ ] Content/date/empty-state audit completed; terminology consistent.
- [ ] All three end-to-end flows pass with role boundaries intact.
- [ ] Evidence report completed with real results, including anything not
      verified.
- [ ] `pnpm lint`, `pnpm typecheck`, `pnpm test`, and `pnpm build` results
      reported.

## 9. Out of scope

- New features, workflow changes, and visual redesign.
- Performance/Lighthouse optimization beyond what blocks the checks.
- Load testing, penetration testing, and malware scanning.
- macOS/Linux and mobile accessibility.

## 10. Open issues carried forward

Resolve or explicitly accept each before release:

1. Brand hex values and seal usage (foundation).
2. Paper size (facsimile print).
3. Comment visibility (review/drawer).
4. Approver signature on returned reports.
5. Department/Office "Other (specify)" and Programs placement.
6. Attachment requirement labels per activity type.
7. Notification retention.
8. Queue routing scope.
9. Dark-mode facsimile treatment.
10. Mobile (explicitly out of scope for v1).
11. Dev component gallery and command palette action scope.
