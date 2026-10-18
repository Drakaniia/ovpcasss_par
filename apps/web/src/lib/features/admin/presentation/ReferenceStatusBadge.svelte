<script lang="ts">
  import { Ban, Check } from '@lucide/svelte';

  let { active }: { active: boolean } = $props();

  const tone = $derived(active ? 'success' : 'neutral');
</script>

<span
  class="status-badge"
  style="--badge-bg: var(--status-{tone}-bg); --badge-fg: var(--status-{tone}-fg)"
>
  {#if active}
    <Check size={14} aria-hidden="true" />
    <span>Active</span>
  {:else}
    <Ban size={14} aria-hidden="true" />
    <span>Inactive</span>
  {/if}
</span>

<style>
  .status-badge {
    align-items: center;
    background: var(--badge-bg);
    border-radius: var(--radius-badge);
    color: var(--badge-fg);
    display: inline-flex;
    font-size: 12px;
    font-weight: 500;
    gap: 6px;
    height: 22px;
    padding: 0 8px;
    white-space: nowrap;
  }
</style>
