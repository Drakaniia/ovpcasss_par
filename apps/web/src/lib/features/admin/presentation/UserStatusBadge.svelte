<script lang="ts">
  import type { UserStatus } from '@par/shared';
  import { Ban, Check, Clock, Mail } from '@lucide/svelte';

  import { USER_STATUS_PRESENTATION, type UserStatusIcon } from '../application/user-directory';

  let { status }: { status: UserStatus } = $props();

  const ICONS: Record<UserStatusIcon, typeof Check> = {
    mail: Mail,
    clock: Clock,
    check: Check,
    ban: Ban,
  };

  const meta = $derived(USER_STATUS_PRESENTATION[status]);
  const Icon = $derived(ICONS[meta.icon]);
</script>

<span
  class="status-badge"
  style="--badge-bg: var(--status-{meta.tone}-bg); --badge-fg: var(--status-{meta.tone}-fg)"
>
  <Icon size={14} aria-hidden="true" />
  <span>{meta.label}</span>
</span>

<style>
  .status-badge {
    align-items: center;
    background: var(--badge-bg);
    border-radius: var(--radius-badge);
    color: var(--badge-fg);
    display: inline-flex;
    font-size: 12px;
    font-weight: 500;
    gap: 6px;
    height: 22px;
    padding: 0 8px;
    white-space: nowrap;
  }
</style>
