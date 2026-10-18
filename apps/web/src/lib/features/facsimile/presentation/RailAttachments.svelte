<script lang="ts">
  import { AlertCircle } from '@lucide/svelte';

  import type { AttachmentRow } from '../application/facsimile-attachments';

  /**
   * Attachments in the record rail (UI spec §7.7): label, file name, size.
   * PDFs and images open through a short-lived signed URL; other files
   * download. A failed signed URL stays on its row with Retry.
   */
  let {
    rows,
    busyId = null,
    errors = {},
    onopen,
  }: {
    rows: AttachmentRow[];
    busyId?: string | null;
    errors?: Record<string, string>;
    onopen: (row: AttachmentRow) => void;
  } = $props();
</script>

<section class="rail-section" aria-labelledby="rail-attachments-heading">
  <h2 id="rail-attachments-heading" class="rail-heading">
    Attachments ({rows.length})
  </h2>

  {#if rows.length === 0}
    <p class="empty">No attachments.</p>
  {:else}
    <ul class="attachment-list">
      {#each rows as row (row.id)}
        {@const error = errors[row.id]}
        <li class="attachment-item">
          <button
            class="attachment-button"
            type="button"
            disabled={busyId !== null}
            aria-label="{row.preview ? 'Open' : 'Download'} {row.fileName}"
            onclick={() => onopen(row)}
          >
            <span class="attachment-label">{row.label || 'Unlabelled'}</span>
            <span class="attachment-file">
              <span class="file-name">{row.fileName}</span>
              <span class="file-size">{busyId === row.id ? 'Opening…' : row.size}</span>
            </span>
          </button>

          {#if error}
            <p class="row-error">
              <AlertCircle size={13} aria-hidden="true" />
              <span>{error}</span>
              <button class="retry" type="button" onclick={() => onopen(row)}>Retry</button>
            </p>
          {/if}
        </li>
      {/each}
    </ul>
  {/if}
</section>

<style>
  .attachment-list {
    display: flex;
    flex-direction: column;
    gap: 2px;
    list-style: none;
    margin: 0;
    padding: 0;
  }

  .attachment-button {
    background: transparent;
    border-radius: var(--radius-card);
    display: flex;
    flex-direction: column;
    gap: 3px;
    padding: 6px;
    text-align: left;
    transition: background 120ms ease;
    width: calc(100% + 12px);
    margin-inline: -6px;
  }

  .attachment-button:hover:not(:disabled) {
    background: var(--surface-page);
  }

  .attachment-button:disabled {
    cursor: default;
  }

  .attachment-label {
    color: var(--text-secondary);
    font-size: 11px;
    letter-spacing: 0.02em;
  }

  .attachment-file {
    align-items: baseline;
    display: flex;
    gap: 8px;
    justify-content: space-between;
    min-width: 0;
  }

  .file-name {
    color: var(--text-primary);
    font-size: 13px;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .file-size {
    color: var(--text-secondary);
    flex: none;
    font-family: var(--font-mono);
    font-size: 10.5px;
  }

  .row-error {
    align-items: flex-start;
    color: var(--status-danger-fg);
    display: flex;
    font-size: 11.5px;
    gap: 5px;
    line-height: 1.4;
    margin: 2px 0 6px;
  }

  .retry {
    background: transparent;
    color: inherit;
    font-weight: 500;
    padding: 0;
    text-decoration: underline;
    text-underline-offset: 2px;
    white-space: nowrap;
  }

  .empty {
    color: var(--text-secondary);
    font-size: 13px;
    margin: 0;
  }

  @media (prefers-reduced-motion: reduce) {
    .attachment-button {
      transition: none;
    }
  }
</style>
