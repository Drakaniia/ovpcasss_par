# Spec — Signatures in the flow, admin self-review, and a working home inbox

**Status:** proposed (2026-10-22)
**Routes touched:** `/login`, `/register`, `/reports/new`, `/reports/[id]/edit`, `/profile`, `/`, `/review`, `/review/[id]`, `/approval`, `/approval/[id]`, facsimile and print preview
**Packages touched:** `apps/web`, `apps/api`, `apps/desktop`, `packages/shared`, `packages/db`, `packages/export`
**Source of truth:** `docs/spec/par-paperless-spec.md` §7.3, §7.5, §7.10, §7.14, §8.1, §9; `docs/spec/ui/02-work-inbox.md`, `06-create-wizard.md`, `08-facsimile.md`, `09-queues-and-decisions.md`, `01-auth-and-account.md`

---

## 0. Request in one line, split into four workstreams

| #   | Ask                                                                                                                                                | Outcome                                                                                                                                                                                                                                          |
| --- | -------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| W1  | “Remove or hide the cmd that briefly shows when I click Google sign in on the auth pages.”                                                         | The Windows desktop shell opens the browser with no console window, on every Google sign-in attempt.                                                                                                                                             |
| W2  | “Signature can sign signature… add to the flow so a submitter can add a signature that is included in the portfolio/print for the submitter.”      | A submitter can draw a signature or upload an image whose background is removed automatically, while authoring or resubmitting a report; it is snapshotted onto the report and printed with transparency in the facsimile’s “Submitted by” slot. |
| W3  | “Admin can still approve and review the request, even their own report, so they can test the full flow.”                                           | Admin may decide a report it submitted; it is marked “Your report” wherever a decision is offered.                                                                                                                                               |
| W4  | “In the approver/reviewer home page it did not show the list of reports to review or approve — improve the home page of all roles (apple-design).” | The inbox endpoint returns real sections; the home page gets a calmer, role-aware hierarchy with subtle motion.                                                                                                                                  |

The four ship together in one implementation pass, **W1 first** (smallest, isolated), then W2/W3 (workflow), then W4 (client + server assembly).

---

## 1. Verified findings (why each ask is real)

1. **Desktop console flash.** `google_sign_in` launches the browser with
   `Command::new("cmd").arg("/C").raw_arg("start \"\" \"{url}\"")`
   (`apps/desktop/src-tauri/src/lib.rs`). The parent is a GUI-subsystem binary
   (`main.rs`: `windows_subsystem = "windows"` in release), so Windows allocates a
   console for the child `cmd.exe` and the window flashes. `CREATE_NO_WINDOW` is
   not set anywhere in the shell.
2. **The home inbox is still an M1 stub.** `buildInbox`
   (`apps/api/src/features/inbox/application/build-inbox.ts`) hard-codes
   `returned`, `review`, `approval`, `drafts`, `waiting` to `EMPTY_SECTION`,
   `activity` to `[]`, and `hasSubmitted: false`. The client is correct — it just
   receives zeros, so every role’s “Needs your action” block disappears.
3. **Signature capture exists in the UI but has no backend.** `/profile` renders
   `SignatureUpload` for `APPROVER` only (`apps/web/src/routes/profile/+page.svelte`),
   and the client calls `PUT /me/signature`, `DELETE /me/signature`,
   `GET /me/signature/url` (`apps/web/src/lib/api/client.ts`). No such routes exist
   (`apps/api/src/features/profile/routes.ts` states they are “deliberately absent”),
   and `signatureUploadSchema` / `signatureStateSchema` / `signatureUrlSchema` are
   authored but never imported by the API.
   Consequence: `hasSignature` is permanently `false` (`apps/api/src/lib/user-view.ts`),
   so the approval drawer’s signature gate
   (`decision-controller.svelte.ts` → `signatureMissing`) blocks every approval.
   **W2 therefore also unblocks the approval flow.**
4. **Separation of duties is enforced twice.** Server:
   `canDecide` in `apps/api/src/features/reports/domain/report-access.ts` returns
   `viewer.userId !== ownerUserId`, used by
   `apps/api/src/features/reports/application/decision-request.ts`. Client:
   `decisionAvailability` in `apps/web/src/lib/features/queues/application/queue-decisions.ts`
   both blocks the own report and requires an exact role match
   (`viewer.role !== REQUIRED_ROLE[kind]`), so an ADMIN never even sees decision
   buttons despite `actsAs` and the queue API allowing them.
5. **Queues already include the caller’s own reports.** `report-read.ts#queue`
   filters only by queue status and facets, with no owner exclusion — so once W3
   lands, an admin’s own report is already in its queue and only the guards need
   to change.
6. **The home page contract is sound; the payload is not.** `InboxResponse`,
   `inboxSectionsFor`, `WorkInbox`, and the phase-02 acceptance checklist all
   assume real totals. No client rewrite is needed to fix the “missing list” bug.

---

## 2. Decisions made in the interview

| Topic                                | Decision                                                                                         |
| ------------------------------------ | ------------------------------------------------------------------------------------------------ |
| Where the cmd flash appears          | Windows desktop app (Tauri)                                                                      |
| “Signature can sign signature”       | Each signer gets their own signed slot; signatures stack as separate slots in one block          |
| Admin self-decision                  | `ADMIN` only, always allowed; every other role keeps separation of duties                        |
| Home scope                           | Fix the payload, then refine with apple-design within the phase-02 contract                      |
| Where a submitter signs              | In the report wizard, before submit (step 4, review step)                                        |
| “The port”                           | Facsimile / printed report PDF                                                                   |
| Which slots carry an image           | Submitter + approver; reviewer stays name + date                                                 |
| Signature storage                    | Snapshot onto the report at signing; later profile edits never change a signed report            |
| Admin’s own reports in queues/home   | Show them, marked as own                                                                         |
| Signature required to submit         | No — optional                                                                                    |
| Who can manage a profile signature   | Everyone (SUBMITTER, REVIEWER, APPROVER, ADMIN)                                                  |
| Existing reports                     | New submissions only; a returned report may optionally gain a signature on resubmission          |
| Wizard placement                     | A card on the existing step 4 (review/submit), not a new step                                    |
| Spec documents                       | Update them as part of the implementation                                                        |
| Admin signs twice (submit + approve) | Reuse the same profile image; no second signing action                                           |
| Uploaded signature background        | Removed automatically in the browser before upload, so no white box prints on the paper          |
| Removal safety                       | Only when the image really is ink on a light background; otherwise keep it and say so            |
| Margins                              | Transparent margins trimmed with a small padding, so the signature fills its slot                |
| Where removal runs                   | Client canvas, no dependency and no external service                                             |
| Home content additions               | Queue cards (counts + rows), at-a-glance stat row, recently decided by you, notifications digest |
| Wizard prefill                       | Prefill from profile with inline Replace; otherwise draw/upload                                  |
| Motion                               | Subtle entrance + interaction, honoring reduced motion                                           |
| Report signature audit               | No separate event; the submission/resubmission event covers it                                   |
| Acknowledgement PDF                  | Unchanged — approver signature only                                                              |
| Signing a returned report            | Optional on resubmission                                                                         |
| Own-report marker surfaces           | Queues, inbox rows, report detail                                                                |
| Delivery order                       | All four in one batch, cmd flash first                                                           |

---

## 3. W1 — Desktop Google sign-in must not flash a console window

### 3.1 Required behavior

- Clicking **Sign in with Google** in the packaged Windows app opens the default
  browser without any visible console, shell, or flash — first click and retries.
- The loopback callback, nonce check, 180 s timeout, Cancel button, token write to
  the credential store, and the “Waiting for your browser…” busy state are
  unchanged.
- The web build’s plain `<a href="/auth/google">` path is untouched.
- No new dependency, no CSP change, no change to which browser opens.

### 3.2 Approach

In `google_sign_in` (`apps/desktop/src-tauri/src/lib.rs`), spawn the browser
launch with the console suppressed:

- Keep `cmd /C start "" "<url>"` (it correctly handles the default browser and
  URL quoting), and add `.creation_flags(0x0800_0000)` (`CREATE_NO_WINDOW`).
  `std::os::windows::process::CommandExt` is already imported.
- Define the constant next to the command with a comment explaining the flash.
- Do not switch to `explorer.exe`, because it returns immediately with no way to
  surface “could not open the browser”; the existing `spawn()` error path stays.
- The launcher only ever receives the URL built from `API_BASE_URL` plus the
  loopback port and nonce; no new argument surface.

### 3.3 Edge cases

- Non-Windows desktop targets are out of scope for v1 (the shell already uses
  Windows-only APIs such as `dwm` and `explorer`).
- The command still returns a `Result`; a failure to spawn still surfaces the
  existing “Could not open the browser” message in the auth form.
- Repeated clicks stay guarded by `busy` in `GoogleSignIn.svelte`.

### 3.4 Verification

- `cargo check` (or `pnpm --filter @par/desktop build`) on Windows.
- Manual, release build: sign out, click Google sign-in five times, watch for any
  window flash; confirm the browser opens and the callback completes.
- Confirm the web path at `localhost:5173/login` is unchanged.

### 3.5 Acceptance

- [ ] No console window appears at any point in a packaged Windows Google sign-in.
- [ ] Sign-in still completes, cancels, times out, and reports errors as today.
- [ ] No new Rust dependency and no CSP change.

---

## 4. W2 — A signature that travels with the report

### 4.1 Current gaps to close

| Gap                                                     | File                                                                            |
| ------------------------------------------------------- | ------------------------------------------------------------------------------- |
| `/me/signature` PUT/DELETE/URL routes do not exist      | `apps/api/src/features/profile/routes.ts`                                       |
| Profile card is `APPROVER`-only                         | `apps/web/src/routes/profile/+page.svelte`                                      |
| No report-level signature columns, routes, or contracts | `packages/db/src/schema/reports.ts`, `packages/shared/src/contracts/reports.ts` |
| Facsimile “Submitted by” slot has no image              | `facsimile-people.ts`, `SignatureBlock.svelte`                                  |
| Wizard step 4 has no signature capture                  | `WizardStepReview.svelte`                                                       |
| Approval gate can never pass                            | `decision-controller.svelte.ts`, `user-view.ts`                                 |

### 4.2 Data model (expand-only, generated)

Add to `reports` in `packages/db/src/schema/reports.ts`:

```
submitterSignatureKey TEXT      -- R2 object key of the snapshotted image
submitterSignedAt     TEXT      -- ISO UTC; set when the image is attached
```

- Migration via `pnpm db:generate`; never hand-edited.
- Both nullable: existing rows stay unsigned (decision: new submissions only).
- No new table, no backfill, no destructive change.
- The report keeps its own copy. Replacing the profile signature later never
  changes a report that is already signed.

### 4.3 Shared contracts (`packages/shared`)

- `reportSubmitterSignatureSchema`:
  `{ signerName: string; signedAt: isoDateTime; signatureUrl?: string }`.
- `ReportDetail` gains `submitterSignature: reportSubmitterSignatureSchema | null`.
  Naming stays distinct from the existing `approval` (approver) block.
- Signature write input:
  `reportSignatureSchema = z.union([signatureUploadSchema, z.object({ fromProfile: z.literal(true) })])`
  so the client can either send a data URL or ask the server to snapshot the
  profile image. Reuses `SIGNATURE_IMAGE_TYPES` and `SIGNATURE_MAX_BYTES` (2 MB).
- `reportDetailSchema` additions are optional/nullable so old payloads still parse.
- `AuditAction` already contains `SIGNATURE_UPDATED` / `SIGNATURE_REMOVED` for the
  profile card; no new action is needed for report signatures.

### 4.4 API

**Profile signature (now for every signed-in role):**

- `PUT /me/signature` — body `signatureUploadSchema`; validates data URL prefix,
  MIME (`image/png`, `image/jpeg`), decoded size ≤ 2 MB; stores the bytes in R2 at
  `signatures/<userId>/<uuid>` (server-chosen key, never a user filename); writes
  `users.signature_object_key`; returns `SignatureState`; deletes the previous
  object after a successful write; rate-limited like other uploads.
- `DELETE /me/signature` — removes the row value and the object; returns
  `SignatureState`.
- `GET /me/signature/url` — short-lived signed URL for the caller’s own image;
  `404` when none is on file (the client already treats 404 as “first case”).
- Audit: keep the existing `SIGNATURE_UPDATED` / `SIGNATURE_REMOVED` events for
  the profile card (already in the allowlist). No PII beyond the actor id.

**Report signature:**

- `PUT /reports/:id/signature` — owner-only, editable statuses only
  (`DRAFT`, `RETURNED_BY_REVIEWER`, `RETURNED_BY_APPROVER`), same `canEditReport`
  guard the attachment routes use. Accepts an inline data URL or
  `{ fromProfile: true }`; on `fromProfile`, copy the profile object bytes into a
  new report-scoped key `reports/<reportId>/signature-<uuid>`; set
  `submitter_signature_key` and `submitter_signed_at`; return the detail payload.
- `DELETE /reports/:id/signature` — clears both columns and the object; same guard.
- Rate-limit both, validate before storing, and never accept a client-chosen key.
- **No separate audit event** for the report signature (interview decision); the
  submit/resubmit audit event already records the transition.
- Approval semantics: the approver image stays whatever
  `users.signature_object_key` holds at approval time (existing behaviour, now
  actually usable). Admins approving their own report naturally reuse the same
  image in both slots.
- `GET /reports/:id` (detail) resolves `submitterSignature.signatureUrl` through
  `env.BUCKET` only when the caller may view the report; the raw key is never
  returned, and the object is not publicly reachable.

### 4.5 Web — capture in the flow

**Wizard step 4 (`WizardStepReview.svelte`) and edit-returned (`ReportEditor.svelte`):**

- New card **“Your signature”**, placed after attachments and before the
  completeness/review summary, so the acknowledgment tick remains the last thing
  before Submit.
- States:
  - No signature yet → `SignatureCapture` (existing Draw/Upload tabs) + hint
    “Optional. Your signature is printed on the report under Submitted by.”
  - Profile has one → preview at 240 px, actions **Use my signature on file**
    (calls the API with `fromProfile`), **Replace** (inline draw/upload), **Remove**.
  - Report already signed → preview plus **Replace** / **Remove**, with a note
    that the report keeps the image it was signed with.
- Saving is immediate (like attachments) so it survives navigation, draft reload,
  and a failed submit. Submit itself never blocks on a missing signature.
- Resubmission offers the same card; a report signed before the return keeps its
  image unless replaced.
- One filled navy primary per screen is unchanged: the signature card’s buttons
  are outline/ghost.

**Profile (`/profile`):**

- Signature card moves out from behind `user.role === 'APPROVER'` to every role.
- Copy changes from “appears on approved acknowledgements” to also mention that
  it is offered while authoring a report. Existing Draw/Upload preview, Replace,
  Remove-with-confirm, and `hasSignature` refresh stay.
- Remove-confirm copy must stop claiming only acknowledgements are blocked; it
  should say the image is also no longer offered when signing a report.

### 4.5.1 Uploaded signature: automatic background removal and trim

The Upload tab must produce ink on transparent paper, not a photograph of paper.
A phone photo or a scanned sheet scans as a white or grey rectangle that would
print as a visible box on the facsimile’s cream paper, so removal happens in the
browser before the image ever reaches the API.

**Pipeline** — new `signature-background.ts` beside `signature-image.ts`, called
from `readSignatureFile` so the profile card and the wizard card behave alike:

1. Decode with `createImageBitmap(file, { imageOrientation: 'from-image' })`; fall
   back to `new Image()` + `decode()` where the bitmap API is missing. Photo
   orientation must be honoured so a portrait scan is not printed sideways.
2. Draw to an offscreen canvas, scaled so the long edge is at most 1200 px
   (crisp at the printed slot size, bounded CPU and memory).
3. Estimate the background from the 1 px border ring: median luminance and
   chroma. If the border is dark (luma < 0.55) or strongly coloured (chroma
   > 0.35), the image is not ink on light paper — return it unchanged and flag
   > `autoSkipped`, rather than erasing a white or coloured signature.
4. Build an alpha mask from RGB distance to the estimated background colour:
   `alpha = clamp((distance − 24) / (72 − 24), 0, 1)` on 0–255 Euclidean distance.
   Background becomes fully transparent, ink stays fully opaque, and the 24–72
   band keeps edge pixels partially transparent so the stroke keeps its
   anti-aliasing. Ink colour is preserved; the image is not posterised.
5. Trim: bounding box of pixels with alpha > 8, padded by 4% of the long edge,
   then crop. Nothing to trim leaves the image untouched.
6. If no ink remains (all transparent), reject with “That image looks blank. Try
   another photo or draw the signature.” instead of uploading an empty PNG.
7. Encode `image/png`, check decoded bytes against `SIGNATURE_MAX_BYTES`; if it is
   over, re-run once at 800 px long edge, then reject with the existing limit
   message. Never send a JPEG after processing, because JPEG has no alpha.

**Interaction:**

- Processing is automatic on file pick; there is no toggle to remember.
- The Upload tab shows the processed result on a checkerboard preview surface
  (new `--signature-checker` token pair in `tokens.css`; no raw hex in components)
  so transparency is visible rather than implied.
- A line under the preview reports what happened: “Background removed” or
  “Background kept — this image is not dark ink on a light background.”
- A ghost action **Use original** restores the untouched upload if the automatic
  result is wrong; it only exists while a fresh upload is pending.
- Drawn signatures are already transparent (`SignatureCanvas` never fills the
  canvas) and skip the pipeline entirely.

**Constraints:**

- No new dependency, no Worker-side image work, no external removal service, no
  ML matting. The same PNG is stored by both signature endpoints, so the
  facsimile, the print dialog, and a future acknowledgement render all get the
  transparency for free.
- Stored pixels are exactly what the user approved in the preview; the API does
  not re-encode.

### 4.6 Web — facsimile and print

- `facsimile-people.ts#signatureBlock` gains `submitterSignatureUrl?` from
  `detail.submitterSignature?.signatureUrl`.
- `SignatureBlock.svelte`: above the submitter name, render the image when
  present (max height ~56 px, transparent background, contain) with
  `alt="Signature of <name>"`; otherwise keep the ruled line.
- Two slots stay side by side on wide paper and stack on narrow print widths.
- The submitter slot prints name + submission date as today, plus the image.
- Print preview and the browser print path show the image; `@media print` keeps
  the `break-inside: avoid` on the block.
- A missing image is never an error and never a placeholder icon.
- Acknowledgement PDF (`packages/export`, `render-acknowledgement.ts`) is **not**
  changed: approver signature only.

### 4.7 Accessibility and voice

- Images carry meaningful alt text or are decorative when the name is adjacent;
  the canvas is keyboard-operable via its existing implementation.
- Formal voice, no exclamation marks, no motivational copy.
- Status of a save is announced (`toast` + inline text), not color-only.

### 4.8 Tests

- Shared: `reportSignatureSchema` accepts data URL and `fromProfile`, rejects
  oversized and non-image data.
- API: PUT/DELETE profile signature (valid, invalid, unauthenticated, replace,
  remove-then-404); report signature (owner allowed, non-owner 403, wrong status
  403, invalid image 400, fromProfile with none on file 409/400); detail exposes
  a URL only to viewers.
- Web (server render): step 4 renders the card in each state; facsimile
  `SignatureBlock` shows the image, falls back to the line, and prints name/date.
- Existing approval-gate test updated: once `hasSignature` is true, approve is
  enabled.
- Signature processing (pure functions, no DOM): background estimate for a light
  sheet, a dark sheet (skip), and a coloured stamp (skip); alpha 0 at the
  background colour, 255 at ink, partial in the edge band; trim bounds and 4% padding;
  all-transparent mask rejected; already-transparent PNG left unchanged.

### 4.9 Acceptance

- [ ] A submitter with no signature can submit; the facsimile shows name + line.
- [ ] A submitter who signs sees the image in the facsimile and print preview.
- [ ] Changing the profile signature afterwards leaves the report’s image as signed.
- [ ] A report submitted before this change prints without an image and without
      an error.
- [ ] Every role can manage a profile signature.
- [ ] An approver with a signature can approve; one without is blocked with the
      existing `/profile` link.
- [ ] An uploaded photo of a signature on white paper prints with no white box
      on the facsimile, in both screen and print preview.
- [ ] A white signature on a dark scan, or a strongly coloured image, is kept
      as-is and the card says the background was kept.
- [ ] A drawn signature needs no processing and prints exactly as drawn.
- [ ] The acknowledgement PDF still carries only the approver’s signature.

---

## 5. W3 — ADMIN may decide its own report

### 5.1 Rule change

```
canDecide(viewer, ownerUserId) = viewer.userId !== ownerUserId || viewer.role === 'ADMIN'
```

- Applies to review, endorse, return-by-reviewer, approve, and
  return-by-approver — the single `canDecide` used by `decision-request.ts`.
- `SUBMITTER`, `REVIEWER`, and `APPROVER` keep the current prohibition, including
  an account that somehow holds several capabilities; only `ADMIN` bypasses.
- Update the error copy for non-admins so it stays accurate; the admin path never
  reaches it.

### 5.2 Client availability

`decisionAvailability` (`queue-decisions.ts`) becomes `actsAs`-based instead of
strict equality, and drops the own-report block for `ADMIN`:

- `ADMIN` sees Review/Endorse/Return on the review queue and Approve/Return on the
  approval queue, for every report — including its own.
- Other roles are unchanged: exact required role, own report blocked with the same
  sentence as today.
- Pending attachments still block every decision, admin included.

### 5.3 Marking own reports

- `QueueItem` and `InboxItem` gain `isOwn: boolean`, computed server-side from the
  session user — never derived from the client’s guess.
- Surfaces: queue table row, queue detail rail/header, inbox action-card rows,
  report detail header.
- Label: a small neutral chip **“Your report”** (no color-only meaning), with an
  accessible title such as “You submitted this report; as an administrator you may
  still decide it.”
- The facsimile is not annotated; the audit timeline remains the record.

### 5.4 Audit

- The decision writes its normal audit event (`APPROVE`, `ENDORSE`, returns) with
  the actor; since actor and owner are the same id, the audit log shows it plainly.
- No new event type, no silent bypass, no “test mode”.
- `updatedByName` and people/history blocks continue to name the admin.

### 5.5 Notifications

- `report-events.ts` currently suppresses a notice to the actor. For an admin
  deciding its own report, keep that suppression (no self-notification), and do
  not notify “the submitter” separately — they are the same account.

### 5.6 Docs to update with the change

- `docs/spec/par-paperless-spec.md` §7.5 rule bullet and §9 last bullet: state the
  ADMIN exception explicitly, and keep “a user can never act on their own report”
  scoped to non-admin roles.
- `docs/spec/ui/09-queues-and-decisions.md`: decision availability and blocked
  copy; add the own-report chip to the acceptance list.
- `AGENTS.md`: the “separation of duties still applies to its own” line needs the
  ADMIN exception. **Caution:** `AGENTS.md` already has uncommitted edits from
  another change; merge with them, do not overwrite.
- `docs/spec/ui/02-work-inbox.md` role-variant table: admin now sees queue sections
  (it stands in for reviewer/approver) and its own reports.

### 5.7 Edge cases

- A report submitted by account A and decided by admin account B: unchanged
  normal path.
- Admin submits, endorses, approves its own report end-to-end: allowed, one audit
  trail, status ends `APPROVED`, acknowledgement generated with the admin’s
  signature (same image as the submitter slot).
- Admin account demoted to SUBMITTER mid-flight: the next decision is rejected,
  as with any role change.
- Two admins: neither is blocked by the other’s ownership.

### 5.8 Tests

- API: admin decides own report (each of the five decisions where the status
  allows); reviewer/approver decide own report → 403 with the existing message;
  submitter → 403 for role; admin decides another’s report (regression).
- Web: `decisionAvailability` — admin + own + waiting → enabled buttons; reviewer
  - own → blocked; approver + own → blocked; admin + pending attachments →
    blocked.
- Inbox/queue rows: `isOwn` renders the chip in all three surfaces.

### 5.9 Acceptance

- [ ] An ADMIN can review, endorse, return, and approve a report it submitted.
- [ ] No other role can decide its own report.
- [ ] Own reports are visibly marked in queues, inbox rows, and report detail.
- [ ] Admin sees decision buttons on reports it can act on (including its own).
- [ ] Audit history shows the admin as actor with no bypass markers.

---

## 6. W4 — Home inbox: real data, then apple-design refinement

### 6.1 Server assembly (fixes the reported bug)

Replace the stub in `build-inbox.ts` with real queries, reusing the existing read
layer (`report-read.ts`, `report-search.ts`, `audit.ts`, `notifications.ts`).
Every section reports a true `total` and at most three rows, newest/most-urgent
first unless stated.

| Section                     | Filter                                                                                    | Order                            | Notes                                                            |
| --------------------------- | ----------------------------------------------------------------------------------------- | -------------------------------- | ---------------------------------------------------------------- |
| `returned`                  | `ownerUserId = user`, status `RETURNED_BY_REVIEWER`/`RETURNED_BY_APPROVER`                | `updatedAt` desc                 | Rows open `/reports/:id/edit`                                    |
| `review`                    | status `SUBMITTED`/`RESUBMITTED`                                                          | `submittedAt` asc (oldest first) | Only when the caller acts as REVIEWER; rows open `/review/:id`   |
| `approval`                  | status `ENDORSED`                                                                         | `endorsedAt` asc                 | Only when the caller acts as APPROVER; rows open `/approval/:id` |
| `drafts`                    | `ownerUserId = user`, status `DRAFT`                                                      | `updatedAt` desc                 | Include existing completeness percentage                         |
| `waiting`                   | `ownerUserId = user`, status `SUBMITTED`/`RESUBMITTED`/`ENDORSED`                         | `updatedAt` desc                 | Rows open `/reports/:id`                                         |
| `activity`                  | audit events on the caller’s reports                                                      | `createdAt` desc, max 5          | Existing `InboxActivity` kinds                                   |
| `admin`                     | unchanged failed-email count + recent audit                                               | —                                | ADMIN only                                                       |
| `onboarding`                | `hasSubmitted`, first open draft id, profile completeness                                 | —                                | Real values, not constants                                       |
| `recentlyDecided` (new)     | reports where the caller was the last reviewer/approver actor and a decision was recorded | `decidedAt` desc, max 3          | New query, e.g. audit-by-actor joined to reports                 |
| `notificationsUnread` (new) | `notifications.countUnread(userId)`                                                       | —                                | Reuses `createNotificationQueries`                               |

- `isOwn` is set on every `InboxItem` from the session user id.
- Counts and sections are role-filtered server-side; the client still renders the
  union in the fixed order.
- One round trip: the home page keeps calling `GET /me/inbox` only.
- Query cost: five small indexed reads plus one count each; all filters use
  existing indexes (`reports_status_type_idx`, `reports_owner_idx`).
- `QueueItem` gains `isOwn` for W3 at the same time.

### 6.2 Payload additions (`packages/shared/src/contracts/inbox.ts`)

- `inboxItemSchema += isOwn: z.boolean()`
- `inboxResponseSchema += recentlyDecided: z.array(inboxActivitySchema).max(3)`
  (or a dedicated schema with `reportId`, `kind`, `decidedAt`)
- `inboxResponseSchema += notificationsUnread: z.number().int().min(0)`
- Keep `admin` nullable and every existing field in place; old clients still parse.

### 6.3 Home page design (apple-design, within phase 02)

Keep the phase-02 structure — action first, then drafts, waiting, activity — and
refine hierarchy, spacing, and motion. Desktop widths only (below 1024 px the
foundation notice stands).

1. **Header** — time-of-day greeting, full name, role, campus/unit; one filled navy
   primary (`+ New report`) for submitter-capable accounts and none for pure
   reviewer/approver. No motivational copy.
2. **At-a-glance row** — compact numbers for awaiting review, awaiting approval,
   returned, drafts; each links to its section or queue. Text labels, not
   color-only. Omitted for roles with no numbers to show.
3. **Needs your action** — queue cards keep true counts, three rows, and the
   correct link; the own-report chip appears for admins. Row links keep the
   destinations above.
4. **Recently decided by you** — quiet list under the action group; omitted when
   empty; opens the report.
5. **Drafts, waiting, activity** — as today, with tighter alignment to the same
   baseline grid and monospace tracking numbers.
6. **Notifications digest** — one line linking to `/notifications` when unread > 0;
   nothing rendered at zero.
7. **Empty/edge states** — existing onboarding checklist when every section is
   empty; skeleton on load; full-page `ErrorState` with request id; 401/403 still
   redirects to sign-in.

**Motion and material (apple-design, restrained):**

- Cards fade/rise 4 px on first paint with a staggered delay capped at ~120 ms
  total; hover raises elevation one step; press scales to 0.985.
- All durations/easings come from existing tokens; `prefers-reduced-motion`
  removes transform and stagger.
- No count-up numbers, no parallax, no spring overshoot on non-gesture surfaces.
- Focus-visible rings unchanged; skip link first; keyboard shortcuts remain
  optional and suppressed while typing.

### 6.4 Tests

- API `build-inbox`: reviewer sees only the review queue and its count; approver
  only approval; submitter sees returned/drafts/waiting/activity; multi-role union
  in fixed order; admin sees admin block plus queues; `isOwn` true only for own
  reports; zero sections stay empty; limits of 3 rows and true totals; recently
  decided ordering; unread count passthrough.
- Web `inbox-view`: section order, row hrefs, chip rendering, empty-state matrix,
  stat-row composition.
- Server-render: `WorkInbox` with a populated payload; newly added sections appear.

### 6.5 Acceptance

- [ ] A reviewer/approver opening the app sees their queue with true counts and
      three rows.
- [ ] Admin sees its own reports marked “Your report” and can act on them.
- [ ] Every role’s home answers “what do I do now?” in the fixed order.
- [ ] Stat row, recently decided, and notifications digest render only when they
      have content.
- [ ] Reduced-motion users get no entrance transform.
- [ ] No new client libraries; `pnpm verify` clean.

---

## 7. Consolidated data and contract changes

| Layer                                  | Change                                                                                                                                                    |
| -------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `packages/db/schema/reports.ts`        | `submitterSignatureKey`, `submitterSignedAt` (both nullable)                                                                                              |
| `packages/db/migrations`               | One generated migration, expand-only                                                                                                                      |
| `packages/db/queries`                  | Inbox assembly helpers: returned/review/approval/drafts/waiting counts+rows, submitted flag, first draft, recently decided, own-report flag on queue rows |
| `packages/shared/contracts/reports.ts` | `reportSubmitterSignatureSchema`, `reportSignatureSchema`, `ReportDetail.submitterSignature`                                                              |
| `packages/shared/contracts/inbox.ts`   | `isOwn`, `recentlyDecided`, `notificationsUnread`                                                                                                         |
| `packages/shared/contracts/queues.ts`  | `QueueItem.isOwn`                                                                                                                                         |
| `packages/shared/domain`               | No state-machine change; `canDecide` stays in the API domain layer                                                                                        |

## 8. API surface changes

| Method | Path                                      | Change                                                           |
| ------ | ----------------------------------------- | ---------------------------------------------------------------- |
| PUT    | `/api/v1/me/signature`                    | New: store/replace profile signature (all roles)                 |
| DELETE | `/api/v1/me/signature`                    | New: remove profile signature                                    |
| GET    | `/api/v1/me/signature/url`                | New: short-lived URL for own image                               |
| PUT    | `/api/v1/reports/:id/signature`           | New: inline or `fromProfile` snapshot                            |
| DELETE | `/api/v1/reports/:id/signature`           | New: clear the report signature                                  |
| GET    | `/api/v1/me/inbox`                        | Real sections, `isOwn`, `recentlyDecided`, `notificationsUnread` |
| GET    | `/api/v1/review/queue`, `/approval/queue` | Each item gains `isOwn`                                          |
| POST   | decision routes                           | `canDecide` permits ADMIN on own reports                         |

All new routes sit in existing feature folders (`features/profile`, `features/reports`),
registered in `app.ts`; no new mounts. Errors keep the
`{ error: { code, message, details? } }` shape.

## 9. Web surface changes

- `apps/web/src/routes/profile/+page.svelte` — signature card for every role.
- `apps/web/src/lib/features/profile/presentation/SignatureUpload.svelte` — copy.
- `apps/web/src/lib/features/reports/presentation/WizardStepReview.svelte` +
  `ReportEditor.svelte` — “Your signature” card.
- New `apps/web/src/lib/features/reports/presentation/SignatureCard.svelte` (or
  reuse `SignatureCapture`) — one component for both editors.
- New `apps/web/src/lib/features/profile/application/signature-background.ts`
  (pure mask/trim logic) wired into `signature-image.ts`; checkerboard preview
  surface in `SignatureCapture.svelte`.
- `apps/web/src/lib/features/facsimile/application/facsimile-people.ts` and
  `presentation/SignatureBlock.svelte` — submitter image slot.
- `apps/web/src/lib/features/queues/application/queue-decisions.ts` — `actsAs` +
  admin own-report.
- `apps/web/src/lib/features/inbox/*` — stat row, recently decided, notifications
  digest, own chip, motion.
- `apps/web/src/lib/api/client.ts` — report signature calls.
- `apps/desktop/src-tauri/src/lib.rs` — `CREATE_NO_WINDOW`.

## 10. Test plan (must be run and reported)

1. `pnpm --filter @par/shared test`
2. `pnpm --filter @par/api test` (inbox, decisions, signatures)
3. Targeted web tests as listed in §4.8, §5.8, §6.4
4. `pnpm verify` (lint → typecheck → test)
5. `pnpm turbo run build --filter=!@par/desktop`
6. Manual API pass with `wrangler dev`: upload a profile signature, sign a draft,
   submit, review, approve (as admin on its own report), open the facsimile and
   print preview; remove and replace the signature.
7. Manual Windows desktop: five Google sign-in attempts with no console flash;
   approve a report signed with a drawn signature.
8. Confirm `pnpm db:generate` leaves no dirty migration afterwards.

## 11. Non-goals

- No reviewer/endorser signature slot or reviewer signing action.
- No changes to the acknowledgement PDF’s contents.
- No per-activity-type signature requirement.
- No server-side or third-party background removal, and no ML matting.
- No backfill of existing reports.
- No new state, status, or workflow transition.
- No mobile/narrow layout work (desktop-only foundation notice stays).
- No new third-party dependency.

## 12. Assumptions and open points

1. Facsimile paper width keeps two signature slots side by side; if the print
   stylesheet needs a third column later, the reviewer slot is the extension point.
2. “Recently decided by you” is derived from audit events where the caller is the
   actor for an endorse/approve/return; if an existing query already exposes that
   shape, reuse it instead of adding one.
3. The report detail endpoint may render signature URLs through the same
   short-lived URL mechanism used for approval signatures; if the bucket-presign
   helper is unavailable locally, serve through the Worker like attachment
   content does.
4. Setting a report signature on a draft must not change report `version` used
   for conflict detection unless the write path already bumps it — choose the
   quieter option and note it in the PR.
5. `AGENTS.md` has uncommitted edits; the ADMIN exception must be merged into the
   current text rather than reverting it.
6. Background removal runs in the browser because the API can only store bytes;
   WebView2 and every target browser ship the canvas API, so no fallback path
   beyond the plain decode is needed.
