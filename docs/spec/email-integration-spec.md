# Email integration — full-flow specification

**Status:** proposed, not implemented
**Scope:** `packages/email`, the API's mail paths, the outbox, reminders, workbook
mailing, the admin email log, and the small amount of new web UI they need
**Refines:** `par-paperless-spec.md` §7.9 (Notifications), §7.10 (acknowledgement),
§7.13 (exports), §10; answers open question **§14 Q15** (sender/provider)
**Source of the format requirement:** `OVCPASSS - Paperless Process for the
submission of Post Activity Report.eml` and the workbook attached to it

The specs remain the source of truth. Where this document and
`par-paperless-spec.md` disagree, the disagreement is called out explicitly and
this document — being newer and interview-backed — wins only for §7.9, §7.10 and
§7.13 mail details.

---

## 1. The request

> "We are gonna utilize the full advantage of the email integration — where it
> must be used or can be used, in the flow of the app, because I think it's only
> used in the notification. Also it should use the original format:
> OVCPASSS - Paperless Process for the submission of Post Activity Report.eml."

Two demands, in order:

1. **Coverage.** Email is currently one line per workflow event. Every point in
   the office's own 22-step process where a person would otherwise have to check
   the app should produce mail, and the mail should carry the documents the office
   actually files (the PAR, the acknowledgement, the monitoring workbook).
2. **Institutional format.** Every outbound message is built on one shell that is
   recognisably the office's email: greeting, body, then the university signature
   block taken verbatim from the source `.eml`. The `.eml` is treated as a
   **sample of the office's style**, not as a template to reproduce word for word
   (it says "Sir", "Good day!", "God Bless", which the house voice rules out).

---

## 2. Decisions locked in the interview (2026-10-21)

| #   | Decision                                                                                                                                                                                |
| --- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| D1  | **Format** = the `.eml`'s own shape: greeting → body → the exact signature block. The 22-step sheet decides _when_ mail fires; the workbook is the export format, not the email format. |
| D2  | **New moments:** acknowledgement attached on approval, submission receipt for the submitter, queue reminders for idle reports, term-end workbook by mail. All four are in scope.        |
| D3  | **Outbound only.** No inbound routing, no reply-to-comment parsing, no threaded mailbox.                                                                                                |
| D4  | **Branded HTML shell with a plain-text fallback.** App tokens (navy, gold rule), system font stack, plus the institutional signature block.                                             |
| D5  | **Resend for launch.** The Cloudflare Email Service adapter stays a stub; the richer capability is implemented once, on Resend.                                                         |
| D6  | **Office identity:** the `.eml` wording wins and the PDFs are corrected to match it.                                                                                                    |
| D7  | **Links** in mail are ordinary app links behind sign-in. No magic links, no new auth surface.                                                                                           |
| D8  | **No CC to the office** on workflow mail. The office only receives the workbook and the failure digest.                                                                                 |
| D9  | **Failure visibility:** `email_outbox` rows per send, an admin email log with resend, and an admin alert when a send is finally failed.                                                 |
| D10 | **Scope:** full slice, backend and UI, plus a new UI phase checklist.                                                                                                                   |
| D11 | **Receipt carries the PAR PDF**, not just a summary.                                                                                                                                    |
| D12 | **Approval mail carries the acknowledgement only** (one attachment, one mail).                                                                                                          |
| D13 | **Reminders:** every 3 days, capped, stop when the queue moves. Aligned to the existing working-day rule.                                                                               |
| D14 | **Workbook recipients are free-form**, office address prefilled — but constrained to institutional domains (§11.3).                                                                     |
| D15 | **Muting:** per-category email toggle in the profile; in-app notifications never stop.                                                                                                  |
| D16 | **Subject:** bracketed tag plus tracking number, `[OVPCASSS PAR] OFF-2026-0014 …`.                                                                                                      |
| D17 | **Fan-out:** one mail per recipient; the actor is skipped. The submitter still receives their receipt/acknowledgement.                                                                  |
| D18 | **Configuration:** env vars and constants, no admin settings screen.                                                                                                                    |
| D19 | **Resend re-sends the stored reference**, not a re-render of current state.                                                                                                             |
| D20 | **Sequencing:** format and attachments first, then the rest (§19).                                                                                                                      |
| D21 | **Attachments travel as R2 keys** in the queue job; the consumer loads the bytes (Queues caps a message at 128 KB).                                                                     |
| D22 | **Outbox stores metadata plus a reference**, not the message body.                                                                                                                      |
| D23 | **Log lives on its own admin page** at `/admin/emails`.                                                                                                                                 |
| D24 | **Verification:** console provider, a dev-only rendered preview, snapshot tests, and exactly one real send to the office address.                                                       |

---

## 3. What exists today (audit)

### 3.1 `packages/email`

| File                               | Reality                                                                                                                      |
| ---------------------------------- | ---------------------------------------------------------------------------------------------------------------------------- |
| `src/provider.ts`                  | `EmailContent { subject, html, text }`, `EmailMessage` adds `to`. No attachments, cc, bcc, reply-to, headers, or message id. |
| `src/templates/report-events.ts`   | Four one-line templates (`submitted/returned/endorsed/approved`), each a single `<p>` with raw interpolation.                |
| `src/templates/account-events.ts`  | Verify, reset, role-approved — same one-liner shape.                                                                         |
| `src/adapters/resend.ts`           | Posts `from/to/subject/html/text`. No `attachments`, no `headers`, no idempotency key; error text is surfaced.               |
| `src/adapters/console.ts`          | Prints `to=… subject=…` and the text body. Ignores HTML and attachments.                                                     |
| `src/adapters/cloudflare-email.ts` | Stub that throws. Never exercised.                                                                                           |

No shell, no identity constants, no escaping, no shared fixtures.

### 3.2 API mail paths

| Path                                            | Reality                                                                                                                                                                                                                |
| ----------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `apps/api/src/email/queue.ts`                   | `EmailJob = EmailMessage`; consumer validates four strings, sends, `ack()`/`retry()`. Nothing else is recorded.                                                                                                        |
| `apps/api/src/email/provider.ts`                | Adapter selection from `EMAIL_PROVIDER`; defaults to Resend.                                                                                                                                                           |
| `apps/api/src/email/auth-mail.ts`               | Verification and reset links; goes through the queue.                                                                                                                                                                  |
| `features/notifications/application/notify.ts`  | The single write path: one inbox row + one queued mail. Queue failure is logged, never thrown.                                                                                                                         |
| `features/reports/application/report-events.ts` | Fires submitted/resubmitted, returned, endorsed, approved. `notifyReturned` takes an `emailSubmitter` flag wired to the return drawer's **Notify submitter by email** checkbox (`queue-decisions.ts`), default `true`. |
| `features/users/application/user-actions.ts`    | Sends the `ACCOUNT` template on **role assignment only**; `approveUser` and `disableUser` send nothing.                                                                                                                |

### 3.3 Gaps that this spec closes

| Gap                                                | Evidence                                                                                                                                                | Consequence                                                                      |
| -------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------- |
| Approval mail claims an attachment it cannot carry | `approvedTemplate`: "The acknowledgement is attached."                                                                                                  | The submitter is told about a document they never receive.                       |
| `email_outbox` is never written                    | Queries + admin counter exist (`inbox/application/build-inbox.ts`); no `insert` caller anywhere                                                         | The admin "failed emails" figure is permanently 0.                               |
| No dead-letter handling                            | `wrangler.toml` declares `par-email-dlq`; no consumer                                                                                                   | A message that exhausts five retries disappears silently.                        |
| No attachment capability                           | Port has no `attachments`                                                                                                                               | Receipt, acknowledgement, workbook mailing all impossible.                       |
| No bounce/complaint path                           | Resend adapter ignores the response body                                                                                                                | Hard bounces keep being retried forever.                                         |
| No reminders                                       | Cron does cleanup + backup only                                                                                                                         | A report can sit in review indefinitely without anyone noticing.                 |
| No mute                                            | No preference column, no UI                                                                                                                             | A reviewer on leave cannot stop the mail without an admin disabling the account. |
| No preview, no fixture                             | —                                                                                                                                                       | Template copy can only be reviewed by sending real mail.                         |
| Office name mismatch                               | `.eml`: "Culture, Arts, Sports and Student Services"; `facsimile/layout.ts` and `acknowledgement/pdf.ts`: "Campus Affairs, Student Services and Safety" | Two contradictory institutional identities in one product.                       |

---

## 4. The source email

### 4.1 The sample

```
From:    Office of the Vice President for Culture, Arts, Sports and Student Services <ovpcasss@buksu.edu.ph>
To:      2401117078@student.buksu.edu.ph
Date:    Tue, 13 Oct 2026 10:14:25 +0800
Subject: Fwd: OVCPASSS - Paperless Process for the submission of Post Activity Report
MIME:    multipart/mixed (multipart/alternative text + html) + one xlsx attachment
Body:    "Sir, / Good day! Please see the attached file. Thank you, and God Bless."
         followed by the signature block
Attach:  OVPCASSS-PAPERLESS PROCESS FOR PAR.xlsx (380 KB)
```

The `text/plain` part is the plain-text alternative; the `text/html` part is a
Gmail-styled container that adds nothing but the forwarding header. Neither part
contains any branding beyond the signature block. **This is the whole visual
brief.**

### 4.2 The signature block — verbatim, and the canonical constant

```
----
BUKIDNON STATE UNIVERSITY
Office of the Vice President for Culture, Arts, Sports and Student Services
Ground Floor Administration Building
Fortich St., Malaybalay City, Bukidnon 8700
```

Rules:

- The four underscore-dash rule (`----`), then four lines, in this order.
- The office line is bold; the rest is regular weight. In plain text nothing is
  bold and the block is plain lines.
- No logo image, no social links, no confidentiality footer, no tracking pixel.
- This block appears on **every** outbound message, including account mail.

### 4.3 The attached workbook

Sheets: `PAR PROCESS`, `OFF-CAMPUS`, `EDUCATIONAL TOUR`, `IN-CAMPUS`, `dropdown`.

`PAR PROCESS` is a 22-step numbered list — the office's own description of this
product's workflow. It is the authority for _when_ a mail fires. Step numbering
below comes from that sheet.

| Step | Office wording (abridged)                                   | Mail fired today | Mail after this spec                               |
| ---- | ----------------------------------------------------------- | ---------------- | -------------------------------------------------- |
| 1    | User logs into the paperless submission system              | —                | — (no mail; sign-in is the user's own act)         |
| 2    | User selects the completed activity                         | —                | —                                                  |
| 3    | User fills out the electronic PAR form                      | —                | —                                                  |
| 4    | User uploads supporting documents                           | —                | —                                                  |
| 5    | System validates completeness                               | —                | — (in-app validation)                              |
| 6    | If incomplete, returned to the user for completion          | —                | — (in-app)                                         |
| 7    | If complete, user submits electronically                    | —                | —                                                  |
| 8    | System generates reference number and records date/time     | —                | **Receipt** to the submitter (§5, M-RECEIPT)       |
| 9    | System notifies designated OVPCASSS personnel               | SUBMITTED        | SUBMITTED, reformatted, plus receipt               |
| 10   | Personnel reviews the report                                | —                | —                                                  |
| 11   | If corrections required, returned with comments             | RETURNED         | RETURNED, reformatted                              |
| 12   | User revises and resubmits                                  | SUBMITTED        | SUBMITTED (resubmission wording)                   |
| 13   | Personnel reviews the revised report                        | —                | —                                                  |
| 14   | If it meets requirements, endorsed to the approving officer | ENDORSED         | ENDORSED, reformatted                              |
| 15   | Approving officer reviews and approves electronically       | —                | —                                                  |
| 16   | If further corrections required, returned to the user       | RETURNED         | RETURNED, reformatted                              |
| 17   | System records approval date and approving officer          | —                | —                                                  |
| 18   | System generates digital acknowledgement                    | — (claim only)   | APPROVED **with the acknowledgement PDF attached** |
| 19   | System stores the approved report in the repository         | —                | —                                                  |
| 20   | Authorized personnel can search, view, retrieve             | —                | — (retrieval is a user act)                        |
| 21   | System maintains an audit trail                             | —                | —                                                  |
| 22   | Process ends on successful approval and storage             | —                | —                                                  |

Plus two things the sheet does not describe but the product needs: reminders
(step 10/15 dwelling) and the term-end workbook hand-off (steps 19–20 at term
close).

---

## 5. The email catalogue

`Kind` is the `email_outbox.kind` value. `Mute` names the preference category
(§8). Every message carries the shell (§6) and the signature block (§4.2).

### 5.1 Workflow

| Kind             | Fires when                                  | To                                                            | Subject                                                                      | Attachments         | Mute                       |
| ---------------- | ------------------------------------------- | ------------------------------------------------------------- | ---------------------------------------------------------------------------- | ------------------- | -------------------------- |
| `SUBMITTED`      | First submission (step 9)                   | Every active Reviewer except the actor and the owner          | `[OVPCASSS PAR] OFF-2026-0014 is ready for review`                           | —                   | `WORKFLOW`                 |
| `RECEIPT`        | First submission only (step 8)              | The submitter                                                 | `[OVPCASSS PAR] Submission received: OFF-2026-0014`                          | PAR PDF             | `WORKFLOW`                 |
| `RESUBMITTED`    | Resubmission (step 12)                      | Every active Reviewer except the actor and the owner          | `[OVPCASSS PAR] OFF-2026-0014 was resubmitted`                               | —                   | `WORKFLOW`                 |
| `RETURNED`       | Reviewer or approver returns (steps 11, 16) | The submitter                                                 | `[OVPCASSS PAR] OFF-2026-0014 was returned for revision`                     | —                   | `WORKFLOW`                 |
| `ENDORSED`       | Endorsement (step 14)                       | Every active Approver except the actor and the owner          | `[OVPCASSS PAR] OFF-2026-0014 is ready for approval`                         | —                   | `WORKFLOW`                 |
| `APPROVED`       | Approval (step 18)                          | The submitter                                                 | `[OVPCASSS PAR] OFF-2026-0014 is approved`                                   | Acknowledgement PDF | `WORKFLOW`                 |
| `REMINDER`       | Daily sweep, per report (§10)               | Active Reviewers (review queue) or Approvers (approval queue) | `… is still awaiting review` / `… awaiting approval`, by queue               | —                   | `REMINDER`                 |
| `WORKBOOK`       | Admin/reviewer sends from Exports (§11)     | Up to five institutional addresses                            | `[OVPCASSS PAR] Monitoring workbook, OFF-CAMPUS, SY 2026-2027, 1st semester` | Monitoring xlsx     | n/a (explicit user action) |
| `FAILURE_DIGEST` | Daily cron when failures exist (§9.5)       | Active Admins                                                 | `[OVPCASSS PAR] 3 messages could not be delivered`                           | —                   | n/a (operational)          |

`RESUBMITTED` is a new kind. It exists because step 12 deserves different copy
than step 9 ("submitted again after revision") and because the receipt must not
repeat.

### 5.2 Account and security

| Kind                | Fires when                           | To       | Subject                                                | Mute          |
| ------------------- | ------------------------------------ | -------- | ------------------------------------------------------ | ------------- |
| `VERIFY`            | Registration                         | The user | `[OVPCASSS PAR] Verify your email address`             | never mutable |
| `RESET`             | Forgot password                      | The user | `[OVPCASSS PAR] Reset your password`                   | never mutable |
| `ROLE_ASSIGNED`     | Admin assigns a role                 | The user | `[OVPCASSS PAR] Your role has been assigned: Reviewer` | never mutable |
| `ACCOUNT_ACTIVATED` | Admin reactivates a disabled account | The user | `[OVPCASSS PAR] Your account is active`                | never mutable |
| `ACCOUNT_DISABLED`  | Admin disables the account           | The user | `[OVPCASSS PAR] Your account has been disabled`        | never mutable |

`ACCOUNT` (the old single kind) is split into three **email** kinds. The
role-assignment mail takes effect immediately: it names the new role and no
longer promises a later activation. `ACCOUNT_ACTIVATED` is sent when a disabled
account is reactivated. `roleApprovedTemplate` is removed.

The inbox and the outbox use different vocabularies: the inbox keeps one `ACCOUNT`
chip (a disabled account cannot read its own inbox anyway), while `email_outbox.kind`
records the precise email kind. See §12.

### 5.3 What each message contains

Every mail has, in order: preheader (hidden first line), navy header band with
`OVPCASSS` and the office name, gold rule, greeting, 1–3 short paragraphs, an
optional facts block (label/value pairs), an optional single primary action
button, the signature block, and a footer line with the tracking number and a
"do not reply" note.

- **SUBMITTED:** "A post-activity report was submitted and is waiting for your
  review." Facts: reference, activity, submitter, date received (Asia/Manila),
  classification, campus/college. Action: `Open the review queue` → `/review`.
- **RECEIPT:** "Your post-activity report was received." Facts: reference,
  activity, date and time received, current status, what happens next ("The
  OVPCASSS reviewer will review the report and may return it with comments.").
  Action: `View the report` → `/reports/{id}`. Attachment: the PAR PDF exactly as
  filed, watermarked `NOT_APPROVED`.
- **RESUBMITTED:** same shape as SUBMITTED, wording "was resubmitted after
  revision", plus the revision round count.
- **RETURNED:** "The report was returned for revision by {actor}." The full
  comment in a quoted block, verbatim, wrapped at 72 characters in plain text.
  Facts: reference, activity, returned by, date. Action: `Revise the report`.
- **ENDORSED:** "A post-activity report was endorsed and is waiting for your
  decision." Facts: reference, activity, reviewer, date endorsed. Action:
  `Open the approval queue`.
- **APPROVED:** "Your post-activity report was approved." Facts: reference,
  activity, approved by, date approved. Attachment: acknowledgement PDF. Action:
  `View the report`. Copy notes that the acknowledgement is attached **only when
  the attachment is actually present** (§7.3).
- **REMINDER:** "This report has been waiting {n} working days." Facts:
  reference, activity, submitter, waiting since, working days waiting. Action:
  the queue. No comment, no blame language.
- **ROLE_ASSIGNED / ACCOUNT_ACTIVATED:** role name, what it lets them do, action
  `Sign in` → `/login`.
- **ACCOUNT_DISABLED:** no action button; says to contact the office, and prints
  the office address.

### 5.4 Actor suppression

- A user never receives the mail for an action they performed (D17). This matters
  because an Admin can act as reviewer and approver (spec §9, 2026-10-20).
- The submitter still receives `RECEIPT` and `APPROVED` for their own report.
- Admins acting in multiple roles produce one mail per _other_ recipient only.
- A disabled or unverified account is skipped entirely, and the skip is written
  to the outbox as `SUPPRESSED` (§9.2) so the reason is visible, not silent.

---

## 6. Message format

### 6.1 Package layout

`packages/email` stays dependency-free: pure TypeScript returning strings and
byte arrays, no DOM, no framework, no network. It must not import from
`apps/*`. Nothing in `apps/web` imports it — the web app never composes mail.

| New module        | Responsibility                                                                                                                                                          |
| ----------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `src/identity.ts` | `OFFICE_NAME`, `OFFICE_ADDRESS_LINES`, `UNIVERSITY_NAME`, `SIGNATURE_LINES`, `EMAIL_SUBJECT_TAG = '[OVPCASSS PAR]'`, `REPLY_NOTICE`. One source for the `.eml`'s block. |
| `src/shell.ts`    | `renderShell(input): EmailContent` — the HTML shell, the plain-text rendering, escaping, preheader, header band, gold rule, facts block, button, signature, footer.     |
| `src/format.ts`   | `manilaDate`, `manilaDateTime`, `manilaLongDate`, `pluralDays` (Asia/Manila, `en-GB`, UTC-safe).                                                                        |
| `src/samples.ts`  | One sample dataset per template, used by the dev preview and the snapshot tests, so copy is reviewed against the same data it ships with.                               |

### 6.2 HTML constraints (email clients, not browsers)

- **Tables, not flex or grid.** A single 600 px table, `role="presentation"`,
  `cellpadding=0 cellspacing=0 border=0`.
- **Inline styles only.** No `<style>` block, no external CSS, no `<link>`.
- **No web fonts.** Montserrat is vendored for the app, not available in mail
  clients, and the app must make no external requests. Stack:
  `Montserrat, 'Segoe UI', Helvetica, Arial, sans-serif`.
- **No images** in v1. The header band is navy `#172a4b` with white
  `letter-spacing` text. A logo can be added later as a hosted PNG.
- **No background-image, no CSS custom properties** (unsupported in Outlook
  desktop). Token colors are written out as literals in `shell.ts`; the values
  mirror `tokens.css` and a test asserts they match the documented hex list.
- **Dark mode:** navy band with white text stays legible; body text is
  `#111827` on `#ffffff`; nothing depends on a light background for contrast in a
  dark-mode client except the band, which carries its own background.
- **Width:** 600 px max, fluid below; 16 px side padding at small widths.
- **Accessibility:** `lang="en"`, heading hierarchy (one `h1`), button text as
  link text (never "click here"), 4.5:1 contrast minimum, no color-only meaning.

### 6.3 Plain text

Every message is rendered twice from the same input. Rules: no raw URLs longer
than 78 characters (wrap and keep the URL intact on its own line), the facts
block as `Label: value` lines, the signature block exactly as §4.2, and the
comment quoted with `> `. The plain-text body is what the console provider prints
and what snapshot tests assert.

### 6.4 Subject lines

- Pattern: `[OVPCASSS PAR] ` + the sentence. Account mail drops the tracking
  number; workflow mail always carries it.
- Max 78 characters. No emoji, no all-caps words, no exclamation marks.
- The tag is stable and bracketed so one Gmail filter catches every message and
  `OFF-2026-0014` in the subject keeps a report's mail adjacent in a client that
  threads by subject.

### 6.5 Voice

`AGENTS.md` requires formal institutional English and forbids exclamation marks.
The `.eml`'s "Good day!" and "God Bless" are therefore **not** reproduced
literally; the greeting becomes "Good day." and the closing "Thank you." The
signature block is reproduced exactly — that is the part the office recognises.

### 6.6 Escaping

All interpolated values are HTML-escaped (`& < > " '`) and newlines in comments
become `<br>`. A report title is user input; an unescaped `<` currently reaches
the message body. This is a stored-XSS vector in mail clients and is fixed as
part of the shell, with a test.

---

## 7. Attachments

### 7.1 The queue cannot carry bytes

Cloudflare Queues caps a message at **128 KB**
(<https://developers.cloudflare.com/queues/platform/limits/>). An acknowledgement
PDF, a PAR PDF, or the 380 KB workbook exceeds that. Resend takes attachments as
base64 `content` in the request body
(<https://resend.com/docs/dashboard/emails/attachments>).

Therefore:

1. Compose-time: the object is rendered and written to R2 (or already there).
2. The queue job carries **references only**:
   `{ objectKey, filename, contentType, size }`.
3. The consumer reads R2 with `env.BUCKET.get(objectKey)`, base64-encodes, and
   hands the provider `{ filename, content, contentType }`.
4. The outbox row stores the same references plus `subject`, never the bytes.

### 7.2 Types

```ts
// packages/email/src/provider.ts
export interface EmailAttachment {
  filename: string; // OVPCASSS-Acknowledgement-OFF-2026-0014.pdf
  contentType: string; // application/pdf | ...spreadsheetml.sheet
  content: Uint8Array; // only exists in the API/consumer, never in a queue job
}

export interface EmailAttachmentRef {
  objectKey: string; // acknowledgements/{reportId}.pdf
  filename: string;
  contentType: string;
  size: number;
}

export interface EmailContent {
  subject: string;
  html: string;
  text: string;
  attachments?: readonly EmailAttachment[];
}

export interface EmailMessage extends EmailContent {
  to: string;
  /** Resend idempotency header, derived from the outbox id. */
  idempotencyKey?: string;
}
```

`EmailJob` in the API is `Omit<EmailMessage, 'attachments'> & { outboxId: string;
attachments?: readonly EmailAttachmentRef[] }`.

### 7.3 Caps and fallbacks

- **Total attachment budget: 8 MiB per message** (`EMAIL_MAX_ATTACHMENT_BYTES`).
  Sits under both Resend's and Cloudflare Email Service's limits (the latter is
  5 MiB total, documented for when that adapter is finished).
- Compose-time checks the size from the stored object (the PAR PDF is rendered
  before the mail is queued; the acknowledgement is rendered before it is
  attached). If the total exceeds the cap, the attachment is **dropped** and the
  mail gains a line: "The document is available in the app." The outbox row
  records `note: 'attachment omitted (size)'`. Mail is never withheld because a
  document is large.
- If R2 read fails at send time, the message is retried (transient); after the
  final attempt it fails with the R2 error in `last_error`. The notice mail is not
  silently sent without its document, because "The acknowledgement is attached"
  would be false.
- A missing acknowledgement (render threw) means the `APPROVED` mail is sent
  **without** the attachment and without the "attached" sentence, and the failure
  is logged with the report id. Approval is never rolled back for mail (spec §7.9).

### 7.4 File names

| Document            | File name                                              | R2 key                                                | Producer                                 |
| ------------------- | ------------------------------------------------------ | ----------------------------------------------------- | ---------------------------------------- |
| PAR facsimile       | `OVPCASSS-PAR-{tracking}.pdf`                          | `facsimile/{reportId}.pdf` (existing)                 | `renderReportFacsimile` (extracted, §15) |
| Acknowledgement     | `OVPCASSS-Acknowledgement-{tracking}.pdf`              | `acknowledgements/{reportId}.pdf` (existing)          | `ensureStoredAcknowledgement`            |
| Monitoring workbook | `OVPCASSS-Monitoring-{type}-SY{year}-S{semester}.xlsx` | not stored; rendered and attached in the same request | `buildMonitoringWorkbook`                |

Tracking numbers are `OFF-2026-0001` style; file names keep the hyphens.

### 7.5 Resend adapter

`createResendProvider` gains:

- `attachments: [{ filename, content: base64, content_type }]`.
- `headers: { 'Idempotency-Key': idempotencyKey }` when present, so a retried
  queue message cannot double-deliver.
- Error text still surfaced in `last_error`, truncated to 300 characters.
- No `reply_to` (outbound only, D3) and no `cc` (D8).

The console adapter prints attachment names and sizes, then the text body.

---

## 8. Preferences and muting

- Two new columns on `users`: `email_workflow` and `email_reminders`, integer
  booleans, default `1`. Account and security mail has no column — it cannot be
  muted.
- `notify()` consults the category before queueing; an explicit user action
  (workbook mailing) ignores preferences because the user is the sender.
- **Precedence with the existing per-return checkbox.** The return drawer's
  _Notify submitter by email_ is the reviewer's instruction; the mute is the
  recipient's standing choice. Either can suppress, neither can force: mail goes
  out only when the reviewer asks **and** the submitter has not muted
  `WORKFLOW`. A suppressed row records `SUPPRESSED (recipient muted)` in
  `last_error`, so the reviewer's intent is visible in the log even though no
  mail was sent. The checkbox is not relabelled and the drawer does not show the
  recipient's preference.
- Profile page gains an **Email** section: two switches, each with a one-line
  explanation ("Workflow mail: submissions, returns, endorsements, approvals,
  receipts and acknowledgements." / "Reminders: a nudge when a report has been
  waiting in a queue."). Saving is immediate (no Save button), with a toast.
- Plain consequence, stated in the UI: turning a category off does not affect the
  in-app notifications, which always continue.
- API: `GET /api/v1/me/email-preferences` → `{ workflow: boolean, reminders:
boolean, account: true }`; `PATCH /api/v1/me/email-preferences` with
  `{ workflow?, reminders? }`. Zod schema in `packages/shared`.
- Default for new accounts: both on.

---

## 9. Outbox, admin log, and failure handling

### 9.1 Write path

`enqueueEmail` becomes the single funnel:

1. Create the outbox row `QUEUED` with `kind`, `to`, `payload` (metadata JSON:
   `{ subject, reportId?, attachments: refs, note? }`), `attempts: 0`.
2. `EMAIL_QUEUE.send({ ...job, outboxId })`.
3. If the send throws, the row is marked `FAILED` with the queue error, and the
   caller still does not fail (unchanged behaviour).

### 9.2 Statuses

Extend `EMAIL_OUTBOX_STATUSES` with `SUPPRESSED` (preference off, actor
suppressed, disabled account, missing facts). Final states: `SENT`, `FAILED`,
`SUPPRESSED`. `SUPPRESSED` rows carry the reason in `last_error` — the column is
reused as the reason/error field, documented in the schema comment.

The consumer sets `attempts = message.attempts`, `SENT` on success, and on the
final attempt (when `message.attempts >= max_retries`) marks `FAILED` before
`retry()`, so a message that ends up in the DLQ already has a visible row. A DLQ
consumer is **not** added in this phase (§20).

### 9.3 Queries

`packages/db/src/queries/email-outbox.ts` gains `findById`, `markSent`,
`markFailed`, `markSuppressed`, `list({ status?, kind?, page })`,
`countByStatus`, and `lastSentFor(kind, reportId)` (used by reminders, §10).

### 9.4 Admin page — `/admin/emails`

- New route `src/routes/admin/emails/+page.svelte` → feature
  `src/lib/features/email-log/`.
- Table: time (Asia/Manila), kind chip, recipient, subject, status chip
  (`Queued` / `Sent` / `Failed` / `Suppressed`), attempts, last error (truncated,
  full text on hover/title). 50 per page, shared table and pagination styles.
- Filters: status (default `Failed`), kind, recipient search. URL state, like
  every other table (phase 05 pattern).
- Row action **Resend** (failed and suppressed rows only, with confirm): re-queues
  the same reference and creates a **new** outbox row, leaving the original as-is.
  Audit action `EMAIL_RESENT`. Rate limited to 10 per hour per admin.
- Row action **View** (failed and suppressed rows only): `GET /emails/:id/message`
  returns the stored copy — recipient, subject, and plain-text body — and the
  dialog lists the links that body carries, each with a copy button. It is the
  escape hatch for a misconfigured or unverified sender: the office can hand a
  verification or reset link to its owner while delivery is broken. Read-only,
  never re-rendered, no audit row; a row whose copy is gone answers
  `409 EMAIL_MESSAGE_UNAVAILABLE`.
- The admin inbox card's "failed emails" figure links here; it starts reading
  non-zero once §9.1 lands.
- Tab added to the Admin section tabs (`navigation.ts`), after "Audit".
- Only `ADMIN` reaches it (`requireRole('ADMIN')`).

### 9.5 Failure digest

- Runs in the existing daily backup cron slot (18:30 UTC / 02:30 Manila), after
  the backup, so no new cron expression and no new trigger.
- When `countFailed() > 0`, one mail per active Admin: count, the three newest
  failures (kind, recipient, error), and a link to `/admin/emails`.
- Sent **directly** through the provider (no queue), best-effort, because mailing
  a failure report through the failing queue is circular. A direct-send failure is
  logged and nothing else happens.

---

## 10. Reminders

### 10.1 Rule

Reuse the queue-age rule that already drives the attention colour:
`workingDaysSince()` and `QUEUE_AGE_ATTENTION_DAYS` from
`packages/shared/src/workflow/working-days.ts`. Weekends do not count — the same
arithmetic the reviewer sees on screen — so a reminder never contradicts the UI.

- Review queue: `status IN ('SUBMITTED','RESUBMITTED')`, clock from
  `submitted_at`.
- Approval queue: `status = 'ENDORSED'`, clock from `endorsed_at`.
- Due when `workingDaysSince(...) >= 3`.
- At most one reminder per report per 3 working days: skip if
  `lastSentFor('REMINDER', reportId)` is within 3 working days.
- Stops the moment the status changes, because the report no longer matches.
- Recipients: active holders of the queue's role, minus the report owner and minus
  anyone who muted `REMINDER`. Nothing is sent when the recipient list is empty.

### 10.2 Schedule

Inside the existing hourly sweep (`17 * * * *`), gated to run once per day at
09:00 Asia/Manila (`REMINDER_LOCAL_HOUR`). The gate is a pure function
(`reminderWindowMatches(now)`) so it is testable without a clock mock over cron.

### 10.3 Where the code lives

New feature folder `apps/api/src/features/reminders/`:

- `domain/select-due.ts` — pure: given waiting rows, last-sent lookups, and `now`,
  return the list of `{ reportId, role, recipients }` due. Fully unit-tested.
- `application/send-reminders.ts` — loads rows, calls `notify()` per recipient
  with `kind: 'REMINDER'` and the outbox reference.
- `apps/api/src/cron/reminders.ts` — the cron entry that applies the gate and logs
  a structured summary `{ due, sent, skipped }`.

`notify()` remains the only write path, so reminder rows appear in the in-app
inbox too (kind `REMINDER` added to `NOTIFICATION_KINDS`, label "Reminder",
`needsAction: true` for the queue roles).

---

## 11. Workbook mailing

### 11.1 API

`POST /api/v1/exports/monitoring/send`

```jsonc
{
  "type": "OFF_CAMPUS", // existing monitoringExportRequestSchema fields
  "schoolYear": "2026-2027",
  "semester": 1,
  "includeInProgress": true,
  "to": ["ovpcasss@buksu.edu.ph"], // 1..5 addresses
  "note": "For the first semester filing.", // optional, <= 500 chars
}
```

Response `202 { queued: 1 }`. Permission: the existing `canExport` set
(REVIEWER, APPROVER, ADMIN). The workbook is assembled by the same
`assembleMonitoring()` used by the download, so the mailed file cannot drift from
the downloaded one.

### 11.2 Body

"The monitoring workbook for {sheet}, {term} is attached. {note}" plus facts
(reports included, generated at, generated by). Action: none. Attachment: the
workbook. Audit: `EXPORTED` with comment `…, mailed to 1 recipient`.

### 11.3 Guardrails

Free-form recipients are constrained to `ALLOWED_EMAIL_DOMAINS`
(`buksu.edu.ph`, `student.buksu.edu.ph`), so the endpoint cannot be used to mail
arbitrary addresses; the office address passes by definition. Max five
recipients, deduplicated, lowercased. Rate limit: 5 sends per hour per user,
reusing the existing `rate_limit_counters` buckets. A rejected address returns
`400 VALIDATION_ERROR` naming it.

### 11.4 UI

On `/exports`, next to the download action, a **Send by email** secondary action
opens a small dialog: recipient chips (office prefilled, add up to five), an
optional note, and Send. Sending is confirmed by toast, the dialog closes, and the
button is disabled while in flight. No new screen.

---

## 12. Contract changes (`packages/shared`)

| Change                     | Detail                                                                                                                                                                                                                                           |
| -------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Two vocabularies           | `NOTIFICATION_KINDS` stays the **inbox** vocabulary (chips). `EmailKind` is a new, separate union in `packages/email` for the **outbox** and the templates (§5.1, §5.2). `notify()` accepts both: `kind` for the row, `email.kind` for the mail. |
| `NOTIFICATION_KINDS`       | Add `'RESUBMITTED'`, `'REMINDER'`; keep `SUBMITTED`, `RETURNED`, `ENDORSED`, `APPROVED`, `ACCOUNT`.                                                                                                                                              |
| `NOTIFICATION_KIND_LABELS` | Add `Resubmitted`, `Reminder`. The five existing labels are unchanged.                                                                                                                                                                           |
| `notificationFlagsFor`     | `RESUBMITTED` → `needsAction: true`, `aboutOwnReport: false`; `REMINDER` → `needsAction: true`, `aboutOwnReport: false`.                                                                                                                         |
| `emailPreferencesSchema`   | `{ workflow: z.boolean(), reminders: z.boolean() }`, partial for PATCH.                                                                                                                                                                          |
| `sendWorkbookSchema`       | The request in §11.1, with the 1–5 address rule and the 500-character note.                                                                                                                                                                      |
| `emailLogQuerySchema`      | `status?`, `kind?`, `to?`, `page`, `size` for the admin log.                                                                                                                                                                                     |

The inbox filter behaviour is unchanged: `Needs action` now also includes
reminders, which is correct — a report genuinely is waiting on that user.

---

## 13. Data model and migrations

One generated migration, forward-only:

```sql
ALTER TABLE users ADD COLUMN email_workflow integer NOT NULL DEFAULT 1;
ALTER TABLE users ADD COLUMN email_reminders integer NOT NULL DEFAULT 1;
```

Both are expand-only with defaults, so existing rows and old code keep working
during a deploy. `email_outbox` keeps its shape: `payload` holds the metadata JSON
and `last_error` holds either the delivery error or the suppression reason. The
schema comment on `payload` is updated to say so.

No new table. Reminder de-duplication reads the outbox via
`lastSentFor('REMINDER', reportId)` instead of adding a reminder-state table.

---

## 14. Configuration

All in `apps/api/wrangler.toml` `[vars]` (D18):

| Var                           | Value                                              | Purpose                                                                                                         |
| ----------------------------- | -------------------------------------------------- | --------------------------------------------------------------------------------------------------------------- |
| `EMAIL_PROVIDER`              | `resend` (unchanged)                               | Adapter selection.                                                                                              |
| `EMAIL_FROM`                  | `OVPCASSS PAR <ovpcasss@buksu.edu.ph>` (unchanged) | Sender.                                                                                                         |
| `OFFICE_EMAIL`                | `ovpcasss@buksu.edu.ph`                            | Workbook dialog default and digest recipient fallback.                                                          |
| `EMAIL_SUBJECT_TAG`           | `[OVPCASSS PAR]`                                   | Exposed so the tag is configurable without a code change (redundant with `identity.ts`, which is the fallback). |
| `REMINDER_AFTER_WORKING_DAYS` | `3`                                                | Threshold; defaults to `QUEUE_AGE_ATTENTION_DAYS`.                                                              |
| `REMINDER_LOCAL_HOUR`         | `9`                                                | Manila hour at which the daily sweep sends.                                                                     |
| `EMAIL_MAX_ATTACHMENT_BYTES`  | `8388608`                                          | 8 MiB cap.                                                                                                      |
| `DEV_EMAIL_PREVIEW`           | unset in production, `true` in `.dev.vars`         | Mounts the dev preview (§17.2).                                                                                 |

`.dev.vars.example` gains `DEV_EMAIL_PREVIEW=true` and a note that
`EMAIL_PROVIDER=console` now also prints attachments.

---

## 15. File-level change plan

Respects the structure limits (<400 lines per file, <30 files per directory,
4 levels below `src/`, kebab-case, plural feature folders, no `utils/`).

### `packages/email`

| File                               | Change                                                                                                           |
| ---------------------------------- | ---------------------------------------------------------------------------------------------------------------- |
| `src/identity.ts`                  | new — office constants (§4.2)                                                                                    |
| `src/shell.ts`                     | new — shell, escaping, facts, button, text rendering                                                             |
| `src/format.ts`                    | new — Manila date helpers                                                                                        |
| `src/samples.ts`                   | new — preview/test fixtures                                                                                      |
| `src/provider.ts`                  | extend types (§7.2); add the `EmailKind` union (§5)                                                              |
| `src/templates/report-events.ts`   | rewrite: `submitted`, `resubmitted`, `receipt`, `returned`, `endorsed`, `approved`, `reminder`                   |
| `src/templates/account-events.ts`  | rewrite: `verify`, `reset`, `roleAssigned`, `accountActivated`, `accountDisabled`; remove `roleApprovedTemplate` |
| `src/templates/operations.ts`      | new — `workbookMail`, `failureDigest`                                                                            |
| `src/adapters/resend.ts`           | attachments, idempotency header                                                                                  |
| `src/adapters/console.ts`          | print attachment names/sizes                                                                                     |
| `src/adapters/cloudflare-email.ts` | comment only: notes the 5 MiB cap and that it remains unimplemented                                              |
| `src/index.ts`                     | exports                                                                                                          |

### `apps/api`

| File                                                           | Change                                                                                    |
| -------------------------------------------------------------- | ----------------------------------------------------------------------------------------- |
| `src/email/queue.ts`                                           | job type with `outboxId` + refs; consumer loads R2, updates outbox, final-attempt failure |
| `src/email/outbox.ts`                                          | new — create/mark/requeue helpers over the queries                                        |
| `src/email/attachments.ts`                                     | new — refs → `EmailAttachment[]`, size cap, missing-object policy                         |
| `src/email/provider.ts`                                        | unchanged selection                                                                       |
| `src/email/auth-mail.ts`                                       | new kinds, shell content, origin-aware links unchanged                                    |
| `src/features/notifications/application/notify.ts`             | preference check, outbox references, `suppress()` helper                                  |
| `src/features/notifications/application/notification-email.ts` | map all kinds, attachments, per-kind copy                                                 |
| `src/features/reports/application/render-facsimile.ts`         | new — the renderer currently trapped in `pdf-routes.ts`, usable without a `Context`       |
| `src/features/reports/pdf-routes.ts`                           | call the extracted renderer                                                               |
| `src/features/reports/application/receipt-mail.ts`             | new — render + store PAR PDF, send `RECEIPT`                                              |
| `src/features/reports/application/report-events.ts`            | actor suppression, resubmitted kind, acknowledgement attachment, receipt call             |
| `src/features/users/application/user-actions.ts`               | `ROLE_ASSIGNED`, `ACCOUNT_ACTIVATED`, `ACCOUNT_DISABLED`                                  |
| `src/features/reminders/domain/select-due.ts`                  | new — pure selection                                                                      |
| `src/features/reminders/application/send-reminders.ts`         | new                                                                                       |
| `src/cron/reminders.ts`                                        | new — gate + summary log                                                                  |
| `src/cron/scheduled.ts`                                        | call the reminder sweep and the failure digest                                            |
| `src/features/exports/application/send-workbook.ts`            | new                                                                                       |
| `src/features/exports/routes.ts`                               | `POST /monitoring/send`, address validation, rate limit, audit                            |
| `src/features/emails/routes.ts`                                | new — admin list + resend                                                                 |
| `src/features/profile/routes.ts`                               | email-preferences GET/PATCH                                                               |
| `src/dev/email-preview.ts`                                     | new — dev-only HTML preview router                                                        |
| `src/app.ts`                                                   | mount `/emails`, preferences, dev preview when `DEV_EMAIL_PREVIEW === 'true'`             |

### `packages/db`

| File                          | Change                                                 |
| ----------------------------- | ------------------------------------------------------ |
| `src/schema/identity.ts`      | two preference columns                                 |
| `src/schema/operations.ts`    | `SUPPRESSED` status; comment on `payload`/`last_error` |
| `src/queries/email-outbox.ts` | metadata queries (§9.3)                                |
| `src/queries/reports.ts`      | `listWaitingSince(status, sinceIso)`                   |
| `migrations/*`                | one generated migration (`pnpm db:generate`)           |

### `packages/export`

| File                                                           | Change                            |
| -------------------------------------------------------------- | --------------------------------- |
| `src/facsimile/layout.ts`                                      | office line matches §4.2          |
| `src/acknowledgement/pdf.ts`                                   | office line matches §4.2          |
| `src/acknowledgement/pdf.test.ts`, `src/facsimile/pdf.test.ts` | assert the exact line (guards D6) |

### `apps/web`

| File                                                              | Change                                                       |
| ----------------------------------------------------------------- | ------------------------------------------------------------ |
| `src/routes/admin/emails/+page.svelte`                            | new thin route                                               |
| `src/lib/features/email-log/presentation/AdminEmailsPage.svelte`  | new                                                          |
| `src/lib/features/email-log/presentation/EmailLogTable.svelte`    | new                                                          |
| `src/lib/features/email-log/presentation/EmailLogFilters.svelte`  | new                                                          |
| `src/lib/features/email-log/application/email-log.ts`             | new — fetch, filters, resend                                 |
| `src/lib/features/exports/presentation/SendWorkbookDialog.svelte` | new                                                          |
| `src/lib/features/queues/presentation/DecisionDrawer.svelte`      | no visual change; the checkbox's meaning is documented in §8 |
| `src/lib/features/exports/presentation/ExportPage.svelte`         | add the action                                               |
| `src/lib/features/profile/presentation/EmailPreferences.svelte`   | new section                                                  |
| `src/lib/features/profile/presentation/AccountCard.svelte`        | mount the section                                            |
| `src/lib/navigation/navigation.ts`                                | Admin tab `Email log` → `/admin/emails`                      |

### `docs`

| File                                  | Change                                                       |
| ------------------------------------- | ------------------------------------------------------------ |
| `docs/spec/email-integration-spec.md` | this file                                                    |
| `docs/spec/ui/17-email.md`            | new phase checklist (acceptance-style, like 00–16)           |
| `docs/spec/ui/README.md`              | register phase 17                                            |
| `docs/runbooks/incident.md`           | extend the failed-email section with the log page and resend |
| `docs/runbooks/README.md`             | note the failure digest                                      |

---

## 16. UI work

Three surfaces, no more:

1. **`/admin/emails`** — log table (§9.4). Uses `EmailLogTable`,
   `EmailLogFilters`, shared `EmptyState`/`ErrorState`/pagination, status chips
   as text plus tint (never color alone). One filled navy primary button per
   screen: the resend confirm is the only candidate, and the dialog's confirm is
   the screen's primary.
2. **Exports** — a secondary `Send by email` action and a dialog (§11.4). The
   existing download stays the primary.
3. **Profile** — an Email section with two switches (§8).

Constraints from `AGENTS.md` and `00-foundation.md`: Svelte 5 runes, no new
primitives, desktop-only widths (the foundation notice applies below 1024 px),
Asia/Manila times, English only, no exclamation marks, keyboard reachable but
never required.

---

## 17. Verification

### 17.1 Tests (beside source, `*.test.ts`, no config)

| Area             | Test                                                                                                                                                                                |
| ---------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Shell            | escaping (`<script>` in a title renders as text), signature block present in both parts, subject tag, plain-text width, no `http://` outside links, no external font/image URL      |
| Templates        | one snapshot per kind (`html` + `text`) driven by `samples.ts`                                                                                                                      |
| Format           | Manila date rendering across a UTC boundary (`2026-10-13T22:30Z` → 14 Oct)                                                                                                          |
| Attachments      | ref → attachment, base64 round-trip, 8 MiB cap drops and annotates, missing object fails loudly                                                                                     |
| Outbox           | row written `QUEUED`, `SENT` on success, `FAILED` on final attempt with attempts count, `SUPPRESSED` reasons                                                                        |
| Reminders        | due selection: 2 days no, 3 days yes, weekend gap, repeat suppressed within 3 working days, owner excluded, muted excluded, wrong status excluded                                   |
| Preferences      | muted category skips mail but still writes the inbox row; account mail ignores the mute; a return with the checkbox ticked is suppressed when the submitter has muted workflow mail |
| Workbook mailing | domain rejection, five-recipient cap, dedupe, rate limit, audit written                                                                                                             |
| Provider         | Resend body includes attachments and idempotency header (existing adapter test extended)                                                                                            |
| PDF identity     | acknowledgement and facsimile contain the `.eml` office line                                                                                                                        |

Committed commands:

```bash
pnpm --filter @par/email exec vitest run
pnpm --filter @par/api exec vitest run
pnpm --filter @par/db exec vitest run
pnpm db:generate            # must leave migrations clean afterwards
pnpm db:migrate             # local D1
pnpm verify                 # lint -> typecheck -> test
```

### 17.2 Dev preview (D24)

The API serves a dev-only HTML index at `GET /api/v1/dev/emails` listing every
template and rendering each with `samples.ts`; `GET /api/v1/dev/emails/:kind`
returns the raw HTML with a `text/plain` sibling view. Mounted only when
`DEV_EMAIL_PREVIEW === 'true'`, never in production (absent var → 404).

Why not a web page: `apps/web` may import only `@par/shared` and platform
adapters, so the web app must not depend on `@par/email` to render templates.

### 17.3 Manual acceptance

1. `EMAIL_PROVIDER=console pnpm --filter @par/web --filter @par/api dev`.
2. Submit a draft → console shows `SUBMITTED` to each reviewer and `RECEIPT` to
   the submitter with `OVPCASSS-PAR-OFF-2026-0001.pdf` listed.
3. Return it → console shows `RETURNED` with the comment quoted.
4. Resubmit → `RESUBMITTED`, no second receipt.
5. Endorse → `ENDORSED`; approve → `APPROVED` naming the acknowledgement.
6. Reload `/api/v1/dev/emails`, open each message, and check the signature block,
   the navy band, the gold rule, and the plain-text alternative.
7. Backdate a submitted report three working days, run the reminder sweep
   directly, and see one `REMINDER` and none on a second run.
8. Stop the Resend path (bad key) and confirm the outbox shows `FAILED` with the
   provider's reason, the admin log lists it, and resend re-queues.
9. One real send: `EMAIL_PROVIDER=resend` with a real key, mail the monitoring
   workbook to `ovpcasss@buksu.edu.ph`, and check the attachment opens in Excel
   with the three sheets and the letterhead intact.

Test artifacts are checked against the acceptance list in §18, not just exit
codes.

---

## 18. Acceptance criteria

**Format**

- [ ] Every outbound kind renders the navy band, gold rule, `OVPCASSS`, and the
      four-line signature block from §4.2, in both HTML and plain text.
- [ ] No message contains an external font, stylesheet, image, or tracking URL.
- [ ] Subjects follow `[OVPCASSS PAR] …`, ≤78 characters, no exclamation marks.
- [ ] A report title containing `<b>x</b>` renders as literal text.
- [ ] The acknowledgement and facsimile PDFs print the `.eml` office line.

**Coverage**

- [ ] Steps 8, 9, 11, 12, 14, 16 and 18 of `PAR PROCESS` each produce a message
      to the right recipient; no step produces two.
- [ ] First submission sends exactly one receipt and one reviewer mail per
      reviewer; resubmission sends no receipt.
- [ ] The approval mail carries `OVPCASSS-Acknowledgement-{tracking}.pdf` when the
      PDF rendered, and never claims an attachment it does not carry.
- [ ] The receipt carries the PAR PDF as filed.

**Delivery**

- [ ] Each send writes one `email_outbox` row; the admin inbox failed count is
      non-zero when a send fails.
- [ ] No queue message exceeds 128 KB, including when the workbook is attached.
- [ ] A failed send never fails its workflow transition.
- [ ] `/admin/emails` lists, filters, and resends; resend preserves the original
      row.
- [ ] The daily digest is sent only when failures exist.

**Control**

- [ ] Muting a category stops its mail and keeps its in-app notification.
- [ ] Account/security mail cannot be muted.
- [ ] An actor never receives the mail for their own action; a submitter still
      receives their receipt and acknowledgement.
- [ ] Reminders stop when the queue moves, repeat no more often than every three
      working days, and match the on-screen queue age.
- [ ] Workbook mailing rejects a non-institutional address and a sixth recipient.

---

## 19. Rollout stages

Sequenced by D20; each stage is independently shippable and verifiable.

| Stage  | Content                                                                                                                          | Why first                                                                  |
| ------ | -------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------- |
| **E1** | `identity`, `shell`, `format`, rewritten templates, subject tag, escaping, PDF office-line fix                                   | Every later stage inherits the format; nothing is thrown away              |
| **E2** | Attachment types, R2 references through the queue, Resend attachments + idempotency, receipt, approval attachment, `RESUBMITTED` | The two documents the office files start arriving; queue limits are proven |
| **E3** | Preferences (migration + profile UI), account mail split, actor suppression                                                      | Small, user-visible, reduces annoyance before volume rises                 |
| **E4** | Outbox write path, admin log page + resend, failure digest                                                                       | Observability before more triggers exist                                   |
| **E5** | Reminders (feature + cron gate + inbox kind)                                                                                     | Needs the working-day rule and the outbox for de-duplication               |
| **E6** | Workbook mailing (API + dialog + guardrails)                                                                                     | Needs attachments and the export assembler, both settled by then           |
| **E7** | Phase 17 checklist, runbook updates, one real send                                                                               | Closes the milestone                                                       |

`pnpm verify` must be green at the end of every stage.

---

## 20. Out of scope, risks, and open questions

**Out of scope (stated, not implied)**

- Inbound mail, reply parsing, per-user reply-to addresses, threading (D3).
- Magic-link actions from mail (D7).
- Bounce and complaint webhooks: Resend's webhook needs a public signed endpoint
  and a suppression list; deferred, noted as the next reliability step.
- A DLQ consumer (`par-email-dlq` stays declared but unread); the consumer's
  final-attempt write makes failures visible without it.
- Cloudflare Email Service parity (D5), templating engines, i18n, scheduled
  "send later", read receipts, digests of notifications.
- The `email_outbox` rows are not pruned; a retention rule belongs with the audit
  retention decision (spec §14 Q10).

**Risks**

| Risk                                                                     | Mitigation                                                                    |
| ------------------------------------------------------------------------ | ----------------------------------------------------------------------------- |
| Resend's sending domain is unverified (spec §14 Q15 still open)          | The one real send is the acceptance gate; `EMAIL_FROM` stays configurable     |
| Reminder volume surprises the office                                     | 3 working days, one per report per 3 days, mute available, and the daily gate |
| A 3 MB PAR PDF plus a 1 MB acknowledgement on a 600 KB attachment budget | Cap is 8 MiB total; the oversize path drops the attachment and says so        |
| D1 row growth from the log                                               | Metadata-only `payload`; retention decision tracked above                     |
| Admin acts as every role and triggers a burst                            | Actor suppression plus per-recipient fan-out; no per-user cap yet (see Q3)    |
| Office name disagreement resurfaces                                      | One constant in `packages/email/src/identity.ts`, mirrored by a PDF test      |

**Open questions for the office**

1. **Is `ovpcasss@buksu.edu.ph` the address that should receive the failure
   digest and the workbook by default?** Assumed yes (`OFFICE_EMAIL`).
2. **Should reminders also nudge submitters whose drafts have been idle for a
   week?** Assumed no in this phase; drafts are the submitter's own business.
3. **Is a per-user daily mail cap (e.g. 10 messages) wanted?** Assumed no: the
   fan-out is bounded by the reviewer/approver count.
4. **Does the office want the workbook mailed to student addresses at all,** or
   only to `buksu.edu.ph` staff? Currently both domains are allowed because both
   are allowed to register.
5. **Retention for the email log** — 90 days? Tied to Q10 in the project spec.

---

## 21. Summary of what changes for a user

- A submitter gets a receipt with their PAR attached, a return with the comment,
  an approval with the signed acknowledgement, and a reminder-free wait.
- A reviewer gets a mail per submission (not their own), reminders for reports
  that have been waiting three working days, and no mail at all if they mute the
  category.
- An approver gets the endorsement, the same reminders, and the approval closes
  the loop.
- An admin gets the log with a resend, a digest when something failed, and the
  workbook in the office's inbox with one dialog.
- Everyone sees the office's own letterhead, the university signature block, and
  the tracking number in the subject line.
