<script lang="ts">
  let { rows = 8 }: { rows?: number } = $props();

  const rowList = $derived(Array.from({ length: rows }, (_, index) => index));
</script>

<div class="skeleton-list" aria-busy="true">
  <span class="sr-only" role="status">Loading audit events…</span>
  {#each rowList as row (row)}
    <div class="skeleton-row">
      <div class="skeleton line wide"></div>
      <div class="skeleton line narrow"></div>
    </div>
  {/each}
</div>

<style>
  .skeleton-list {
    background: var(--surface-card);
    border: 1px solid var(--border);
    border-radius: var(--radius-card);
    box-shadow: var(--shadow-card);
    display: flex;
    flex-direction: column;
  }

  .skeleton-row {
    border-bottom: 1px solid var(--border);
    display: flex;
    flex-direction: column;
    gap: 8px;
    height: 56px;
    justify-content: center;
    padding: 0 16px;
  }

  .skeleton-row:last-child {
    border-bottom: none;
  }

  .line {
    border-radius: var(--radius-badge);
  }

  .wide {
    height: 12px;
    width: 65%;
  }

  .narrow {
    height: 10px;
    width: 40%;
  }
</style>
