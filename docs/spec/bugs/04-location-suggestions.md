# Bug phase 04 — The location field suggests addresses the office already used

**Severity:** medium (every report re-types the same venues by hand)
**Surface:** `/reports/new` step 2 (`Location`); the admin record form's details
step; returned-report editing
**Reported:** 2026-10-22
**Depends on:** none
**Touches:** `apps/web/src/lib/features/reports/presentation/WizardStepDetails.svelte`,
a new `apps/web/src/lib/features/reports/presentation/LocationField.svelte`,
`apps/web/src/lib/features/reports/application/location-suggestions.ts` (+ test),
`apps/web/src/lib/api/*`, `apps/api/src/features/locations/` (new feature folder),
`packages/shared/src/contracts/reports.ts`

---

## 1. What the office sees

Location is an empty text box with the hint "Barangay, municipality, or venue."
The same activity hall, gymnasium, and barangay are typed again for every report,
each time with different spelling and punctuation, so the repository cannot group
them and the monitoring sheet prints near-duplicates. Typing a full address by
hand on a laptop in the field is the slowest field in the wizard.

## 2. Verified current behaviour

- `WizardStepDetails.svelte` renders a plain
  `<input id="wiz-location" type="text" maxlength="300">` and nothing else.
- `reports.location` is free text (shared contract `reportFormSchema`); every
  submitted or approved report already stores one.
- There is no reference-data list for locations and no suggestion source of any
  kind. Reference data covers campuses, units, programs, departments, offices,
  levels, terms, SDGs, and attachment requirements only.
- The desktop shell must keep working with no network; the Tauri CSP allows only
  the API host (`apps/desktop/src-tauri/tauri.conf.json`), so a browser call to a
  third-party address service would be blocked and would leak the request.

## 3. Behaviour contract

### 3.1 Reusable locations (ships first, no provider)

1. **The office's own locations become the suggestions.** Focusing the field shows
   up to eight locations, most recently used first, case-insensitively
   deduplicated, taken from the reports this account may read. No new list for an
   administrator to maintain, and nothing to seed.
2. **It is a combobox, not a picker.** Free text remains valid and is the default:
   typing narrows the suggestions; ArrowDown/ArrowUp move; Enter accepts the
   highlighted suggestion; Escape closes the list and keeps the typed text; Tab
   leaves the field with the typed text. Clicking a suggestion fills the field
   verbatim.
3. **The typed value is what is saved.** A picked suggestion is stored as plain
   text, not as an id, so a report written before a rename still reads correctly
   and the field stays compatible with the printed form.
4. **The list never blocks the field.** No spinner, no disabled state, no error
   inside the field when the suggestion request fails: a failure leaves the field
   as a plain text input. The list is not a required step.
5. **One small read endpoint.** `GET /api/v1/locations?q=<text>&limit=8` returns
   `{ items: [{ location: string, lastUsedAt: string }] }`, scoped to the caller's
   readable reports (`ADMIN` and `PERSONNEL`), capped at 8, ordered by
   `max(updated_at)` descending. Empty `q` returns the eight most recent. No
   pagination, no total, no search of narrative text.
6. **Keyboard and screen reader.** `role="combobox"`, `aria-expanded`,
   `aria-controls`, `aria-activedescendant`, `aria-autocomplete="list"`; the list
   is a `listbox` of `option`s; the field announces "3 suggestions available" once
   per opening, not on every keystroke.

### 3.2 Geo assist (optional, off by default)

7. **Behind a configuration flag, never a button.** When `LOCATION_SUGGEST_URL` is
   set on the Worker, `GET /api/v1/locations/suggest?q=` proxies to it server-side
   with `LOCATION_SUGGEST_KEY` (a Worker secret), 250 ms after typing stops, for
   queries of four characters or more, and returns the same shape as 3.1 with a
   `source: 'address'` marker. With the variable absent the route answers
   `{ items: [] }` and the field shows only 3.1 suggestions.
8. **Picking an address fills the readable address only.** No latitude, longitude,
   place id, or map is stored; the form contract is unchanged. The provider's
   display label is normalised to one line and trimmed to the 300-character limit.
9. **The key never reaches the browser and the CSP is unchanged.** The call is
   `apiFetch` to our own origin; no external script, font, or image is loaded.
10. **Provider choice is an office decision.** The Gravity Index catalog has no
    geocoding service, so nothing can be provisioned automatically. Options are a
    keyless, type-ahead-friendly endpoint (Photon/OpenStreetMap) or a keyed one
    (Mapbox, Google) if the office wants rooftop precision and accepts an account.
    Either way only the two Worker variables exist and the code path is identical.
11. **Cached for the session.** Suggestions for a repeated query within one wizard
    session come from memory; the API is never called twice for the same string.

## 4. Implementation notes

- New **feature folder** `apps/api/src/features/locations/` with `routes.ts` and
  `application/suggest-locations.ts`, registered in `app.ts` beside the report
  routes. One query for 3.1, built on the existing report queries (do not add a
  table); the proxy in `suggest-locations.ts` guards the response with a Zod
  schema and a 2-second timeout.
- Shared contract: `packages/shared/src/contracts/locations.ts` with
  `locationSuggestionSchema` and `locationSuggestionsResponseSchema`, imported by
  both sides. Export it from `packages/shared/src/index.ts`.
- Web: `location-suggestions.ts` holds the pure parts — normalising, deduplicating
  case-insensitively, ranking by recency, filtering by prefix-then-substring, and
  merging office and address results (office first). Component
  `LocationField.svelte` owns the combobox; `WizardStepDetails.svelte` swaps its
  input for it and keeps `id="wiz-location"` so focus management, the blur
  validation (`fieldFromDomId`), and the error wiring keep working.
- The combobox must respect phase 02: opening or closing the list is not a blur of
  the field, and an untouched empty location never turns red.
- Debounce 150 ms for 3.1 (local query) and 250 ms for 3.2; abort in-flight
  requests with `AbortSignal`; ignore responses for a stale query.
- Tests: pure ranking/dedup/normalisation cases in
  `location-suggestions.test.ts`; an API test for the 8-item cap, the ordering,
  and the absent-provider path; a component test through `svelte/server` for the
  accessible attributes.

## 5. Acceptance checklist

- [ ] Focus the Location field on a fresh report: up to eight previously used
      locations appear, most recent first, without typing.
- [ ] Type three characters: the list narrows; ArrowDown/Enter picks; Escape closes
      and keeps the text; Tab leaves the field.
- [ ] Free text is still accepted with no suggestion chosen, and it is saved
      verbatim.
- [ ] The same venue spelled with different case or trailing spaces appears once in
      the list.
- [ ] With the API unreachable, the field degrades to a plain text input with no
      error state and the report can still be submitted.
- [ ] With `LOCATION_SUGGEST_URL` unset, no external request is made and no error
      is shown; the route answers an empty list.
- [ ] With it set, typing four or more characters returns addresses labelled with
      their place name, and picking one fills only the readable address.
- [ ] No network request leaves the app for a third-party host in the browser or
      the desktop webview; the CSP file is unchanged.
- [ ] The field keeps its max length, its required state, its hint, and its
      placement in step 2.
- [ ] `pnpm verify` passes and the existing wizard tests still pass.

## 6. Out of scope

- A map, a pin, coordinates, or distance calculation.
- Editing or curating a locations list in Reference data.
- Correcting locations on existing reports.
- Search by location across the repository (it already searches the text).

## 7. Open question

Which provider, if any, does the office authorize for 3.2? Until answered, ship
3.1 alone: it removes the retyping, needs no account, keeps working offline, and
does not depend on a vendor decision.
