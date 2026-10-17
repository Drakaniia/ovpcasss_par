<script lang="ts">
  import { loginSchema, emailSchema } from '@par/shared';
  import { AlertCircle, LoaderCircle } from '@lucide/svelte';
  import { goto } from '$app/navigation';
  import { tick } from 'svelte';

  import { api } from '$lib/api/client';
  import { ApiError } from '$lib/api/http';
  import { destinationAfterSignIn } from '$lib/features/auth/application/post-sign-in';
  import { setSessionUser } from '$lib/session/session.svelte';
  import { focusFirstError, parseForm, type FieldErrors } from '$lib/validation/field-errors';

  let email = $state('');
  let password = $state('');
  let errors = $state<FieldErrors>({});
  let alert = $state<string | null>(null);
  let retryable = $state(false);
  let submitting = $state(false);
  let alertEl = $state<HTMLElement | null>(null);

  const FIELDS = ['email', 'password'] as const;

  function setError(field: string, message?: string) {
    const next = { ...errors };
    if (message) next[field] = message;
    else delete next[field];
    errors = next;
  }

  function checkEmail() {
    const result = emailSchema.safeParse(email.trim());
    setError('email', result.success ? undefined : result.error.issues[0]?.message);
  }

  function checkPassword() {
    setError('password', password ? undefined : 'Enter your password.');
  }

  async function showServerError(message: string, canRetry: boolean) {
    alert = message;
    retryable = canRetry;
    await tick();
    alertEl?.focus();
  }

  async function submit() {
    if (submitting) return;

    alert = null;
    retryable = false;

    const result = parseForm(loginSchema, { email: email.trim(), password });
    if (!result.ok) {
      errors = result.errors;
      await tick();
      focusFirstError(errors, FIELDS);
      return;
    }

    submitting = true;
    try {
      const { account } = await api.auth.login(result.data);
      const destination = destinationAfterSignIn(account);

      if (!destination) {
        await showServerError(
          'This account is not active. Contact the OVPCASSS administrator.',
          false,
        );
        return;
      }

      setSessionUser(account);
      await goto(destination, { replaceState: true });
    } catch (error) {
      if (error instanceof ApiError && (error.status === 401 || error.status === 403)) {
        await showServerError('Email or password is incorrect.', false);
      } else if (error instanceof ApiError && error.status === 429) {
        await showServerError('Too many sign-in attempts. Wait a moment and try again.', true);
      } else if (error instanceof ApiError) {
        await showServerError('We could not sign you in. Try again.', true);
      } else {
        await showServerError(
          'We could not reach the server. Check your connection and try again.',
          true,
        );
      }
    } finally {
      submitting = false;
    }
  }
</script>

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
      <div class="form-alert-body">
        {alert}
        {#if retryable}
          <button type="button" onclick={() => void submit()}>Try again</button>
        {/if}
      </div>
    </div>
  {/if}

  <div class="field">
    <label class="field-label" for="email">University email</label>
    <input
      class="input"
      id="email"
      name="email"
      type="email"
      autocomplete="username"
      autocapitalize="none"
      spellcheck="false"
      bind:value={email}
      onblur={checkEmail}
      aria-invalid={errors.email ? 'true' : undefined}
      aria-describedby={errors.email ? 'email-error' : undefined}
    />
    {#if errors.email}
      <p class="field-error" id="email-error">
        <AlertCircle size={16} aria-hidden="true" />
        {errors.email}
      </p>
    {/if}
  </div>

  <div class="field">
    <div class="field-label">
      <label for="password">Password</label>
      <a href="/forgot-password">Forgot?</a>
    </div>
    <input
      class="input"
      id="password"
      name="password"
      type="password"
      autocomplete="current-password"
      bind:value={password}
      onblur={checkPassword}
      aria-invalid={errors.password ? 'true' : undefined}
      aria-describedby={errors.password ? 'password-error' : undefined}
    />
    {#if errors.password}
      <p class="field-error" id="password-error">
        <AlertCircle size={16} aria-hidden="true" />
        {errors.password}
      </p>
    {/if}
  </div>

  <button class="btn btn-primary form-submit" type="submit" disabled={submitting}>
    {#if submitting}
      <LoaderCircle class="spin" size={16} aria-hidden="true" />
      Signing in…
    {:else}
      Sign in
    {/if}
  </button>

  <p class="auth-switch">New here? <a href="/register">Create an account</a></p>
</form>
