# Spec — Narrative report ownership, the PENDING status, archiving, and the register's missing controls

**Status:** proposed (interview 2026-10-23). No code has been changed for this spec yet; the working tree below is the starting point, not the target.
**Request:** the office's interview notes on the "Narrative Report & User Roles System" (personnel submit their narrative, office reviews and approves, limited corrections after submission, remarks visible to the reporter, filterable register, Excel and PDF output, receipts), closing with "is the current implementation right".
**Short answer to that question:** the foundation is right, but the tree currently implements two opposite rules at once — see §2.
**Source of truth:** `docs/spec/par-paperless-spec.md` §7.5–§9, `docs/spec/personnel-narrative-flow-spec.md` (superseded where this document says so), `docs/spec/email-integration-spec.md`, `docs/spec/ui/02-work-inbox.md`, `05-reports-table.md`, `07-edit-returned.md`, `09-queues-and-decisions.md`, `14-exports.md`
**Packages touched:** `packages/shared`, `packages/db`, `packages/email`, `packages/export`, `apps/api`, `apps/web`
**Routes touched:** `/`, `/reports`, `/reports/new`, `/reports/[id]`, `/exports`, `/search`, `/notifications`, `/how-it-works`; retired: `/my-reports`

This document supersedes `personnel-narrative-flow-spec.md` §3, §4, §6 and §12.2 where they describe a read-only personnel account or an office-authored narrative. Everything else in that spec — AR No. numbering, the F-013 receipt, PIC provisioning, the three-step create wizard, mail catalogue, and the cleanup/reminder behaviour — still stands.

---

## 0. The change in one line

The office registers the activity and owns the register; the named personnel in charge write and submit the narrative; the office corrects activity facts with a record of who changed what, decides once, and the system issues the F-013 receipt. This change finishes that flow, renames the "not submitted" status to **PENDING**, adds a filing archive, and closes the register's missing filters and PDF export.

| #   | Workstream                        | Outcome                                                                                                                                                                                             |
| --- | --------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| W1  | Ownership settled                 | The PIC writes and submits; the office never writes the narrative. The read-only revision in the working tree is withdrawn, and its half-applied UI is unwound.                                     |
| W2  | `DRAFT` → `PENDING`               | One state renamed, everywhere: enum, labels, transitions, reminders, filters, exports, audit, tests. No new workflow behaviour.                                                                     |
| W3  | Corrections are accountable       | An admin may still correct activity fields before approval, but the narrative, attachments and signature are untouchable, and a post-submission correction carries a reason and notifies every PIC. |
| W4  | Archive without losing the record | `archived_at` / `archived_by_user_id` on an approved record; the register hides archived rows by default, a tab shows them, receipts and downloads keep working.                                    |
| W5  | The register the office asked for | A personnel-in-charge filter and a "Submitted by" column and filter, beside the existing status, type, campus, term, date and keyword filters.                                                      |
| W6  | Printable register                | A filtered PDF of the register table, matching whatever filters are applied, with the office letterhead, a filter summary, and page numbers.                                                        |
| W7  | One personnel workspace           | Home is the single list of records naming the account, with a row action per status. `/my-reports`, `scope=mine` and the inbox's `myReports` section are retired.                                   |

W1 and W2 are foundational; W3, W4, W5 and W7 can follow in any order; W6 depends on W5 (it reuses the same filter contract).

---

## 1. Decisions locked in during the interview

| Topic                        | Decision                                                                                                                                                     |
| ---------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Who writes the narrative     | **The named personnel in charge.** `canWriteNarrative` stays PIC-only, active in `PENDING` and `RETURNED`.                                                   |
| Who submits                  | **A listed PIC.** The office cannot write, submit, or stand in for an unreachable PIC; it reassigns or returns the record instead.                           |
| Who creates a record         | **The office only.** The three-step wizard, the AR No., and the PIC naming are unchanged.                                                                    |
| Several PICs                 | **One shared narrative.** Any listed PIC may edit and submit it; the first submission records that person as the submitter. Every PIC still gets an F-013.   |
| Narrative draft              | **Saved to the record, shared, invisible to the office until submission.** No new drafts table; the existing `reports.narrative` field is the draft.         |
| Signature                    | **Optional**, drawn or uploaded; snapshotted at submission as today.                                                                                         |
| Statuses                     | **`PENDING`, `SUBMITTED`, `RETURNED`, `APPROVED`.** `DRAFT` is renamed to `PENDING` and nothing else changes in the state machine.                           |
| PENDING meaning              | **The office has created the record and no PIC has submitted the narrative yet.** A half-typed narrative does not create another state.                      |
| Rejected                     | **No `REJECTED` state.** A refusal is `RETURNED` with comments, or the record is deleted while `PENDING`.                                                    |
| Under revision               | **No `UNDER_REVISION` state.** A correction is an edit plus a notification, not a transition.                                                                |
| Admin edits after submission | **Activity fields and the PIC list only.** Never the narrative, attachments, or signature.                                                                   |
| Admin edit accountability    | A correction on a submitted record **requires a reason**, is audited with the changed fields, and **notifies every retained PIC** in-app and by email.       |
| Receipts                     | **One F-013 per PIC, on approval.** No submission receipt; the SUBMITTED mail and the in-app status acknowledge the submission.                              |
| Receipt appearance           | **Exact facsimile; no QR code.** Verification stays inside the signed-in app.                                                                                |
| Reference number             | **Automatic `AR No. 0001`, global, never manual, never reused.** No dated format, no override.                                                               |
| Archive                      | **A filing flag, not a status.** `archived_at` is set on an `APPROVED` record only; the status stays `APPROVED`.                                             |
| Archive visibility           | Archived rows leave the register by default, appear under an **Archived** tab, stay visible to their PICs with a chip, and keep their receipts downloadable. |
| Register filters             | Add **personnel in charge** and **submitted by**, both free-text name matches, beside the existing filters.                                                  |
| Personnel list filters       | **Status and activity date range only.** The account's identity already scopes the list.                                                                     |
| Bulk export                  | **A filtered PDF of the register table**, for signature and filing; the monitoring `.xlsx` and the single-record PDF stay as they are.                       |
| Attachments                  | **Unchanged:** the existing allowlist, 25 MB per file, several per record.                                                                                   |
| Roles                        | **ADMIN and PERSONNEL only.** No viewer, no department head.                                                                                                 |
| Retention                    | **No deletion schedule.** Archiving is the only way a record leaves the working register.                                                                    |
| Offline                      | **Local mirror plus sync** in the narrative editor; submitting still needs a connection.                                                                     |
| Personnel navigation         | **Home only.** `/reports` and `/search` keep redirecting a personnel account to Home.                                                                        |
| Personnel inbox              | **None.** The account has no queue, no "my reports" inbox section, and no unread work count.                                                                 |
| Assignment notification      | **Restore the in-app `ASSIGNED` notification** alongside the assignment mail that the working tree left in place.                                            |

---

## 2. Is the current implementation right?

**Verdict: the data model and the API's core rules are right; the presentation layer is halfway through a direction the interview has now reversed, and five requested controls do not exist.**

The strongest evidence is that the tree contradicts itself in the same user journey:

1. **The API lets a PIC write the narrative** — `canWriteNarrative(viewer, isPic, status)` is `isPic && (DRAFT|RETURNED)` in `apps/api/src/features/reports/domain/report-access.ts`, and `POST /reports/:id/submit` refuses anyone who is not a PIC ("Only the personnel in charge may submit this narrative").
2. **The spec revision added in the same working tree says the opposite** — `docs/spec/personnel-narrative-flow-spec.md` §3/§4/§12.2 (uncommitted) states "the office writes the narrative… `canWriteNarrative` is office-only" and "PIC writes nothing". That revision is not implementable as written: the submit route is PIC-only, so an office-authored narrative could never be submitted.
3. **The UI asserts the read-only rule while still rendering the editor** — `PersonnelDashboard.svelte` tells the PIC "They are read-only: the office keeps the record and its narrative", while `RecordDetailPage.svelte` renders `NarrativeEditor` whenever the API returns `canWriteNarrative: true`, which it does for that same PIC on a `DRAFT`/`RETURNED` record.
4. **Two personnel lists exist** — Home renders `PersonnelDashboard` from the PIC-scoped register, and a new `/my-reports` page lists `scope=mine` (records the account submitted). The interview keeps one.
5. **The inbox still carries a personnel section nobody renders** — `build-inbox`/`WorkInbox` still produce `myReports`, but Home no longer calls `api.inbox.get()` for a personnel account, so the section is dead code.

Two smaller findings, unrelated to the direction but worth fixing while these files are open:

- The client-side upload pre-check lists HEIC, BMP, TIFF, RAR and 7Z, which the server allowlist in `apps/api/src/features/attachments/domain/attachment-rules.ts` refuses. The server is authoritative, so the mirror should be narrowed to it rather than the reverse.
- `report_comments.kind` allows `OFFICE_NOTE`, but no code writes it today; A1 would be its first use.

Item-by-item, against the interview notes:

| Claim in the notes                                   | Current behaviour                                                                                             | Verdict                      |
| ---------------------------------------------------- | ------------------------------------------------------------------------------------------------------------- | ---------------------------- |
| Personnel submit their own narrative report          | Yes, API and editor; contradicted by the read-only revision and dashboard copy                                | **Right — keep**             |
| Personnel input data and generate a reference number | No. The office creates the record; the AR No. is minted server-side                                           | **Right — keep** (interview) |
| Admin monitors all inputs                            | Yes: the register lists every record with filters                                                             | Right                        |
| Admin edits only specific parts                      | Yes in scope (activity fields, never narrative/attachments), but there is no reason field and no notification | **Partly — finish**          |
| Admin reviews and approves                           | Yes: `POST /reports/:id/decision` on `SUBMITTED`, approve or return                                           | Right                        |
| Statuses Pending / Submitted / Approved / Rejected   | `DRAFT` / `SUBMITTED` / `APPROVED`; no `PENDING`, no `REJECTED`                                               | **Wrong — rename**           |
| Intermediate "Under Revision" state                  | Not present                                                                                                   | Correctly absent (interview) |
| Remarks visible to the reporter                      | Return comments are stored (`report_comments`) and shown; an approval remark is not stored                    | **Missing (small)** — see A1 |
| Search/filter by ref, status, dates, PIC name        | Ref/status/dates/keyword yes; a dedicated PIC filter no (keyword `q` already matches PIC name/email)          | **Missing control**          |
| Filtered bulk export to Excel and PDF                | Monitoring `.xlsx` yes; single-record PDF and print yes; a filtered register PDF no                           | **Missing**                  |
| QR code on the receipt                               | None; the receipt is an exact docx facsimile                                                                  | Correctly absent (interview) |
| Receipt at submission and at approval                | Approval only                                                                                                 | Correctly single (interview) |
| Signature placeholder after approval                 | Fixed VPCASSS block on F-013; PIC signature on the printed record                                             | Right                        |
| Date/time stamps and audit trail                     | `submitted_at`, `approved_at`, `audit_events` append-only                                                     | Right                        |
| Retention / archive                                  | Nothing archived; approved records stay in the register                                                       | **Missing**                  |

What must be **undone** from the working tree, because it encodes the withdrawn direction:

- The read-only revision text in `personnel-narrative-flow-spec.md` §3/§4/§12.2 (§3, §4 and §6 below replace it; that file should carry a one-line pointer to this one).
- `PersonnelDashboard.svelte`'s "read-only" note and the read-only empty state copy.
- The `routes/my-reports/+page.svelte` page and its nav entry.
- The `scope=mine` query and the `submittedByUserId` list filter (the _column_ and _filter_ stay, as `submittedBy`, but the "only mine" scope goes).
- The inbox `myReports` section and its tests.
- `tour-steps.ts` copy that says records are read-only; `RecordDetailPage.svelte`'s removal of the "narrative not submitted" placeholder must be reworked so the office still sees that placeholder while hiding any unsubmitted draft text.
- The in-app `ASSIGNED` notification loop that was deleted from `POST /reports`.

What must be **kept** from the working tree:

- The `/reports` and `/search` guards that return a personnel account to Home.
- The palette change (`Home`, `Profile`, `Notifications` for PERSONNEL).
- `PersonnelDashboard`'s table shape and pagination, and the assignment-row view model (renamed, see §16).
- The `canViewReport` guard added to `PUT /reports/:id/narrative`.

---

## 3. Target flow

```
OFFICE (ADMIN)                                  PERSONNEL IN CHARGE                 SYSTEM
──────────────                                  ────────────────────                ──────
Create record (3 steps, PIC names + emails)
  └─ save ───────────────────────────────────────────────────────────────────────► AR No. 0001 minted
     │                                                                              account created/linked
     ├─ mail + in-app: "you are the                                       ┌─────── PENDING
     │  personnel in charge" ──────────────► Home lists the record ──────┘
     │                                        opens it, writes narrative
     │                                        + attachments + optional signature
     │                                        Submit ────────────────────────────► SUBMITTED
     │                                                                              mail + in-app to admins
  ├─ correct an activity field
  │    └─ reason required, audit diff, mail + in-app to every retained PIC
  ├─ Return with comments ─────────────────────────────────────────────────────► RETURNED
  │                                        revises, resubmits ────────────────► SUBMITTED
  └─ Approve ──────────────────────────────────────────────────────────────────► APPROVED
                                                                                  F-013 per PIC rendered,
                                                                                  stored, mailed as PDF
                                              view + download receipt
Office archives an approved record ────────────────────────────────────────────► archived_at set
                                                                                  status stays APPROVED
```

Rules that the diagram depends on:

- A PIC sees only records whose `report_pics.user_id` names the account. Never "a role sees everything".
- The office can read the narrative only from `SUBMITTED` onward. A `PENDING` narrative draft is the PIC's working text and is hidden from every admin screen and from exports.
- Any listed PIC may edit the shared draft and submit it while the record is `PENDING` or `RETURNED`. The last writer wins on text; submission is first-writer.
- The office cannot write, submit, or decide its own authored narrative — it never authors one except when an admin account is itself a listed PIC, in which case it acts as a PIC and keeps the existing admin decision exception (`AGENTS.md`; spec §9).
- Nothing locks at `SUBMITTED` except the narrative and attachments; activity fields and the PIC list stay correctable until `APPROVED`.
- Archiving never changes the status and never deletes anything.

---

## 4. Roles and permissions

`ROLES = ['ADMIN', 'PERSONNEL']`. Labels: **Administrator**, **Personnel in charge** (short: Personnel). One role per account.

| Capability                                             | ADMIN | PERSONNEL (listed PIC) | PERSONNEL (not listed) |
| ------------------------------------------------------ | :---: | :--------------------: | :--------------------: |
| Register / sign in / verify / reset password           |   ✓   |           ✓            |           ✓            |
| Create a record (mint AR No.)                          |   ✓   |                        |                        |
| Edit activity fields and the PIC list (until APPROVED) |   ✓   |                        |                        |
| Delete a `PENDING` record                              |   ✓   |                        |                        |
| View a record                                          |   ✓   |       own only ✓       |                        |
| Read a submitted narrative                             |   ✓   |       own only ✓       |                        |
| Write the narrative draft / upload attachments / sign  |       |           ✓            |                        |
| Submit or resubmit the narrative                       |       |           ✓            |                        |
| Approve or return a submitted narrative                |   ✓   |                        |                        |
| Archive / unarchive an approved record                 |   ✓   |                        |                        |
| Download a receipt                                     |   ✓   |       own only ✓       |                        |
| Resend invitation / reminder                           |   ✓   |                        |                        |
| Manage users, reference data, audit, email log         |   ✓   |                        |                        |
| Export the register PDF and monitoring workbooks       |   ✓   |                        |                        |

Notes:

- `canWriteNarrative(viewer, status)` is `(PERSONNEL || ADMIN) && (PENDING || RETURNED)` since 2026-10-23: any PIC may write an open record and claims it on submission by joining `report_pics`. The listed-PIC restriction and the admin-as-non-PIC exception described below are superseded.
- An ADMIN who is a listed PIC on a record can write, submit and still decide; the audit names the account for both acts. This is the existing admin exception, not a new rule.
- A PERSONNEL account has no inbox, no queue, no notifications of "work" beyond record events, and no admin surface; the API refuses every admin route regardless of navigation.
- Navigation is role-filtered in one place: ADMIN gets Home, Reports, Repository, Admin; PERSONNEL gets Home. `/reports`, `/search` and `/exports` redirect a personnel account to `/`.

---

## 5. Reference numbers

Unchanged from `personnel-narrative-flow-spec.md` §5, restated so no reader has to leave this document:

- Format `AR No. ` + a zero-padded global sequence, minimum four digits: `AR No. 0001` … `AR No. 9999`, `AR No. 10000`.
- Minted atomically with the record insert from `reference_counters` (`name = 'AR'`), in the same D1 batch; unique index on `reports.reference_no`.
- Gaps are allowed and expected. A deleted `PENDING` record retires its number permanently.
- Never manual, never editable, never reformatted. Search matches `0001`, `AR No. 0001`, and case-insensitive `ar no 0001`.
- The interview's alternative shapes (`NR-YYYYMMDD-XXXX`, UUID, office override) are rejected; nothing in this change touches minting.

---

## 6. Statuses, transitions, and the rename

### 6.1 The enum

```ts
REPORT_STATUSES = ['PENDING', 'SUBMITTED', 'RETURNED', 'APPROVED'];
```

| State       | Meaning                                                           | Who acts next | Presentation (1:1 with the enum) |
| ----------- | ----------------------------------------------------------------- | ------------- | -------------------------------- |
| `PENDING`   | Office created the record; no PIC has submitted the narrative yet | PIC           | **Pending**, neutral, pencil     |
| `SUBMITTED` | A PIC submitted; the office has not decided                       | Admin         | **Submitted**, info, inbox       |
| `RETURNED`  | The office sent it back with comments; the PIC may revise         | PIC           | **Returned**, maroon, undo       |
| `APPROVED`  | Accepted; receipts issued; terminal for the workflow              | —             | **Approved**, success, check     |

The word **Draft** disappears from the product. It named the office's record as if the PIC had authored it, and it made "pending with personnel" and "unsaved text" sound like the same thing. Support copy may still say "saved draft" for the unsaved/submitted distinction inside the editor; the status never says Draft.

### 6.2 Transitions

```
PENDING  → SUBMITTED
SUBMITTED → RETURNED | APPROVED
RETURNED → SUBMITTED
APPROVED → (terminal)
```

- `ALLOWED_TRANSITIONS` and `sourcesFor()` change only by the key rename (`DRAFT` → `PENDING`).
- Deletion is allowed while `PENDING` only, unchanged in substance.
- An admin activity edit never transitions the record. Archiving is not a transition (§7).
- Every transition writes an audit event, bumps `version`, and keeps its existing mail.
- `submitted_at` is stamped on the first submission and never overwritten; `submitted_by_user_id` records the PIC whose submission moved the record, and is replaced on a resubmission by the PIC who resubmitted.
- Resubmission keeps the same AR No. and does not mint anything.

### 6.3 Where the rename lands

`DRAFT` appears in roughly sixty places across the workspace: the enum and state machine, the status label map and its tests, `report-access`, the reports routes (`from` lists and messages), DB query filters, the monitoring export assembly, the facsimile renderer, the audit summaries, the inbox view model and tests, the register tabs, the palette and onboarding copy, and the UI phase acceptance lists. The rename is mechanical but must be complete: any remaining `DRAFT` in a public contract, a route parameter, or a status label is a defect.

---

## 7. Archiving

### 7.1 Model

Archive is a **filing action**, not a workflow state:

- `reports.archived_at` (text, UTC ISO, nullable) and `reports.archived_by_user_id` (text, nullable), set together.
- Only an `APPROVED` record can be archived. The status column stays `APPROVED`; `isTerminal()` and the state machine are untouched.
- Any ADMIN may archive or unarchive. Unarchiving clears both columns.
- Audit: `RECORD_ARCHIVED` / `RECORD_UNARCHIVED`, with the AR No. as the comment.

### 7.2 Behaviour

| Surface                   | Archived record                                                                                         |
| ------------------------- | ------------------------------------------------------------------------------------------------------- |
| Register `/reports`       | Hidden by default; visible under the **Archived** tab (`archived=archived`); `archived=all` shows both. |
| Admin Home queues         | Hidden (the queues only ever show `PENDING`, `SUBMITTED`, `RETURNED`, recent `APPROVED`).               |
| Personnel Home            | Shown with an **Archived** chip; still openable; never a work item.                                     |
| Record detail             | Readable by the office and its PICs; "Archived on <date> by <name>"; **Unarchive** is the only action.  |
| Receipts                  | Downloadable by the PIC and the office, exactly as before.                                              |
| Single-record PDF / print | Available; the printed sheet gains the line "Archived <date>" only when archived.                       |
| Monitoring `.xlsx`        | Excluded by default; the export dialog gains an "Include archived" checkbox.                            |
| Register PDF (§11)        | Follows the `archived` filter in force: active only by default, archived when the tab is Archived.      |
| Repository `/search`      | Included and marked with the chip, because retrieval must find filed records.                           |

### 7.3 Rules

- Archiving is refused before `APPROVED` (`409`), and refused twice idempotently (second archive is a no-op, not an error).
- An archived record cannot be edited, deleted, returned, or re-decided; it is already `APPROVED`.
- Unarchiving makes it appear in the register again; nothing is regenerated.
- No retention job deletes anything in this change.

---

## 8. The register and the personnel list

### 8.1 Admin register `/reports`

Columns: **AR No.**, Activity (title + type), Dates, Personnel in charge (joined names), **Submitted by**, Status, Updated. The AR No. stays the first column and links to the record.

Tabs: All, With PIC (`PENDING`), Submitted, Returned, Approved, **Archived**.

Filter panel (collapsible, beside the tabs):

| Filter                  | Type            | Matching                                                                        |
| ----------------------- | --------------- | ------------------------------------------------------------------------------- |
| Status                  | tabs (above)    | status equals the tab, plus the archived scope                                  |
| Type                    | select          | `REPORT_TYPES`                                                                  |
| Campus                  | select          | reference data                                                                  |
| Term                    | select          | reference data                                                                  |
| Activity dates          | two date inputs | `activity_start_date` on or after `from`; `activity_end_date` on or before `to` |
| **Personnel in charge** | text            | case-insensitive contains against `report_pics.name` only                       |
| **Submitted by**        | text            | case-insensitive contains against the submitter's name                          |
| Keyword `q`             | text            | AR No., title, location, PIC name, PIC email (unchanged)                        |
| Archived                | tab-equivalent  | `active` (default) / `archived` / `all`                                         |

- The two new filters are deliberately text, not a picker: there is no account picker on the register, and a free-text name matches how the office already searches. A datalist may suggest names already present in the current result set; it is a convenience, not a source of truth.
- Filters are shareable: every filter lives in the URL query, so a filtered register can be linked or printed and the PDF export uses the same query.
- Row actions: Open, Edit details (until `APPROVED`), Delete (`PENDING` only), Resend invitation (`PENDING`/`RETURNED`), Archive/Unarchive (`APPROVED`), Download receipt (when one exists).
- Empty states distinguish "no records yet" from "no records match these filters" and offer "Clear filters".

### 8.2 Personnel Home `/`

One list, no second page:

- Heading **Records**; a one-line note that the office owns the record and the account writes the narrative.
- Columns: AR No., Activity (title + type), Dates, Location, Status, **Action**.
- Row action by status: `PENDING` → **Write narrative**; `RETURNED` → **Revise and resubmit**; `SUBMITTED` → **View**; `APPROVED` → **View** plus **Receipt**. The AR No. and title always open the record; the action is a convenience, not the only path.
- Filters: **Status** (All, Pending, Submitted, Returned, Approved) and an **activity date range**. No PIC filter, no keyword box, no search page.
- Pagination at 25 rows, sizes 25/50/100 (the existing `ReportsPagination`).
- Archived rows carry the **Archived** chip and no action beyond View/Receipt.
- Empty state: "No records name you yet." with one sentence explaining that the office adds the personnel in charge for each activity.

### 8.3 Record `/reports/[id]`

**Office view**

- Activity summary and PIC list, both editable until `APPROVED`.
- Narrative panel:
  - `PENDING` — a neutral placeholder: "The personnel in charge have not submitted the narrative yet." Never the draft text, even if it exists.
  - `SUBMITTED` / `RETURNED` / `APPROVED` — the narrative text, attachments (read-only), the submitting PIC's name and time, and the snapshotted signature when present.
- Return comments from the latest round in the maroon callout; earlier rounds under History.
- Decision panel only when `SUBMITTED`: **Approve** (the single filled navy primary) and **Return with comments** (requires comments).
- Receipts list when `APPROVED`, each row naming the recipient, generated date, mailed date, and a download action.
- Archive action when `APPROVED`; Unarchive when archived.
- Edit dialog: an optional **Reason** field for `PENDING`, a **required** reason for `SUBMITTED`/`RETURNED`; the dialog lists which fields changed before saving.

**Personnel view**

- Activity summary and PIC list, read-only.
- Maroon return callout with the office's comments when `RETURNED`.
- Narrative editor while `PENDING`/`RETURNED`: text area, attachment drop zone, optional signature card, **Save draft** (secondary) and **Submit narrative** (the one primary).
- A local mirror of the text keeps the editor usable through a dropped connection; on reconnect the mirror syncs, and a conflicting newer server draft prompts before being overwritten. Submitting requires a live connection and a fresh version (the `if-match` header already carries it).
- After submission: read-only narrative, attachments, submission time and submitter, and no editor.
- `APPROVED`: receipt download with its issuance date.

---

## 9. Admin corrections after submission

### 9.1 What may change

| Field group                                                                                                                       | `PENDING` | `SUBMITTED` | `RETURNED` | `APPROVED` / archived |
| --------------------------------------------------------------------------------------------------------------------------------- | :-------: | :---------: | :--------: | :-------------------: |
| Activity fields (type, classification, campus, unit, department, office, level, title, dates, location, activity count, SDG list) |     ✓     |      ✓      |     ✓      |           —           |
| PIC list (add / remove / rename / email / phone)                                                                                  |     ✓     |      ✓      |     ✓      |           —           |
| Narrative text, attachments, signature                                                                                            |     —     |      —      |     —      |           —           |

The PIC's authored content is never editable by the office at any status. A wrong narrative is handled by **returning the record with comments** while it is still under review; once approved, nothing on the record is rewritten, and the office contacts the PIC outside the system if a correction is ever needed.

### 9.2 Accountability

- `PATCH /reports/:id` gains an optional `reason`. It is **required** when the record has been submitted (`SUBMITTED` or `RETURNED`) and any activity field or PIC row actually changes. A request with no net change is a no-op and sends nothing.
- The API computes the changed-field list (labels, not raw column names) before writing and returns it; the audit event carries the reason and the changed fields in its comment/metadata; `RECORD_UPDATED` is unchanged as the action name.
- Every retained PIC who has an account receives:
  - an in-app notification, kind `RECORD_EDITED`, description `AR No. 0001 — activity details corrected`;
  - one email, kind `RECORD_EDITED`, subject `AR No. 0001 — activity details corrected`, listing the changed fields, the reason verbatim, and a link to the record.
- Added PICs still get the assignment mail; removed PICs still get the removal mail and no change summary.
- Corrections on a `PENDING` record send no mail: nothing has been submitted yet, and the office is still filling in the record. (Assumption A2.)

---

## 10. Receipts

No change to generation or appearance; the rules are restated because the interview re-checked them:

- One **OVPCASSS-F-013** per PIC, rendered at approval, stored at `receipts/<reportId>/<picId>.pdf`, recorded in `receipts` with `generated_at` and `emailed_at`.
- The document stays an exact facsimile of `OVPCASSS-F-013.ACKNOWLEDGMENT RECEIPT.docx`: same wording, letterhead, AR No., "Done this …" approval date, fixed DR. LINCOLN V. TAN / VPCASSS block, footer. **No QR code, no added verification line.**
- Mailed as a PDF attachment through `EmailAttachmentRef`, readable in the app afterwards by that PIC and by any admin.
- A rendering or mail failure never rolls back an approval; the receipt is re-rendered on the next download.
- No submission receipt is introduced. The submission is acknowledged by the `SUBMITTED` mail, the in-app status, and the record's `submitted_at`.
- An archived record keeps its receipts downloadable.

---

## 11. Exports

### 11.1 New: filtered register PDF

`GET /api/v1/exports/register` (ADMIN), accepting exactly the register query (`tab`, `archived`, `type`, `campus`, `term`, `from`, `to`, `picName`, `submittedBy`, `q`, `sort`, `dir`) and returning `application/pdf`.

- A4 **landscape**, serif type, BSU/OVPCASSS heading, title **Post-Activity Report register**, and a filter summary line built from the filters in force ("Status: Submitted · Campus: Main · Submitted by: Cruz").
- Columns: AR No., Activity, Type, Dates, Location, Personnel in charge, Submitted by, Submitted, Status, Approved. Wrapped cells, rows never split across pages, header repeated on every page, footer "Page N of M" plus the generated timestamp in Asia/Manila.
- Rows follow the sort order of the screen; archived rows follow the `archived` filter.
- A record with no submission prints an em dash for Submitted by/date, never a blank that looks like a bug.
- Filename `OVPCASSS-PAR-register-YYYYMMDD-HHmm.pdf`; download goes through `apiDownload` in the browser and the platform save dialog in the desktop shell.
- Audit `REGISTER_EXPORTED` with the filter summary and the row count.
- Cap: 1000 rows per export; beyond that the action returns a `422` telling the office to narrow the filters (A3). No silent truncation, no partial file.
- The button lives on `/exports` and at the top of the register, labelled **Download register PDF**, disabled while a request is in flight.

### 11.2 Unchanged

- Monitoring workbooks: the three `.xlsx` sheets, 18 columns, print setup, `AR No.` values, "Date Received" = `submitted_at`, "Date Completed" = `approved_at`. The only change is the optional "Include archived" checkbox.
- Single-record facsimile PDF (`GET /reports/:id/pdf`) and browser print.
- Receipt PDFs (§10).
- No CSV is added.

---

## 12. Notifications and mail

| Kind               | Trigger                                           | Recipient                 | Subject                                                | Notes                                             |
| ------------------ | ------------------------------------------------- | ------------------------- | ------------------------------------------------------ | ------------------------------------------------- |
| `ASSIGNED`         | Record created, or a PIC added                    | Each PIC                  | `AR No. 0001 — you are the personnel in charge`        | Mail **and** in-app, restored                     |
| `SUBMITTED`        | A PIC submits or resubmits                        | All admins                | `AR No. 0001 — narrative report ready for review`      | Unchanged                                         |
| `RETURNED`         | Office returns with comments                      | Every PIC                 | `AR No. 0001 — narrative report returned for revision` | Comments verbatim                                 |
| `RECORD_EDITED`    | Office changes an activity field after submission | Every retained PIC        | `AR No. 0001 — activity details corrected`             | **New**: changed fields + reason; mail and in-app |
| `RECEIPT_ISSUED`   | Office approves                                   | Each PIC                  | `AR No. 0001 — acknowledgment receipt`                 | PDF attached                                      |
| `REMINDER`         | 7 days after creation, weekly, max three          | PICs without a submission | `AR No. 0001 — narrative report still pending`         | Now selects `PENDING` records                     |
| `PIC_REMOVED`      | PIC removed before approval                       | Removed PIC               | `AR No. 0001 — removed as personnel in charge`         | No change summary                                 |
| `VERIFY` / `RESET` | Account lifecycle                                 | Account                   | Unchanged                                              | —                                                 |

- All sends keep the existing `notify()` → outbox → queue path, honour the account's email preferences, and never block a transition.
- A muted workflow preference suppresses the email; the in-app notification still appears.
- Mail copy keeps the institutional voice, leads with the AR No., and never claims a receipt exists before it has been generated.
- New kinds require the shared contract union, the template, a sample, the email-log label, and tests, in one change.

---

## 13. Web UI surfaces

| Surface                | Change                                                                                                                         |
| ---------------------- | ------------------------------------------------------------------------------------------------------------------------------ |
| Admin Home `/`         | Unchanged sections; "With personnel in charge" now means `PENDING`; archived rows never appear.                                |
| Register `/reports`    | New columns, two new filters, Archived tab, archive row actions, **Download register PDF**.                                    |
| Create `/reports/new`  | Unchanged: three steps, no narrative, no signature, no attachments. Confirmation still shows the AR No.                        |
| Record `/reports/[id]` | Narrative hidden while `PENDING`; edit dialog with reason; archive/unarchive; receipts when approved.                          |
| Exports `/exports`     | Monitoring workbook card unchanged plus an "Include archived" checkbox; new register PDF card with a filter summary preview.   |
| Personnel Home `/`     | One Records list with row actions and status/date filters; no `/my-reports`.                                                   |
| Navigation             | Remove the `myReports` nav item and `NavId` member; keep the role guards on `/reports` and `/search`.                          |
| Palette                | PERSONNEL pages: Home, Profile, Notifications (already true in the working tree); no `my-reports` entry ever appears.          |
| How it works           | Rewrite the status and role copy for PENDING + the PIC-authored narrative; update its coverage test.                           |
| Onboarding tour        | PIC copy returns to "Home shows the activities assigned to you…" with a Write narrative step; the read-only wording goes.      |
| Empty/error states     | Use the shared `EmptyState`/`ErrorState`; "no records match these filters" is distinct from "no records yet".                  |
| Status language        | `StatusBadge` and `report-status.ts` gain **Pending**; no colour is invented: neutral, info, maroon, success stay as they are. |

Rules preserved: one filled navy primary per screen; gold and maroon never used as buttons; status never conveyed by colour alone; desktop-only below 1024 px shows the foundation notice; keyboard shortcuts stay suppressed while typing.

---

## 14. API surface

All under `/api/v1`; Zod at the edge; errors remain `{ error: { code, message, details? } }`.

| Method + path                    | Who        | Change                                                                                                                             |
| -------------------------------- | ---------- | ---------------------------------------------------------------------------------------------------------------------------------- |
| `GET /reports`                   | both       | Add `archived` (`active` default), `picName`, `submittedBy`; remove `scope`. PERSONNEL stays scoped to PIC membership server-side. |
| `GET /reports/:id`               | both       | Add `archivedAt`/`archivedBy`; narrative is included for the office only from `SUBMITTED` onward, and always for a PIC.            |
| `POST /reports`                  | ADMIN      | Unchanged behaviour; restore the in-app `ASSIGNED` notification beside the existing mail.                                          |
| `PATCH /reports/:id`             | ADMIN      | Body gains `reason`; required on `SUBMITTED`/`RETURNED` when something changes; returns `changedFields`; sends `RECORD_EDITED`.    |
| `DELETE /reports/:id`            | ADMIN      | Only `PENDING` (renamed from `DRAFT`); confirm copy mentions a saved narrative.                                                    |
| `PUT /reports/:id/narrative`     | PIC        | Unchanged: `PENDING`/`RETURNED`, membership required, version checked.                                                             |
| `POST /reports/:id/submit`       | PIC        | Unchanged: PIC only, validates narrative + attachments, snapshots the signature, stamps `submitted_at`/`submitted_by_user_id`.     |
| `POST /reports/:id/decision`     | ADMIN      | Unchanged; an approval may carry an optional remark stored as `OFFICE_NOTE` (A1).                                                  |
| `POST /reports/:id/archive`      | ADMIN      | New; `APPROVED` only; idempotent; audit `RECORD_ARCHIVED`.                                                                         |
| `DELETE /reports/:id/archive`    | ADMIN      | New; clears the flag; audit `RECORD_UNARCHIVED`.                                                                                   |
| `POST /reports/:id/invitation`   | ADMIN      | Unchanged; now refused for archived records as well as approved ones.                                                              |
| `GET /reports/:id/receipts[...]` | ADMIN, PIC | Unchanged; archived records still serve receipts.                                                                                  |
| `GET /exports/register`          | ADMIN      | New; the filtered register PDF (§11.1).                                                                                            |
| `GET /exports/monitoring[...]`   | ADMIN      | Add `includeArchived` to preview/send/assemble.                                                                                    |
| `GET /me/inbox`                  | ADMIN      | Retire the `myReports` section and its builder; a personnel account no longer uses this route.                                     |

Removed: `scope` from `reportListQuerySchema`, `submittedByUserId` from the DB list filter, the `myReports` inbox section, and the `/my-reports` route.

Status values in every request/response and audit payload use `PENDING`; any accepted `DRAFT` value is a bug.

---

## 15. Data model and migration

### 15.1 Schema

`reports` gains:

- `archived_at` text, nullable — UTC ISO.
- `archived_by_user_id` text, nullable — the admin who filed it.
- `index('reports_archived_idx').on(table.archivedAt)`.

Nothing else changes. `status` remains a text column whose TypeScript enum is `REPORT_STATUSES`; the SQLite value changes only for stored rows, not for the column definition. No new tables, no R2 key changes, no counter changes.

`ReportListItem` gains `submittedByName: string | null` and `archivedAt: string | null`; `reportDetailSchema` gains `archivedAt`, `archivedByName`, and keeps `canWriteNarrative`/`canManage`.

### 15.2 Status rename migration

The rename is a data change, so it is not expressible as a drizzle schema diff:

1. `pnpm db:generate` produces the migration for the two archive columns only.
2. A reviewed, idempotent script `packages/db/scripts/rename-draft-status.sql` runs once per environment before the new Worker takes traffic:
   `UPDATE reports SET status = 'PENDING' WHERE status = 'DRAFT';`
   It is executed with `wrangler d1 execute <db> --file`, recorded in the deploy checklist, and safe to re-run.
3. For one deploy window the read layer maps a stored `DRAFT` to `PENDING` (`report-read` normalises on read) so a request landing mid-deploy does not fail. That shim is removed in the following change; it never appears in responses.
4. `pnpm db:generate` must leave the migrations directory clean; the data script is not a migration and never rewrites history.
5. No backfill of audit events: historical rows keep the status they recorded. The audit UI renders `DRAFT` as "Draft (legacy)" so old entries stay truthful and readable.

### 15.3 Audit vocabulary

New: `RECORD_ARCHIVED`, `RECORD_UNARCHIVED`, `REGISTER_EXPORTED`. `RECORD_UPDATED` gains a structured `details` payload with `{ changedFields: string[], reason: string }`. `report_comments.kind` keeps `RETURN | OFFICE_NOTE`; `OFFICE_NOTE` exists in the schema but has no writer today, and A1 is its first use.

---

## 16. Files: create, change, retire

| Area    | Create                                                                                                                | Change                                                                                                                                                                                                                                                                                                                                                                      | Retire                                                                                           |
| ------- | --------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------ |
| shared  | —                                                                                                                     | `domain/enums.ts` (PENDING), `workflow/state-machine.ts`, `contracts/reports.ts` (filters, archive, submittedBy), `contracts/audit.ts`, `contracts/email.ts` (RECORD_EDITED), `contracts/inbox.ts` (drop myReports), `validation/report.ts` (reason), all adjacent tests                                                                                                    | `scope` type/value, `myReports` inbox section type                                               |
| db      | `scripts/rename-draft-status.sql`                                                                                     | `schema/reports.ts` (+2 columns, index), `queries/report-read.ts` (archived/picName/submittedBy/join), `queries/report-write.ts` (archive, status sources), `queries/reports.ts` (`listOverdueDrafts` → pending), `queries/inbox.ts` (drop myReports)                                                                                                                       | `scope=mine` filter branch                                                                       |
| export  | `register/pdf.ts` (+ `register/layout.ts` if it keeps files under the limit, + test)                                  | `facsimile/pdf.ts` (archived line, status wording), `monitoring/*` (includeArchived)                                                                                                                                                                                                                                                                                        | —                                                                                                |
| api     | `features/reports/application/change-summary.ts` (diff + labels), `features/exports/application/assemble-register.ts` | `features/reports/routes.ts` (filters, archive routes, edit reason + notify, restore ASSIGNED notify), `features/reports/domain/report-access.ts` (`canArchive`), `features/exports/routes.ts`, `features/reminders/**`, `features/inbox/**`, `app.ts` if the export route needs mounting                                                                                   | `myReports` inbox builder path                                                                   |
| email   | `templates/record-edited.ts` (+ sample)                                                                               | `index.ts`, `samples.ts`, `samples.test.ts`, `report-mail.ts`                                                                                                                                                                                                                                                                                                               | —                                                                                                |
| web     | `lib/features/personnel/{application,presentation}/` (records list, row actions, filters)                             | `lib/status/report-status.ts`, `lib/navigation/navigation.ts` (+ tests), `lib/features/reports/application/report-register.ts`, `ReportTable.svelte`, `RecordDetailPage.svelte`, `NarrativeEditor.svelte`, `routes/+page.svelte`, `routes/reports/+page.svelte`, `routes/exports/+page.svelte`, `routes/how-it-works/**`, `lib/features/inbox/**`, onboarding tour, palette | `routes/my-reports/**`, `lib/features/assignments/**`, `scope=mine` client query, read-only copy |
| desktop | —                                                                                                                     | Nothing shell-specific; the register PDF uses the existing save/download adapter                                                                                                                                                                                                                                                                                            | —                                                                                                |
| docs    | this spec                                                                                                             | `personnel-narrative-flow-spec.md` (superseded pointer), `par-paperless-spec.md` §7.5–§9 status names, `ui/02,05,07,09,14` acceptance lists, `docs/todo.md`, `docs/runbooks/README.md` (data script + archive operation)                                                                                                                                                    | —                                                                                                |

Respect the structure limits: no source file over 400 lines, at most 30 files per directory, four levels below `src/`, kebab-case files, plural feature folders, no `utils/` or `helpers/`.

`lib/features/assignments/` is renamed rather than extended: its view model becomes the personnel records view model and its table becomes the shared record table used by both the PIC list and (with extra columns) the register.

---

## 17. Testing

### Unit (Vitest, beside source)

- `state-machine.test.ts`: `PENDING → SUBMITTED`, `SUBMITTED → RETURNED|APPROVED`, `RETURNED → SUBMITTED`, `APPROVED` terminal; no `DRAFT` key anywhere.
- `report-status.test.ts`: four labels, Pending neutral, next-step copy for each, legacy `DRAFT` audit rendering.
- `report-access.test.ts`: PIC write/submit in `PENDING` and `RETURNED` only; office cannot write or submit; `canManage` until `APPROVED`; `canArchive` only `APPROVED`; delete only `PENDING`; archived records refuse edits.
- `reports.test.ts` (contracts): `picName`/`submittedBy`/`archived` parsing, `reason` required on `PATCH`, archive response shape, no `scope`.
- `change-summary.test.ts`: field labels, ordering, no-op detection, PIC add/remove excluded from the changed list.
- `register/pdf.test.ts`: extracted text contains the filter summary, the AR No., the column headers, and the page footer; landscape A4; input beyond the cap is refused by the assembler rather than truncated.
- `record-edited` template test: subject leads with the AR No.; changed fields and reason appear verbatim; no receipt claim.
- Reminders: `listOverduePending` selects `PENDING` only, still caps at three.

### API integration (Workers pool, local D1/R2)

1. Office creates a record → `PENDING`, `AR No. 0001`, PIC account provisioned, assignment mail **and** in-app notification queued.
2. PIC saves a draft → office `GET /reports/:id` shows the placeholder and not the text; register PDF and monitoring export likewise omit the draft.
3. PIC submits → `SUBMITTED`, admins notified, office now reads the narrative, attachments and signature.
4. Second PIC edits the same draft while `PENDING` → sees the first PIC's text; after submission both are read-only and `submitted_by_user_id` names the submitter.
5. Office `PATCH` of the title while `SUBMITTED` without `reason` → `422`; with a reason → `200`, audit carries the diff and reason, every retained PIC receives `RECORD_EDITED` mail and in-app; a removed PIC receives only `PIC_REMOVED`.
6. Office `PATCH` of narrative/attachments/signature → `422`/`404` (no such field; the narrative route stays PIC-only).
7. Return with comments → `RETURNED`, PIC revises and resubmits → `SUBMITTED`, same AR No.
8. Approve → `APPROVED`, one receipt per PIC, mail with PDF by reference, both downloadable; archived later still downloadable.
9. Archive: refused before `APPROVED`; succeeds twice idempotently; default register excludes it; `archived=archived` shows it; PIC Home still shows it with the chip; unarchive restores it.
10. Register filters: `picName` matches a PIC name only (not the title), `submittedBy` matches the submitter, `archived=all` includes both, keyword `q` still matches PIC email.
11. `GET /exports/register` respects every filter, refuses >1000 rows with `422`, and audits `REGISTER_EXPORTED`.
12. Personnel cannot reach `/reports`, `/search`, `/exports`, archive, decide, create, edit, or delete (403/404 each); a non-PIC personnel gets `404` on someone else's record; `GET /reports` returns only their records.
13. A stored `DRAFT` row is served as `PENDING` during the transition window; the data script flips it; re-running the script changes nothing.

### Component (`render` from `svelte/server`)

- Personnel Records list: actions per status, archived chip, filter row, empty states, pagination.
- Admin register: new columns, PIC/submitted-by filter inputs, Archived tab, export button, filtered-empty state.
- Record detail: office placeholder while `PENDING`, narrative after `SUBMITTED`, edit dialog reason requirement, archive/unarchive buttons, receipt list.
- Status badge: Pending label and neutral tone; no colour-only status.
- Regression tests updated wherever `DRAFT` was asserted: register tabs, palette, tour copy, inbox, audit, facsimile, monitoring assembly.

### Manual acceptance

- Two PICs on one record: PIC A writes and submits, PIC B sees the same narrative read-only; both receive the F-013 after approval.
- Office corrects the location after submission: the reason is required, both PICs receive the correction mail and see the in-app notice.
- Archive an approved record, confirm it leaves the register, appears under Archived, prints with the archived line, and its receipt still downloads; unarchive it.
- Download the register PDF from a filtered view and print it on A4 landscape: header repeats, footer page numbers, no clipped rows; compare against the screen.
- Open the shared record as the office while the PIC is typing: no draft text anywhere.
- `pnpm verify` green; `pnpm db:generate` clean; data script applied and re-run on local D1; desktop build unchanged.

---

## 18. Assumptions and open questions

Decided in the interview and not to be re-litigated: narrative ownership, who creates records, one shared narrative with several PICs, PENDING meaning, no rejected/under-revision state, admin edit scope, edit accountability, single F-013, no QR, automatic AR No., archive as a flag, archive visibility, new filters, personnel list filters, filtered PDF, attachment limits, two roles, retention, offline mirror, personnel navigation, assignment notifications.

Assumptions where the request did not decide:

- **A1.** An approval may carry an optional remark, stored as an `OFFICE_NOTE` comment and shown to the PIC after approval and in the printed record's decision block. If the office prefers, this is dropped without affecting anything else.
- **A2.** The reason on an admin edit is required only on `SUBMITTED`/`RETURNED`; edits to a still-`PENDING` record stay silent, because nothing has been submitted yet.
- **A3.** The 1000-row cap on the register PDF is a starting guard, not a policy; it lives in one constant so it can move.
- **A4.** Archived records remain visible to their PICs with the chip, because their receipts live there and a person's own history should not disappear.
- **A5.** The repository (`/search`) includes archived rows and marks them, while the register hides them by default.
- **A6.** `picName` and `submittedBy` are free-text name matches (case-insensitive contains), not account pickers; no new endpoint is added for them.
- **A7.** The personnel Home filters are status + activity date range, and the list pages at 25.
- **A8.** The PIC signature stays optional; a missing signature leaves the printed line blank.
- **A9.** Attachment rules are unchanged: the server allowlist in `attachment-rules.ts` (PDF, JPEG, PNG, WebP, GIF, Word, Excel, PowerPoint, TXT, CSV, ZIP), 25 MB per file, several per record, private R2. The broader client pre-check is narrowed to match (see §2).
- **A10.** Reminders keep 7 days / weekly / maximum three and simply select `PENDING` instead of `DRAFT`.
- **A11.** Deleting a `PENDING` record that already holds a saved draft is allowed; the confirmation names the draft explicitly.
- **A12.** The working tree's read-only revision is withdrawn; its UI changes are reverted or adapted as listed in §2, and the committed `personnel-narrative-flow-spec.md` gets a one-line pointer to this document rather than a rewrite.
- **A13.** Approval remarks and return comments are the only free-text the office writes on a record; there is no separate "remarks" field.
- **A14.** No new env var is introduced; nothing here changes the Worker bindings or the desktop shell.

Open questions left deliberately, with the in-force assumption:

1. **Should bulk archive exist?** Not now; archiving is per record (A: one at a time, through the record and the register row).
2. **Should the register PDF carry a signature block?** Not now; it is a table for filing, and the signed artefact remains the per-record print and the F-013 (A: no signature block).
3. **Should the office be notified when a draft is started?** Not now; the office sees `PENDING` until submission (A: no partial-state notification).

Out of scope: per-PIC narratives, multi-level approval, HRIS/payroll/SMS integration, cryptographic signing, retention automation, macOS/Linux desktop builds, and any change to the receipt's contents.

---

## 19. Acceptance checklist

- [ ] `REPORT_STATUSES` is exactly `PENDING | SUBMITTED | RETURNED | APPROVED`; no `DRAFT` remains in a status value, contract, route, label, filter or status test (the audit's "Draft (legacy)" rendering is the one deliberate survivor); stored rows are migrated by the reviewed data script.
- [ ] The status badge reads **Pending** for the unsubmitted record, with unchanged neutral tone and 1:1 enum mapping.
- [ ] A listed PIC writes, saves, signs and submits the narrative from Home; the office cannot write or submit it.
- [ ] With several PICs, the draft is shared, any PIC may submit, and `submitted_by_user_id` names the submitter.
- [ ] The office never sees a `PENDING` narrative draft — not on the detail page, not in the register PDF, not in the monitoring workbook.
- [ ] After submission, the office reads the narrative, attachments, submitter and signature, and can decide.
- [ ] An office edit after submission requires a reason, is audited with the changed fields, and notifies every retained PIC in-app and by mail; narrative, attachments and signature are untouchable.
- [ ] Approval issues one F-013 per PIC, exactly as the docx, with no QR, and mails it as a PDF; the receipt stays downloadable after archiving.
- [ ] The register shows Submitted by, filters by personnel in charge and submitted by, and keeps the AR No. as the first column.
- [ ] Archived records leave the default register, appear under the Archived tab, and keep their receipts and their place on the PIC's Home.
- [ ] **Download register PDF** produces the filtered table on A4 landscape with a filter summary and page numbers, or refuses over the cap.
- [ ] Personnel accounts see one Home list with a status-appropriate action, status/date filters, and no Reports, Repository, Admin, `/my-reports`, or inbox.
- [ ] `/reports` and `/search` still return a personnel account to Home; admin routes refuse a personnel account at the API.
- [ ] Assignment restores the in-app notification beside the mail; the correction mail and in-app notice are new and tested.
- [ ] Reminders still fire at 7 days, weekly, at most three, and now select `PENDING`.
- [ ] The onboarding tour, how-it-works copy, palette, and UI phase acceptance lists describe the PIC-authored flow and the Pending label.
- [ ] `pnpm verify` passes; `pnpm db:generate` leaves migrations clean; the data script is idempotent; the register PDF prints correctly; the desktop build is unchanged.
