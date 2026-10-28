<script lang="ts">
  import type { Role } from '@par/shared';
  import { Plus } from '@lucide/svelte';

  import { formatLongDate } from '$lib/format/datetime';
  import { greetingFor } from '$lib/format/greeting';
  import { ROLE_LABELS } from '$lib/navigation/navigation';
  import type { SessionUser } from '$lib/session/session.svelte';

  let {
    user,
    roles,
    lede = '',
    showPrimary = true,
    now = new Date(),
  }: {
    user: SessionUser;
    roles: readonly Role[];
    /** One line under the greeting saying what this page holds. */
    lede?: string;
    /** Kept off while a page-level error owns the single primary action. */
    showPrimary?: boolean;
    now?: Date;
  } = $props();

  const greeting = $derived(greetingFor(now));
  const dateline = $derived(formatLongDate(now.toISOString()));
  const roleText = $derived(
    roles.length > 0 ? roles.map((role) => ROLE_LABELS[role]).join(' · ') : 'Role not yet assigned',
  );
  const canCreate = $derived(roles.includes('ADMIN'));
</script>

<header class="home-head">
  <div class="identity">
    <h1>{greeting}, {user.fullName}</h1>
    <p class="context">
      {roleText}{#if user.campusUnit}<span class="sep" aria-hidden="true">·</span
        >{user.campusUnit}{/if}
    </p>
    {#if lede}
      <p class="lede">{lede}</p>
    {/if}
  </div>

  <div class="aside">
    <p class="dateline">{dateline}</p>
    {#if showPrimary && canCreate}
      <a class="btn btn-primary" data-tour="new-record" href="/reports/new">
        <Plus size={16} aria-hidden="true" />
        New record
      </a>
    {/if}
  </div>
</header>

<style>
  /*
   * A letterhead, not a dashboard title: the greeting is the heading, the date
   * sits where a register would stamp it, and one short gold rule under the
   * block is the only ornament. The rule is the office's seal accent, so it is
   * decorative on purpose and carries no state.
   */
  .home-head {
    align-items: flex-start;
    border-bottom: 1px solid var(--border);
    display: flex;
    gap: 32px;
    justify-content: space-between;
    margin-bottom: 28px;
    padding-bottom: 20px;
    position: relative;
  }

  .home-head::after {
    background: var(--brand-gold-400);
    bottom: -1px;
    content: '';
    height: 2px;
    left: 0;
    position: absolute;
    width: 40px;
  }

  .identity {
    display: flex;
    flex-direction: column;
    gap: 2px;
    min-width: 0;
  }

  h1 {
    font-size: 26px;
    letter-spacing: -0.02em;
    line-height: 1.2;
    margin: 0;
  }

  .context {
    color: var(--text-secondary);
    font-size: 13px;
    margin: 2px 0 0;
  }

  .sep {
    margin-inline: 6px;
  }

  .lede {
    color: var(--text-secondary);
    font-size: 13px;
    line-height: 1.5;
    margin: 8px 0 0;
    max-width: 68ch;
  }

  .aside {
    align-items: flex-end;
    display: flex;
    flex: none;
    flex-direction: column;
    gap: 14px;
  }

  .dateline {
    color: var(--text-secondary);
    font-size: 11px;
    font-variant-numeric: tabular-nums;
    letter-spacing: 0.06em;
    margin: 0;
    text-transform: uppercase;
  }

  .btn {
    flex: none;
  }
</style>
