# Bug phase 05 — A saved signature reaches the printable record

**Severity:** high (the printed record is the filed artefact; a missing signature
is a missing signature on paper)
**Surface:** `/profile` signature capture, the report's signature card, the
facsimile record `/reports/[id]`, its print preview `/reports/[id]?print=1`, and
the downloaded facsimile PDF
**Reported:** 2026-10-22
**Depends on:** none (works alongside the personnel-narrative flow: the person in
charge signs the narrative before submitting)
**Touches:** `apps/web/src/lib/features/reports/presentation/SignatureCard.svelte`,
`apps/web/src/lib/features/facsimile/presentation/FacsimilePage.svelte`,
`apps/web/src/lib/features/facsimile/application/facsimile-people.ts` (still reads
the retired field name; see note below), `apps/api/src/features/reports/signature-routes.ts`,
`apps/api/src/features/reports/application/render-facsimile.ts`,
`apps/api/src/features/reports/routes.ts` (the submit and approval transitions),
`packages/export/src/facsimile/pdf.ts`, `packages/export/src/facsimile/layout.ts`,
`packages/export/src/facsimile/pdf.test.ts`

---

## 1. What the office sees

The signature is drawn in Settings, saved, and shown on the profile with "Signed
…". The report then prints with an empty rule under **Submitted by**. Sometimes
the signature shows on screen but the downloaded PDF still has the empty rule.
The office signs the paper by hand before filing.

## 2. Verified current behaviour

Two independent defects, both visible as "the signature is missing":

1. **A profile signature is not a report signature.** `PUT /me/signature` saves
   the account image. A report prints the report's own snapshot, which is only
   populated by `PUT /reports/:id/signature` from `SignatureCard.svelte` ("Use my
   signature on file", or a fresh draw). Submitting a report never copies the
   profile image, so a user who saved once in Settings and then submitted gets an
   unsigned record. `report-detail.ts` builds `narrativeSignature` only from
   `row.narrativeSignatureKey && row.narrativeSignedAt`.

   Name note, because the tree is mid-flow-change: the contract now exposes
   `ReportDetail.narrativeSignature` and the columns are `narrativeSignatureKey` /
   `narrativeSignedAt`. `facsimile-people.ts#signatureBlock` still reads
   `detail.submitterSignature` and `SignatureCard.svelte` still types
   `ReportSubmitterSignature` against that retired field, so both must move to the
   narrative names as part of this phase — a signature cannot print from a field
   nobody writes.

2. **The PDF never draws an image at all.** `layout.ts#drawSignatures` prints
   `IV. SIGNATURES`, two rules, the names, and the approval date; the page has no
   image, and `FacsimilePdfData` carries no image field. So even a correctly
   snapshotted signature cannot appear in the downloaded PDF. The HTML print
   preview does render the image when `signatureUrl` resolves — that URL is a
   presigned R2 link, and when presigning is unavailable the API falls back to
   `/api/v1/reports/:id/signature/file`, which authenticates by cookie only, so the
   desktop shell (bearer token in the header) cannot load it.

## 3. Behaviour contract

1. **Saving in Settings is the only action required.** On submit — and on approve
   for the approving officer — if the report has no signature snapshot and the
   acting account has a signature on file, the API copies that image onto the
   record (`narrativeSignatureKey`, `narrativeSignedAt`) before the status
   changes. This is a snapshot, not a reference: replacing the profile image later
   never alters a submitted report.
2. **An explicit report signature wins.** An image chosen or drawn on the report
   card is kept; a report whose signature was removed is not silently re-signed on
   submit. (The card states this: removing before submit affects only what is on
   screen until submit.)
3. **The printable carries the snapshot in both shells.** The facsimile PDF
   embeds the snapshotted image above the **Submitted by** rule. The browser print
   preview shows the same image, in the same slot, at the same size. The desktop
   build prints it too.
4. **No image is a ruled line, never a placeholder.** When no signature exists,
   both renderings show the rule and the name, with nothing else — no "signature
   missing" copy on the paper.
5. **The approval side behaves the same way** and stays blank until the report is
   approved (open question 4 of the UI spec, unchanged).
6. **Images are fetched server-side by object key.** The PDF renderer reads the R2
   object in the Worker — never through a browser URL — so authentication, CSP,
   and presign availability cannot affect the downloaded file.
7. **A broken image never blocks.** If the object is missing, unreadable, or not a
   PNG/JPEG, the renderer draws the rule instead, the failure is logged with the
   report id, and approval and download still succeed.
8. **The screen uses an authenticated byte fetch when presigning is unavailable.**
   The signature `<img>` source is the presigned URL when the API returns one;
   otherwise the page fetches the bytes through `apiDownload` and uses an object
   URL, so a bearer-token client sees the image exactly as the browser does.
9. **Accessibility.** The image keeps its `alt` text ("Signature of <name>"), the
   aspect ratio is preserved, nothing is recoloured, and the print keeps readable
   contrast on the paper background.

## 4. Implementation notes

- **Snapshot on submit.** In the submit transition, when
  `report.narrativeSignatureKey` is null and the submitting user has
  `signatureKey`, copy the object to the report key
  (`reports/<id>/narrative-signature.<ext>`) and set both columns, in the same
  transaction as the status change. Reuse the copy helper in `signature-routes.ts`
  rather than adding a second image pipeline. Record the append-only audit event
  `SIGNATURE_ATTACHED` naming the acting account. Apply the same copy to the
  approval transition for the approver's image.
- **PDF images.** Extend `FacsimilePdfData` with
  `submitterSignature?: Uint8Array` and `approverSignature?: Uint8Array`;
  `render-facsimile.ts` loads them from `env.BUCKET.get(key)` in the existing
  `Promise.all`. In `pdf.ts`, detect PNG (`\x89PNG`) or JPEG (`\xFF\xD8`) before
  embedding with `doc.embedPng` / `doc.embedJpg`, wrap in `try/catch`, and pass the
  embedded image to `drawSignatures`.
- **Layout.** In `drawSignatures`, when an image is present, scale it to fit
  `column - 30` × 44 pt, bottom-align it 4 pt above the rule, and keep the existing
  name/date lines below. Do not move the rule, the labels, or the
  `page-break-inside: avoid` behaviour.
- **Screen source.** `report-detail.ts#imageUrl` already prefers a presigned URL
  and falls back to the file route. Add the byte-fetch fallback in
  `FacsimilePage.svelte` (and the signature card preview) rather than weakening
  the route's access check.
- **Print readiness.** `PrintPreview.svelte` already waits for every `img` before
  enabling Print; the signature image must be inside the sheet when that runs. Keep
  the `document.fonts.ready` wait.
- **Tests.** `packages/export/src/facsimile/pdf.test.ts`: with a small PNG, the
  produced document has one embedded image per signature and the byte length grows
  predictably; without one, it still renders and the image count is zero; with
  corrupt bytes, rendering succeeds. API test for the submit transition: profile
  signature present, report signature absent ⇒ columns set and audit written;
  report signature present ⇒ not overwritten; no profile signature ⇒ unchanged.

## 5. Acceptance checklist

- [ ] Save a signature in `/profile`, submit a report with no report-level
      signature: `GET /reports/:id` returns `narrativeSignature` with a URL, and the
      facsimile shows it.
- [ ] The facsimile screen shows that image above **Submitted by**.
- [ ] `?print=1` shows it inside the A4 sheet, and the browser print dialog shows
      it on the page (Print is enabled only after the image has loaded).
- [ ] The downloaded facsimile PDF shows the image above the rule, not the empty
      rule.
- [ ] Removing the report signature before submit and submitting leaves the record
      unsigned; the PDF shows only the rule.
- [ ] A report with no signature anywhere prints a rule with no placeholder text.
- [ ] A returned report still shows a blank **Approved by** side.
- [ ] Replacing the profile image after submission does not change the submitted
      report's printed signature.
- [ ] The same checks pass in the desktop shell (bearer token, no cookie).
- [ ] A corrupt or missing R2 object still yields a complete PDF and does not fail
      approval.
- [ ] `pnpm --filter @par/export exec vitest run` and `pnpm verify` pass.

## 6. Out of scope

- Cryptographic or certificate-based signing, timestamp authorities, and signature
  verification.
- Signing the OVPCASSS-F-013 acknowledgment receipt (its signatory block is fixed
  configuration and carries no image).
- A second signature slot for a co-signer.
- Changing the signature upload limits, formats, or background removal.

## 7. Open question

Does removing a signature on the report card need to survive submit? This phase
says no: the snapshot happens at submit, which is the same moment the office files
the record. If the office wants a deliberate "no signature" state, it needs a
stored flag, not an absent image.
