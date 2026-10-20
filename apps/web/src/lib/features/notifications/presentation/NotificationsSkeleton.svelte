<script lang="ts">
  /** Six rows across two day blocks, matching the real row rhythm (phase 11 §5). */
  const blocks = [
    { rows: [92, 74, 84] },
    { rows: [66, 88, 58] },
  ];
</script>

<div class="skeleton-list" aria-busy="true">
  <span class="sr-only">Loading notifications</span>

  {#each blocks as block, blockIndex (blockIndex)}
    <div class="block" aria-hidden="true">
      <span class="skeleton block-label"></span>
      <div class="rows">
        {#each block.rows as width, rowIndex (rowIndex)}
          <div class="row">
            <span class="skeleton dot"></span>
            <span class="skeleton bar" style="width: {width}%"></span>
          </div>
        {/each}
      </div>
    </div>
  {/each}
</div>

<style>
  .skeleton-list {
    display: flex;
    flex-direction: column;
    gap: 20px;
  }

  .block-label {
    display: block;
    height: 10px;
    margin-left: 16px;
    width: 72px;
  }

  .rows {
    background: var(--surface-card);
    border: 1px solid var(--border);
    border-radius: var(--radius-card);
    margin-top: 8px;
  }

  .row {
    align-items: center;
    border-bottom: 1px solid var(--border);
    display: flex;
    gap: 10px;
    padding: 14px 16px;
  }

  .row:last-child {
    border-bottom: 0;
  }

  .dot {
    border-radius: 50%;
    flex: none;
    height: 8px;
    width: 8px;
  }

  .bar {
    display: block;
    height: 10px;
  }
</style>
