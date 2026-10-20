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
   * The reviewer's decision control (spec §7.3): Endorse and Return, or the
   * reason this reviewer may not act. Used by the queue preview pane and the
   * `/review/[id]` Actions rail, so both open the same drawer.
   */
  let {
    subject,
    controller,
    shortcuts = false,
  }: {
    subject: DecisionSubject;
    controller: DecisionController;
    /** The report page binds `E` and `R`; the queue pane does not. */
    shortcuts?: boolean;
  } = $props();

  const availability = $derived(
    decisionAvailability(subject, {
      userId: session.user?.id ?? null,
      role: session.user?.role ?? null,
    }),
  );

  function open(action: DecisionAction) {
    controller.start(action, subject);
  }

  $effect(() => {
    if (!shortcuts) return;
    return installDecisionShortcuts(availability.buttons, open);
  });
</script>

<DecisionActions
  buttons={availability.buttons}
  blocked={availability.blocked}
  {shortcuts}
  ondecide={open}
/>
