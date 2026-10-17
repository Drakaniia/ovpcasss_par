<script lang="ts">
  import { changePasswordSchema } from '@par/shared';
  import { AlertCircle, LoaderCircle } from '@lucide/svelte';
  import { tick } from 'svelte';

  import { api } from '$lib/api/client';
  import { ApiError } from '$lib/api/http';
  import { toast } from '$lib/toast/toast.svelte';
  import {
    firstIssueOf,
    focusFirstError,
    parseForm,
    type FieldErrors,
  } from '$lib/validation/field-errors';
  import { passwordStrengthText } from '$lib/validation/password-strength';

  let currentPassword = $state('');
  let newPassword = $state('');
  let confirmPassword = $state('');
  let errors = $state<FieldErrors>({});
  let alert = $state<string | null>(null);
  let saving = $state(false);
  let alertEl = $state<HTMLElement | null>(null);

  const strength = $derived(passwordStrengthText(newPassword));

  function setError(field: string, message?: string) {
    const next = { ...errors };
    if (message) next[field] = message;
    else delete next[field];
    errors = next;
  }

  function checkCurrentPassword() {
    setError('currentPassword', currentPassword ? undefined : 'Enter your current password.');
  }

  function checkNewPassword() {
    setError('newPassword', firstIssueOf(changePasswordSchema.shape.newPassword, newPassword));
  }

  function checkConfirmPassword() {
    setError(
      'confirmPassword',
      confirmPassword && confirmPassword !== newPassword ? 'Passwords do not match.' : undefined,
    );
  }

  async function submit() {
    if (saving) return;
    alert = null;

    const result = parseForm(changePasswordSchema, { currentPassword, newPassword });
    const nextErrors: FieldErrors = { ...(result.ok ? {} : result.errors) };
    if (confirmPassword !== newPassword) {
      nextErrors.confirmPassword = 'Passwords do not match.';
    }

    if (!result.ok || Object.keys(nextErrors).length > 0) {
      errors = nextErrors;
      await tick();
      focusFirstError(errors, ['currentPassword', 'newPassword', 'confirmPassword']);
      return;
    }

    saving = true;
    try {
      await api.profile.changePassword(result.data);
      currentPassword = '';
      newPassword = '';
      confirmPassword = '';
      errors = {};
      toast.success('Password updated');
    } catch (error) {
      if (
        error instanceof ApiError &&
        (error.status === 400 || error.status === 401) &&
        /PASSWORD/i.test(error.code)
      ) {
        errors = { currentPassword: 'The current password is incorrect.' };
        await tick();
        focusFirstError(errors, ['currentPassword']);
      } else {
        alert =
          error instanceof ApiError
            ? 'We could not update your password. Try again.'
            : 'We could not reach the server. Check your connection and try again.';
        await tick();
        alertEl?.focus();
      }
    } finally {
      saving = false;
    }
  }
</script>

<section class="card card-body" aria-labelledby="password-heading">
  <div class="card-head">
    <h2 id="password-heading">Password</h2>
    <p class="card-copy">Use at least 12 characters. No password is stored on this device.</p>
  </div>

  <form
    class="form-stack"
    novalidate
    onsubmit={(event) => {
      event.preventDefault();
      void submit();
    }}
  >
    {#if alert}
      <div class="form-alert" role="alert" tabindex="-1" bind:this={alertEl}>
        <AlertCircle size={16} aria-hidden="true" />
        <div class="form-alert-body">{alert}</div>
      </div>
    {/if}

    <div class="field">
      <label class="field-label" for="currentPassword">Current password</label>
      <input
        class="input"
        id="currentPassword"
        name="currentPassword"
        type="password"
        autocomplete="current-password"
        bind:value={currentPassword}
        onblur={checkCurrentPassword}
        aria-invalid={errors.currentPassword ? 'true' : undefined}
        aria-describedby={errors.currentPassword ? 'currentPassword-error' : undefined}
      />
      {#if errors.currentPassword}
        <p class="field-error" id="currentPassword-error">
          <AlertCircle size={16} aria-hidden="true" />
          {errors.currentPassword}
        </p>
      {/if}
    </div>

    <div class="field">
      <label class="field-label" for="newPassword">New password</label>
      <input
        class="input"
        id="newPassword"
        name="newPassword"
        type="password"
        autocomplete="new-password"
        bind:value={newPassword}
        onblur={checkNewPassword}
        aria-invalid={errors.newPassword ? 'true' : undefined}
        aria-describedby={[
          errors.newPassword ? 'newPassword-error' : '',
          strength ? 'newPassword-strength' : '',
          'newPassword-rule',
        ]
          .filter(Boolean)
          .join(' ')}
      />
      <p class="field-hint" id="newPassword-rule">Use at least 12 characters.</p>
      {#if strength}
        <p class="field-hint" id="newPassword-strength" aria-live="polite">{strength}</p>
      {/if}
      {#if errors.newPassword}
        <p class="field-error" id="newPassword-error">
          <AlertCircle size={16} aria-hidden="true" />
          {errors.newPassword}
        </p>
      {/if}
    </div>

    <div class="field">
      <label class="field-label" for="confirmPassword">Confirm new password</label>
      <input
        class="input"
        id="confirmPassword"
        name="confirmPassword"
        type="password"
        autocomplete="new-password"
        bind:value={confirmPassword}
        onblur={checkConfirmPassword}
        aria-invalid={errors.confirmPassword ? 'true' : undefined}
        aria-describedby={errors.confirmPassword ? 'confirmPassword-error' : undefined}
      />
      {#if errors.confirmPassword}
        <p class="field-error" id="confirmPassword-error">
          <AlertCircle size={16} aria-hidden="true" />
          {errors.confirmPassword}
        </p>
      {/if}
    </div>

    <div class="form-actions">
      <button class="btn btn-outline" type="submit" disabled={saving}>
        {#if saving}
          <LoaderCircle class="spin" size={16} aria-hidden="true" />
          Updating password…
        {:else}
          Update password
        {/if}
      </button>
    </div>
  </form>
</section>

<style>
  .card-body {
    padding: 24px;
  }

  .card-head {
    margin-bottom: 20px;
  }

  .card-head h2 {
    margin: 0;
  }

  .card-copy {
    color: var(--text-secondary);
    font-size: 13px;
    margin: 4px 0 0;
  }
</style>
