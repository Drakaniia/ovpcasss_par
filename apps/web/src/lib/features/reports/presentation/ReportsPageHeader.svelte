<script lang="ts">
  import { Plus } from '@lucide/svelte';
  import type { Role } from '@par/shared';

  let { role }: { role: Role | null } = $props();

  const admin = $derived(role === 'ADMIN');
</script>

<header class="page-head">
  <div class="identity">
    <h1>{admin ? 'Reports' : 'My reports'}</h1>
    <p class="lede">
      {#if admin}
        Every record the office registered, from AR No. 0001 onward. Open a record to check the
        narrative, decide on it, and download its acknowledgment receipts.
      {:else}
        The activities you are the personnel in charge of. Write the narrative report, submit it,
        and download the acknowledgment receipt once the office approves it.
      {/if}
    </p>
  </div>

  {#if admin}
    <a class="btn btn-primary" href="/reports/new">
      <Plus size={16} aria-hidden="true" />
      New record
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

  .identity {
    display: flex;
    flex-direction: column;
    gap: 2px;
    min-width: 0;
  }

  h1 {
    margin: 0;
  }

  .lede {
    color: var(--text-secondary);
    font-size: 13px;
    margin: 0;
    max-width: 72ch;
  }

  .btn {
    display: inline-flex;
    flex: none;
    gap: 6px;
  }
</style>
