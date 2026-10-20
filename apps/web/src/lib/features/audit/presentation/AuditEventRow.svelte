<script lang="ts">
  import type { AuditEventDetail as AuditEventDetailType, AuditEventItem } from '@par/shared';
  import { ChevronDown, ChevronRight } from '@lucide/svelte';

  import {
    formatAuditActionLabel,
    formatAuditActorLabel,
    formatAuditStatusTransition,
    formatManilaTimestamp,
  } from '../application/audit-summary';
  import AuditEventDetail from './AuditEventDetail.svelte';

  let {
    event,
    expanded = false,
    detail = null,
    loadingDetail = false,
    detailError = null,
    ontoggle,
    onretrydetail,
  }: {
    event: AuditEventItem;
    expanded: boolean;
    detail: AuditEventDetailType | null;
    loadingDetail?: boolean;
    detailError?: string | null;
    ontoggle: () => void;
    onretrydetail: () => void;
  } = $props();

  const timestamp = $derived(formatManilaTimestamp(event.createdAt));
  const actor = $derived(formatAuditActorLabel(event.actorName, event.actorRole));
  const action = $derived(formatAuditActionLabel(event.action));
  const entityDisplay = $derived(
    `${event.entityType} · ${event.entityLabel ?? event.entityId ?? '—'}`,
  );
  const statusTransition = $derived(formatAuditStatusTransition(event.fromStatus, event.toStatus));
  const hasLine2 = $derived(Boolean(statusTransition || event.comment));
</script>

<div class="audit-event-row-container" class:is-expanded={expanded}>
  <button class="audit-event-row" type="button" aria-expanded={expanded} onclick={ontoggle}>
    <div class="row-indicator" aria-hidden="true">
      {#if expanded}
        <ChevronDown size={16} />
      {:else}
        <ChevronRight size={16} />
      {/if}
    </div>

    <div class="row-content">
      <!-- Line 1: timestamp, actor + role, action, entity type + id -->
      <div class="row-line line-1">
        <time class="event-time mono" datetime={timestamp.utc} title={timestamp.utc}>
          {timestamp.display}
        </time>
        <span class="event-actor">{actor}</span>
        <span class="event-action-badge">{action}</span>
        <span class="event-entity mono">{entityDisplay}</span>
      </div>

      <!-- Line 2: status transition and short comment excerpt -->
      {#if hasLine2}
        <div class="row-line line-2">
          {#if statusTransition}
            <span class="event-status-arrow">{statusTransition}</span>
          {/if}
          {#if statusTransition && event.comment}
            <span class="line-2-sep" aria-hidden="true">·</span>
          {/if}
          {#if event.comment}
            <span class="event-comment-excerpt" title={event.comment}>
              {event.comment}
            </span>
          {/if}
        </div>
      {/if}
    </div>
  </button>

  {#if expanded}
    <div class="expanded-detail-wrapper">
      <AuditEventDetail
        {event}
        {detail}
        loading={loadingDetail}
        error={detailError}
        onretry={onretrydetail}
      />
    </div>
  {/if}
</div>

<style>
  .audit-event-row-container {
    border-bottom: 1px solid var(--border);
    display: flex;
    flex-direction: column;
    width: 100%;
  }

  .audit-event-row-container:last-child {
    border-bottom: none;
  }

  .audit-event-row-container.is-expanded {
    background: var(--surface-page);
  }

  .audit-event-row {
    align-items: center;
    background: transparent;
    border: none;
    color: inherit;
    cursor: pointer;
    display: flex;
    gap: 12px;
    min-height: 56px;
    padding: 8px 16px;
    text-align: left;
    width: 100%;
  }

  .audit-event-row:hover {
    background: var(--row-hover);
  }

  .audit-event-row:focus-visible {
    outline: 2px solid var(--focus-ring);
    outline-offset: -2px;
  }

  .row-indicator {
    align-items: center;
    color: var(--text-secondary);
    display: inline-flex;
    flex-shrink: 0;
    justify-content: center;
    width: 16px;
  }

  .row-content {
    display: flex;
    flex: 1;
    flex-direction: column;
    gap: 2px;
    min-width: 0;
  }

  .row-line {
    align-items: center;
    display: flex;
    gap: 10px;
    min-width: 0;
  }

  .line-1 {
    font-size: 13px;
  }

  .line-2 {
    color: var(--text-secondary);
    font-size: 12px;
  }

  .event-time {
    color: var(--text-secondary);
    flex-shrink: 0;
    font-size: 12px;
    font-variant-numeric: tabular-nums;
    width: 124px;
  }

  .event-actor {
    color: var(--text-primary);
    flex-shrink: 0;
    font-weight: 600;
  }

  .event-action-badge {
    background: var(--surface-page);
    border: 1px solid var(--border);
    border-radius: var(--radius-badge);
    color: var(--text-primary);
    flex-shrink: 0;
    font-size: 12px;
    font-weight: 500;
    padding: 1px 6px;
  }

  .event-entity {
    color: var(--text-secondary);
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .event-status-arrow {
    color: var(--text-primary);
    flex-shrink: 0;
    font-weight: 500;
  }

  .line-2-sep {
    color: var(--text-secondary);
  }

  .event-comment-excerpt {
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .expanded-detail-wrapper {
    width: 100%;
  }

  .mono {
    font-family: var(--font-mono);
  }
</style>
