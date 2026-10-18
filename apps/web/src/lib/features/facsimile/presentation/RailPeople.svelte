<script lang="ts">
  import type { PersonRow } from '../application/facsimile-people';

  /** People with a role label; roles that have not acted are omitted (§7.7). */
  let { rows }: { rows: PersonRow[] } = $props();
</script>

<section class="rail-section" aria-labelledby="rail-people-heading">
  <h2 id="rail-people-heading" class="rail-heading">People</h2>

  {#if rows.length === 0}
    <p class="empty">—</p>
  {:else}
    <ul class="people-list">
      {#each rows as row (row.role)}
        <li class="person">
          <span class="person-name">{row.name}</span>
          <span class="person-role">({row.roleLabel})</span>
        </li>
      {/each}
    </ul>
  {/if}
</section>

<style>
  .people-list {
    display: flex;
    flex-direction: column;
    gap: 6px;
    list-style: none;
    margin: 0;
    padding: 0;
  }

  .person {
    align-items: baseline;
    display: flex;
    flex-wrap: wrap;
    gap: 4px;
  }

  .person-name {
    color: var(--text-primary);
    font-size: 13px;
  }

  .person-role {
    color: var(--text-secondary);
    font-size: 11.5px;
  }
</style>
