<script lang="ts">
  import { Plus } from '@lucide/svelte';
  import { actsAs, type Role } from '@par/shared';

  import { subtitleFor } from '../application/report-list';

  let { role }: { role: Role | null } = $props();
</script>

<header class="page-head">
  <div>
    <h1>My reports</h1>
    <p class="subtitle">{subtitleFor(role)}</p>
  </div>

  {#if actsAs(role, 'SUBMITTER')}
    <a class="btn btn-primary" href="/reports/new">
      <Plus size={16} aria-hidden="true" />
      New report
    </a>
  {/if}
</header>

<style>
  .page-head {
    align-items: flex-start;
    display: flex;
    gap: 24px;
    justify-content: space-between;
    margin-bottom: 16px;
  }

  .btn {
    flex: none;
  }

  h1 {
    letter-spacing: -0.01em;
    margin: 0;
  }

  .subtitle {
    color: var(--text-secondary);
    font-size: 13px;
    margin: 4px 0 0;
  }
</style>
