<script lang="ts">
  import type { ReportPeople } from '@par/shared';

  import { formatDateTime } from '$lib/format/datetime';

  let { people }: { people: ReportPeople } = $props();

  const entries = $derived([
    { label: 'Created by', person: people.createdBy, empty: 'Unavailable account' },
    { label: 'First edited by', person: people.firstEditedBy, empty: 'Not edited' },
    { label: 'Last edited by', person: people.lastEditedBy, empty: 'Not edited' },
    { label: 'Submitted by', person: people.submittedBy, empty: 'Not submitted' },
  ]);
</script>

<section aria-labelledby="attribution-title">
  <h2 id="attribution-title">Record activity</h2>
  <dl>
    {#each entries as entry (entry.label)}
      <dt>{entry.label}</dt>
      <dd>
        {entry.person?.fullName ?? entry.empty}
        {#if entry.person?.actedAt}
          <time datetime={entry.person.actedAt}>{formatDateTime(entry.person.actedAt)}</time>
        {/if}
      </dd>
    {/each}
  </dl>
</section>

<style>
  h2 {
    font-size: 12px;
    margin: 0 0 10px;
  }

  dl {
    display: grid;
    font-size: 12px;
    gap: 4px;
    margin: 0;
    overflow-wrap: anywhere;
  }

  dt,
  time {
    color: var(--text-secondary);
    font-size: 11px;
  }

  dd {
    margin: 0 0 8px;
  }

  time {
    display: block;
  }
</style>
