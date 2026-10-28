# OVPCASSS Paperless PAR System: Project Initialization Spec

Status: Draft v0.1, revised **2026-10-23** for the office-created-record flow.
Sources: `OVPCASSS-PAPERLESS_PROCESS_FOR_PAR.xlsx` / `.md`, the interview decisions recorded below, and `docs/spec/personnel-narrative-flow-spec.md`.

The personnel-narrative flow supersedes this document where they differ: the roles are `ADMIN` and `PERSONNEL`, the AR No. replaces the per-type tracking number, the office registers the activity and decides once on the submitted narrative, and the OVPCASSS-F-013 acknowledgment receipt replaces the old approval PDF. Sections 7.5–7.10, 8 and 9 below carry the revised contract; the summary, planning, and appendix material is kept as the original project record.

---

## 1. Purpose and scope

Replace the paper Post-Activity Report (PAR) process of OVPCASSS with a paperless system. The office registers the activity, the personnel in charge write and submit the narrative, the office decides, and the system issues the OVPCASSS-F-013 acknowledgment receipt, with storage, search, and an append-only audit trail (the 22-step process in the source file). It also produces the three monitoring sheets the office currently maintains by hand in Excel.

Delivery is a **hybrid**: one SvelteKit web app, also wrapped in **Tauri** as a Windows desktop app. The backend is **Cloudflare** (Workers + D1 + R2).

**In scope for v1**

- Account registration, role approval, sign-in
- PAR form (18 monitoring-sheet fields plus narrative and attachments)
- Workflow: register, assign, submit narrative, return, resubmit, approve, issue receipt
- Attachment upload and secure retrieval
- Search and retrieval of stored reports
- Excel export of the three monitoring sheets
- Admin management of users and reference data (campus, college, program, etc.)
- Email notifications
- Append-only audit trail
- Desktop app (local drafts, native file dialog, print)

**Out of scope for v1 (revisit later)**

- Multi-level approval chains (single approver only)
- Cryptographic PDF signing
- macOS/Linux desktop builds
- Pre-activity request/approval (the PAR system only handles _completed_ activities)
- SSO (Google/Microsoft)
- Malware scanning of uploads (flagged in section 14)

---

## 2. Decisions locked in during the interview

| Area               | Decision                                                                                        |
| ------------------ | ----------------------------------------------------------------------------------------------- |
| Frontend           | SvelteKit + TypeScript, `adapter-static` (SPA mode)                                             |
| Desktop            | Tauri, **Windows only for now**, other OSes later                                               |
| API                | Hono on Cloudflare Workers, REST, Zod validation                                                |
| Database           | Cloudflare D1 (SQLite) + Drizzle ORM                                                            |
| File storage       | Cloudflare R2 with signed URLs                                                                  |
| Auth               | Email + password, built in-app; Google sign-in where configured                                 |
| Account creation   | Self-registration open to any email; verification required; new accounts are `PERSONNEL`        |
| Roles              | Admin and Personnel in charge (`ADMIN`, `PERSONNEL`)                                            |
| Approval           | One office decision (approve or return) on the submitted narrative                              |
| Approval signature | Fixed VPCASSS block on the F-013 receipt; the PIC signature is snapshotted on the record        |
| Notifications      | Email (Cloudflare Email Service or Resend, behind an interface)                                 |
| Offline            | Drafts persist locally on both shells; submitting requires connectivity (no outbox queue in v1) |
| Sync conflicts     | Drafts are local-only until submitted; server wins once submitted                               |
| Reference number   | Global `AR No. 0001`, minted at admin creation, never reset or reused                           |
| Monitoring sheets  | System generates the three sheets as Excel exports                                              |
| Student data       | Counts only in form fields (names/IDs may still appear inside attachments)                      |
| Dropdowns          | Admin-editable at runtime, seeded from the source spreadsheet                                   |
| Attachments        | Any common file type, up to 25 MB each                                                          |
| Monorepo           | pnpm workspaces + Turborepo                                                                     |
| Environments       | Local, staging, production, plus a preview deployment per pull request                          |
| PAR form fields    | The office registers steps 1–3; the PIC writes the narrative and attachments                    |

---

## 3. Architecture overview

```
                 ┌───────────────────────────┐
                 │  apps/web (SvelteKit SPA) │  built once, shipped twice
                 └─────────────┬─────────────┘
              ┌────────────────┴─────────────────┐
              ▼                                   ▼
   Cloudflare Workers Static Assets        apps/desktop (Tauri, Windows)
   (web users, same origin as API)         bundles the same build output
              │                                   │  + local SQLite for drafts
              └───────────────┬───────────────────┘
                              ▼  HTTPS, JSON
                  ┌────────────────────────┐
                  │ apps/api (Hono Worker) │  /api/*
                  └──┬──────────┬───────┬──┘
                     │          │       │
                   D1 (Drizzle) R2    Queues ──► Email provider
                                (files)  (retries)
```

Principles:

1. **One UI codebase**, two shells. Anything that differs between web and desktop sits behind a small interface (`DraftStore`, `SecureTokenStore`, `FilePicker`) with a web and a Tauri implementation.
2. **API is the only door to data.** The client never talks to D1 or R2 directly, except for presigned R2 uploads and downloads that the API authorizes.
3. **Shared contracts.** Zod schemas in `packages/shared` are the single source of truth for request/response types, used by the API for validation and by the web app for forms and types.
4. **The server owns the workflow.** The state machine runs in the API. Clients only request transitions.

---

## 4. Repository layout

```
par-system/
├─ apps/
│  ├─ web/                  SvelteKit app (adapter-static, SPA fallback)
│  ├─ desktop/              Tauri shell (src-tauri/), consumes apps/web build
│  └─ api/                  Hono Worker (+ static assets binding for web in deploy)
├─ packages/
│  ├─ shared/               Zod schemas, enums, workflow state machine, constants
│  ├─ db/                   Drizzle schema, migrations, seed data, query helpers
│  ├─ email/                EmailProvider interface + Resend / Cloudflare adapters + templates
│  ├─ export/               Excel + PDF generation (pure functions, Worker-safe)
│  └─ config/               shared tsconfig, eslint, prettier
├─ docs/
│  ├─ spec/                 this spec and ADRs
│  └─ runbooks/             deploy, rollback, restore, key rotation
├─ .github/workflows/       CI (assumed GitHub Actions, see section 14)
├─ turbo.json
├─ pnpm-workspace.yaml
└─ package.json
```

Conventions (aligned with the codebase-health skills you installed):

- Files stay under ~400 lines; split by responsibility before that.
- Folders stay shallow (max 4 levels), at most ~10 files per folder before grouping.
- No `utils/` dumping ground; name modules by what they do (`tracking-number.ts`, not `helpers.ts`).
- Pure functions for workflow and validation logic; I/O at the edges (route handlers).

Tooling: Node 22 LTS, pnpm, Turborepo tasks `dev`, `build`, `lint`, `typecheck`, `test`, `db:generate`, `db:migrate`. Pin all dependency versions at scaffold time and verify current stable releases then (Svelte 5 / SvelteKit 2, Tauri 2, Hono 4, Drizzle, Zod).

---

## 5. Frontend (apps/web)

- SvelteKit with `adapter-static`, `ssr = false`, SPA fallback `index.html`. This is required so Tauri can load it from disk and Workers can serve it as static assets.
- Svelte 5 runes for state. Form handling with Zod schemas from `packages/shared` (e.g. Superforms or a small custom wrapper, to be decided at scaffold time).
- API access through one typed client module in `src/lib/api/`, with the base URL from config: relative `/api` on web, absolute URL on desktop.
- Styling: Tailwind CSS plus a small component set (shadcn-svelte or Bits UI). Must be keyboard accessible and usable on small laptop screens.
- Dates stored in UTC, displayed in `Asia/Manila`.

**Screens (v1)**

| Screen                                                                  | Roles                     |
| ----------------------------------------------------------------------- | ------------------------- |
| Register / Verify email / Sign in / Forgot password                     | public                    |
| Home: office queue, or the open register and the PIC's receipts         | all, scoped by role       |
| Record register (AR No., activity, PIC, status)                         | all                       |
| New record / edit details (three steps, PIC assignment)                 | Admin                     |
| Record detail, narrative editor, decision panel, receipts               | all with access           |
| Search and repository                                                   | all, scoped by membership |
| Monitoring sheet export (choose type, semester, SY)                     | Admin                     |
| Admin: users and roles                                                  | Admin                     |
| Admin: reference data (campuses, colleges, programs, SDGs, terms, etc.) | Admin                     |
| Profile: password, signature image                                      | all (signature optional)  |
| Audit log viewer                                                        | Admin                     |

---

## 6. Desktop (apps/desktop, Tauri)

- Tauri 2, Windows targets (NSIS or MSI installer; WebView2 runtime handled by the installer).
- `frontendDist` points to the `apps/web` build output; no separate UI code.
- **No local draft store:** the office registers a record on the server and the PIC saves the narrative server-side, so both shells resume from the API. The old local `DraftStore` was removed with the submitter flow.
- **Write behavior** (matches the "server wins once submitted" decision):
  - The admin's three-step form creates the record and mints its AR No. in one request. A failed save keeps the form and shows the standard error state; a retried save reuses its idempotency key.
  - The PIC saves a narrative draft, then submits it. A record returned for revision keeps the server's `version`; if the version differs on save, the API answers `409` and the client reloads the server copy rather than overwriting it.
- **Auth on desktop:** bearer session token kept in the OS credential store (Tauri keyring/stronghold plugin), not in webview storage.
- **API origin:** the API must allow the Tauri webview origins (`http://tauri.localhost` on Windows, `tauri://localhost` on macOS later) in CORS. Verify exact origins at scaffold time.
- Tauri security: minimal capabilities/permissions, strict CSP, no arbitrary filesystem access beyond the file dialog and the app data folder.
- **Auto-update:** Tauri updater plugin with signed releases; update manifest and installers hosted on R2 or GitHub Releases. Windows code signing certificate needed for production (see section 14).
- Later: macOS and Linux targets reuse the same shell; no design changes expected.

---

## 7. Backend (apps/api, Cloudflare)

### 7.1 Cloudflare resources

| Resource            | Use                                                                                                                    |
| ------------------- | ---------------------------------------------------------------------------------------------------------------------- |
| Worker (Hono)       | API under `/api/*`; also serves the web build via Static Assets so web and API share an origin (no CORS for web users) |
| D1                  | All relational data                                                                                                    |
| R2 bucket (private) | Attachments, signature images, F-013 receipt PDFs, the office facsimile, exports                                       |
| Queues              | Outbound email with retries and a dead-letter queue                                                                    |
| Cron Triggers       | Cleanup of expired sessions/tokens and orphaned uploads; optional D1 export to R2                                      |
| Secrets             | Email provider key, session/HMAC secrets, R2 S3 credentials for presigning                                             |

Separate D1/R2/Queue resources for **staging** and **production**. Preview deployments per PR bind to the staging resources (see section 12).

**2026-10-23, implementation note.** The browser app is served by Cloudflare Pages at `ovpcasss-par.pages.dev`; a Pages Function forwards `/api/*` to the Worker, so the browser still sees a single origin and the cookie and CSRF rules in §7.4 and §10 are unchanged. The Worker keeps its Static Assets as the rollback copy of the app. The proxy adds one hop, and it must be trusted explicitly: it presents a shared `PROXY_TOKEN` and forwards the browser's address, because §7.4's per-IP limits would otherwise see one proxy address for every user.

### 7.2 API conventions

- REST, JSON, versioned prefix `/api/v1`.
- Zod validation on every input; consistent error envelope `{ error: { code, message, details? } }`.
- Auth middleware resolves the session; role/permission middleware per route.
- Pagination (cursor or page/limit) on all list endpoints.
- Idempotency key support on create and submit, so a retried write cannot mint a second AR No. or a second submission.

### 7.3 Endpoint groups (initial)

| Group          | Endpoints (sketch)                                                                                                                                                                                  |
| -------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Auth           | `POST /auth/register`, `POST /auth/verify-email`, `POST /auth/login`, `POST /auth/logout`, `POST /auth/forgot-password`, `POST /auth/reset-password`, `GET /me`                                     |
| Users (admin)  | `GET /users`, `PATCH /users/:id/role`, `POST /users/:id/approve`, `POST /users/:id/disable`                                                                                                         |
| Reference data | `GET /ref/*` (all authenticated), `POST/PATCH/DELETE /ref/*` (admin)                                                                                                                                |
| Reports        | `POST /reports` (admin creates, mints AR No.), `GET /reports`, `GET /reports/:id`, `PATCH /reports/:id` (admin, until approved), `PATCH /reports/:id/completed-date` (admin, approved), `DELETE /reports/:id` (PENDING, or an archived record), `POST /reports/:id/invitation` |
| Narrative      | `PUT /reports/:id/narrative` (PIC draft), `POST /reports/:id/submit` (PIC, idempotent)                                                                                                              |
| Decision       | `POST /reports/:id/decision` (admin: `APPROVE` or `RETURN` with comments)                                                                                                                           |
| Attachments    | `POST /reports/:id/attachments/presign`, `POST /reports/:id/attachments/:aid/confirm`, `GET /reports/:id/attachments/:aid/url`, `DELETE ...` (PIC while the narrative is open)                      |
| Receipts       | `GET /reports/:id/receipts`, `GET /reports/:id/receipts/:receiptId/file` (F-013 PDF; admin or the named PIC), `GET /receipts` (the caller's own history)                                            |
| Search         | `GET /search/reports` with filters, scoped to the caller's records                                                                                                                                  |
| Exports        | `POST /exports/monitoring` (type, term) returning an `.xlsx`                                                                                                                                        |
| Audit          | `GET /audit` (admin), `GET /reports/:id/events` (timeline)                                                                                                                                          |
| Profile        | `PUT /me/signature`, `POST /me/password`                                                                                                                                                            |

### 7.4 Authentication details

- Registration is open to any email address; the university-domain limit was removed with the personnel-in-charge flow. Email verification is still required before a password account can sign in, and Google sign-in is allowed where configured.
- A new password account starts as **Personnel in charge** (`PERSONNEL`), `PENDING_VERIFICATION`; after verification it is `ACTIVE` and lands on its narrative dashboard. A first-time Google sign-in is `PERSONNEL` and already verified by the provider. `BOOTSTRAP_ADMIN_EMAILS` addresses become `ADMIN` on verification/sign-in, and an admin may promote another account from `/admin/users`; a role change takes effect immediately and never gates activation.
- **Password hashing:** Workers limit WebCrypto PBKDF2 iteration counts, so the choice is PBKDF2-SHA256 at the platform maximum, or scrypt/Argon2 via a WASM build. Decide at scaffold time and store the algorithm and parameters per hash so it can be upgraded on login.
- Sessions: random opaque tokens, stored **hashed** in D1 with expiry and last-seen. Web: `HttpOnly; Secure; SameSite=Lax` cookie. Desktop: bearer token from the OS credential store.
- Brute-force protection: per-IP and per-account rate limiting (Workers rate limiting binding or a D1 counter), short lockout, uniform error messages.
- Password policy: minimum length (12 recommended), common-password check, reset tokens single-use and short-lived.

### 7.5 Workflow state machine

Defined once in `packages/shared` as pure functions; the API enforces it, the UI reads it to show valid actions.

| State       | Meaning                                                     | Who acts next        |
| ----------- | ----------------------------------------------------------- | -------------------- |
| `DRAFT`     | The office registered the activity; narrative not submitted | PIC (or admin edits) |
| `SUBMITTED` | The narrative is in; the office review is pending           | Admin                |
| `RETURNED`  | The office sent it back with comments; the PIC may revise   | PIC                  |
| `APPROVED`  | Accepted; receipts issued; terminal                         | —                    |

Allowed transitions (summary):

```
DRAFT → SUBMITTED
SUBMITTED → RETURNED | APPROVED
RETURNED → SUBMITTED
APPROVED → (terminal)
```

Rules:

- The admin registers the activity and may edit its details and PIC list until `APPROVED`; an activity edit never touches the narrative or its attachments.
- Any PIC writes the narrative of a `PENDING` or `RETURNED` record; every signed-in account reads the register. Submitting a record the account was not listed on appends it to that record's PIC list, so approval issues its OVPCASSS-F-013. The office stands in for every role (spec §9).
- Deletion is allowed in `PENDING` only, and retires the AR No. without renumbering the register. _Amended 2026-10-27: the office may also delete an **archived** approved record. That deletion closes its gap — every later record moves down one number and the next record takes the freed one — and the confirmation asks whether the issued receipt PDFs are kept in storage or deleted with the record._
- A user cannot decide a narrative they submitted themselves. An ADMIN is the one exception: it stands in for the office and may decide its own record, which is recorded in the audit trail like any other decision.
- The PIC may attach a signature to a `DRAFT` or `RETURNED` record. It is optional, snapshotted at submission, and printed in the facsimile's "Submitted by" slot; later changes to the profile signature never alter a submitted record.
- Every transition writes an audit event and bumps `version`.
- `APPROVED` is terminal; it locks the activity fields, PIC list, narrative, and deletion.

### 7.6 Validation

- One Zod schema for the activity the admin registers (three wizard steps) and one for the PIC's narrative. Validation runs inside `POST /reports`, `PATCH /reports/:id`, and `POST /reports/:id/submit`; there is no separate validate endpoint.
- On create and edit: at least one SDG, at least one PIC with a name and email, activity count ≥ 1, and a complete activity block. The three-step UI reddens a field only after an attempt to continue, never on focus.
- On submit: the narrative is required; attachments must be in `CONFIRMED` state (uploaded and verified) to count, and the configured attachment rules still apply.

### 7.7 AR No. reference numbers

- Format: `AR No. ` followed by a zero-padded sequence of at least four digits — `AR No. 0001` … `AR No. 9999`, `AR No. 10000`. The full formatted string is stored on the record, so lists, detail, search, mail, PDFs, and exports never reformat it.
- One global sequence for the life of the system: no type prefix, no year component, never reset and never reused. A deleted draft leaves a permanent gap.
- _Amended 2026-10-27: deleting an archived record renumbers the records after it down one, and the counter follows the highest remaining number, so that deletion leaves no gap. AR Nos. already printed on a mailed receipt are superseded; the audit log keeps the old and new number for each moved record._
- Issued **at admin creation**, atomically with the counter increment, with a unique index on `reference_no`; `sequence` is stored beside it for ordering.
- Search accepts `0001`, `AR No. 0001`, and the punctuation-free `ar no 0001`.

### 7.8 Attachments

- Flow: client requests presign (filename, size, MIME) → API checks role, report state, size ≤ 25 MB, extension/MIME allowlist → returns presigned PUT URL (R2 S3-compatible API) with a server-chosen key like `reports/<reportId>/<uuid>` → client uploads directly to R2 → client calls `confirm` → API HEADs the object, verifies size/type, records checksum, marks `CONFIRMED`.
- "Any common type" is implemented as an **allowlist** of **PDFs and images** (JPEG, PNG, WebP, GIF). Office documents, plain text, CSV, archives, executables, and scripts are blocked. _Amended 2026-10-26: Word `.docx`/`.doc` and every other Office or archive type were removed at the office's request._
- Downloads: API checks the caller's access, then returns a short-lived presigned GET URL (minutes). Bucket is never public.
- Orphan cleanup: uploads never confirmed within 24 hours are deleted by a cron job.
- Attachments may contain student names (attendance sheets, photos), so they get the same access control as the report and are never exposed through public URLs.

### 7.9 Notifications

| Event                              | Recipient                             |
| ---------------------------------- | ------------------------------------- |
| Record created, or a PIC added     | Each PIC, naming the AR No.           |
| Narrative submitted                | All active admins                     |
| Narrative returned for revision    | Every PIC, with the office's comments |
| Approved, receipt ready            | Each PIC, with the F-013 PDF attached |
| Reminder (7 days, then weekly ×3)  | PICs with no submission               |
| PIC removed                        | The removed PIC                       |
| Email verification, password reset | The user                              |

- `EmailProvider` interface with adapters for Resend and Cloudflare Email Service; chosen by env var. Templates live in `packages/email`.
- Sends go through a Queue (retry with backoff, dead-letter queue, failed sends visible to admins). A failed email never blocks a workflow transition.

### 7.10 Acknowledgment receipt (OVPCASSS-F-013)

- On approval the system renders one **ACKNOWLEDGMENT RECEIPT** per PIC with `pdf-lib`, stores it privately in R2 at `receipts/<reportId>/<picId>.pdf`, records it in `receipts`, and mails it as a PDF attachment. The receipt is the exact facsimile of `docs/OVPCASSS-F-013.ACKNOWLEDGMENT RECEIPT.docx`: letterhead, wording, AR No., activity date or range, approval-date line, fixed VPCASSS signatory, and the document-code footer. Only the in-campus/off-campus phrase changes.
- The office facsimile PDF is an internal copy and is not mailed; it carries the watermark rules and the PIC's snapshotted signature.
- A render or mail failure never rolls back the approval: the record stays `APPROVED`, the failure is visible in the admin email log, and a later download re-renders the stored file.
- The PIC's signature is uploaded or drawn in the profile, validated (PNG/JPEG, size limit), stored privately in R2, and snapshotted onto the record at submission. The receipt itself is signed only by the fixed VPCASSS block.
- Approved records plus attachments remain in the repository; retention period is an open question.
- `GET /receipts` lists the caller's own issued receipts with their AR No. and activity title, so a PIC finds every form issued to them without opening each record. The list is scoped by the session, never by a client-supplied id.

### 7.11 Search and retrieval (step 20)

- Filters: AR No., title, type, classification, campus, college, department, office, level, SDG, status, date received, activity date, PIC name.
- Implementation: indexed columns plus SQLite FTS5 on title, narrative, PIC name, location. Every signed-in account retrieves the whole register (spec §5); a receipt is still disclosed only to its recipient.

### 7.12 Audit trail (step 21)

- `audit_events` is **append-only**: no update or delete code paths, enforced by repository functions and, where possible, D1 triggers that abort UPDATE/DELETE.
- Records: who, role, action, entity, before/after status, comment, timestamp (UTC), IP and user agent. Covers registrations, logins (success/fail), role changes, every report transition, attachment add/remove, exports, reference data edits.

### 7.13 Monitoring sheet exports

- Three exports matching the source workbook sheets: **Off-Campus**, **Educational Tour**, **In-Campus**, with the 18 columns in the same order and the title line "… MONITORING `<n>` SEMESTER, SY `<yyyy-yyyy>`".
- Export parameters: type, semester, school year. Includes approved reports (and optionally in-progress ones with "Date Completed" blank), a choice to confirm with the office.
- "Date Completed" is the office's own `completed_on` date when it has set one on the approved record, otherwise the approval date. Correcting it never rewrites `approved_at`, so the F-013 receipt and the facsimile keep the day they were decided.
- Library choice must work in Workers (e.g. SheetJS Community Edition or a lightweight writer); verify before committing. Alternative: generate in the browser from API JSON.

---

## 8. Data model (D1 via Drizzle)

All tables: `id` (ULID/UUID text), `created_at`, `updated_at` (UTC ISO text). Soft-delete (`deleted_at`) for reference data and users, never for audit events.

**Identity**

- `users`: email (unique, lowercase), password_hash, hash_params, full_name, role (`ADMIN|PERSONNEL`), status (`PENDING_VERIFICATION|ACTIVE|DISABLED`), campus_id, unit_id, contact_number, signature_object_key (nullable), email_verified_at
- `sessions`: token_hash, user_id, expires_at, last_seen_at, user_agent, ip
- `email_tokens`: user_id, kind (`VERIFY|RESET`), token_hash, expires_at, used_at

**Reference data** (seeded from the workbook's `dropdown` sheet, admin-editable)

- `ref_campuses` (MAIN, SATELLITE, plus the 15 named satellite campuses as units)
- `ref_units` with `kind` = `COLLEGE | GRADUATE_SCHOOL_GROUP | SATELLITE_CAMPUS | OTHER_UNIT` (see data notes below)
- `ref_programs`: code, name, unit_id (mapping to be supplied), level (`UNDERGRADUATE|GRADUATE|DOCTORATE|LAW`)
- `ref_departments`, `ref_offices` (no source lists exist; start empty or free-text with admin-managed list)
- `ref_sdgs`: 1-17 with titles (UN standard list; not in source file)
- `ref_terms`: school year, semester, start/end dates (drives "Semester, SY" in exports)
- `ref_attachment_requirements`: per activity type, label, min count, required flag

**Reports**

- `reports`: id, reference_no (unique, formatted `AR No. 0001`), sequence (integer for ordering), status, version, created_by_user_id, plus the monitoring-sheet fields:
  - `type` (`OFF_CAMPUS|EDUCATIONAL_TOUR|IN_CAMPUS`), classification (`CURRICULAR|NON_CURRICULAR`), campus_id, college/unit_id, department, office, level (`GRADUATE|UNDERGRADUATE`), title, activity dates (start/end), location, activity_count (number of activities), total_students, total_pic
  - narrative, date_received (= first submitted_at), date_completed (= completed_on, the office's own date, falling back to approved_at)
  - submitted_at, submitted_by_user_id, narrative_signature_key, narrative_signed_at, approved_at, approved_by_user_id, approval_signature_key, approval_signed_at
- `report_sdgs`: report_id, sdg_id (many-to-many, since a record can touch several SDGs)
- `report_pics`: report_id, user_id (linked account, nullable), name, email (both required), phone, sort_order, invited_at (more than one PIC per record; the sheet columns export as joined text)
- `report_comments`: report_id, author, body, kind (`RETURN|OFFICE_NOTE`), round, created_at
- `attachments`: report_id, label/category, original_name, object_key, size, mime, sha256, status (`PENDING|CONFIRMED|DELETED`), uploaded_by
- `reference_counters`: name (`'AR'`), last_seq (one global number sequence)
- `receipts`: report_id, recipient_pic_id, recipient_user_id, recipient_name, object_key (F-013 PDF), generated_at, emailed_at; unique `(report_id, recipient_pic_id)`

**Operations**

- `audit_events` (append-only, indexed by entity and time)
- `email_outbox`: kind, to, payload, status, attempts, last_error (visibility into queued/failed mail)
- `idempotency_keys`: key, user_id, request_hash, response (so a retried submit cannot duplicate a report)

Indexes: `reports(reference_no)` unique, `reports(status)`, `reports(created_by_user_id)`, `reports(submitted_at)`, `reports(activity_start_date)`, `report_pics(user_id)`, `receipts(recipient_user_id)`, FTS5 virtual table for search, `audit_events(entity_id, created_at)`.

### Data notes found in the source files (clean up during seeding)

1. The "Colleges" dropdown mixes real colleges with `DOCTORATE` and `MASTERS` (graduate groupings) and, separately, satellite campuses and other units (Secondary/Elementary Laboratory School, NSTP). Model these as `ref_units` with a `kind` rather than one flat list.
2. Programs list has inconsistencies: `BSBA-FM - major in Financial Management` is missing its degree name, and `Bachelor of Arts in Social Science` has no code. Trailing whitespace exists on several entries. Normalize on seed.
3. No program-to-college mapping exists in the file; one is needed for filtered dropdowns.
4. The monitoring sheets have **Department** and **Office** columns but no lists for them; and **Programs** exist as a list but no sheet column uses them. Decide where programs appear in the form (see section 14).
5. The In-Campus sheet's column is titled "Classification of Off Campus Activity" while the others say "Off / In Campus". Treat it as the same Curricular/Non-Curricular field and use one label.
6. **SDG** has no list in the file; use the 17 UN SDGs.

---

## 9. Roles and permissions

| Capability                                                   | ADMIN | PERSONNEL (listed PIC) | PERSONNEL (not listed) |
| ------------------------------------------------------------ | :---: | :--------------------: | :--------------------: |
| Register / sign in / verify / reset password                 |   ✓   |           ✓            |           ✓            |
| Create a record (mint AR No.)                                |   ✓   |                        |                        |
| Edit activity details and assign PICs (until approved)       |   ✓   |                        |                        |
| Delete a DRAFT record                                        |   ✓   |                        |                        |
| View a record                                                |   ✓   |       own only ✓       |                        |
| Write narrative, upload attachments, sign, submit / resubmit |       |           ✓            |                        |
| Approve or return a submitted narrative                      |   ✓   |                        |                        |
| Download own receipt                                         |   ✓   |           ✓            |                        |
| Resend invitation / reminder                                 |   ✓   |                        |                        |
| Manage users, reference data, audit, email log, exports      |   ✓   |                        |                        |

- One role per account in v1: `ADMIN` or `PERSONNEL`. Access to a record is membership in `report_pics.user_id`, never "a role can see everything".
- Admin stands in for the office (owner decision, 2026-10-20): it may create a record and make the one decision on a submitted narrative. An ADMIN may also be a PIC of a record; the record then appears in the register and on that account's PIC dashboard, and the account still decides as admin.
- A user can never decide a narrative they submitted themselves — except an ADMIN, which may decide its own record so one administrator account can exercise the whole flow (2026-10-22). The audit event names it as the actor.

---

## 10. Security and privacy

- Data Privacy Act of 2012 (RA 10173) applies: collect only what is needed, restrict access by role, log access to attachments, define retention and deletion, and designate a data protection contact for the system. Form fields hold student **counts** only, but attachments may include names, so they are treated as personal data.
- HTTPS everywhere, HSTS, strict CSP, secure cookies, CSRF protection for cookie-authenticated web requests (SameSite plus an anti-CSRF token or origin check on mutating requests).
- Secrets only in Wrangler secrets / CI secrets, never in the repo or the Tauri bundle.
- Rate limiting on auth and upload-presign endpoints.
- R2 bucket private; presigned URLs short-lived; object keys unguessable and never contain user-provided names.
- Input validation (Zod) at the edge; output encoding for user text; sanitize any rich-text narrative.
- Least-privilege API tokens for CI deploys.
- Backups: D1 Time Travel for point-in-time restore, plus a scheduled export to R2 as a second copy (verify restore in a runbook).

---

## 11. Testing strategy

| Level           | Tool                                                             | Focus                                                                    |
| --------------- | ---------------------------------------------------------------- | ------------------------------------------------------------------------ |
| Unit            | Vitest                                                           | state machine, tracking number logic, Zod schemas, export column mapping |
| API integration | Vitest with the Cloudflare Workers pool (Miniflare, local D1/R2) | auth flow, role enforcement, transitions, presign/confirm                |
| E2E (web)       | Playwright                                                       | register → approve role → submit → review → endorse → approve → export   |
| Desktop smoke   | Tauri build + WebDriver/Playwright against webview (basic)       | launch, sign in, draft survives restart, print preview                   |
| Migrations      | CI job applying all migrations to a fresh D1                     | no drift between Drizzle schema and migrations                           |

Acceptance anchor: every one of the 22 steps in the source process maps to at least one automated test.

---

## 12. Environments, CI/CD, and observability

| Environment      | Purpose                              | Resources                                                                           |
| ---------------- | ------------------------------------ | ----------------------------------------------------------------------------------- |
| Local            | Development                          | `wrangler dev` with local D1/R2/Queues emulation, SvelteKit dev server, `tauri dev` |
| Preview (per PR) | Review a change                      | Worker version/preview URL bound to **staging** resources; seed data from fixtures  |
| Staging          | Pre-release acceptance by the office | own D1, R2 bucket, Queue, secrets                                                   |
| Production       | Live                                 | own D1, R2 bucket, Queue, secrets, custom domain                                    |

CI (assumed GitHub Actions; adjust if you use something else):

- On PR: install (pnpm cache), `turbo run lint typecheck test build`, apply migrations to a scratch D1, deploy preview, post the URL on the PR.
- On merge to `main`: deploy to staging, run smoke tests.
- On release tag: run D1 migrations on production (reviewed step), deploy Worker, build and sign the Windows installer, publish updater manifest.
- Migrations are forward-only, reviewed, and applied before the Worker that needs them; destructive changes use expand/contract.

Observability: Workers Logs and `wrangler tail`, structured JSON logs without PII, error tracking (e.g. Sentry) optional, an uptime check on `/api/health`, and an admin view of failed emails.

---

## 13. Delivery plan

| Milestone              | Outcome                                                                                                                           |
| ---------------------- | --------------------------------------------------------------------------------------------------------------------------------- |
| M0 Scaffold            | Monorepo, tooling, CI, three empty apps building; "hello" deployed to staging; Tauri window loads the web build and calls the API |
| M1 Identity            | Register, verify email, sign in, admin role approval, sessions, audit events for auth                                             |
| M2 Reference data      | Drizzle schema + seed from the workbook, admin CRUD for dropdowns, terms, SDGs                                                    |
| M3 PAR form            | Draft create/edit, validation, attachments (presign/confirm), submit with tracking number                                         |
| M4 Review and approval | Queues, return/endorse/approve, comments, signature, acknowledgement PDF, notifications                                           |
| M5 Repository          | Search, filters, report timeline, audit viewer                                                                                    |
| M6 Monitoring exports  | Three Excel exports matching the source sheets                                                                                    |
| M7 Desktop shell       | `DraftStore` on SQLite, OS credential store, file dialog, print in the webview, installer, signed auto-update                     |
| M8 Hardening and pilot | Security review, load test, backups/restore drill, runbooks, pilot with OVPCASSS                                                  |

**M0 definition of done:** `pnpm install && pnpm dev` starts web + API locally; `pnpm build` produces the web build, Worker bundle and a Windows Tauri installer; CI is green on a trivial PR with a preview URL; staging deploy works.

---

## 14. Open questions and assumptions

The role set, numbering scheme, decision path, queues, data reset, and receipt format raised here were settled by `docs/spec/personnel-narrative-flow-spec.md` §18; its answers replace the earlier questions below.

Open (need an answer before or during the milestone shown):

1. **Where do "completed activities" come from (step 2)?** Is there an existing activity request system/list, or does the Submitter create the activity as part of the PAR? Assumed: the Submitter creates/selects an activity record inside this system. (M3)
2. **What are the required attachments** per activity type (e.g. attendance sheet, photos, narrative, certificates, financial liquidation)? (M3)
3. **Official PAR form content:** beyond the 18 columns plus narrative, are there signature blocks, evaluation results, expenses, or recommendations? (M3)
4. **Programs:** where do they appear in the form (participants' programs? a Department substitute?) and what is the program-to-college mapping? (M2)
5. **Department and Office lists:** provide them, or keep as admin-managed free text. (M2)
6. **Tracking number year:** calendar year or school year? Is the sequence per type (assumed) or shared? (M3)
7. **Semester / school year rules:** term start/end dates, and whether an activity belongs to the term of its activity date (assumed) or its submission date. (M6)
8. **Reviewer and Approver assignment:** all Reviewers see all reports (assumed). Should reports be routed by college/campus, or should there be a single named Approver? (M4)
9. **Allowed email domain(s)** for registration, and whether satellite campuses use a different domain. (M1)
10. **Retention policy** for approved reports and attachments, and who may request deletion. (M8)
11. **Malware scanning of uploads:** Cloudflare R2 has no built-in scanner. Options: accept the risk with an allowlist and download-only (assumed), or add an external scanning service. (M8)
12. **Windows code-signing certificate:** needed to avoid SmartScreen warnings; who procures and holds it? (M7)
13. **Custom domain** and DNS ownership for production. (M0)
14. **Hosting split:** one Worker serving both API and web assets (assumed) vs. separate deployments. (M0)
15. **Email sender:** pick Resend vs. Cloudflare Email Service for launch (interface supports both), and the sending domain with SPF/DKIM. (M1)

Assumptions made where unanswered:

- CI is GitHub Actions.
- Single role per user; Admin cannot act as Reviewer/Approver unless given that role.
- English-only UI; times shown in Asia/Manila.
- Report volume is modest (hundreds to low thousands per year); D1 and a single Worker comfortably cover it.
- Cloudflare product details (Email Service availability, Queues/Rate Limiting bindings, D1 limits, PBKDF2 iteration cap) must be re-verified against current Cloudflare documentation at scaffold time.

---

## 15. Appendix: source process → system mapping

| Step(s) | System behavior                                           | Section    |
| ------- | --------------------------------------------------------- | ---------- |
| 1       | Sign in                                                   | 7.4        |
| 2       | Select completed activity                                 | 14 (Q1), 8 |
| 3-4     | Fill form, upload attachments                             | 5, 7.8     |
| 5-6     | Completeness validation, return to user                   | 7.6        |
| 7-8     | Submit; tracking number, timestamp                        | 7.5, 7.7   |
| 9       | Notify reviewers                                          | 7.9        |
| 10-13   | Review, return with comments, revise, resubmit, re-review | 7.5        |
| 14      | Endorse to approver                                       | 7.5        |
| 15-16   | Approve or return                                         | 7.5        |
| 17-18   | Record approval, generate acknowledgement                 | 7.10       |
| 19      | Store report and files                                    | 7.8, 7.10  |
| 20      | Search and retrieve                                       | 7.11       |
| 21      | Audit trail                                               | 7.12       |
| 22      | End on approval + storage                                 | 7.5        |
