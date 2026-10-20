<script lang="ts">
  import type { DecisionAction } from '@par/shared';

  import type { DecisionController } from '$lib/features/queues/application/decision-controller.svelte';
  import { installDecisionShortcuts } from '$lib/features/queues/application/decision-shortcuts';
  import {
    decisionAvailability,
    type DecisionSubject,
  } from '$lib/features/queues/application/queue-decisions';
  import DecisionActions from '$lib/features/queues/presentation/DecisionActions.svelte';
  import { session } from '$lib/session/session.svelte';

  /**
   * The approver's decision control (spec §7.3): Approve and Return. Approving
   * without a signature on file is blocked inside the drawer, with the way to
   * add one; the buttons stay live so the reason is explained, not implied.
   */
  let {
    subject,
    controller,
    shortcuts = false,
  }: {
    subject: DecisionSubject;
    controller: DecisionController;
    /** The report page binds `A` and `R`; the queue pane does not. */
    shortcuts?: boolean;
  } = $props();

  const availability = $derived(
    decisionAvailability(subject, {
      userId: session.user?.id ?? null,
      role: session.user?.role ?? null,
    }),
  );

  /** Approval needs a signature on file; say so before the drawer, not inside it. */
  const signatureMissing = $derived(
    availability.buttons.length > 0 && session.user?.hasSignature === false,
  );

  function open(action: DecisionAction) {
    controller.start(action, subject);
  }

  $effect(() => {
    if (!shortcuts) return;
    return installDecisionShortcuts(availability.buttons, open);
  });
</script>

{#if signatureMissing}
  <p class="signature-note">
    A signature is required before approving. <a href="/profile">Add your signature</a>.
  </p>
{/if}

<DecisionActions
  buttons={availability.buttons}
  blocked={availability.blocked}
  {shortcuts}
  ondecide={open}
/>

<style>
  .signature-note {
    color: var(--status-gold-fg);
    font-size: 12px;
    line-height: 1.45;
    margin: 0 0 10px;
  }
</style>
