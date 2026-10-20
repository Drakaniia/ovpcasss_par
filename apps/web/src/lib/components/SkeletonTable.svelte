<script lang="ts">
  let { rows = 8, widths = [16, 34, 12, 16, 22] }: { rows?: number; widths?: number[] } = $props();

  const rowIndexes = $derived(Array.from({ length: rows }, (_, index) => index));
</script>

<div class="table-scroll" aria-busy="true">
  <span class="sr-only" role="status">Loading</span>
  <table class="data-table" aria-hidden="true">
    <thead>
      <tr>
        {#each widths as width, index (index)}
          <th><span class="skeleton bar" style="width: {width}%"></span></th>
        {/each}
      </tr>
    </thead>
    <tbody>
      {#each rowIndexes as row (row)}
        <tr>
          {#each widths as width, index (index)}
            <td><span class="skeleton bar" style="width: {width}%"></span></td>
          {/each}
        </tr>
      {/each}
    </tbody>
  </table>
</div>

<style>
  .bar {
    display: block;
    height: 10px;
  }
</style>
