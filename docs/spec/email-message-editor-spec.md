# Admin-editable email messages — specification

**Status:** implemented 2026-11-02
**Surface:** `/admin/emails?tab=messages` (new third tab), `packages/email`, `packages/shared`, `apps/api`, `apps/web`
**Refines:** `email-integration-spec.md` §5 (catalogue), §6 (message format), §9.4 (admin page), §16 (UI), §17 (verification)
**Requested:** 2026-11-02

> "feature in admin, can edit or modify the message in the email send. not hardcoded by
> the system, and can see its preview"

The specs remain the source of truth. This document is newer and interview-backed, so it
wins for the copy of exported mail — but it **does not** change the shell layout, the
signature block, the subject tag, the outbox, or the delivery path. Where it touches those,
it says so explicitly.

---

## 1. The request

Today every word of every outbound message is a string literal in
`packages/email/src/templates/*.ts`. The office cannot change a sentence, a heading, a facts
label, or a subject without a deploy. The feature is:

1. An administrator edits the reader-facing copy of each outbound message.
2. The built-in copy stays available as the default and can be restored.
3. The administrator sees a faithful preview of the rendered message before saving.
4. Nothing about the message structure, identity, or delivery path is negotiable — the
   office edits **what it says**, not **how it is built**.

---

## 2. Decisions locked in the interview

| #   | Decision                                                                                                                                                       |
| --- | -------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| E1  | **All 15 `EMAIL_KINDS` are editable**, including `VERIFY`, `RESET`, `WORKBOOK`, and `FAILURE_DIGEST`. No kind is read-only.                                     |
| E2  | **Everything except the signature block is editable**: subject (after the tag), heading, greeting, body paragraphs, facts block, comment quote, action button, footer lines. |
| E3  | **Named tokens** (`{{referenceNo}}`) carry live values. A token list per kind offers only the values that kind actually sends.                                   |
| E4  | **Third tab** on `/admin/emails`, beside Log and Variables: **Messages**.                                                                                       |
| E5  | **Preview renders with the built-in sample record only** (`emailSamples()`), not real reports.                                                                  |
| E6  | **Split pane plus a full preview**: editor left, rendered mail right, updating as you type; a **Full preview** action opens it at full width.                    |
| E7  | **Save takes effect immediately** for the next message composed. No draft/publish step.                                                                         |
| E8  | **Restore per message and all**: one kind back to its built-in copy, and a Restore all defaults.                                                                |
| E9  | **A missing required token blocks the save**, naming the field and the token.                                                                                   |
| E10 | **Blocks are editable and removable**: facts, quote, action, and footer each carry an on/off switch and editable labels.                                        |
| E11 | **The API renders the preview**; the web app shows the returned HTML in a sandboxed iframe. `apps/web` still never imports `@par/email`.                        |
| E12 | **Audit event only.** One `SETTINGS_UPDATED` row per save or reset; no copy snapshots, no version history.                                                      |
| E13 | **Plain textarea plus token buttons.** No bold, no italic, no typed Markdown, no links in body text.                                                            |
| E14 | **Only that kind's real values** are offered as tokens; no token can render as an empty string by design.                                                       |
| E15 | **Last save wins.** No optimistic-concurrency refusal; two administrators editing one message means the later save is the one that stands.                      |
| E16 | **No test send from this page.** The Variables tab already proves delivery.                                                                                     |
| E17 | **Queued mail keeps the copy it was queued with.** An edit reaches the next message composed, never one already in the outbox.                                   |
| E18 | **The greeting is editable** ("Good day." becomes the first body line); the hidden inbox preheader keeps following the first body paragraph automatically.       |
| E19 | **The subject tag stays automatic.** The administrator edits everything after `[OVPCASSS PAR] `, capped so the whole subject stays within 78 characters.         |
| E20 | **A deploy that changes a default keeps the office's copy silently.** The list just says Edited; no drift warning, no notice.                                    |
| E21 | **Each list row shows** the kind, its audience, Default or Edited, and the last edit (when and by whom).                                                        |

---

## 3. What exists today (audit)

| Piece                           | Reality                                                                                                                                                                                    |
| ------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `packages/email/src/shell.ts`   | `renderShell(input: ShellInput)` builds HTML + text and prefixes `EMAIL_SUBJECT_TAG`. Hardcodes `Good day.`, the header band, the gold rule, the signature block, and the reply notice. |
| `packages/email/src/templates/` | `account-events.ts` (5 kinds), `narrative-events.ts` (8 kinds), `operations.ts` (2 kinds). Every subject, heading, paragraph, fact label, and button label is a literal.                    |
| `packages/email/src/samples.ts` | One sample dataset per kind; drives the dev preview and the snapshot tests. Reusable as-is.                                                                                                 |
| `apps/api/src/dev/email-preview.ts` | Dev-only HTML index of every kind, mounted when `DEV_EMAIL_PREVIEW === 'true'`. Proves the render path already has an HTML-by-kind surface.                                                |
| `packages/shared/src/contracts/email.ts` | `EMAIL_KINDS` (15), `EMAIL_KIND_LABELS`, `EMAIL_KIND_CATEGORIES`, log query/row contracts.                                                                                              |
| `packages/db/src/schema/settings.ts` | `settings(key, value JSON, updated_at, updated_by_user_id)`, keyed for office-owned settings. `SETTING_KEYS = ['receipt-signatory', 'email-sender']`.                                  |
| `apps/api/src/features/settings/routes.ts` | Admin-only read/write of the signatory and the sender, audited as `SETTINGS_UPDATED` on `entityType: 'settings'`.                                                                     |
| `apps/web/src/lib/features/email-log/` | `AdminEmailsPage`, `EmailTabs`, `EmailVariablesPage`, `EmailMessageDialog`. Tabs are URL state via `email-tabs.ts`.                                                                      |
| `apps/api/src/email/outbox.ts`  | Stores the rendered message in R2 per row (`messageKey`); resend re-sends those exact bytes. Editing copy therefore cannot alter history.                                                 |

**Gap:** there is no store for copy, no token vocabulary, no preview outside the dev-only
API route, and no way to change a single word without editing TypeScript and redeploying.

---

## 4. The model: slots, not a message builder

The administrator does **not** compose a message from blocks. Each kind exposes a fixed set
of text **slots** that mirror the literals its template already has. The kind decides which
slots exist, which one of several bodies applies (the conditional branches), and in what
order they render. The administrator rewrites the strings and may switch optional blocks
off.

Why: `RECEIPT_ISSUED` has three mutually exclusive opening paragraphs
(attached / omitted / download-from-app). `ASSIGNED` has two (new account / existing
account). Flattening those into one editable paragraph would either lose the condition or
force the office to write copy for a case that never happens.

### 4.1 Slot catalogue

Every kind has these slots:

| Slot               | Type                          | Notes                                                                 |
| ------------------ | ----------------------------- | --------------------------------------------------------------------- |
| `subject`          | text, tokens                  | Rendered after the automatic tag.                                     |
| `heading`          | text, tokens                  | The single `h1`.                                                      |
| `greeting`         | text                          | Default `Good day.`; no tokens.                                       |
| `intro`            | up to 6 paragraphs, tokens    | Replaces the current `intro` array; branches become separate slots.   |
| `facts`            | block: on/off + rows          | Each row is a literal label plus exactly one token as its value.      |
| `quote`            | block: on/off + label + body  | Only on kinds that carry a quote.                                     |
| `action`           | block: on/off + label + token | The URL is a token chosen from the kind's list, never typed.          |
| `footer`           | block: on/off + two lines     | `reference` and `note`; the reply notice is a third, switchable line. |

Conditional slots, by kind (each renders only when its condition holds, exactly as today):

| Kind              | Conditional intro slots                                        |
| ----------------- | -------------------------------------------------------------- |
| `ASSIGNED`        | `newAccount`, `existingAccount`                                |
| `RECEIPT_ISSUED`  | `attached`, `omitted`, `none`                                  |
| `SUBMITTED`       | `submitterNamed`, `submitterUnknown`                           |
| `REMINDER`        | `withWaitingDays`, `withoutWaitingDays`                        |
| `RECORD_EDITED`   | `reasonPresent` (the quote block), otherwise the intro only    |
| All other kinds   | a single `default` intro array                                  |

The **signature block, header band, gold rule, logo, preheader derivation, subject tag, and
all markup** remain code. They are named in the editor's "Fixed parts" note so the office
knows why they cannot be changed.

### 4.2 Shape

```ts
// packages/email/src/copy.ts
export type EmailToken =
  | 'referenceNo' | 'title' | 'activityDate' | 'location'
  | 'picName' | 'submitterName' | 'comments' | 'approvedAt'
  | 'waitingDays' | 'changedFields' | 'reason'
  | 'fullName' | 'roleLabel' | 'roleDescription' | 'officeEmail'
  | 'reportCount' | 'schoolYear' | 'term' | 'sheet' | 'count' | 'generatedBy';

export interface EmailTemplateCopy {
  subject: string;
  heading: string;
  greeting: string;
  intro: Record<string, string[]>;        // branch key → paragraphs
  facts: { enabled: boolean; rows: { label: string; value: `{{${EmailToken}}}` }[] } | null;
  quote: { enabled: boolean; label: string; body: string } | null;
  action: { enabled: boolean; label: string; urlToken: `{{${EmailToken}}}` } | null;
  footer: { enabled: boolean; reference: string; note: string; replyNotice: boolean };
}
```

Facts values and action URLs are **exactly one token** — the schema rejects any other text.
That is how a `manilaDate()`-formatted value such as `2026-10-21` → `21 Oct 2026` stays
formatted by code rather than by a typo.

### 4.3 Token resolution

Tokens resolve from a flat `Record<string, string>` the template already builds from
`NarrativeEventData` / `AccountEventData`, plus the formatted derivatives the template
computes today:

| Token             | Source                                            | Rendered as                                   |
| ----------------- | ------------------------------------------------- | --------------------------------------------- |
| `referenceNo`     | data                                              | `AR No. 0001`                                 |
| `title`           | data                                              | as stored                                     |
| `activityDate`    | data                                              | `manilaDate(...)`                             |
| `approvedAt`      | data                                              | `manilaDate(...)` or `manilaDateTime(...)` per slot |
| `waitingDays`     | data                                              | `7 days`                                      |
| `changedFields`   | data                                              | comma-joined labels                           |
| `picName`/`submitterName` | data                                      | as stored, else the current fallback sentence  |
| `officeEmail`     | data or `DEFAULT_OFFICE_EMAIL`                    | address                                       |
| `url`-style tokens | `origin` + a fixed path                          | absolute URL; missing origin drops the block  |

An unknown token is a **save error**, not a render-time literal (E9). At render time an
unresolvable token — only reachable through a corrupt stored row — drops the containing
paragraph rather than printing `{{foo}}` into a recipient's inbox.

---

## 5. Storage

**Decision:** one `settings` row per kind, keyed `email-template:<KIND>`. No new table, no
migration.

- Per-kind rows mean two administrators editing different messages never clobber each
  other, and each row carries its own `updated_at` / `updated_by_user_id` for E21.
- The existing `settings` table was built for exactly this: "one row per key; the value is
  JSON so a setting can grow a shape later without another table."
- `SettingKey` widens to `'receipt-signatory' | 'email-sender' | \`email-template:${EmailKind}\``.
  `SETTING_KEYS` keeps the two fixed keys and gains a comment that template keys are
  derived; anything that iterates it is checked during implementation.
- A new query helper `listSettingsByPrefix(db, 'email-template:')` performs one `IN`/`LIKE`
  select so the list page and every send path cost one read, not fifteen.

**Absent row = built-in default.** Restore deletes the row. There is no "saved copy of the
defaults", so a deploy that improves a default improves it for every kind the office has not
edited — and, per E20, silently leaves the edited ones alone.

**Invalid row = default.** If a stored value fails the schema (an older shape, a manual DB
edit), the loader ignores it and the built-in copy is sent. Mail must never fail because a
settings row is malformed. The Messages list marks such a kind as Default and shows a quiet
"stored copy could not be read" note on the editor.

---

## 6. API

All routes live in `apps/api/src/features/settings/routes.ts` (they are settings, and the
audit shape already exists there), mounted under `/api/v1/settings`.

| Method   | Path                                  | Body                            | Response                                   |
| -------- | ------------------------------------- | ------------------------------- | ------------------------------------------ |
| `GET`    | `/email-templates`                    | —                               | `{ items: EmailTemplateSummary[] }`        |
| `GET`    | `/email-templates/:kind`              | —                               | `{ template: EmailTemplateDetail }`        |
| `PUT`    | `/email-templates/:kind`              | `{ copy: EmailTemplateCopy }`   | `{ template: EmailTemplateDetail }`        |
| `DELETE` | `/email-templates/:kind`              | —                               | `{ template: EmailTemplateDetail }`        |
| `DELETE` | `/email-templates`                    | —                               | `{ restored: number }`                     |
| `POST`   | `/email-templates/:kind/preview`      | `{ copy, format? }`             | `{ subject, html, text }`                  |

- `ADMIN` only, through the existing `requireRole('ADMIN')`; a non-admin gets `403`.
- `EmailTemplateSummary`: `kind`, `label`, `audience`, `edited`, `subject` (current),
  `updatedAt`, `updatedByName`.
- `EmailTemplateDetail`: `copy` in effect, `defaults`, `edited`, `tokens` (the kind's
  token list with a human label and one example value), `slots` (which optional blocks
  this kind has), `updatedAt`, `updatedByName`.
- `preview` renders the **submitted** copy, not the saved one, with `sampleFor(kind)` data
  and the request origin substituted for the logo URL (the same trick
  `apps/api/src/dev/email-preview.ts` uses). Nothing is written, nothing is sent, no rate
  limit — but the request body is capped at 32 KB.
- Every write is audited: `action: 'SETTINGS_UPDATED'`, `entityType: 'settings'`,
  `entityId: 'email-template:ASSIGNED'`, `comment: 'Edited the Assigned message'` (reset:
  `'Restored the Assigned message to the built-in copy'`). `DELETE /email-templates` writes
  one event naming the count.
- Contracts live in `packages/shared/src/contracts/email-templates.ts` and are exported
  from `packages/shared/src/index.ts`, so API and web validate the same shape.

### 6.1 Validation (Zod, `packages/shared`)

| Rule                     | Detail                                                                                              |
| ------------------------ | --------------------------------------------------------------------------------------------------- |
| Subject                  | 1–63 characters (78 minus the 15-character tag). No leading or trailing whitespace.                 |
| Heading                  | 1–120 characters.                                                                                   |
| Greeting                 | 1–60 characters.                                                                                    |
| Paragraphs               | 1–6 per branch, each 1–800 characters.                                                              |
| Facts                    | 0–6 rows; label 1–40; value must match exactly one offered token.                                    |
| Quote                    | label 1–60; body 1–2000 and must contain `{{comments}}` (or `{{reason}}`) where the kind requires it. |
| Action label             | 1–60.                                                                                               |
| Footer                   | reference 0–120, note 0–300.                                                                        |
| Required tokens          | Every kind declares `requiredTokens` per slot; missing on save ⇒ `400 TEMPLATE_TOKEN_MISSING` with `details: [{ path, token }]`. |
| No exclamation marks     | Refused with "The house voice has no exclamation marks." (AGENTS.md)                                 |
| No typed URLs            | Refused with "Links live in the button, not in the body text." — mail bodies carry no free-form URLs |
| Unknown token            | `400 TEMPLATE_TOKEN_UNKNOWN`, naming the token and the kind's allowed list                          |

Required tokens, concretely:

| Slot                                                | Required token        | Why                                                        |
| --------------------------------------------------- | --------------------- | ---------------------------------------------------------- |
| `subject` on the 9 report kinds                     | `{{referenceNo}}`     | §6.4: workflow mail always carries the tracking number, and clients thread on it |
| `RECEIVED`-style comment quote (`RETURNED`, `RECORD_EDITED`) | `{{comments}}` / `{{reason}}` | A return without the reason is useless            |
| `facts` row "Corrected fields" on `RECORD_EDITED`    | `{{changedFields}}`   | The point of the message                                   |
| `FAILURE_DIGEST` body                               | `{{count}}`           | The digest exists to carry the number                      |
| `REPORT_COUNT`/`sheet` on `WORKBOOK`                | `{{reportCount}}`     | The office files on it                                     |

---

## 7. Render path

```
notify() / auth-mail / user-actions / receipt-mail / send-workbook / send-digest
        │
        ├─ loadEmailCopy(env)            apps/api/src/email/copy-store.ts   (one read, per action)
        │
        ├─ composeEmail(kind, data, copy) apps/api/src/email/compose.ts      → EmailContent
        │      └─ @par/email: resolveCopy(kind, copy[kind] ?? defaults, data)
        │                      → renderShell(resolved ShellInput)
        │
        └─ enqueueEmail(...)             unchanged
```

- `resolveCopy()` lives in `packages/email/src/resolve.ts`; the slot defaults and token
  catalogue live in `packages/email/src/copy.ts`.
- Each template function keeps its signature but gains an optional final
  `copy?: EmailTemplateCopy` argument. Called with nothing, it renders today's exact bytes
  — the existing snapshot tests are the proof, and they must not change.
- `loadEmailCopy` memoises per request in `apps/api/src/email/copy-store.ts`; a failure to
  read the row logs and returns `{}` (defaults). A send must never fail because a setting
  could not be read (E17 is about stored mail; this is about availability).
- The outbox, queue, adapters, and `email_outbox` rows are untouched: the rendered message
  is still stored in R2 at compose time, which is what makes E17 true without new work.
- `DEV_EMAIL_PREVIEW` keeps working and gains a `?copy=saved` switch, so a developer can
  see the saved overrides exactly as a recipient would.

---

## 8. UI — `/admin/emails?tab=messages`

### 8.1 Frame

- `EMAIL_TABS` gains `{ key: 'messages', label: 'Messages', href: '/admin/emails?tab=messages' }`
  and `emailTabFromParams` recognises it. The Admin → Email tab stays lit; the URL
  reproduces the view.
- Page: `apps/web/src/lib/features/email-log/presentation/EmailMessagesPage.svelte`
  (route file `apps/web/src/routes/admin/emails/+page.svelte` already delegates by tab).
- Layout at ≥1440 px: a **240 px message list** · a **flexible editor column** · a
  **preview pane** ~46% of the content width. At 1024–1439 px: list collapses to a
  `<select>` "Message" control at the top of the editor, preview stays beside it. Below
  1024 px the foundation notice applies (email admin is desktop-only, like every admin
  surface).
- The split pane's preview scales the 600 px sheet to fit, with a **Full preview** button
  that opens it at natural width in a modal (E6).
- The screen's single filled navy primary button is **Save changes**. Preview, Restore, and
  Full preview are secondary/ghost.

### 8.2 List

One row per kind, ordered as `EMAIL_KINDS`:

```
Assigned                    Edited
Personnel in charge         Edited 2 Nov, 14:20 by A. Reyes
```

Each row carries: `EMAIL_KIND_LABELS[kind]`, the audience sentence (§5 of the email spec),
a **Default** or **Edited** chip (text plus tint, never color alone), and — when edited —
`Edited <Manila date> by <name>`. Selecting a row loads its editor. The list is a
`role="listbox"`-less set of buttons with `aria-current="true"` on the open one; arrow keys
move between rows.

### 8.3 Editor

Fields in order, each with its label, its token menu, and its length hint:

1. **Subject** — input, prefixed by a locked `[OVPCASSS PAR]` chip that cannot be removed.
2. **Heading** — input.
3. **Greeting** — input (default `Good day.`).
4. **Body** — one textarea per branch the kind has. Conditional branches are labelled
   ("When the receipt is attached", "When there is no waiting period") and shown with a
   muted chip so the office knows when each is used.
5. **Facts** — an on/off switch plus rows: label input + value select (the kind's tokens
   only). Add row / remove row up to 6.
6. **Comment quote** — on/off, label, body textarea (kinds that carry one).
7. **Button** — on/off, label input, URL select (tokens only).
8. **Footer** — on/off, reference input, note input, reply-notice switch.
9. A muted **Fixed parts** note: "The header, the university signature block, and the
   `[OVPCASSS PAR]` subject tag are part of the office's format and are not editable."

Below the fields: **Restore this message to the built-in copy** (secondary, opens a
`ConfirmDialog`) and, on the page header, **Restore all defaults** (in a menu, confirm
dialog naming that all 15 return to built-in copy).

### 8.4 Token affordance

Each text field has an **Insert value** button opening a small menu of that kind's tokens
with a human label and an example (`{{referenceNo}}` → "Reference no. — AR No. 0001").
Choosing one inserts the token at the caret and keeps focus. No typing of braces is
required; typing them by hand is allowed and validated on save.

### 8.5 Preview

- The right pane is a sandboxed `<iframe sandbox="" title="Preview of the Assigned message">`
  fed by `srcdoc` from the API's `html`. `sandbox=""` means no scripts, no same-origin, no
  navigation — an HTML mail document cannot reach the app.
- A **Subject / Plain text / HTML** segmented control above it: Subject is a one-line
  render, Plain text shows the `text` part in a monospace block (what the console provider
  and the snapshot tests see), HTML shows the iframe.
- Debounced 400 ms after the last keystroke; the previous render stays visible with an
  "Updating preview…" line. A preview failure shows an `ErrorState` inside the pane with
  Retry **without** clearing the last good render.
- The preview uses the sample record, and says so: "Previewed with the sample record: AR No.
  0001 — Coastal cleanup and mangrove planting." (E5)

### 8.6 States

| State                  | Behaviour                                                                                          |
| ---------------------- | -------------------------------------------------------------------------------------------------- |
| Loading                | Skeleton list rows and skeleton editor fields; preview pane shows a skeleton sheet.                 |
| No selection           | First kind (`ASSIGNED`) opens by default; there is no empty state to design.                        |
| Unsaved changes        | Switching kind or tab opens a `ConfirmDialog` ("Discard your edits to the Assigned message?").      |
| Save success           | Toast "Assigned message saved. It will be used for the next email sent." Row chip becomes Edited.   |
| Validation error       | Field-level messages plus a summary at the top of the editor naming every failing field; focus moves to the summary. |
| Save failure           | `ErrorState` banner, edits preserved, Save re-enabled.                                              |
| Restore                | Confirm dialog naming the kind; on success the editor refills with defaults and the chip returns to Default. |
| Stored copy unreadable | Quiet note above the fields; the editor shows the built-in copy, and saving overwrites the bad row. |
| Denied (non-admin)     | The API 403s; the route already refuses to render for a non-admin (`requireRole` on the page's data). |

---

## 9. Copy rules this feature must not break

- Formal institutional English; no exclamation marks; office terms verbatim (AGENTS.md).
- No free-form links in body text. A URL is only ever a kind's own app link, chosen as a
  token, so an edited message cannot become a phishing vector.
- All interpolated values are HTML-escaped by `escapeHtml()` in `shell.ts` — the editable
  text goes through the same funnel, so a `<script>` typed into a paragraph renders as text
  in the message (existing test extended to cover an override).
- The signature block, header band, logo, and subject tag are outside the editor.
- Timestamps in the list and audit are Asia/Manila; stored values stay UTC.

---

## 10. File-level change plan

Respects the structure limits (<400 lines per file, <30 files per directory, 4 levels under
`src/`, kebab-case, plural feature folders, no `utils/`).

### `packages/shared`

| File                                      | Change                                                             |
| ----------------------------------------- | ------------------------------------------------------------------ |
| `src/contracts/email-templates.ts`        | new — `emailTemplateCopySchema`, per-kind slot/token catalogue types, summary/detail/preview contracts, `requiredTokens` map |
| `src/contracts/email-templates.test.ts`   | new — validation rules of §6.1                                      |
| `src/index.ts`                            | export the new contracts                                            |

### `packages/email`

| File                                  | Change                                                                                     |
| ------------------------------------- | ------------------------------------------------------------------------------------------ |
| `src/copy.ts`                         | new — slot defaults per kind, token catalogue, example values, `defaultCopyFor(kind)`       |
| `src/resolve.ts`                      | new — `resolveCopy(kind, copy, data)` → `ShellInput`, token substitution, branch selection   |
| `src/copy.test.ts`, `src/resolve.test.ts` | new — every kind has a default; every token in a default resolves; unknown token handling |
| `src/templates/account-events.ts`     | accept optional `copy`, build the token map, call `resolveCopy`                             |
| `src/templates/narrative-events.ts`   | same                                                                                        |
| `src/templates/operations.ts`         | same                                                                                        |
| `src/shell.ts`                        | accept `greeting` in `ShellInput` (default `Good day.`); preheader still derives from `intro[0]` |
| `src/shell.test.ts`                   | add an override case: greeting, edited paragraph, hostile text still escaped                |
| `src/samples.ts`                      | expose `sampleDataFor(kind)` alongside `sampleFor` so the API can preview from data, not content |
| `src/index.ts`                        | export `copy`, `resolve`, defaults                                                          |

### `packages/db`

| File                          | Change                                                                 |
| ----------------------------- | ---------------------------------------------------------------------- |
| `src/schema/settings.ts`      | widen `SettingKey` with `email-template:${EmailKind}`; comment the prefix |
| `src/queries/settings.ts`     | add `listByPrefix(prefix)` and `delete(key)`                            |
| `src/queries/settings.test.ts` | extend for prefix listing and delete (no migration needed)             |

### `apps/api`

| File                                                     | Change                                                                 |
| -------------------------------------------------------- | ---------------------------------------------------------------------- |
| `src/email/copy-store.ts`                                | new — `loadEmailCopy(env)`, per-request memo, invalid row ⇒ default     |
| `src/email/compose.ts`                                   | new — `composeEmail(kind, data, copy)` used by every send path          |
| `src/features/settings/routes.ts`                        | six routes of §6, audit, preview renderer, 32 KB body cap               |
| `src/features/settings/application/email-templates.ts`   | new — read/resolve/validate/summarise, kept under 400 lines             |
| `src/features/notifications/application/notification-email.ts` | take `copy` and delegate to `composeEmail`                        |
| `src/features/notifications/application/notify.ts`       | load copy once, pass it through                                         |
| `src/email/auth-mail.ts`, `src/features/users/application/user-actions.ts`, `src/features/reports/application/receipt-mail.ts`, `src/features/exports/application/send-workbook.ts`, `src/features/emails/application/send-digest.ts` | load copy and pass it |
| `src/dev/email-preview.ts`                               | `?copy=saved` switch                                                    |

### `apps/web`

| File                                                              | Change                                              |
| ----------------------------------------------------------------- | --------------------------------------------------- |
| `src/lib/features/email-log/application/email-tabs.ts`            | add `messages`; parse it                             |
| `src/lib/features/email-log/application/email-messages.svelte.ts` | new — selection, draft state, dirty tracking, save, restore, debounced preview |
| `src/lib/features/email-log/application/email-templates.ts`       | new — token insertion at the caret, subject length math, audience text |
| `src/lib/features/email-log/presentation/EmailMessagesPage.svelte` | new — list + editor + preview frame                 |
| `src/lib/features/email-log/presentation/EmailMessageList.svelte` | new                                                  |
| `src/lib/features/email-log/presentation/EmailMessageEditor.svelte` | new — fields, blocks, token menus                  |
| `src/lib/features/email-log/presentation/EmailPreviewPane.svelte` | new — tabs, iframe, debounce, full-preview modal     |
| `src/lib/api/client.ts`                                           | `settings.emailTemplates.*` calls                    |

### Docs

| File                                  | Change                                        |
| ------------------------------------- | --------------------------------------------- |
| `docs/spec/email-message-editor-spec.md` | this file                                  |
| `docs/spec/ui/17-email.md`            | add the Messages tab to the phase checklist    |
| `docs/spec/email-integration-spec.md` | one line under §16 that copy is admin-owned, pointing here |
| `docs/runbooks/email-delivery.md`     | note where an administrator rewrites message copy |

---

## 11. Verification

| Area            | Test                                                                                                                                              |
| --------------- | ------------------------------------------------------------------------------------------------------------------------------------------------- |
| Defaults        | Every kind's built-in copy renders **byte-identical** HTML and text to today (existing snapshots unchanged).                                      |
| Catalogue       | Every `EMAIL_KINDS` entry has defaults, a token list, an audience, and at least one intro branch; a new kind without copy fails the test.         |
| Tokens          | Every token named in a default is in that kind's catalogue; a token from another kind is rejected; `{{nope}}` is rejected with `TEMPLATE_TOKEN_UNKNOWN`. |
| Escaping        | An override containing `<script>alert(1)</script>` renders escaped in HTML and literal in text.                                                    |
| Required tokens | Removing `{{referenceNo}}` from a workflow subject; removing `{{comments}}` from `RETURNED`; removing `{{count}}` from the digest — each refuses with the slot path. |
| Blocks          | Switching `facts` off removes the table from both HTML and text; switching the action off removes the button and the URL line; the signature survives untouched. |
| Copy rules      | Exclamation mark refused; typed `https://…` in a paragraph refused; 64-character subject refused.                                                 |
| API             | List returns 15 rows; PUT persists and audits; DELETE resets; DELETE all reports the count; non-admin 403; preview returns HTML with the sample value substituted and writes nothing. |
| Storage         | A malformed stored row is ignored and the default is sent; one broken row does not break the other 14.                                             |
| Sends           | `notify()` composes with the saved copy; an edit does not alter an existing `email_outbox` row's stored message (E17).                              |
| Web             | Tab appears for ADMIN only; list shows Default/Edited; the unedited draft is dirty-tracked; switching kind with edits asks first; the preview iframe carries `sandbox=""` and a title. |

Commands:

```bash
pnpm --filter @par/shared exec vitest run
pnpm --filter @par/email exec vitest run
pnpm --filter @par/api exec vitest run
pnpm --filter @par/web exec vitest run src/lib/features/email-log
pnpm typecheck
pnpm lint
```

`pnpm db:generate` must leave migrations clean — this feature needs no migration.

### 11.1 Manual acceptance

1. Sign in as ADMIN, open **Admin → Email → Messages**. All 15 kinds are listed, every one
   reading **Default**.
2. Open **Assigned**. Edit the heading, replace a paragraph, remove a facts row, turn the
   button off. The preview pane follows each change; the subject tab shows the tag chip
   ahead of the typed subject; Plain text shows the same copy.
3. Delete `{{referenceNo}}` from the subject. Save is refused and names that token.
4. Save. The row reads **Edited** with the Manila time and the admin's name; a toast says
   the copy is used for the next email sent.
5. Create a report for a new PIC. The console provider prints the edited copy, the facts
   block the admin kept, and no button.
6. Open the email log, open an earlier message, and confirm its stored copy is unchanged.
7. **Restore this message**; confirm; the editor shows the built-in copy and the row reads
   Default.
8. **Restore all defaults**; confirm; all 15 return to Default.
9. Resize to 1024 px and 1440 px: the list becomes a select and back; nothing overlaps; the
   preview stays legible.

---

## 12. Out of scope

- Rich text, bold, italic, lists, images, or typed Markdown in message copy.
- Changing the shell layout, the signature block, the header band, the logo, the gold rule,
  or the subject tag.
- Per-recipient or per-role copy variants; one copy per kind, office-wide.
- Draft/publish workflow, version history, or restore-to-previous-version (E7, E12).
- Editing messages already queued, sent, or stored in the outbox (E17).
- A test send from this page (E16).
- Editing the recipient, the attachments, or the send path.
- Personalisation beyond the token list (no recipient-time conditionals).
- Translations; the product is English only.

---

## 13. Assumptions and open questions

Stated rather than silently decided:

- **A1.** The action **URL is a token, never free text.** The office chooses which of the
  kind's own app links the button points at; it cannot type an arbitrary address. Reason:
  every workflow mail is an invitation to click, and the sender is a university office
  account. If the office needs a free-form URL, this is the first decision to revisit.
- **A2.** **`Good day.` becomes the greeting slot** (E18). The preheader keeps deriving from
  the first body paragraph, so a reworded opening also changes the hidden inbox line. If the
  office wants them independent, that is a fifth slot.
- **A3.** **Facts values are tokens only**, so a "Date" row cannot be given a hand-typed
  date. This preserves `manilaDate()` formatting; a literal value would be a second format
  to maintain.
- **A4.** **Copy is global, not per role.** `SUBMITTED` goes to the office; if a second
  audience is ever added, this spec's one-copy-per-kind rule needs revisiting.
- **A5.** **The list page is the only place copy is read.** The profile's mute switches and
  the sender settings are untouched by this feature.
- **A6.** **E20 means a default change is silent.** If a security fix to the verify copy is
  ever needed, the deploy cannot reach an edited `VERIFY` message — the runbook step would
  be "restore that kind, then redeploy". Worth confirming before the first such fix.

---

## 14. Definition of done

- [x] Admin → Email → Messages lists all 15 kinds with Default/Edited state and last edit.
- [x] Subject, heading, greeting, body branches, facts, quote, button, and footer are
      editable; blocks can be switched off; the signature block and tag cannot.
- [x] Tokens are offered per kind and inserted at the caret; unknown and missing required
      tokens refuse the save with the field named.
- [x] The split-pane preview renders through the API with the sample record, in HTML and
      plain text, inside a sandboxed iframe, and follows typing within half a second.
- [x] Saving applies to the next message composed and never to queued or stored mail.
- [x] Restore works per message and for all; both are audited.
- [x] Built-in defaults still render byte-identically to today's snapshots.
- [x] `pnpm typecheck`, `pnpm lint`, and the four package test commands pass; no migration
      is generated.
