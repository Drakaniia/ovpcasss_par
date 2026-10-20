<script lang="ts">
  import type { DecisionAction } from '@par/shared';

  import type { DecisionButton } from '../application/queue-decisions';

  /**
   * Endorse/Approve (navy) and Return (maroon), or the reason this role cannot
   * decide (UI spec §7.9, §7.10). A disabled button never relies on a tooltip:
   * the reason is written next to it.
   */
  let {
    buttons,
    blocked = null,
    ondecide,
    shortcuts = false,
  }: {
    buttons: DecisionButton[];
    blocked?: string | null;
    ondecide: (action: DecisionAction) => void;
    /** Only the report pages bind `E`/`A`/`R`; the queue pane does not. */
    shortcuts?: boolean;
  } = $props();

  const KEY_HINTS: Record<DecisionAction, string> = { ENDORSE: 'E', APPROVE: 'A', RETURN: 'R' };

  const reasons = $derived([
    ...new Set(
      buttons.map((button) => button.reason).filter((reason): reason is string => Boolean(reason)),
    ),
  ]);
</script>

{#if buttons.length > 0}
  <div class="decision-actions">
    {#each buttons as button (button.action)}
      <button
        class={button.tone === 'danger' ? 'btn btn-danger' : 'btn btn-primary'}
        type="button"
        disabled={!button.enabled}
        onclick={() => ondecide(button.action)}
      >
        {button.label}
        {#if shortcuts}
          <kbd class="kbd">{KEY_HINTS[button.action]}</kbd>
        {/if}
      </button>
    {/each}
  </div>

  {#each reasons as reason (reason)}
    <p class="action-reason">{reason}</p>
  {/each}
{:else if blocked}
  <p class="action-reason">{blocked}</p>
{/if}

<style>
  .decision-actions {
    display: flex;
    flex-wrap: wrap;
    gap: 8px;
  }

  .decision-actions .kbd {
    background: transparent;
    border-color: currentColor;
    color: inherit;
    font-size: 10px;
    opacity: 0.75;
    padding: 2px 4px;
  }

  .action-reason {
    color: var(--text-secondary);
    font-size: 12px;
    line-height: 1.45;
    margin: 8px 0 0;
    max-width: 44ch;
  }
</style>
