<script lang="ts">
  import { emailSchema, forgotPasswordSchema } from '@par/shared';
  import { AlertCircle, LoaderCircle } from '@lucide/svelte';
  import { tick } from 'svelte';

  import { api } from '$lib/api/client';
  import { ApiError } from '$lib/api/http';
  import FloatingInput from '$lib/components/FloatingInput.svelte';
  import AuthMessage from '$lib/features/auth/presentation/AuthMessage.svelte';
  import { focusFirstError, parseForm, type FieldErrors } from '$lib/validation/field-errors';

  let email = $state('');
  let errors = $state<FieldErrors>({});
  let alert = $state<string | null>(null);
  let submitting = $state(false);
  let sent = $state(false);
  let alertEl = $state<HTMLElement | null>(null);

  function checkEmail() {
    const result = emailSchema.safeParse(email.trim());
    errors = result.success
      ? {}
      : { email: result.error.issues[0]?.message ?? 'Enter a valid email address.' };
  }

  async function submit() {
    if (submitting) return;
    alert = null;

    const result = parseForm(forgotPasswordSchema, { email: email.trim() });
    if (!result.ok) {
      errors = result.errors;
      await tick();
      focusFirstError(errors, ['email']);
      return;
    }

    submitting = true;
    try {
      await api.auth.forgotPassword(result.data);
      sent = true;
    } catch (error) {
      alert =
        error instanceof ApiError && error.status === 429
          ? 'Too many requests. Wait a moment and try again.'
          : 'We could not send the link. Check your connection and try again.';
      await tick();
      alertEl?.focus();
    } finally {
      submitting = false;
    }
  }
</script>

{#if sent}
  <div class="form-stack">
    <AuthMessage tone="info" title="Check your email">
      <p>If that address has an account, a reset link is on its way.</p>
    </AuthMessage>
    <a class="btn btn-primary form-submit" href="/login">Back to sign in</a>
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

    <p class="form-lede">Enter the address you use for this system. We will send a reset link.</p>

    <div class="field">
      <FloatingInput
        bind:value={email}
        id="email"
        label="University email"
        name="email"
        type="email"
        autocomplete="email"
        autocapitalize="none"
        spellcheck="false"
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

    <button class="btn btn-primary form-submit" type="submit" disabled={submitting}>
      {#if submitting}
        <LoaderCircle class="spin" size={16} aria-hidden="true" />
        Sending link…
      {:else}
        Send link
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
