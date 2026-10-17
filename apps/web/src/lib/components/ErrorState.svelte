<script lang="ts">
  import { AlertCircle, FileQuestion, LockKeyhole } from '@lucide/svelte';

  import { ROLE_LABELS } from '$lib/navigation/navigation';

  type Variant = 'error' | 'permission' | 'not-found';
  type RequiredRole = keyof typeof ROLE_LABELS;

  let {
    variant = 'error',
    requiredRole,
    title,
    description,
    requestId,
    onretry,
    backHref = '/reports',
    backLabel = 'Back to reports',
  }: {
    variant?: Variant;
    requiredRole?: RequiredRole;
    /** Page phases may name their own surface; the default copy is report-specific. */
    title?: string;
    description?: string;
    requestId?: string;
    onretry?: () => void;
    backHref?: string;
    backLabel?: string;
  } = $props();

  const COPY: Record<Variant, { title: string; description: string }> = {
    error: {
      title: 'We could not load this report',
      description: 'The request did not complete. Try again, or return to the reports list.',
    },
    permission: {
      title: 'You do not have access to this page',
      description:
        'This page requires a different role. Contact the OVPCASSS administrator if you believe this is a mistake.',
    },
    'not-found': {
      title: 'This report does not exist or you do not have access',
      description: 'The link may be incorrect, or the report may have been removed.',
    },
  };

  const ICONS = { error: AlertCircle, permission: LockKeyhole, 'not-found': FileQuestion };

  const copy = $derived({
    title: title ?? COPY[variant].title,
    description: description ?? COPY[variant].description,
  });
  const Icon = $derived(ICONS[variant]);
  const permissionRole = $derived(requiredRole ? ROLE_LABELS[requiredRole] : 'the required');
</script>

<div class="error-state" role="alert">
  <span class="error-icon" aria-hidden="true">
    <Icon size={24} />
  </span>
  <h2 class="error-title">{copy.title}</h2>
  <p class="error-description">
    {#if variant === 'permission' && !description}
      This page requires {permissionRole} access. Contact the OVPCASSS administrator if you believe this
      is a mistake.
    {:else}
      {copy.description}
    {/if}
  </p>

  {#if variant === 'error' && requestId}
    <p class="request-id">Request ID: <span class="mono">{requestId}</span></p>
  {/if}

  <div class="error-actions">
    {#if variant === 'error' && onretry}
      <button class="btn btn-primary" type="button" onclick={onretry}>Retry</button>
    {/if}
    <a class="btn btn-outline" href={backHref}>{backLabel}</a>
  </div>
</div>

<style>
  .error-state {
    align-items: center;
    display: flex;
    flex-direction: column;
    gap: 8px;
    padding: 48px 24px;
    text-align: center;
  }

  .error-icon {
    align-items: center;
    background: var(--status-danger-bg);
    border-radius: 50%;
    color: var(--status-danger-fg);
    display: inline-flex;
    height: 48px;
    justify-content: center;
    margin-bottom: 8px;
    width: 48px;
  }

  .error-title {
    margin: 0;
    max-width: 52ch;
  }

  .error-description {
    color: var(--text-secondary);
    margin: 0;
    max-width: 52ch;
  }

  .request-id {
    color: var(--text-secondary);
    font-size: 12px;
    margin: 0;
  }

  .mono {
    font-family: var(--font-mono);
  }

  .error-actions {
    display: flex;
    gap: 8px;
    margin-top: 12px;
  }
</style>
