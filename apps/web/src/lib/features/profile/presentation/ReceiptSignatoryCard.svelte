<script lang="ts">
  import { receiptSignatorySchema, type ReceiptSignatory } from '@par/shared';
  import { AlertCircle, LoaderCircle } from '@lucide/svelte';
  import { onMount, tick } from 'svelte';

  import { api } from '$lib/api/client';
  import { ApiError } from '$lib/api/http';
  import { toast } from '$lib/toast/toast.svelte';
  import {
    firstIssueOf,
    focusFirstError,
    parseForm,
    type FieldErrors,
  } from '$lib/validation/field-errors';

  /**
   * The receipt's closing signature (report 9). Only an administrator sees this
   * card. A receipt PDF is an issued document: saving changes what every later
   * receipt prints and leaves the ones already issued untouched.
   */
  let name = $state('');
  let title = $state('');
  let saved = $state<ReceiptSignatory | null>(null);
  let loading = $state(true);
  let failed = $state(false);
  let saving = $state(false);
  let errors = $state<FieldErrors>({});
  let alert = $state<string | null>(null);
  let alertEl = $state<HTMLElement | null>(null);

  const dirty = $derived(
    saved === null || name.trim() !== saved.name || title.trim() !== saved.title,
  );

  function setError(field: string, message?: string) {
    const next = { ...errors };
    if (message) next[field] = message;
    else delete next[field];
    errors = next;
  }

  function checkName() {
    setError('name', firstIssueOf(receiptSignatorySchema.shape.name, name.trim()));
  }

  function checkTitle() {
    setError('title', firstIssueOf(receiptSignatorySchema.shape.title, title.trim()));
  }

  async function load(): Promise<void> {
    loading = true;
    failed = false;
    alert = null;

    try {
      const response = await api.settings.receiptSignatory();
      saved = response.signatory;
      name = response.signatory.name;
      title = response.signatory.title;
      errors = {};
    } catch (error) {
      alert =
        error instanceof ApiError
          ? error.message
          : 'The receipt signatory did not load. Check your connection and try again.';
      failed = true;
    } finally {
      loading = false;
    }
  }

  async function save(): Promise<void> {
    if (saving) return;

    const parsed = parseForm(receiptSignatorySchema, {
      name: name.trim(),
      title: title.trim(),
    });
    if (!parsed.ok) {
      errors = parsed.errors;
      await tick();
      focusFirstError(errors, ['name', 'title']);
      return;
    }

    saving = true;
    alert = null;

    try {
      const response = await api.settings.saveReceiptSignatory(parsed.data);
      saved = response.signatory;
      name = response.signatory.name;
      title = response.signatory.title;
      errors = {};
      toast.success('Receipt signatory saved.');
    } catch (error) {
      alert =
        error instanceof ApiError
          ? error.message
          : 'The signatory was not saved. Check your connection and try again.';
      await tick();
      alertEl?.focus();
    } finally {
      saving = false;
    }
  }

  onMount(() => {
    void load();
  });
</script>

<section class="card card-body" aria-labelledby="signatory-heading">
  <div class="card-head">
    <h2 id="signatory-heading">Receipt signatory</h2>
    <p class="card-copy">
      The name and position printed under “Sincerely” on the OVPCASSS-F-013 acknowledgment receipt.
    </p>
  </div>

  {#if loading}
    <div class="form-stack" aria-hidden="true">
      <div class="skeleton" style="height: 36px; width: 100%"></div>
      <div class="skeleton" style="height: 36px; width: 100%"></div>
    </div>
    <p class="visually-hidden" role="status">Loading the receipt signatory…</p>
  {:else}
    {#if alert}
      <div class="form-alert" role="alert" tabindex="-1" bind:this={alertEl}>
        <AlertCircle size={16} aria-hidden="true" />
        <div class="form-alert-body">
          {alert}
          {#if failed}
            <button class="btn btn-outline btn-sm retry" type="button" onclick={() => void load()}>
              Retry
            </button>
          {/if}
        </div>
      </div>
    {/if}

    <form
      class="form-stack"
      novalidate
      onsubmit={(event) => {
        event.preventDefault();
        void save();
      }}
    >
      <div class="field">
        <label class="field-label" for="signatory-name">Name</label>
        <input
          class="input"
          id="signatory-name"
          name="signatory-name"
          type="text"
          autocomplete="off"
          value={name}
          disabled={failed}
          oninput={(event) => (name = event.currentTarget.value)}
          onblur={checkName}
          aria-invalid={errors.name ? 'true' : undefined}
          aria-describedby={errors.name ? 'signatory-name-error' : undefined}
        />
        {#if errors.name}
          <p class="field-error" id="signatory-name-error">
            <AlertCircle size={16} aria-hidden="true" />
            {errors.name}
          </p>
        {/if}
      </div>

      <div class="field">
        <label class="field-label" for="signatory-title">Position</label>
        <input
          class="input"
          id="signatory-title"
          name="signatory-title"
          type="text"
          autocomplete="off"
          value={title}
          disabled={failed}
          oninput={(event) => (title = event.currentTarget.value)}
          onblur={checkTitle}
          aria-invalid={errors.title ? 'true' : undefined}
          aria-describedby={errors.title ? 'signatory-title-error' : 'signatory-note'}
        />
        {#if errors.title}
          <p class="field-error" id="signatory-title-error">
            <AlertCircle size={16} aria-hidden="true" />
            {errors.title}
          </p>
        {/if}
        <p class="field-hint" id="signatory-note">
          Receipts issued after you save use this name and position. PDFs already issued keep the
          signatory they were issued with.
        </p>
      </div>

      <div class="form-actions">
        <span class="save-reason">
          {#if !dirty && !saving}
            No changes to save.
          {/if}
        </span>
        <button class="btn btn-outline" type="submit" disabled={saving || !dirty || failed}>
          {#if saving}
            <LoaderCircle class="spin" size={16} aria-hidden="true" />
            Saving…
          {:else}
            Save signatory
          {/if}
        </button>
      </div>
    </form>
  {/if}
</section>

<style>
  .card-body {
    padding: 24px;
  }

  .card-head {
    margin-bottom: 20px;
  }

  .card-head h2 {
    margin: 0;
  }

  .card-copy {
    color: var(--text-secondary);
    font-size: 13px;
    margin: 4px 0 0;
  }

  .form-actions .btn {
    align-items: center;
    display: inline-flex;
    gap: 6px;
  }

  .save-reason {
    color: var(--text-secondary);
    font-size: 12px;
    margin-right: auto;
  }

  .retry {
    margin-left: 8px;
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
