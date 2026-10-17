<script lang="ts">
  import type { InboxSection } from '@par/shared';

  import { waitingRows } from '../application/inbox-view';
  import InboxRow from './InboxRow.svelte';

  let { section, now }: { section: InboxSection; now: Date } = $props();

  const rows = $derived(waitingRows(section.items, now));
</script>

<section class="group" aria-labelledby="inbox-waiting">
  <h2 id="inbox-waiting">Waiting on the office</h2>
  <ul class="card rows">
    {#each rows as row (row.id)}
      <InboxRow {row} />
    {/each}
  </ul>
</section>

<style>
  .group {
    display: flex;
    flex-direction: column;
    gap: 8px;
  }

  h2 {
    font-size: 12px;
    font-weight: 500;
    letter-spacing: 0.04em;
    margin: 0;
    text-transform: uppercase;
  }

  .rows {
    margin: 0;
    overflow: hidden;
    padding: 0;
  }
</style>
