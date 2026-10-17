<script lang="ts">
  import type { AdminUser } from '@par/shared';

  import SideDrawer from '$lib/components/SideDrawer.svelte';
  import { formatDateTime } from '$lib/format/datetime';

  import { USER_ROLE_LABELS } from '../application/user-directory';
  import UserActions from './UserActions.svelte';
  import UserStatusBadge from './UserStatusBadge.svelte';

  let {
    user,
    isSelf,
    onclose,
    onchanged,
    onconflict,
  }: {
    user: AdminUser;
    isSelf: boolean;
    onclose: () => void;
    onchanged: (user: AdminUser, message: string) => void;
    onconflict: () => Promise<void>;
  } = $props();

  const idPrefix = $props.id();

  const facts = $derived([
    { label: 'Campus or unit', value: user.campusUnit ?? '—' },
    { label: 'Contact number', value: user.contactNumber ?? '—' },
    { label: 'Registered', value: formatDateTime(user.registeredAt) },
    {
      label: 'Email verified',
      value: user.emailVerifiedAt ? formatDateTime(user.emailVerifiedAt) : '—',
    },
    ...(user.lastSignedInAt !== undefined
      ? [
          {
            label: 'Last sign-in',
            value: user.lastSignedInAt ? formatDateTime(user.lastSignedInAt) : '—',
          },
        ]
      : []),
  ]);
</script>

<SideDrawer open={true} title={user.fullName} subtitle={user.email} {onclose}>
  <section aria-labelledby="{idPrefix}-facts">
    <h3 id="{idPrefix}-facts" class="section-title">Account</h3>

    <dl class="facts">
      <div class="fact">
        <dt>Role</dt>
        <dd>{user.role ? USER_ROLE_LABELS[user.role] : '—'}</dd>
      </div>
      <div class="fact">
        <dt>Status</dt>
        <dd><UserStatusBadge status={user.status} /></dd>
      </div>
      {#each facts as fact (fact.label)}
        <div class="fact">
          <dt>{fact.label}</dt>
          <dd>{fact.value}</dd>
        </div>
      {/each}
    </dl>
  </section>

  <UserActions {user} {isSelf} {onchanged} {onconflict} />
</SideDrawer>

<style>
  .section-title {
    font-size: 12px;
    font-weight: 500;
    letter-spacing: 0.04em;
    margin: 0 0 12px;
    text-transform: uppercase;
  }

  .facts {
    display: grid;
    gap: 12px 16px;
    grid-template-columns: repeat(2, minmax(0, 1fr));
    margin: 0;
  }

  .fact dt {
    color: var(--text-secondary);
    font-size: 12px;
  }

  .fact dd {
    font-size: 13px;
    margin: 2px 0 0;
    overflow-wrap: anywhere;
  }
</style>
