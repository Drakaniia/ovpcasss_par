<script lang="ts">
  import { changePasswordSchema } from '@par/shared';
  import { AlertCircle, Eye, EyeOff, LoaderCircle } from '@lucide/svelte';
  import { tick } from 'svelte';

  import { api } from '$lib/api/client';
  import { passwordChangeFailure } from '$lib/features/profile/application/password-change';
  import { toast } from '$lib/toast/toast.svelte';
  import {
    firstIssueOf,
    focusFirstError,
    parseForm,
    type FieldErrors,
  } from '$lib/validation/field-errors';
  import { passwordStrengthText } from '$lib/validation/password-strength';

  /** False while the account has no password of its own (Google sign-in only). */
  let { hasPassword = true }: { hasPassword?: boolean } = $props();

  let currentPassword = $state('');
  let newPassword = $state('');
  let confirmPassword = $state('');
  let errors = $state<FieldErrors>({});
  let alert = $state<string | null>(null);
  let saving = $state(false);
  let alertEl = $state<HTMLElement | null>(null);

  /** Each field reveals independently; the icon clears when the form resets. */
  let reveal = $state({ current: false, new: false, confirm: false });

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
      const failure = passwordChangeFailure(error);

      if (failure.kind === 'field') {
        errors = { [failure.field]: failure.message };
        await tick();
        focusFirstError(errors, [failure.field]);
      } else {
        alert = failure.message;
        await tick();
        alertEl?.focus();
      }
    } finally {
      saving = false;
    }
  }
</script>

{#snippet revealToggle(field: 'current' | 'new' | 'confirm', name: string)}
  <button
    class="reveal"
    type="button"
    aria-label={reveal[field] ? `Hide ${name}` : `Show ${name}`}
    aria-pressed={reveal[field]}
    onclick={() => (reveal[field] = !reveal[field])}
  >
    {#if reveal[field]}
      <EyeOff size={16} aria-hidden="true" />
    {:else}
      <Eye size={16} aria-hidden="true" />
    {/if}
  </button>
{/snippet}

<section class="card card-body" aria-labelledby="password-heading">
  <div class="card-head">
    <h2 id="password-heading">Password</h2>
    <p class="card-copy">
      {#if hasPassword}
        Use at least 12 characters. No password is stored on this device.
      {:else}
        This account signs in with Google and has no password yet.
      {/if}
    </p>
  </div>

  {#if hasPassword}
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
        <div class="password-field">
          <input
            class="input"
            id="currentPassword"
            name="currentPassword"
            type={reveal.current ? 'text' : 'password'}
            autocomplete="current-password"
            bind:value={currentPassword}
            onblur={checkCurrentPassword}
            aria-invalid={errors.currentPassword ? 'true' : undefined}
            aria-describedby={errors.currentPassword ? 'currentPassword-error' : undefined}
          />
          {@render revealToggle('current', 'current password')}
        </div>
        {#if errors.currentPassword}
          <p class="field-error" id="currentPassword-error">
            <AlertCircle size={16} aria-hidden="true" />
            {errors.currentPassword}
          </p>
        {/if}
        <p class="field-action"><a href="/forgot-password">Forgot your password?</a></p>
      </div>

      <div class="field">
        <label class="field-label" for="newPassword">New password</label>
        <div class="password-field">
          <input
            class="input"
            id="newPassword"
            name="newPassword"
            type={reveal.new ? 'text' : 'password'}
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
          {@render revealToggle('new', 'new password')}
        </div>
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
        <div class="password-field">
          <input
            class="input"
            id="confirmPassword"
            name="confirmPassword"
            type={reveal.confirm ? 'text' : 'password'}
            autocomplete="new-password"
            bind:value={confirmPassword}
            onblur={checkConfirmPassword}
            aria-invalid={errors.confirmPassword ? 'true' : undefined}
            aria-describedby={errors.confirmPassword ? 'confirmPassword-error' : undefined}
          />
          {@render revealToggle('confirm', 'confirmation password')}
        </div>
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
  {:else}
    <p class="card-copy">
      Set a password with a link sent to your university email. You can keep signing in with Google.
    </p>
    <div class="form-actions">
      <a class="btn btn-outline" href="/forgot-password">Set a password</a>
    </div>
  {/if}
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

  .password-field {
    position: relative;
  }

  .password-field .input {
    padding-right: 44px;
  }

  /* Matches the field primitive: the reveal waits for hover or focus. */
  .reveal {
    align-items: center;
    background: transparent;
    border: 0;
    border-radius: var(--radius-card);
    color: var(--text-disabled);
    display: inline-flex;
    height: 30px;
    justify-content: center;
    opacity: 0;
    position: absolute;
    right: 8px;
    top: 50%;
    transform: translateY(-50%);
    transition: opacity 140ms ease;
    width: 30px;
  }

  .password-field:hover .reveal,
  .password-field:focus-within .reveal {
    opacity: 1;
  }

  .reveal:hover {
    background: var(--surface-page);
    color: var(--text-primary);
  }
</style>
