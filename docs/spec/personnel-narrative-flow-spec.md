# Spec — Office-created records, personnel-in-charge narratives, and the OVPCASSS-F-013 acknowledgment receipt

**Status:** implemented (2026-10-23). `pnpm verify`, the Worker dry-run build, `db:generate`, and a clean-schema migration run are green. Manual acceptance items that need a live mailbox or the docx side-by-side print comparison are still open.
**Request:** “We now change the flow. The admin can create all the data — activity type, classification, campus, title, date, location, number of activities, person in charge, everything from steps 1, 2 and 3 — and the report starts from `AR No. 0001` and increments every report. See the ACKNOWLEDGMENT RECEIPT (very important). Use the docs to integrate the acknowledgment receipt into the system and email it to them. New role: personnel in charge. The admin should only check their submitted narrative report. The personnel in charge have their own dashboard where they only see the reference number and input and submit their narrative against it, and they are emailed the acknowledgment receipt. On their end they cannot create or edit the report.”
**Source of truth:** `docs/OVPCASSS-F-013.ACKNOWLEDGMENT RECEIPT.docx`, `docs/spec/par-paperless-spec.md` §7.5–§7.10, §8, §9; `docs/spec/email-integration-spec.md`; `docs/spec/ui/02-work-inbox.md`, `05-reports-table.md`, `06-create-wizard.md`, `07-edit-returned.md`, `08-facsimile.md`, `09-queues-and-decisions.md`, `16-quality-pass.md`
**Packages touched:** `packages/shared`, `packages/db`, `packages/email`, `packages/export`, `apps/api`, `apps/web`
**Routes touched:** `/`, `/login`, `/register`, `/reports`, `/reports/new`, `/reports/[id]`, `/reports/[id]/narrative`, `/search`, `/exports`, `/admin/users`, `/admin/reference-data`, `/how-it-works`, `/notifications`, `/profile`; removed: `/review`, `/review/[id]`, `/approval`, `/approval/[id]`, `/admin/import`

---

## 0. The change in one line

The office registers the activity first and owns the register; the person in charge only writes the narrative; the office checks it and the system mails a faithful OVPCASSS-F-013 acknowledgment receipt.

| #   | Workstream                        | Outcome                                                                                                                                                                                  |
| --- | --------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| W1  | Roles and numbering               | `ADMIN` + `PERSONNEL`; `AR No. 0001` minted at creation, global, never reset; the OFF/EDU/INC tracking number is retired.                                                                |
| W2  | Admin creates the record          | A three-step wizard captures everything today’s steps 1–3 capture, assigns the personnel in charge by name and email, and emails each of them their reference number.                    |
| W3  | Personnel dashboard and narrative | A PERSONNEL account sees only its own records by AR No., writes and submits the narrative with attachments and an optional signature, and can do nothing else.                           |
| W4  | Office review                     | The admin’s only decision is on the submitted narrative: approve, or return with comments. Reviewer/approver stages and queues are retired.                                              |
| W5  | F-013 receipt                     | On approval the system renders one OVPCASSS-F-013 acknowledgment receipt per PIC, stores it, emails it as a PDF attachment, and keeps it downloadable. It replaces today’s approval PDF. |

W1 is foundational (enums, schema, numbering); W2 and W3 can ship together; W4 and W5 follow in that order.

---

## 1. Decisions locked in during the interview

| Topic                         | Decision                                                                                                                                |
| ----------------------------- | --------------------------------------------------------------------------------------------------------------------------------------- |
| Who creates a report          | **Admin only.** The submitter creation path is retired.                                                                                 |
| AR No. sequence               | **Global, never resets**: 0001, 0002, 0003 … for the life of the system.                                                                |
| Old OFF/EDU/INC numbers       | **Replaced by AR No. everywhere**: lists, detail, search, emails, printed report, monitoring workbook.                                  |
| Numbering moment              | **At admin creation**, when the record is first saved and sent. Gaps are allowed.                                                       |
| Deleting a mistake            | Allowed **only while status is DRAFT** (no narrative submitted). The AR No. is retired, never reused, and the deletion is audited.      |
| Review path                   | **Admin reviews and approves in one step**; RETURNED sends it back to the PICs.                                                         |
| Roles kept                    | **ADMIN + PERSONNEL only.** REVIEWER, APPROVER, and SUBMITTER cease to exist as roles.                                                  |
| Existing REVIEWER/APPROVER    | **Moved to PERSONNEL**, accounts stay active. Existing SUBMITTER accounts move to PERSONNEL as well (see §18 assumption A2).            |
| Existing reports              | **Cleared.** The register starts empty at AR No. 0001.                                                                                  |
| Reference format              | **“AR No. 0001”** everywhere — tables, detail, emails, search results, PDF.                                                             |
| Receipt fidelity              | **Exact facsimile of the docx**, letterhead images extracted from the docx.                                                             |
| Receipt wording for in-campus | “the **in-campus** activity” for IN_CAMPUS, “the **off-campus** activity” for the other two; every other word identical.                |
| Receipt activity date         | **Range when it spans days** (“21–23 October 2026”), single date otherwise.                                                             |
| Receipt “Done this …” date    | **Approval date** in Asia/Manila, with an English ordinal day.                                                                          |
| Receipt signatory             | **Fixed in configuration**: DR. LINCOLN V. TAN / VPCASSS, editable by the admin, no signature image (matches the docx).                 |
| Receipt addressee             | **One receipt per PIC**, each addressed to that person by name.                                                                         |
| Receipt delivery              | **Email with the PDF attached**, plus download in the app afterwards.                                                                   |
| Receipt vs old approval PDF   | **F-013 replaces it**; no internal approval PDF is kept.                                                                                |
| “Number of activities”        | **New integer field**: how many sessions/days the record covers. Printed report only; the monitoring sheets keep their 18 columns.      |
| PIC count per record          | **One or more**; every listed PIC needs name + email and can open and submit.                                                           |
| Narrative                     | **Typed narrative plus attachments**, saved as a draft before submitting.                                                               |
| Attachments                   | **PIC uploads**; the admin’s record carries no files.                                                                                   |
| PIC signature                 | **Optional**, drawn or uploaded, snapshotted onto the record before submission. The receipt is signed only by the fixed VPCASSS block.  |
| PIC access                    | **Admin creates the account by email** when it does not exist; anyone may register/sign in, and new accounts start as PERSONNEL.        |
| Existing account as PIC email | **Link the record to that account** (even an ADMIN account); no duplicate account, no rejection.                                        |
| PIC list changes              | **Admin may add/remove PICs until approved**; added people are mailed, removed people lose access immediately.                          |
| Admin activity edits          | **Allowed until approved**; the PIC’s narrative and attachments are untouched by an activity edit.                                      |
| Sign-up rules                 | **University-domain limit removed**; email verification still required; Google sign-in allowed; new accounts land on the PIC dashboard. |
| Admin accounts                | **Bootstrap list stays** (`BOOTSTRAP_ADMIN_EMAILS`); an admin may promote another account.                                              |
| PIC reminders                 | **7 days after creation, then weekly, up to three**; admin sees the record flagged overdue.                                             |
| Review/approval queues        | **Folded into one admin queue**; `/review` and `/approval` are removed.                                                                 |
| Monitoring import             | **Retired** with the screen.                                                                                                            |
| Mail subjects                 | **Led by the reference**: “AR No. 0001 — …”.                                                                                            |
| Date received (workbook)      | **When the PIC submitted the narrative** (`submitted_at`).                                                                              |
| Status set                    | **DRAFT, SUBMITTED, RETURNED, APPROVED.**                                                                                               |

---

## 2. Verified current state (why this is a real change)

1. **Four roles hard-coded everywhere.** `ROLES` is `SUBMITTER | REVIEWER | APPROVER | ADMIN` (`packages/shared/src/domain/enums.ts`), with `actsAs` treating `ADMIN` as every role (`packages/shared/src/domain/roles.ts`). Navigation, queue tabs, inbox sections, and decision guards all branch on these four.
2. **Seven workflow states.** `ALLOWED_TRANSITIONS` runs `DRAFT → SUBMITTED → RETURNED_BY_REVIEWER → RESUBMITTED → ENDORSED → RETURNED_BY_APPROVER → APPROVED` (`packages/shared/src/workflow/state-machine.ts`).
3. **Tracking numbers are per type and per year.** `formatTrackingNumber` emits `<OFF|EDU|INC>-<year>-<seq4>` (`packages/shared/src/tracking/tracking-number.ts`), minted on first submission from `tracking_counters` (`packages/db/src/schema/reports.ts`), and the monitoring columns read `trackingNumber` (`packages/export/src/monitoring/columns.ts`).
4. **The submitter owns the record.** `reports.owner_user_id` is the submitter; access is decided by `canViewReport(viewer, ownerUserId)`, and the wizard is opened by whoever created the draft. The full wizard is four steps: classification, details, people, then “Narrative and attachments” (`WizardStepper.svelte`, `wizard-form.ts`).
5. **The acknowledgement PDF is a different document.** `packages/export/src/acknowledgement/pdf.ts` renders “ACKNOWLEDGEMENT OF POST-ACTIVITY REPORT” with a reference, activity, approver, approval date, and the approver’s signature image. It is not OVPCASSS-F-013, has no letterhead, no “Dear …” letter, and one per report rather than one per PIC.
6. **Approval currently requires a profile signature.** The decision drawer blocks approval without `hasSignature`, and the old PDF prints the approver’s signature.
7. **Registration is domain-gated.** `ALLOWED_EMAIL_DOMAINS = "buksu.edu.ph,student.buksu.edu.ph"` (`apps/api/wrangler.toml`), enforced in `register.ts` and `google.ts`; the register form reads the list from `GET /auth/config`. New password accounts become `SUBMITTER`.
8. **The import and the two queues exist.** `/admin/import` reads existing monitoring workbooks; `/review` and `/approval` mount as separate queue features, and `app.ts` mounts both under `/api/v1`.
9. **Mail already carries attachments by reference.** `EmailAttachment` carries bytes in-process, and `EmailAttachmentRef { objectKey, filename, contentType, size }` travels through the queue and outbox (128 KB queue limit), so an F-013 PDF must be queued by reference, never inline. A stored PDF with a JPEG letterhead will exceed 128 KB.
10. **A reminder sweep and inbox exist to reuse.** `apps/api/src/features/reminders/application/send-reminders.ts` selects waiting reports and calls `notify()`, which writes both mail and the in-app inbox. The inbox contract (`packages/shared/src/contracts/inbox.ts`) currently has fixed sections `returned / review / approval / drafts / waiting / activity / admin`.

---

## 3. Target flow

```
ADMIN                                    PERSONNEL IN CHARGE                 SYSTEM
─────                                    ────────────────────                ──────
Create record (steps 1–3)
  └─ save ──────────────────────────────────────────────────────────────► AR No. 0001 minted
     │                                                                     account created/linked
     └─ mail: "AR No. 0001 — you are
        the personnel in charge" ─────────► opens dashboard
                                            (their records only) ───────► sees AR No. 0001,
                                                                           activity facts, status
                                            writes narrative
                                            + attachments
                                            + optional signature
                                            Submit ──────────────────────► status SUBMITTED
                                                                          mail to admins
Admin opens "Awaiting your decision"
  ├─ Return (comments) ───────────────────► status RETURNED
  │                                         mail to PICs
  │                                         PIC revises + resubmits ───► SUBMITTED
  └─ Approve ─────────────────────────────────────────────────────────► status APPROVED
                                                                          PDF per PIC generated
                                                                          + stored
                                                                          mail with PDF attached
                                                                          PIC downloads receipt
```

The admin never writes a narrative. The PIC never creates, edits, or deletes a record, never sees another PIC’s records, and never makes a decision.

---

## 4. Roles and permissions

`ROLES = ['ADMIN', 'PERSONNEL']`. Labels: **Administrator**, **Personnel in charge** (short: Personnel). One role per account, as today.

| Capability                                                   | ADMIN | PERSONNEL (listed PIC) | PERSONNEL (not listed) |
| ------------------------------------------------------------ | :---: | :--------------------: | :--------------------: |
| Register / sign in / verify / reset password                 |   ✓   |           ✓            |           ✓            |
| Create a record (mint AR No.)                                |   ✓   |                        |                        |
| Edit activity details (until APPROVED)                       |   ✓   |                        |                        |
| Assign / remove PICs (until APPROVED)                        |   ✓   |                        |                        |
| Delete a DRAFT record                                        |   ✓   |                        |                        |
| View a record                                                |   ✓   |       own only ✓       |                        |
| Write narrative, upload attachments, sign, submit / resubmit |       |           ✓            |                        |
| Approve or return a submitted narrative                      |   ✓   |                        |                        |
| Download own receipt                                         |   ✓   |           ✓            |                        |
| Resend invitation / reminder                                 |   ✓   |                        |                        |
| Manage users, reference data, audit, email log               |   ✓   |                        |                        |
| Export monitoring workbooks                                  |   ✓   |                        |                        |

Rules:

- Access to a record for PERSONNEL is membership in `report_pics.user_id`, never “a role can see everything”.
- An ADMIN may also be a PIC of a record. The record then appears both in the admin register and on that account’s PIC dashboard; the account still decides as admin (§7).
- An ADMIN alone may decide; the PIC must never see a decision affordance.
- Separation of duties: nobody can decide a narrative they submitted themselves except an ADMIN (carried over from spec §9 and the 2026-10-22 admin exception).
- A PERSONNEL account with no assignment gets an empty dashboard, never an error.

---

## 5. Reference numbers

- **Format:** `AR No. ` + zero-padded sequence, minimum four digits: `AR No. 0001`, `AR No. 0002`, …, `AR No. 9999`, `AR No. 10000`.
- **Scope:** one global sequence, no year component, no reset. Never reused, never renumbered.
- **Minting:** at admin creation, atomically with the insert:
  `INSERT INTO reference_counters (name, last_seq) VALUES ('AR', 1) ON CONFLICT(name) DO UPDATE SET last_seq = last_seq + 1 RETURNING last_seq`,
  in the same D1 batch as the report insert, with a unique index on `reports.reference_no`. Gaps are expected and accepted.
- **Storage:** `reports.reference_no` stores the formatted string (`AR No. 0001`), so search, sort, and exports never reformat differently. A generated `sequence` integer column is stored beside it for ordering.
- **Search:** matches `0001`, `AR No. 0001`, and (case-insensitive) `ar no 0001`.
- **Retirement of the old scheme:** `REPORT_TYPE_PREFIX`, `formatTrackingNumber`, `tracking_counters`, and the `trackingNumber` field are removed. `REPORT_TYPES` stays (it drives the receipt wording and the three monitoring sheets).

---

## 6. Statuses and transitions

```ts
REPORT_STATUSES = ['DRAFT', 'SUBMITTED', 'RETURNED', 'APPROVED'];
```

| State       | Meaning                                                   | Who acts next        |
| ----------- | --------------------------------------------------------- | -------------------- |
| `DRAFT`     | Record created by the office; narrative not yet submitted | PIC (or admin edits) |
| `SUBMITTED` | Narrative submitted; office review pending                | Admin                |
| `RETURNED`  | Office returned it with comments; PIC may revise          | PIC                  |
| `APPROVED`  | Accepted; receipts issued; terminal                       | —                    |

```
DRAFT → SUBMITTED
SUBMITTED → RETURNED | APPROVED
RETURNED → SUBMITTED
APPROVED → (terminal)
```

- Deleting a record is allowed in `DRAFT` only, and does not change the state machine.
- Admin activity edits do not transition state and never unlock `APPROVED`.
- Every transition writes an audit event and bumps `version`.
- Status labels stay one-to-one with the enum (`apps/web/src/lib/status/report-status.ts`): Draft (neutral), Submitted (info), Returned (maroon — “sent back”), Approved (success). Audience-specific meaning is supporting copy, not a second label.

---

## 7. Data model changes

All tables keep `id`, `created_at`, `updated_at` (UTC ISO text). One forward migration set; the report data is cleared before it is applied (§15).

**`reports`**

- Remove: `tracking_number`, `owner_user_id`, `submitter_signature_key`, `submitter_signed_at`.
- Add:
  - `reference_no` text **unique**, `sequence` integer — §5.
  - `created_by_user_id` text not null — the admin who registered the activity.
  - `activity_count` integer not null default 1 — “Number of activities”.
  - `narrative_submitted_by_user_id` text nullable — which PIC submitted.
  - `narrative_signature_key` text nullable, `narrative_signed_at` text nullable — the PIC’s snapshotted signature.
- Keep: `type`, `classification`, `campus_id`, `unit_id`, `department`, `office`, `level`, `title`, `activity_start_date`, `activity_end_date`, `location`, `total_students`, `total_pic`, `narrative`, `draft_form`, `submitted_at`, `approved_at`, `approved_by_user_id`, `status`, `version`.
- Indexes: unique `reference_no`; `(status)`; `(submitted_at)`; `(activity_start_date)`; `(created_by_user_id)`.

**`report_pics`** — the access list

- Add `user_id` text nullable (linked account), `invited_at` text nullable.
- `name` and `email` become **required** (email not null). `phone` stays optional.
- Unique index `(report_id, email)` so one person cannot be listed twice on the same record.
- `sort_order` stays; index `(user_id)` for the PIC dashboard query.

**`reference_counters`**

- Replaces `tracking_counters`: `name` text PK (`'AR'`), `last_seq` integer not null default 0.

**`receipts`**

- Replaces `acknowledgements`: `id`, `report_id`, `recipient_pic_id`, `recipient_user_id` nullable, `recipient_name`, `object_key`, `generated_at`, `emailed_at` nullable.
- Unique index `(report_id, recipient_pic_id)`; index `(recipient_user_id)`.

**`report_comments`** — keep, with `kind` narrowed to `RETURN | OFFICE_NOTE`.

**`users`** — no schema change: `role` values simply become `ADMIN | PERSONNEL`. Migration rewrites existing rows (§15).

**`audit_events`** — unchanged and append-only. New action vocabulary: `RECORD_CREATED`, `RECORD_UPDATED`, `RECORD_DELETED`, `PIC_ASSIGNED`, `PIC_REMOVED`, `NARRATIVE_SAVED`, `NARRATIVE_SUBMITTED`, `NARRATIVE_SIGNED`, `NARRATIVE_RETURNED`, `NARRATIVE_APPROVED`, `RECEIPT_ISSUED`, `RECEIPT_DOWNLOADED`, `INVITATION_RESENT`.

---

## 8. Shared contracts

| Contract                      | Change                                                                                                                                                                                                                                                                                                                 |
| ----------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `domain/enums.ts`             | `ROLES = ['ADMIN','PERSONNEL']`; `REPORT_STATUSES = ['DRAFT','SUBMITTED','RETURNED','APPROVED']`; drop `REPORT_TYPE_PREFIX`.                                                                                                                                                                                           |
| `domain/roles.ts`             | `actsAs` reduces to an equality check plus `ADMIN` standing in for workflow decisions only.                                                                                                                                                                                                                            |
| `tracking/tracking-number.ts` | Replace with `reference/reference-number.ts`: `formatReferenceNo(seq)`, `parseReferenceNo(text)`, `REFERENCE_LABEL = 'AR No.'`.                                                                                                                                                                                        |
| `workflow/state-machine.ts`   | The four-state table in §6.                                                                                                                                                                                                                                                                                            |
| `contracts/reports.ts`        | `referenceNo`, `sequence`, `createdByUserId`, `activityCount`, `pics[].userId?`, `narrativeSubmittedBy?`; new `reportDecisionSchema { decision: 'APPROVE' \| 'RETURN', comments?: string }`; `receiptSchema { id, recipientName, generatedAt, emailedAt?, url }`; remove submitter-signature and `RESUBMITTED` shapes. |
| `contracts/inbox.ts`          | Sections become `awaitingReview` (admin), `withPic` (admin), `returned`, `approved`, `myReports` (personnel), `activity`, `admin`.                                                                                                                                                                                     |
| `contracts/email.ts`          | New kinds: `ASSIGNED`, `NARRATIVE_RETURNED`, `RECEIPT_ISSUED`, `PIC_ADDED`, `PIC_REMOVED`; keep `SUBMITTED`, `REMINDER`, `VERIFY`, `RESET`, account kinds; drop `ENDORSED`.                                                                                                                                            |
| `contracts/queues.ts`         | One admin queue (`awaitingReview`), plus a DRAFT-pending filter for “with PIC”. Remove the reviewer/approver queue shapes.                                                                                                                                                                                             |
| `contracts/imports.ts`        | Deleted with the feature.                                                                                                                                                                                                                                                                                              |
| `validation/report.test.ts`   | Rewritten around the three-step admin schema and the PIC narrative schema (`narrative` required on submit, optional while saving a draft).                                                                                                                                                                             |

---

## 9. API surface

All under `/api/v1`; Zod at the edge; errors stay `{ error: { code, message, details? } }`.

| Method + path                                                         | Who        | Purpose                                                                                                                                               |
| --------------------------------------------------------------------- | ---------- | ----------------------------------------------------------------------------------------------------------------------------------------------------- |
| `POST /reports`                                                       | ADMIN      | Create a record: activity fields + ≥1 PIC (name, email). Mints AR No., links/creates accounts, audits, queues invitation mail. Returns `referenceNo`. |
| `GET /reports`                                                        | both       | Register. ADMIN: all rows with filters (`status`, `type`, `campus`, `term`, dates, `q`). PERSONNEL: only rows they are a PIC of.                      |
| `GET /reports/:id`                                                    | both       | Detail. PERSONNEL only when a PIC. Includes activity, pics, narrative, attachments, history, receipts.                                                |
| `PATCH /reports/:id`                                                  | ADMIN      | Edit activity fields and PIC list while not `APPROVED`; mails added/removed PICs; audits.                                                             |
| `DELETE /reports/:id`                                                 | ADMIN      | Only `DRAFT`; deletes rows + R2 objects; retires the AR No.; audits.                                                                                  |
| `PUT /reports/:id/narrative`                                          | PIC        | Save narrative draft + signature reference. Allowed in `DRAFT` and `RETURNED`.                                                                        |
| `POST /reports/:id/submit`                                            | PIC        | Validate and submit; `DRAFT                                                                                                                           | RETURNED → SUBMITTED`; sets `submitted_at` on first submission; mails admins. |
| `POST /reports/:id/decision`                                          | ADMIN      | `{ decision: 'APPROVE' \| 'RETURN', comments? }`; `SUBMITTED → APPROVED                                                                               | RETURNED`; approve renders receipts and mails them.                           |
| `POST /reports/:id/invitation`                                        | ADMIN      | Resend assignment mail to PICs (rate-limited).                                                                                                        |
| `GET /reports/:id/receipts`                                           | ADMIN, PIC | ADMIN: every receipt for the record. PIC: only their own.                                                                                             |
| `GET /reports/:id/receipts/:receiptId/file`                           | ADMIN, PIC | Streams the stored PDF after an access check; audit `RECEIPT_DOWNLOADED`.                                                                             |
| `GET /reports/:id/attachments/...`                                    | PIC        | Existing presign/confirm endpoints, re-gated to PIC membership.                                                                                       |
| `POST /me/signature`, `DELETE /me/signature`, `GET /me/signature/url` | all        | Existing profile signature routes, now reused by the PIC narrative.                                                                                   |
| `GET /me/inbox`, `GET /me/notifications`                              | both       | New section shape (§8).                                                                                                                               |
| `POST /auth/register`, `GET /auth/config`                             | public     | Domain gate removed; default role PERSONNEL; config no longer advertises domains.                                                                     |

Removed: `POST /reports/:id/validate` (validation runs inside create/submit), `POST /reports/:id/resubmit`, `POST /reports/:id/return`, `POST /reports/:id/endorse`, `POST /reports/:id/approve`, the `/review` and `/approval` queue routes, `/imports/*`, `GET /reports/:id/acknowledgement*`.

Implementation notes:

- `apps/api/src/app.ts` mounts `reportRoutes`, `receiptRoutes`, `attachmentRoutes`, `inboxRoutes`, `notificationRoutes`; the review/approval/import mounts go.
- New feature folder `apps/api/src/features/receipts/` replaces `features/acknowledgement/`, with `application/render-receipts.ts`, `application/store-receipt.ts`, `routes.ts`.
- Access lives in `apps/api/src/features/reports/domain/report-access.ts`: `canViewReport` accepts membership, `canEditActivity` requires ADMIN and `status !== 'APPROVED'`, `canWriteNarrative` requires PIC membership and `DRAFT|RETURNED`, `canDecide` requires ADMIN and `SUBMITTED`.
- Account provisioning for PICs sits in `apps/api/src/features/auth/application/provision-pic.ts`: lowercase email, find or create `PERSONNEL` with `PENDING_VERIFICATION`, hash a random unusable password, issue a verification token, link `report_pics.user_id`. Bootstrap admins keep their role.
- Idempotency keys stay on create and submit.

---

## 10. The acknowledgment receipt (OVPCASSS-F-013)

This is the most important artefact of the change. It must read as the office’s existing form, not as a system certificate.

### 10.1 Page content, verbatim

```
                                   ANNEX I
        [BSU letterhead wordmark]
        BUKIDNON STATE UNIVERSITY
        Malaybalay City, Bukidnon, 8700
        www.buksu.edu.ph
        OFFICE OF THE VICE PRESIDENT FOR CULTURE, ARTS, SPORTS AND
        STUDENT SERVICES

                                                       AR No. 0001

                          ACKNOWLEDGMENT RECEIPT

Dear <Name of Personnel In charge>,

This is to acknowledge the successful completion and compliance with all
requirements related to the off-campus activity conducted on <Date> at
<Location>.

We appreciate your diligent efforts in ensuring the smooth implementation of
the said activity <Title of the activity>. Your dedication and cooperation
contributed significantly to its success.

Please be informed that this acknowledgment receipt is issued in accordance
with the provisions of CHED Memorandum No.63, s. 2017.

Thank you once again for your invaluable contribution.

Done this <ordinal> day of <Month>, <Year> at Malaybalay City, Bukidnon.


Sincerely,


DR. LINCOLN V. TAN
VPCASSS

────────────────────────────────────────────────────────────────────────────
Document Code: OVPCASSS-F-013      Revision No: 0
Issue Date: March 18, 2025          Page 1 of 1
```

Substitutions:

- `<Name of Personnel In charge>` — the recipient’s full name from `report_pics.name`.
- `<Date>` — activity start date, or `21–23 October 2026` when `activity_end_date` differs.
- `<Location>` — `reports.location`.
- `<Title of the activity>` — `reports.title`.
- “off-campus” → “in-campus” when `reports.type === 'IN_CAMPUS'` (the only permitted wording change).
- `<ordinal> day of <Month>, <Year>` — approval date in `Asia/Manila`: `21st day of October, 2026`.
- `AR No. 0001` — `reports.reference_no`.
- The signatory is `RECEIPT_SIGNATORY_NAME` / `RECEIPT_SIGNATORY_TITLE` from Worker vars, defaulting to `DR. LINCOLN V. TAN` / `VPCASSS`.

Spelling is the document’s own: **ACKNOWLEDGMENT RECEIPT** (one “e”), “CHED Memorandum No.63” (no space), “Malaybalay City, Bukidnon.”, and the exact punctuation above. The generator must not paraphrase.

### 10.2 Layout and assets

- A4 portrait, single page, serif type matching the docx (Times family; `Times-Roman`/`Times-Bold` in pdf-lib), body 11 pt, letterhead as in the source.
- Letterhead images are **extracted from the docx** (`word/media/image1.jpeg`, `word/media/image2.jpeg`) and shipped as base64 constants in `packages/export/src/receipt/assets.ts`, so no bundler rule, network call, or filesystem read is needed inside the Worker.
- Footer line sits at the bottom margin with the document code, revision, issue date, and page count, exactly as printed.
- The document must remain legible in greyscale; no brand colours beyond the letterhead image.
- `AR No. 0001` sits at the upper right where the paper form has it.

### 10.3 Generation, storage, and delivery

- Generated **on approval**, once per PIC, from the approved record’s snapshot. Rendered PDFs are immutable: a later activity edit is impossible after `APPROVED`.
- Object keys: `receipts/<reportId>/<picId>.pdf`. Rows recorded in `receipts` with `generated_at` and `emailed_at`.
- Mail: one message per PIC, subject `AR No. 0001 — acknowledgment receipt`, PDF attached through `EmailAttachmentRef` (queued by reference, read from R2 by the consumer; note the 128 KB queue limit and the JPEG letterhead).
- In-app: the PIC and admins can download any receipt for the record from the detail screen. Each download audits `RECEIPT_DOWNLOADED`.
- Failure isolation: a rendering or mail failure never rolls back an approval; the record stays `APPROVED`, the failure is visible in the admin email log, and the receipt is rendered again on the next download or approval retry.
- The old `renderAcknowledgement` document, its route under `/acknowledgement`, and its signature-image dependency are deleted, not left dormant.

---

## 11. Email catalogue

All subjects lead with the reference. All sends go through the existing `notify()` → outbox → queue path, honour `WORKFLOW`/`REMINDER` preferences, and never block a transition.

| Kind                 | Trigger                          | Recipient               | Subject                                                | Content                                                                                                                                       |
| -------------------- | -------------------------------- | ----------------------- | ------------------------------------------------------ | --------------------------------------------------------------------------------------------------------------------------------------------- |
| `ASSIGNED`           | Record created, or PIC added     | Each PIC                | `AR No. 0001 — you are the personnel in charge`        | Activity title, type, date(s), location, office; the AR No.; one action “Open your dashboard”; “Create your account” when the account is new. |
| `SUBMITTED`          | PIC submits narrative            | All admins              | `AR No. 0001 — narrative report ready for review`      | PIC name, submission time, activity facts; “Open the review queue”.                                                                           |
| `NARRATIVE_RETURNED` | Admin returns                    | All PICs                | `AR No. 0001 — narrative report returned for revision` | The office’s comments verbatim; “Revise and resubmit”.                                                                                        |
| `RECEIPT_ISSUED`     | Admin approves                   | Each PIC                | `AR No. 0001 — acknowledgment receipt`                 | Receipt PDF attached; approval date; download link as fallback.                                                                               |
| `REMINDER`           | 7 days after creation, weekly ×3 | PICs without submission | `AR No. 0001 — narrative report still pending`         | How long it has been waiting; one action.                                                                                                     |
| `PIC_REMOVED`        | Admin removes a PIC              | Removed PIC             | `AR No. 0001 — removed as personnel in charge`         | Short, neutral notice; no record details beyond the AR No. and title.                                                                         |
| `VERIFY`             | Newly provisioned PIC account    | New account             | `Verify your OVPCASSS account`                         | Existing verification template; after verifying, the account lands on the PIC dashboard.                                                      |

Copy rules: formal institutional voice, no exclamation marks, no invented state names, and no claim that a receipt exists before it has been generated.

---

## 12. Web UI

### 12.1 Admin

- **Home `/`** — work queue first:
  1. “Awaiting your decision” — `SUBMITTED`, with counts and up to three rows.
  2. “With personnel in charge” — `DRAFT`, with an “Overdue” chip after 7 days and a “Resend invitation” action.
  3. “Returned” — `RETURNED`, with how long it has been back with the PIC.
  4. “Recently approved” — last five, each linking to its receipts.
- **Register `/reports`** — the AR No. is the first column, then activity, PIC (joined names), status, last updated. Filters: status, type, campus, term, dates, search. Row actions: open, edit details (until approved), delete (DRAFT only), resend invitation.
- **Create `/reports/new`** — the existing wizard with **three steps**:
  1. _Classification_ — activity type, classification, campus, college or unit, department, office, level (unchanged fields).
  2. _Activity_ — title, start date, end date, location, **number of activities**, SDGs.
  3. _People and hand-over_ — total students, total PIC, PIC rows (name and email required, phone optional), a summary block, and the primary action **Create and send**. The action mints the AR No.; a confirmation panel shows “AR No. 0001 — sent to 2 personnel in charge” and offers “Open record” and “Create another”.
  - No narrative field, no signature card, no attachments at creation.
  - Mobile/validation behaviour stays as today: red only after an attempt to continue, never on field focus.
- **Detail `/reports/[id]`** — activity summary, PIC list with add/remove (until approved), narrative and attachments read-only with the submitted signature, history rail, decision panel (Approve / Return with comments) only when `SUBMITTED`, receipts list when `APPROVED`. One filled navy primary action per screen: “Approve” on a submitted record, “Edit details” otherwise.
- **Navigation** — Queues tab replaced by **Reports** (the register) and a **New record** primary action. Review, Approval, and Import disappear from the nav, the palette, and the keyboard shortcuts.

### 12.2 Personnel in charge

- **Dashboard `/`** — only their assigned records. Columns: AR No., activity title, date(s), location, status. Primary action per row: **Write narrative** (`DRAFT`), **Revise and resubmit** (`RETURNED`), **View** (`SUBMITTED` / `APPROVED`). Approved rows offer **Download receipt**. Empty state: “No activities are assigned to you yet. The OVPCASSS office adds the personnel in charge for each activity.” No “New report” affordance anywhere.
- **Record `/reports/[id]`** — header repeats the AR No. and activity facts (read-only), then:
  - the office’s return comments in the maroon callout when `RETURNED`;
  - narrative editor (typing area, attachments, optional signature) while `DRAFT`/`RETURNED`;
  - Save draft (secondary) and Submit narrative (the single primary) actions;
  - after submission: read-only narrative, attachments, submission time and the submitting PIC’s name;
  - when `APPROVED`: receipt download with its issuance date.
- **Search** — the palette and `/search` are scoped; a PIC can only ever retrieve their own records. Copy refers to “AR No.”, not “tracking number”.
- **No admin surfaces** — users, reference data, audit, email log, exports, import are neither shown nor reachable, and the API refuses them regardless.

### 12.3 Shared

- Status map, filters, empty/error states, and table primitives come from `src/lib/components/` and `src/lib/status/report-status.ts`; no new status colour language: Returned stays maroon, Approved success, Submitted info, Draft neutral.
- `/how-it-works` is rewritten for the four-state, two-role flow, and its status-coverage test updated.
- The onboarding tour’s steps about “your first report” become “your first assignment” for PERSONNEL and “your first record” for ADMIN.
- Copy: “report” still names the artifact; “record” names the office register entry. Never “tracking number”.

---

## 13. Auth changes

- Remove the `ALLOWED_EMAIL_DOMAINS` gate from `register.ts`, `google.ts`, `GET /auth/config`, and the register form’s domain hint. `env.ts` and `wrangler.toml` drop the variable; the runbook stops listing it.
- New password accounts and first-time Google sign-ins are **`PERSONNEL`** with status `PENDING_VERIFICATION` (Google accounts are pre-verified by the provider).
- Verification stays required for password accounts. After verification (or immediately for Google), the account lands on the **PIC dashboard**, even if it has no assignments.
- `BOOTSTRAP_ADMIN_EMAILS` keeps working: those addresses become `ADMIN` on verification/sign-in.
- `requireRole` guards every admin route; no route may authorize by “not personnel”.
- Provisioned PIC accounts: created with an unusable random password, `PENDING_VERIFICATION`, and a verification mail. If the address already has an account, link it and send the assignment mail instead — never a second account, never a role change.

---

## 14. Printed report, monitoring exports, and removals

- **Printed report (facsimile)** — the header shows `AR No. 0001`; the activity block gains **Number of activities**; “Submitted by” carries the PIC who submitted plus their snapshotted signature and submission date; the decision block carries the deciding admin and approval date. Reviewer/endorsement blocks disappear. Watermarks keep their existing rules (`NOT_APPROVED` until approval).
- **Monitoring workbook** — values in the “Tracking Number” column become `AR No. 0001`; the source sheet’s 18 columns, header row, and print setup are unchanged (header label kept as the source file writes it). `Date Received` = `submitted_at`; `Date Completed` = `approved_at`. No new column for the activity count.
- **Import** — the screen, its routes, contracts, parsers, and tests are deleted. `packages/export/src/monitoring/reader.ts` and `imports` code go with it if nothing else reads workbooks.
- **Reminders** — the sweep stops looking for `SUBMITTED`/`ENDORSED` ages and instead selects `DRAFT` records older than 7 days with no submission, sending at most three reminders per record, tracked by the outbox’s `REMINDER` rows. The admin queue shows the same threshold as “Overdue”.
- **Acknowledgment removal** — `apps/api/src/features/acknowledgement/`, `packages/export/src/acknowledgement/`, `/reports/:id/acknowledgement`, and the approval-signature gate are removed in the same change, so no two receipt paths coexist.

---

## 15. Migration and data reset

Because the office chose to clear the data, this is a one-off reset plus a forward schema migration, not a data translation.

1. **Before deploy (dev and staging only):** announce the reset; stop the Worker cron.
2. **Clear report data:** delete rows from `report_sdgs`, `report_pics`, `report_comments`, `attachments`, `receipts`/`acknowledgements`, `reports`, `tracking_counters`, `idempotency_keys`, and delete the corresponding R2 objects under `reports/`, `acknowledgements/`, `signatures/reports/`. Users, sessions, notifications, email outbox, reference data, and `audit_events` are kept (audit is append-only; historical rows that point at cleared reports stay as history).
3. **Role rewrite:** `UPDATE users SET role='PERSONNEL' WHERE role IN ('SUBMITTER','REVIEWER','APPROVER');` — bootstrap addresses stay/promote to `ADMIN`.
4. **Schema:** generate the migration for §7 (drop `tracking_counters` and `acknowledgements`, create `reference_counters` and `receipts`, alter `reports` and `report_pics`), apply forward-only. `pnpm db:generate` must leave the migrations clean.
5. **Vars:** remove `ALLOWED_EMAIL_DOMAINS`; optionally set `RECEIPT_SIGNATORY_NAME`, `RECEIPT_SIGNATORY_TITLE`.
6. **Verify** the counter starts empty so the next created record is `AR No. 0001`.
7. **Runbook note:** record the reset and the role rewrite in `docs/runbooks/README.md` and the deploy checklist.

No hand-edited migration. No backfill. No dual-numbering period.

---

## 16. Files: create, change, retire

| Area    | Create                                                                                                                                                                                                                                                                           | Change                                                                                                                                                                                                                                                 | Retire                                                                                                                                                                                |
| ------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| shared  | `reference/reference-number.ts` (+ test)                                                                                                                                                                                                                                         | `domain/enums.ts`, `domain/roles.ts`, `workflow/state-machine.ts`, `contracts/reports.ts`, `contracts/inbox.ts`, `contracts/queues.ts`, `contracts/email.ts`, `validation/report.ts`                                                                   | `tracking/tracking-number.ts`, `contracts/imports.ts`                                                                                                                                 |
| db      | `schema/receipts.ts` (or extend `reports.ts`), `queries/receipts.ts`, reset script under `db/scripts/`                                                                                                                                                                           | `schema/reports.ts`, `schema/identity.ts` (role docs), `table-names.ts`                                                                                                                                                                                | `trackingCounters`, `acknowledgements` schema + queries, `schema` tests for them                                                                                                      |
| api     | `features/receipts/{routes.ts,application/render-receipts.ts,application/store-receipt.ts}`, `features/auth/application/provision-pic.ts`, `features/reports/application/record-create.ts`, `record-update.ts`, `narrative-save.ts`, `narrative-submit.ts`, `record-decision.ts` | `app.ts`, `features/reports/**`, `features/auth/**`, `features/inbox/application/build-inbox.ts`, `features/reminders/**`, `features/queues/**`, `middleware/auth.ts`, `env.ts`                                                                        | `features/acknowledgement/`, `features/review/`, `features/approval/`, `features/imports/`, `features/emails` import paths                                                            |
| export  | `receipt/pdf.ts`, `receipt/layout.ts`, `receipt/assets.ts`, `receipt/pdf.test.ts`                                                                                                                                                                                                | `facsimile/**` header/people blocks, `monitoring/columns.ts` (values only)                                                                                                                                                                             | `acknowledgement/`                                                                                                                                                                    |
| email   | `templates/narrative-events.ts` (assignment, submitted, returned, receipt), `templates/pic-events.ts` or one file if under limits                                                                                                                                                | `samples.ts`, `samples.test.ts`, `index.ts`                                                                                                                                                                                                            | endorsement/approval templates                                                                                                                                                        |
| web     | `lib/features/narrative/{application,presentation}/` (dashboard + editor), `lib/features/receipts/presentation/ReceiptList.svelte`                                                                                                                                               | `lib/navigation/navigation.ts` (+ test), `lib/status/report-status.ts` (+ test), `lib/api/client.ts`, `lib/palette/**`, `routes/+page.svelte`, `routes/reports/**`, `routes/how-it-works/**`, `routes/admin/users/**`, `routes/profile/**`, auth forms | `routes/review/**`, `routes/approval/**`, `routes/admin/import/**`, `lib/features/review/**`, `lib/features/approval/**`, `lib/features/reports/presentation/WizardStepReview.svelte` |
| desktop | —                                                                                                                                                                                                                                                                                | nothing shell-specific; deep links keep working through the SPA                                                                                                                                                                                        | —                                                                                                                                                                                     |
| docs    | this spec                                                                                                                                                                                                                                                                        | `par-paperless-spec.md` §7.5–§9, `email-integration-spec.md` (kinds), `ui/0*.md` acceptance lists, `architecture/folder-architecture.md` if a folder is renamed                                                                                        | `ui` sections for reviewer/approver queues where the phase file is otherwise untouched                                                                                                |

Respect the structure limits: no source file over 400 lines, at most 30 files per directory, four levels below `src/`, kebab-case, plural feature folders.

---

## 17. Testing

Unit (Vitest, beside source):

- `reference-number.test.ts`: padding, 9999→10000, parsing, invalid input.
- `state-machine.test.ts`: the four-state table, terminal `APPROVED`, no skipped states.
- `report-access.test.ts`: PIC membership, admin-only activity edits, delete limited to `DRAFT`, decide limited to `SUBMITTED`, own-narrative exception for ADMIN.
- `receipt/pdf.test.ts`: text extraction contains the exact docx sentences, the recipient name, the AR No., the activity date range, and the in-campus swap; letterhead images embedded; one page; greyscale legibility smoke (pixel sample optional).
- `wizard-validation.test.ts`: three steps, PIC email required, activity count ≥ 1, red only after “continue”.
- email template tests: subject starts with the reference; receipt attachment ref present; no approval mail without a stored receipt.

API integration (Workers pool, local D1/R2):

1. Admin creates a record → `AR No. 0001`, PIC account provisioned, assignment mail queued, audit event.
2. Second record → `AR No. 0002` even when the first is deleted, deleted numbers are never reissued.
3. PIC sees only their record; another PERSONNEL gets 404 on that id.
4. PIC saves a draft, reloads, sees it; submits; admin queue shows it.
5. PIC cannot `PATCH` activity, cannot create, cannot delete, cannot decide (403 each).
6. Admin returns → PIC revises → resubmits → admin approves.
7. Approval produces one receipt per PIC with the right names, mails them, and serves them only to authorized callers.
8. `APPROVED` rejects activity edits, PIC changes, narrative edits, and deletion.
9. Registration works from a non-university address, lands as PERSONNEL, verifies, and sees the empty dashboard.
10. Google first sign-in is PERSONNEL; bootstrap address is ADMIN.
11. Reminders fire at 7 days, at most three times, and never for records already submitted.

Component tests (`render` from `svelte/server`): admin queue sections, register columns, PIC dashboard empty state, narrative editor state per status, receipt list visibility.

Manual acceptance:

- Create a record with two PICs, sign in as one, write the narrative, submit; sign in as the other PIC and confirm read-only; approve; open both inboxes and the PDF.
- Print the receipt and compare it side by side with `OVPCASSS-F-013.ACKNOWLEDGMENT RECEIPT.docx` at 100%: same lines, same order, same footer.
- Open the receipt in a mail client as an attachment on Windows.
- `pnpm verify` green; `pnpm db:generate` clean; the desktop build unchanged.

---

## 18. Open questions and assumptions

Answered in the interview, recorded here so no later reader re-litigates them: who creates records, numbering scope, fate of the old numbers, decision path, role set, signatory, PIC provisioning, multiple PICs, statuses, locking, drafts, numbering moment, activity count meaning, attachment owner, receipt fidelity and assets, delivery, receipt date, existing data, reference format, approval gate, admin home, PIC home, reassignment, duplicate-email linking, delete rule, reminder cadence, mail subjects, in-campus wording, date range, date received, import retirement, queue screens.

Assumptions where the request did not decide:

- **A1.** Existing `audit_events` survive the reset even though the reports they mention no longer exist; the log stays append-only and is never rewritten.
- **A2.** Existing `SUBMITTER` accounts move to `PERSONNEL` like reviewers and approvers, since the submitter path no longer exists.
- **A3.** The monitoring workbook keeps its source header “Tracking Number” and simply carries `AR No. 0001` values; the 18-column layout is not changed.
- **A4.** The receipt footer is fixed text (`Revision No: 0`, `Issue Date: March 18, 2025`) and is not generated from the system clock.
- **A5.** “Done this … at Malaybalay City, Bukidnon.” is fixed, as printed on the form, for every activity type and location.
- **A6.** One receipt per PIC, generated at approval, never re-issued with a different recipient after the fact; a PIC added after approval is impossible because the PIC list locks at approval.
- **A7.** Total PIC is prefilled from the number of PIC rows but remains editable, with a non-blocking hint when the two disagree.
- **A8.** The PIC signature is optional; a missing signature leaves the printed line blank, exactly as in the signature spec.
- **A9.** Attachment rules are unchanged (allowlist, 25 MB each, private R2).
- **A10.** The office may promote a PERSONNEL account to ADMIN from `/admin/users`; demoting the last active admin is refused.
- **A11.** Email deliverability remains an operational dependency: `send.buksu.edu.ph` DNS records are still pending with university IT, so local and staging runs use `EMAIL_PROVIDER=console` and production sends resume when the domain verifies.
- **A12.** The receipt is the only PDF the PIC receives; the internal facsimile stays available to the office and is not mailed on approval.

Out of scope: multi-office routing, approval chains, per-college PIC pools, bulk CSV creation of records, digital signatures with certificates, retention automation, and any change to the desktop shell beyond the screens it already renders.

---

## 19. Acceptance checklist

- [ ] `ROLES` is exactly `ADMIN | PERSONNEL`; reviewer/approver/submitter surfaces are gone from nav, routes, contracts, and tests.
- [ ] Admin creates a record in three steps; all step 1–3 data is captured; no narrative field is shown to the admin.
- [ ] The first created record is `AR No. 0001`; the next is `AR No. 0002`; deletion leaves a permanent gap.
- [ ] At least one PIC with a valid email is required; each PIC receives their own assignment mail naming the AR No.
- [ ] A new PIC email gets a PERSONNEL account and a verification link; an existing account is linked, never duplicated or re-roled.
- [ ] The PIC dashboard lists only that person’s records, AR No. first, with no create/edit/delete affordances.
- [ ] The PIC can save a narrative draft, add attachments, sign optionally, submit, and see the submitted state read-only.
- [ ] A second PIC on the same record sees the same record, can act until the first submission, then read-only.
- [ ] The admin queue shows submitted narratives; approve and return both work; return comments reach the PICs.
- [ ] Approval produces one F-013 receipt per PIC, addressed by name, with the exact wording, letterhead, AR No., activity date range, approval date line, signatory, and footer.
- [ ] The receipt is emailed as a PDF attachment and downloadable by the PIC and the admin.
- [ ] `APPROVED` locks activity fields, PIC list, narrative, and deletion.
- [ ] Three-step validation only reddens after an attempt to continue.
- [ ] Registration from any email domain works, verification is still required, and the new account lands on the PIC dashboard.
- [ ] Bootstrap addresses are ADMIN; existing reviewer/approver accounts are PERSONNEL and active.
- [ ] Reminders fire at 7 days, weekly, at most three, and stop on submission.
- [ ] Monitoring workbook still has 18 columns and prints `AR No. 0001`; “Date received” is the narrative submission.
- [ ] `pnpm verify` passes; `pnpm db:generate` leaves migrations clean; the printed receipt matches the docx side by side.
