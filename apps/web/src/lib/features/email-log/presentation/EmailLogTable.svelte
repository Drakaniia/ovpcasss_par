<script lang="ts">
  import {
    EMAIL_DELIVERY_STATUS_LABELS,
    EMAIL_KIND_LABELS,
    type EmailDeliveryStatus,
    type EmailLogRow,
  } from '@par/shared';

  import { formatDateTime } from '$lib/format/datetime';

  let {
    rows,
    resending,
    onresend,
    onview,
  }: {
    rows: readonly EmailLogRow[];
    resending: string | null;
    onresend: (row: EmailLogRow) => void;
    onview: (row: EmailLogRow) => void;
  } = $props();

  /** Status is never colour alone: every chip carries its word. */
  function tone(status: EmailDeliveryStatus): string {
    switch (status) {
      case 'SENT':
        return 'success';
      case 'FAILED':
        return 'danger';
      case 'SUPPRESSED':
        return 'muted';
      case 'QUEUED':
        return 'info';
    }
  }
</script>

<div class="table-scroll">
  <table class="data-table">
    <caption class="visually-hidden">Messages the system attempted to send</caption>
    <thead>
      <tr>
        <th scope="col">Time</th>
        <th scope="col">Kind</th>
        <th scope="col">Recipient</th>
        <th scope="col" class="table-col-secondary">Subject</th>
        <th scope="col">Status</th>
        <th scope="col" class="num">Attempts</th>
        <th scope="col" class="table-col-secondary">Reason</th>
        <th scope="col"><span class="visually-hidden">Actions</span></th>
      </tr>
    </thead>
    <tbody>
      {#each rows as row (row.id)}
        <tr>
          <td class="mono nowrap">{formatDateTime(row.createdAt)}</td>
          <td><span class="chip chip-kind">{EMAIL_KIND_LABELS[row.kind]}</span></td>
          <td class="recipient">{row.to}</td>
          <td class="table-col-secondary subject" title={row.subject}>{row.subject}</td>
          <td>
            <span class="chip" data-tone={tone(row.status)}>
              {EMAIL_DELIVERY_STATUS_LABELS[row.status]}
            </span>
          </td>
          <td class="num">{row.attempts}</td>
          <td class="table-col-secondary reason" title={row.lastError ?? ''}>
            {row.lastError ?? '—'}
          </td>
          <td class="actions">
            {#if row.canResend}
              <button class="btn btn-outline btn-sm" type="button" onclick={() => onview(row)}>
                View
              </button>
              <button
                class="btn btn-outline btn-sm"
                type="button"
                disabled={resending !== null}
                onclick={() => onresend(row)}
              >
                {resending === row.id ? 'Queueing…' : 'Resend'}
              </button>
            {/if}
          </td>
        </tr>
      {/each}
    </tbody>
  </table>
</div>

<style>
  .chip {
    background: var(--surface-paper);
    border-radius: var(--radius-badge);
    color: var(--text-secondary);
    display: inline-block;
    font-size: 12px;
    font-weight: 500;
    padding: 2px 8px;
    white-space: nowrap;
  }

  .chip[data-tone='success'] {
    background: var(--status-success-bg);
    color: var(--status-success-fg);
  }

  .chip[data-tone='danger'] {
    background: var(--status-danger-bg);
    color: var(--status-danger-fg);
  }

  .chip[data-tone='info'] {
    background: var(--brand-navy-100);
    color: var(--brand-navy-800);
  }

  .chip[data-tone='muted'] {
    background: var(--surface-paper);
    color: var(--text-secondary);
  }

  .chip-kind {
    background: var(--brand-gold-100);
    color: var(--text-primary);
  }

  .nowrap {
    white-space: nowrap;
  }

  .recipient {
    max-width: 220px;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .subject,
  .reason {
    max-width: 260px;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .actions {
    text-align: right;
    white-space: nowrap;
  }

  .actions button + button {
    margin-left: 6px;
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
