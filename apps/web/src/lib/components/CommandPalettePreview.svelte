<script lang="ts">
  import { Search } from '@lucide/svelte';

  import StatusBadge from '$lib/components/StatusBadge.svelte';
  import { formatDateRange } from '$lib/format/datetime';
  import { REPORT_TYPE_LABELS } from '$lib/format/report-type';
  import {
    matchSegments,
    type PalettePage,
    type PaletteReport,
  } from '$lib/palette/palette-entries';

  /**
   * The palette's preview pane (phase 12 §4). A result row answers "what is
   * this?" before Enter is pressed, so the user never has to open a document to
   * find out it was the wrong one. It is passive: the list keeps the focus and
   * the arrow keys.
   */
  let {
    option,
    recent = false,
    query,
  }: {
    option: PalettePage | PaletteReport | null;
    recent?: boolean;
    query: string;
  } = $props();

  const report = $derived(option && 'status' in option ? option : null);
  const page = $derived(option && !('status' in option) ? option : null);

  const MATCH_LABELS: Record<NonNullable<PaletteReport['matched']>, string> = {
    reference: 'Matched the AR No.',
    title: 'Matched the title',
    narrative: 'Found in the narrative',
    location: 'Matched the location',
    pic: 'Matched a person in charge',
  };

  /** Why this row is in the list. The recent group has no query behind it. */
  const reason = $derived.by(() => {
    if (!report) return null;
    if (recent) return 'Recently updated';
    return report.matched ? MATCH_LABELS[report.matched] : null;
  });

  const hint = $derived(page ? 'Enter opens this page' : 'Enter opens this report');
</script>

{#snippet marked(text: string)}
  {#each matchSegments(text, query) as segment, index (index)}{#if segment.match}<mark class="hit"
        >{segment.text}</mark
      >{:else}{segment.text}{/if}{/each}
{/snippet}

<aside class="palette-preview" aria-label="Preview">
  {#if report}
    <div class="head">
      <span class="tracking">{report.referenceNo}</span>
      <StatusBadge status={report.status} />
    </div>

    <h2 class="title">{@render marked(report.title)}</h2>

    <dl class="meta">
      <div>
        <dt>People in charge</dt>
        <dd>{report.picNames || '—'}</dd>
      </div>
      <div>
        <dt>Unit</dt>
        <dd>{report.unitName ?? '—'}</dd>
      </div>
      <div>
        <dt>Activity</dt>
        <dd>{formatDateRange(report.activityStartDate, report.activityEndDate)}</dd>
      </div>
      <div>
        <dt>Type</dt>
        <dd>{REPORT_TYPE_LABELS[report.type]}</dd>
      </div>
    </dl>

    {#if report.snippet}
      <p class="snippet">{@render marked(report.snippet)}</p>
    {/if}
  {:else if page}
    <p class="eyebrow">Page</p>
    <h2 class="title">{@render marked(page.label)}</h2>
    <p class="description">{page.description}</p>
  {:else}
    <div class="empty">
      <span class="empty-glyph" aria-hidden="true">
        <Search size={18} />
      </span>
      <p class="eyebrow">Preview</p>
      <p class="empty-text">Type two characters to search reports.</p>
    </div>
  {/if}

  {#if option}
    <div class="footer">
      {#if reason}
        <p class="reason">{reason}</p>
      {/if}
      <p class="hint"><kbd class="kbd">↵</kbd> {hint}</p>
    </div>
  {/if}
</aside>

<style>
  .palette-preview {
    display: flex;
    flex-direction: column;
    gap: 14px;
    min-width: 0;
    overflow-y: auto;
    padding: 18px 20px;
  }

  .head {
    align-items: center;
    display: flex;
    gap: 10px;
    justify-content: space-between;
  }

  .tracking {
    color: var(--text-secondary);
    font-family: var(--font-mono);
    font-size: 12px;
    font-variant-numeric: tabular-nums;
    letter-spacing: 0.02em;
  }

  .title {
    font-size: 17px;
    font-weight: 600;
    letter-spacing: -0.011em;
    line-height: 1.25;
    margin: 0;
    text-wrap: pretty;
  }

  .eyebrow {
    color: var(--text-secondary);
    font-size: 11px;
    font-weight: 600;
    letter-spacing: 0.08em;
    margin: 0;
    text-transform: uppercase;
  }

  .description {
    color: var(--text-secondary);
    font-size: 13px;
    line-height: 1.45;
    margin: 0;
  }

  .meta {
    display: grid;
    gap: 10px 16px;
    grid-template-columns: repeat(2, minmax(0, 1fr));
    margin: 0;
  }

  dt {
    color: var(--text-secondary);
    font-size: 11px;
    font-weight: 600;
    letter-spacing: 0.06em;
    text-transform: uppercase;
  }

  dd {
    font-size: 13px;
    margin: 2px 0 0;
    overflow-wrap: anywhere;
  }

  .snippet {
    background: var(--surface-paper);
    border-radius: var(--radius-card);
    color: var(--text-primary);
    font-size: 12.5px;
    line-height: 1.5;
    margin: 0;
    padding: 10px 12px;
    text-wrap: pretty;
  }

  .hit {
    background: var(--primary-subtle);
    color: inherit;
    font-weight: 600;
  }

  .empty {
    align-items: center;
    display: flex;
    flex: 1;
    flex-direction: column;
    gap: 10px;
    justify-content: center;
    text-align: center;
  }

  .empty-glyph {
    align-items: center;
    background: var(--surface-paper);
    border-radius: 50%;
    color: var(--text-secondary);
    display: inline-flex;
    height: 40px;
    justify-content: center;
    width: 40px;
  }

  .empty-text {
    color: var(--text-secondary);
    font-size: 13px;
    margin: 0;
    max-width: 30ch;
    text-wrap: pretty;
  }

  /* The footer anchors the pane: a reason when there is one, then the key. */
  .footer {
    border-top: 1px solid var(--border);
    display: flex;
    flex-direction: column;
    gap: 6px;
    margin: auto -20px -18px;
    padding: 10px 20px;
  }

  .reason {
    color: var(--text-secondary);
    font-size: 11.5px;
    margin: 0;
  }

  .hint {
    align-items: center;
    color: var(--text-secondary);
    display: flex;
    font-size: 11.5px;
    gap: 6px;
    margin: 0;
  }
</style>
