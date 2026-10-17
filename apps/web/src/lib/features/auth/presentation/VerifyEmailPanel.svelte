<script lang="ts">
  import { emailSchema } from '@par/shared';
  import { AlertCircle, LoaderCircle } from '@lucide/svelte';
  import { page } from '$app/state';
  import { onDestroy, onMount, tick } from 'svelte';

  import { api } from '$lib/api/client';
  import { ApiError } from '$lib/api/http';
  import AuthMessage from '$lib/features/auth/presentation/AuthMessage.svelte';
  import { focusFirstError, type FieldErrors } from '$lib/validation/field-errors';

  type Stage = 'instruction' | 'verifying' | 'verified' | 'invalid' | 'verify-error';

  const token = page.url.searchParams.get('token')?.trim() ?? '';
  const addressFromUrl = page.url.searchParams.get('email')?.trim() ?? '';

  let stage = $state<Stage>(token ? 'verifying' : 'instruction');
  let emailInput = $state('');
  let errors = $state<FieldErrors>({});
  let resending = $state(false);
  let resendStatus = $state<string | null>(null);
  let cooldown = $state(0);
  let timer: ReturnType<typeof setInterval> | null = null;

  const email = $derived(addressFromUrl || emailInput.trim());

  function stopTimer() {
    if (timer) {
      clearInterval(timer);
      timer = null;
    }
  }

  function startCooldown() {
    stopTimer();
    cooldown = 60;
    timer = setInterval(() => {
      cooldown -= 1;
      if (cooldown <= 0) {
        cooldown = 0;
        stopTimer();
      }
    }, 1000);
  }

  async function verify() {
    stage = 'verifying';
    try {
      await api.auth.verifyEmail({ token });
      stage = 'verified';
    } catch (error) {
      stage =
        error instanceof ApiError && error.status >= 400 && error.status < 500
          ? 'invalid'
          : 'verify-error';
    }
  }

  onMount(() => {
    if (token) void verify();
  });

  onDestroy(stopTimer);

  async function resend() {
    if (resending || cooldown > 0) return;

    resendStatus = null;
    errors = {};

    const result = emailSchema.safeParse(email);
    if (!result.success) {
      errors = { email: 'Enter the address you registered with.' };
      await tick();
      focusFirstError(errors, ['email']);
      return;
    }

    resending = true;
    try {
      await api.auth.resendVerification({ email: result.data });
      resendStatus = 'If that address is awaiting verification, a new link is on its way.';
      startCooldown();
    } catch (error) {
      resendStatus =
        error instanceof ApiError && error.status === 429
          ? 'A link was requested recently. Wait a moment and try again.'
          : 'We could not send a new link. Try again.';
    } finally {
      resending = false;
    }
  }
</script>

{#if stage === 'verifying'}
  <AuthMessage tone="info" title="Verifying your email address">
    <p>This will take a moment.</p>
  </AuthMessage>
{:else if stage === 'verified'}
  <AuthMessage tone="success" title="Your email address is verified">
    <p>Sign in to continue. An administrator will assign your role.</p>
    <a class="btn btn-primary" href="/login">Sign in</a>
  </AuthMessage>
{:else if stage === 'invalid'}
  <AuthMessage tone="error" title="This verification link is invalid or has expired">
    <p>Request a new link and open the newest message.</p>
    <button class="btn btn-primary" type="button" onclick={() => (stage = 'instruction')}>
      Request a new link
    </button>
    <p><a href="/login">Back to sign in</a></p>
  </AuthMessage>
{:else if stage === 'verify-error'}
  <AuthMessage tone="error" title="We could not verify this link">
    <p>Check your connection and try again.</p>
    <button class="btn btn-primary" type="button" onclick={() => void verify()}>Try again</button>
    <p><a href="/login">Back to sign in</a></p>
  </AuthMessage>
{:else}
  <div class="form-stack">
    <AuthMessage tone="info" title="Verify your email address">
      {#if addressFromUrl}
        <p>
          We sent a verification link to <strong>{addressFromUrl}</strong>. Open the link in that
          message to verify your address.
        </p>
      {:else}
        <p>Enter the address you registered with and we will send a new verification link.</p>
      {/if}
    </AuthMessage>

    {#if !addressFromUrl}
      <div class="field">
        <label class="field-label" for="email">University email</label>
        <input
          class="input"
          id="email"
          name="email"
          type="email"
          autocomplete="email"
          autocapitalize="none"
          spellcheck="false"
          bind:value={emailInput}
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
    {/if}

    <button
      class="btn btn-primary form-submit"
      type="button"
      disabled={resending || cooldown > 0}
      onclick={() => void resend()}
    >
      {#if resending}
        <LoaderCircle class="spin" size={16} aria-hidden="true" />
        Sending link…
      {:else}
        Resend link
      {/if}
    </button>

    {#if cooldown > 0}
      <p class="field-hint cooldown">Available in {cooldown} s.</p>
    {/if}

    {#if resendStatus}
      <p class="field-hint" role="status">{resendStatus}</p>
    {/if}

    <p class="auth-switch"><a href="/login">I have verified</a></p>
  </div>
{/if}

<style>
  .cooldown {
    margin: -8px 0 0;
    text-align: center;
  }
</style>
