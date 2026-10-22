# Phase 08 — Report facsimile: record mode and print preview

**Milestone:** M4
**Routes:** `/reports/[id]` (record), `/reports/[id]?print=1` (print preview)
**Depends on:** 00-foundation (`StatusBadge`, `NextStepStrip`, skeletons), 06
(attachment list, narrative rendering)
**Source:** `par-ui-ux-spec.md` §7.7, §7.8, §8.1, §8.2, §11, §12

The report is the hero. This is the page every other screen leads to, and it must
read like the paper PAR without losing the workflow around it.

Decision buttons and the drawer are **phase 09**; this phase builds their rail
slot and role/status gating, not the action forms.

---

## 1. Context for this run

- Roles: anyone with access. Submitters see their own reports; reviewers and
  approvers see reports in their queues and their trail; admins see all.
- Record mode is the default. Drafts **redirect to `/reports/[id]/edit`**; the
  facsimile of a draft is not useful.
- One primary action: role- and status-dependent inside the rail; in read-only
  states there is none and the page shows why.
- Status language and next-step copy come from foundation §2.2 and the §8.2 table
  below. Never display "In progress" or invent an intermediate state.
- The document is cream/light in both themes ("paper is paper"); the surrounding
  chrome follows light/dark.
- Missing optional values render an em dash, never blank space.
- Tracking numbers are monospace and copyable everywhere they appear.

---

## 2. Record mode layout

Two columns at ≥1280 px: document max 820 px + right rail 300 px (280 px at
1280–1439). Below 1280 px the rail stacks below the document.

```
┌──────────────────────────────────────────────────────────────────────────────┐
│ ← My reports                                                                 │
│ OFF-2026-0014 · Coastal cleanup                        [Submitted]           │  header
│ Submitted 14 Mar 2026 · With OVPCASSS reviewer · Next: review                │  next-step strip
├───────────────────────────────────────────────┬──────────────────────────────┤
│  ●──────●──────●──────○──────○                │  ACTIONS                     │
│  Draft  Submitted  Review  Endorsed  Approved │  (phase 09 slot)             │
│                                               │                              │
│  ┌─────────── cream document ─────────────┐   │  ATTACHMENTS (3)             │
│  │ [seal]  POST-ACTIVITY REPORT           │   │  Attendance sheet.pdf  1.2MB │
│  │ Reference No. OFF-2026-0014            │   │  Photos.zip            8.4MB │
│  │                                        │   │                              │
│  │ I. ACTIVITY                            │   │  PEOPLE                      │
│  │ Title ......... Coastal cleanup        │   │  J. Dela Cruz (submitter)    │
│  │ Classification Curricular              │   │  M. Santos (reviewer)        │
│  │ Campus ....... Main                    │   │                              │
│  │ College ...... Arts and Sciences       │   │  REPORT META                 │
│  │ Level ........ Undergraduate           │   │  Version 3 · 18 fields       │
│  │ Date ......... 12 Mar 2026             │   │                              │
│  │ Location ..... Brgy. Poblacion         │   │                              │
│  │                                        │   │                              │
│  │ II. PARTICIPANTS                       │   │                              │
│  │ Students 42 · PIC 3                    │   │                              │
│  │                                        │   │                              │
│  │ III. NARRATIVE                         │   │                              │
│  │ The activity ... (prose)               │   │                              │
│  │                                        │   │                              │
│  │ IV. SIGNATURES                         │   │                              │
│  │ ______________     ______________      │   │                              │
│  │ Submitted by       Approved by         │   │                              │
│  └────────────────────────────────────────┘   │                              │
│                                               │                              │
│  HISTORY                                                                     │
│  ● 14 Mar 2026 09:12  Submitted by J. Dela Cruz                              │
│  ● 15 Mar 2026 10:40  Endorsed by M. Santos                                  │
└───────────────────────────────────────────────┴──────────────────────────────┘
```

### Header

- Back link ("← My reports" or the originating queue when the API/route supplies
  one).
- Tracking number (copyable) · title, status badge.
- **Next-step strip**: one line naming who holds the report and what happens next
  (§3). Drafts read "Not yet submitted · Next: complete the form and submit".
- Toolbar: **Record view / Print preview** toggle.

### Stepper

- Five stages: **Draft · Submitted · Review · Endorsed · Approved**.
- Rendered above the document at ≥1280 px and again inside the History panel below
  1280 px; never both at once.
- Returned states keep the reached stage and add a maroon "Returned" chip beneath
  it linking to the return comment. Resubmitted shows "Review" active with a
  "Resubmitted" chip.
- Stage state is text + shape + color, never color alone.

### Document

The facsimile described in §4. Cream surface, serif type, ruled sections. The
document is not editable here.

### Rail

Sticky and independently scrollable when it overflows. Finished order:
**Actions**, **Attachments**, **People**, **Report meta**.

- **Actions:** phase 09 prepends this section with Endorse/Return or
  Approve/Return and the submitter's Edit action. Phase 08 renders the rest of
  the rail and leaves a documented insertion point; it must not show dead
  buttons.
- **Attachments (n):** label, file name, size; PDFs/images open via short-lived
  signed URL, office files download. Empty: "No attachments." (required
  attachment gaps are an authoring concern, not this page).
- **People:** submitter, reviewer, approver with role labels when the API knows
  them; omit roles that have not acted.
- **Report meta:** version, number of completed fields, date received and date
  completed (if any), type/classification summary if not already obvious.

### History

- Full audit timeline below the document/rail, grouped by day, ascending, with
  actor, role, action, status change (old → new), and comment excerpt.
- "Current" marker on the latest event.
- Read-only. No composer here; comments are written in the decision drawer.

### Comments

- Appear inline in the document's "Review history" block beneath the narrative,
  not in the rail.
- Each round is a group: "Round 1 — returned by M. Santos, 15 Mar 2026", with the
  comment body. Multiple rounds stack in order.
- Comments are plain text with preserved paragraphs; sanitize server-side.
- A composer is available **only inside the decision drawer**. Do not add one to
  this page.

### Read-only and separation of duties

- Anyone without an available action sees no action buttons.
- When separation of duties blocks an action (the submitter is also a reviewer),
  the control is disabled with an **adjacent** reason ("You submitted this
  report"), plus an optional `title`. The source says "reason tooltip"; the
  foundation's forms rule requires an adjacent reason, so use both.
- A denied route shows the shared permission-denied state naming the required
  role; a missing report shows the shared 404 copy (same message for both).

---

## 3. Status → next step (§8.2)

| Status                 | Next-step text                                           |
| ---------------------- | -------------------------------------------------------- |
| `DRAFT`                | "Not yet submitted · Next: complete the form and submit" |
| `SUBMITTED`            | "With OVPCASSS reviewer · Next: review"                  |
| `RESUBMITTED`          | "With OVPCASSS reviewer · Next: re-review"               |
| `RETURNED_BY_REVIEWER` | "Returned to submitter · Next: revise and resubmit"      |
| `ENDORSED`             | "With approving officer · Next: approve"                 |
| `RETURNED_BY_APPROVER` | "Returned to submitter · Next: revise and resubmit"      |
| `APPROVED`             | "Completed 20 Mar 2026 · Acknowledgement available"      |

Use the API's timestamps for the completed date; never hardcode a date in the
strip. The API is the source of truth; map statuses 1:1.

---

## 4. Facsimile document structure (§8.1)

| Section                    | Fields                                                                                             |
| -------------------------- | -------------------------------------------------------------------------------------------------- |
| Letterhead                 | Seal, "OVPCASSS", "POST-ACTIVITY REPORT", gold rule                                                |
| Reference block            | Tracking number, status (screen only), date received, date completed                               |
| I. Activity classification | Type, classification, campus, college/unit, department, office, level                              |
| II. Activity               | Title, date(s) of activity, location, SDG(s)                                                       |
| III. Participants          | Total number of students, total number of PIC, name(s) of personnel in-charge, PIC email/contact   |
| IV. Narrative              | Narrative prose                                                                                    |
| V. Attachments             | Attachment labels and file names (screen); attachment list (print)                                 |
| VI. Review history         | Rounds of returns and comments (screen only)                                                       |
| Signatures                 | Submitted by (name, date, signature image when signed) / Approved by (name, date, signature image) |

- Field labels use the official terms exactly; do not paraphrase.
- Values align right in a two-column key/value grid at ≥1024 px; stacked below.
  Long values wrap without breaking the rule.
- Long narratives preserve paragraphs and line breaks. No user HTML is rendered.
- Missing optional values render an em dash.
- The gold rule and seal are the only decorative elements. No gradients, no
  shadows inside the document, no icons in the letterhead.
- Section headings avoid page breaks in print.

---

## 5. Print preview (`?print=1`)

- Toggle in the header: **Record view / Print preview**. Print preview hides
  chrome, rail, stepper, comments, and history.
- Paper: A4 portrait, 15 mm margins, letterhead with seal and "OVPCASSS", a gold
  rule, document title, then sections I–IV, the attachments list, and the
  signature block.
- Footer: "Generated 17 Oct 2026 14:02 · OFF-2026-0014 · Page 1 of 2".
- Screen toolbar: **Print**, **Download PDF**, **Back to record view**. The
  toolbar is not printed.
- `@media print`: white background, no nav, no shadows, 11 pt document type,
  page-break avoidance on section headings and signature blocks.
- Download PDF is available to all viewers of an APPROVED report. For any other
  status, the PDF carries a "DRAFT" or "NOT APPROVED" watermark and the button
  label/adjacent text says so.
- Printing must not depend on client-only state; the print view fetches the full
  report and renders all sections before print is enabled.

---

## 6. Acknowledgement download (derived)

Referenced by the `APPROVED` next-step copy and the M4 deliverable, but not
specified as a screen.

- On `APPROVED`, the rail gains a **Download acknowledgement** action (outline,
  not the page's primary if another primary exists).
- It downloads the server-generated PDF from `packages/export`; the UI does not
  render or sign the PDF client-side.
- Signed URL requests follow the same short-lived URL pattern as attachments;
  errors use the standard inline alert and Retry.
- If the approver signature is missing (data problem), show an inline explanation
  and a link to `/profile` for the approver; the acknowledgement must not be
  generated with a blank signature block.
- The button is absent, not disabled, for every non-approved status.

---

## 7. States

- Loading: `SkeletonDocument` + skeleton rail; header and toolbar visible.
- Report not found / no access: shared 404 copy.
- Permission denied: names the required role; no Retry.
- Draft: redirect to edit (no flash of empty facsimile).
- Empty history: "No events yet." (drafts never reach this page).
- Attachment preview failure: inline row error with Retry.
- Print assets not ready: disable Print/Download with adjacent reason
  "Preparing document…" rather than printing a partial page.
- Very long narrative: document scrolls; the rail stays sticky; no inner scroll
  on the document at desktop widths.

---

## 8. Acceptance checklist

- [ ] `DRAFT` reports redirect to the edit page.
- [ ] Header shows back link, copyable tracking number, title, status badge, and
      the correct next-step strip for all seven statuses.
- [ ] Stepper shows five stages, return chips on returned states, a Resubmitted
      chip, and appears in only one place per breakpoint.
- [ ] Document renders every section in §4 with official labels, right-aligned
      values at ≥1024 px, em dashes for empty optional values, preserved
      paragraphs, and no user HTML.
- [ ] The document stays light in dark mode; chrome follows the theme.
- [ ] Rail renders Attachments, People, Report meta in that order, is sticky and
      independently scrollable, and shows no dead action buttons (phase 09
      prepends Actions).
- [ ] Attachments preview via signed URLs; office files download; empty state
      renders.
- [ ] Comments render inline in the document as rounds with author/role/date; no
      composer on the page.
- [ ] History groups by day, ascending, shows actor/role/action/status change/
      comment excerpt, and marks the latest "Current".
- [ ] Read-only users see no actions; separation-of-duties blocks show an
      adjacent reason; denied and 404 states match the shared copy.
- [ ] Print preview hides chrome/rail/stepper/comments/history, uses A4/15 mm,
      includes letterhead, sections I–IV, attachments, signature block, and the
      footer with generated time, tracking number, and page count.
- [ ] `@media print` uses white background, no shadows, 11 pt document type, and
      avoids breaking headings/signatures.
- [ ] Download PDF watermarks non-approved reports and is available to all
      viewers of approved reports.
- [ ] Acknowledgement download appears only on `APPROVED`, uses the server PDF,
      and explains a missing signature instead of generating a blank one.
- [ ] Loading, 404, denied, preview-failure, and print-preparation states are
      implemented.
- [ ] `pnpm lint`, `pnpm typecheck`, and `pnpm build` results reported.

## 9. Out of scope

- Decision buttons and drawer (phase 09).
- Editing (phase 07) and authoring (phase 06).
- PDF generation and signature placement (backend/packages/export).
- A separate comments thread page or comment composer.
- Dark-mode paper tinting (paper stays light; open question 3).

## 10. Open questions

1. Paper size: A4 is assumed; confirm before print ships (project spec §14 Q2).
2. Comment visibility: all comments are treated as shared (project spec §14 Q3).
3. Is a light facsimile in dark mode acceptable, or should the paper tint?
   This spec keeps it light.
4. Should the approver's name/signature show on a returned report's facsimile?
   Assumed blank until approved (project spec §14 Q4).
