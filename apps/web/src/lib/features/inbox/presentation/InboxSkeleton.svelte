<script lang="ts">
  let { showHead = true }: { showHead?: boolean } = $props();
</script>

<div class="inbox-skeleton" aria-busy="true">
  <p class="sr-only" role="status">Loading your work inbox…</p>

  {#if showHead}
    <div class="head">
      <div>
        <div class="skeleton" style="height: 24px; width: 320px"></div>
        <div class="skeleton" style="height: 12px; margin-top: 8px; width: 220px"></div>
      </div>
      <div class="skeleton" style="height: 36px; width: 128px"></div>
    </div>
  {/if}

  <div class="body">
    <div class="skeleton" style="height: 12px; width: 140px"></div>

    {#each [1, 2] as card (card)}
      <div class="card section-card" aria-hidden="true">
        <div class="section-head">
          <div class="skeleton" style="height: 14px; width: 180px"></div>
          <div class="skeleton" style="height: 14px; width: 96px"></div>
        </div>
        {#each [1, 2, 3] as row (row)}
          <div class="skeleton row"></div>
        {/each}
      </div>
    {/each}
  </div>
</div>

<style>
  .head {
    align-items: flex-start;
    display: flex;
    gap: 24px;
    justify-content: space-between;
    margin-bottom: 24px;
  }

  .body {
    display: flex;
    flex-direction: column;
    gap: 8px;
  }

  .section-card {
    overflow: hidden;
  }

  .section-head {
    align-items: center;
    display: flex;
    justify-content: space-between;
    padding: 12px 16px;
  }

  .row {
    border-radius: 0;
    display: block;
    height: 40px;
    margin: 1px 16px;
  }
</style>
