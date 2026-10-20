<script lang="ts">
  import type { AdminUser, Role } from '@par/shared';
  import { AlertCircle, LoaderCircle } from '@lucide/svelte';
  import { tick, untrack } from 'svelte';

  import { api } from '$lib/api/client';
  import { ApiError } from '$lib/api/http';
  import ConfirmDialog from '$lib/components/ConfirmDialog.svelte';

  import {
    USER_ROLE_LABELS,
    USER_ROLES_ALL,
    activateConfirmation,
    assignRoleConfirmation,
    disableConfirmation,
    userActionStates,
    type ConfirmationCopy,
  } from '../application/user-directory';

  type PendingAction =
    { kind: 'assign-role'; role: Role } | { kind: 'activate' } | { kind: 'disable' };

  let {
    user,
    isSelf,
    onchanged,
    onconflict,
  }: {
    user: AdminUser;
    isSelf: boolean;
    onchanged: (user: AdminUser, message: string) => void;
    onconflict: () => Promise<void>;
  } = $props();

  const idPrefix = $props.id();

  let selectedRole = $state<Role | ''>(untrack(() => user.role ?? ''));
  let roleError = $state<string | null>(null);
  let alert = $state<{ message: string; requestId?: string } | null>(null);
  let busy = $state<PendingAction['kind'] | null>(null);
  let pending = $state<PendingAction | null>(null);
  let confirmOpen = $state(false);
  let alertEl = $state<HTMLElement | null>(null);

  const actions = $derived(userActionStates(user, isSelf));

  // A refreshed record (concurrent change) is what the admin should see.
  $effect(() => {
    selectedRole = user.role ?? '';
    roleError = null;
  });

  const confirmation = $derived.by<ConfirmationCopy | null>(() => {
    if (!pending) return null;
    if (pending.kind === 'assign-role') return assignRoleConfirmation(user, pending.role);
    if (pending.kind === 'activate') return activateConfirmation(user);
    return disableConfirmation(user);
  });

  function failureCopy(kind: PendingAction['kind']): string {
    if (kind === 'assign-role') return 'We could not assign this role. Try again.';
    if (kind === 'activate') return 'We could not activate this account. Try again.';
    return 'We could not disable this account. Try again.';
  }

  function askForRole() {
    if (busy || !actions['assign-role'].enabled) return;
    if (!selectedRole) {
      roleError = 'Select a role.';
      return;
    }
    roleError = null;
    pending = { kind: 'assign-role', role: selectedRole };
    confirmOpen = true;
  }

  function askToActivate() {
    if (busy || !actions.activate.enabled) return;
    pending = { kind: 'activate' };
    confirmOpen = true;
  }

  function askToDisable() {
    if (busy || !actions.disable.enabled) return;
    pending = { kind: 'disable' };
    confirmOpen = true;
  }

  async function runAction() {
    const action = pending;
    if (!action || busy) return;

    busy = action.kind;
    alert = null;

    try {
      let updated: AdminUser;
      let message: string;

      if (action.kind === 'assign-role') {
        updated = await api.admin.users.assignRole(user.id, action.role);
        message = 'Role assigned';
      } else if (action.kind === 'activate') {
        updated = await api.admin.users.activate(user.id);
        message = 'Account activated';
      } else {
        updated = await api.admin.users.disable(user.id);
        message = 'Account disabled';
      }

      onchanged(updated, message);
    } catch (error) {
      if (error instanceof ApiError && error.status === 409) {
        await onconflict();
        alert = {
          message:
            'This account changed since you opened it. Review the current role and status before trying again.',
        };
      } else {
        alert = {
          message: failureCopy(action.kind),
          requestId: error instanceof ApiError ? error.requestId : undefined,
        };
      }

      await tick();
      alertEl?.focus();
    } finally {
      busy = null;
      pending = null;
    }
  }
</script>

<section class="actions" aria-labelledby="{idPrefix}-actions">
  <h3 id="{idPrefix}-actions" class="section-title">Account actions</h3>

  {#if alert}
    <div class="form-alert" role="alert" tabindex="-1" bind:this={alertEl}>
      <AlertCircle size={16} aria-hidden="true" />
      <div class="form-alert-body">
        {alert.message}
        {#if alert.requestId}
          <p class="request-id">Request ID: <span class="mono">{alert.requestId}</span></p>
        {/if}
      </div>
    </div>
  {/if}

  <div class="action">
    <div class="action-copy">
      <h4>Assign role</h4>
      <p>
        The new role applies the next time they sign in or refresh. Role changes are recorded in the
        audit log.
      </p>
    </div>

    <div class="action-control">
      <div class="field">
        <label class="field-label" for="{idPrefix}-role">Role</label>
        <select
          id="{idPrefix}-role"
          class="select"
          bind:value={selectedRole}
          disabled={!actions['assign-role'].enabled || busy !== null}
          aria-invalid={roleError ? 'true' : undefined}
          aria-describedby={roleError
            ? `${idPrefix}-role-error`
            : actions['assign-role'].reason
              ? `${idPrefix}-role-reason`
              : undefined}
        >
          <option value="">Select a role</option>
          {#each USER_ROLES_ALL as role (role)}
            <option value={role}>{USER_ROLE_LABELS[role]}</option>
          {/each}
        </select>
      </div>

      <button
        class={user.status === 'PENDING_ROLE' ? 'btn btn-primary' : 'btn btn-outline'}
        type="button"
        disabled={!actions['assign-role'].enabled || busy !== null}
        aria-describedby={actions['assign-role'].reason ? `${idPrefix}-role-reason` : undefined}
        onclick={askForRole}
      >
        {#if busy === 'assign-role'}
          <LoaderCircle class="spin" size={16} aria-hidden="true" />
          Assigning…
        {:else}
          Assign role
        {/if}
      </button>
    </div>

    {#if roleError}
      <p class="field-error role-note" id="{idPrefix}-role-error">
        <AlertCircle size={16} aria-hidden="true" />
        {roleError}
      </p>
    {:else if actions['assign-role'].reason}
      <p class="field-hint role-note" id="{idPrefix}-role-reason">
        {actions['assign-role'].reason}
      </p>
    {/if}
  </div>

  {#if actions.activate.visible}
    <div class="action">
      <div class="action-copy">
        <h4>Activate account</h4>
        <p>{user.fullName} can sign in after activation.</p>
      </div>

      <div class="action-control action-control-end">
        <button
          class="btn btn-outline"
          type="button"
          disabled={!actions.activate.enabled || busy !== null}
          aria-describedby={actions.activate.reason ? `${idPrefix}-activate-reason` : undefined}
          onclick={askToActivate}
        >
          {#if busy === 'activate'}
            <LoaderCircle class="spin" size={16} aria-hidden="true" />
            Activating…
          {:else}
            Activate
          {/if}
        </button>

        {#if actions.activate.reason}
          <p class="field-hint" id="{idPrefix}-activate-reason">{actions.activate.reason}</p>
        {/if}
      </div>
    </div>
  {/if}

  {#if actions.disable.visible}
    <div class="action">
      <div class="action-copy">
        <h4>Disable account</h4>
        <p>
          {user.fullName} will no longer be able to sign in. Their reports and audit history are kept.
        </p>
      </div>

      <div class="action-control action-control-end">
        <button
          class="btn btn-danger"
          type="button"
          disabled={!actions.disable.enabled || busy !== null}
          aria-describedby={actions.disable.reason ? `${idPrefix}-disable-reason` : undefined}
          onclick={askToDisable}
        >
          {#if busy === 'disable'}
            <LoaderCircle class="spin" size={16} aria-hidden="true" />
            Disabling…
          {:else}
            Disable account
          {/if}
        </button>

        {#if actions.disable.reason}
          <p class="field-hint" id="{idPrefix}-disable-reason">{actions.disable.reason}</p>
        {/if}
      </div>
    </div>
  {/if}
</section>

{#if confirmation}
  <ConfirmDialog
    bind:open={confirmOpen}
    title={confirmation.title}
    description={confirmation.description}
    confirmLabel={confirmation.confirmLabel}
    tone={pending?.kind === 'disable' ? 'destructive' : 'default'}
    onconfirm={() => void runAction()}
  />
{/if}

<style>
  .section-title {
    font-size: 12px;
    font-weight: 500;
    letter-spacing: 0.04em;
    margin: 0 0 12px;
    text-transform: uppercase;
  }

  .actions {
    border-top: 1px solid var(--border);
    margin-top: 24px;
    padding-top: 20px;
  }

  .actions .form-alert {
    margin-bottom: 16px;
  }

  .request-id {
    font-size: 12px;
    margin: 4px 0 0;
  }

  .mono {
    font-family: var(--font-mono);
  }

  .action {
    border-top: 1px solid var(--border);
    padding: 16px 0;
  }

  .action:last-child {
    padding-bottom: 0;
  }

  .action-copy h4 {
    font-size: 14px;
    margin: 0;
  }

  .action-copy p {
    color: var(--text-secondary);
    font-size: 12px;
    line-height: 1.5;
    margin: 4px 0 0;
  }

  .action-control {
    align-items: flex-end;
    display: flex;
    gap: 8px;
    margin-top: 12px;
  }

  .action-control .field {
    flex: 1;
  }

  .role-note {
    margin: 4px 0 0;
  }

  .action-control-end {
    align-items: center;
    flex-wrap: wrap;
    justify-content: flex-end;
  }

  .action-control-end .field-hint {
    flex-basis: 100%;
    margin: 0;
    text-align: right;
  }
</style>
