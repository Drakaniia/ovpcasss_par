<script lang="ts">
  import type { ReportStatus } from '@par/shared';

  import { nextStepText } from '$lib/status/report-status';

  let { status, completedAt }: { status: ReportStatus; completedAt?: string } = $props();
</script>

<p class="next-step">{nextStepText(status, completedAt)}</p>

<style>
  .next-step {
    border-left: 3px solid var(--border);
    color: var(--text-secondary);
    font-size: 13px;
    margin: 0;
    padding: 2px 0 2px 12px;
  }
</style>
