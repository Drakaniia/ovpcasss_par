<script lang="ts">
  import type { AuditEventDetail as AuditEventDetailType, AuditEventItem } from '@par/shared';
  import { Check, Copy } from '@lucide/svelte';

  import { computeDiff } from '../application/audit-diff';
  import {
    formatAuditActorLabel,
    formatAuditStatusTransition,
    formatAuditSummary,
  } from '../application/audit-summary';
  import AuditDiffTable from './AuditDiffTable.svelte';

  let {
    event,
    detail,
    loading = false,
    error = null,
    onretry,
  }: {
    event: AuditEventItem;
    detail: AuditEventDetailType | null;
    loading?: boolean;
    error?: string | null;
    onretry: () => void;
  } = $props();

  let copied = $state(false);

  const summary = $derived(formatAuditSummary(event));
  const statusTransition = $derived(
    formatAuditStatusTransition(
      detail?.fromStatus ?? event.fromStatus,
      detail?.toStatus ?? event.toStatus,
    ),
  );

  const diff = $derived(
    computeDiff(detail?.before, detail?.after),
  );

  const actorLabel = $derived(
    formatAuditActorLabel(
      detail?.actorName ?? event.actorName,
      detail?.actorRole ?? event.actorRole,
    ),
  );

  const entityDisplay = $derived(
    `${event.entityType} · ${event.entityLabel ?? event.entityId ?? '—'}`,
  );

  const requestId = $derived(detail?.requestId ?? event.requestId ?? event.id);

  async function handleCopy() {
    if (!requestId) return;
    try {
      await navigator.clipboard.writeText(requestId);
      copied = true;
      setTimeout(() => {
        copied = false;
      }, 2000);
    } catch {
      // clipboard write failure
    }
  }
</script>

<div class="audit-event-detail" role="region" aria-label="Event detail for {event.id}">
  {#if loading}
    <div class="detail-loading" aria-busy="true">
      <div class="skeleton skeleton-line" style="width: 70%"></div>
      <div class="skeleton skeleton-line" style="width: 40%"></div>
      <div class="skeleton skeleton-line" style="width: 90%"></div>
    </div>
  {:else if error}
    <div class="detail-error" role="alert">
      <p class="error-text">Could not load event details. {error}</p>
      <button class="btn btn-outline btn-sm" type="button" onclick={onretry}>
        Retry
      </button>
    </div>
  {:else}
    <!-- 1. Summary -->
    <div class="detail-section">
      <p class="detail-summary">{summary}</p>
    </div>

    <!-- 2. Status change -->
    {#if statusTransition}
      <div class="detail-section status-section">
        <span class="detail-label">Status transition:</span>
        <span class="status-transition-text">{statusTransition}</span>
      </div>
    {/if}

    <!-- 3. Changes (readable key/value diff) -->
    <div class="detail-section diff-section">
      <h3 class="section-heading">Changes</h3>
      <AuditDiffTable {diff} />
    </div>

    <!-- 4. Context -->
    <div class="detail-section context-section">
      <h3 class="section-heading">Context</h3>
      <dl class="context-grid">
        <div class="context-item">
          <dt class="context-dt">Actor</dt>
          <dd class="context-dd">{actorLabel}</dd>
        </div>
        <div class="context-item">
          <dt class="context-dt">Entity</dt>
          <dd class="context-dd mono">{entityDisplay}</dd>
        </div>
        {#if event.comment}
          <div class="context-item full-span">
            <dt class="context-dt">Comment</dt>
            <dd class="context-dd">{event.comment}</dd>
          </div>
        {/if}
      </dl>
    </div>

    <!-- 5. Request -->
    <div class="detail-section request-section">
      <h3 class="section-heading">Request</h3>
      <dl class="context-grid">
        <div class="context-item">
          <dt class="context-dt">IP Address</dt>
          <dd class="context-dd mono">{event.ip ?? '—'}</dd>
        </div>
        <div class="context-item">
          <dt class="context-dt">Request ID</dt>
          <dd class="context-dd mono request-id-cell">
            <span>{requestId ?? '—'}</span>
            {#if requestId}
              <button class="copy-btn" type="button" onclick={handleCopy} aria-label="Copy request ID">
                {#if copied}
                  <Check size={14} aria-hidden="true" />
                  <span>Copied</span>
                {:else}
                  <Copy size={14} aria-hidden="true" />
                  <span>Copy</span>
                {/if}
              </button>
            {/if}
          </dd>
        </div>
        <div class="context-item full-span">
          <dt class="context-dt">User Agent</dt>
          <dd class="context-dd user-agent-box mono">
            {event.userAgent ?? '—'}
          </dd>
        </div>
      </dl>
    </div>
  {/if}
</div>

<style>
  .audit-event-detail {
    background: var(--surface-page);
    border-top: 1px solid var(--border);
    display: flex;
    flex-direction: column;
    gap: 16px;
    padding: 16px 20px;
    width: 100%;
  }

  .detail-loading {
    display: flex;
    flex-direction: column;
    gap: 10px;
    padding: 12px 0;
  }

  .skeleton-line {
    border-radius: var(--radius-badge);
    height: 14px;
  }

  .detail-error {
    align-items: center;
    background: var(--status-danger-bg);
    border: 1px solid var(--border);
    border-radius: var(--radius-badge);
    display: flex;
    gap: 12px;
    padding: 12px 16px;
  }

  .error-text {
    color: var(--status-danger-fg);
    font-size: 13px;
    margin: 0;
  }

  .btn-sm {
    font-size: 12px;
    height: 28px;
    padding: 0 10px;
  }

  .detail-section {
    display: flex;
    flex-direction: column;
    gap: 6px;
  }

  .detail-summary {
    color: var(--text-primary);
    font-size: 14px;
    font-weight: 500;
    line-height: 1.5;
    margin: 0;
  }

  .status-section {
    align-items: center;
    display: flex;
    flex-direction: row;
    gap: 8px;
  }

  .detail-label {
    color: var(--text-secondary);
    font-size: 13px;
  }

  .status-transition-text {
    color: var(--text-primary);
    font-size: 13px;
    font-weight: 600;
  }

  .section-heading {
    color: var(--text-secondary);
    font-size: 11px;
    font-weight: 700;
    letter-spacing: 0.06em;
    margin: 0 0 4px;
    text-transform: uppercase;
  }

  .context-grid {
    display: grid;
    gap: 12px;
    grid-template-columns: 1fr 1fr;
    margin: 0;
  }

  .context-item {
    display: flex;
    flex-direction: column;
    gap: 2px;
  }

  .full-span {
    grid-column: 1 / -1;
  }

  .context-dt {
    color: var(--text-secondary);
    font-size: 12px;
  }

  .context-dd {
    color: var(--text-primary);
    font-size: 13px;
    margin: 0;
  }

  .request-id-cell {
    align-items: center;
    display: flex;
    gap: 8px;
  }

  .copy-btn {
    align-items: center;
    background: var(--surface-card);
    border: 1px solid var(--border);
    border-radius: var(--radius-badge);
    color: var(--text-secondary);
    cursor: pointer;
    display: inline-flex;
    font-size: 11px;
    gap: 4px;
    height: 24px;
    padding: 0 6px;
  }

  .copy-btn:hover {
    background: var(--row-hover);
    color: var(--text-primary);
  }

  .copy-btn:focus-visible {
    outline: 2px solid var(--focus-ring);
  }

  .user-agent-box {
    background: var(--surface-card);
    border: 1px solid var(--border);
    border-radius: var(--radius-badge);
    color: var(--text-secondary);
    font-size: 12px;
    line-height: 1.4;
    max-height: 80px;
    overflow-y: auto;
    padding: 6px 10px;
    word-break: break-all;
  }

  .mono {
    font-family: var(--font-mono);
  }
</style>
