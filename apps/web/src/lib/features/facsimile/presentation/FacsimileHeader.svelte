<script lang="ts">
  import type { ReportDetail } from '@par/shared';
  import { ArrowLeft } from '@lucide/svelte';

  import NextStepStrip from '$lib/components/NextStepStrip.svelte';
  import OwnReportChip from '$lib/components/OwnReportChip.svelte';
  import StatusBadge from '$lib/components/StatusBadge.svelte';
  import { session } from '$lib/session/session.svelte';

  import TrackingNumber from './TrackingNumber.svelte';

  let {
    detail,
    print = false,
    backHref = '/reports',
    backLabel = 'My reports',
  }: {
    detail: ReportDetail;
    print?: boolean;
    backHref?: string;
    backLabel?: string;
  } = $props();
</script>

<header class="facsimile-header">
  <a class="back" href={backHref}>
    <ArrowLeft size={14} aria-hidden="true" />
    {backLabel}
  </a>

  <div class="title-row">
    <div class="identity">
      <TrackingNumber value={detail.trackingNumber} />
      <span class="separator" aria-hidden="true">·</span>
      <h1>{detail.form.title}</h1>
      {#if session.user?.id === detail.ownerUserId}<OwnReportChip />{/if}
    </div>

    <div class="tools">
      <StatusBadge status={detail.status} />

      <nav class="view-toggle" aria-label="Report view">
        <a
          class="view-option"
          class:is-active={!print}
          href="/reports/{detail.id}"
          aria-current={!print ? 'page' : undefined}
        >
          Record view
        </a>
        <a
          class="view-option"
          class:is-active={print}
          href="/reports/{detail.id}?print=1"
          aria-current={print ? 'page' : undefined}
        >
          Print preview
        </a>
      </nav>
    </div>
  </div>

  <NextStepStrip status={detail.status} completedAt={detail.completedAt} />
</header>

<style>
  .facsimile-header {
    display: flex;
    flex-direction: column;
    gap: 6px;
    margin-bottom: 20px;
  }

  .back {
    align-items: center;
    color: var(--text-secondary);
    display: inline-flex;
    font-size: 13px;
    gap: 4px;
    width: fit-content;
  }

  .back:hover {
    color: var(--text-primary);
    text-decoration: none;
  }

  .title-row {
    align-items: center;
    display: flex;
    gap: 24px;
    justify-content: space-between;
  }

  .identity {
    align-items: baseline;
    display: flex;
    flex-wrap: wrap;
    gap: 2px 8px;
    min-width: 0;
  }

  .identity :global(.tracking-number) {
    color: var(--text-secondary);
    flex: none;
  }

  .separator {
    color: var(--text-disabled);
  }

  h1 {
    font-size: 22px;
    letter-spacing: -0.01em;
    margin: 0;
    min-width: 0;
  }

  .tools {
    align-items: center;
    display: flex;
    flex: none;
    gap: 12px;
  }

  .view-toggle {
    background: var(--surface-page);
    border: 1px solid var(--border);
    border-radius: var(--radius-card);
    display: inline-flex;
    padding: 2px;
  }

  .view-option {
    align-items: center;
    border-radius: 4px;
    color: var(--text-secondary);
    display: inline-flex;
    font-size: 12px;
    height: 26px;
    padding: 0 10px;
    transition:
      background 120ms ease,
      color 120ms ease;
    white-space: nowrap;
  }

  .view-option:hover {
    color: var(--text-primary);
    text-decoration: none;
  }

  .view-option.is-active {
    background: var(--surface-card);
    box-shadow: var(--shadow-card);
    color: var(--text-primary);
    font-weight: 500;
  }

  @media (max-width: 1279px) {
    .title-row {
      align-items: flex-start;
      flex-direction: column;
      gap: 10px;
    }

    .tools {
      justify-content: space-between;
      width: 100%;
    }
  }

  @media (prefers-reduced-motion: reduce) {
    .view-option {
      transition: none;
    }
  }
</style>
