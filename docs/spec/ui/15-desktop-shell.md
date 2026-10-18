# Phase 15 — Desktop shell

**Milestone:** M7
**Routes:** no new pages; the wizard and edit page keep their existing submit
affordance, and the facsimile gains webview print behaviour
**Depends on:** 01 (session), 06 (wizard/draft store), 07 (conflict dialog), 08
(print preview)
**Source:** `par-ui-ux-spec.md` §8.6, §7.4 (device-only drafts), §7.6 (409),
§7.8 (print in webview), §12; `apps/web/src/lib/platform/contracts.ts`,
`apps/desktop/README.md`

Desktop is the same SvelteKit bundle in a Tauri 2 Windows shell. Only storage,
the file dialog, and printing differ from the browser. There is no offline
submission.

---

## 1. Context for this run

- The shell owns the OS-bound capabilities. Components never call Tauri APIs
  directly; the adapters in `apps/web/src/lib/platform/` implement the existing
  contracts (`DraftStore`, `SecureTokenStore`, `FilePicker`) and the web
  fallbacks stay inert.
- Implement in this phase:
  - `tauri/draft-store.ts` — local SQLite (`sqlite:par-drafts.db`) via the Tauri
    SQL plugin.
  - `tauri/secure-token-store.ts` — OS credential store for the bearer token.
  - `tauri/file-picker.ts` — dialog plugin so uploads stream from disk.
- Verify the web `DraftStore` still uses IndexedDB and survives a reload; do not
  regress it.
- No new `Platform` capability is needed: there is no connectivity or outbox
  state to push. Do not add one.

---

## 2. What is desktop-only

- The session token in the OS credential store; it never appears in webview
  storage.
- The file dialog, so a 25 MB attachment is streamed from disk rather than held
  in memory.
- Print: `Ctrl+P` uses the webview print dialog with the same print CSS as the
  browser, and Download PDF matches the browser output (A4/15 mm, letterhead,
  page breaks, watermarks).
- Nothing else. No window-title or tray status, no "Pending uploads" menu item,
  no nav badge, no offline banner.

---

## 3. Submit

- Same as the web build: validate, upload attachments, submit; the server issues
  the tracking number.
- A failed submit keeps the draft in the local store and shows the standard error
  state. Nothing is queued and nothing syncs in the background.
- Conflict (409) uses the phase 07 dialog unchanged.
- Web build: a failed request gets the standard error state. Never render
  "Offline".

---

## 4. States and edge cases

- Desktop startup offline: drafts load from SQLite and the app is usable for
  drafting. Sign-in while offline is not supported in v1; show the standard
  sign-in error.
- File moved or deleted after it was picked: the attachment blocks submit with an
  adjacent reason naming the file, and offers re-attach.
- App closed mid-draft: the draft returns from SQLite on the next launch.
- Very large attachment: enforce the 25 MB limit at pick time, not at submit.

---

## 5. Acceptance checklist

- [ ] Tauri `DraftStore` persists to SQLite and survives an app restart; the web
      `DraftStore` remains IndexedDB-backed and survives a reload.
- [ ] `SecureTokenStore` uses the OS credential store; the token never appears in
      webview storage.
- [ ] File picker uses the Tauri dialog and streams from disk.
- [ ] Components never import Tauri APIs; one `Platform` interface serves both
      builds.
- [ ] No offline affordance exists in either build: no banner, no connectivity
      status, no outbox, no "Pending uploads" menu item, no queued-row chip.
- [ ] A failed submit keeps the draft and shows the standard error state; a
      device-only draft shows `—` for the tracking number.
- [ ] 409 opens the phase 07 conflict modal and never auto-merges.
- [ ] Print preview works in the WebView2 with A4/15 mm, letterhead, page breaks,
      footer, and watermarks.
- [ ] Desktop verification was performed on Windows (state the WebView2 version
      and scaling); any unverified item is reported as not verified.

---

## 6. Out of scope

- macOS/Linux builds.
- Offline submission, offline sign-in, offline review/approval decisions, and
  offline admin actions.
- Multi-device draft conflict resolution.
- Auto-update, installers, and code signing.

---

## 7. Open questions

1. Does print-to-PDF in WebView2 meet the A4/letterhead fidelity requirement, or
   should every PDF download come from the server?
2. Does the desktop build need SQLite drafts at all, given that IndexedDB also
   persists inside WebView2? Assumed yes for now: the plugin owns the app-data
   location and leaves room for a future outbox.
