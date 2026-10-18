<script lang="ts">
  import { Plus, Trash2 } from '@lucide/svelte';

  import ConfirmDialog from '$lib/components/ConfirmDialog.svelte';

  import type { FieldErrors } from '../application/wizard-validation';
  import { type WizardPic } from '../application/wizard-form';

  /**
   * PIC rows (UI phase 06 §3). The count must agree with "Total number of PIC";
   * the mismatch is reported on Continue. Removing a row with content confirms
   * and names the person; an empty row removes immediately.
   */
  let {
    pics,
    errors,
    flagged = false,
    disabled = false,
    onchange,
    onadd,
    onremove,
  }: {
    pics: WizardPic[];
    errors: FieldErrors;
    flagged?: boolean;
    disabled?: boolean;
    onchange: (id: string, patch: Partial<Omit<WizardPic, 'id'>>) => void;
    onadd: () => void;
    onremove: (id: string) => void;
  } = $props();

  let pending = $state<WizardPic | null>(null);
  let confirmOpen = $state(false);

  function hasContent(pic: WizardPic): boolean {
    return Boolean(pic.name.trim() || pic.email.trim() || pic.phone.trim());
  }

  function askRemove(pic: WizardPic): void {
    if (!hasContent(pic)) {
      onremove(pic.id);
      return;
    }
    pending = pic;
    confirmOpen = true;
  }

  function confirmRemove(): void {
    const pic = pending;
    pending = null;
    if (pic) onremove(pic.id);
  }

  const removeCopy = $derived(
    pending
      ? {
          title: `Remove ${pending.name.trim() || 'this person in charge'}?`,
          description:
            'The name, email, and phone for this row are removed from the form. This cannot be undone.',
        }
      : null,
  );
</script>

<div class="pic-rows" class:is-flagged={flagged}>
  {#if flagged}
    <span class="flag">Flagged</span>
  {/if}

  {#each pics as pic, index (pic.id)}
    <fieldset class="pic-row">
      <legend class="visually-hidden">Person in charge {index + 1}</legend>

      <div class="pic-head">
        <span class="pic-index">Person in charge {index + 1}</span>
        <button
          class="remove"
          type="button"
          aria-label="Remove person in charge {index + 1}"
          {disabled}
          onclick={() => askRemove(pic)}
        >
          <Trash2 size={14} aria-hidden="true" />
        </button>
      </div>

      <div class="pic-grid">
        <div class="field">
          <label class="field-label" for="wiz-pic-{pic.id}-name">
            <span>Name<span class="required" aria-hidden="true"> *</span></span>
          </label>
          <input
            id="wiz-pic-{pic.id}-name"
            class="input"
            type="text"
            value={pic.name}
            {disabled}
            maxlength="200"
            aria-invalid={errors[`pic.${pic.id}.name`] ? 'true' : undefined}
            aria-describedby={errors[`pic.${pic.id}.name`]
              ? `wiz-pic-${pic.id}-name-error`
              : undefined}
            oninput={(event) => onchange(pic.id, { name: event.currentTarget.value })}
          />
          {#if errors[`pic.${pic.id}.name`]}
            <p class="field-error" id="wiz-pic-{pic.id}-name-error">
              {errors[`pic.${pic.id}.name`]}
            </p>
          {/if}
        </div>

        <div class="field">
          <label class="field-label" for="wiz-pic-{pic.id}-email">
            <span>Email</span>
            <span class="field-optional">Optional</span>
          </label>
          <input
            id="wiz-pic-{pic.id}-email"
            class="input"
            type="email"
            value={pic.email}
            {disabled}
            maxlength="200"
            aria-invalid={errors[`pic.${pic.id}.email`] ? 'true' : undefined}
            aria-describedby={errors[`pic.${pic.id}.email`]
              ? `wiz-pic-${pic.id}-email-error`
              : undefined}
            oninput={(event) => onchange(pic.id, { email: event.currentTarget.value })}
          />
          {#if errors[`pic.${pic.id}.email`]}
            <p class="field-error" id="wiz-pic-{pic.id}-email-error">
              {errors[`pic.${pic.id}.email`]}
            </p>
          {/if}
        </div>

        <div class="field">
          <label class="field-label" for="wiz-pic-{pic.id}-phone">
            <span>Phone</span>
            <span class="field-optional">Optional</span>
          </label>
          <input
            id="wiz-pic-{pic.id}-phone"
            class="input"
            type="tel"
            value={pic.phone}
            {disabled}
            maxlength="50"
            aria-invalid={errors[`pic.${pic.id}.phone`] ? 'true' : undefined}
            aria-describedby={errors[`pic.${pic.id}.phone`]
              ? `wiz-pic-${pic.id}-phone-error`
              : undefined}
            oninput={(event) => onchange(pic.id, { phone: event.currentTarget.value })}
          />
          {#if errors[`pic.${pic.id}.phone`]}
            <p class="field-error" id="wiz-pic-{pic.id}-phone-error">
              {errors[`pic.${pic.id}.phone`]}
            </p>
          {/if}
        </div>
      </div>
    </fieldset>
  {/each}

  {#if errors.pics}
    <p class="field-error">{errors.pics}</p>
  {/if}

  <button class="btn btn-outline add" type="button" {disabled} onclick={onadd}>
    <Plus size={14} aria-hidden="true" />
    Add person in charge
  </button>
</div>

{#if removeCopy}
  <ConfirmDialog
    bind:open={confirmOpen}
    title={removeCopy.title}
    description={removeCopy.description}
    confirmLabel="Remove"
    tone="destructive"
    onconfirm={confirmRemove}
    oncancel={() => (pending = null)}
  />
{/if}

<style>
  .pic-rows {
    display: flex;
    flex-direction: column;
    gap: 12px;
  }

  .pic-rows.is-flagged {
    border-left: 2px solid var(--brand-maroon-800);
    padding-left: 8px;
  }

  .flag {
    align-self: flex-start;
    background: var(--status-danger-bg);
    border-radius: var(--radius-badge);
    color: var(--status-danger-fg);
    font-size: 11px;
    font-weight: 500;
    padding: 1px 6px;
  }

  .pic-row {
    border: 1px solid var(--border);
    border-radius: var(--radius-card);
    margin: 0;
    padding: 12px;
  }

  .pic-head {
    align-items: center;
    display: flex;
    justify-content: space-between;
    margin-bottom: 8px;
  }

  .pic-index {
    color: var(--text-secondary);
    font-size: 12px;
    font-weight: 500;
  }

  .remove {
    align-items: center;
    background: transparent;
    border-radius: var(--radius-card);
    color: var(--text-secondary);
    display: inline-flex;
    height: 28px;
    justify-content: center;
    width: 28px;
  }

  .remove:hover:not(:disabled) {
    background: var(--status-danger-bg);
    color: var(--status-danger-fg);
  }

  .pic-grid {
    display: grid;
    gap: 12px;
    grid-template-columns: 1.2fr 1.2fr 1fr;
  }

  .add {
    align-self: flex-start;
  }

  .required {
    color: var(--status-danger-fg);
  }

  .visually-hidden {
    clip: rect(0 0 0 0);
    clip-path: inset(50%);
    height: 1px;
    overflow: hidden;
    position: absolute;
    white-space: nowrap;
    width: 1px;
  }
</style>
