<script lang="ts">
  import { AlertCircle, LoaderCircle, Maximize2 } from '@lucide/svelte';

  import type { EmailTemplatePreviewResponse } from '@par/shared';

  import { trapFocus } from '$lib/a11y/focus-trap';
  import ErrorState from '$lib/components/ErrorState.svelte';

  import type { PreviewTab } from '../application/email-messages.svelte';

  let {
    preview,
    tab = $bindable('html'),
    title,
    loading = false,
    pending = false,
    error = null,
    onretry,
  }: {
    preview: EmailTemplatePreviewResponse | null;
    tab?: PreviewTab;
    title: string;
    loading?: boolean;
    pending?: boolean;
    error?: string | null;
    onretry?: () => void;
  } = $props();

  const TABS: readonly { key: PreviewTab; label: string }[] = [
    { key: 'subject', label: 'Subject' },
    { key: 'text', label: 'Plain text' },
    { key: 'html', label: 'HTML' },
  ];

  const TAG = '[OVPCASSS PAR]';
  const subjectBody = $derived(
    preview?.subject.startsWith(`${TAG} `)
      ? preview.subject.slice(TAG.length + 1)
      : (preview?.subject ?? ''),
  );

  let dialog = $state<HTMLDialogElement | null>(null);
  let closeButton = $state<HTMLButtonElement | null>(null);

  function openFull() {
    dialog?.showModal();
    closeButton?.focus();
  }

  function closeFull() {
    dialog?.close();
  }
</script>

<div class="preview-pane" aria-label="Message preview">
  <div class="preview-head">
    <div class="segmented" role="group" aria-label="Preview format">
      {#each TABS as option (option.key)}
        <button
          class="segment"
          class:is-active={tab === option.key}
          type="button"
          aria-pressed={tab === option.key}
          onclick={() => (tab = option.key)}
        >
          {option.label}
        </button>
      {/each}
    </div>

    <button class="btn btn-outline btn-sm" type="button" disabled={!preview} onclick={openFull}>
      <Maximize2 size={14} aria-hidden="true" /> Full preview
    </button>
  </div>

  {#if pending || (loading && preview)}
    <p class="pending" role="status">
      <LoaderCircle class="spin" size={13} aria-hidden="true" /> Updating preview…
    </p>
  {/if}

  {#if error && preview}
    <p class="preview-alert" role="alert">
      <AlertCircle size={15} aria-hidden="true" />
      <span>{error}</span>
      {#if onretry}
        <button class="btn btn-ghost btn-sm" type="button" onclick={onretry}>Retry</button>
      {/if}
    </p>
  {/if}

  {#if loading && !preview}
    <div class="skeleton-sheet" aria-hidden="true">
      <div class="skeleton" style="height: 40px; width: 100%"></div>
      <div class="skeleton" style="height: 14px; width: 60%"></div>
      <div class="skeleton" style="height: 120px; width: 100%"></div>
    </div>
  {:else if !preview}
    <div class="empty-pane">
      {#if error}
        <ErrorState
          title="The preview did not render"
          description={error}
          {onretry}
          backHref="/admin/emails"
          backLabel="Back to the email log"
        />
      {:else}
        <ErrorState
          title="The preview is not available yet"
          description="Choose a message and edit it; the preview renders through the API."
          backHref="/admin/emails"
          backLabel="Back to the email log"
        />
      {/if}
    </div>
  {:else if tab === 'subject'}
    <div class="render-pane subject-pane">
      <p class="subject-line">
        <span class="tag-chip">{TAG}</span>
        {subjectBody}
      </p>
      <p class="subject-note">
        The <span class="tag-chip">[OVPCASSS PAR]</span> tag is added for you and cannot be removed.
      </p>
    </div>
  {:else if tab === 'text'}
    <div class="render-pane">
      <pre class="plain">{preview.text}</pre>
    </div>
  {:else}
    <div class="frame">
      <iframe sandbox="" title={`Preview of the ${title} message`} srcdoc={preview.html}></iframe>
    </div>
  {/if}

  <p class="sample-note">Previewed with the sample record, not a saved report.</p>
</div>

<dialog
  bind:this={dialog}
  class="full-dialog"
  aria-label={`Full preview of the ${title} message`}
  oncancel={(event) => {
    event.preventDefault();
    closeFull();
  }}
  onkeydown={(event) => dialog && trapFocus(event, dialog)}
>
  <div class="full-head">
    <h2>Full preview · {title}</h2>
    <button
      class="btn btn-outline btn-sm"
      type="button"
      bind:this={closeButton}
      onclick={closeFull}
    >
      Close
    </button>
  </div>

  {#if preview}
    {#if tab === 'text'}
      <pre class="plain full-plain">{preview.text}</pre>
    {:else if tab === 'subject'}
      <p class="subject-line full-subject">
        <span class="tag-chip">{TAG}</span>
        {subjectBody}
      </p>
    {:else}
      <div class="full-frame">
        <iframe
          sandbox=""
          width="600"
          title={`Full preview of the ${title} message`}
          srcdoc={preview.html}
        ></iframe>
      </div>
    {/if}
  {/if}
</dialog>

<style>
  .preview-pane {
    background: var(--surface-card);
    border: 1px solid var(--border);
    border-radius: var(--radius-card);
    display: flex;
    flex-direction: column;
    min-height: 480px;
    padding: 12px;
  }

  .preview-head {
    align-items: center;
    display: flex;
    flex-wrap: wrap;
    gap: 8px;
    justify-content: space-between;
    margin-bottom: 10px;
  }

  .segmented {
    background: var(--surface-page);
    border: 1px solid var(--border);
    border-radius: var(--radius-card);
    display: inline-flex;
    padding: 2px;
  }

  .segment {
    background: none;
    border: 0;
    border-radius: 4px;
    color: var(--text-secondary);
    cursor: pointer;
    font-size: 12px;
    padding: 4px 10px;
  }

  .segment.is-active {
    background: var(--surface-card);
    box-shadow: 0 1px 2px rgb(17 24 39 / 12%);
    color: var(--text-primary);
    font-weight: 500;
  }

  .pending {
    align-items: center;
    color: var(--text-secondary);
    display: flex;
    font-size: 11px;
    gap: 5px;
    margin: 0 0 8px;
  }

  .preview-alert {
    align-items: center;
    background: var(--status-danger-bg);
    border-radius: var(--radius-card);
    color: var(--status-danger-fg);
    display: flex;
    flex-wrap: wrap;
    font-size: 12px;
    gap: 6px;
    margin: 0 0 8px;
    padding: 8px 10px;
  }

  .frame {
    flex: 1;
    min-height: 420px;
  }

  .frame iframe {
    background: #f4f4f5;
    border: 1px solid var(--border);
    border-radius: 4px;
    height: 100%;
    min-height: 420px;
    width: 100%;
  }

  .render-pane {
    background: var(--surface-paper);
    border: 1px solid var(--border);
    border-radius: 4px;
    flex: 1;
    min-height: 420px;
    overflow: auto;
    padding: 14px;
  }

  .subject-pane {
    min-height: 120px;
  }

  .subject-line {
    font-size: 14px;
    font-weight: 600;
    margin: 0 0 8px;
  }

  .subject-note {
    color: var(--text-secondary);
    font-size: 12px;
    margin: 0;
  }

  .tag-chip {
    background: var(--status-neutral-bg);
    border-radius: 4px;
    color: var(--status-neutral-fg);
    font-family: var(--font-mono);
    font-size: 11px;
    padding: 1px 5px;
  }

  .plain {
    font-family: var(--font-mono);
    font-size: 12px;
    line-height: 1.55;
    margin: 0;
    white-space: pre-wrap;
  }

  .skeleton-sheet {
    display: flex;
    flex-direction: column;
    gap: 12px;
    padding: 16px;
  }

  .empty-pane {
    align-items: center;
    display: flex;
    flex: 1;
    justify-content: center;
  }

  .sample-note {
    color: var(--text-secondary);
    font-size: 11px;
    margin: 8px 0 0;
  }

  .full-dialog {
    max-height: calc(100vh - 48px);
    max-width: calc(100vw - 48px);
    overflow: auto;
    padding: 16px;
    width: 680px;
  }

  .full-head {
    align-items: center;
    display: flex;
    gap: 12px;
    justify-content: space-between;
    margin-bottom: 12px;
  }

  .full-head h2 {
    margin: 0;
  }

  .full-frame {
    background: #f4f4f5;
    border: 1px solid var(--border);
    overflow: auto;
  }

  .full-frame iframe {
    border: 0;
    display: block;
    height: 70vh;
    margin: 0 auto;
  }

  .full-plain {
    background: var(--surface-paper);
    border: 1px solid var(--border);
    max-height: 70vh;
    padding: 12px;
  }

  .full-subject {
    background: var(--surface-paper);
    border: 1px solid var(--border);
    padding: 12px;
  }
</style>
