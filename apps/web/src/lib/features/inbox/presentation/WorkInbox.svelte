<script lang="ts">
  import type { InboxResponse, Role } from '@par/shared';
  import { ArrowRight, Bell } from '@lucide/svelte';

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

  const hasActivity = $derived(inbox.activity.length > 0 || (caps.admin && adminAudit.length > 0));
  /** The quiet record of work is a rail only when it has something to hold. */
  const hasRail = $derived(decided.length > 0 || hasActivity);

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
  const leadIsReview = $derived(sections[0] === 'awaitingReview');
</script>

{#if unread > 0}
  <a class="digest" href="/notifications">
    <Bell size={14} aria-hidden="true" />
    {digest}
    <ArrowRight size={13} aria-hidden="true" />
  </a>
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
  <div class="desk">
    <div class="main">
      {#if stats.length > 0}
        <section class="brief" aria-label="At a glance">
          <p class="eyebrow">At a glance</p>
          <div class="brief-grid">
            {#each stats as stat (stat.id)}
              <a class="stat" href={stat.href}>
                <span class="stat-count">{stat.count}</span>
                <span class="stat-label">{stat.label}</span>
              </a>
            {/each}
          </div>
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
            lead={leadIsReview}
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
            lead={!leadIsReview && sections[0] === 'withPic'}
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
            lead={sections[0] === 'returned'}
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
            lead={sections[0] === 'approved'}
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
    </div>

    {#if hasRail}
      <aside class="rail" aria-label="Your record of work">
        {#if decided.length > 0}
          <InboxActivitySection title="Recently decided by you" rows={decided} />
        {/if}

        {#if hasActivity}
          <InboxActivitySection
            title={showingAudit ? 'Recent audit activity' : 'Recent activity'}
            rows={activityRows}
            href={showingAudit ? '/admin/audit' : undefined}
            linkLabel={showingAudit ? 'Open audit log' : undefined}
          />
        {/if}
      </aside>
    {/if}
  </div>
{/if}

<style>
  /*
   * The desk: the work that needs a decision holds the wide column, the record
   * of what already happened sits in the narrow one. Below 1280 px the rail
   * falls under the work rather than shrinking both.
   */
  .desk {
    align-items: start;
    animation: settle var(--duration-slow) var(--ease-standard) both;
    display: grid;
    gap: 32px;
    grid-template-columns: minmax(0, 1fr);
  }

  /* The content arrives once, after the skeleton: a short rise, no stagger. */
  @keyframes settle {
    from {
      opacity: 0;
      transform: translateY(6px);
    }
  }

  @media (prefers-reduced-motion: reduce) {
    .desk {
      animation: none;
    }
  }

  .main {
    display: flex;
    flex-direction: column;
    gap: 20px;
    min-width: 0;
  }

  .cards {
    display: flex;
    flex-direction: column;
    gap: 12px;
  }

  .rail {
    display: flex;
    flex-direction: column;
    gap: 12px;
    min-width: 0;
  }

  .digest {
    align-items: center;
    background: var(--surface-card);
    border: 1px solid var(--border);
    border-radius: var(--radius-card);
    color: var(--text-primary);
    display: inline-flex;
    font-size: 12.5px;
    gap: 8px;
    margin-bottom: 16px;
    min-height: 32px;
    padding: 0 12px;
    transition: background-color var(--duration-fast) ease;
  }

  .digest:hover {
    background: var(--row-hover);
    text-decoration: none;
  }

  .brief {
    display: flex;
    flex-direction: column;
    gap: 8px;
  }

  .eyebrow {
    color: var(--text-secondary);
    font-size: 11px;
    letter-spacing: 0.06em;
    margin: 0;
    text-transform: uppercase;
  }

  /* One instrument, not three floating tiles: the hairline gaps are the dividers. */
  .brief-grid {
    background: var(--border);
    border: 1px solid var(--border);
    border-radius: var(--radius-card);
    box-shadow: var(--shadow-card);
    display: grid;
    gap: 1px;
    grid-template-columns: repeat(auto-fit, minmax(190px, 1fr));
    overflow: hidden;
  }

  .stat {
    align-items: center;
    background: var(--surface-card);
    color: var(--text-primary);
    display: flex;
    gap: 12px;
    padding: 14px 18px;
    transition: background-color var(--duration-fast) ease;
  }

  .stat:hover {
    background: var(--row-hover);
    text-decoration: none;
  }

  .stat-count {
    font-size: 26px;
    font-variant-numeric: tabular-nums;
    font-weight: 500;
    letter-spacing: -0.02em;
    line-height: 1;
  }

  .stat-label {
    color: var(--text-secondary);
    font-size: 12px;
    line-height: 1.35;
  }

  @media (min-width: 1280px) {
    .desk {
      grid-template-columns: minmax(0, 1fr) 320px;
    }
  }
</style>
