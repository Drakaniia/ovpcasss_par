<script lang="ts">
  import { resetPasswordSchema } from '@par/shared';
  import { AlertCircle, LoaderCircle } from '@lucide/svelte';
  import { page } from '$app/state';
  import { tick } from 'svelte';

  import { api } from '$lib/api/client';
  import { ApiError } from '$lib/api/http';
  import AuthMessage from '$lib/features/auth/presentation/AuthMessage.svelte';
  import { focusFirstError, parseForm, type FieldErrors } from '$lib/validation/field-errors';
  import { passwordStrengthText } from '$lib/validation/password-strength';

  const token = page.url.searchParams.get('token')?.trim() ?? '';

  let password = $state('');
  let confirmPassword = $state('');
  let errors = $state<FieldErrors>({});
  let alert = $state<string | null>(null);
  let submitting = $state(false);
  let stage = $state<'form' | 'success' | 'invalid'>(token ? 'form' : 'invalid');
  let alertEl = $state<HTMLElement | null>(null);

  const strength = $derived(passwordStrengthText(password));

  function isExpiredToken(error: unknown): boolean {
    if (!(error instanceof ApiError)) return false;
    return (
      error.status === 400 ||
      error.status === 404 ||
      error.status === 410 ||
      /TOKEN/.test(error.code)
    );
  }

  async function submit() {
    if (submitting) return;
    alert = null;

    const result = parseForm(resetPasswordSchema, { token, password });
    const nextErrors: FieldErrors = { ...(result.ok ? {} : result.errors) };
    if (confirmPassword !== password) {
      nextErrors.confirmPassword = 'Passwords do not match.';
    }

    if (!result.ok || Object.keys(nextErrors).length > 0) {
      errors = nextErrors;
      await tick();
      focusFirstError(errors, ['password', 'confirmPassword']);
      return;
    }

    submitting = true;
    try {
      await api.auth.resetPassword(result.data);
      stage = 'success';
    } catch (error) {
      if (isExpiredToken(error)) {
        stage = 'invalid';
        return;
      }

      alert =
        error instanceof ApiError && error.status === 429
          ? 'Too many attempts. Wait a moment and try again.'
          : 'We could not update your password. Check your connection and try again.';
      await tick();
      alertEl?.focus();
    } finally {
      submitting = false;
    }
  }
</script>

{#if stage === 'success'}
  <div class="form-stack">
    <AuthMessage tone="success" title="Your password has been updated">
      <p>Sign in with your new password.</p>
    </AuthMessage>
    <a class="btn btn-primary form-submit" href="/login">Sign in</a>
  </div>
{:else if stage === 'invalid'}
  <div class="form-stack">
    <AuthMessage tone="error" title="This reset link is invalid or has expired">
      <p>Request a new link to reset your password.</p>
    </AuthMessage>
    <a class="btn btn-primary form-submit" href="/forgot-password">Request a new link</a>
    <p class="auth-switch"><a href="/login">Back to sign in</a></p>
  </div>
{:else}
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

    <p class="form-lede">Choose a new password for your account.</p>

    <div class="field">
      <label class="field-label" for="password">New password</label>
      <input
        class="input"
        id="password"
        name="password"
        type="password"
        autocomplete="new-password"
        bind:value={password}
        aria-invalid={errors.password ? 'true' : undefined}
        aria-describedby={[
          errors.password ? 'password-error' : '',
          strength ? 'password-strength' : '',
          'password-rule',
        ]
          .filter(Boolean)
          .join(' ')}
      />
      <p class="field-hint" id="password-rule">Use at least 12 characters.</p>
      {#if strength}
        <p class="field-hint" id="password-strength" aria-live="polite">{strength}</p>
      {/if}
      {#if errors.password}
        <p class="field-error" id="password-error">
          <AlertCircle size={16} aria-hidden="true" />
          {errors.password}
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

    <button class="btn btn-primary form-submit" type="submit" disabled={submitting}>
      {#if submitting}
        <LoaderCircle class="spin" size={16} aria-hidden="true" />
        Setting password…
      {:else}
        Set password
      {/if}
    </button>

    <p class="auth-switch"><a href="/login">Back to sign in</a></p>
  </form>
{/if}

<style>
  .form-lede {
    color: var(--text-secondary);
    font-size: 13px;
    margin: 0;
  }
</style>
