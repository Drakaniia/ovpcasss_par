<script lang="ts">
  import type { QueueKind, ReportDetail } from '@par/shared';
  import { untrack } from 'svelte';

  import ApprovalActions from '$lib/features/approval/presentation/ApprovalActions.svelte';
  import { FacsimileState } from '$lib/features/facsimile/application/facsimile-state.svelte';
  import FacsimilePage from '$lib/features/facsimile/presentation/FacsimilePage.svelte';
  import ReviewActions from '$lib/features/review/presentation/ReviewActions.svelte';

  import { DecisionController } from '../application/decision-controller.svelte';
  import { decisionSubjectFromDetail } from '../application/queue-decisions';
  import { queueHref, queuePath } from '../application/queue-filters';
  import DecisionDrawer from './DecisionDrawer.svelte';

  /**
   * `/review/[id]` and `/approval/[id]` (UI spec §7.9): the phase 08 record view
   * with the role's decision buttons in the Actions rail. A decision replaces the
   * loaded report with the API response, so the badge, stepper, and history move
   * without a reload. The URL carries the queue's filters, so the breadcrumb
   * returns to the same backlog view.
   */
  let { kind, id, search = '' }: { kind: QueueKind; id: string; search?: string } = $props();

  const facsimile = untrack(() => new FacsimileState(id));
  const controller = untrack(
    () =>
      new DecisionController({
        ondecided: (detail: ReportDetail) => {
          facsimile.detail = detail;
        },
        onstale: () => void facsimile.load(),
      }),
  );

  const detail = $derived(facsimile.detail);
  const queueName = $derived(kind === 'review' ? 'Review queue' : 'Approval queue');
</script>

<FacsimilePage
  {id}
  facsimileState={facsimile}
  backHref={queueHref(queuePath(kind), search)}
  backLabel={queueName}
>
  {#snippet actions()}
    <!-- An approved report has no decision left: the rail's acknowledgement is
         the next action, so nothing is rendered here. -->
    {#if detail && detail.status !== 'APPROVED'}
      {#if kind === 'review'}
        <ReviewActions
          subject={decisionSubjectFromDetail(detail, 'review')}
          {controller}
          shortcuts
        />
      {:else}
        <ApprovalActions
          subject={decisionSubjectFromDetail(detail, 'approval')}
          {controller}
          shortcuts
        />
      {/if}
    {/if}
  {/snippet}
</FacsimilePage>

<DecisionDrawer {controller} />
