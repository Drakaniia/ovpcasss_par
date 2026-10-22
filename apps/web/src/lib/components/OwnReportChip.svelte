<script lang="ts">
  /**
   * Marks a report the signed-in account submitted (signature spec §5.3). Text
   * carries the meaning, never colour alone; an administrator sees the same chip
   * even though it may decide the report, and the title explains that.
   */
  let { title }: { title?: string } = $props();

  const explanation = $derived(
    title ?? 'You submitted this report; as an administrator you may still decide it.',
  );
</script>

<span class="own-chip" title={explanation}>Your report</span>

<style>
  .own-chip {
    background: var(--status-neutral-bg);
    border-radius: var(--radius-badge);
    color: var(--status-neutral-fg);
    display: inline-block;
    flex: none;
    font-size: 11px;
    font-weight: 500;
    letter-spacing: 0.02em;
    line-height: 1;
    padding: 3px 6px;
    white-space: nowrap;
  }
</style>
