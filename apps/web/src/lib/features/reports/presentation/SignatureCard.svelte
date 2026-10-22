<script lang="ts">
  import type { ReportDetail, ReportSubmitterSignature } from '@par/shared';
  import { AlertCircle, LoaderCircle } from '@lucide/svelte';

  import { api } from '$lib/api/client';
  import { ApiError } from '$lib/api/http';
  import ConfirmDialog from '$lib/components/ConfirmDialog.svelte';
  import SignatureCapture from '$lib/features/profile/presentation/SignatureCapture.svelte';
  import { formatDate } from '$lib/format/datetime';
  import { toast } from '$lib/toast/toast.svelte';

  /**
   * "Your signature" on the review step and the returned-report editor
   * (signature spec §4.5). Optional: Submit never waits for it. Saving happens
   * immediately, so a signature survives navigation, a draft reload, and a
   * failed submit. The report keeps its own copy — replacing the profile image
   * later never changes a signed report.
   */
  let {
    reportId,
    ensureReportId,
    disabled = false,
    onchanged,
  }: {
    reportId: string | null;
    ensureReportId: () => Promise<string>;
    disabled?: boolean;
    onchanged?: (detail: ReportDetail) => void;
  } = $props();

  let saved = $state<ReportSubmitterSignature | null>(null);
  let profileUrl = $state<string | null>(null);
  let pending = $state<string | null>(null);
  let capturing = $state(false);
  let loading = $state(false);
  let failure = $state<string | null>(null);
  let busy = $state<'profile' | 'upload' | 'remove' | null>(null);
  let removeOpen = $state(false);
  let loadedFor = $state<string | null>(null);

  /** A draft created after this card mounted still gets its signature read back. */
  $effect(() => {
    const id = reportId;
    if (!id || loadedFor === id) return;
    loadedFor = id;
    void loadSaved(id);
  });

  // Whether the profile can lend its image is known before the author picks a tab.
  $effect(() => {
    void loadProfile();
  });

  async function loadSaved(id: string) {
    loading = true;
    try {
      const detail = await api.reports.get(id);
      saved = detail.submitterSignature ?? null;
    } catch {
      // Reading the report back is a convenience; saving still works.
    } finally {
      loading = false;
    }
  }

  async function loadProfile() {
    if (profileUrl !== null) return;
    try {
      const { url } = await api.profile.signatureUrl();
      profileUrl = url;
    } catch {
      profileUrl = null;
    }
  }

  function toggleCapture() {
    capturing = !capturing;
    pending = null;
    if (capturing) void loadProfile();
  }

  async function useProfile() {
    if (busy) return;
    busy = 'profile';
    failure = null;

    try {
      const detail = await api.reports.setSignature(await ensureReportId(), { fromProfile: true });
      saved = detail.submitterSignature ?? null;
      capturing = false;
      pending = null;
      onchanged?.(detail);
      toast.success('Signature added to this report');
    } catch (error) {
      failure =
        error instanceof ApiError
          ? error.message
          : 'The signature was not saved. Check your connection and try again.';
    } finally {
      busy = null;
    }
  }

  async function savePending() {
    if (!pending || busy) return;
    busy = 'upload';
    failure = null;

    try {
      const detail = await api.reports.setSignature(await ensureReportId(), { image: pending });
      saved = detail.submitterSignature ?? null;
      pending = null;
      capturing = false;
      onchanged?.(detail);
      toast.success('Signature added to this report');
    } catch (error) {
      failure =
        error instanceof ApiError
          ? error.message
          : 'The signature was not saved. Check your connection and try again.';
    } finally {
      busy = null;
    }
  }

  async function remove() {
    if (busy) return;
    busy = 'remove';
    failure = null;

    try {
      const detail = await api.reports.removeSignature(await ensureReportId());
      saved = null;
      onchanged?.(detail);
      toast.success('Signature removed from this report');
    } catch (error) {
      failure =
        error instanceof ApiError
          ? error.message
          : 'The signature was not removed. Check your connection and try again.';
    } finally {
      busy = null;
    }
  }
</script>

<section class="card card-body" aria-labelledby="report-signature-heading">
  <div class="card-head">
    <h2 id="report-signature-heading">Your signature</h2>
    <p class="card-copy">Optional. Your signature is printed on the report under Submitted by.</p>
  </div>

  {#if failure}
    <div class="form-alert" role="alert">
      <AlertCircle size={16} aria-hidden="true" />
      <p>{failure}</p>
    </div>
  {/if}

  {#if saved}
    <div class="saved-block">
      {#if saved.signatureUrl}
        <img class="preview sheet" src={saved.signatureUrl} alt="Signature of {saved.signerName}" />
      {/if}
      <p class="saved-note">
        Signed {formatDate(saved.signedAt)}. This report keeps the image it was signed with.
      </p>
    </div>

    {#if !disabled}
      <div class="actions">
        <button
          class="btn btn-outline"
          type="button"
          disabled={busy !== null}
          onclick={toggleCapture}
        >
          Replace
        </button>
        <button
          class="btn btn-ghost remove"
          type="button"
          disabled={busy !== null}
          onclick={() => (removeOpen = true)}
        >
          Remove
        </button>
      </div>
    {/if}
  {:else if loading}
    <p class="saved-note" role="status">Reading the report…</p>
  {:else if !capturing}
    {#if profileUrl}
      <img class="preview sheet" src={profileUrl} alt="Your signature on file" />
    {/if}

    <div class="actions">
      {#if profileUrl}
        <button
          class="btn btn-outline"
          type="button"
          disabled={disabled || busy !== null}
          onclick={() => void useProfile()}
        >
          {#if busy === 'profile'}
            <LoaderCircle class="spin" size={16} aria-hidden="true" />
            Saving…
          {:else}
            Use my signature on file
          {/if}
        </button>
      {/if}
      <button
        class="btn btn-ghost"
        type="button"
        disabled={disabled || busy !== null}
        onclick={toggleCapture}
      >
        {profileUrl ? 'Draw or upload instead' : 'Draw or upload'}
      </button>
    </div>
  {:else}
    <SignatureCapture onchange={(dataUrl) => (pending = dataUrl)} />

    <div class="actions">
      <button class="btn btn-ghost" type="button" disabled={busy !== null} onclick={toggleCapture}>
        Cancel
      </button>
      <button
        class="btn btn-outline"
        type="button"
        disabled={!pending || busy !== null}
        onclick={() => void savePending()}
      >
        {#if busy === 'upload'}
          <LoaderCircle class="spin" size={16} aria-hidden="true" />
          Saving…
        {:else}
          Save signature
        {/if}
      </button>
    </div>
  {/if}
</section>

<ConfirmDialog
  bind:open={removeOpen}
  title="Remove this signature?"
  description="The report will print a ruled line under Submitted by instead. You can add a signature again while the report is still editable."
  confirmLabel="Remove signature"
  tone="destructive"
  onconfirm={() => void remove()}
/>

<style>
  .card-body {
    padding: 20px 24px 24px;
  }

  .card-head {
    margin-bottom: 16px;
  }

  .card-head h2 {
    font-size: 15px;
    margin: 0;
  }

  .card-copy {
    color: var(--text-secondary);
    font-size: 13px;
    margin: 4px 0 0;
  }

  .saved-block {
    display: flex;
    flex-direction: column;
    gap: 8px;
    margin-bottom: 16px;
  }

  .preview {
    border: 1px solid var(--border);
    border-radius: var(--radius-card);
    display: block;
    height: auto;
    max-width: 240px;
    padding: 4px;
    width: 100%;
  }

  .sheet {
    background-color: var(--signature-checker-a);
    background-image:
      linear-gradient(
        45deg,
        var(--signature-checker-b) 25%,
        transparent 25%,
        transparent 75%,
        var(--signature-checker-b) 75%
      ),
      linear-gradient(
        45deg,
        var(--signature-checker-b) 25%,
        transparent 25%,
        transparent 75%,
        var(--signature-checker-b) 75%
      );
    background-position:
      0 0,
      8px 8px;
    background-size: 16px 16px;
  }

  .saved-note {
    color: var(--text-secondary);
    font-size: 12px;
    margin: 0;
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

  .form-alert {
    align-items: flex-start;
    background: var(--status-danger-bg);
    border: 1px solid var(--status-danger-fg);
    border-radius: var(--radius-card);
    color: var(--status-danger-fg);
    display: flex;
    font-size: 13px;
    gap: 8px;
    margin-bottom: 12px;
    padding: 10px 14px;
  }

  .form-alert p {
    margin: 0;
  }
</style>
