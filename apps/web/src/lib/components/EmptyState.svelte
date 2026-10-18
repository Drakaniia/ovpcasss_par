<script lang="ts">
  import { Inbox } from '@lucide/svelte';

  let {
    title,
    description,
    action,
    actionVariant = 'primary',
  }: {
    title: string;
    description: string;
    /** `onclick` lets a page act in place (for example, open a drawer) instead of linking away. */
    action?: { label: string; href?: string; onclick?: () => void };
    /** Outline keeps a filtered-empty page free of a filled primary button. */
    actionVariant?: 'primary' | 'outline';
  } = $props();
</script>

<div class="empty-state">
  <span class="empty-icon" aria-hidden="true">
    <Inbox size={24} />
  </span>
  <h2 class="empty-title">{title}</h2>
  <p class="empty-description">{description}</p>
  {#if action}
    {#if action.href}
      <a class="btn btn-{actionVariant}" href={action.href}>{action.label}</a>
    {:else}
      <button class="btn btn-{actionVariant}" type="button" onclick={action.onclick}>
        {action.label}
      </button>
    {/if}
  {/if}
</div>

<style>
  .empty-state {
    align-items: center;
    display: flex;
    flex-direction: column;
    gap: 8px;
    padding: 48px 24px;
    text-align: center;
  }

  .empty-icon {
    align-items: center;
    background: var(--primary-subtle);
    border-radius: 50%;
    color: var(--text-secondary);
    display: inline-flex;
    height: 48px;
    justify-content: center;
    margin-bottom: 8px;
    width: 48px;
  }

  .empty-title {
    margin: 0;
  }

  .empty-description {
    color: var(--text-secondary);
    margin: 0 0 8px;
    max-width: 46ch;
  }
</style>
