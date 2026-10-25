# Login — close the empty top of the card and let the scarves ride behind the Google button

**Type:** refinement (spacing only)
**Surface:** `/login` and `/login?add=1`, browser and desktop shell
**Reported:** 2026-10-25
**Estimated diff:** one CSS declaration removed, one comment corrected
**Touches:** `apps/web/src/routes/login/+page.svelte`

---

## 1. What the office sees

The sign-in card opens with ~120 px of white above the "Sign in with Google"
button. The two woven scarves sit in the top corners and stop just above the
button, so the space between them and the first control reads as a gap rather
than as part of the decoration.

The approved picture: the card's top edge is the scarf line, and the button tucks
under it — the decorated band is the header of the card, not a strip floating
above it.

## 2. Verified current behaviour

- `apps/web/src/routes/login/+page.svelte:16-19` renders `<ScarfCorners />` and
  wraps the form in `.auth-card__content`.
- `apps/web/src/routes/login/+page.svelte:23-29` gives that wrapper
  `padding-top: 88px; position: relative; z-index: 1`.
- `apps/web/src/lib/components/AuthLayout.svelte:153-164` gives `.auth-card`
  `padding: clamp(22px, 3vw, 32px)`, `max-width: 440px`, `overflow: hidden`,
  `isolation: isolate`.
- Result today at 1440×900: 32 px card padding + 88 px wrapper = the button's top
  edge sits **120 px** below the card's top edge.
- `apps/web/src/lib/components/ScarfCorners.svelte:8-33`: the decoration layer is
  `position: absolute; inset: 0; overflow: hidden; pointer-events: none;
  z-index: 0`. Each PNG is `width: clamp(92px, 22vw, 118px); height: auto;
  top: -0.5rem; left/right: -0.75rem`.
- The PNGs are 300×380, so at a 440 px card they render **118 × 149 px**: the left
  scarf occupies x −12…106, the right x 334…452 (clipped by the card), both from
  y −8…141.
- Only `/login` has this wrapper and the scarves. `register`, `forgot-password`,
  `reset-password` and `verify-email` render their forms directly in the card with
  no wrapper and no decoration.
- `GoogleSignIn.svelte:124-127` renders the first control as a full-content-width
  `btn btn-outline` at 44 px tall, painted on `--surface-card` (opaque white).
- `LoginForm.svelte:136-161` stacks the alert (when present), then
  `GoogleSignIn` (only when Google is configured), then the "or" divider, the
  fields, and the primary button, in a `.form-stack` with a 16 px gap.

## 3. Behaviour contract

1. **The card's empty top goes away.** No decorative padding is added above the
   first control. The only space is the card's own padding.

   - The `padding-top: 88px` declaration is removed from `.auth-card__content`.
   - `position: relative; z-index: 1` stays: the scarf layer is a positioned
     `z-index: 0` box, so without the wrapper's stacking the scarf would paint
     over the form.
   - The card's `padding: clamp(22px, 3vw, 32px)` is **not** changed. The button
     therefore lands 22–32 px from the card's top edge (32 px at ≥1067 px wide),
     down from 120 px.
   - No magic number is introduced, no CSS custom property, no new token.

2. **The scarves do not move, resize, or restyle.** They keep their size, their
   `top: -0.5rem`, their −0.75 rem horizontal offset, their `aria-hidden`,
   `pointer-events: none`, and their clipping to the card radius. The button
   rising is what puts them behind it.

3. **The button is drawn over the scarf, not through it.** The button face stays
   opaque `--surface-card`; the scarf is visible only where the button does not
   reach. No opacity, blend mode, backdrop filter, or tint is added. The label,
   the Google mark, the 1 px border and the focus ring keep their current colours
   and contrast.

4. **What stays visible.** At a 440 px card: the two corner wedges, each reaching
   ~106 px inward and down to ~141 px, and the ~32 px strip of each wedge above
   the button. The scarves do not meet in the middle — the white gap between them
   is unchanged and is part of the design. The button's top corners sit on the
   scarf; its bottom half sits on white.

5. **Everything else stays where it is.** Card colours, radius, shadow, logo,
   wordmark, heading, footer, page background, BlueprintBackground, the figure,
   field order, and the form's internals are untouched. The brand block and the
   footer re-centre because `.auth-layout` uses `margin-block: auto` and the card
   is 88 px shorter — that is the layout working as designed, not a second change.

6. **All first-control states are identical.** Whether the first control is the
   Google button or — when Google OAuth is not configured — the University email
   field, the seat is the same. `/login?add=1` ("Add another account") gets the
   same treatment; only the heading text differs.

7. **The error alert pushes the content down.** A `.form-alert` rendered above the
   Google button occupies the scarf area and moves the rest down by its height,
   exactly as the `.form-stack` gap already does. No absolute positioning, no
   reserved slot, no layout jump fix.

8. **Viewport-independent.** One rule at every height and width. The existing
   `@media (max-height: 700px)` block in `AuthLayout.svelte:206-214` keeps doing
   what it already does (page padding and logo size); it is not extended.

## 4. Implementation notes

- Delete line 26 (`padding-top: 88px;`) and rewrite the two comments at
  `login/+page.svelte:23` and `:25`, which describe clearing the corners'
  diagonal — no longer true or needed. Suggested:
  `/* Above the scarf corners, which sit behind the first control. */`
- Do not convert the rule to the `padding` shorthand; only `padding-top` is
  removed.
- No component change to `ScarfCorners.svelte`, `AuthLayout.svelte`,
  `LoginForm.svelte` or `GoogleSignIn.svelte`.
- If a future page wants the old breathing room back, the card padding is the
  knob — do not re-add a wrapper offset.

## 5. Verification

Visual only; there is no test seam for rendered padding and no existing test for
this route. Screenshots stay out of the repository.

- [ ] 1920×1080, browser: sign-in card has no empty top; the scarves read as the
      card's header and the Google button overlaps them.
- [ ] 1440×900, browser: button's top edge is ~32 px below the card's top edge
      (was ~120 px); both corner wedges visible, unobstructed, not covering the
      button.
- [ ] 1280×800, browser: same; no clipping or scrollbar.
- [ ] 1280×700 (short viewport), browser: the card still fits, scarf corners
      intact, no overlap on the logo or footer.
- [ ] Desktop shell at 1280×800: unchanged title bar seat, card top still clears
      the slim bar, scarf band intact.
- [ ] `/login?add=1`: identical geometry, alternate heading.
- [ ] Google OAuth disabled (local `.dev.vars` without the OAuth pair): the email
      field takes the same tight seat and stays fully legible.
- [ ] Trigger a failed sign-in: the alert appears above the button, the scarf is
      behind it, nothing overlaps the alert text.
- [ ] Keyboard: Tab to the Google button shows the focus ring fully against the
      scarf; the ring is not clipped by the card's `overflow: hidden`.
- [ ] No colour, contrast or font change anywhere; `pnpm verify` still passes
      (lint sees the edited file).

## 6. Acceptance checklist

- [ ] `padding-top: 88px` is gone from `apps/web/src/routes/login/+page.svelte`.
- [ ] The gap above "Sign in with Google" is the card's padding only.
- [ ] Both scarves remain anchored to their own top corner and extend diagonally
      downward along the card's left and right edges.
- [ ] The scarves are behind the button and never cover or obstruct its label,
      mark, border or focus ring.
- [ ] Spacing around the button is minimal and even with the rest of the form.
- [ ] The primary "Sign in" button stays the only filled navy action.
- [ ] No other element moved except by the shortened card's re-centring.

## 7. Out of scope

- Resizing, recolouring, rotating, repositioning, masking or cropping the scarves.
- Making the button translucent, blurred, or narrower than the content width.
- Changing the shared `.auth-card` padding or the `AuthLayout` page padding.
- Touching `register`, `forgot-password`, `reset-password`, `verify-email`, or
  adding scarves to them.
- Adding tests, tokens, custom properties, or a theming switch.
- Amending `docs/spec/ui/01-auth-and-account.md`; this file stands alone.
- The bottom of the page: the woven strip visible under the card is
  `BlueprintBackground` and is untouched.

## 8. Open items carried into implementation

- **Exact seat:** 22–32 px, not a hard 16 px. The card's own padding is kept on
  purpose so the change stays one deletion. If the result still reads as too much
  air on a 440 px card, the next knob is the card's `padding-top`, not a new
  wrapper offset.
- **Card height change:** the card is 88 px shorter, so the centered stack shifts.
  This is expected; the screenshot comparison must be read per element, not by
  absolute pixel offset.
