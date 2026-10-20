<script lang="ts">
  import type { InboxResponse, Role } from '@par/shared';

  import {
    adminActionsFor,
    auditActivityRows,
    capabilitiesFor,
    inboxSectionsFor,
    queueRows,
    reportActivityRows,
    returnedRows,
    type InboxSectionId,
  } from '../application/inbox-view';
  import InboxActionCard from './InboxActionCard.svelte';
  import InboxActivitySection from './InboxActivitySection.svelte';
  import InboxDraftsSection from './InboxDraftsSection.svelte';
  import InboxNothing from './InboxNothing.svelte';
  import InboxOnboardingChecklist from './InboxOnboardingChecklist.svelte';
  import InboxWaitingSection from './InboxWaitingSection.svelte';

  let {
    inbox,
    roles,
    now = new Date(),
  }: {
    inbox: InboxResponse;
    roles: readonly Role[];
    now?: Date;
  } = $props();

  const ACTION_IDS = new Set<InboxSectionId>(['returned', 'review', 'approval', 'admin']);

  const caps = $derived(capabilitiesFor(roles));
  const sections = $derived(inboxSectionsFor(roles, inbox));
  const actionSections = $derived(sections.filter((id) => ACTION_IDS.has(id)));
  const adminActions = $derived(inbox.admin ? adminActionsFor(inbox.admin) : []);

  const adminAudit = $derived(caps.admin ? (inbox.admin?.auditEvents ?? []) : []);
  const showingAudit = $derived(inbox.activity.length === 0 && adminAudit.length > 0);
  const activityRows = $derived(
    showingAudit ? auditActivityRows(adminAudit, now) : reportActivityRows(inbox.activity, now),
  );

  // The counts are server totals; rows never exceed three even if a payload does.
  const returned = $derived(returnedRows(inbox.returned.items.slice(0, 3), now));
  const review = $derived(queueRows(inbox.review.items.slice(0, 3), 'review', now));
  const approval = $derived(queueRows(inbox.approval.items.slice(0, 3), 'approval', now));
</script>

{#if sections.length === 0}
  {#if caps.admin}
    <InboxNothing
      title="Nothing needs your attention"
      description="Role approvals and failed emails appear here when an administrator needs to act."
      href="/admin/users"
      linkLabel="Open users"
    />
  {:else if caps.submitter}
    <InboxOnboardingChecklist onboarding={inbox.onboarding} />
  {:else if caps.reviewer && caps.approver}
    <InboxNothing
      title="No reports are awaiting your decision"
      description="Reports submitted for review or approval appear here."
      href="/reports"
      linkLabel="View all reports"
    />
  {:else if caps.reviewer}
    <InboxNothing
      title="No reports are awaiting your review"
      description="Submitted reports appear here when a submitter sends them for review."
      href="/reports"
      linkLabel="View all reports"
    />
  {:else if caps.approver}
    <InboxNothing
      title="No reports are awaiting your approval"
      description="Endorsed reports appear here for the approving officer."
      href="/reports"
      linkLabel="View all reports"
    />
  {:else}
    <InboxNothing
      title="Nothing needs your attention"
      description="Your reports and queues appear here."
      href="/reports"
      linkLabel="View all reports"
    />
  {/if}
{:else}
  <div class="inbox">
    {#if actionSections.length > 0}
      <section class="group" aria-labelledby="inbox-needs-action">
        <h2 id="inbox-needs-action">Needs your action</h2>

        <div class="cards">
          {#if actionSections.includes('returned')}
            <InboxActionCard
              id="returned"
              title="Returned to you"
              count={inbox.returned.total}
              href="/reports?tab=returned"
              linkLabel="Review changes"
              rows={returned}
            />
          {/if}

          {#if actionSections.includes('review')}
            <InboxActionCard
              id="review"
              title="Awaiting your review"
              count={inbox.review.total}
              href="/review"
              linkLabel="Open queue"
              rows={review}
            />
          {/if}

          {#if actionSections.includes('approval')}
            <InboxActionCard
              id="approval"
              title="Awaiting your approval"
              count={inbox.approval.total}
              href="/approval"
              linkLabel="Open queue"
              rows={approval}
            />
          {/if}

          {#if actionSections.includes('admin')}
            {#each adminActions as action (action.id)}
              <InboxActionCard
                id={action.id}
                title={action.title}
                count={action.count}
                href={action.href}
                linkLabel={action.linkLabel}
              />
            {/each}
          {/if}
        </div>
      </section>
    {/if}

    {#if sections.includes('drafts')}
      <InboxDraftsSection section={inbox.drafts} {now} />
    {/if}

    {#if sections.includes('waiting')}
      <InboxWaitingSection section={inbox.waiting} {now} />
    {/if}

    {#if sections.includes('activity')}
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
    gap: 32px;
  }

  .group {
    display: flex;
    flex-direction: column;
    gap: 8px;
  }

  .group > h2 {
    font-size: 12px;
    font-weight: 500;
    letter-spacing: 0.04em;
    margin: 0;
    text-transform: uppercase;
  }

  .cards {
    display: flex;
    flex-direction: column;
    gap: 8px;
  }
</style>
