<script lang="ts">
  import type { ReportDetail } from '@par/shared';

  import { formatDate } from '$lib/format/datetime';

  import { EMPTY_VALUE, REPORT_FIELD_COUNT, referenceCounts } from '../application/facsimile-document';

  /** Version, completed fields, and the two dates the office looks for (§7.7). */
  let { detail }: { detail: ReportDetail } = $props();

  const completed = $derived(referenceCounts(detail));
</script>

<section class="rail-section" aria-labelledby="rail-meta-heading">
  <h2 id="rail-meta-heading" class="rail-heading">Report meta</h2>

  <dl class="meta-list">
    <div class="meta-row">
      <dt>Version</dt>
      <dd>{detail.version}</dd>
    </div>
    <div class="meta-row">
      <dt>Fields completed</dt>
      <dd>{completed} of {REPORT_FIELD_COUNT}</dd>
    </div>
    <div class="meta-row">
      <dt>Date received</dt>
      <dd>{detail.submittedAt ? formatDate(detail.submittedAt) : EMPTY_VALUE}</dd>
    </div>
    <div class="meta-row">
      <dt>Date completed</dt>
      <dd>{detail.completedAt ? formatDate(detail.completedAt) : EMPTY_VALUE}</dd>
    </div>
  </dl>
</section>

<style>
  .meta-list {
    display: flex;
    flex-direction: column;
    gap: 6px;
    margin: 0;
  }

  .meta-row {
    align-items: baseline;
    display: flex;
    gap: 12px;
    justify-content: space-between;
  }

  dt {
    color: var(--text-secondary);
    font-size: 12px;
  }

  dd {
    color: var(--text-primary);
    font-size: 12.5px;
    margin: 0;
    text-align: right;
  }
</style>
