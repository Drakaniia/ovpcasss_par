<script lang="ts">
  import type { InboxResponse, Role } from '@par/shared';

  import { api } from '$lib/api/client';
  import { toast } from '$lib/toast/toast.svelte';

  import {
    adminActionsFor,
    approvedRows,
    auditActivityRows,
    awaitingReviewRows,
    capabilitiesFor,
    inboxSectionsFor,
    inboxStatsFor,
    recentlyDecidedRows,
    reportActivityRows,
    returnedRows,
    withPicRows,
    type InboxRow,
  } from '../application/inbox-view';
  import InboxActionCard from './InboxActionCard.svelte';
  import InboxActivitySection from './InboxActivitySection.svelte';
  import InboxNothing from './InboxNothing.svelte';

  let {
    inbox,
    roles,
    now = new Date(),
    onrefresh,
  }: {
    inbox: InboxResponse;
    roles: readonly Role[];
    now?: Date;
    onrefresh?: () => void | Promise<void>;
  } = $props();

  const caps = $derived(capabilitiesFor(roles));
  const sections = $derived(inboxSectionsFor(roles, inbox));
  const stats = $derived(inboxStatsFor(roles, inbox));
  const adminActions = $derived(inbox.admin ? adminActionsFor(inbox.admin) : []);
  const decided = $derived(recentlyDecidedRows(inbox.recentlyDecided ?? [], now));

  const unread = $derived(inbox.notificationsUnread ?? 0);
  const digest = $derived(
    `${unread} ${unread === 1 ? 'unread notification' : 'unread notifications'}`,
  );

  const adminAudit = $derived(caps.admin ? (inbox.admin?.auditEvents ?? []) : []);
  const showingAudit = $derived(inbox.activity.length === 0 && adminAudit.length > 0);
  const activityRows = $derived(
    showingAudit ? auditActivityRows(adminAudit, now) : reportActivityRows(inbox.activity, now),
  );

  const awaitingReview = $derived(awaitingReviewRows(inbox.awaitingReview, now));
  const withPic = $derived(withPicRows(inbox.withPic, now));
  const returned = $derived(returnedRows(inbox.returned, now));
  const approved = $derived(approvedRows(inbox.approved, now));

  async function resend(row: InboxRow): Promise<void> {
    try {
      const result = await api.reports.resendInvitation(row.id);
      toast.success(
        `Assignment mailed to ${result.sentTo} ${result.sentTo === 1 ? 'person' : 'people'}.`,
      );
      await onrefresh?.();
    } catch {
      toast.error('The invitation was not sent. Try again.');
    }
  }

  const hasNothing = $derived(sections.length === 0);
</script>

{#if unread > 0}
  <p class="digest">
    <a href="/notifications">{digest}</a>
  </p>
{/if}

{#if hasNothing}
  {#if caps.admin}
    <InboxNothing
      title="Nothing needs your attention"
      description="Submitted narratives and records still with their personnel in charge appear here when the office needs to act."
      href="/reports/new"
      linkLabel="Create a record"
    />
  {:else}
    <InboxNothing
      title="Nothing needs your attention"
      description="Records that name you appear on Home."
      href="/"
      linkLabel="Back to Home"
    />
  {/if}
{:else}
  <div class="inbox">
    {#if stats.length > 0}
      <section class="stat-row" aria-label="At a glance">
        {#each stats as stat (stat.id)}
          <a class="stat" href={stat.href}>
            <span class="stat-count">{stat.count}</span>
            <span class="stat-label">{stat.label}</span>
          </a>
        {/each}
      </section>
    {/if}

    <div class="cards">
      {#if sections.includes('awaitingReview')}
        <InboxActionCard
          id="awaiting-review"
          title="Awaiting your decision"
          count={inbox.awaitingReview.total}
          href="/reports?tab=submitted"
          linkLabel="Open the register"
          rows={awaitingReview}
        />
      {/if}

      {#if sections.includes('withPic')}
        <InboxActionCard
          id="with-pic"
          title="With personnel in charge"
          count={inbox.withPic.total}
          href="/reports?tab=pending"
          linkLabel="Open the register"
          rows={withPic}
          onresend={(row) => void resend(row)}
        />
      {/if}

      {#if sections.includes('returned')}
        <InboxActionCard
          id="returned"
          title="Returned for revision"
          count={inbox.returned.total}
          href="/reports?tab=returned"
          linkLabel="Open the register"
          rows={returned}
        />
      {/if}

      {#if sections.includes('approved')}
        <InboxActionCard
          id="approved"
          title="Recently approved"
          count={inbox.approved.total}
          href="/reports?tab=approved"
          linkLabel="Open the register"
          rows={approved}
        />
      {/if}

      {#each adminActions as action (action.id)}
        <InboxActionCard
          id={action.id}
          title={action.title}
          count={action.count}
          href={action.href}
          linkLabel={action.linkLabel}
        />
      {/each}
    </div>

    {#if decided.length > 0}
      <InboxActivitySection title="Recently decided by you" rows={decided} />
    {/if}

    {#if inbox.activity.length > 0 || (caps.admin && adminAudit.length > 0)}
      <InboxActivitySection
        title={showingAudit ? 'Recent audit activity' : 'Recent activity'}
        rows={activityRows}
        href={showingAudit ? '/admin/audit' : undefined}
        linkLabel={showingAudit ? 'Open audit log' : undefined}
      />
    {/if}
  </div>
{/if}

<style>
  .inbox {
    display: flex;
    flex-direction: column;
    gap: 28px;
  }

  .cards {
    display: flex;
    flex-direction: column;
    gap: 8px;
  }

  .digest {
    font-size: 13px;
    margin: 0 0 16px;
  }

  .stat-row {
    display: grid;
    gap: 8px;
    grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
  }

  .stat {
    background: var(--surface-card);
    border: 1px solid var(--border);
    border-radius: var(--radius-card);
    box-shadow: var(--shadow-card);
    color: var(--text-primary);
    display: flex;
    flex-direction: column;
    gap: 2px;
    padding: 10px 14px;
    transition:
      box-shadow var(--duration-fast) var(--ease-standard),
      transform var(--duration-fast) var(--ease-standard);
  }

  .stat:hover {
    box-shadow: var(--shadow-raised);
    text-decoration: none;
    transform: translateY(-1px);
  }

  .stat:active {
    transform: scale(0.985);
  }

  .stat-count {
    font-size: 22px;
    font-variant-numeric: tabular-nums;
    font-weight: 500;
    letter-spacing: -0.01em;
    line-height: 1.15;
  }

  .stat-label {
    color: var(--text-secondary);
    font-size: 12px;
  }

  @media (prefers-reduced-motion: reduce) {
    .stat {
      transition: none;
    }

    .stat:hover,
    .stat:active {
      transform: none;
    }
  }
</style>
