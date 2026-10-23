<script lang="ts">
  import { Pencil, Trash2 } from '@lucide/svelte';

  /**
   * One entry's own rename and remove controls (bug phase 01 §3.1). They sit
   * inside the option row so there is never a question which entry they act on.
   * The row owns the reveal (hover, highlight, focus-within) because the row owns
   * that state; `EditableSelect` keeps it in its own styles.
   *
   * `tabindex="-1"` keeps the listbox a single tab stop: the row is still reached
   * by the arrow keys, and the labels name the target for a screen reader.
   */
  let {
    name,
    disabled = false,
    onrename,
    onremove,
  }: {
    name: string;
    disabled?: boolean;
    onrename: () => void;
    onremove: () => void;
  } = $props();

  /** A row control never selects its entry and never closes the list. */
  function act(event: MouseEvent, run: () => void): void {
    event.stopPropagation();
    run();
  }
</script>

<span class="row-actions" data-row-control="true">
  <button
    class="row-action"
    type="button"
    tabindex="-1"
    aria-label="Rename {name}"
    {disabled}
    onclick={(event) => act(event, onrename)}
  >
    <Pencil size={14} aria-hidden="true" />
  </button>
  <button
    class="row-action is-danger"
    type="button"
    tabindex="-1"
    aria-label="Remove {name}"
    {disabled}
    onclick={(event) => act(event, onremove)}
  >
    <Trash2 size={14} aria-hidden="true" />
  </button>
</span>

<style>
  .row-actions {
    display: inline-flex;
    flex: none;
    gap: 2px;
    /* The 26 px hit area overhangs the row's 5 px padding, so the row keeps its height. */
    margin-block: -3px;
    margin-inline-end: -4px;
  }

  .row-action {
    align-items: center;
    background: transparent;
    border: 0;
    border-radius: 5px;
    color: var(--text-secondary);
    display: inline-flex;
    height: 26px;
    justify-content: center;
    width: 26px;
  }

  .row-action:hover:not(:disabled),
  .row-action:focus-visible {
    background: var(--surface-page);
    color: var(--text-primary);
  }

  .row-action.is-danger:hover:not(:disabled),
  .row-action.is-danger:focus-visible {
    background: var(--status-danger-bg);
    color: var(--status-danger-fg);
  }

  .row-action:disabled {
    cursor: not-allowed;
    opacity: 0.5;
  }
</style>
