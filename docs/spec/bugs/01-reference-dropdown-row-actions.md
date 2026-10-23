# Bug phase 01 — Edit and remove belong to each dropdown entry, not the list

**Severity:** medium (the office cannot safely maintain Department and Office)
**Surface:** every `EditableSelect` that receives `manage` — the Department and
Office dropdowns on `/reports/new` step 1 and on the admin record form; the same
component is used by the reference-data filter bars, where `manage` is absent
**Reported:** 2026-10-22
**Depends on:** none
**Touches:** `apps/web/src/lib/components/EditableSelect.svelte`,
`apps/web/src/lib/components/editable-select.ts`,
`apps/web/src/lib/components/editable-select.test.ts`,
`apps/web/src/lib/features/reports/presentation/WizardDirectorySelect.svelte`

---

## 1. What the office sees

Open Department. The list opens, and at the bottom sit two buttons — **Rename**
and **Remove** — with the hint "Edits apply to the official list for everyone."
They act on whichever row the pointer or arrow keys last touched. The user
cannot tell which department those two buttons are about, so nobody dares press
them. Reaching an entry's own rename means highlighting it, moving the pointer
away from the list to the footer, and hoping the highlight stayed.

## 2. Verified current behaviour

- `EditableSelect.svelte` renders one footer for the whole popover:

  ```svelte
  {#if manage}
    {#if renaming}
      <form class="rename">…</form>
    {:else if activeOption}
      <div class="footer">
        <button …>Rename</button>
        <button …>Remove</button>
      </div>
    {:else}
      <p class="hint">Edits apply to the official list for everyone.</p>
    {/if}
  {/if}
  ```

  `activeOption` is `rows[active]`, i.e. the highlighted row, not a chosen target.

- `startRename(option)` swaps the whole footer for a rename form whose input is
  `${id}-rename`, detached from the row it renames.
- `remove()` reads `activeOption` again at click time. If the pointer or keyboard
  moved the highlight between the decision and the click, a different entry is
  removed.
- Both actions are only available when `manage` is passed. `WizardDirectorySelect`
  passes it for `departments` and `offices`, admin only. Campus, College or unit,
  Level, Activity type, and Classification are fixed lists and correctly carry no
  edit actions; campus and unit are maintained on `/admin/reference-data`.

## 3. Behaviour contract

1. **One pair of actions per row.** Each option row that belongs to the official
   list carries its own pencil (rename) and trash (remove) control, right-aligned
   inside the row, after the label and after the selected check.
2. **Revealed, not permanent.** Both controls are invisible at rest and appear
   when that row is hovered, when it is the keyboard-highlighted row, or when
   focus is inside the row. They never appear on the synthetic "Add …" row or on
   the free-text row, and they never appear at all when `manage` is absent.
3. **The label area still selects.** Clicking the row's label selects the entry as
   today. Clicking a row control must never select the entry, must not close the
   popover, and must not move the highlight.
4. **Rename is in place.** The pencil turns that row's label into a text input,
   prefilled with the current name, with Save and Cancel. `Enter` saves, `Escape`
   cancels and leaves the popover open, and focus returns to that row. The rename
   form no longer replaces the footer.
5. **Remove removes that row's entry, with undo.** The trash control removes the
   entry the icon belongs to (soft remove via the existing API + Undo toast in
   `WizardDirectorySelect`). The value currently selected in the field is updated
   or cleared exactly as today.
6. **The footer holds no actions.** After a rename or remove it is a one-line
   hint, always: "Edits apply to the official list for everyone. F2 rename ·
   Shift+Delete remove." The keyboard equivalent is stated on screen, not only in
   a tooltip.
7. **Keyboard parity.** With the list open, `F2` renames the highlighted row and
   `Shift+Delete` removes it. Neither key may fire while the rename input is
   focused, and neither may steal a keystroke from the search box: the search box
   owns Delete and Backspace, which is why the remove shortcut is `Shift+Delete`.
8. **No layout shift.** Rows keep their height whether or not the controls are
   revealed; the reveal is opacity and a 2 px translate only.

## 4. Implementation notes

- Move the rename form and the two controls into the `{#each rows}` block, inside
  the `row.kind === 'option'` branch. Keep `role="option"` on the row and render
  the controls as real `<button type="button" tabindex="-1" aria-label="Rename
<name>">` / `aria-label="Remove <name>">` so a screen reader announces the
  target even where the listbox owns focus.
- `startRename` keyed by `option.value` already exists; keep it but render the
  input inside the matching row and stop using `renaming` to replace the footer.
- Icon size 14 px inside a 26 × 26 hit area; the trash uses
  `--status-danger-fg` only on hover/focus, otherwise `--text-secondary`.
- Reveal: `.row .row-actions { opacity: 0 }`, `.row:hover .row-actions`,
  `.row.is-active .row-actions`, `.row:focus-within .row-actions { opacity: 1 }`,
  120 ms `--ease-standard`, `@media (prefers-reduced-motion: reduce)` removes the
  translate.
- `walk()` gains `F2` and `Shift+Delete` cases. `Shift+Delete` must not run when
  `renaming` is set. Remove the footer's conditional branch entirely.
- Extend `editable-select.test.ts` for the new row state (`rowsFor` unchanged) and
  add component-level coverage through the existing `svelte/server` render path.
- Keep `EditableSelect.svelte` under the 400-line limit; if it crosses, the icon
  pair moves into a small `EditableSelectRowActions.svelte` beside it.

## 5. Acceptance checklist

- [ ] With `manage` set, every official entry renders exactly one pencil and one
      trash control; the "Add …" and free-text rows render none.
- [ ] Without `manage` (reports filter, queues filter, audit filter), no row
      control is rendered and the footer shows no edit affordance.
- [ ] At rest the controls are not visible; hovering the row, highlighting it with
      the arrow keys, or focusing one of its controls reveals both.
- [ ] Clicking the pencil renames that row only; `Enter` saves, `Escape` cancels,
      focus returns to the row, the popover stays open.
- [ ] Clicking the trash removes that row only, even when the highlight has since
      moved; Undo restores the entry and the field value stays coherent.
- [ ] Clicking the label area still selects the entry; clicking either control
      never changes the selected value and never closes the list.
- [ ] `F2` and `Shift+Delete` perform the same two actions from the keyboard, and
      the hint line states both.
- [ ] No footer Rename/Remove buttons remain; the hint is the only footer content.
- [ ] Row height, list height, and popover position are unchanged by the reveal.
- [ ] `pnpm verify` passes and the existing dropdown tests still pass.

## 6. Out of scope

- Campus, College or unit, Level, Activity type, and Classification stay fixed
  lists; they are reference-data rows with their own maintenance page and are not
  editable from a report form.
- The reference-data table keeps its own row menu (`Edit`, `Deactivate`,
  `Activate`); this phase does not replace it with icons.
- Hard deletion of reference entries. Remove deactivates, as today.
