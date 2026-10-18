# Phase 01 — Auth and account

**Milestone:** M1 (signature card deferred to phase 09 / M4)
**Routes:** `/login`, `/register`, `/verify-email`, `/forgot-password`,
`/reset-password`, `/awaiting-approval`, `/profile`
**Depends on:** 00-foundation (shell primitives, tokens, auth layout wrapper,
`ToastRegion`, `ErrorState`)
**Source:** `par-ui-ux-spec.md` §5.1, §7.1, §7.2, §7.14 (account + password),
§8.4, §11

Build the public entry points and the account page. No app chrome on auth or
status pages; profile uses the full shell.

---

## 1. Context for this run

- Palette, type, spacing, focus ring, and form rules come from
  `00-foundation.md`. The auth card uses `--surface-cream` for the page and
  `--surface-card` for the card.
- One primary action per screen: **Sign in**, **Create account**, **Send link**,
  **Set password**, **Save** (profile). Everything else is a text or outline
  action.
- Language is formal institutional English. Never reveal whether an email has an
  account.
- Auth and awaiting-approval pages are exempt from the <1024 px "designed for
  1024 px and wider" notice; they must remain usable at narrow widths.
- Status routing after sign-in uses the API's account status, never a guess:
  `ACTIVE` → `/`; `PENDING_ROLE` → `/awaiting-approval`;
  `PENDING_VERIFICATION` → verify screen with resend.
- Inputs: labels above, 32 px control height, 36 px primary button, 16 px
  error gap. Validate on blur and submit, never while typing.
- All auth pages sit in the shared auth layout: cream page, centered 400 px white
  card, 64 px seal above the title, no top bar, no tab row.

---

## 2. Sign in (`/login`)

Roles: public. Layout: auth layout.

```
┌────────────────────────── cream page ───────────────────────────┐
│                          [seal]                                 │
│              OVPCASSS Paperless PAR                              │
│              Sign in to submit and track reports                 │
│   ┌──────────────────────────────────────────────────────┐      │
│   │ University email                                     │      │
│   │ [_______________________________________________]    │      │
│   │ Password                              Forgot?        │      │
│   │ [_______________________________________________]    │      │
│   │ [ Sign in ]                                          │      │
│   │ New here? Create an account                          │      │
│   └──────────────────────────────────────────────────────┘      │
│   Authorized use only. Activity is recorded in the audit log.    │
└──────────────────────────────────────────────────────────────────┘
```

- Email input `autocomplete="username"`, password
  `autocomplete="current-password"`; Enter submits.
- Errors: one inline alert above the fields with a uniform message ("Email or
  password is incorrect") plus per-field errors when the format is wrong. Never
  reveal whether an account exists.
- After sign-in, route by status: `ACTIVE` → `/`; `PENDING_ROLE` →
  `/awaiting-approval`; `PENDING_VERIFICATION` → verify screen with resend.
- "Forgot?" links to `/forgot-password`; "Create an account" links to
  `/register`.
- The audit notice is a static footer line, not a dismissible banner.
- Loading: button disabled, label "Signing in…", no layout shift.

---

## 3. Register, verify, reset (`/register`, `/verify-email`, `/forgot-password`,

`/reset-password`)

Same auth card, same spacing.

### Register

- Fields: full name, university email, campus/unit, contact number, password,
  confirm password.
- Allowed-domain hint under email: "Use your @<domain> address." The domain comes
  from configuration/API, never hardcoded in the component.
- After submit: account is `PENDING_VERIFICATION`; show the verify-email
  instruction page. Do not sign the user in.
- Password rules and strength are text-based. Never color-only.

### Verify email

- Instruction page: what to do, the address used, **Resend link** as the only
  primary action, and a 60-second cooldown on the resend button. Cooldown shows
  remaining seconds and resets on reload.
- No polling. The user refreshes when they have verified; include a "I have
  verified" link back to sign-in.
- Success state after verification: confirmation copy and a Sign in action.

### Forgot password

- One email field, **Send link**. Confirmation is uniform ("If that address has
  an account, a reset link is on its way") and never reveals existence.
- No password fields on this screen.

### Reset password

- One password field plus confirm, both `autocomplete="new-password"`.
- Strength meter is text-only ("Strong — 12 characters, mixed case").
- Invalid/expired token: full-card error explaining the link is invalid or
  expired, with a link to request a new one. Do not show the form.
- Success: confirmation plus Sign in.

---

## 4. Awaiting role approval (`/awaiting-approval`)

Roles: `PENDING_ROLE`. No app chrome.

- Seal, title "Your account is awaiting role assignment", the user's email, and a
  static 3-step timeline: **Verified → Role assigned → Active**. Current stage
  marked with text, not color alone.
- Copy explains that an administrator assigns the role and that no action is
  needed; do not promise a time frame.
- **Sign out** is the primary action. No polling; refresh is manual.
- If the API reports the account is no longer `PENDING_ROLE`, show the correct
  next destination instead of a dead page.

---

## 5. Profile (`/profile`)

Roles: all. Two columns at ≥1024 px; stacked below. Page header title "Profile",
one filled navy **Save** (account card); the password card uses an outline
**Update password** action so the page still has one primary button.

### Account card

Fields: full name, email (read-only, with a short "Contact the administrator to
change this" note), role (read-only), campus/unit, contact number. Show the
signed-in role with the same label used in the avatar menu.

- Save validates name and contact fields; disabled while clean.
- Success toast "Profile saved"; errors use the standard inline + summary rules.
- Changing role or email is not possible here.

### Password card

Current password, new password, confirm new password. All
`autocomplete="current-password"` / `new-password`.

- **Update password** validates the current password server-side; field-level
  errors stay on the card.
- Clear all three fields after success; toast "Password updated".
- Strength feedback is text-only.
- No password is ever prefilled.

### Signature card (deferred)

APPROVER users get a **Signature** card in phase 09/M4 at this same route. Do not
build the canvas, tabs, or placeholder copy here. Leave the page structure so the
card can be appended below Password without a redesign.

---

## 6. Shared states

- Submit failures: inline alert at the top of the card with the request id only
  when the API supplies one; Retry where retry is safe (resend, sign in), never
  for validation.
- Network failure: standard error copy, not an offline banner; the draft is kept
  and the user retries when the connection returns.
- Disabled resend shows the reason adjacent ("Available in 42 s"), never a
  tooltip alone.
- All pages keep a visible focus ring, logical tab order, and Enter submit.

---

## 7. Acceptance checklist

- [ ] Auth layout matches: cream page, 400 px card, 64 px seal, no app chrome;
      usable below 1024 px.
- [ ] Sign-in email/password autocomplete attributes are correct and Enter
      submits.
- [ ] Wrong credentials produce one uniform alert and no indication whether the
      email exists.
- [ ] Post-sign-in routing covers `ACTIVE`, `PENDING_ROLE`, and
      `PENDING_VERIFICATION` exactly.
- [ ] Register uses the configured domain in the hint; success lands on
      verify-email, not the inbox.
- [ ] Resend countdown starts at 60 s, counts down, disables the button, and shows
      the remaining time as text.
- [ ] Forgot-password confirmation does not reveal account existence.
- [ ] Reset with an invalid/expired token shows the error state and a request-new
      link; valid reset requires matching confirm and text-only strength.
- [ ] Awaiting-approval shows the three-stage timeline, the user's email, Sign
      out, and no polling; it remains usable below 1024 px.
- [ ] Profile email and role are read-only; account save is the only filled navy
      button; password update is outline and clears fields on success.
- [ ] No signature canvas or signature placeholder is present.
- [ ] Errors are announced (`role="alert"`/`aria-live`), focused, and linked to
      fields; labels are programmatically associated.
- [ ] `pnpm lint`, `pnpm typecheck`, and `pnpm build` results reported.

## 8. Out of scope

- Role assignment and user administration (phase 03).
- Email delivery implementation (backend).
- Signature capture and approval signature checks (phase 09).
- SSO, social login, MFA (out of scope for v1).

## 9. Open questions

1. Confirm the allowed email domain(s) and whether the hint shows one or several.
2. Is verification required before role approval, or can an admin assign a role
   to an unverified account? The timeline assumes Verified first.
