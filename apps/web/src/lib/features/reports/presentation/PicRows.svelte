<script lang="ts">
  import { Plus, Trash2 } from '@lucide/svelte';

  import type { WizardPic } from '../application/record-form';
  import type { FieldErrors } from '../application/record-validation';

  /**
   * Personnel-in-charge rows (spec §12.1 step 3). Name and email are required —
   * the email is the account and the mailbox — while phone stays optional.
   */
  let {
    pics,
    errors,
    disabled = false,
    onpatch,
    onadd,
    onremove,
  }: {
    pics: readonly WizardPic[];
    errors: FieldErrors;
    disabled?: boolean;
    onpatch: (id: string, patch: Partial<WizardPic>) => void;
    onadd: () => void;
    onremove: (id: string) => void;
  } = $props();

  function errorText(id: string, field: 'name' | 'email' | 'phone'): string | undefined {
    return errors[`pic.${id}.${field}`];
  }

  function label(index: number, field: string): string {
    return `${field} of person in charge ${index + 1}`;
  }
</script>

<div class="pic-rows">
  {#each pics as pic, index (pic.id)}
    <fieldset class="pic-row">
      <legend>Person in charge {index + 1}</legend>

      <div class="pic-grid">
        <div class="field" class:has-error={Boolean(errorText(pic.id, 'name'))}>
          <label class="field-label" for="pic-{pic.id}-name">
            {label(index, 'Name')}<span class="required" aria-hidden="true"> *</span>
          </label>
          <input
            id="pic-{pic.id}-name"
            class="input"
            type="text"
            maxlength="200"
            autocomplete="off"
            placeholder="Full name"
            {disabled}
            aria-invalid={errorText(pic.id, 'name') ? 'true' : undefined}
            aria-describedby={errorText(pic.id, 'name') ? `pic-${pic.id}-name-error` : undefined}
            value={pic.name}
            oninput={(event) => onpatch(pic.id, { name: event.currentTarget.value })}
          />
          {#if errorText(pic.id, 'name')}
            <p class="field-error" id="pic-{pic.id}-name-error">{errorText(pic.id, 'name')}</p>
          {/if}
        </div>

        <div class="field" class:has-error={Boolean(errorText(pic.id, 'email'))}>
          <label class="field-label" for="pic-{pic.id}-email">
            {label(index, 'Email')}<span class="required" aria-hidden="true"> *</span>
          </label>
          <input
            id="pic-{pic.id}-email"
            class="input"
            type="email"
            maxlength="200"
            autocomplete="off"
            spellcheck="false"
            placeholder="name@example.com"
            {disabled}
            aria-invalid={errorText(pic.id, 'email') ? 'true' : undefined}
            aria-describedby={errorText(pic.id, 'email') ? `pic-${pic.id}-email-error` : undefined}
            value={pic.email}
            oninput={(event) => onpatch(pic.id, { email: event.currentTarget.value })}
          />
          {#if errorText(pic.id, 'email')}
            <p class="field-error" id="pic-{pic.id}-email-error">{errorText(pic.id, 'email')}</p>
          {/if}
        </div>

        <div class="field" class:has-error={Boolean(errorText(pic.id, 'phone'))}>
          <label class="field-label" for="pic-{pic.id}-phone">
            {label(index, 'Phone')}
            <span class="field-optional">Optional</span>
          </label>
          <input
            id="pic-{pic.id}-phone"
            class="input"
            type="tel"
            maxlength="50"
            autocomplete="off"
            placeholder="0917 000 0000"
            {disabled}
            aria-invalid={errorText(pic.id, 'phone') ? 'true' : undefined}
            aria-describedby={errorText(pic.id, 'phone') ? `pic-${pic.id}-phone-error` : undefined}
            value={pic.phone}
            oninput={(event) => onpatch(pic.id, { phone: event.currentTarget.value })}
          />
          {#if errorText(pic.id, 'phone')}
            <p class="field-error" id="pic-{pic.id}-phone-error">{errorText(pic.id, 'phone')}</p>
          {/if}
        </div>

        <button
          class="icon-action remove"
          type="button"
          disabled={disabled || pics.length === 1}
          aria-label="Remove person in charge {index + 1}"
          onclick={() => onremove(pic.id)}
        >
          <Trash2 size={16} aria-hidden="true" />
        </button>
      </div>
    </fieldset>
  {/each}

  <button class="btn btn-outline btn-sm add" type="button" {disabled} onclick={onadd}>
    <Plus size={15} aria-hidden="true" /> Add person in charge
  </button>
</div>

<style>
  .pic-rows {
    display: flex;
    flex-direction: column;
    gap: 10px;
  }

  .pic-row {
    border: 1px solid var(--border);
    border-radius: var(--radius-card);
    margin: 0;
    padding: 10px 12px 12px;
  }

  legend {
    color: var(--text-secondary);
    font-size: 11px;
    font-weight: 500;
    letter-spacing: 0.04em;
    padding: 0 4px;
    text-transform: uppercase;
  }

  .pic-grid {
    align-items: start;
    display: grid;
    gap: 10px;
    grid-template-columns: minmax(0, 1.2fr) minmax(0, 1.4fr) minmax(0, 1fr) 28px;
  }

  .field {
    display: flex;
    flex-direction: column;
    gap: 4px;
    min-width: 0;
  }

  .field-label {
    align-items: baseline;
    display: flex;
    font-size: 12px;
    gap: 6px;
  }

  .required {
    color: var(--status-danger-fg);
  }

  .field-optional {
    color: var(--text-secondary);
    font-size: 11px;
  }

  .field-error {
    color: var(--status-danger-fg);
    font-size: 12px;
    margin: 0;
  }

  .icon-action {
    align-items: center;
    background: transparent;
    border-radius: var(--radius-card);
    color: var(--text-secondary);
    display: inline-flex;
    height: 32px;
    justify-content: center;
    margin-top: 20px;
    width: 28px;
  }

  .icon-action:hover:not(:disabled) {
    background: var(--status-danger-bg);
    color: var(--status-danger-fg);
  }

  .add {
    align-self: flex-start;
    display: inline-flex;
    gap: 6px;
  }

  @media (max-width: 1180px) {
    .pic-grid {
      grid-template-columns: minmax(0, 1fr) minmax(0, 1fr) 28px;
    }

    .pic-grid > .field:nth-child(3) {
      grid-column: 1 / 3;
    }
  }
</style>
