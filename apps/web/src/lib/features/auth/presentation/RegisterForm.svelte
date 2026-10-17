<script lang="ts">
  import { registerSchema } from '@par/shared';
  import { AlertCircle, LoaderCircle } from '@lucide/svelte';
  import { goto } from '$app/navigation';
  import { onMount, tick } from 'svelte';

  import { api } from '$lib/api/client';
  import { ApiError } from '$lib/api/http';
  import {
    firstIssueOf,
    focusFirstError,
    parseForm,
    type FieldErrors,
  } from '$lib/validation/field-errors';
  import { passwordStrengthText } from '$lib/validation/password-strength';

  let fullName = $state('');
  let email = $state('');
  let campusUnit = $state('');
  let contactNumber = $state('');
  let password = $state('');
  let confirmPassword = $state('');

  let errors = $state<FieldErrors>({});
  let alert = $state<string | null>(null);
  let submitting = $state(false);
  let alertEl = $state<HTMLElement | null>(null);
  let domains = $state<string[]>([]);

  const FIELDS = [
    'fullName',
    'email',
    'campusUnit',
    'contactNumber',
    'password',
    'confirmPassword',
  ] as const;

  const strength = $derived(passwordStrengthText(password));
  const domainHint = $derived.by(() => {
    if (domains.length === 0) return null;
    const values = domains.map((domain) => (domain.startsWith('@') ? domain : `@${domain}`));
    return values.length === 1
      ? `Use your ${values[0]} address.`
      : `Use your university address (${values.join(', ')}).`;
  });

  onMount(() => {
    api.auth
      .config()
      .then((config) => (domains = config.allowedEmailDomains))
      .catch(() => {
        // The hint is assistance only; registration stays available without it.
      });
  });

  function setError(field: string, message?: string) {
    const next = { ...errors };
    if (message) next[field] = message;
    else delete next[field];
    errors = next;
  }

  function checkFullName() {
    setError('fullName', firstIssueOf(registerSchema.shape.fullName, fullName.trim()));
  }

  function checkEmail() {
    setError('email', firstIssueOf(registerSchema.shape.email, email.trim()));
  }

  function checkCampusUnit() {
    setError(
      'campusUnit',
      firstIssueOf(registerSchema.shape.campusUnit, campusUnit.trim() || undefined),
    );
  }

  function checkContactNumber() {
    setError(
      'contactNumber',
      firstIssueOf(registerSchema.shape.contactNumber, contactNumber.trim() || undefined),
    );
  }

  function checkPassword() {
    setError('password', firstIssueOf(registerSchema.shape.password, password));
  }

  function checkConfirmPassword() {
    setError(
      'confirmPassword',
      confirmPassword && confirmPassword !== password ? 'Passwords do not match.' : undefined,
    );
  }

  async function showServerError(message: string) {
    alert = message;
    await tick();
    alertEl?.focus();
  }

  async function submit() {
    if (submitting) return;
    alert = null;

    const result = parseForm(registerSchema, {
      fullName: fullName.trim(),
      email: email.trim(),
      campusUnit: campusUnit.trim() || undefined,
      contactNumber: contactNumber.trim() || undefined,
      password,
    });

    const nextErrors: FieldErrors = { ...(result.ok ? {} : result.errors) };
    if (confirmPassword !== password) {
      nextErrors.confirmPassword = 'Passwords do not match.';
    }

    if (!result.ok || Object.keys(nextErrors).length > 0) {
      errors = nextErrors;
      await tick();
      focusFirstError(errors, FIELDS);
      return;
    }

    submitting = true;
    try {
      await api.auth.register(result.data);
      await goto(`/verify-email?email=${encodeURIComponent(result.data.email)}`, {
        replaceState: true,
      });
    } catch (error) {
      if (error instanceof ApiError && error.status === 429) {
        await showServerError('Too many registration attempts. Wait a moment and try again.');
      } else if (error instanceof ApiError) {
        await showServerError(
          'We could not create your account. Check your details and try again.',
        );
      } else {
        await showServerError(
          'We could not reach the server. Check your connection and try again.',
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
      <div class="form-alert-body">{alert}</div>
    </div>
  {/if}

  <div class="field">
    <label class="field-label" for="fullName">Full name</label>
    <input
      class="input"
      id="fullName"
      name="fullName"
      type="text"
      autocomplete="name"
      bind:value={fullName}
      onblur={checkFullName}
      aria-invalid={errors.fullName ? 'true' : undefined}
      aria-describedby={errors.fullName ? 'fullName-error' : undefined}
    />
    {#if errors.fullName}
      <p class="field-error" id="fullName-error">
        <AlertCircle size={16} aria-hidden="true" />
        {errors.fullName}
      </p>
    {/if}
  </div>

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
      bind:value={email}
      onblur={checkEmail}
      aria-invalid={errors.email ? 'true' : undefined}
      aria-describedby={[errors.email ? 'email-error' : '', domainHint ? 'email-hint' : '']
        .filter(Boolean)
        .join(' ') || undefined}
    />
    {#if errors.email}
      <p class="field-error" id="email-error">
        <AlertCircle size={16} aria-hidden="true" />
        {errors.email}
      </p>
    {/if}
    {#if domainHint}
      <p class="field-hint" id="email-hint">{domainHint}</p>
    {/if}
  </div>

  <div class="field">
    <label class="field-label" for="campusUnit">
      <span>Campus or unit</span>
      <span class="field-optional">Optional</span>
    </label>
    <input
      class="input"
      id="campusUnit"
      name="campusUnit"
      type="text"
      autocomplete="organization"
      bind:value={campusUnit}
      onblur={checkCampusUnit}
      aria-invalid={errors.campusUnit ? 'true' : undefined}
      aria-describedby={errors.campusUnit ? 'campusUnit-error' : undefined}
    />
    {#if errors.campusUnit}
      <p class="field-error" id="campusUnit-error">
        <AlertCircle size={16} aria-hidden="true" />
        {errors.campusUnit}
      </p>
    {/if}
  </div>

  <div class="field">
    <label class="field-label" for="contactNumber">
      <span>Contact number</span>
      <span class="field-optional">Optional</span>
    </label>
    <input
      class="input"
      id="contactNumber"
      name="contactNumber"
      type="tel"
      autocomplete="tel"
      bind:value={contactNumber}
      onblur={checkContactNumber}
      aria-invalid={errors.contactNumber ? 'true' : undefined}
      aria-describedby={errors.contactNumber ? 'contactNumber-error' : undefined}
    />
    {#if errors.contactNumber}
      <p class="field-error" id="contactNumber-error">
        <AlertCircle size={16} aria-hidden="true" />
        {errors.contactNumber}
      </p>
    {/if}
  </div>

  <div class="field">
    <label class="field-label" for="password">Password</label>
    <input
      class="input"
      id="password"
      name="password"
      type="password"
      autocomplete="new-password"
      bind:value={password}
      onblur={checkPassword}
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
    <label class="field-label" for="confirmPassword">Confirm password</label>
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

  <button class="btn btn-primary form-submit" type="submit" disabled={submitting}>
    {#if submitting}
      <LoaderCircle class="spin" size={16} aria-hidden="true" />
      Creating account…
    {:else}
      Create account
    {/if}
  </button>

  <p class="auth-switch">Already have an account? <a href="/login">Sign in</a></p>
</form>
