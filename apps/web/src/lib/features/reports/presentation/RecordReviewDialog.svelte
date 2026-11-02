<script lang="ts">
  import { Pencil, Send } from '@lucide/svelte';

  import { trapFocus } from '$lib/a11y/focus-trap';

  import type { WizardForm, WizardStep } from '../application/record-form';
  import { reviewSections, type ReviewReferences } from '../application/record-review';

  /**
   * The review sheet between a completed wizard and a sent record (2026-11-01).
   * Sending is never a surprise: the reporter sees every value first, and each
   * section carries the pencil that puts them back on the step that owns it.
   */
  let {
    open,
    form,
    references,
    saving = false,
    onedit,
    onconfirm,
    oncancel,
  }: {
    open: boolean;
    form: WizardForm;
    references: ReviewReferences;
    saving?: boolean;
    onedit: (step: WizardStep) => void;
    onconfirm: () => void;
    oncancel: () => void;
  } = $props();

  const titleId = $props.id();

  let dialog = $state<HTMLDialogElement | null>(null);

  const sections = $derived(reviewSections(form, references));

  $effect(() => {
    if (!dialog) return;

    if (open && !dialog.open) {
      dialog.showModal();
      // Nothing is armed: the sheet opens with the review itself in focus.
      dialog.focus();
    }
    if (!open && dialog.open) dialog.close();
  });
</script>

<dialog
  bind:this={dialog}
  class="dialog review"
  tabindex="-1"
  aria-labelledby={titleId}
  oncancel={(event) => {
    event.preventDefault();
    oncancel();
  }}
  onkeydown={(event) => dialog && trapFocus(event, dialog)}
>
  <header class="review-head">
    <p class="eyebrow">Review</p>
    <h2 id={titleId}>Check the record before it is sent</h2>
    <p class="lead">
      Sending mints the AR No. and tells every person in charge to write the narrative. Edit any
      section you need first.
    </p>
  </header>

  <div class="review-body">
    {#each sections as section (section.step)}
      <section class="section" aria-labelledby="review-section-{section.step}">
        <div class="section-head">
          <h3 id="review-section-{section.step}">{section.title}</h3>
          <button
            class="edit"
            type="button"
            disabled={saving}
            aria-label="Edit {section.title}"
            onclick={() => onedit(section.step)}
          >
            <Pencil size={13} aria-hidden="true" />
            Edit
          </button>
        </div>

        <dl class="rows">
          {#each section.rows as row (row.label)}
            <div class="row" class:is-empty={row.value === '—'}>
              <dt>{row.label}</dt>
              <dd>{row.value}</dd>
            </div>
          {/each}
        </dl>
      </section>
    {/each}
  </div>

  <footer class="review-actions">
    <button class="btn btn-outline" type="button" disabled={saving} onclick={oncancel}>
      Back to the form
    </button>
    <button class="btn btn-primary" type="button" disabled={saving} onclick={onconfirm}>
      <Send size={16} aria-hidden="true" />
      {saving ? 'Sending…' : 'Create and send'}
    </button>
  </footer>
</dialog>

<style>
  /*
   * The shared dialog is 440 px; a record has too many values for that column.
   * Scoped to [open] so a closed sheet keeps the platform's display: none.
   */
  .dialog.review[open] {
    display: flex;
    flex-direction: column;
    max-height: calc(100vh - 64px);
    max-width: 720px;
    overflow: hidden;
    padding: 0;
  }

  .review-head {
    border-bottom: 1px solid var(--border);
    padding: 24px 28px 18px;
  }

  .eyebrow {
    color: var(--text-secondary);
    font-size: 11px;
    font-weight: 600;
    letter-spacing: 0.07em;
    margin: 0 0 6px;
    text-transform: uppercase;
  }

  h2 {
    font-size: 19px;
    letter-spacing: -0.011em;
    margin: 0;
  }

  .lead {
    color: var(--text-secondary);
    font-size: 12.5px;
    line-height: 1.5;
    margin: 6px 0 0;
    max-width: 52ch;
  }

  .review-body {
    flex: 1;
    min-height: 0;
    overflow-y: auto;
    overscroll-behavior: contain;
    padding: 4px 28px 8px;
  }

  .section {
    padding: 14px 0 6px;
  }

  .section + .section {
    border-top: 1px solid var(--border);
  }

  .section-head {
    align-items: center;
    display: flex;
    gap: 12px;
    justify-content: space-between;
    margin-bottom: 4px;
  }

  h3 {
    color: var(--text-secondary);
    font-size: 11px;
    font-weight: 600;
    letter-spacing: 0.05em;
    margin: 0;
    text-transform: uppercase;
  }

  .edit {
    align-items: center;
    background: transparent;
    border: 0;
    border-radius: var(--radius-badge);
    color: var(--link);
    display: inline-flex;
    font-family: var(--font-ui);
    font-size: 12px;
    gap: 5px;
    min-height: 26px;
    padding: 2px 7px;
  }

  .edit:hover:not(:disabled) {
    background: var(--primary-subtle);
  }

  .edit:disabled {
    color: var(--text-disabled);
  }

  .rows {
    margin: 0;
  }

  .row {
    align-items: baseline;
    display: grid;
    gap: 16px;
    grid-template-columns: 200px minmax(0, 1fr);
    padding: 6px 0;
  }

  .row + .row {
    border-top: 1px solid var(--border);
  }

  dt {
    color: var(--text-secondary);
    font-size: 12px;
  }

  dd {
    font-size: 13px;
    line-height: 1.45;
    margin: 0;
    overflow-wrap: anywhere;
  }

  /* A blank optional field is shown, but not dressed up as a value. */
  .row.is-empty dd {
    color: var(--text-disabled);
  }

  .review-actions {
    align-items: center;
    background: var(--surface-card);
    border-top: 1px solid var(--border);
    display: flex;
    gap: 8px;
    justify-content: flex-end;
    padding: 14px 28px;
  }

  .review-actions .btn {
    align-items: center;
    display: inline-flex;
    gap: 6px;
  }

  @media (max-width: 720px) {
    .row {
      gap: 2px;
      grid-template-columns: minmax(0, 1fr);
    }
  }
</style>
