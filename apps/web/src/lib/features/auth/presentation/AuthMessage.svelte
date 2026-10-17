<script lang="ts">
  import { AlertCircle, CheckCircle2, Mail } from '@lucide/svelte';
  import type { Snippet } from 'svelte';

  type Tone = 'success' | 'error' | 'info';

  let {
    tone = 'info',
    title,
    children,
  }: { tone?: Tone; title: string; children: Snippet } = $props();

  const ICONS = { success: CheckCircle2, error: AlertCircle, info: Mail };
  const Icon = $derived(ICONS[tone]);
</script>

<div class="auth-message" role={tone === 'error' ? 'alert' : 'status'}>
  <span class="icon icon-{tone}" aria-hidden="true">
    <Icon size={22} />
  </span>
  <h2 class="title">{title}</h2>
  <div class="copy">{@render children()}</div>
</div>

<style>
  .auth-message {
    align-items: center;
    display: flex;
    flex-direction: column;
    gap: 8px;
    text-align: center;
  }

  .icon {
    align-items: center;
    border-radius: 50%;
    display: inline-flex;
    height: 44px;
    justify-content: center;
    margin-bottom: 4px;
    width: 44px;
  }

  .icon-success {
    background: var(--status-success-bg);
    color: var(--status-success-fg);
  }

  .icon-error {
    background: var(--status-danger-bg);
    color: var(--status-danger-fg);
  }

  .icon-info {
    background: var(--primary-subtle);
    color: var(--link);
  }

  .title {
    font-size: 16px;
    font-weight: 600;
    margin: 0;
    max-width: 34ch;
  }

  .copy {
    color: var(--text-secondary);
    font-size: 13px;
    max-width: 40ch;
  }

  .copy :global(p) {
    margin: 0;
  }

  .copy :global(p + p) {
    margin-top: 8px;
  }

  .copy :global(a) {
    font-weight: 500;
  }

  .copy :global(.btn) {
    margin-top: 12px;
  }
</style>
