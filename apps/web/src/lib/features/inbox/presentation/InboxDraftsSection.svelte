<script lang="ts">
  import type { InboxSection } from '@par/shared';
  import { ArrowRight } from '@lucide/svelte';

  import { formatDateTime } from '$lib/format/datetime';
  import { formatRelativeTime } from '$lib/format/relative-time';
  import { REPORT_TYPE_LABELS } from '$lib/format/report-type';

  let { section, now }: { section: InboxSection; now: Date } = $props();

  const fillWidth = (value: number | null | undefined) =>
    `${Math.min(100, Math.max(0, value ?? 0))}%`;
</script>

<section class="group" aria-labelledby="inbox-drafts">
  <header class="head">
    <h2 id="inbox-drafts">
      Your drafts
      <span class="count">({section.total})</span>
    </h2>
    <a class="link" href="/reports?tab=drafts">
      View all
      <ArrowRight size={14} aria-hidden="true" />
    </a>
  </header>

  <div class="table-scroll">
    <table class="data-table drafts-table">
      <caption class="sr-only">Drafts awaiting submission</caption>
      <thead>
        <tr>
          <th scope="col">Title</th>
          <th class="table-col-secondary" scope="col">Type</th>
          <th scope="col">Updated</th>
          <th scope="col">Completeness</th>
        </tr>
      </thead>
      <tbody>
        {#each section.items as draft (draft.id)}
          <tr>
            <td class="title-cell">
              <a class="row-link" href={`/reports/${draft.id}/edit`}>{draft.title}</a>
            </td>
            <td class="table-col-secondary type-cell">{REPORT_TYPE_LABELS[draft.type]}</td>
            <td class="mono" title={formatDateTime(draft.updatedAt)}>
              {formatRelativeTime(draft.updatedAt, now)}
            </td>
            <td>
              <span class="completeness">
                <span class="meter" aria-hidden="true">
                  <span class="meter-fill" style={`width: ${fillWidth(draft.completeness)}`}></span>
                </span>
                <span class="percent">
                  {draft.completeness === null || draft.completeness === undefined
                    ? '—'
                    : `${draft.completeness}%`}
                </span>
              </span>
            </td>
          </tr>
        {/each}
      </tbody>
    </table>
  </div>
</section>

<style>
  .group {
    display: flex;
    flex-direction: column;
    gap: 8px;
  }

  .head {
    align-items: baseline;
    display: flex;
    gap: 16px;
    justify-content: space-between;
  }

  h2 {
    font-size: 12px;
    font-weight: 500;
    letter-spacing: 0.04em;
    margin: 0;
    text-transform: uppercase;
  }

  .count {
    color: var(--text-secondary);
    font-variant-numeric: tabular-nums;
    font-weight: 400;
  }

  .link {
    align-items: center;
    display: inline-flex;
    font-size: 13px;
    gap: 6px;
    min-height: 32px;
  }

  .drafts-table tbody tr {
    position: relative;
  }

  .title-cell {
    max-width: 420px;
  }

  .row-link {
    color: var(--text-primary);
    display: -webkit-box;
    font-size: 13px;
    line-height: 1.35;
    line-clamp: 2;
    overflow: hidden;
    -webkit-box-orient: vertical;
    -webkit-line-clamp: 2;
  }

  .row-link:hover {
    text-decoration: underline;
  }

  /* Stretch the link over the row, and keep the focus ring on the row. */
  .row-link::after {
    content: '';
    inset: 0;
    position: absolute;
  }

  .row-link:focus-visible {
    outline: none;
  }

  .row-link:focus-visible::after {
    outline: 2px solid var(--focus-ring);
    outline-offset: -2px;
  }

  .type-cell {
    color: var(--text-secondary);
    white-space: nowrap;
  }

  .completeness {
    align-items: center;
    display: inline-flex;
    gap: 8px;
  }

  .meter {
    background: var(--border);
    border-radius: 999px;
    display: inline-block;
    height: 6px;
    overflow: hidden;
    width: 72px;
  }

  .meter-fill {
    background: var(--primary);
    display: block;
    height: 100%;
  }

  .percent {
    color: var(--text-secondary);
    font-size: 12px;
    font-variant-numeric: tabular-nums;
    min-width: 32px;
    text-align: right;
  }
</style>
