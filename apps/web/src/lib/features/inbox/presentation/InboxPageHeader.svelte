<script lang="ts">
  import type { Role } from '@par/shared';
  import { Plus } from '@lucide/svelte';

  import { greetingFor } from '$lib/format/greeting';
  import { ROLE_LABELS } from '$lib/navigation/navigation';
  import type { SessionUser } from '$lib/session/session.svelte';

  let {
    user,
    roles,
    showPrimary = true,
    now = new Date(),
  }: {
    user: SessionUser;
    roles: readonly Role[];
    /** Kept off while a page-level error owns the single primary action. */
    showPrimary?: boolean;
    now?: Date;
  } = $props();

  const greeting = $derived(greetingFor(now));
  const roleText = $derived(
    roles.length > 0 ? roles.map((role) => ROLE_LABELS[role]).join(' · ') : 'Role not yet assigned',
  );
</script>

<header class="inbox-head">
  <div class="identity">
    <h1>{greeting}, {user.fullName}</h1>
    <p class="detail">
      {roleText}{#if user.campusUnit}<span class="sep" aria-hidden="true">·</span
        >{user.campusUnit}{/if}
    </p>
  </div>

  {#if showPrimary && roles.includes('SUBMITTER')}
    <a class="btn btn-primary" data-tour="new-report" href="/reports/new">
      <Plus size={16} aria-hidden="true" />
      New report
    </a>
  {/if}
</header>

<style>
  .inbox-head {
    align-items: flex-start;
    display: flex;
    gap: 24px;
    justify-content: space-between;
    margin-bottom: 24px;
  }

  h1 {
    margin: 0;
  }

  .detail {
    color: var(--text-secondary);
    font-size: 13px;
    margin: 4px 0 0;
  }

  .sep {
    margin-inline: 6px;
  }

  .btn {
    flex: none;
  }
</style>
