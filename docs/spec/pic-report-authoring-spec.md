# PIC report authoring and ADMIN review

Status: implemented in source; deployment and live acceptance remain separate.

This decision supersedes the creation, narrative ownership, edit locking, and
attribution rules in `personnel-narrative-flow-spec.md` and
`par-paperless-spec.md`. Historical workflow descriptions are retained as history,
not as current permission rules. `AGENTS.md` remains the hard contract.

## Roles and submission

- Keep only `ADMIN` and `PERSONNEL` (Personnel in charge, or PIC).
- Preserve existing accounts and historical actors. Legacy SUBMITTER, REVIEWER,
  APPROVER, and staff accounts become PERSONNEL, never ADMIN.
- Both roles may register an activity with the existing activity form.
- Each activity has exactly one linked, shared narrative. Activity registration
  and narrative submission remain separate actions, not separate activity rows.
- PERSONNEL writes, attaches files, signs, and submits the linked narrative to
  ADMIN. ADMIN retains its ability to act as every role.
- ADMIN alone reviews activity details and the narrative together, approving or
  returning them in one decision. No staff, reviewer, or approver stage exists.
- Preserve reports, numbering, attachments, receipts, and historical decisions.
  This change does not authorize clearing data or resetting counters.

## Access and editing

- PIC may edit existing activity details and the shared narrative in their office,
  regardless of whether they created or submitted the report or are listed as PIC.
- Confirmed boundary: one shared OVPCASSS office. Every ADMIN and PERSONNEL
  account may read and edit every report. Campus, unit, listed-PIC membership,
  and optional free-text Office values do not restrict this shared access.
- Edits are allowed before submission, during review, after return, and after
  approval. Saving an edit does not change workflow status, submitter attribution,
  approval actor, approval time, or previously issued receipt snapshots.
- Narrative submission remains a distinct action before initial review or after
  return. Editing a submitted or approved report does not submit it again and does
  not trigger renewed review.
- Existing validation, optimistic version checks, and correction reasons after
  submission remain required. PIC editing does not grant administrative deletion,
  archiving, user management, exports, audit access, or decision rights.
- ADMIN can read the shared narrative before and after submission. The narrative
  is not private to a single submitter within the authorized office.

## Audit and attribution

- Every successful content mutation appends an audit event with actor and UTC
  timestamp. Capture before/after values for activity details, PIC/SDG lists,
  narrative text, attachment metadata, and signature metadata. Never store secret
  values, signature image bytes, or signed URLs in audit payloads.
- Preserve existing audit rows. Do not fabricate historical before/after values.
- Reuse the existing audit detail diff UI for full changes.
- ADMIN report detail shows Created by, First edited by, Last edited by, and
  Submitted by, each with a timestamp when available. When no edit exists, show
  “Not edited”; when no submission exists, show “Not submitted”.
- Attribute every historical event to its actual account, not a fallback ADMIN
  actor merely because the actor was neither creator nor submitter.
- Display timestamps in Asia/Manila. Report content edits remain distinct from
  submission, approval, receipt downloads, and administrative filing actions.

## UI and verification

- PERSONNEL Home offers New record. Reuse the activity wizard and separate
  narrative editor; do not introduce a second register or duplicate editor.
- Detail and edit actions follow server permissions, not ADMIN-only client checks.
- Keep creation, detail, and editing usable on phones. The office register and
  other desktop-only routes retain their existing restrictions.
- Regression checks cover creation access, office editing in every status,
  unauthorized roles, ADMIN-only decisions, preserved approval state, one narrative
  per activity, before/after history, and correct attribution.

## Deployment and legacy accounts

No schema migration is needed: roles and the single narrative column already
exist. `packages/db/scripts/convert-personnel-roles.sql` is a forward-only data
maintenance script for old installations. Execute its statements in one D1 batch
transaction before deployment if legacy roles remain. Do not run it against
production implicitly. It preserves account statuses, reports, references, and
audit rows; each changed role gets an appended before/after event. Verify locally
with `node packages/db/scripts/convert-personnel-roles.check.mjs`.

## Existing documentation discrepancies

The implementation currently uses `PENDING`, `SUBMITTED`, `RETURNED`, and
`APPROVED` plus AR references. `AGENTS.md` still lists the earlier seven statuses
and OFF/EDU/INC numbering. This feature must not invent another workflow or
renumber data; resolving that pre-existing hard-contract discrepancy requires an
explicit rule-file decision. The referenced `par-ui-ux-spec.md` is absent from this
checkout. Colocated tests follow `AGENTS.md`, not the stale `tests/` tree guidance
in the architecture document.
