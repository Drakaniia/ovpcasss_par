<script lang="ts">
  import { AlertCircle, LoaderCircle } from '@lucide/svelte';
  import { onMount } from 'svelte';

  import { api } from '$lib/api/client';
  import { ApiError } from '$lib/api/http';
  import ConfirmDialog from '$lib/components/ConfirmDialog.svelte';
  import { loadSession } from '$lib/session/session.svelte';
  import { toast } from '$lib/toast/toast.svelte';

  import SignatureCapture from './SignatureCapture.svelte';

  /**
   * The approver's Signature card (UI spec §7.14). Draw or upload, preview at
   * 240 px, replace or remove with a confirmation. This signature is what an
   * acknowledgement is printed with, so a failed upload always leaves the
   * previous one in place.
   */
  const loadErrorCopy = 'We could not load your signature. Try again.';

  let mode = $state<'view' | 'edit'>('edit');
  /** Signed URL or local data URL of the signature on file. */
  let saved = $state<string | null>(null);
  /** The image drawn or picked now, not saved yet. */
  let pending = $state<string | null>(null);

  let loading = $state(true);
  let loadFailed = $state(false);
  let failure = $state<string | null>(null);
  let saving = $state(false);
  let removing = $state(false);
  let removeOpen = $state(false);

  const preview = $derived(pending ?? saved);
  const dirty = $derived(pending !== null);

  async function loadCurrent() {
    loading = true;
    loadFailed = false;

    try {
      const { url } = await api.profile.signatureUrl();
      saved = url;
      mode = 'view';
    } catch (error) {
      // No signature on file is the ordinary first case, not an error.
      if (error instanceof ApiError && (error.status === 404 || error.status === 403)) {
        mode = 'edit';
      } else if (!(error instanceof ApiError && error.status === 401)) {
        loadFailed = true;
      }
    } finally {
      loading = false;
    }
  }

  /** `hasSignature` is what the approval gate reads, so it is refreshed after a write. */
  async function refreshAccount() {
    try {
      await loadSession(true);
    } catch {
      // The signature itself is saved; the flag catches up on the next load.
    }
  }

  async function save() {
    if (!pending || saving) return;

    saving = true;
    failure = null;

    try {
      await api.profile.saveSignature({ image: pending });
      saved = pending;
      pending = null;
      mode = 'view';
      await refreshAccount();
      toast.success('Signature saved');
    } catch (error) {
      failure =
        error instanceof ApiError
          ? `The signature was not saved. ${error.message}`
          : 'The signature was not saved. Check your connection and try again.';
    } finally {
      saving = false;
    }
  }

  async function remove() {
    if (removing) return;

    removing = true;
    failure = null;

    try {
      await api.profile.removeSignature();
      saved = null;
      pending = null;
      mode = 'edit';
      await refreshAccount();
      toast.success('Signature removed');
    } catch (error) {
      failure =
        error instanceof ApiError
          ? `The signature was not removed. ${error.message}`
          : 'The signature was not removed. Check your connection and try again.';
    } finally {
      removing = false;
    }
  }

  function edit() {
    pending = null;
    failure = null;
    mode = 'edit';
  }

  function cancelEdit() {
    pending = null;
    failure = null;
    mode = 'view';
  }

  onMount(() => void loadCurrent());
</script>

<section class="card card-body" aria-labelledby="signature-heading">
  <div class="card-head">
    <h2 id="signature-heading">Signature</h2>
    <p class="card-copy">Your signature appears on approved acknowledgements.</p>
  </div>

  {#if loading}
    <div class="capture-skeleton" aria-busy="true">
      <span class="sr-only">Loading your signature</span>
      <div class="skeleton block"></div>
      <div class="skeleton line"></div>
    </div>
  {:else if loadFailed}
    <div class="form-alert" role="alert">
      <AlertCircle size={16} aria-hidden="true" />
      <div class="form-alert-body">
        <p>{loadErrorCopy}</p>
      </div>
    </div>
    <div class="actions">
      <button class="btn btn-outline" type="button" onclick={() => void loadCurrent()}>Retry</button
      >
    </div>
  {:else}
    {#if failure}
      <div class="form-alert" role="alert">
        <AlertCircle size={16} aria-hidden="true" />
        <div class="form-alert-body">
          <p>{failure}</p>
        </div>
      </div>
    {/if}

    <div class="preview-block">
      <p class="preview-label">{preview ? 'Current signature' : 'No signature on file'}</p>
      {#if preview}
        <img class="preview" src={preview} alt="Your signature" width="240" />
      {:else}
        <p class="preview-empty">
          An approver without a signature cannot approve a report. Draw or upload one below.
        </p>
      {/if}
    </div>

    {#if mode === 'view'}
      <div class="actions">
        <button class="btn btn-outline" type="button" onclick={edit}>Replace signature</button>
        <button
          class="btn btn-ghost remove"
          type="button"
          disabled={removing}
          onclick={() => (removeOpen = true)}
        >
          Remove signature
        </button>
      </div>
    {:else}
      <SignatureCapture onchange={(dataUrl) => (pending = dataUrl)} />

      <div class="actions">
        {#if saved}
          <button class="btn btn-ghost" type="button" disabled={saving} onclick={cancelEdit}>
            Cancel
          </button>
        {/if}
        <!-- The account Save is this page's filled primary, so this one is outline. -->
        <button class="btn btn-outline" type="button" disabled={!dirty || saving} onclick={save}>
          {#if saving}
            <LoaderCircle class="spin" size={16} aria-hidden="true" />
            Saving…
          {:else}
            Save
          {/if}
        </button>
        {#if !dirty && !saving}
          <span class="save-reason">No changes to save.</span>
        {/if}
      </div>
    {/if}
  {/if}
</section>

<ConfirmDialog
  bind:open={removeOpen}
  title="Remove signature?"
  description="Acknowledgements cannot be approved until a signature is added again."
  confirmLabel="Remove signature"
  tone="destructive"
  onconfirm={() => void remove()}
/>

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

  .preview-block {
    margin-bottom: 16px;
  }

  .preview-label {
    color: var(--text-secondary);
    font-size: 11px;
    font-weight: 600;
    letter-spacing: 0.08em;
    margin: 0 0 8px;
    text-transform: uppercase;
  }

  .preview {
    background: var(--surface-card);
    border: 1px solid var(--border);
    border-radius: var(--radius-card);
    display: block;
    height: auto;
    max-width: 240px;
    padding: 4px;
    width: 100%;
  }

  .preview-empty {
    color: var(--text-secondary);
    font-size: 13px;
    margin: 0;
    max-width: 52ch;
  }

  .actions {
    align-items: center;
    display: flex;
    flex-wrap: wrap;
    gap: 8px;
  }

  .remove {
    color: var(--status-danger-fg);
  }

  .save-reason {
    color: var(--text-secondary);
    font-size: 12px;
    margin-left: auto;
  }

  .capture-skeleton {
    display: flex;
    flex-direction: column;
    gap: 12px;
  }

  .block {
    height: 120px;
  }

  .line {
    height: 12px;
    width: 40%;
  }

  .form-alert {
    margin-bottom: 16px;
  }

  .sr-only {
    clip: rect(0 0 0 0);
    clip-path: inset(50%);
    height: 1px;
    overflow: hidden;
    position: absolute;
    white-space: nowrap;
    width: 1px;
  }
</style>
