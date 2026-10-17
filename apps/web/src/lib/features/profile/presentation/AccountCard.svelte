<script lang="ts">
  import { updateProfileSchema } from '@par/shared';
  import { AlertCircle, LoaderCircle } from '@lucide/svelte';
  import { tick, untrack } from 'svelte';

  import { api } from '$lib/api/client';
  import { ApiError } from '$lib/api/http';
  import { ROLE_LABELS } from '$lib/navigation/navigation';
  import { setSessionUser, type SessionUser } from '$lib/session/session.svelte';
  import { toast } from '$lib/toast/toast.svelte';
  import {
    firstIssueOf,
    focusFirstError,
    parseForm,
    type FieldErrors,
  } from '$lib/validation/field-errors';

  let { user }: { user: SessionUser } = $props();

  let fullName = $state(untrack(() => user.fullName));
  let campusUnit = $state(untrack(() => user.campusUnit ?? ''));
  let contactNumber = $state(untrack(() => user.contactNumber ?? ''));
  let saved = $state({
    fullName: untrack(() => user.fullName),
    campusUnit: untrack(() => user.campusUnit ?? ''),
    contactNumber: untrack(() => user.contactNumber ?? ''),
  });

  let errors = $state<FieldErrors>({});
  let alert = $state<string | null>(null);
  let saving = $state(false);
  let alertEl = $state<HTMLElement | null>(null);

  const roleLabel = $derived(user.role ? ROLE_LABELS[user.role] : 'Not yet assigned');
  const dirty = $derived(
    fullName.trim() !== saved.fullName ||
      campusUnit.trim() !== saved.campusUnit ||
      contactNumber.trim() !== saved.contactNumber,
  );

  function setError(field: string, message?: string) {
    const next = { ...errors };
    if (message) next[field] = message;
    else delete next[field];
    errors = next;
  }

  function checkFullName() {
    setError('fullName', firstIssueOf(updateProfileSchema.shape.fullName, fullName.trim()));
  }

  function checkCampusUnit() {
    setError(
      'campusUnit',
      firstIssueOf(updateProfileSchema.shape.campusUnit, campusUnit.trim() || undefined),
    );
  }

  function checkContactNumber() {
    setError(
      'contactNumber',
      firstIssueOf(updateProfileSchema.shape.contactNumber, contactNumber.trim() || undefined),
    );
  }

  async function submit() {
    if (saving || !dirty) return;
    alert = null;

    const result = parseForm(updateProfileSchema, {
      fullName: fullName.trim(),
      campusUnit: campusUnit.trim() || undefined,
      contactNumber: contactNumber.trim() || undefined,
    });

    if (!result.ok) {
      errors = result.errors;
      await tick();
      focusFirstError(errors, ['fullName', 'campusUnit', 'contactNumber']);
      return;
    }

    saving = true;
    try {
      const account = await api.profile.update(result.data);
      setSessionUser(account);
      saved = {
        fullName: account.fullName,
        campusUnit: account.campusUnit ?? '',
        contactNumber: account.contactNumber ?? '',
      };
      fullName = account.fullName;
      campusUnit = account.campusUnit ?? '';
      contactNumber = account.contactNumber ?? '';
      errors = {};
      toast.success('Profile saved');
    } catch (error) {
      alert =
        error instanceof ApiError
          ? 'We could not save your profile. Try again.'
          : 'We could not reach the server. Check your connection and try again.';
      await tick();
      alertEl?.focus();
    } finally {
      saving = false;
    }
  }
</script>

<section class="card card-body" aria-labelledby="account-heading">
  <div class="card-head">
    <h2 id="account-heading">Account</h2>
    <p class="card-copy">Your name and contact details.</p>
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
        value={user.email}
        readonly
        aria-describedby="email-note"
      />
      <p class="field-hint" id="email-note">Contact the administrator to change this.</p>
    </div>

    <div class="field">
      <label class="field-label" for="role">Role</label>
      <input class="input" id="role" name="role" type="text" value={roleLabel} readonly />
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

    <div class="form-actions">
      <span class="save-reason">
        {#if !dirty && !saving}
          No changes to save.
        {/if}
      </span>
      <button class="btn btn-primary" type="submit" disabled={saving || !dirty}>
        {#if saving}
          <LoaderCircle class="spin" size={16} aria-hidden="true" />
          Saving…
        {:else}
          Save
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

  .save-reason {
    color: var(--text-secondary);
    font-size: 12px;
    margin-right: auto;
  }
</style>
