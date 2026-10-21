<script lang="ts">
  import { page } from '$app/state';
  import { onMount } from 'svelte';

  import type { EmailLogRow } from '@par/shared';

  import ConfirmDialog from '$lib/components/ConfirmDialog.svelte';
  import EmptyState from '$lib/components/EmptyState.svelte';
  import ErrorState from '$lib/components/ErrorState.svelte';
  import SkeletonTable from '$lib/components/SkeletonTable.svelte';

  import {
    EMAIL_LOG_PAGE_SIZE,
    EmailLogState,
    failureHeadline,
  } from '../application/email-log.svelte';
  import EmailLogFilters from './EmailLogFilters.svelte';
  import EmailLogTable from './EmailLogTable.svelte';
  import EmailMessageDialog from './EmailMessageDialog.svelte';

  const log = new EmailLogState();

  let confirmTarget = $state<EmailLogRow | null>(null);

  const headline = $derived(failureHeadline(log.counts));

  onMount(() => {
    void log.load(page.url.searchParams);
  });

  function askResend(row: EmailLogRow) {
    confirmTarget = row;
  }

  function confirmResend() {
    const row = confirmTarget;
    confirmTarget = null;
    if (row) void log.resend(row);
  }
</script>

<svelte:head><title>Email log · OVPCASSS Paperless PAR</title></svelte:head>

{#if log.view === 'denied'}
  <div class="card">
    <ErrorState
      variant="permission"
      title="You do not have access to the email log"
      description="The delivery log is available to administrators. Ask the OVPCASSS administrator if you need a message traced."
      backHref="/"
      backLabel="Back to inbox"
    />
  </div>
{:else if log.view === 'error'}
  <div class="card">
    <ErrorState
      title="We could not load the email log"
      description={log.loadError ?? 'The request did not complete. Try again.'}
      onretry={() => void log.fetch()}
      backHref="/"
      backLabel="Back to inbox"
    />
  </div>
{:else}
  <header class="page-head">
    <h1>Email log</h1>
    <p>Every message the system tried to send, with its delivery log.</p>
  </header>

  {#if log.counts.failed > 0 || log.counts.suppressed > 0}
    <div class="callout" role="status">
      <p class="callout-title">{headline}</p>
      <p class="callout-copy">
        {log.counts.suppressed} suppressed by a preference or an inactive account. A message can be sent
        again from its row.
      </p>
    </div>
  {/if}

  <EmailLogFilters
    filters={log.filters}
    onchange={(patch) => void log.apply(patch)}
    onshowall={() => void log.showAll()}
  />

  {#if log.view === 'loading'}
    <SkeletonTable rows={8} widths={[14, 12, 20, 22, 10, 8, 14]} />
  {:else if log.rows.length === 0}
    <div class="card">
      <EmptyState
        title={log.filters.status === 'FAILED' ? 'Nothing failed to deliver' : 'No messages match'}
        description={log.filters.status === 'FAILED'
          ? 'Every message this filter covers reached its recipient, or none has been sent yet.'
          : 'Adjust the filters to widen the search.'}
        action={log.filters.status === 'FAILED'
          ? { label: 'Show all messages', onclick: () => void log.showAll() }
          : undefined}
        actionVariant="outline"
      />
    </div>
  {:else}
    <EmailLogTable
      rows={log.rows}
      resending={log.resending}
      onresend={askResend}
      onview={(row) => void log.viewMessage(row)}
    />

    <nav class="pagination" aria-label="Email log pagination">
      <p class="range">
        Showing {(log.page - 1) * EMAIL_LOG_PAGE_SIZE + 1}–{Math.min(
          log.page * EMAIL_LOG_PAGE_SIZE,
          log.total,
        )} of {log.total}
      </p>
      <div class="controls">
        <button
          class="btn btn-outline btn-sm"
          type="button"
          disabled={log.page <= 1}
          onclick={() => void log.goToPage(log.page - 1)}
        >
          Previous
        </button>
        <span class="page-label">Page {log.page} of {log.pageCount}</span>
        <button
          class="btn btn-outline btn-sm"
          type="button"
          disabled={log.page >= log.pageCount}
          onclick={() => void log.goToPage(log.page + 1)}
        >
          Next
        </button>
      </div>
    </nav>
  {/if}
{/if}

<ConfirmDialog
  open={confirmTarget !== null}
  title="Send this message again?"
  description={confirmTarget
    ? `A new ${confirmTarget.kind.toLowerCase()} message will be queued for ${confirmTarget.to}. The original row stays as it is.`
    : ''}
  confirmLabel="Queue message"
  cancelLabel="Cancel"
  onconfirm={confirmResend}
  oncancel={() => (confirmTarget = null)}
/>

<EmailMessageDialog
  open={log.messageTarget !== null}
  row={log.messageTarget}
  message={log.message}
  loading={log.messageLoading}
  error={log.messageError}
  onclose={() => log.closeMessage()}
  onretry={() => {
    const row = log.messageTarget;
    if (row) void log.viewMessage(row);
  }}
/>

<style>
  .page-head {
    margin-bottom: 16px;
  }

  .page-head h1 {
    margin: 0;
  }

  .page-head p {
    color: var(--text-secondary);
    font-size: 13px;
    margin: 4px 0 0;
  }

  .callout {
    background: var(--status-gold-bg);
    border: 1px solid var(--brand-gold-400);
    border-radius: var(--radius-card);
    margin-bottom: 16px;
    padding: 12px 16px;
  }

  .callout-title {
    color: var(--status-gold-fg);
    font-weight: 600;
    margin: 0;
  }

  .callout-copy {
    color: var(--text-secondary);
    font-size: 12px;
    margin: 4px 0 0;
  }

  .pagination {
    align-items: center;
    display: flex;
    flex-wrap: wrap;
    gap: 12px;
    justify-content: space-between;
    margin-top: 12px;
  }

  .range,
  .page-label {
    color: var(--text-secondary);
    font-size: 12px;
    margin: 0;
  }

  .controls {
    align-items: center;
    display: flex;
    gap: 8px;
  }
</style>
